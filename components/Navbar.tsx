"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Menu, X, Anchor, User, LogOut, ChevronDown, Calendar, ShoppingBag } from "lucide-react";
import { useCartStore } from "@/lib/cart-store";
import { createClient } from "@/lib/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";

export default function Navbar() {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const [user, setUser] = useState<SupabaseUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();

    // Pada halaman selain homepage, navbar langsung tampil dengan warna gelap
    const isHomePage = pathname === "/";
    const isDark = isScrolled || isMobileMenuOpen || !isHomePage;

    // Jangan tampilkan navbar di halaman auth
    const isAuthPage = pathname.startsWith("/auth");

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // Listen to auth state changes
    useEffect(() => {
        // Get initial session
        supabase.auth.getUser().then(({ data: { user } }) => {
            setUser(user);
            setIsLoading(false);
        });

        // Subscribe to auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Close profile menu when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setIsProfileMenuOpen(false);
        if (isProfileMenuOpen) {
            document.addEventListener("click", handleClickOutside);
            return () => document.removeEventListener("click", handleClickOutside);
        }
    }, [isProfileMenuOpen]);

    async function handleSignOut() {
        await supabase.auth.signOut();
        setUser(null);
        setIsProfileMenuOpen(false);
        router.push("/");
        router.refresh();
    }

    if (isAuthPage) return null;

    const navLinks = [
        { name: "Home", href: "/" },
        { name: "Dive Packages", href: "/services" },
        { name: "Dive Map", href: "/lokasi" },
        { name: "Route Planner", href: "/route-planner" },
        { name: "About", href: "/#about" },
    ];

    const userName = user?.user_metadata?.name || user?.email?.split("@")[0] || "User";

    return (
        <nav
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isDark
                ? "bg-white/80 backdrop-blur-md shadow-sm py-4"
                : "bg-transparent py-6"
                }`}
        >
            <div className="container mx-auto px-4 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 group">
                    <div className="bg-gradient-to-br from-primary to-secondary p-2 rounded-lg text-white group-hover:scale-110 transition-transform">
                        <Anchor className="w-6 h-6" />
                    </div>
                    <span className={`text-xl font-bold tracking-tight ${isDark ? "text-deepSea" : "text-white"
                        }`}>
                        Sulut<span className="text-secondary">Dive</span>
                    </span>
                </Link>

                {/* Desktop Nav */}
                <div className="hidden md:flex items-center gap-8">
                    {navLinks.map((link) => (
                        <Link
                            key={link.name}
                            href={link.href}
                            className={`text-sm font-medium hover:text-secondary transition-colors ${isDark ? "text-gray-600" : "text-gray-200"
                                }`}
                        >
                            {link.name}
                        </Link>
                    ))}

                    {/* Cart Button */}
                    <CartIconButton isDark={isDark} />

                    {/* Auth Button */}
                    {isLoading ? (
                        <div className="w-20 h-10 rounded-full bg-gray-200/50 animate-pulse" />
                    ) : user ? (
                        /* Logged in — Profile dropdown */
                        <div className="relative">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsProfileMenuOpen(!isProfileMenuOpen);
                                }}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold transition-all ${isDark
                                    ? "bg-primary/10 text-primary hover:bg-primary/20"
                                    : "bg-white/20 text-white hover:bg-white/30"
                                    }`}
                            >
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-xs font-bold">
                                    {userName.charAt(0).toUpperCase()}
                                </div>
                                <span className="max-w-[100px] truncate">{userName}</span>
                                <ChevronDown className={`w-4 h-4 transition-transform ${isProfileMenuOpen ? "rotate-180" : ""}`} />
                            </button>

                            {/* Dropdown Menu */}
                            {isProfileMenuOpen && (
                                <div
                                    className="absolute right-0 top-full mt-2 w-56 rounded-xl bg-white shadow-lg border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {/* User info */}
                                    <div className="px-4 py-3 border-b border-gray-100">
                                        <p className="text-sm font-semibold text-gray-900 truncate">
                                            {userName}
                                        </p>
                                        <p className="text-xs text-gray-500 truncate">
                                            {user.email}
                                        </p>
                                    </div>

                                    <div className="py-1">
                                        <Link
                                            href="/dashboard"
                                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                            onClick={() => setIsProfileMenuOpen(false)}
                                        >
                                            <User className="w-4 h-4 text-gray-400" />
                                            Profil Saya
                                        </Link>
                                        <Link
                                            href="/dashboard/bookings"
                                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                            onClick={() => setIsProfileMenuOpen(false)}
                                        >
                                            <Calendar className="w-4 h-4 text-gray-400" />
                                            My Bookings
                                        </Link>
                                        <button
                                            onClick={handleSignOut}
                                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                        >
                                            <LogOut className="w-4 h-4" />
                                            Keluar
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Not logged in — Masuk button */
                        <Link
                            href="/auth/login"
                            className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${isDark
                                ? "bg-primary text-white hover:bg-secondary"
                                : "bg-white text-primary hover:bg-gray-100"
                                }`}
                        >
                            Masuk
                        </Link>
                    )}
                </div>

                {/* Mobile Toggle */}
                <button
                    className="md:hidden p-2 text-gray-600"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                    {isMobileMenuOpen ? (
                        <X className={isDark ? "text-deepSea" : "text-white"} />
                    ) : (
                        <Menu className={isDark ? "text-deepSea" : "text-white"} />
                    )}
                </button>
            </div>

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
                <div className="md:hidden absolute top-full left-0 right-0 bg-white border-t border-gray-100 shadow-lg p-4 flex flex-col gap-4 animate-in slide-in-from-top-5">
                    {navLinks.map((link) => (
                        <Link
                            key={link.name}
                            href={link.href}
                            className="text-gray-600 hover:text-primary font-medium py-2"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            {link.name}
                        </Link>
                    ))}

                    {/* Mobile Auth */}
                    {isLoading ? (
                        <div className="w-full h-12 rounded-xl bg-gray-200/50 animate-pulse" />
                    ) : user ? (
                        <div className="border-t border-gray-100 pt-4 space-y-2">
                            <div className="flex items-center gap-3 px-2 py-2">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold">
                                    {userName.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-gray-900">{userName}</p>
                                    <p className="text-xs text-gray-500">{user.email}</p>
                                </div>
                            </div>
                            <Link
                                href="/dashboard"
                                className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                <User className="w-4 h-4 text-gray-400" />
                                Profil Saya
                            </Link>
                            <Link
                                href="/dashboard/bookings"
                                className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                <Calendar className="w-4 h-4 text-gray-400" />
                                My Bookings
                            </Link>
                            <button
                                onClick={() => {
                                    setIsMobileMenuOpen(false);
                                    handleSignOut();
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                            >
                                <LogOut className="w-4 h-4" />
                                Keluar
                            </button>
                        </div>
                    ) : (
                        <Link
                            href="/auth/login"
                            className="w-full bg-primary text-white text-center py-3 rounded-xl font-semibold"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            Masuk / Daftar
                        </Link>
                    )}
                </div>
            )}
        </nav>
    );
}

// ─── Cart Icon with Badge (avoids hydration mismatch) ────────
function CartIconButton({ isDark }: { isDark: boolean }) {
    const openSidebar = useCartStore((s) => s.openSidebar);
    const items = useCartStore((s) => s.items);
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    const count = mounted ? items.length : 0;

    return (
        <button
            onClick={openSidebar}
            className={`relative p-2.5 rounded-full transition-colors ${
                isDark
                    ? "text-gray-600 hover:bg-gray-100"
                    : "text-gray-200 hover:bg-white/20"
            }`}
            title="My Trip"
        >
            <ShoppingBag className="w-5 h-5" />
            {count > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center animate-in zoom-in duration-200">
                    {count}
                </span>
            )}
        </button>
    );
}
