"use client";

import { useState, useTransition, Suspense } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
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
}

interface ProviderSetupClientProps {
    mode: ProviderMode;
    provider: ProviderProfileSnapshot | null;
    notice?: string | null;
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

function StatusBanner({ mode, notice }: { mode: ProviderMode; notice?: string | null }) {
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
            <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3 shadow-sm">
                <Clock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                    <p className="text-sm text-amber-800 font-bold">Status: Menunggu Verifikasi Admin</p>
                    <p className="text-xs text-amber-700 mt-1">Data sedang ditinjau. Anda belum dapat menerima pesanan sampai disetujui.</p>
                </div>
            </div>
        );
    }

    return null;
}

function ProviderSetupContent({ mode, provider, notice }: ProviderSetupClientProps) {
    const [isPending, startTransition] = useTransition();
    const [result, setResult] = useState<ProviderSetupResult | null>(null);
    const [selectedType, setSelectedType] = useState(provider?.primary_type || "boat");
    const [locationText, setLocationText] = useState(provider?.location || "");
    const [lat, setLat] = useState<number | null>(provider?.latitude ?? null);
    const [lng, setLng] = useState<number | null>(provider?.longitude ?? null);

    const isVerified = mode === "verified";

    function handleSubmit(formData: FormData) {
        setResult(null);
        startTransition(async () => {
            const action = isVerified ? updateProviderProfile : setupProviderProfile;
            const res = await action(formData);
            setResult(res);
        });
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl w-full mx-auto">
                <StatusBanner mode={mode} notice={notice} />

                <div className="text-center mb-8">
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
                </div>

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
