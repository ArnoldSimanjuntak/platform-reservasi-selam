"use client";

import { useEffect, useState, useTransition, Suspense } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "@/app/auth/actions";
import {
    Ship,
    MapPin,
    Phone,
    FileText,
    Anchor,
    ArrowRight,
    Loader2,
    XCircle,
    Users as UsersIcon,
    Wrench,
    IdCard,
    GraduationCap,
    Clock,
    CheckCircle2,
    ClipboardList,
    Package,
    ArrowLeft,
    LogOut,
    ShieldCheck,
    Info,
} from "lucide-react";
import { setupProviderProfile, updateProviderProfile } from "@/app/actions/provider";
import type { ProviderSetupResult } from "@/app/actions/provider";

type ProviderMode = "setup" | "pending" | "verified" | "rejected";

export interface ProviderProfileSnapshot {
    id: string;
    name: string | null;
    location: string | null;
    contact: string | null;
    description: string | null;
    primary_type: string | null;
    latitude: number | null;
    longitude: number | null;
    verification_status: string | null;
    is_active: boolean | null;
    identity_card_url: string | null;
    certification_url: string | null;
}

interface ProviderSetupClientProps {
    mode: ProviderMode;
    provider: ProviderProfileSnapshot | null;
    notice?: string | null;
    submitted?: boolean;
}

const providerTypes = [
    {
        value: "boat",
        label: "Penyedia Kapal",
        icon: Ship,
        bg: "bg-blue-50",
        border: "border-blue-200",
        activeBg: "bg-blue-100",
        activeBorder: "border-blue-500",
        text: "text-blue-700",
    },
    {
        value: "instructor",
        label: "Instruktur Selam",
        icon: UsersIcon,
        bg: "bg-emerald-50",
        border: "border-emerald-200",
        activeBg: "bg-emerald-100",
        activeBorder: "border-emerald-500",
        text: "text-emerald-700",
    },
    {
        value: "gear",
        label: "Penyewaan Alat",
        icon: Wrench,
        bg: "bg-amber-50",
        border: "border-amber-200",
        activeBg: "bg-amber-100",
        activeBorder: "border-amber-500",
        text: "text-amber-700",
    },
];

const ProviderMapPicker = dynamic(
    () => import("@/components/ProviderMapPicker"),
    {
        ssr: false,
        loading: () => (
            <div className="w-full h-[300px] bg-blue-50 rounded-xl flex items-center justify-center border-2 border-gray-200">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        ),
    }
);

