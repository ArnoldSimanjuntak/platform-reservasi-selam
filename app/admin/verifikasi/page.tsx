import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ShieldCheck, Calendar, MapPin, Phone, Ship, UserCog, CheckCircle } from "lucide-react";
import AdminVerificationClient from "./AdminVerificationClient";
import type { Provider } from "@/lib/supabase";

export const revalidate = 0;

export default async function AdminVerificationPage() {
    const supabase = await createClient();

    // ─── 1. Auth & Admin Role Check ─────────────────────────────
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/auth/login");
    }

    const { data: userRecord } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

    if (userRecord?.role !== "admin" && user.user_metadata?.role !== "admin") {
        redirect("/dashboard");
    }

    // ─── 2. Fetch Pending Providers ───────────────────────────────
    const { data: pendingProviders } = await supabase
        .from("providers")
        .select(`
            id,
            name,
            location,
            contact,
            primary_type,
            identity_card_url,
            certification_url,
            verification_status,
            created_at,
            owner_user_id
        `)
        .eq("verification_status", "pending")
        .order("created_at", { ascending: true });

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Simple Admin Navbar */}
            <header className="bg-[#023E8A] border-b border-[#0077B6] sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 justify-between items-center text-white">
                        <div className="flex items-center gap-2 font-black text-xl italic tracking-tighter">
                            <Ship className="w-5 h-5 text-cyan-400" />
                            SULUT<span className="text-cyan-400">DIVE</span> <span className="text-sm font-bold opacity-80 not-italic ml-2 border-l border-white/20 pl-2">Panel Admin</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm font-bold">
                            <ShieldCheck className="w-4 h-4 text-emerald-400" />
                            Super Admin
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 overflow-hidden">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className="text-xl font-extrabold text-[#023E8A] flex items-center gap-2">
                                <UserCog className="w-6 h-6 text-[#0077B6]" />
                                Verifikasi Penyedia Layanan
                            </h1>
                            <p className="text-sm text-slate-500 font-medium mt-1">
                                Tinjau KTP dan Sertifikasi milik Provider baru sebelum mereka dapat berjualan di ekosistem platform.
                            </p>
                        </div>
                        {pendingProviders?.length ? (
                            <div className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                                <CheckCircle className="w-4 h-4" />
                                {pendingProviders.length} Menunggu
                            </div>
                        ) : null}
                    </div>

                    {/* Client Component for Interactive Table & Modals */}
                    <AdminVerificationClient initialProviders={pendingProviders as Provider[] || []} />
                </div>
            </main>
        </div>
    );
}
