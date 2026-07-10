"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { NavbarAuthState } from "@/lib/auth/navbar-state";

const LAST_ACTIVITY_KEY = "sulutdive-last-activity";
const DEFAULT_IDLE_TIMEOUT_MS = 30 * 60 * 1000;

function getIdleTimeoutMs() {
    const raw = Number(process.env.NEXT_PUBLIC_SESSION_IDLE_TIMEOUT_MS);
    return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_IDLE_TIMEOUT_MS;
}

function readLastActivity() {
    try {
        const value = window.localStorage.getItem(LAST_ACTIVITY_KEY);
        return value ? Number(value) : Date.now();
    } catch {
        return Date.now();
    }
}

function writeLastActivity() {
    try {
        window.localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
    } catch {
        // Privacy settings can block localStorage; keep the app usable.
    }
}

export default function SessionTimeout() {
    const signingOutRef = useRef(false);

    useEffect(() => {
        const idleTimeoutMs = getIdleTimeoutMs();

        const signOutIfAuthenticated = async () => {
            if (signingOutRef.current) return;
            signingOutRef.current = true;
            let shouldRedirect = false;

            try {
                const stateResponse = await fetch("/api/auth/navbar-state", {
                    cache: "no-store",
                    credentials: "same-origin",
                });
                const state = (await stateResponse.json()) as NavbarAuthState;
                if (!state.user) {
                    signingOutRef.current = false;
                    writeLastActivity();
                    return;
                }
                shouldRedirect = true;

                const supabase = createClient();
                await supabase.auth.signOut({ scope: "global" });
                await fetch("/api/auth/idle-signout", {
                    method: "POST",
                    cache: "no-store",
                    credentials: "same-origin",
                });
            } finally {
                if (shouldRedirect) {
                    window.location.href = "/auth/login?message=Sesi+berakhir.+Silakan+login+lagi.";
                }
            }
        };

        const checkIdle = () => {
            const lastActivity = readLastActivity();
            if (Date.now() - lastActivity >= idleTimeoutMs) {
                void signOutIfAuthenticated();
            }
        };

        const recordActivity = () => {
            if (!signingOutRef.current) writeLastActivity();
        };

        checkIdle();
        if (!signingOutRef.current) {
            writeLastActivity();
        }

        const activityEvents: Array<keyof WindowEventMap> = [
            "click",
            "keydown",
            "pointerdown",
            "scroll",
            "touchstart",
        ];

        activityEvents.forEach((eventName) => {
            window.addEventListener(eventName, recordActivity, { passive: true });
        });
        document.addEventListener("visibilitychange", checkIdle);

        const interval = window.setInterval(checkIdle, 60 * 1000);

        return () => {
            activityEvents.forEach((eventName) => {
                window.removeEventListener(eventName, recordActivity);
            });
            document.removeEventListener("visibilitychange", checkIdle);
            window.clearInterval(interval);
        };
    }, []);

    return null;
}
