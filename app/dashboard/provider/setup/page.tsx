"use client";

import { useState, useTransition } from "react";
import { Ship, MapPin, Phone, FileText, Anchor, ArrowRight, Loader2, XCircle, Users as UsersIcon, Wrench, IdCard, GraduationCap } from "lucide-react";
import { setupProviderProfile } from "@/app/actions/provider";
import type { ProviderSetupResult } from "@/app/actions/provider";

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

export default function ProviderSetupPage() {
    const [isPending, startTransition] = useTransition();
    const [result, setResult] = useState<ProviderSetupResult | null>(null);
    const [selectedType, setSelectedType] = useState("boat");

    function handleSubmit(formData: FormData) {
        setResult(null);
        startTransition(async () => {
            const res = await setupProviderProfile(formData);
            setResult(res);
        });
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-xl w-full mx-auto">
                {/* Header Section */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-200 shadow-sm">
                        <Anchor className="w-8 h-8 text-primary" />
                    </div>
                    <h2 className="text-2xl font-extrabold text-slate-900">
                        Profil Bisnis & Verifikasi
                    </h2>
                    <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                        Lengkapi informasi usaha dan verifikasi identitas Anda untuk menjamin keamanan transaksi di SulutDive.
                    </p>
                </div>

                {/* Main Form Card */}
                <div className="bg-white py-8 px-8 shadow-lg border border-gray-100 rounded-3xl">
                    {/* Result Feedback */}
                    {result && !result.success && (
                        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3">
                            <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                            <p className="text-sm text-red-700 font-bold">{result.message}</p>
                        </div>
                    )}

                    <form action={handleSubmit} className="space-y-6">
                        
                        {/* ── Tipe Layanan Utama ── */}
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
                                            className={`relative flex flex-col items-center text-center gap-2 px-2 py-4 rounded-xl border-2 cursor-pointer transition-all ${
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

                        {/* Nama Usaha */}
                        <div>
                            <label htmlFor="name" className="block text-sm font-bold text-slate-900 mb-2">
                                Nama Usaha / Armada <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <Ship className="h-5 w-5 text-slate-500" />
                                </div>
                                <input
                                    id="name"
                                    name="name"
                                    type="text"
                                    required
                                    minLength={3}
                                    placeholder="Contoh: Budi Dive Resort"
                                    className="appearance-none block w-full pl-11 pr-3 py-3.5 border-2 border-gray-200 rounded-xl text-slate-900 font-bold placeholder-slate-400 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm transition-all"
                                />
                            </div>
                        </div>

                        {/* Lokasi / Alamat */}
                        <div>
                            <label htmlFor="location" className="block text-sm font-bold text-slate-900 mb-2">
                                Lokasi Pangkalan / Dermaga <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <MapPin className="h-5 w-5 text-slate-500" />
                                </div>
                                <input
                                    id="location"
                                    name="location"
                                    type="text"
                                    required
                                    placeholder="Contoh: Pelabuhan Ruko Pateten"
                                    className="appearance-none block w-full pl-11 pr-3 py-3.5 border-2 border-gray-200 rounded-xl text-slate-900 font-bold placeholder-slate-400 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm transition-all"
                                />
                            </div>
                        </div>

                        {/* Kontak / WhatsApp */}
                        <div>
                            <label htmlFor="contact" className="block text-sm font-bold text-slate-900 mb-2">
                                Nomor WhatsApp <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <Phone className="h-5 w-5 text-slate-500" />
                                </div>
                                <input
                                    id="contact"
                                    name="contact"
                                    type="tel"
                                    required
                                    placeholder="081234567890"
                                    className="appearance-none block w-full pl-11 pr-3 py-3.5 border-2 border-gray-200 rounded-xl text-slate-900 font-bold placeholder-slate-400 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm transition-all"
                                />
                            </div>
                        </div>

                        {/* Deskripsi Layanan */}
                        <div>
                            <label htmlFor="description" className="block text-sm font-bold text-slate-900 mb-2">
                                Deskripsi Singkat
                            </label>
                            <div className="relative">
                                <div className="absolute top-3.5 left-3.5 pointer-events-none">
                                    <FileText className="h-5 w-5 text-slate-500" />
                                </div>
                                <textarea
                                    id="description"
                                    name="description"
                                    rows={3}
                                    placeholder="Ceritakan pengalaman dan layanan Anda..."
                                    className="appearance-none block w-full pl-11 pr-3 py-3.5 border-2 border-gray-200 rounded-xl text-slate-900 font-bold placeholder-slate-400 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm transition-all resize-none"
                                />
                            </div>
                        </div>

                        {/* ── Verifikasi Identitas ── */}
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

                        {/* Submit Button */}
                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={isPending}
                                className="w-full flex justify-center py-4 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed group hover:shadow-xl active:scale-[0.98]"
                                style={{ background: "linear-gradient(135deg, #023E8A, #0077B6)" }}
                            >
                                {isPending ? (
                                    <span className="flex items-center gap-2">
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        Memverifikasi & Menyimpan...
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-2">
                                        Selesai & Mulai Jualan
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
