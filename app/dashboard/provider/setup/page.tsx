"use client";

import { useState, useTransition } from "react";
import { Ship, MapPin, Phone, FileText, Anchor, ArrowRight, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { setupProviderProfile } from "@/app/actions/provider";
import type { ProviderSetupResult } from "@/app/actions/provider";

export default function ProviderSetupPage() {
    const [isPending, startTransition] = useTransition();
    const [result, setResult] = useState<ProviderSetupResult | null>(null);

    function handleSubmit(formData: FormData) {
        setResult(null);
        startTransition(async () => {
            const res = await setupProviderProfile(formData);
            // Jika sampai di sini, berarti ada error (sukses = redirect otomatis)
            setResult(res);
        });
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full mx-auto">
                {/* Header Section */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-200 shadow-sm">
                        <Anchor className="w-8 h-8 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold text-deepSea">
                        Profil Bisnis Anda
                    </h2>
                    <p className="text-sm text-gray-500 mt-2">
                        Lengkapi informasi armada atau layanan selam Anda untuk ditampilkan kepada wisatawan SulutDive.
                    </p>
                </div>

                {/* Main Form Card */}
                <div className="bg-white py-8 px-6 shadow-sm border border-gray-100 rounded-3xl">
                    {/* Result Feedback */}
                    {result && !result.success && (
                        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3">
                            <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                            <p className="text-sm text-red-700">{result.message}</p>
                        </div>
                    )}

                    <form action={handleSubmit} className="space-y-6">
                        
                        {/* Nama Usaha */}
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
                                Nama Usaha / Armada
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Ship className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    id="name"
                                    name="name"
                                    type="text"
                                    required
                                    minLength={3}
                                    placeholder="Contoh: Budi Dive Resort / Kapal Pak Mamat"
                                    className="appearance-none block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm transition-all"
                                />
                            </div>
                        </div>

                        {/* Lokasi / Alamat */}
                        <div>
                            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1.5">
                                Lokasi Pangkalan / Dermaga
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <MapPin className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    id="location"
                                    name="location"
                                    type="text"
                                    required
                                    placeholder="Contoh: Pelabuhan Ruko Pateten, Bitung"
                                    className="appearance-none block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm transition-all"
                                />
                            </div>
                        </div>

                        {/* Kontak / WhatsApp */}
                        <div>
                            <label htmlFor="contact" className="block text-sm font-medium text-gray-700 mb-1.5">
                                Nomor WhatsApp (Aktif)
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Phone className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    id="contact"
                                    name="contact"
                                    type="tel"
                                    required
                                    placeholder="081234567890"
                                    className="appearance-none block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm transition-all"
                                />
                            </div>
                            <p className="mt-1 text-xs text-gray-500 ml-1">Gunakan nomor yang terhubung dengan WhatsApp untuk konfirmasi pesanan.</p>
                        </div>

                        {/* Deskripsi Layanan */}
                        <div>
                            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1.5">
                                Deskripsi Singkat Layanan
                            </label>
                            <div className="relative">
                                <div className="absolute top-3 left-3 pointer-events-none">
                                    <FileText className="h-5 w-5 text-gray-400" />
                                </div>
                                <textarea
                                    id="description"
                                    name="description"
                                    rows={4}
                                    placeholder="Ceritakan sedikit tentang armada kapal Anda, fasilitas yang didapat, atau pengalaman Anda sebagai pemandu selam di Selat Lembeh..."
                                    className="appearance-none block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm transition-all resize-none"
                                />
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={isPending}
                                className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                                style={{
                                    background: "linear-gradient(135deg, #023E8A, #0077B6)"
                                }}
                            >
                                {isPending ? (
                                    <span className="flex items-center gap-2">
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        Menyimpan Profil...
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-2">
                                        Simpan & Lanjutkan ke Dashboard
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
