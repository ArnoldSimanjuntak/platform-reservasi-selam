"use client";

import { useState, useTransition, type ElementType } from "react";
import { useRouter } from "next/navigation";
import {
    CheckCircle2,
    XCircle,
    Loader2,
    FileImage,
    ShieldCheck,
    ShieldAlert,
    FileText,
    Phone,
    MapPin,
    Clock,
    Ship,
    Glasses,
    GraduationCap,
} from "lucide-react";
import { verifyProviderIdentity } from "@/app/actions/provider";
import type { Provider } from "@/lib/supabase";
import {
    getDocumentDefinition,
    getDocumentTypesForProvider,
    getInstructorScopeLabel,
    getMissingRequiredDocumentTypes,
    getRequiredDocumentTypes,
    type VerificationDocumentType,
} from "@/lib/provider-verification";
import { getServiceTypeLabel } from "@/lib/service-types";

interface AdminVerificationClientProps {
    initialProviders: Provider[];
    verifiedProviders?: Provider[];
    rejectedProviders?: Provider[];
}

// Mapping tipe provider ke ikon dan warna UI. Label berasal dari service-types.
const TYPE_CONFIG: Record<string, { icon: ElementType; bg: string; text: string; border: string }> = {
    boat: {
        icon: Ship,
        bg: "bg-blue-100",
        text: "text-blue-800",
        border: "border-blue-200",
    },
    gear: {
        icon: Glasses,
        bg: "bg-amber-100",
        text: "text-amber-800",
        border: "border-amber-200",
    },
    instructor: {
        icon: GraduationCap,
        bg: "bg-emerald-100",
        text: "text-emerald-800",
        border: "border-emerald-200",
    },
};

type TabKey = "pending" | "verified" | "rejected";

