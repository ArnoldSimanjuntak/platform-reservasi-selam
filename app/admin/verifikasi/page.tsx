import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ShieldCheck, Ship, UserCog, CheckCircle, LogOut, Clock, ShieldAlert } from "lucide-react";
import AdminVerificationClient from "./AdminVerificationClient";
import { signOut } from "@/app/auth/actions";
import type { Provider } from "@/lib/supabase";
import Link from "next/link";

export const dynamic = 'force-dynamic';

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

    // ─── 2. Fetch ALL providers (pending, verified, rejected) ─────
    const { data: allProviders } = await supabase
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
        .order("created_at", { ascending: true });

    const providers = allProviders || [];
    const pendingProviders = providers.filter(p => p.verification_status === "pending");
    const verifiedProviders = providers.filter(p => p.verification_status === "verified");
    const rejectedProviders = providers.filter(p => p.verification_status === "rejected");

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Admin Navbar */}
            <header className="bg-[#023E8A] border-b border-[#0077B6] sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 justify-between items-center text-white">
                        <div className="flex items-center gap-2 font-black text-xl italic tracking-tighter">
                            <Ship className="w-5 h-5 text-cyan-400" />
                            SULUT<span className="text-cyan-400">DIVE</span> <span className="text-sm font-bold opacity-80 not-italic ml-2 border-l border-white/20 pl-2">Panel Admin</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 text-sm font-bold">
                                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                                Super Admin
                            </div>
                            <form action={signOut}>
                                <button
                                    type="submit"
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                                >
                                    <LogOut className="w-3.5 h-3.5" />
                                    Keluar
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
                {/* ─── Stats Overview Cards ─────────────────────────── */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white rounded-2xl shadow-sm border border-amber-100 p-4 flex items-center gap-4">
                        <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center">
                            <Clock className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-slate-900">{pendingProviders.length}</p>
                            <p className="text-xs text-slate-500 font-bold">Menunggu</p>
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 p-4 flex items-center gap-4">
                        <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center">
                            <ShieldCheck className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-slate-900">{verifiedProviders.length}</p>
                            <p className="text-xs text-slate-500 font-bold">Terverifikasi</p>
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-4 flex items-center gap-4">
                        <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center">
                            <ShieldAlert className="w-5 h-5 text-red-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-slate-900">{rejectedProviders.length}</p>
                            <p className="text-xs text-slate-500 font-bold">Ditolak</p>
                        </div>
                    </div>
                </div>

                {/* ─── Verification Panel ───────────────────────────── */}
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
                        {pendingProviders.length > 0 && (
                            <div className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                                <CheckCircle className="w-4 h-4" />
                                {pendingProviders.length} Menunggu
                            </div>
                        )}
                    </div>
                    <div className="mb-5">
                        <Link
                            href="/dashboard/provider/services/new"
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-white bg-[#023E8A] hover:bg-[#032b63] transition-colors"
                        >
                            <Ship className="w-4 h-4" />
                            Buat Layanan Platform
                        </Link>
                    </div>

                    {/* Client Component for Interactive Cards & Modals */}
                    <AdminVerificationClient
                        initialProviders={pendingProviders as Provider[]}
                        verifiedProviders={verifiedProviders as Provider[]}
                        rejectedProviders={rejectedProviders as Provider[]}
                    />
                </div>
            </main>
        </div>
    );
}
