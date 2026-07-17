"use client";

import { deletePushSubscription } from "@/app/actions/push";

const SERVICE_WORKER_TIMEOUT_MS = 10_000;

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
    const registration = await getPushServiceWorkerRegistration();
    return registration.pushManager.getSubscription();
}

export async function unsubscribeCurrentDevicePush() {
    try {
        const subscription = await getCurrentPushSubscription();
        if (!subscription) return;

        try {
            await deletePushSubscription(subscription.endpoint);
        } finally {
            await subscription.unsubscribe();
        }
    } catch (error) {
        console.warn("[push] Device unsubscribe skipped:", error);
    }
}
