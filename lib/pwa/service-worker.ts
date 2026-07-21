"use client";

const REGISTRATION_TIMEOUT_MS = 20_000;
const ACTIVATION_TIMEOUT_MS = 35_000;

let activeRegistrationPromise: Promise<ServiceWorkerRegistration> | null = null;
let repairRegistrationPromise: Promise<ServiceWorkerRegistration> | null = null;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string) {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
    });

    return Promise.race([promise, timeout]).finally(() => {
        if (timeoutId) clearTimeout(timeoutId);
    });
}

function isActive(registration: ServiceWorkerRegistration) {
    return registration.active?.state === "activated";
}

function workerState(registration: ServiceWorkerRegistration | null) {
    if (!registration) return "registrasi tidak ditemukan";

    return [
        `active=${registration.active?.state ?? "tidak ada"}`,
        `waiting=${registration.waiting?.state ?? "tidak ada"}`,
        `installing=${registration.installing?.state ?? "tidak ada"}`,
    ].join(", ");
}

function appClientUrl() {
    return new URL("/", window.location.origin).href;
}

function waitForActivation(registration: ServiceWorkerRegistration) {
    if (isActive(registration)) return Promise.resolve(registration);

    return new Promise<ServiceWorkerRegistration>((resolve, reject) => {
        let settled = false;
        const observedWorkers = new Set<ServiceWorker>();

        const cleanup = () => {
            clearTimeout(timeoutId);
            registration.removeEventListener("updatefound", observeCurrentWorkers);
            navigator.serviceWorker.removeEventListener("controllerchange", checkState);
            observedWorkers.forEach((worker) => {
                worker.removeEventListener("statechange", checkState);
            });
        };

        const finish = (error?: Error) => {
            if (settled) return;
            settled = true;
            cleanup();
            if (error) reject(error);
            else resolve(registration);
        };

        const observeWorker = (worker: ServiceWorker | null) => {
            if (!worker || observedWorkers.has(worker)) return;
            observedWorkers.add(worker);
            worker.addEventListener("statechange", checkState);
        };

        function observeCurrentWorkers() {
            observeWorker(registration.installing);
            observeWorker(registration.waiting);
            observeWorker(registration.active);
            checkState();
        }

        function checkState() {
            if (isActive(registration)) {
                finish();
                return;
            }

            const candidates = [
                registration.installing,
                registration.waiting,
                registration.active,
            ].filter((worker): worker is ServiceWorker => !!worker);

            candidates.forEach(observeWorker);
            if (
                candidates.length > 0 &&
                candidates.every((worker) => worker.state === "redundant")
            ) {
                finish(
                    new Error(
                        "Instalasi service worker gagal. Muat ulang aplikasi saat koneksi stabil."
                    )
                );
            }
        }

        const timeoutId = setTimeout(() => {
            finish(
                new Error(
                    "Service worker belum aktif. Tutup dan buka kembali aplikasi, lalu coba lagi."
                )
            );
        }, ACTIVATION_TIMEOUT_MS);

        registration.addEventListener("updatefound", observeCurrentWorkers);
        navigator.serviceWorker.addEventListener("controllerchange", checkState);
        observeCurrentWorkers();
    });
}

async function registerAndActivateServiceWorker() {
    if (!("serviceWorker" in navigator)) {
        throw new Error("Service worker tidak didukung oleh browser ini.");
    }

    let registration = await withTimeout(
        navigator.serviceWorker.getRegistration(appClientUrl()),
        REGISTRATION_TIMEOUT_MS,
        "Pemeriksaan service worker melewati batas waktu."
    );

    if (!registration) {
        registration = await withTimeout(
            navigator.serviceWorker.register("/sw.js", {
                scope: "/",
                updateViaCache: "none",
            }),
            REGISTRATION_TIMEOUT_MS,
            "Pendaftaran service worker melewati batas waktu."
        );
    }

    if (isActive(registration)) {
        // Pemeriksaan update tidak menghambat aktivasi push yang sudah dapat
        // menggunakan worker aktif saat ini.
        void registration.update().catch((error) => {
            console.warn("[PWA] Service worker update check failed:", error);
        });
        return registration;
    }

    if (!registration.installing && !registration.waiting) {
        try {
            await withTimeout(
                registration.update(),
                REGISTRATION_TIMEOUT_MS,
                "Pemeriksaan pembaruan service worker melewati batas waktu."
            );
        } catch (error) {
            console.warn("[PWA] Service worker update retry failed:", error);
        }
    }

    return waitForActivation(registration);
}

async function clearOriginCaches() {
    if (!("caches" in window)) return;

    const cacheNames = await window.caches.keys();
    await Promise.all(cacheNames.map((cacheName) => window.caches.delete(cacheName)));
}

async function performServiceWorkerRepair() {
    if (!("serviceWorker" in navigator)) {
        throw new Error("Service worker tidak didukung oleh browser ini.");
    }

    activeRegistrationPromise = null;

    const registrations = await withTimeout(
        navigator.serviceWorker.getRegistrations(),
        REGISTRATION_TIMEOUT_MS,
        "Pemeriksaan registrasi lama melewati batas waktu."
    );

    await withTimeout(
        Promise.all(registrations.map((registration) => registration.unregister())),
        REGISTRATION_TIMEOUT_MS,
        "Pembersihan registrasi lama melewati batas waktu."
    );
    await withTimeout(
        clearOriginCaches(),
        REGISTRATION_TIMEOUT_MS,
        "Pembersihan cache PWA melewati batas waktu."
    );

    const registration = await withTimeout(
        navigator.serviceWorker.register(`/sw.js?repair=${Date.now()}`, {
            scope: "/",
            updateViaCache: "none",
        }),
        REGISTRATION_TIMEOUT_MS,
        "Pendaftaran ulang service worker melewati batas waktu."
    );

    try {
        const activeRegistration = await waitForActivation(registration);
        activeRegistrationPromise = Promise.resolve(activeRegistration);
        return activeRegistration;
    } catch (error) {
        const detail = error instanceof Error ? error.message : "Aktivasi gagal.";
        throw new Error(
            `Pemulihan service worker gagal (${workerState(registration)}). ${detail}`
        );
    }
}

/**
 * Mengembalikan registrasi SulutDive yang sudah memiliki worker aktif.
 * Promise dibagikan antara komponen PWA dan aktivasi push agar keduanya tidak
 * mendaftarkan atau memperbarui worker secara bersamaan.
 */
export function ensureActiveServiceWorkerRegistration() {
    if (!activeRegistrationPromise) {
        activeRegistrationPromise = registerAndActivateServiceWorker().catch((error) => {
            activeRegistrationPromise = null;
            throw error;
        });
    }
    return activeRegistrationPromise;
}

/**
 * Menghapus registrasi/cache PWA pada origin SulutDive dan memasang worker
 * bersih. Dipanggil hanya sesudah aktivasi eksplisit pengguna gagal agar
 * registrasi Workbox lama yang rusak dapat dipulihkan tanpa membuka setelan HP.
 */
export function repairServiceWorkerRegistration() {
    if (!repairRegistrationPromise) {
        repairRegistrationPromise = performServiceWorkerRepair().finally(() => {
            repairRegistrationPromise = null;
        });
    }
    return repairRegistrationPromise;
}
