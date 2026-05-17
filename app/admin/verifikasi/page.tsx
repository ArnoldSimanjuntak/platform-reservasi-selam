import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { ShieldCheck, Ship, UserCog, CheckCircle, LogOut, Clock, ShieldAlert } from "lucide-react";
import AdminVerificationClient from "./AdminVerificationClient";
import { signOut } from "@/app/auth/actions";
import type { Provider } from "@/lib/supabase";
import Link from "next/link";

export const dynamic = 'force-dynamic';

function createStorageAdminClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceRoleKey) return null;

    return createSupabaseClient(url, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
}

function extractProviderDocumentPath(value?: string | null) {
    if (!value) return null;

    const publicMarker = "/storage/v1/object/public/provider-documents/";
    const signedMarker = "/storage/v1/object/sign/provider-documents/";
    const marker = value.includes(publicMarker)
        ? publicMarker
        : value.includes(signedMarker)
        ? signedMarker
        : null;

    if (!marker) return value;

    const rawPath = value.split(marker)[1]?.split("?")[0];
    return rawPath ? decodeURIComponent(rawPath) : null;
}

async function signProviderDocumentUrl(
    storageClient: Awaited<ReturnType<typeof createClient>>,
    value?: string | null
) {
    const path = extractProviderDocumentPath(value);
    if (!path) return null;

    const { data, error } = await storageClient.storage
        .from("provider-documents")
        .createSignedUrl(path, 60 * 60);

    if (error) {
        console.warn("[admin/verifikasi] Failed to sign provider document:", error.message);
        return null;
    }

    return data.signedUrl;
}

export default async function AdminVerificationPage() {
    const supabase = await createClient();
    const storageClient = createStorageAdminClient() ?? supabase;

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

    const providers = await Promise.all(
        (allProviders || []).map(async (provider) => ({
            ...provider,
            identity_card_url: await signProviderDocumentUrl(storageClient, provider.identity_card_url),
            certification_url: await signProviderDocumentUrl(storageClient, provider.certification_url),
        }))
    );
    const pendingProviders = providers.filter(p => p.verification_status === "pending");
    const verifiedProviders = providers.filter(p => p.verification_status === "verified");
    const rejectedProviders = providers.filter(p => p.verification_status === "rejected");

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col overflow-x-hidden">
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
                <div className="grid grid-cols-3 gap-2 sm:gap-4 items-stretch">
                    <div className="h-full min-h-[112px] sm:min-h-[96px] bg-white rounded-2xl shadow-sm border border-amber-100 p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-2 sm:gap-4 text-center sm:text-left min-w-0">
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                            <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
                        </div>
                        <div className="min-w-0 w-full leading-tight">
                            <p className="text-xl sm:text-2xl font-black text-slate-900">{pendingProviders.length}</p>
                            <p className="text-[10px] sm:text-xs text-slate-500 font-bold leading-tight">Menunggu</p>
                        </div>
                    </div>
                    <div className="h-full min-h-[112px] sm:min-h-[96px] bg-white rounded-2xl shadow-sm border border-emerald-100 p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-2 sm:gap-4 text-center sm:text-left min-w-0">
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                            <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                        </div>
                        <div className="min-w-0 w-full leading-tight">
                            <p className="text-xl sm:text-2xl font-black text-slate-900">{verifiedProviders.length}</p>
                            <p className="text-[10px] sm:text-xs text-slate-500 font-bold leading-tight">Terverifikasi</p>
                        </div>
                    </div>
                    <div className="h-full min-h-[112px] sm:min-h-[96px] bg-white rounded-2xl shadow-sm border border-red-100 p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-2 sm:gap-4 text-center sm:text-left min-w-0">
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                            <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
                        </div>
                        <div className="min-w-0 w-full leading-tight">
                            <p className="text-xl sm:text-2xl font-black text-slate-900">{rejectedProviders.length}</p>
                            <p className="text-[10px] sm:text-xs text-slate-500 font-bold leading-tight">Ditolak</p>
                        </div>
                    </div>
                </div>

                {/* ─── Verification Panel ───────────────────────────── */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 sm:p-6 overflow-hidden">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                        <div className="min-w-0">
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
