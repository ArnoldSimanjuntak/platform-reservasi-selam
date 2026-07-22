"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BellRing, X } from "lucide-react";

interface PushBannerPayload {
    title: string;
    body: string;
    url: string;
}

const MAX_NOTIFICATION_QUEUE = 3;

function getSafePath(value: string) {
    try {
        const url = new URL(value, window.location.origin);
        if (url.origin !== window.location.origin) return "/dashboard";
        return `${url.pathname}${url.search}${url.hash}`;
    } catch {
        return "/dashboard";
    }
}

export default function PushInAppBanner() {
    const router = useRouter();
    const [notifications, setNotifications] = useState<PushBannerPayload[]>([]);
    const notification = notifications[0] ?? null;

    const dismissCurrent = () => {
        setNotifications((current) => current.slice(1));
    };

    useEffect(() => {
        if (!("serviceWorker" in navigator)) return;

        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type !== "SULUTDIVE_PUSH_RECEIVED") return;
            const payload = event.data.payload as Partial<PushBannerPayload> | undefined;
            if (!payload?.title || !payload.body) return;

            const nextNotification: PushBannerPayload = {
                title: String(payload.title),
                body: String(payload.body),
                url: getSafePath(String(payload.url || "/dashboard")),
            };
            setNotifications((current) => {
                if (current.length < MAX_NOTIFICATION_QUEUE) {
                    return [...current, nextNotification];
                }

                // Pertahankan banner aktif dan dua pembaruan paling baru.
                return [current[0], current[current.length - 1], nextNotification];
            });

            const responsePort = event.ports[0];
            if (responsePort) {
                try {
                    responsePort.postMessage({ type: "SULUTDIVE_PUSH_ACK" });
                } finally {
                    responsePort.close();
                }
            }
        };

        navigator.serviceWorker.addEventListener("message", handleMessage);
        return () => {
            navigator.serviceWorker.removeEventListener("message", handleMessage);
        };
    }, []);

    useEffect(() => {
        if (!notification) return;
        const timeoutId = window.setTimeout(
            () => setNotifications((current) => current.slice(1)),
            8000
        );
        return () => window.clearTimeout(timeoutId);
    }, [notification]);

    if (!notification) return null;

    return (
        <div className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+0.75rem)] z-[200] flex justify-center px-3">
            <div
                role="status"
                aria-live="polite"
                aria-atomic="true"
                className="pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border border-blue-200 bg-white p-4 shadow-[0_18px_60px_rgba(2,62,138,0.3)] animate-in slide-in-from-top-4 fade-in"
            >
                <button
                    type="button"
                    onClick={() => {
                        router.push(notification.url);
                        dismissCurrent();
                    }}
                    className="flex min-w-0 flex-1 items-start gap-3 text-left"
                >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#023E8A] text-white">
                        <BellRing className="h-5 w-5" />
                    </span>
                    <span className="min-w-0">
                        <span className="block text-sm font-black text-slate-900">{notification.title}</span>
                        <span className="mt-0.5 block text-xs font-medium leading-5 text-slate-600">{notification.body}</span>
                        <span className="mt-1 block text-[11px] font-bold text-primary">Ketuk untuk membuka</span>
                    </span>
                </button>
                <button
                    type="button"
                    onClick={dismissCurrent}
                    className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                    aria-label="Tutup notifikasi"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}
