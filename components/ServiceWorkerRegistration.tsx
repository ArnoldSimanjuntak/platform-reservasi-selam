"use client";

import { useEffect } from "react";
import { clearLegacyPrivateCaches } from "@/lib/pwa/cache";

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
            navigator.serviceWorker
                .register("/sw.js", {
                    scope: "/",
                    updateViaCache: "none",
                })
                .then((registration) => {
                    console.log("[PWA] Service Worker registered:", registration.scope);
                    void registration.update();
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
