"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BriefcaseBusiness, ClipboardList, Home, Map, User, UserCog } from "lucide-react";
import { useAuthNavigation } from "@/components/AuthNavigationProvider";
import type { NavbarAuthState } from "@/lib/auth/navbar-state";

type BottomNavItem = {
    href: string;
    label: string;
    icon: typeof Home;
    active: (pathname: string) => boolean;
};

function getNavItems(authState: NavbarAuthState): BottomNavItem[] {
    const { user, role, providerVerified } = authState;
    const bookingHref = user ? "/dashboard/bookings" : "/auth/login";
    const profileHref = user ? "/dashboard" : "/auth/login?redirectTo=/dashboard";

    if (role === "provider") {
        if (!providerVerified) {
            return [
                { href: "/dashboard", label: "Dashboard", icon: Home, active: (path) => path === "/dashboard" },
                { href: "/dashboard/provider/setup", label: "Verifikasi", icon: UserCog, active: (path) => path.startsWith("/dashboard/provider/setup") },
            ];
        }

        return [
            { href: "/dashboard", label: "Dashboard", icon: Home, active: (path) => path === "/dashboard" },
            { href: "/dashboard/provider/orders", label: "Pesanan", icon: ClipboardList, active: (path) => path.startsWith("/dashboard/provider/orders") },
            { href: "/dashboard/provider/services", label: "Layanan", icon: BriefcaseBusiness, active: (path) => path.startsWith("/dashboard/provider/services") },
            { href: "/dashboard/provider/setup", label: "Profil Bisnis", icon: UserCog, active: (path) => path.startsWith("/dashboard/provider/setup") },
        ];
    }

    return [
        { href: "/", label: "Beranda", icon: Home, active: (path) => path === "/" },
        { href: "/lokasi", label: "Peta Selam", icon: Map, active: (path) => path.startsWith("/lokasi") },
        { href: bookingHref, label: "Pesanan", icon: ClipboardList, active: (path) => path.startsWith("/dashboard/bookings") },
        { href: profileHref, label: "Profil", icon: User, active: (path) => path === "/dashboard" },
    ];
}

export default function BottomNav() {
    const pathname = usePathname();
    const { authState } = useAuthNavigation();
    const isRoleResolving = !!authState.user && authState.role === null;

    if (
        pathname.startsWith("/auth") ||
        pathname.startsWith("/admin") ||
        authState.role === "admin" ||
        authState.isLoading ||
        isRoleResolving
    ) {
        return null;
    }

    const navItems = getNavItems(authState);

    return (
        <nav
            aria-label="Navigasi utama mobile"
            className="fixed bottom-0 left-0 right-0 z-[100] border-t border-gray-200 bg-white pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)] md:hidden"
        >
            <div className="flex h-16 items-center px-2">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const active = item.active(pathname);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            aria-current={active ? "page" : undefined}
                            className={`flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-1 transition-colors ${active ? "text-[#023E8A]" : "text-slate-400 hover:text-slate-600"}`}
                        >
                            <Icon className={`h-5 w-5 shrink-0 ${active ? "fill-blue-50" : ""}`} />
                            <span className="w-full truncate px-1 text-center text-[10px] font-bold">{item.label}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