export default function AdminVerificationClient({
    initialProviders,
    verifiedProviders = [],
    rejectedProviders = [],
}: AdminVerificationClientProps) {
    const router = useRouter();
    const [providers, setProviders] = useState<Provider[]>(initialProviders);
    const [isPending, startTransition] = useTransition();
    const [pendingId, setPendingId] = useState<string | null>(null);
    const [selectedImage, setSelectedImage] = useState<{ url: string; title: string } | null>(null);
    const [actionResult, setActionResult] = useState<{ id: string; msg: string; isError: boolean } | null>(null);
    const [removingId, setRemovingId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<TabKey>("pending");
    const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({});

    const handleVerify = (providerId: string, action: "approve" | "reject") => {
        setActionResult(null);
        setPendingId(providerId);
        const rejectionReason = rejectReasons[providerId]?.trim();

        startTransition(async () => {
            try {
                const res = await verifyProviderIdentity(providerId, action, rejectionReason);
                setActionResult({ id: providerId, msg: res.message, isError: !res.success });

                if (res.success) {
                    // Animasi remove sebelum hapus dari list
                    setRemovingId(providerId);
                    setTimeout(() => {
                        setProviders((prev) => prev.filter((p) => p.id !== providerId));
                        setRemovingId(null);
                        setActionResult(null);
                        router.refresh();
                    }, 600);
                }
            } catch {
                setActionResult({ id: providerId, msg: "Terjadi kesalahan jaringan.", isError: true });
            } finally {
                setPendingId(null);
            }
        });
    };

    const getDocumentUrl = (provider: Provider, type: VerificationDocumentType) => {
        const document = provider.verification_documents?.find((item) => item.document_type === type);
        if (document?.signed_url) return document.signed_url;
        if (document?.public_url) return document.public_url;
        if (type === "identity_card") return provider.identity_card_url ?? null;
        if (type === "dive_certificate") return provider.certification_url ?? null;
        return null;
    };

    // Tab data
    const tabs: { key: TabKey; label: string; count: number; color: string }[] = [
        { key: "pending", label: "Menunggu", count: providers.length, color: "amber" },
        { key: "verified", label: "Terverifikasi", count: verifiedProviders.length, color: "emerald" },
        { key: "rejected", label: "Ditolak", count: rejectedProviders.length, color: "red" },
    ];

    const getActiveList = (): Provider[] => {
        switch (activeTab) {
            case "pending": return providers;
            case "verified": return verifiedProviders;
            case "rejected": return rejectedProviders;
            default: return providers;
        }
    };
    const activeList = getActiveList();

    return (
        <div className="space-y-5">
            {/* Image Viewer Modal */}
            {selectedImage && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md"
                    onClick={() => setSelectedImage(null)}
                >
                    <div
                        className="bg-white rounded-3xl overflow-hidden max-w-2xl w-full shadow-2xl border border-white/20"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div
                            className="flex items-center justify-between p-4 border-b border-gray-100"
                            style={{ background: "linear-gradient(135deg, #023E8A, #0077B6)" }}
                        >
                            <h3 className="font-bold text-white flex items-center gap-2">
                                <FileImage className="w-5 h-5 text-cyan-300" />
                                {selectedImage.title}
                            </h3>
                            <button
                                onClick={() => setSelectedImage(null)}
                                className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                            >
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>
                        {/* Modal Body */}
                        <div className="p-4 bg-gray-100 flex items-center justify-center relative min-h-[50vh] max-h-[75vh]">
                            <iframe
                                src={selectedImage.url}
                                title={selectedImage.title}
                                className="h-[70vh] w-full rounded-lg bg-white shadow-sm"
                            />
                        </div>
                        <div className="p-3 bg-slate-50 text-center">
                            <p className="text-xs text-slate-400">Klik di luar gambar untuk menutup</p>
                        </div>
                    </div>
                </div>
            )}

            {/* â”€â”€â”€ Tab Switcher â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl">
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`min-w-0 flex items-center justify-center gap-1.5 py-2.5 px-1 rounded-lg text-[12px] sm:text-sm font-bold transition-all ${
                            activeTab === tab.key
                                ? "bg-white shadow-sm text-slate-900"
                                : "text-slate-500 hover:text-slate-700"
                        }`}
                    >
                        <span className="truncate">{tab.label}</span>
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${
                            activeTab === tab.key
                                ? tab.color === "amber"
                                    ? "bg-amber-100 text-amber-700"
                                    : tab.color === "emerald"
                                        ? "bg-emerald-100 text-emerald-700"
                                        : "bg-red-100 text-red-700"
                                : "bg-slate-200 text-slate-500"
                        }`}>
                            {tab.count}
                        </span>
                    </button>
                ))}
            </div>

            {/* Empty state */}
            {activeList.length === 0 && (
                <div className="text-center py-16 px-4 rounded-2xl bg-gradient-to-br from-blue-50 to-slate-50 border border-blue-100 flex flex-col items-center">
                    <div className="w-20 h-20 rounded-full flex items-center justify-center mb-5 shadow-inner"
                        style={{ background: "linear-gradient(135deg, #023E8A22, #0077B622)" }}
                    >
                        {activeTab === "pending" ? (
                            <ShieldCheck className="w-10 h-10 text-[#023E8A]" />
                        ) : activeTab === "verified" ? (
                            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                        ) : (
                            <ShieldAlert className="w-10 h-10 text-red-500" />
                        )}
                    </div>
                    <h3 className="text-xl font-black text-slate-900">
                        {activeTab === "pending"
                            ? "Semua pengajuan telah ditinjau"
                            : activeTab === "verified"
                                ? "Belum Ada yang Terverifikasi"
                                : "Belum Ada yang Ditolak"}
                    </h3>
                    <p className="text-sm text-slate-500 mt-2 max-w-xs">
                        {activeTab === "pending"
                            ? "Tidak ada provider yang menunggu verifikasi saat ini."
                            : activeTab === "verified"
                                ? "Provider yang telah disetujui akan muncul di sini."
                                : "Provider yang ditolak akan muncul di sini."}
                    </p>
                </div>
            )}

            {/* Provider Cards */}
            <div className="grid gap-5">
                {activeList.map((provider) => {
                    const typeConfig = TYPE_CONFIG[provider.primary_type || "boat"] || TYPE_CONFIG.boat;
                    const TypeIcon = typeConfig.icon;
                    const isThisRemoving = removingId === provider.id;
                    const isThisPending = pendingId === provider.id && isPending;
                    const isActionable = activeTab === "pending";
                    const documentTypes = getDocumentTypesForProvider(
                        provider.primary_type,
                        provider.instructor_scope
                    );
                    const requiredDocumentTypes = getRequiredDocumentTypes(
                        provider.primary_type,
                        provider.instructor_scope
                    );
                    const missingDocuments = getMissingRequiredDocumentTypes(provider);
                    const canApprove = missingDocuments.length === 0;

                    return (
                        <div
                            key={provider.id}
                            className={`rounded-2xl overflow-hidden border-2 shadow-md transition-all duration-500 ${
                                isThisRemoving
                                    ? "opacity-0 scale-95 translate-y-2"
                                    : "opacity-100 scale-100 border-[#023E8A]/10 hover:border-[#0077B6]/30 hover:shadow-lg"
                            }`}
                        >
                            {/* Card Header â€” Deep Sea Blue Gradient */}
                            <div
                                className="px-5 py-4 flex items-center justify-between"
                                style={{ background: "linear-gradient(135deg, #03045E, #023E8A)" }}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                                        <TypeIcon className="w-5 h-5 text-cyan-300" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-black text-white uppercase tracking-tight leading-tight">
                                            {provider.name}
                                        </h3>
                                        <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded mt-0.5 ${typeConfig.bg} ${typeConfig.text}`}>
                                            <TypeIcon className="w-3 h-3" />
                                            {getServiceTypeLabel(provider.primary_type)}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-right flex flex-col items-end gap-1">
                                    {/* Verification Status Badge */}
                                    {activeTab !== "pending" && (
                                        <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md ${
                                            provider.verification_status === "verified"
                                                ? "bg-emerald-500/20 text-emerald-300"
                                                : "bg-red-500/20 text-red-300"
                                        }`}>
                                            {provider.verification_status === "verified" ? (
                                                <ShieldCheck className="w-3 h-3" />
                                            ) : (
                                                <ShieldAlert className="w-3 h-3" />
                                            )}
                                            {provider.verification_status === "verified" ? "Verified" : "Rejected"}
                                        </span>
                                    )}
                                    <span className="text-xs text-white/50 flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5" />
                                        {new Date(provider.created_at || "").toLocaleDateString("id-ID", {
                                            day: "numeric",
                                            month: "short",
                                            year: "numeric",
                                        })}
                                    </span>
                                </div>
                            </div>

                            {/* Card Body */}
                            <div className="bg-white p-5">
                                {/* Result Notification */}
                                {actionResult?.id === provider.id && (
                                    <div
                                        className={`mb-4 p-3 rounded-xl flex items-center gap-2 text-sm font-bold border ${
                                            actionResult.isError
                                                ? "bg-red-50 text-red-800 border-red-200"
                                                : "bg-emerald-50 text-emerald-800 border-emerald-200"
                                        }`}
                                    >
                                        {actionResult.isError ? (
                                            <XCircle className="w-4 h-4 shrink-0" />
                                        ) : (
                                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                                        )}
                                        {actionResult.msg}
                                    </div>
                                )}

                                {/* Info Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                                    <div className="flex items-start gap-2.5 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <MapPin className="w-4 h-4 text-[#023E8A] mt-0.5 shrink-0" />
                                        <div>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Lokasi</p>
                                            <p className="text-sm font-bold text-slate-800 mt-0.5">{provider.location || "-"}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2.5 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <Phone className="w-4 h-4 text-[#023E8A] mt-0.5 shrink-0" />
                                        <div>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Kontak</p>
                                            <p className="text-sm font-bold text-slate-800 mt-0.5">{provider.contact || "-"}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2.5 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <FileText className="w-4 h-4 text-[#023E8A] mt-0.5 shrink-0" />
                                        <div>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">NIB / Izin Usaha</p>
                                            <p className="text-sm font-bold text-slate-800 mt-0.5">{provider.business_license_number || "-"}</p>
                                        </div>
                                    </div>
                                    {provider.primary_type === "instructor" && (
                                        <div className="flex items-start gap-2.5 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                                            <GraduationCap className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
                                            <div>
                                                <p className="text-[10px] text-emerald-700/70 font-bold uppercase tracking-wider">Cakupan</p>
                                                <p className="text-sm font-bold text-emerald-900 mt-0.5">
                                                    {getInstructorScopeLabel(provider.instructor_scope)}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Document Check Row */}
                                <div className="mb-5 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                            Checklist Dokumen Verifikasi
                                        </p>
                                        {canApprove ? (
                                            <span className="rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-700">
                                                Lengkap
                                            </span>
                                        ) : (
                                            <span className="rounded-full bg-red-100 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-red-700">
                                                {missingDocuments.length} wajib kosong
                                            </span>
                                        )}
                                    </div>
                                    <div className="grid gap-2">
                                        {documentTypes.map((type) => {
                                            const definition = getDocumentDefinition(type);
                                            const documentUrl = getDocumentUrl(provider, type);
                                            const isRequired = requiredDocumentTypes.includes(type);

                                            return (
                                                <div
                                                    key={type}
                                                    className="flex flex-col gap-3 rounded-xl border border-white bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
                                                >
                                                    <div className="min-w-0">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <p className="text-sm font-bold text-slate-900">{definition.label}</p>
                                                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
                                                                isRequired ? "bg-red-50 text-red-600" : "bg-blue-50 text-[#023E8A]"
                                                            }`}>
                                                                {isRequired ? "Wajib" : "Opsional"}
                                                            </span>
                                                        </div>
                                                        <p className="mt-1 text-xs leading-5 text-slate-500">{definition.helper}</p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            documentUrl &&
                                                            setSelectedImage({
                                                                url: documentUrl,
                                                                title: `${definition.label}: ${provider.name}`,
                                                            })
                                                        }
                                                        disabled={!documentUrl}
                                                        className={`shrink-0 rounded-xl border px-4 py-2 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                                                            documentUrl
                                                                ? "border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100"
                                                                : "border-gray-200 bg-gray-50 text-gray-400"
                                                        }`}
                                                    >
                                                        {documentUrl ? "Lihat Dokumen" : "Belum Upload"}
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                                {/* Action Buttons - hanya untuk pending providers */}
                                {isActionable && (
                                    <div className="space-y-3 pt-4 border-t border-slate-100">
                                        {!canApprove && (
                                            <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-xs font-bold leading-5 text-red-700">
                                                Approve dinonaktifkan karena dokumen wajib belum lengkap: {missingDocuments.map((type) => getDocumentDefinition(type).label).join(", ")}.
                                            </div>
                                        )}
                                        <textarea
                                            value={rejectReasons[provider.id] ?? ""}
                                            onChange={(event) =>
                                                setRejectReasons((previous) => ({
                                                    ...previous,
                                                    [provider.id]: event.target.value,
                                                }))
                                            }
                                            rows={3}
                                            placeholder="Alasan penolakan wajib diisi jika dokumen tidak valid atau belum lengkap..."
                                            className="w-full rounded-xl border-2 border-slate-200 bg-white p-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-[#023E8A] focus:ring-2 focus:ring-[#023E8A]/10"
                                        />
                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => handleVerify(provider.id, "approve")}
                                                disabled={isThisPending || !canApprove}
                                                className="flex-1 flex items-center justify-center gap-2.5 py-3.5 rounded-xl text-white text-sm font-black shadow-md hover:shadow-lg transition-all active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed"
                                                style={{ background: "linear-gradient(135deg, #047857, #059669)" }}
                                            >
                                                {isThisPending ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <ShieldCheck className="w-4 h-4" />
                                                )}
                                                {isThisPending ? "Memproses..." : "SETUJUI"}
                                            </button>

                                            <button
                                                onClick={() => handleVerify(provider.id, "reject")}
                                                disabled={isThisPending}
                                                className="flex-1 flex items-center justify-center gap-2.5 py-3.5 rounded-xl text-red-700 bg-red-50 border-2 border-red-200 text-sm font-black hover:bg-red-100 hover:border-red-300 transition-all active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed"
                                            >
                                                {isThisPending ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <XCircle className="w-4 h-4" />
                                                )}
                                                {isThisPending ? "Memproses..." : "TOLAK"}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
