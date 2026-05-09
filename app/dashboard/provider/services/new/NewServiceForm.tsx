"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
    Ship,
    Users as UsersIcon,
    Wrench,
    DollarSign,
    FileText,
    Anchor,
    ArrowLeft,
    ArrowRight,
    Loader2,
    XCircle,
    Tag,
    Hash,
    MapPin,
    ImagePlus,
    ShieldCheck,
    ToggleLeft,
} from "lucide-react";
import { createService, updateService } from "@/app/actions/service";
import type { CreateServiceResult } from "@/app/actions/service";

export interface ServiceFormInitialValue {
    id: string;
    name: string;
    type: string;
    price: number;
    max_capacity: number;
    description: string | null;
    dive_site_category: string | null;
    image_url: string | null;
    is_available: boolean | null;
}

interface NewServiceFormProps {
    isAdmin: boolean;
    providerId: string | null;
    mode?: "create" | "edit";
    initialService?: ServiceFormInitialValue | null;
}

const serviceTypes = [
    {
        value: "boat",
        label: "Kapal / Boat Trip",
        description: "Sewa kapal untuk perjalanan selam",
        icon: Ship,
        bg: "bg-blue-50",
        border: "border-blue-200",
        activeBg: "bg-blue-100",
        activeBorder: "border-blue-500",
        text: "text-blue-700",
    },
    {
        value: "instructor",
        label: "Instruktur / Guide",
        description: "Jasa pemandu selam berpengalaman",
        icon: UsersIcon,
        bg: "bg-emerald-50",
        border: "border-emerald-200",
        activeBg: "bg-emerald-100",
        activeBorder: "border-emerald-500",
        text: "text-emerald-700",
    },
    {
        value: "gear",
        label: "Peralatan Selam",
        description: "Sewa BCD, wetsuit, fin, dll",
        icon: Wrench,
        bg: "bg-amber-50",
        border: "border-amber-200",
        activeBg: "bg-amber-100",
        activeBorder: "border-amber-500",
        text: "text-amber-700",
    },
];

const diveSiteCategories = [
    { value: "", label: "— Tidak spesifik —" },
    { value: "Muck", label: "🏜️ Muck Diving" },
    { value: "Coral", label: "🪸 Coral Reef" },
    { value: "Wreck", label: "🚢 Wreck Dive" },
];

