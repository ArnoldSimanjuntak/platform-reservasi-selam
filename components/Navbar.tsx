"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Menu, X, Anchor, User, LogOut, ChevronDown, Calendar, Ship, ClipboardList, UserCog } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { signOut as serverSignOut } from "@/app/auth/actions";
import { useCartStore } from "@/lib/cart-store";
import type { AuthChangeEvent, Session, User as SupabaseUser } from "@supabase/supabase-js";

// ─── Types ─────────────────────────────────────────────────────
export interface NavbarUser {
    id: string;
    email: string | null;
    name: string | null;
}

export interface NavbarInitialAuthState {
    user: NavbarUser | null;
    role: string | null;
    providerVerified: boolean;
    isLoading: boolean;
}

type NavLink = { name: string; href: string; isButton?: boolean };

interface NavbarProps {
    initialAuthState?: NavbarInitialAuthState;
}

function isAbortError(error: unknown): boolean {
    if (error instanceof DOMException && error.name === "AbortError") return true;
    if (error instanceof Error && error.name === "AbortError") return true;
    return String(error).toLowerCase().includes("aborted");
}

// ─── Static nav configs ─────────────────────────────────────────
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

// ─── Helpers ────────────────────────────────────────────────────
async function fetchUserWithRole(supabase: ReturnType<typeof createClient>): Promise<{
    user: NavbarUser | null;
    role: string | null;
    providerVerified: boolean;
}> {
    // getUser() melakukan verifikasi kriptografis ke server — lebih andal dari getSession()
    let user: SupabaseUser | null = null;
    try {
        const { data, error } = await supabase.auth.getUser();
        if (error || !data?.user) {
            return { user: null, role: null, providerVerified: false };
        }
        user = data.user;
    } catch (error) {
        if (!isAbortError(error)) {
            console.warn("[Navbar] getUser error:", error);
        }
        return { user: null, role: null, providerVerified: false };
    }
    if (!user) {
        return { user: null, role: null, providerVerified: false };
    }
    const currentUser = user;
    const navbarUser: NavbarUser = {
        id: currentUser.id,
        email: currentUser.email ?? null,
        name: (currentUser.user_metadata?.name as string | undefined) ?? null,
    };

    // Ambil role dari DB (ground truth) agar tidak memakai metadata/cookie yang bisa stale.
    try {
        const { data, error: roleError } = await supabase
            .from("users")
            .select("role")
            .eq("id", currentUser.id)
            .maybeSingle();

        if (roleError) throw roleError;

        return {
            user: navbarUser,
            role: data?.role ?? null,
            providerVerified: false,
        };
    } catch (error) {
        if (!isAbortError(error)) {
            console.warn("[Navbar] role fetch error:", error);
        }
        return {
            user: navbarUser,
            role: null,
            providerVerified: false,
        };
    }
}

async function fetchProviderVerificationStatus(
    supabase: ReturnType<typeof createClient>,
    userId: string
): Promise<boolean> {
    const { data } = await supabase
        .from("providers")
        .select("verification_status, is_active")
        .eq("owner_user_id", userId)
        .maybeSingle();

    return data?.verification_status === "verified" && !!data?.is_active;
}

