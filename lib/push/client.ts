"use client";

import { deletePushSubscription } from "@/app/actions/push";
import type { PushActionResult } from "@/lib/push/types";

const SERVICE_WORKER_TIMEOUT_MS = 10_000;
const PUSH_MANAGER_TIMEOUT_MS = 8_000;

export function withPushTimeout<T>(
    promise: Promise<T>,
    timeoutMs = SERVICE_WORKER_TIMEOUT_MS,
    message = "Proses notifikasi melewati batas waktu."
) {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
    });

    return Promise.race([promise, timeout]).finally(() => {
        if (timeoutId) clearTimeout(timeoutId);
    });
}

export async function getPushServiceWorkerRegistration() {
    if (!("serviceWorker" in navigator)) {
        throw new Error("Service worker tidak didukung oleh browser ini.");
    }

    return withPushTimeout(
        (async () => {
            let registration = await navigator.serviceWorker.getRegistration("/");

            // Registration normally happens in ServiceWorkerRegistration, but
            // this fallback removes the race on the first page load.
            if (!registration) {
                registration = await navigator.serviceWorker.register("/sw.js", {
                    scope: "/",
                    updateViaCache: "none",
                });
            }

            if (registration.active) return registration;
            return navigator.serviceWorker.ready;
        })(),
        SERVICE_WORKER_TIMEOUT_MS,
        "Service worker belum siap. Periksa koneksi lalu muat ulang aplikasi."
    );
}

export async function getCurrentPushSubscription() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return null;

    // Pemeriksaan status tidak perlu mendaftarkan service worker baru. Ini
    // mencegah panel tertahan pada navigator.serviceWorker.ready ketika SW
    // belum tersedia, khususnya saat koneksi lambat atau build baru dipasang.
    const registration = await withPushTimeout(
        navigator.serviceWorker.getRegistration("/"),
        PUSH_MANAGER_TIMEOUT_MS,
        "Pemeriksaan service worker melewati batas waktu."
    );
    if (!registration) return null;

    return withPushTimeout(
        registration.pushManager.getSubscription(),
        PUSH_MANAGER_TIMEOUT_MS,
        "Pemeriksaan subscription melewati batas waktu."
    );
}

function subscriptionUsesKey(subscription: PushSubscription, expectedKey: Uint8Array) {
    const currentKey = subscription.options.applicationServerKey;
    if (!currentKey) return false;

    const currentBytes = new Uint8Array(currentKey);
    if (currentBytes.length !== expectedKey.length) return false;
    return currentBytes.every((value, index) => value === expectedKey[index]);
}

export async function subscribeCurrentDevicePush(applicationServerKey: Uint8Array) {
    const registration = await getPushServiceWorkerRegistration();
    let subscription = await withPushTimeout(
        registration.pushManager.getSubscription(),
        PUSH_MANAGER_TIMEOUT_MS,
        "Pemeriksaan subscription melewati batas waktu."
    );

    // Subscription Web Push terikat pada public VAPID key. Jika key pernah
    // diganti, subscription lama harus dibuat ulang agar pengiriman tidak 403.
    if (subscription && !subscriptionUsesKey(subscription, applicationServerKey)) {
        try {
            await deletePushSubscription(subscription.endpoint);
        } finally {
            await withPushTimeout(
                subscription.unsubscribe(),
                PUSH_MANAGER_TIMEOUT_MS,
                "Pembaruan subscription lama melewati batas waktu."
            );
        }
        subscription = null;
    }

    if (subscription) return subscription;

    const keyBuffer = new ArrayBuffer(applicationServerKey.byteLength);
    new Uint8Array(keyBuffer).set(applicationServerKey);

    return withPushTimeout(
        registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: keyBuffer,
        }),
        SERVICE_WORKER_TIMEOUT_MS,
        "Pembuatan subscription melewati batas waktu."
    );
}

export async function unsubscribeCurrentDevicePush(): Promise<PushActionResult> {
    try {
        const subscription = await getCurrentPushSubscription();
        if (!subscription) {
            return {
                success: true,
                message: "Notifikasi sudah tidak aktif pada perangkat ini.",
            };
        }

        const serverResult = await deletePushSubscription(subscription.endpoint);
        const browserResult = await withPushTimeout(
            subscription.unsubscribe(),
            PUSH_MANAGER_TIMEOUT_MS,
            "Penonaktifan subscription melewati batas waktu."
        );

        if (!browserResult) {
            return {
                success: false,
                message: "Browser tidak dapat menonaktifkan subscription perangkat ini.",
            };
        }
        if (!serverResult.success) {
            return {
                success: false,
                message: `Notifikasi perangkat dinonaktifkan, tetapi data server belum terhapus. ${serverResult.message}`,
            };
        }

        return {
            success: true,
            message: "Notifikasi dinonaktifkan pada perangkat ini.",
        };
    } catch (error) {
        console.warn("[push] Device unsubscribe failed:", error);
        return {
            success: false,
            message:
                error instanceof Error
                    ? error.message
                    : "Notifikasi gagal dinonaktifkan pada perangkat ini.",
        };
    }
}
