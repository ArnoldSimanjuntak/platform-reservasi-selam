import type { SupabaseClient } from "@supabase/supabase-js";
import { CheckCircle, Clock, ShieldAlert, ShieldCheck, UserCog } from "lucide-react";
import AdminVerificationClient from "./AdminVerificationClient";
import { getAdminContext } from "@/lib/supabase/admin";
import type { Provider } from "@/lib/supabase";
import type { ProviderVerificationDocument } from "@/lib/provider-verification";

export const dynamic = "force-dynamic";

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

async function signProviderDocumentUrl(storageClient: SupabaseClient, value?: string | null) {
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

async function signVerificationDocuments(
    storageClient: SupabaseClient,
    documents?: ProviderVerificationDocument[] | null
) {
    return Promise.all(
        (documents ?? []).map(async (document) => ({
            ...document,
            signed_url: await signProviderDocumentUrl(
                storageClient,
                document.storage_path ?? document.public_url
            ),
        }))
    );
}

export default async function AdminVerificationPage() {
    const { adminDb } = await getAdminContext();
    const storageClient = adminDb as SupabaseClient;
    const { data: allProviders, error } = await adminDb
        .from("providers")
        .select(`
            id, name, location, contact, primary_type,
            business_license_number, instructor_scope, safety_checklist,
            rejection_reason, identity_card_url, certification_url,
            verification_status, verification_submitted_at, verified_at,
            created_at, owner_user_id,
            verification_documents:provider_verification_documents (
                id, provider_id, document_type, label, storage_path,
                public_url, is_required, status, notes, created_at, updated_at
            )
        `)
        // Antrean verifikasi menampilkan pengajuan terbaru terlebih dahulu.
        // created_at menjadi penentu kedua jika waktu pengajuan sama.
        .order("verification_submitted_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });

    const providers = await Promise.all(
        (allProviders ?? []).map(async (provider) => ({
            ...provider,
            identity_card_url: await signProviderDocumentUrl(storageClient, provider.identity_card_url),
            certification_url: await signProviderDocumentUrl(storageClient, provider.certification_url),
            verification_documents: await signVerificationDocuments(
                storageClient,
                provider.verification_documents
            ),
        }))
    );
    const pendingProviders = providers.filter((provider) => provider.verification_status === "pending");
    const verifiedProviders = providers.filter((provider) => provider.verification_status === "verified");
    const rejectedProviders = providers.filter((provider) => provider.verification_status === "rejected");

    return (
        <main className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6 lg:p-8">
            <div className="grid grid-cols-3 items-stretch gap-2 sm:gap-4">
                {[
                    { label: "Menunggu", value: pendingProviders.length, icon: Clock, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100" },
                    { label: "Terverifikasi", value: verifiedProviders.length, icon: ShieldCheck, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
                    { label: "Ditolak", value: rejectedProviders.length, icon: ShieldAlert, color: "text-red-500", bg: "bg-red-50", border: "border-red-100" },
                ].map((stat) => (
                    <div key={stat.label} className={`flex min-h-28 min-w-0 flex-col items-center justify-center gap-2 rounded-2xl border bg-white p-3 text-center shadow-sm sm:min-h-24 sm:flex-row sm:justify-start sm:gap-4 sm:p-4 sm:text-left ${stat.border}`}>
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:h-11 sm:w-11 ${stat.bg}`}>
                            <stat.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${stat.color}`} />
                        </div>
                        <div className="min-w-0 w-full leading-tight">
                            <p className="text-xl font-black text-slate-900 sm:text-2xl">{stat.value}</p>
                            <p className="truncate text-[10px] font-bold text-slate-500 sm:text-xs">{stat.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            <section className="overflow-hidden rounded-3xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                        <h1 className="flex items-center gap-2 text-xl font-extrabold text-[#023E8A]">
                            <UserCog className="h-6 w-6 text-[#0077B6]" />
                            Verifikasi Penyedia Layanan
                        </h1>
                        <p className="mt-1 text-sm font-medium text-slate-500">
                            Tinjau identitas, izin usaha, sertifikat, dan bukti keselamatan sebelum provider dapat beroperasi.
                        </p>
                    </div>
                    {pendingProviders.length > 0 && (
                        <div className="flex items-center gap-1.5 rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-800">
                            <CheckCircle className="h-4 w-4" />
                            {pendingProviders.length} Menunggu
                        </div>
                    )}
                </div>

                {error ? (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
                        Gagal memuat data verifikasi: {error.message}
                    </div>
                ) : (
                    <AdminVerificationClient
                        initialProviders={pendingProviders as Provider[]}
                        verifiedProviders={verifiedProviders as Provider[]}
                        rejectedProviders={rejectedProviders as Provider[]}
                    />
                )}
            </section>
        </main>
    );
}