// ─── Main Component ─────────────────────────────────────────────
export default function Navbar({ initialAuthState }: NavbarProps) {
    const [authState, setAuthState] = useState<NavbarInitialAuthState>(
        initialAuthState ?? {
            user: null,
            role: null,
            providerVerified: false,
            isLoading: true,
        }
    );
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const pathname = usePathname();

    // Ref untuk mencegah state update setelah unmount
    const mountedRef = useRef(true);
    const authRequestIdRef = useRef(0);

    // Sinkronkan state saat payload auth awal dari server berubah (mis. setelah login redirect).
    useEffect(() => {
        if (!initialAuthState) return;
        setAuthState(initialAuthState);
    }, [initialAuthState]);

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
            if (!response.ok) throw new Error(`Navbar auth sync failed: ${response.status}`);

            const nextState = (await response.json()) as NavbarInitialAuthState;
            if (!mountedRef.current || requestId !== authRequestIdRef.current) return;
            setAuthState(nextState);
        } catch (error) {
            if (!mountedRef.current || requestId !== authRequestIdRef.current) return;
            if (!isAbortError(error)) {
                console.warn("[Navbar] server auth sync error:", error);
            }
            setAuthState((prev) => ({ ...prev, isLoading: false }));
        }
    }, []);

    // ── Inisialisasi auth sekali saat mount ────────────────────
    useEffect(() => {
        mountedRef.current = true;

        const supabase = createClient();
        const applySessionSnapshot = (session: Session | null) => {
            if (!session?.user || !mountedRef.current) return;
            const sessionUser: NavbarUser = {
                id: session.user.id,
                email: session.user.email ?? null,
                name: (session.user.user_metadata?.name as string | undefined) ?? null,
            };
            setAuthState((prev) => ({
                user: sessionUser,
                // Hindari kebocoran role dari sesi lama saat user berganti / sesi baru.
                role: prev.user?.id === sessionUser.id ? prev.role : null,
                providerVerified: prev.user?.id === sessionUser.id ? prev.providerVerified : false,
                isLoading: true,
            }));
        };

        const refreshAuthState = async (showLoading: boolean) => {
            const requestId = ++authRequestIdRef.current;
            if (showLoading) {
                setAuthState((prev) => ({ ...prev, isLoading: true }));
            }

            try {
                const { data: { session } } = await supabase.auth.getSession();
                applySessionSnapshot(session);

                const { user, role } = await fetchUserWithRole(supabase);

                let providerVerified = false;
                if (user && role === "provider") {
                    providerVerified = await fetchProviderVerificationStatus(supabase, user.id);
                }

                if (!mountedRef.current || requestId !== authRequestIdRef.current) return;

                setAuthState({ user, role, providerVerified, isLoading: false });

                return;
            } catch (error) {
                if (!mountedRef.current || requestId !== authRequestIdRef.current) return;
                if (!isAbortError(error)) {
                    console.warn("[Navbar] refreshAuthState error:", error);
                }
                setAuthState({ user: null, role: null, providerVerified: false, isLoading: false });
            }
        };

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event: AuthChangeEvent, session: Session | null) => {
                if (!mountedRef.current) return;

                if (event === "SIGNED_OUT" || !session?.user) {
                    authRequestIdRef.current++;
                    setAuthState({ user: null, role: null, providerVerified: false, isLoading: false });
                    return;
                }

                if (
                    event === "INITIAL_SESSION" ||
                    event === "SIGNED_IN" ||
                    event === "TOKEN_REFRESHED" ||
                    event === "USER_UPDATED"
                ) {
                    applySessionSnapshot(session);
                    setTimeout(() => {
                        void syncAuthStateFromServer(false);
                    }, 0);
                }
            }
        );

        void syncAuthStateFromServer(!initialAuthState);

        return () => {
            mountedRef.current = false;
            subscription.unsubscribe();
        };
    }, [initialAuthState, syncAuthStateFromServer]);

    // ── Tutup mobile menu saat pindah halaman ─────────────────
    useEffect(() => {
        setIsMobileMenuOpen(false);
        setIsProfileMenuOpen(false);
        void syncAuthStateFromServer(false);
    }, [pathname, syncAuthStateFromServer]);

    // ── Scroll listener ────────────────────────────────────────
    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 10);
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // ── Click-outside untuk menutup profile dropdown ──────────
    useEffect(() => {
        if (!isProfileMenuOpen) return;
        const handler = () => setIsProfileMenuOpen(false);
        document.addEventListener("click", handler);
        return () => document.removeEventListener("click", handler);
    }, [isProfileMenuOpen]);

    // ── Sign out ───────────────────────────────────────────────
    //
    // PENTING: Jangan bungkus serverSignOut() dalam try/catch dari Client Component.
    // Server Action yang memanggil redirect() melempar error spesial "NEXT_REDIRECT".
    // Jika di-catch, redirect tidak terjadi dan isLoggingOut stuck = true selamanya.
    //
    // Strategi logout:
    //   1. Reset state client lebih dulu agar UI akun lama hilang seketika.
    //   2. Hapus sesi Supabase di browser dan cookie httpOnly di server.
    //   3. Pakai hard reload agar React state dan App Router cache benar-benar bersih.
    const handleSignOut = useCallback(async () => {
        if (isLoggingOut) return;
        setIsLoggingOut(true);
        setIsProfileMenuOpen(false);
        setIsMobileMenuOpen(false);
        authRequestIdRef.current++;
        setAuthState({ user: null, role: null, providerVerified: false, isLoading: false });
        useCartStore.getState().resetCart();

        try {
            const supabase = createClient();
            await supabase.auth.signOut({ scope: "global" });
            await serverSignOut();
        } catch (error) {
            if (!isAbortError(error)) {
                console.warn("[Navbar] sign out fallback redirect:", error);
            }
        } finally {
            window.location.href = "/auth/login?message=Berhasil+keluar";
        }
    }, [isLoggingOut]);

    // ── Derived state ──────────────────────────────────────────
    const { user, role, providerVerified, isLoading } = authState;
    const isRoleResolving = !!user && role === null;
    const isAuthResolving = isLoading || isRoleResolving;
    const isHomePage = pathname === "/";
    const isAuthPage = pathname.startsWith("/auth");
    const isDark = isScrolled || isMobileMenuOpen || !isHomePage;
    const isProvider = role === "provider" && providerVerified;
    const isProviderPending = role === "provider" && !providerVerified;
    const isAdmin = role === "admin";

    const navLinks: NavLink[] =
        isAdmin ? adminNavLinks :
        isProvider ? providerNavLinks :
        customerNavLinks;

    const userName = user?.name || user?.email?.split("@")[0] || "User";

    if (isAuthPage) return null;

    // ─── Render ────────────────────────────────────────────────
    return (
        <nav
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
                isDark ? "bg-white/80 backdrop-blur-md shadow-sm py-4" : "bg-transparent py-6"
            }`}
        >
            <div className="container mx-auto px-4 flex items-center justify-between">
                {/* Logo */}
                <Link
                    href={isAdmin ? "/admin" : isProvider ? "/dashboard" : "/"}
                    className="flex items-center gap-2 group"
                >
                    <div className="bg-gradient-to-br from-primary to-secondary p-2 rounded-lg text-white group-hover:scale-110 transition-transform">
                        <Anchor className="w-6 h-6" />
                    </div>
                    <span className={`text-xl font-bold tracking-tight ${isDark ? "text-deepSea" : "text-white"}`}>
                        Sulut<span className="text-secondary">Dive</span>
                    </span>
                </Link>

                {/* Desktop Nav */}
                <div className="hidden md:flex items-center gap-8">
                    {!isAuthResolving && navLinks.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={
                                link.isButton
                                    ? `px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                                          isDark
                                              ? "bg-[#023E8A] text-white hover:bg-blue-800"
                                              : "bg-white text-[#023E8A] hover:bg-gray-100"
                                      }`
                                    : `text-sm font-semibold hover:text-[#0077B6] transition-colors ${
                                          isDark ? "text-slate-800" : "text-white"
                                      }`
                            }
                        >
                            {link.name}
                        </Link>
                    ))}

                    {/* Booking history shortcut — hanya customer */}
                    {!isAuthResolving && !isProvider && !isAdmin && user && (
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
                    )}

                    {/* Auth section */}
                    {isAuthResolving ? (
                        <div className="w-20 h-10 rounded-full bg-gray-200/50 animate-pulse" />
                    ) : user ? (
                        <ProfileDropdown
                            userName={userName}
                            userEmail={user.email ?? ""}
                            isProvider={isProvider}
                            isProviderPending={isProviderPending}
                            isAdmin={isAdmin}
                            isDark={isDark}
                            isOpen={isProfileMenuOpen}
                            isLoggingOut={isLoggingOut}
                            onToggle={(e) => {
                                e.stopPropagation();
                                setIsProfileMenuOpen((prev) => !prev);
                            }}
                            onClose={() => setIsProfileMenuOpen(false)}
                            onSignOut={handleSignOut}
                        />
                    ) : (
                        <Link
                            href="/auth/login"
                            className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
                                isDark
                                    ? "bg-primary text-white hover:bg-secondary"
                                    : "bg-white text-primary hover:bg-gray-100"
                            }`}
                        >
                            Masuk
                        </Link>
                    )}
                </div>

                {/* Mobile toggle */}
                <button
                    className="md:hidden p-2"
                    onClick={() => setIsMobileMenuOpen((prev) => !prev)}
                    aria-label="Toggle menu"
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
                <MobileMenu
                    navLinks={isAuthResolving ? [] : navLinks}
                    user={user}
                    userName={userName}
                    isProvider={isProvider}
                    isProviderPending={isProviderPending}
                    isAdmin={isAdmin}
                    isLoading={isAuthResolving}
                    isLoggingOut={isLoggingOut}
                    onClose={() => setIsMobileMenuOpen(false)}
                    onSignOut={handleSignOut}
                />
            )}

            {/* Dev role indicator */}
            {process.env.NODE_ENV === "development" && (
                <div className="fixed bottom-20 right-4 z-[9999] bg-black text-white p-2 text-xs rounded opacity-50 pointer-events-none">
                    Role: {role || "Guest"} | {user ? "Logged In" : "Logged Out"}
                </div>
            )}
        </nav>
    );
}

