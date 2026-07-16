"use client";

import { useCallback, useEffect, useState } from "react";
import {
    AlertCircle,
    Bell,
    BellOff,
    CheckCircle2,
    Loader2,
    X,
} from "lucide-react";
import { savePushSubscription, sendTestPushNotification } from "@/app/actions/push";
import { useAuthNavigation } from "@/components/AuthNavigationProvider";
import {
    getCurrentPushSubscription,
    unsubscribeCurrentDevicePush,
} from "@/lib/push/client";
import type { SerializedPushSubscription } from "@/lib/push/types";

type PushState = "checking" | "available" | "enabled" | "denied" | "unsupported" | "error";

function urlBase64ToUint8Array(value: string) {
    const padding = "=".repeat((4 - (value.length % 4)) % 4);
    const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
    const binary = window.atob(base64);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function serializeSubscription(subscription: PushSubscription): SerializedPushSubscription | null {
    const json = subscription.toJSON();
    const p256dh = json.keys?.p256dh;
    const auth = json.keys?.auth;
    if (!json.endpoint || !p256dh || !auth) return null;

    return {
        endpoint: json.endpoint,
        expirationTime: json.expirationTime ?? null,
        keys: { p256dh, auth },
    };
}

function isStandaloneDisplay() {
    return (
        window.matchMedia("(display-mode: standalone)").matches ||
        ("standalone" in window.navigator &&
            Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone))
    );
}

