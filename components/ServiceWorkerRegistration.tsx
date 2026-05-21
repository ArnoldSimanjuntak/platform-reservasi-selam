"use client";

import { useEffect } from "react";

const OFFLINE_URL = "/offline";
const OFFLINE_CACHE = "sulutdive-offline-page";

async function warmOfflinePageCache() {
    if (!("caches" in window)) return;

    try {
        const cache = await caches.open(OFFLINE_CACHE);
        await cache.add(new Request(OFFLINE_URL, { cache: "reload" }));
    } catch (error) {
        console.warn("[PWA] Failed to prepare offline page cache:", error);
    }
}

/**
 * Registers the generated next-pwa service worker and keeps the offline page
 * available in Cache Storage even when the generated precache is stale.
 */
export default function ServiceWorkerRegistration() {
    useEffect(() => {
        if (
            typeof window !== "undefined" &&
            "serviceWorker" in navigator &&
            process.env.NODE_ENV === "production"
        ) {
            navigator.serviceWorker
                .register("/sw.js")
                .then((registration) => {
                    console.log("[PWA] Service Worker registered:", registration.scope);

                    void registration.update();
                    void warmOfflinePageCache();

                    navigator.serviceWorker.ready
                        .then(() => {
                            void warmOfflinePageCache();
                        })
                        .catch((error) => {
                            console.warn("[PWA] Service Worker is not ready yet:", error);
                        });

                    setInterval(() => {
                        void registration.update();
                        void warmOfflinePageCache();
                    }, 60 * 60 * 1000);
                })
                .catch((error) => {
                    console.error("[PWA] Service Worker registration failed:", error);
                });
        }
    }, []);

    return null;
}
