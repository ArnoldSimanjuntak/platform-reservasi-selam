"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Menu, X, Anchor, User, LogOut, ChevronDown, Calendar, Ship, ClipboardList, UserCog } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { signOut as serverSignOut } from "@/app/auth/actions";
import type { User as SupabaseUser } from "@supabase/supabase-js";

export default function Navbar() {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const [user, setUser] = useState<SupabaseUser | null>(null);
    const [userRole, setUserRole] = useState<string>("customer");
    const [isLoading, setIsLoading] = useState(true);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const pathname = usePathname();
    const router = useRouter();

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

    // ── fetchAndSetRole: ambil role dari DB, lebih akurat dari user_metadata ──
    const fetchAndSetRole = useCallback(async (userId: string, supabase: ReturnType<typeof createClient>) => {
        const { data } = await supabase
            .from("users")
            .select("role")
            .eq("id", userId)
            .single();
        if (data?.role) setUserRole(data.role);
    }, []);

    // ── Listen to auth state changes + re-sync role saat navigasi ──
    useEffect(() => {
        let mounted = true;
        const supabase = createClient();

        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!mounted) return;

            if (user) {
                // Render UI secepatnya
                setUser(user);
                setIsLoading(false);
                
                // Ambil status role dari DB untuk provider/customer
                const { data } = await supabase.from("users").select("role").eq("id", user.id).single();
                
                if (mounted) {
                    if (!data?.role) {
                        setUserRole("customer");
                    } else {
                        setUserRole(data.role);
                    }
                }
            } else {
                if (mounted) {
                    setUserRole("customer");
                    setUser(null);
                    setIsLoading(false);
                }
            }
        };

        checkUser();

        // Subscribe to auth changes (login/logout di tab lain, token refresh)
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, session) => {
            const currentUser = session?.user ?? null;

            if (currentUser) {
                setUser(currentUser);
                setIsLoading(false);

                const { data } = await supabase.from("users").select("role").eq("id", currentUser.id).single();
                
                if (data?.role) {
                    setUserRole(data.role);
                } else {
                    setUserRole("customer");
                }

                if (event === "SIGNED_IN") {
                    router.refresh();
                } else if (event === "TOKEN_REFRESHED") {
                    router.refresh();
                }
            } else {
                setUserRole("customer");
                setUser(null);
                setIsLoading(false);
                if (event === "SIGNED_OUT") {
                    router.refresh();
                }
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    // Re-sync role setiap kali user navigasi ke halaman baru
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname]);

    // Close profile menu when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setIsProfileMenuOpen(false);
        if (isProfileMenuOpen) {
            document.addEventListener("click", handleClickOutside);
            return () => document.removeEventListener("click", handleClickOutside);
        }
    }, [isProfileMenuOpen]);

    async function handleSignOut() {
        setIsLoggingOut(true);
        // Hapus auth local storage secara eksplisit
        const supabase = createClient();
        await supabase.auth.signOut();
        
        // Panggil server action yang akan menghapus cookie dan melakukan redirect.
        // JANGAN dibungkus try/catch agar error NEXT_REDIRECT tidak tertelan.
        await serverSignOut();
    }

    if (isAuthPage) return null;

    // ─── Role-Based Navigation Links ─────────────────────────
    type NavLink = { name: string; href: string; isButton?: boolean };

    const customerNavLinks: NavLink[] = [
        { name: "Home", href: "/" },
        { name: "Dive Packages", href: "/services" },
        { name: "Dive Map", href: "/lokasi" },
        { name: "Route Planner", href: "/route-planner" },
        { name: "About", href: "/about" },
    ];

    const providerNavLinks: NavLink[] = [
        { name: "Dashboard", href: "/dashboard" },
        { name: "Manajemen Kapal", href: "/dashboard/provider/services" },
        { name: "Dashboard Pesanan", href: "/dashboard/provider/orders" },
        { name: "Profil Bisnis", href: "/dashboard/provider/setup" },
    ];

    const adminNavLinks: NavLink[] = [
        { name: "Dashboard", href: "/dashboard" },
        { name: "Kelola Layanan", href: "/admin/services" },
        { name: "Panel Admin", href: "/admin", isButton: true },
    ];


    const isProvider = userRole === "provider";
    const isAdmin = userRole === "admin";
    
    let navLinks: NavLink[] = customerNavLinks;
    if (isAdmin) navLinks = adminNavLinks;
    else if (user && isProvider) navLinks = providerNavLinks;

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
                <Link href={isAdmin || isProvider ? "/dashboard" : "/"} className="flex items-center gap-2 group">
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
                            className={
                                link.isButton 
                                ? `px-4 py-2 rounded-lg text-sm font-bold transition-colors ${isDark ? "bg-[#023E8A] text-white hover:bg-blue-800" : "bg-white text-[#023E8A] hover:bg-gray-100"}` 
                                : `text-sm font-semibold hover:text-[#0077B6] transition-colors ${isDark ? "text-slate-800" : "text-white"}`
                            }
                        >
                            {link.name}
                        </Link>
                    ))}

                    {/* History Button — hanya untuk customer */}
                    {!isProvider && !isAdmin && <BookingHistoryButton isDark={isDark} />}

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
                                        {isProvider && (
                                            <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary tracking-wide">
                                                PROVIDER
                                            </span>
                                        )}
                                    </div>

                                    <div className="py-1">
                                        {isAdmin ? (
                                            /* Admin dropdown items */
                                            <>
                                                <Link
                                                    href="/dashboard"
                                                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                                    onClick={() => setIsProfileMenuOpen(false)}
                                                >
                                                    <User className="w-4 h-4 text-gray-400" />
                                                    Dashboard Admin
                                                </Link>
                                                <Link
                                                    href="/admin/verifikasi"
                                                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                                    onClick={() => setIsProfileMenuOpen(false)}
                                                >
                                                    <UserCog className="w-4 h-4 text-gray-400" />
                                                    Panel Verifikasi
                                                </Link>
                                                <Link
                                                    href="/dashboard/provider/services"
                                                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                                    onClick={() => setIsProfileMenuOpen(false)}
                                                >
                                                    <Ship className="w-4 h-4 text-gray-400" />
                                                    Master Layanan
                                                </Link>
                                            </>
                                        ) : isProvider ? (
                                            /* Provider dropdown items */
                                            <>
                                                <Link
                                                    href="/dashboard"
                                                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                                    onClick={() => setIsProfileMenuOpen(false)}
                                                >
                                                    <User className="w-4 h-4 text-gray-400" />
                                                    Dashboard
                                                </Link>
                                                <Link
                                                    href="/dashboard/provider/services"
                                                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                                    onClick={() => setIsProfileMenuOpen(false)}
                                                >
                                                    <Ship className="w-4 h-4 text-gray-400" />
                                                    Manajemen Kapal
                                                </Link>
                                                <Link
                                                    href="/dashboard/provider/orders"
                                                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                                    onClick={() => setIsProfileMenuOpen(false)}
                                                >
                                                    <ClipboardList className="w-4 h-4 text-gray-400" />
                                                    Daftar Pesanan
                                                </Link>
                                                <Link
                                                    href="/dashboard/provider/setup"
                                                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                                    onClick={() => setIsProfileMenuOpen(false)}
                                                >
                                                    <UserCog className="w-4 h-4 text-gray-400" />
                                                    Profil Bisnis
                                                </Link>
                                            </>
                                        ) : (
                                            /* Customer dropdown items */
                                            <>
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
                                                    Booking Saya
                                                </Link>
                                            </>
                                        )}
                                        <button
                                            onClick={() => {
                                                setIsProfileMenuOpen(false);
                                                handleSignOut();
                                            }}
                                            disabled={isLoggingOut}
                                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors border-t border-gray-100 disabled:opacity-50"
                                        >
                                            {isLoggingOut ? (
                                                <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                                            ) : (
                                                <LogOut className="w-4 h-4" />
                                            )}
                                            {isLoggingOut ? "Keluar..." : "Keluar"}
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
                                {isProvider && (
                                    <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
                                        PROVIDER
                                    </span>
                                )}
                            </div>

                            {isAdmin ? (
                                /* Admin mobile items */
                                <>
                                    <Link
                                        href="/dashboard"
                                        className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                        <User className="w-4 h-4 text-gray-400" />
                                        Dashboard Admin
                                    </Link>
                                    <Link
                                        href="/admin/verifikasi"
                                        className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                        <UserCog className="w-4 h-4 text-gray-400" />
                                        Panel Verifikasi
                                    </Link>
                                </>
                            ) : isProvider ? (
                                /* Provider mobile items */
                                <>
                                    <Link
                                        href="/dashboard"
                                        className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                        <User className="w-4 h-4 text-gray-400" />
                                        Dashboard
                                    </Link>
                                    <Link
                                        href="/dashboard/provider/services"
                                        className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                        <Ship className="w-4 h-4 text-gray-400" />
                                        Manajemen Kapal
                                    </Link>
                                    <Link
                                        href="/dashboard/provider/orders"
                                        className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                        <ClipboardList className="w-4 h-4 text-gray-400" />
                                        Daftar Pesanan
                                    </Link>
                                    <Link
                                        href="/dashboard/provider/setup"
                                        className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                        <UserCog className="w-4 h-4 text-gray-400" />
                                        Profil Bisnis
                                    </Link>
                                </>
                            ) : (
                                /* Customer mobile items */
                                <>
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
                                        Booking Saya
                                    </Link>
                                </>
                            )}

                            <button
                                onClick={() => {
                                    if (!isLoggingOut) {
                                        handleSignOut();
                                    }
                                }}
                                disabled={isLoggingOut}
                                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50"
                            >
                                {isLoggingOut ? (
                                    <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <LogOut className="w-4 h-4" />
                                )}
                                {isLoggingOut ? "Keluar..." : "Keluar"}
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

            {/* Tambahkan komponen kecil ini di pojok layar untuk sementara */}
            {process.env.NODE_ENV === 'development' && (
                <div className="fixed bottom-20 right-4 z-[9999] bg-black text-white p-2 text-xs rounded opacity-50">
                    Role: {userRole || 'Guest'} | Auth: {user ? 'Logged In' : 'Logged Out'}
                </div>
            )}
        </nav>
    );
}

// ─── Booking History Icon ────────
function BookingHistoryButton({ isDark }: { isDark: boolean }) {
    return (
        <Link
            href="/dashboard/bookings"
            className={`relative p-2.5 rounded-full transition-colors ${
                isDark
                    ? "text-gray-600 hover:bg-gray-100"
                    : "text-gray-200 hover:bg-white/20"
            }`}
            title="Riwayat Booking"
        >
            <ClipboardList className="w-5 h-5" />
        </Link>
    );
}

