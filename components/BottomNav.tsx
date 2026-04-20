"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home, Map, ClipboardList, User, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function BottomNav() {
    const [userRole, setUserRole] = useState<string>("customer");
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const pathname = usePathname();
    const supabase = createClient();

    // Sembunyikan navigasi bawah pada halaman auth
    const isAuthPage = pathname.startsWith("/auth");

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setIsAuthenticated(true);
                const metaRole = user.user_metadata?.role || "customer";
                setUserRole(metaRole);
                
                // Fetch dari tabel users untuk data terbaru (khususnya untuk ngecek role admin yg diubah manual)
                supabase
                    .from("users")
                    .select("role")
                    .eq("id", user.id)
                    .single()
                    .then(({ data }) => {
                        if (data?.role) setUserRole(data.role);
                    });
            } else {
                setIsAuthenticated(false);
            }
        };

        checkUser();

        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (session?.user) {
                setIsAuthenticated(true);
                const metaRole = session.user.user_metadata?.role || "customer";
                setUserRole(metaRole);
                
                supabase
                    .from("users")
                    .select("role")
                    .eq("id", session.user.id)
                    .single()
                    .then(({ data }) => {
                        if (data?.role) setUserRole(data.role);
                    });
            } else {
                setIsAuthenticated(false);
                setUserRole("customer");
            }
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, [supabase]);

    if (isAuthPage) return null;

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-[100] pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
            <div className="flex justify-around items-center h-16 px-2">
                <Link 
                    href="/" 
                    className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
                        pathname === "/" ? "text-[#023E8A]" : "text-slate-400 hover:text-slate-600"
                    }`}
                >
                    <Home className={`w-5 h-5 ${pathname === "/" ? "fill-blue-50" : ""}`} />
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