export default function PushNotificationManager() {
    const { authState } = useAuthNavigation();
    const [pushState, setPushState] = useState<PushState>("checking");
    const [isOpen, setIsOpen] = useState(false);
    const [isWorking, setIsWorking] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);

    const refreshPushState = useCallback(async () => {
        if (!authState.user) {
            setPushState("checking");
            return;
        }

        const iOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
        setIsIOS(iOS);
        setIsStandalone(isStandaloneDisplay());

        // next-pwa is disabled while `next dev` is running, so waiting for
        // navigator.serviceWorker.ready there would never finish.
        if (process.env.NODE_ENV !== "production") {
            setPushState("unsupported");
            return;
        }

        if (
            !("serviceWorker" in navigator) ||
            !("PushManager" in window) ||
            !("Notification" in window)
        ) {
            setPushState("unsupported");
            return;
        }

        if (Notification.permission === "denied") {
            setPushState("denied");
            return;
        }

        try {
            const subscription = await getCurrentPushSubscription();
            if (!subscription) {
                setPushState("available");
                return;
            }

            const serialized = serializeSubscription(subscription);
            if (!serialized) {
                setPushState("error");
                return;
            }

            // Re-associate an existing browser subscription with the current
            // authenticated account after a session refresh or account switch.
            const result = await savePushSubscription(serialized, window.navigator.userAgent);
            if (!result.success) {
                setMessage(result.message);
                setPushState("error");
                return;
            }
            setPushState("enabled");
        } catch (error) {
            console.warn("[push] Failed to read subscription:", error);
            setPushState("error");
        }
    }, [authState.user]);

    useEffect(() => {
        void refreshPushState();
    }, [refreshPushState]);

    const enableNotifications = async () => {
        if (isWorking) return;
        setIsWorking(true);
        setMessage(null);

        try {
            const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
            if (!publicKey) throw new Error("Public VAPID key belum dikonfigurasi.");
            if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
                setPushState("unsupported");
                return;
            }

            const permission = await Notification.requestPermission();
            if (permission === "denied") {
                setPushState("denied");
                setMessage("Izin ditolak. Aktifkan kembali melalui pengaturan browser/perangkat.");
                return;
            }
            if (permission !== "granted") {
                setPushState("available");
                setMessage("Izin notifikasi belum diberikan.");
                return;
            }

            const registration = await navigator.serviceWorker.ready;
            const current = await registration.pushManager.getSubscription();
            const subscription = current ?? await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicKey),
            });
            const serialized = serializeSubscription(subscription);
            if (!serialized) throw new Error("Browser tidak memberikan kunci subscription yang lengkap.");

            const result = await savePushSubscription(serialized, window.navigator.userAgent);
            if (!result.success) throw new Error(result.message);

            setPushState("enabled");
            setMessage(result.message);
        } catch (error) {
            console.error("[push] Activation failed:", error);
            setPushState("error");
            setMessage(error instanceof Error ? error.message : "Notifikasi gagal diaktifkan.");
        } finally {
            setIsWorking(false);
        }
    };

    const disableNotifications = async () => {
        if (isWorking) return;
        setIsWorking(true);
        setMessage(null);

        try {
            await unsubscribeCurrentDevicePush();
            setPushState(Notification.permission === "denied" ? "denied" : "available");
            setMessage("Notifikasi dinonaktifkan pada perangkat ini.");
        } finally {
            setIsWorking(false);
        }
    };

    const testNotifications = async () => {
        if (isWorking) return;
        setIsWorking(true);
        setMessage(null);

        try {
            const result = await sendTestPushNotification();
            setMessage(result.message);
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Notifikasi uji gagal dikirim.");
        } finally {
            setIsWorking(false);
        }
    };

    if (!authState.user || authState.isLoading) return null;

    const enabled = pushState === "enabled";

    return (
        <div className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] right-4 z-[105] md:bottom-24 md:right-6">
            {isOpen && (
                <div className="mb-3 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                    <div
                        className="flex items-center justify-between gap-3 px-4 py-3 text-white"
                        style={{ background: "linear-gradient(135deg, #023E8A, #0077B6)" }}
                    >
                        <div className="flex min-w-0 items-center gap-2">
                            <Bell className="h-5 w-5 shrink-0" />
                            <div className="min-w-0">
                                <p className="text-sm font-black">Push Notification</p>
                                <p className="truncate text-[11px] text-blue-100">Pembaruan booking dan verifikasi</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="rounded-full p-1.5 text-white/80 hover:bg-white/10 hover:text-white"
                            aria-label="Tutup pengaturan notifikasi"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="space-y-3 p-4">
                        {pushState === "checking" && (
                            <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                                <Loader2 className="h-4 w-4 animate-spin text-[#0077B6]" />
                                Memeriksa dukungan perangkat...
                            </div>
                        )}

                        {enabled && (
                            <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                                <p className="text-xs font-semibold leading-5 text-emerald-800">
                                    Notifikasi aktif pada perangkat ini. SulutDive dapat memberi tahu perubahan penting meskipun aplikasi berada di background.
                                </p>
                            </div>
                        )}

                        {pushState === "available" && (
                            <p className="text-xs font-semibold leading-5 text-slate-600">
                                Aktifkan agar Anda menerima pembaruan booking, pembayaran, dan verifikasi provider.
                            </p>
                        )}

                        {pushState === "denied" && (
                            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3">
                                <BellOff className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                                <p className="text-xs font-semibold leading-5 text-red-700">
                                    Izin notifikasi diblokir. Buka pengaturan situs atau pengaturan notifikasi perangkat untuk mengaktifkannya kembali.
                                </p>
                            </div>
                        )}

                        {pushState === "unsupported" && (
                            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
                                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                                <p className="text-xs font-semibold leading-5 text-amber-800">
                                    {isIOS && !isStandalone
                                        ? "Pada iPhone/iPad, tambahkan SulutDive ke Home Screen lalu buka dari ikon aplikasi sebelum mengaktifkan notifikasi."
                                        : "Browser atau perangkat ini belum mendukung Web Push."}
                                </p>
                            </div>
                        )}

                        {pushState === "error" && (
                            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3">
                                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                                <p className="text-xs font-semibold leading-5 text-red-700">
                                    Konfigurasi notifikasi belum siap atau terjadi gangguan. {message}
                                </p>
                            </div>
                        )}

                        {message && pushState !== "error" && (
                            <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
                                {message}
                            </p>
                        )}

                        {pushState !== "checking" && pushState !== "unsupported" && pushState !== "denied" && (
                            <div className="space-y-2">
                                {enabled && (
                                    <button
                                        type="button"
                                        onClick={testNotifications}
                                        disabled={isWorking}
                                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#023E8A] px-4 py-3 text-sm font-black text-white transition hover:bg-[#0077B6] disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {isWorking ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Bell className="h-4 w-4" />
                                        )}
                                        {isWorking ? "Mengirim..." : "Kirim Notifikasi Uji"}
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={enabled ? disableNotifications : enableNotifications}
                                    disabled={isWorking}
                                    className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${
                                        enabled
                                            ? "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                                            : "bg-[#023E8A] text-white hover:bg-[#0077B6]"
                                    }`}
                                >
                                    {isWorking ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : enabled ? (
                                        <BellOff className="h-4 w-4" />
                                    ) : (
                                        <Bell className="h-4 w-4" />
                                    )}
                                    {isWorking
                                        ? "Memproses..."
                                        : enabled
                                            ? "Nonaktifkan di Perangkat Ini"
                                            : "Aktifkan Notifikasi"}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <button
                type="button"
                onClick={() => setIsOpen((current) => !current)}
                className="relative flex items-center gap-2 rounded-2xl bg-[#023E8A] px-3 py-3 text-sm font-black text-white shadow-xl transition hover:bg-[#0077B6] active:scale-95 sm:px-4"
                aria-expanded={isOpen}
                aria-label="Pengaturan push notification"
            >
                {enabled ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
                <span className="hidden sm:inline">{enabled ? "Notifikasi Aktif" : "Notifikasi"}</span>
                {enabled && (
                    <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white bg-emerald-400" />
                )}
            </button>
        </div>
    );
}