// ─── Profile Dropdown Sub-component ────────────────────────────
function ProfileDropdown({
    userName,
    userEmail,
    isProvider,
    isProviderPending,
    isAdmin,
    isDark,
    isOpen,
    isLoggingOut,
    onToggle,
    onClose,
    onSignOut,
}: {
    userName: string;
    userEmail: string;
    isProvider: boolean;
    isProviderPending: boolean;
    isAdmin: boolean;
    isDark: boolean;
    isOpen: boolean;
    isLoggingOut: boolean;
    onToggle: (e: React.MouseEvent) => void;
    onClose: () => void;
    onSignOut: () => void;
}) {
    return (
        <div className="relative">
            <button
                onClick={onToggle}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold transition-all ${
                    isDark
                        ? "bg-primary/10 text-primary hover:bg-primary/20"
                        : "bg-white/20 text-white hover:bg-white/30"
                }`}
            >
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {userName.charAt(0).toUpperCase()}
                </div>
                <span className="max-w-[100px] truncate">{userName}</span>
                <ChevronDown className={`w-4 h-4 transition-transform shrink-0 ${isOpen ? "rotate-180" : ""}`} />
            </button>

            {isOpen && (
                <div
                    className="absolute right-0 top-full mt-2 w-56 rounded-xl bg-white shadow-lg border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* User info header */}
                    <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-semibold text-gray-900 truncate">{userName}</p>
                        <p className="text-xs text-gray-500 truncate">{userEmail}</p>
                        {isProvider && (
                            <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary tracking-wide">
                                PROVIDER
                            </span>
                        )}
                        {isProviderPending && (
                            <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 tracking-wide">
                                MENUNGGU VERIFIKASI
                            </span>
                        )}
                        {isAdmin && (
                            <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 tracking-wide">
                                ADMIN
                            </span>
                        )}
                    </div>

                    <div className="py-1">
                        {isAdmin ? (
                            <>
                                <DropdownLink href="/dashboard" icon={User} label="Dashboard Admin" onClose={onClose} />
                                <DropdownLink href="/admin/verifikasi" icon={UserCog} label="Panel Verifikasi" onClose={onClose} />
                                <DropdownLink href="/dashboard/provider/services" icon={Ship} label="Master Layanan" onClose={onClose} />
                            </>
                        ) : isProvider ? (
                            <>
                                <DropdownLink href="/dashboard" icon={User} label="Dashboard" onClose={onClose} />
                                <DropdownLink href="/dashboard/provider/services" icon={Ship} label="Manajemen Kapal" onClose={onClose} />
                                <DropdownLink href="/dashboard/provider/orders" icon={ClipboardList} label="Daftar Pesanan" onClose={onClose} />
                                <DropdownLink href="/dashboard/provider/setup" icon={UserCog} label="Profil Bisnis" onClose={onClose} />
                            </>
                        ) : isProviderPending ? (
                            <>
                                <DropdownLink href="/dashboard/provider/setup" icon={UserCog} label="Lanjut Verifikasi" onClose={onClose} />
                                <DropdownLink href="/dashboard" icon={User} label="Dashboard" onClose={onClose} />
                            </>
                        ) : (
                            <>
                                <DropdownLink href="/dashboard" icon={User} label="Profil Saya" onClose={onClose} />
                                <DropdownLink href="/dashboard/bookings" icon={Calendar} label="Booking Saya" onClose={onClose} />
                            </>
                        )}

                        <button
                            onClick={onSignOut}
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
    );
}

// ─── Dropdown Link helper ───────────────────────────────────────
function DropdownLink({
    href,
    icon: Icon,
    label,
    onClose,
}: {
    href: string;
    icon: React.ElementType;
    label: string;
    onClose: () => void;
}) {
    return (
        <Link
            href={href}
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            onClick={onClose}
        >
            <Icon className="w-4 h-4 text-gray-400" />
            {label}
        </Link>
    );
}

// ─── Mobile Menu Sub-component ──────────────────────────────────
function MobileMenu({
    navLinks,
    user,
    userName,
    isProvider,
    isProviderPending,
    isAdmin,
    isLoading,
    isLoggingOut,
    onClose,
    onSignOut,
}: {
    navLinks: NavLink[];
    user: NavbarUser | null;
    userName: string;
    isProvider: boolean;
    isProviderPending: boolean;
    isAdmin: boolean;
    isLoading: boolean;
    isLoggingOut: boolean;
    onClose: () => void;
    onSignOut: () => void;
}) {
    return (
        <div className="md:hidden absolute top-full left-0 right-0 bg-white border-t border-gray-100 shadow-lg p-4 flex flex-col gap-4 animate-in slide-in-from-top-5">
            {navLinks.map((link) => (
                <Link
                    key={link.href}
                    href={link.href}
                    className="text-gray-600 hover:text-primary font-medium py-2"
                    onClick={onClose}
                >
                    {link.name}
                </Link>
            ))}

            {isLoading ? (
                <div className="w-full h-12 rounded-xl bg-gray-200/50 animate-pulse" />
            ) : user ? (
                <div className="border-t border-gray-100 pt-4 space-y-2">
                    {/* User info */}
                    <div className="flex items-center gap-3 px-2 py-2">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold shrink-0">
                            {userName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{userName}</p>
                            <p className="text-xs text-gray-500 truncate">{user.email}</p>
                        </div>
                        {isProvider && (
                            <span className="ml-auto shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
                                PROVIDER
                            </span>
                        )}
                        {isProviderPending && (
                            <span className="ml-auto shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">
                                PENDING
                            </span>
                        )}
                    </div>

                    {/* Role-specific links */}
                    {isAdmin ? (
                        <>
                            <MobileLink href="/dashboard" icon={User} label="Dashboard Admin" onClose={onClose} />
                            <MobileLink href="/admin/verifikasi" icon={UserCog} label="Panel Verifikasi" onClose={onClose} />
                        </>
                    ) : isProvider ? (
                        <>
                            <MobileLink href="/dashboard" icon={User} label="Dashboard" onClose={onClose} />
                            <MobileLink href="/dashboard/provider/services" icon={Ship} label="Manajemen Kapal" onClose={onClose} />
                            <MobileLink href="/dashboard/provider/orders" icon={ClipboardList} label="Daftar Pesanan" onClose={onClose} />
                            <MobileLink href="/dashboard/provider/setup" icon={UserCog} label="Profil Bisnis" onClose={onClose} />
                        </>
                    ) : isProviderPending ? (
                        <>
                            <MobileLink href="/dashboard/provider/setup" icon={UserCog} label="Lanjut Verifikasi" onClose={onClose} />
                            <MobileLink href="/dashboard" icon={User} label="Dashboard" onClose={onClose} />
                        </>
                    ) : (
                        <>
                            <MobileLink href="/dashboard" icon={User} label="Profil Saya" onClose={onClose} />
                            <MobileLink href="/dashboard/bookings" icon={Calendar} label="Booking Saya" onClose={onClose} />
                        </>
                    )}

                    <button
                        onClick={onSignOut}
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
                    onClick={onClose}
                >
                    Masuk / Daftar
                </Link>
            )}
        </div>
    );
}

// ─── Mobile Link helper ─────────────────────────────────────────
function MobileLink({
    href,
    icon: Icon,
    label,
    onClose,
}: {
    href: string;
    icon: React.ElementType;
    label: string;
    onClose: () => void;
}) {
    return (
        <Link
            href={href}
            className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
            onClick={onClose}
        >
            <Icon className="w-4 h-4 text-gray-400" />
            {label}
        </Link>
    );
}
