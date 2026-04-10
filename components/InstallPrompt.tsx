"use client";

import { useState, useEffect } from "react";
import { X, Download, Smartphone, Waves } from "lucide-react";

// Tipe untuk event beforeinstallprompt (tidak ada di TS standard)
interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * InstallPrompt — Komponen "Add to Home Screen"
 *
 * Cara kerja:
 * 1. Mendengarkan event `beforeinstallprompt` dari browser
 * 2. Menampilkan banner ajakan install jika:
 *    - Browser mendukung PWA install
 *    - User belum menginstal aplikasi (bukan standalone mode)
 *    - User belum mendismiss banner (cek localStorage)
 * 3. Saat user klik "Install", memanggil prompt() dari event
 * 4. Menyembunyikan banner setelah install atau dismiss
 */
export default function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] =
        useState<BeforeInstallPromptEvent | null>(null);
    const [showBanner, setShowBanner] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        // Cek apakah sudah dalam mode standalone (sudah diinstall)
        if (window.matchMedia("(display-mode: standalone)").matches) {
            setIsInstalled(true);
            return;
        }

        // Cek apakah user sudah dismiss banner sebelumnya
        const dismissed = localStorage.getItem("sulutdive-install-dismissed");
        if (dismissed) {
            const dismissedDate = new Date(dismissed);
            const daysSinceDismiss =
                (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
            // Tampilkan lagi setelah 7 hari
            if (daysSinceDismiss < 7) return;
        }

        // Intercept event beforeinstallprompt
        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            // Tampilkan banner setelah 3 detik (tidak mengganggu)
            setTimeout(() => setShowBanner(true), 3000);
        };

        window.addEventListener("beforeinstallprompt", handler);

        // Deteksi jika app sudah diinstall
        window.addEventListener("appinstalled", () => {
            setIsInstalled(true);
            setShowBanner(false);
            setDeferredPrompt(null);
        });

        return () => {
            window.removeEventListener("beforeinstallprompt", handler);
        };
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;

        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === "accepted") {
            setIsInstalled(true);
        }

        setShowBanner(false);
        setDeferredPrompt(null);
    };

    const handleDismiss = () => {
        setShowBanner(false);
        localStorage.setItem(
            "sulutdive-install-dismissed",
            new Date().toISOString()
        );
    };

    // Jangan render apa-apa jika sudah installed atau tidak ada prompt
    if (isInstalled || !showBanner) return null;

    return (
        <>
            {/* ─── Backdrop ──────────────────────────────────── */}
            <div
                className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[60] transition-opacity duration-300"
                onClick={handleDismiss}
            />

            {/* ─── Install Banner (Bottom Sheet Style) ────────── */}
            <div className="fixed bottom-0 left-0 right-0 z-[61] animate-slide-up">
                <div className="mx-auto max-w-lg">
                    <div className="bg-white rounded-t-3xl shadow-[0_-20px_60px_rgba(0,0,0,0.15)] overflow-hidden">
                        {/* Drag handle */}
                        <div className="flex justify-center pt-3 pb-2">
                            <div className="w-10 h-1 bg-gray-200 rounded-full" />
                        </div>

                        {/* Header with gradient */}
                        <div className="relative px-6 pt-2 pb-6 text-center overflow-hidden">
                            {/* Background decoration */}
                            <div className="absolute top-0 left-0 right-0 h-full opacity-5">
                                <Waves className="w-full h-full text-primary" />
                            </div>

                            {/* App icon */}
                            <div className="relative w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg"
                                style={{ background: "linear-gradient(135deg, #023E8A, #0077B6)" }}
                            >
                                <span className="text-white font-bold text-xl">SD</span>
                            </div>

                            <h3 className="text-lg font-bold text-deepSea relative">
                                Install SulutDive
                            </h3>
                            <p className="text-sm text-gray-500 mt-1 relative max-w-xs mx-auto">
                                Akses peta dive site, booking, dan info darurat langsung dari home screen — bahkan saat offline!
                            </p>
                        </div>

                        {/* Features */}
                        <div className="px-6 pb-4">
                            <div className="grid grid-cols-3 gap-3 text-center">
                                <div className="p-3 bg-blue-50 rounded-xl">
                                    <Smartphone className="w-5 h-5 text-primary mx-auto mb-1" />
                                    <span className="text-xs text-gray-600 font-medium block">Seperti App</span>
                                </div>
                                <div className="p-3 bg-blue-50 rounded-xl">
                                    <Download className="w-5 h-5 text-primary mx-auto mb-1" />
                                    <span className="text-xs text-gray-600 font-medium block">Ringan</span>
                                </div>
                                <div className="p-3 bg-blue-50 rounded-xl">
                                    <Waves className="w-5 h-5 text-primary mx-auto mb-1" />
                                    <span className="text-xs text-gray-600 font-medium block">Offline</span>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="px-6 pb-8 pt-2 flex gap-3">
                            <button
                                onClick={handleDismiss}
                                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-500 font-medium hover:bg-gray-50 transition-colors text-sm"
                            >
                                Nanti Saja
                            </button>
                            <button
                                onClick={handleInstall}
                                className="flex-[2] py-3 rounded-xl text-white font-semibold shadow-lg hover:shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-sm"
                                style={{
                                    background: "linear-gradient(135deg, #023E8A, #0077B6)",
                                }}
                            >
                                <Download className="w-4 h-4" />
                                Install Aplikasi
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── Slide-up Animation ─────────────────────────── */}
            <style jsx>{`
                @keyframes slide-up {
                    from {
                        transform: translateY(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }
                .animate-slide-up {
                    animation: slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
            `}</style>
        </>
    );
}