export default function NewServiceForm({
    isAdmin,
    providerId,
    mode = "create",
    initialService = null,
}: NewServiceFormProps) {
    const [isPending, startTransition] = useTransition();
    const [result, setResult] = useState<CreateServiceResult | null>(null);
    const [selectedType, setSelectedType] = useState(initialService?.type || "");
    const [imagePreview, setImagePreview] = useState<string | null>(initialService?.image_url || null);
    const isEdit = mode === "edit";

    function handleSubmit(formData: FormData) {
        setResult(null);
        // Teruskan providerId dari server ke action (Admin tidak punya provider row)
        if (providerId) {
            formData.set("_provider_id_override", providerId);
        }
        if (isEdit && initialService?.id) {
            formData.set("service_id", initialService.id);
        }
        startTransition(async () => {
            const action = isEdit ? updateService : createService;
            const res = await action(formData);
            // Jika sampai sini = ada error (sukses = redirect otomatis)
            setResult(res);
        });
    }

    return (
        <div className="min-h-screen bg-gray-50 pt-24 pb-12 px-4">
            <div className="max-w-lg w-full mx-auto">
                {/* Back Link */}
                <Link
                    href="/dashboard/provider/services"
                    className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary transition-colors mb-6"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Kembali ke Daftar Layanan
                </Link>

                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-200 shadow-sm">
                        <Anchor className="w-8 h-8 text-primary" />
                    </div>
                    <h1 className="text-2xl font-extrabold text-slate-900">
                        {isEdit ? "Edit Layanan" : "Tambah Layanan Baru"}
                    </h1>
                    <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                        {isEdit
                            ? "Perbarui detail layanan yang tampil di marketplace SulutDive."
                            : "Layanan yang Anda tambahkan akan muncul di marketplace SulutDive dan bisa dipesan oleh wisatawan."}
                    </p>

                    {/* Admin badge */}
                    {isAdmin && (
                        <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-xs font-bold text-amber-700">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Mode Admin — layanan tidak terikat provider manapun
                        </div>
                    )}
                </div>

                {/* Form Card */}
                <div className="bg-white py-8 px-6 shadow-lg border border-gray-100 rounded-3xl">
                    {/* Error Feedback */}
                    {result && !result.success && (
                        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3">
                            <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                            <p className="text-sm text-red-700 font-semibold">{result.message}</p>
                        </div>
                    )}

                    <form action={handleSubmit} className="space-y-6">
                        {isEdit && initialService?.id && (
                            <input type="hidden" name="service_id" value={initialService.id} />
                        )}

                        {/* ── Tipe Layanan (Visual Selection) ── */}
                        <div>
                            <label className="block text-sm font-bold text-slate-900 mb-3">
                                Tipe Layanan <span className="text-red-500">*</span>
                            </label>
                            <div className="grid grid-cols-1 gap-3">
                                {serviceTypes.map((st) => {
                                    const Icon = st.icon;
                                    const isActive = selectedType === st.value;
                                    return (
                                        <label
                                            key={st.value}
                                            className={`relative flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                                isActive
                                                    ? `${st.activeBg} ${st.activeBorder} shadow-sm`
                                                    : `${st.bg} ${st.border} hover:shadow-sm`
                                            }`}
                                        >
                                            <input
                                                type="radio"
                                                name="type"
                                                value={st.value}
                                                required
                                                checked={isActive}
                                                onChange={() => setSelectedType(st.value)}
                                                className="sr-only"
                                            />
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isActive ? "bg-white shadow-sm" : "bg-white/70"}`}>
                                                <Icon className={`w-5 h-5 ${st.text}`} />
                                            </div>
                                            <div>
                                                <p className={`text-sm font-bold ${isActive ? "text-slate-900" : "text-slate-700"}`}>
                                                    {st.label}
                                                </p>
                                                <p className="text-xs text-slate-500">{st.description}</p>
                                            </div>
                                            {isActive && (
                                                <div
                                                    className="absolute top-3 right-3 w-5 h-5 rounded-full bg-white border-2 border-current flex items-center justify-center"
                                                    style={{
                                                        color: st.text.includes("blue")
                                                            ? "#1d4ed8"
                                                            : st.text.includes("emerald")
                                                            ? "#047857"
                                                            : "#b45309",
                                                    }}
                                                >
                                                    <div className="w-2.5 h-2.5 rounded-full bg-current" />
                                                </div>
                                            )}
                                        </label>
                                    );
                                })}
                            </div>
                        </div>

                        {/* ── Nama Layanan ── */}
                        <div>
                            <label htmlFor="name" className="block text-sm font-bold text-slate-900 mb-2">
                                Nama Layanan <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <Tag className="h-5 w-5 text-slate-500" />
                                </div>
                                <input
                                    id="name"
                                    name="name"
                                    type="text"
                                    required
                                    minLength={3}
                                    defaultValue={initialService?.name ?? ""}
                                    placeholder="Contoh: Kapal Nelayan Pak Budi - 6 Orang"
                                    className="block w-full pl-11 pr-3 py-3.5 border-2 border-gray-200 rounded-xl text-slate-900 font-medium placeholder-slate-400 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-base transition-all"
                                />
                            </div>
                        </div>

                        {/* ── Harga & Kapasitas (Side by Side) ── */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="price" className="block text-sm font-bold text-slate-900 mb-2">
                                    Harga (Rp) <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                        <DollarSign className="h-5 w-5 text-slate-500" />
                                    </div>
                                    <input
                                        id="price"
                                        name="price"
                                        type="number"
                                        required
                                        min={0}
                                        step={1000}
                                        defaultValue={initialService?.price ?? ""}
                                        placeholder="350000"
                                        className="block w-full pl-11 pr-3 py-3.5 border-2 border-gray-200 rounded-xl text-slate-900 font-medium placeholder-slate-400 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-base transition-all"
                                    />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="max_capacity" className="block text-sm font-bold text-slate-900 mb-2">
                                    Maks. Peserta <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                        <Hash className="h-5 w-5 text-slate-500" />
                                    </div>
                                    <input
                                        id="max_capacity"
                                        name="max_capacity"
                                        type="number"
                                        required
                                        min={1}
                                        max={100}
                                        defaultValue={initialService?.max_capacity ?? ""}
                                        placeholder="6"
                                        className="block w-full pl-11 pr-3 py-3.5 border-2 border-gray-200 rounded-xl text-slate-900 font-medium placeholder-slate-400 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-base transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* ── Kategori Dive Site ── */}
                        <div>
                            <label htmlFor="dive_site_category" className="block text-sm font-bold text-slate-900 mb-2">
                                Kategori Dive Site
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <MapPin className="h-5 w-5 text-slate-500" />
                                </div>
                                <select
                                    id="dive_site_category"
                                    name="dive_site_category"
                                    defaultValue={initialService?.dive_site_category ?? ""}
                                    className="block w-full pl-11 pr-3 py-3.5 border-2 border-gray-200 rounded-xl text-slate-900 font-medium bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-base transition-all appearance-none"
                                >
                                    {diveSiteCategories.map((cat) => (
                                        <option key={cat.value} value={cat.value}>
                                            {cat.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <p className="mt-1.5 text-xs text-slate-500 ml-1 font-medium">
                                Opsional. Pilih jenis spot selam yang paling sesuai dengan layanan Anda.
                            </p>
                        </div>

                        {/* ── Deskripsi ── */}
                        <div>
                            <label htmlFor="description" className="block text-sm font-bold text-slate-900 mb-2">
                                Deskripsi Layanan
                            </label>
                            <div className="relative">
                                <div className="absolute top-3.5 left-3.5 pointer-events-none">
                                    <FileText className="h-5 w-5 text-slate-500" />
                                </div>
                                <textarea
                                    id="description"
                                    name="description"
                                    rows={4}
                                    defaultValue={initialService?.description ?? ""}
                                    placeholder="Jelaskan apa saja yang termasuk dalam layanan ini, fasilitas, durasi, atau keunggulan..."
                                    className="block w-full pl-11 pr-3 py-3.5 border-2 border-gray-200 rounded-xl text-slate-900 font-medium placeholder-slate-400 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-base transition-all resize-none"
                                />
                            </div>
                        </div>

                        {/* ── Upload Gambar ── */}
                        <div>
                            <label className="block text-sm font-bold text-slate-900 mb-2">
                                Foto Layanan
                                {isEdit && <span className="ml-1 text-xs font-medium text-slate-500">(kosongkan jika tidak ingin mengganti)</span>}
                            </label>
                            <label
                                htmlFor="image"
                                className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 hover:border-primary/40 transition-all"
                            >
                                {imagePreview ? (
                                    <div className="relative w-full h-full rounded-xl overflow-hidden">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                            <p className="text-white text-sm font-semibold">Ganti Foto</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-2 py-4">
                                        <ImagePlus className="w-8 h-8 text-slate-400" />
                                        <p className="text-sm text-slate-500 font-medium">Klik untuk unggah foto</p>
                                        <p className="text-xs text-slate-400">JPEG, PNG, WebP • Maks 5MB</p>
                                    </div>
                                )}
                                <input
                                    id="image"
                                    name="image"
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    className="hidden"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            setImagePreview(URL.createObjectURL(file));
                                        }
                                    }}
                                />
                            </label>
                        </div>

                        {/* ── Submit ── */}
                        {isEdit && (
                            <div>
                                <label className="block text-sm font-bold text-slate-900 mb-2">
                                    Status Layanan
                                </label>
                                <input type="hidden" name="is_available" value="false" />
                                <label className="flex items-center justify-between gap-4 rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3.5">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-sm">
                                            <ToggleLeft className="w-5 h-5 text-slate-500" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-slate-900">Tersedia untuk dipesan</p>
                                            <p className="text-xs text-slate-500">Matikan jika layanan sementara tidak menerima booking.</p>
                                        </div>
                                    </div>
                                    <input
                                        type="checkbox"
                                        name="is_available"
                                        value="true"
                                        defaultChecked={initialService?.is_available !== false}
                                        className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                                    />
                                </label>
                            </div>
                        )}

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={isPending}
                                className="w-full flex justify-center py-4 px-4 border border-transparent rounded-xl shadow-md text-base font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed group hover:shadow-xl active:scale-[0.98]"
                                style={{ background: "linear-gradient(135deg, #023E8A, #0077B6)" }}
                            >
                                {isPending ? (
                                    <span className="flex items-center gap-2">
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        {isEdit ? "Memperbarui Layanan..." : "Menyimpan Layanan..."}
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-2">
                                        {isEdit ? "Simpan Perubahan" : "Simpan Layanan"}
                                        <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                    </span>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