function StatusBanner({ mode, notice, submitted }: { mode: ProviderMode; notice?: string | null; submitted?: boolean }) {
    if (submitted) {
        return (
            <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3 shadow-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                    <p className="text-sm text-emerald-900 font-extrabold">Pengajuan verifikasi berhasil dikirim</p>
                    <p className="text-xs text-emerald-700 mt-1 leading-relaxed">
                        Dokumen dan profil bisnis Anda sudah masuk antrean review admin. Selama proses ini, akun belum bisa menerima pesanan sampai status disetujui.
                    </p>
                </div>
            </div>
        );
    }

    if (notice) {
        return (
            <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
                <Clock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800 font-bold">{notice}</p>
            </div>
        );
    }

    if (mode === "verified") {
        return (
            <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3 shadow-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                    <p className="text-sm text-emerald-800 font-bold">Status: Terverifikasi</p>
                    <p className="text-xs text-emerald-700 mt-1">Profil bisnis aktif dan dapat menerima pesanan dari wisatawan.</p>
                </div>
            </div>
        );
    }

    if (mode === "rejected") {
        return (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 shadow-sm">
                <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                    <p className="text-sm text-red-800 font-bold">Status: Ditolak</p>
                    <p className="text-xs text-red-700 mt-1">Perbarui data dan dokumen verifikasi untuk mengajukan peninjauan ulang.</p>
                </div>
            </div>
        );
    }

    if (mode === "pending") {
        return (
            <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3 shadow-sm">
                <Clock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                    <p className="text-sm text-amber-800 font-bold">Status: Menunggu Verifikasi Admin</p>
                    <p className="text-xs text-amber-700 mt-1">Data sedang ditinjau. Anda belum dapat menerima pesanan sampai disetujui.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="mb-6 p-4 rounded-2xl bg-blue-50 border border-blue-200 flex items-start gap-3 shadow-sm">
            <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
                <p className="text-sm text-slate-900 font-extrabold">Lengkapi data verifikasi provider</p>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Isi profil usaha, lokasi pangkalan, kontak WhatsApp, dan unggah dokumen identitas. Setelah dikirim, admin akan meninjau data Anda sebelum layanan bisa menerima pesanan.
                </p>
            </div>
        </div>
    );
}

function ProviderSetupContent({ mode, provider, notice, submitted }: ProviderSetupClientProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [result, setResult] = useState<ProviderSetupResult | null>(null);
    const [submittedLocally, setSubmittedLocally] = useState(false);
    const [selectedType, setSelectedType] = useState(provider?.primary_type || "boat");
    const [locationText, setLocationText] = useState(provider?.location || "");
    const [lat, setLat] = useState<number | null>(provider?.latitude ?? null);
    const [lng, setLng] = useState<number | null>(provider?.longitude ?? null);

    const isVerified = mode === "verified";
    const effectiveSubmitted = submitted || submittedLocally;
    const isPendingReview = mode === "pending" || effectiveSubmitted;

    useEffect(() => {
        if (!submittedLocally) return;

        const timeoutId = window.setTimeout(() => {
            router.replace("/dashboard/provider/setup?submitted=1");
            router.refresh();
        }, 300);

        return () => window.clearTimeout(timeoutId);
    }, [router, submittedLocally]);

    function handleSubmit(formData: FormData) {
        setResult(null);
        startTransition(async () => {
            const action = isVerified ? updateProviderProfile : setupProviderProfile;
            const res = await action(formData);
            setResult(res);
            if (res.success && !isVerified) {
                setSubmittedLocally(true);
            }
        });
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl w-full mx-auto">
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Kembali ke Dashboard
                    </Link>
                    <form action={signOut}>
                        <button
                            type="submit"
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-600 transition-colors hover:bg-red-100 sm:w-auto"
                        >
                            <LogOut className="h-4 w-4" />
                            Keluar
                        </button>
                    </form>
                </div>

                <StatusBanner mode={mode} notice={notice} submitted={effectiveSubmitted} />

                {isPendingReview && (
                    <div className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex items-start gap-4">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                                <ShieldCheck className="h-6 w-6" />
                            </div>
                            <div className="min-w-0">
                                <h1 className="text-xl font-extrabold text-slate-950">Kredensial sedang diproses admin</h1>
                                <p className="mt-2 text-sm leading-6 text-slate-600">
                                    Data yang tampil di halaman ini hanya milik akun Anda. Admin akan memeriksa identitas, kontak, dan kelayakan profil sebelum mengaktifkan akses operasional provider.
                                </p>
                                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                                    {["Dokumen terkirim", "Review admin", "Akses provider aktif"].map((step, index) => (
                                        <div
                                            key={step}
                                            className={`rounded-2xl border p-3 text-xs font-bold ${
                                                index === 0
                                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                                    : index === 1
                                                    ? "border-amber-200 bg-amber-50 text-amber-700"
                                                    : "border-slate-200 bg-slate-50 text-slate-500"
                                            }`}
                                        >
                                            {step}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {!isPendingReview && <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-200 shadow-sm">
                        <Anchor className="w-8 h-8 text-primary" />
                    </div>
                    <h2 className="text-2xl font-extrabold text-slate-900">
                        {isVerified ? "Profil Bisnis" : "Profil Bisnis & Verifikasi"}
                    </h2>
                    <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                        {isVerified
                            ? "Perbarui informasi usaha, kontak, dan lokasi pangkalan yang dilihat wisatawan."
                            : "Lengkapi informasi usaha dan verifikasi identitas untuk menjamin keamanan transaksi."}
                    </p>
                </div>}

                {isPendingReview ? (
                    <div className="bg-white py-8 px-6 sm:px-8 shadow-lg border border-gray-100 rounded-3xl">
                        <div className="grid gap-4">
                            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Nama Usaha</p>
                                <p className="mt-1 text-sm font-bold text-slate-900">{provider?.name || "-"}</p>
                            </div>
                            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Lokasi Pangkalan</p>
                                <p className="mt-1 text-sm font-bold text-slate-900">{provider?.location || "-"}</p>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Kontak WhatsApp</p>
                                    <p className="mt-1 text-sm font-bold text-slate-900">{provider?.contact || "-"}</p>
                                </div>
                                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Status Dokumen</p>
                                    <p className="mt-1 text-sm font-bold text-amber-700">Menunggu review admin</p>
                                </div>
                            </div>
                        </div>
                        <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                            <p className="text-sm font-bold text-primary">Apa yang bisa dilakukan sekarang?</p>
                            <p className="mt-1 text-xs leading-6 text-slate-600">
                                Anda bisa kembali ke dashboard atau keluar dari akun. Jika ada kesalahan data, tunggu keputusan admin atau hubungi support untuk pembaruan dokumen.
                            </p>
                        </div>
                    </div>
                ) : (
                <div className="bg-white py-8 px-6 sm:px-8 shadow-lg border border-gray-100 rounded-3xl">
                    {result && (
                        <div className={`mb-6 p-4 rounded-xl border flex items-start gap-3 ${
                            result.success
                                ? "bg-emerald-50 border-emerald-200"
                                : "bg-red-50 border-red-200"
                        }`}>
                            {result.success ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                            ) : (
                                <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                            )}
                            <p className={`text-sm font-bold ${result.success ? "text-emerald-700" : "text-red-700"}`}>
                                {result.message}
                            </p>
                        </div>
                    )}

                    <form action={handleSubmit} className="space-y-6">
                        {lat !== null && <input type="hidden" name="latitude" value={lat} />}
                        {lng !== null && <input type="hidden" name="longitude" value={lng} />}

                        <div>
                            <label className="block text-sm font-bold text-slate-900 mb-3">
                                Layanan Utama Anda <span className="text-red-500">*</span>
                            </label>
                            <div className="grid grid-cols-3 gap-3">
                                {providerTypes.map((pt) => {
                                    const Icon = pt.icon;
                                    const isActive = selectedType === pt.value;
                                    return (
                                        <label
                                            key={pt.value}
                                            className={`relative flex min-h-[108px] flex-col items-center justify-center text-center gap-2 px-2 py-4 rounded-xl border-2 cursor-pointer transition-all ${
                                                isActive
                                                    ? `${pt.activeBg} ${pt.activeBorder} shadow-sm`
                                                    : `${pt.bg} ${pt.border} hover:shadow-sm`
                                            }`}
                                        >
                                            <input
                                                type="radio"
                                                name="primary_type"
                                                value={pt.value}
                                                required
                                                checked={isActive}
                                                onChange={() => setSelectedType(pt.value)}
                                                className="sr-only"
                                            />
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isActive ? "bg-white shadow-sm" : "bg-white/70"}`}>
                                                <Icon className={`w-4 h-4 ${pt.text}`} />
                                            </div>
                                            <p className={`text-xs font-bold leading-tight ${isActive ? "text-slate-900" : "text-slate-700"}`}>
                                                {pt.label}
                                            </p>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>

                        <div>
                            <label htmlFor="name" className="block text-sm font-bold text-slate-900 mb-2">
                                Nama Usaha / Armada <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <Ship className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                                <input
                                    id="name"
                                    name="name"
                                    type="text"
                                    required
                                    minLength={3}
                                    defaultValue={provider?.name ?? ""}
                                    placeholder="Contoh: Budi Dive Resort"
                                    className="block w-full pl-11 pr-3 py-3.5 border-2 border-gray-200 rounded-xl text-slate-900 font-bold placeholder-slate-400 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm transition-all"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="location" className="block text-sm font-bold text-slate-900 mb-2">
                                Lokasi Pangkalan / Dermaga <span className="text-red-500">*</span>
                            </label>
                            <div className="mb-3">
                                <ProviderMapPicker
                                    initialLat={provider?.latitude ?? undefined}
                                    initialLng={provider?.longitude ?? undefined}
                                    onLocationSelect={(nextLat, nextLng) => {
                                        setLat(nextLat);
                                        setLng(nextLng);
                                    }}
                                    onAddressFound={(address) => setLocationText(address)}
                                />
                            </div>
                            <div className="relative">
                                <MapPin className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                                <input
                                    id="location"
                                    name="location"
                                    type="text"
                                    required
                                    value={locationText}
                                    onChange={(e) => setLocationText(e.target.value)}
                                    placeholder="Alamat akan terisi otomatis atau ketik manual..."
                                    className="block w-full pl-11 pr-3 py-3.5 border-2 border-gray-200 rounded-xl text-slate-900 font-bold placeholder-slate-400 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm transition-all"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="contact" className="block text-sm font-bold text-slate-900 mb-2">
                                Nomor WhatsApp <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <Phone className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                                <input
                                    id="contact"
                                    name="contact"
                                    type="tel"
                                    required
                                    defaultValue={provider?.contact ?? ""}
                                    placeholder="081234567890"
                                    className="block w-full pl-11 pr-3 py-3.5 border-2 border-gray-200 rounded-xl text-slate-900 font-bold placeholder-slate-400 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm transition-all"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="description" className="block text-sm font-bold text-slate-900 mb-2">
                                Deskripsi Singkat
                            </label>
                            <div className="relative">
                                <FileText className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-500" />
                                <textarea
                                    id="description"
                                    name="description"
                                    rows={3}
                                    defaultValue={provider?.description ?? ""}
                                    placeholder="Ceritakan pengalaman dan layanan Anda..."
                                    className="block w-full pl-11 pr-3 py-3.5 border-2 border-gray-200 rounded-xl text-slate-900 font-bold placeholder-slate-400 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm transition-all resize-none"
                                />
                            </div>
                        </div>

                        {!isVerified && (
                            <div className="pt-4 border-t border-gray-100">
                                <h3 className="text-base font-extrabold text-slate-900 mb-4 flex items-center gap-2">
                                    <IdCard className="w-5 h-5 text-primary" />
                                    Verifikasi Keamanan
                                </h3>

                                <div className="space-y-4">
                                    <div>
                                        <label htmlFor="identity_card" className="block text-sm font-bold text-slate-900 mb-2">
                                            Upload KTP Pimpinan/Pemilik <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            id="identity_card"
                                            name="identity_card"
                                            type="file"
                                            accept="image/jpeg,image/png,image/webp,application/pdf"
                                            required
                                            className="block w-full text-sm text-slate-700 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-primary hover:file:bg-blue-100"
                                        />
                                    </div>

                                    {selectedType === "instructor" && (
                                        <div className="pt-2 animate-in fade-in slide-in-from-top-2">
                                            <label htmlFor="certification" className="block text-sm font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                                                <GraduationCap className="w-4 h-4 text-emerald-600" />
                                                Upload Sertifikasi Selam (PADI/SSI/dll) <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                id="certification"
                                                name="certification"
                                                type="file"
                                                accept="image/jpeg,image/png,image/webp,application/pdf"
                                                required
                                                className="block w-full text-sm text-slate-700 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="pt-4 flex flex-col sm:flex-row gap-3">
                            <button
                                type="submit"
                                disabled={isPending}
                                className="flex-1 flex justify-center py-4 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed group hover:shadow-xl active:scale-[0.98]"
                                style={{ background: "linear-gradient(135deg, #023E8A, #0077B6)" }}
                            >
                                {isPending ? (
                                    <span className="flex items-center gap-2">
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        Menyimpan...
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-2">
                                        {isVerified ? "Simpan Perubahan" : "Selesai & Ajukan Verifikasi"}
                                        <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                    </span>
                                )}
                            </button>

                            {isVerified && (
                                <>
                                    <Link
                                        href="/dashboard/provider/services"
                                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-4 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
                                    >
                                        <Package className="h-4 w-4" />
                                        Kelola Layanan
                                    </Link>
                                    <Link
                                        href="/dashboard/provider/orders"
                                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-4 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
                                    >
                                        <ClipboardList className="h-4 w-4" />
                                        Lihat Pesanan
                                    </Link>
                                </>
                            )}
                        </div>
                    </form>
                </div>
                )}
            </div>
        </div>
    );
}

export default function ProviderSetupClient(props: ProviderSetupClientProps) {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" /></div>}>
            <ProviderSetupContent {...props} />
        </Suspense>
    );
}
