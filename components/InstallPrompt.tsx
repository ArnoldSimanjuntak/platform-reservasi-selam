"use client";

import { useState, useEffect } from "react";
import { X, Download, Smartphone, Waves } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface NavigatorWithPwaExtensions extends Navigator {
    standalone?: boolean;
    brave?: { isBrave?: () => Promise<boolean> };
}

interface WindowWithLegacyMsStream extends Window {
    MSStream?: unknown;
}

declare global {
    interface Window {
        __deferredInstallPrompt?: BeforeInstallPromptEvent | null;
    }
}

export default function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showBanner, setShowBanner] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);
    const [isInstalling, setIsInstalling] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isBrave, setIsBrave] = useState(false);

    const getDismissedAt = (): string | null => {
        try {
            return localStorage.getItem("sulutdive-install-dismissed");
        } catch {
            return null;
        }
    };

    const setDismissedAt = () => {
        try {
            localStorage.setItem("sulutdive-install-dismissed", new Date().toISOString());
        } catch {
            // Storage bisa diblokir oleh privacy settings browser (mis. Brave Shields strict).
            // Jangan gagalkan UX install prompt hanya karena localStorage tidak tersedia.
        }
    };

    useEffect(() => {
        const navigatorWithPwa = window.navigator as NavigatorWithPwaExtensions;

        if (
            window.matchMedia("(display-mode: standalone)").matches ||
            navigatorWithPwa.standalone === true
        ) {
            setIsInstalled(true);
            return;
        }

        const detectedIOS =
            /iPad|iPhone|iPod/.test(window.navigator.userAgent) &&
            !(window as WindowWithLegacyMsStream).MSStream;
        const detectedBrave = Boolean(navigatorWithPwa.brave?.isBrave);
        setIsIOS(detectedIOS);
        setIsBrave(detectedBrave);

        const maybeShowBanner = () => {
            const dismissed = getDismissedAt();
            if (dismissed) {
                const daysSince =
                    (Date.now() - new Date(dismissed).getTime()) / (1000 * 60 * 60 * 24);
                if (daysSince < 7) return;
            }
            setTimeout(() => setShowBanner(true), 1200);
        };

        const captureExistingPrompt = () => {
            if (window.__deferredInstallPrompt) {
                setDeferredPrompt(window.__deferredInstallPrompt);
                maybeShowBanner();
            } else if (detectedIOS || detectedBrave) {
                maybeShowBanner();
            }
        };

        captureExistingPrompt();
        const t1 = setTimeout(captureExistingPrompt, 400);
        const t2 = setTimeout(captureExistingPrompt, 1200);

        const handler = (e: Event) => {
            e.preventDefault();
            const prompt = e as BeforeInstallPromptEvent;
            window.__deferredInstallPrompt = prompt;
            setDeferredPrompt(prompt);
            maybeShowBanner();
        };

        const appInstalledHandler = () => {
            setIsInstalled(true);
            setShowBanner(false);
            setDeferredPrompt(null);
            window.__deferredInstallPrompt = null;
        };

        window.addEventListener("beforeinstallprompt", handler);
        window.addEventListener("appinstalled", appInstalledHandler);

        return () => {
            window.removeEventListener("beforeinstallprompt", handler);
            window.removeEventListener("appinstalled", appInstalledHandler);
            clearTimeout(t1);
            clearTimeout(t2);
        };
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;
        setIsInstalling(true);
        try {
            await deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === "accepted") {
                setIsInstalled(true);
            }
        } finally {
            setIsInstalling(false);
            setShowBanner(false);
            setDeferredPrompt(null);
            window.__deferredInstallPrompt = null;
        }
    };

    const handleDismiss = () => {
        setShowBanner(false);
        setDismissedAt();
    };

    if (isInstalled) return null;

    return (
        <>
            {showBanner && (deferredPrompt || isIOS || isBrave) && (
                <>
                    <div
                        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[120] transition-opacity duration-300"
                        onClick={handleDismiss}
                    />

                    <div className="fixed left-0 right-0 z-[121] animate-slide-up bottom-[calc(4.5rem+env(safe-area-inset-bottom))] md:bottom-0">
                        <div className="mx-auto max-w-lg">
                            <div className="bg-white rounded-t-3xl shadow-[0_-20px_60px_rgba(0,0,0,0.15)] overflow-hidden">
                                <div className="flex justify-center pt-3 pb-2">
                                    <div className="w-10 h-1 bg-gray-200 rounded-full" />
                                </div>

                                <button
                                    onClick={handleDismiss}
                                    className="absolute top-4 right-4 z-10 p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>

                                <div className="relative px-6 pt-2 pb-6 text-center overflow-hidden">
                                    <div
                                        className="relative w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg"
                                        style={{ background: "linear-gradient(135deg, #023E8A, #0077B6)" }}
                                    >
                                        <span className="text-white font-bold text-xl">SD</span>
                                    </div>
                                    <h3 className="text-lg font-bold text-deepSea relative">Install SulutDive</h3>
                                    <p className="text-sm text-gray-500 mt-1 relative max-w-xs mx-auto">
                                        Akses peta dive site, booking, dan info darurat langsung dari home screen.
                                    </p>
                                    {isIOS && !deferredPrompt && (
                                        <p className="text-xs text-blue-700 mt-2 font-semibold">
                                            iPhone/iPad: tekan Share lalu Add to Home Screen.
                                        </p>
                                    )}
                                    {!isIOS && isBrave && !deferredPrompt && (
                                        <p className="text-xs text-blue-700 mt-2 font-semibold">
                                            Brave: buka menu (≡) lalu Save and Share - Install page as app.
                                        </p>
                                    )}
                                </div>

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

                                <div className="px-6 pb-8 pt-2 flex gap-3">
                                    <button
                                        onClick={handleDismiss}
                                        className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-500 font-medium hover:bg-gray-50 transition-colors text-sm"
                                    >
                                        Nanti Saja
                                    </button>
                                    {deferredPrompt ? (
                                        <button
                                            onClick={handleInstall}
                                            disabled={isInstalling}
                                            className="flex-[2] py-3 rounded-xl text-white font-semibold shadow-lg hover:shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-sm disabled:opacity-70"
                                            style={{ background: "linear-gradient(135deg, #023E8A, #0077B6)" }}
                                        >
                                            <Download className="w-4 h-4" />
                                            {isInstalling ? "Menginstall..." : "Install Aplikasi"}
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleDismiss}
                                            className="flex-[2] py-3 rounded-xl text-white font-semibold shadow-lg flex items-center justify-center gap-2 text-sm"
                                            style={{ background: "linear-gradient(135deg, #023E8A, #0077B6)" }}
                                        >
                                            <Smartphone className="w-4 h-4" />
                                            Saya Mengerti
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {!showBanner && deferredPrompt && (
                <button
                    onClick={handleInstall}
                    disabled={isInstalling}
                    title="Install SulutDive ke Home Screen"
                    className="fixed right-5 z-[110] flex items-center gap-2 px-4 py-3 rounded-2xl text-white text-sm font-bold shadow-xl hover:shadow-2xl transition-all active:scale-95 disabled:opacity-70 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] md:bottom-6"
                    style={{ background: "linear-gradient(135deg, #023E8A, #0077B6)" }}
                >
                    <Download className="w-4 h-4" />
                    <span>{isInstalling ? "Menginstall..." : "Install App"}</span>
                </button>
            )}

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
