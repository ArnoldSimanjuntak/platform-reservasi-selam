"use client";

import { useEffect } from "react";
import { clearLegacyPrivateCaches } from "@/lib/pwa/cache";
import { ensureActiveServiceWorkerRegistration } from "@/lib/pwa/service-worker";

/**
 * Registers the generated next-pwa service worker.
 * The offline page is precached by next-pwa via fallbacks.document.
 */
export default function ServiceWorkerRegistration() {
    useEffect(() => {
        let updateInterval: ReturnType<typeof setInterval> | null = null;
        let cancelled = false;

        if (
            typeof window !== "undefined" &&
            "serviceWorker" in navigator &&
            process.env.NODE_ENV === "production"
        ) {
            ensureActiveServiceWorkerRegistration()
                .then((registration) => {
                    console.log("[PWA] Service Worker active:", registration.scope);
                    void clearLegacyPrivateCaches();

                    if (cancelled) return;
                    updateInterval = setInterval(() => {
                        void registration.update();
                    }, 60 * 60 * 1000);
                })
                .catch((error) => {
                    console.error("[PWA] Service Worker registration failed:", error);
                });
        }

        return () => {
            cancelled = true;
            if (updateInterval) clearInterval(updateInterval);
        };
    }, []);

    return null;
}
