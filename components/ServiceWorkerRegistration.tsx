"use client";

import { useEffect } from "react";

/**
 * ServiceWorkerRegistration — Mendaftarkan service worker secara manual.
 *
 * next-pwa v5.6.0 menghasilkan file sw.js dengan benar saat build,
 * tetapi auto-registration-nya tidak kompatibel dengan Next.js 16 App Router.
 * Komponen ini menangani registrasi secara eksplisit.
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
                    console.log(
                        "✅ Service Worker registered:",
                        registration.scope
                    );

                    // Cek update secara berkala (setiap 1 jam)
                    setInterval(() => {
                        registration.update();
                    }, 60 * 60 * 1000);
                })
                .catch((error) => {
                    console.error("❌ Service Worker registration failed:", error);
                });
        }
    }, []);

    return null;
}
