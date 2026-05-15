"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BriefcaseBusiness, ClipboardList, Home, Map, User, UserCog } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { NavbarInitialAuthState } from "@/components/Navbar";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

interface BottomNavProps {
    initialAuthState?: NavbarInitialAuthState;
}

type BottomNavItem = {
    href: string;
    label: string;
    icon: typeof Home;
    active: (pathname: string) => boolean;
};

function isAbortError(error: unknown): boolean {
    if (error instanceof DOMException && error.name === "AbortError") return true;
    if (error instanceof Error && error.name === "AbortError") return true;
    return String(error).toLowerCase().includes("aborted");
}

function getNavItems(authState: NavbarInitialAuthState): BottomNavItem[] {
    const { user, role, providerVerified } = authState;
    const isAuthenticated = !!user;
    const bookingHref = isAuthenticated ? "/dashboard/bookings" : "/auth/login";
    const profileHref = isAuthenticated ? "/dashboard" : "/auth/login?redirectTo=/dashboard";

    if (role === "provider") {
        if (!providerVerified) {
            return [
                {
                    href: "/dashboard",
                    label: "Dashboard",
                    icon: Home,
                    active: (currentPath) => currentPath === "/dashboard",
                },
                {
                    href: "/dashboard/provider/setup",
                    label: "Verifikasi",
                    icon: UserCog,
                    active: (currentPath) => currentPath.startsWith("/dashboard/provider/setup"),
                },
            ];
        }

        return [
            {
                href: "/dashboard",
                label: "Dashboard",
                icon: Home,
                active: (currentPath) => currentPath === "/dashboard",
            },
            {
                href: "/dashboard/provider/orders",
                label: "Pesanan",
                icon: ClipboardList,
                active: (currentPath) => currentPath.startsWith("/dashboard/provider/orders"),
            },
            {
                href: "/dashboard/provider/services",
                label: "Layanan",
                icon: BriefcaseBusiness,
                active: (currentPath) => currentPath.startsWith("/dashboard/provider/services"),
            },
            {
                href: "/dashboard/provider/setup",
                label: "Profil Bisnis",
                icon: UserCog,
                active: (currentPath) => currentPath.startsWith("/dashboard/provider/setup"),
            },
        ];
    }

    return [
        {
            href: "/",
            label: "Home",
            icon: Home,
            active: (currentPath) => currentPath === "/",
        },
        {
            href: "/lokasi",
            label: "Dive Map",
            icon: Map,
            active: (currentPath) => currentPath.startsWith("/lokasi"),
        },
        {
            href: bookingHref,
            label: "Pesanan",
            icon: ClipboardList,
            active: (currentPath) => currentPath.startsWith("/dashboard/bookings"),
        },
        {
            href: profileHref,
            label: "Profil",
            icon: User,
            active: (currentPath) => currentPath === "/dashboard",
        },
    ];
}

export default function BottomNav({ initialAuthState }: BottomNavProps) {
    const [authState, setAuthState] = useState<NavbarInitialAuthState>(
        initialAuthState ?? {
            user: null,
            role: null,
            providerVerified: false,
            isLoading: true,
        }
    );
    const pathname = usePathname();
    const mountedRef = useRef(true);
    const authRequestIdRef = useRef(0);

    const syncAuthStateFromServer = useCallback(async (showLoading: boolean) => {
        const requestId = ++authRequestIdRef.current;
        if (showLoading) {
            setAuthState((prev) => ({ ...prev, isLoading: true }));
        }

        try {
            const response = await fetch("/api/auth/navbar-state", {
                cache: "no-store",
                credentials: "same-origin",
            });
            if (!response.ok) throw new Error(`Bottom nav auth sync failed: ${response.status}`);

            const nextState = (await response.json()) as NavbarInitialAuthState;
            if (!mountedRef.current || requestId !== authRequestIdRef.current) return;
            setAuthState(nextState);
        } catch (error) {
            if (!mountedRef.current || requestId !== authRequestIdRef.current) return;
            if (!isAbortError(error)) {
                console.warn("[BottomNav] server auth sync error:", error);
            }
            setAuthState((prev) => ({ ...prev, isLoading: false }));
        }
    }, []);

    useEffect(() => {
        if (!initialAuthState) return;
        setAuthState(initialAuthState);
    }, [initialAuthState]);

    useEffect(() => {
        mountedRef.current = true;
        const supabase = createClient();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event: AuthChangeEvent, session: Session | null) => {
                if (!mountedRef.current) return;

                if (event === "SIGNED_OUT" || !session?.user) {
                    authRequestIdRef.current++;
                    setAuthState({
                        user: null,
                        role: null,
                        providerVerified: false,
                        isLoading: false,
                    });
                    return;
                }

                if (event === "INITIAL_SESSION") {
                    if (!initialAuthState) {
                        void syncAuthStateFromServer(false);
                    }
                    return;
                }

                if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
                    setAuthState((prev) => ({
                        ...prev,
                        user: {
                            id: session.user.id,
                            email: session.user.email ?? null,
                            name: (session.user.user_metadata?.name as string | undefined) ?? null,
                        },
                        role: prev.user?.id === session.user.id ? prev.role : null,
                        providerVerified: prev.user?.id === session.user.id ? prev.providerVerified : false,
                        isLoading: true,
                    }));

                    setTimeout(() => {
                        void syncAuthStateFromServer(false);
                    }, 0);
                }
            }
        );

        if (!initialAuthState) {
            void syncAuthStateFromServer(true);
        }

        return () => {
            mountedRef.current = false;
            subscription.unsubscribe();
        };
    }, [initialAuthState, syncAuthStateFromServer]);

    const isAuthPage = pathname.startsWith("/auth");
    const isAdminPage = pathname.startsWith("/admin");
    const isRoleResolving = !!authState.user && authState.role === null;

    if (isAuthPage || isAdminPage || authState.role === "admin" || authState.isLoading || isRoleResolving) {
        return null;
    }

    const navItems = getNavItems(authState);

    return (
        <nav
            aria-label="Navigasi utama mobile"
            className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-[100] pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)]"
        >
            <div className="flex items-center h-16 px-2">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = item.active(pathname);

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex flex-col items-center justify-center min-w-0 flex-1 h-full gap-1 transition-colors ${
                                isActive ? "text-[#023E8A]" : "text-slate-400 hover:text-slate-600"
                            }`}
                            aria-current={isActive ? "page" : undefined}
                        >
                            <Icon className={`w-5 h-5 shrink-0 ${isActive ? "fill-blue-50" : ""}`} />
                            <span className="w-full truncate px-1 text-center text-[10px] font-bold">
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
