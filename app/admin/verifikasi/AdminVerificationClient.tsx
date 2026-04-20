"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, XCircle, Loader2, FileImage, ShieldAlert, Award, FileText } from "lucide-react";
import { verifyProviderIdentity } from "@/app/actions/provider";
import type { Provider } from "@/lib/supabase";

interface AdminVerificationClientProps {
    initialProviders: Provider[];
}

export default function AdminVerificationClient({ initialProviders }: AdminVerificationClientProps) {
    const [providers, setProviders] = useState<Provider[]>(initialProviders);
    const [isPending, startTransition] = useTransition();
    const [selectedImage, setSelectedImage] = useState<{ url: string; title: string } | null>(null);
    const [actionResult, setActionResult] = useState<{ id: string; msg: string; isError: boolean } | null>(null);

    const handleVerify = (providerId: string, action: "approve" | "reject") => {
        setActionResult(null);
        startTransition(async () => {
            try {
                const res = await verifyProviderIdentity(providerId, action);
                setActionResult({ id: providerId, msg: res.message, isError: !res.success });

                if (res.success) {
                    setProviders((prev) => prev.filter((p) => p.id !== providerId));
                    setTimeout(() => setActionResult(null), 4000);
                }
            } catch (err: any) {
                setActionResult({ id: providerId, msg: "Terjadi kesalahan jaringan.", isError: true });
            }
        });
    };

    if (providers.length === 0) {
        return (
            <div className="text-center py-12 px-4 rounded-2xl bg-gray-50 border border-gray-100 flex flex-col items-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-8 h-8 text-[#023E8A]" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Semua Bersih!</h3>
                <p className="text-sm text-slate-500 mt-1">Tidak ada Provider yang menunggu verifikasi saat ini.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Image Viewer Modal */}
            {selectedImage && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/85 backdrop-blur-md animate-in fade-in">
                    <div className="bg-white rounded-3xl overflow-hidden max-w-2xl w-full shadow-2xl border border-white/20">
                        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-slate-50">
                            <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                <FileImage className="w-5 h-5 text-[#023E8A]" />
                                {selectedImage.title}
                            </h3>
                            <button 
                                onClick={() => setSelectedImage(null)}
                                className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-200 rounded-full transition-colors"
                            >
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-4 bg-gray-100 flex items-center justify-center relative min-h-[50vh] max-h-[75vh]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img 
                                src={selectedImage.url} 
                                alt={selectedImage.title} 
                                className="max-w-full max-h-full object-contain rounded-lg shadow-sm"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Providers List */}
            <div className="grid gap-4">
                {providers.map((provider) => (
                    <div key={provider.id} className="bg-white border-2 border-gray-100 rounded-2xl p-5 hover:border-blue-100 transition-colors shadow-sm">
                        
                        {/* Result Notification */}
                        {actionResult?.id === provider.id && (
                            <div className={`mb-4 p-3 rounded-xl flex items-center gap-2 text-sm font-bold border ${
                                actionResult.isError ? "bg-red-50 text-red-800 border-red-200" : "bg-emerald-50 text-emerald-800 border-emerald-200"
                            }`}>
                                {actionResult.isError ? <XCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
                                {actionResult.msg}
                            </div>
                        )}

                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-5">
                            {/* Provider Meta */}
                            <div className="space-y-1 flex-1">
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                                    {provider.name}
                                </h3>
                                <p className="text-sm font-bold text-slate-600 flex items-center gap-1.5">
                                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-black tracking-wider ${
                                        provider.primary_type === 'boat' ? 'bg-blue-100 text-blue-800' :
                                        provider.primary_type === 'instructor' ? 'bg-emerald-100 text-emerald-800' :
                                        'bg-amber-100 text-amber-800'
                                    }`}>
                                        {provider.primary_type || 'Unknown'}
                                    </span>
                                    • {provider.location}
                                </p>
                                <p className="text-xs text-slate-500 font-medium">
                                    Kontak: <span className="font-bold text-slate-800">{provider.contact}</span>
                                </p>
                                <p className="text-xs text-slate-400 mt-2">
                                    Mendaftar: {new Date(provider.created_at || "").toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </p>
                            </div>

                            {/* Documents Review */}
                            <div className="flex gap-2 items-center flex-wrap shrink-0">
                                <button
                                    onClick={() => setSelectedImage({ url: provider.identity_card_url || "", title: `KTP: ${provider.name}` })}
                                    disabled={!provider.identity_card_url}
                                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm font-bold text-slate-700 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-800 transition-colors disabled:opacity-50"
                                >
                                    <FileText className="w-4 h-4" />
                                    Lihat KTP
                                </button>
                                
                                {provider.primary_type === 'instructor' && (
                                    <button
                                        onClick={() => setSelectedImage({ url: provider.certification_url || "", title: `Sertifikasi: ${provider.name}` })}
                                        disabled={!provider.certification_url}
                                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm font-bold text-slate-700 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-800 transition-colors disabled:opacity-50"
                                    >
                                        <Award className="w-4 h-4" />
                                        Lihat Sertifikasi
                                    </button>
                                )}
                            </div>

                            {/* Action Decisions */}
                            <div className="flex gap-2 border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-5 shrink-0 flex-col md:flex-row">
                                <button
                                    onClick={() => handleVerify(provider.id, "approve")}
                                    disabled={isPending}
                                    className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold shadow-sm hover:bg-emerald-700 hover:shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
                                >
                                    {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
                                    Terima
                                </button>
                                <button
                                    onClick={() => handleVerify(provider.id, "reject")}
                                    disabled={isPending}
                                    className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-red-50 text-red-700 text-sm font-bold hover:bg-red-100 transition-colors disabled:opacity-50"
                                >
                                    <XCircle className="w-4 h-4" />
                                    Tolak
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
