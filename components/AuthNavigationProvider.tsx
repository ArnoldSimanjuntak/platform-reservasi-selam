"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
    type ReactNode,
} from "react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { NavbarAuthState, NavbarUser } from "@/lib/auth/navbar-state";

const guestAuthState: NavbarAuthState = {
    user: null,
    role: null,
    providerVerified: false,
    isLoading: false,
};

interface AuthNavigationContextValue {
    authState: NavbarAuthState;
    refreshAuthState: (showLoading?: boolean) => Promise<void>;
    markSignedOut: () => void;
}

const AuthNavigationContext = createContext<AuthNavigationContextValue | null>(null);

function isAbortError(error: unknown) {
    if (error instanceof DOMException && error.name === "AbortError") return true;
    if (error instanceof Error && error.name === "AbortError") return true;
    return String(error).toLowerCase().includes("aborted");
}

function sessionUser(session: Session): NavbarUser {
    return {
        id: session.user.id,
        email: session.user.email ?? null,
        name: (session.user.user_metadata?.name as string | undefined) ?? null,
    };
}

export function useAuthNavigation() {
    const context = useContext(AuthNavigationContext);
    if (!context) throw new Error("useAuthNavigation must be used inside AuthNavigationProvider");
    return context;
}

export default function AuthNavigationProvider({
    initialAuthState,
    children,
}: {
    initialAuthState: NavbarAuthState;
    children: ReactNode;
}) {
    const [authState, setAuthState] = useState(initialAuthState);
    const mountedRef = useRef(true);
    const requestIdRef = useRef(0);
    const inFlightRef = useRef<Promise<void> | null>(null);
    const lastRefreshAtRef = useRef(Date.now());

    const markSignedOut = useCallback(() => {
        requestIdRef.current += 1;
        setAuthState(guestAuthState);
    }, []);

    const refreshAuthState = useCallback(async (showLoading = false) => {
        if (inFlightRef.current) return inFlightRef.current;

        const requestId = ++requestIdRef.current;
        if (showLoading) setAuthState((previous) => ({ ...previous, isLoading: true }));

        const request = (async () => {
            try {
                const response = await fetch("/api/auth/navbar-state", {
                    cache: "no-store",
                    credentials: "same-origin",
                    headers: { "Cache-Control": "no-cache" },
                });
                if (!response.ok) throw new Error(`Auth navigation sync failed: ${response.status}`);

                const nextState = (await response.json()) as NavbarAuthState;
                if (!mountedRef.current || requestId !== requestIdRef.current) return;

                setAuthState((previous) => {
                    const sameUser =
                        !!previous.user &&
                        !!nextState.user &&
                        previous.user.id === nextState.user.id;

                    if (sameUser && nextState.user && !nextState.role && previous.role) {
                        return {
                            ...nextState,
                            role: previous.role,
                            providerVerified: previous.providerVerified,
                            isLoading: false,
                        };
                    }

                    return { ...nextState, isLoading: false };
                });
                lastRefreshAtRef.current = Date.now();
            } catch (error) {
                if (!mountedRef.current || requestId !== requestIdRef.current) return;
                if (!isAbortError(error)) console.warn("[AuthNavigation] sync failed:", error);
                setAuthState((previous) => ({ ...previous, isLoading: false }));
            }
        })();

        inFlightRef.current = request;
        try {
            await request;
        } finally {
            if (inFlightRef.current === request) inFlightRef.current = null;
        }
    }, []);

    useEffect(() => {
        setAuthState(initialAuthState);
    }, [initialAuthState]);

    useEffect(() => {
        mountedRef.current = true;
        const supabase = createClient();
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
            if (!mountedRef.current) return;

            if (event === "SIGNED_OUT" || !session?.user) {
                markSignedOut();
                return;
            }

            const user = sessionUser(session);
            setAuthState((previous) => ({
                user,
                role: previous.user?.id === user.id ? previous.role : null,
                providerVerified: previous.user?.id === user.id ? previous.providerVerified : false,
                isLoading: true,
            }));

            const sessionChanged = initialAuthState.user?.id !== user.id;
            if (
                (event === "INITIAL_SESSION" && (sessionChanged || initialAuthState.isLoading)) ||
                event === "SIGNED_IN" ||
                event === "TOKEN_REFRESHED" ||
                event === "USER_UPDATED"
            ) {
                queueMicrotask(() => void refreshAuthState(false));
            }
        });

        return () => {
            mountedRef.current = false;
            subscription.unsubscribe();
        };
    }, [initialAuthState.isLoading, initialAuthState.user?.id, markSignedOut, refreshAuthState]);

    useEffect(() => {
        const refreshWhenActive = () => {
            if (Date.now() - lastRefreshAtRef.current < 5_000) return;
            void refreshAuthState(false);
        };
        const refreshWhenVisible = () => {
            if (document.visibilityState === "visible") refreshWhenActive();
        };

        window.addEventListener("focus", refreshWhenActive);
        window.addEventListener("pageshow", refreshWhenActive);
        document.addEventListener("visibilitychange", refreshWhenVisible);
        return () => {
            window.removeEventListener("focus", refreshWhenActive);
            window.removeEventListener("pageshow", refreshWhenActive);
            document.removeEventListener("visibilitychange", refreshWhenVisible);
        };
    }, [refreshAuthState]);

    return (
        <AuthNavigationContext.Provider value={{ authState, refreshAuthState, markSignedOut }}>
            {children}
        </AuthNavigationContext.Provider>
    );
}
