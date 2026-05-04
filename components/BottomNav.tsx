"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home, Map, ClipboardList, User, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

function isAbortError(error: unknown): boolean {
    if (error instanceof DOMException && error.name === "AbortError") return true;
    if (error instanceof Error && error.name === "AbortError") return true;
    return String(error).toLowerCase().includes("aborted");
}

export default function BottomNav() {
    const [userRole, setUserRole] = useState<string | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const pathname = usePathname();
    const authRequestIdRef = useRef(0);

    // Sembunyikan navigasi bawah pada halaman auth
    const isAuthPage = pathname.startsWith("/auth");

    useEffect(() => {
        const supabase = createClient();

        const fetchFreshRole = async (userId: string) => {
            try {
                const { data, error } = await supabase
                    .from("users")
                    .select("role")
                    .eq("id", userId)
                    .maybeSingle();
                if (error) return "customer";
                return data?.role ?? "customer";
            } catch (error) {
                if (!isAbortError(error)) {
                    console.warn("[BottomNav] role fetch error:", error);
                }
                return "customer";
            }
        };

        const checkUser = async () => {
            const requestId = ++authRequestIdRef.current;
            setIsAuthenticated(false);
            setUserRole(null);

            const { data: { user } } = await supabase.auth.getUser();
            if (requestId !== authRequestIdRef.current) return;

            if (user) {
                setIsAuthenticated(true);
                const role = await fetchFreshRole(user.id);
                if (requestId === authRequestIdRef.current) setUserRole(role);
            } else {
                setIsAuthenticated(false);
                setUserRole(null);
            }
        };

        checkUser();

        const { data: authListener } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
            const requestId = ++authRequestIdRef.current;
            setIsAuthenticated(false);
            setUserRole(null);

            if (session?.user) {
                setIsAuthenticated(true);
                setTimeout(() => {
                    void fetchFreshRole(session.user.id).then((role) => {
                        if (requestId === authRequestIdRef.current) setUserRole(role);
                    });
                }, 0);
            } else {
                setIsAuthenticated(false);
                setUserRole(null);
            }
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    if (isAuthPage) return null;

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-[100] pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
            <div className="flex justify-around items-center h-16 px-2">
                <Link 
                    href={userRole === "provider" ? "/dashboard/provider/orders" : "/"} 
                    className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
                        (pathname === "/" || pathname === "/dashboard/provider/orders" && userRole === "provider") ? "text-[#023E8A]" : "text-slate-400 hover:text-slate-600"
                    }`}
                >
                    <Home className={`w-5 h-5 ${(pathname === "/" || pathname === "/dashboard/provider/orders" && userRole === "provider") ? "fill-blue-50" : ""}`} />
                    <span className="text-[10px] font-bold">Home</span>
                </Link>

                <Link 
                    href="/lokasi" 
                    className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
                        pathname.startsWith("/lokasi") ? "text-[#023E8A]" : "text-slate-400 hover:text-slate-600"
                    }`}
                >
                    <Map className={`w-5 h-5 ${pathname.startsWith("/lokasi") ? "fill-blue-50" : ""}`} />
                    <span className="text-[10px] font-bold">Dive Map</span>
                </Link>

                {userRole === "admin" ? (
                    <Link 
                        href="/admin/verifikasi" 
                        className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
                            pathname.startsWith("/admin") ? "text-[#023E8A]" : "text-slate-400 hover:text-slate-600"
                        }`}
                    >
                        <ShieldCheck className={`w-5 h-5 ${pathname.startsWith("/admin") ? "fill-blue-50/50" : ""}`} />
                        <span className="text-[10px] font-bold">Verifikasi</span>
                    </Link>
                ) : userRole === "provider" ? (
                    <Link 
                        href="/dashboard/provider/orders" 
                        className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
                            pathname.startsWith("/dashboard/provider/orders") ? "text-[#023E8A]" : "text-slate-400 hover:text-slate-600"
                        }`}
                    >
                        <ClipboardList className={`w-5 h-5 ${pathname.startsWith("/dashboard/provider/orders") ? "fill-blue-50" : ""}`} />
                        <span className="text-[10px] font-bold">Pesanan</span>
                    </Link>
                ) : (
                    <Link 
                        href={isAuthenticated ? "/dashboard/bookings" : "/auth/login"} 
                        className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
                            pathname.startsWith("/dashboard/bookings") ? "text-[#023E8A]" : "text-slate-400 hover:text-slate-600"
                        }`}
                    >
                        <ClipboardList className={`w-5 h-5 ${pathname.startsWith("/dashboard/bookings") ? "fill-blue-50" : ""}`} />
                        <span className="text-[10px] font-bold">Pesanan</span>
                    </Link>
                )}

                <Link 
                    href={isAuthenticated ? "/dashboard" : "/auth/login"} 
                    className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
                        pathname === "/dashboard" ? "text-[#023E8A]" : "text-slate-400 hover:text-slate-600"
                    }`}
                >
                    <User className={`w-5 h-5 ${pathname === "/dashboard" ? "fill-blue-50" : ""}`} />
                    <span className="text-[10px] font-bold">Profil</span>
                </Link>
            </div>
        </div>
    );
}
