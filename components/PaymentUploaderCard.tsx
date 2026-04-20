"use client";

import { useState, useEffect, useTransition } from "react";
import { Clock, UploadCloud, CheckCircle2, AlertTriangle, Loader2, FileImage } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { submitPaymentProof } from "@/app/actions/payment";

interface PaymentUploaderCardProps {
    bookingId: string;
    paymentDeadline: string; // ISO string
    initialStatus: string;
}

export default function PaymentUploaderCard({ bookingId, paymentDeadline, initialStatus }: PaymentUploaderCardProps) {
    const [status, setStatus] = useState(initialStatus);
    const [timeLeft, setTimeLeft] = useState<string>("");
    const [isExpired, setIsExpired] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();
    const [resultMsg, setResultMsg] = useState<{ text: string; isError: boolean } | null>(null);

    // ─── Countdown Timer ──────────────────────────────────────
    useEffect(() => {
        if (status !== "unpaid") return;

        const deadline = new Date(paymentDeadline).getTime();

        const updateTimer = () => {
            const now = new Date().getTime();
            const distance = deadline - now;

            if (distance < 0) {
                setIsExpired(true);
                setTimeLeft("Waktu Habis");
                return;
            }

            const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((distance % (1000 * 60)) / 1000);
            
            setTimeLeft(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
        };

        updateTimer();
        const intervalId = setInterval(updateTimer, 1000);

        return () => clearInterval(intervalId);
    }, [paymentDeadline, status]);

    // ─── Handle File Upload ───────────────────────────────────
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selected = e.target.files[0];
            setFile(selected);
            setPreviewUrl(URL.createObjectURL(selected));
        }
    };

    const handleUpload = async () => {
        if (!file || isExpired) return;
        setResultMsg(null);

        startTransition(async () => {
            try {
                const supabase = createClient();
                const { data: authData } = await supabase.auth.getUser();
                if (!authData.user) throw new Error("Unauthorized");

                // Upload to Supabase Storage
                const fileExt = file.name.split(".").pop();
                const filePath = `${authData.user.id}/${bookingId}_${Date.now()}.${fileExt}`;
                
                const { error: uploadError } = await supabase.storage
                    .from("payment-proofs")
                    .upload(filePath, file);

                if (uploadError) throw uploadError;

                const { data: urlData } = supabase.storage
                    .from("payment-proofs")
                    .getPublicUrl(filePath);

                // Call Server Action
                const res = await submitPaymentProof(bookingId, urlData.publicUrl);
                
                if (res.success) {
                    setStatus("pending_verification");
                    setResultMsg({ text: res.message, isError: false });
                } else {
                    setResultMsg({ text: res.message, isError: true });
                }
            } catch (err: any) {
                console.error("Upload Error:", err);
                setResultMsg({ 
                    text: "Gagal mengunggah foto. Pastikan koneksi stabil dan file tidak lebih dari 5MB.", 
                    isError: true 
                });
            }
        });
    };

    if (status === "pending_verification") {
        return (
            <div className="mt-4 p-4 rounded-xl bg-blue-50 border border-blue-200 flex items-start gap-3 animate-in fade-in">
                <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                    <h4 className="text-sm font-bold text-blue-900">Pembayaran Sedang Diverifikasi</h4>
                    <p className="text-xs text-blue-800 mt-1 font-medium">
                        Bukti transfer Anda telah dikirim ke penyedia layanan. Mohon tunggu konfirmasi dalam waktu maksimal 1x24 jam.
                    </p>
                </div>
            </div>
        );
    }

    if (status === "paid") {
        return (
            <div className="mt-4 p-4 rounded-xl bg-green-50 border border-green-200 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                <div>
                    <h4 className="text-sm font-bold text-green-900">Pembayaran Berhasil</h4>
                    <p className="text-xs text-green-800 mt-1 font-medium">
                        Transaksi ini sudah dilunasi. Siapkan diri Anda untuk petualangan selam yang seru!
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="mt-4 pt-4 border-t border-gray-100">
            {/* Countdown Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Clock className={`w-4 h-4 ${isExpired ? "text-red-500" : "text-amber-500"}`} />
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Batas Waktu Bayar</span>
                </div>
                <div className={`px-2.5 py-1 rounded-md text-xs font-extrabold tabular-nums ${
                    isExpired ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"
                }`}>
                    {timeLeft || "Menghitung..."}
                </div>
            </div>

            {/* Error / Success Feedback */}
            {resultMsg && (
                <div className={`mb-4 p-3 rounded-xl flex items-start gap-2 text-xs font-bold ${
                    resultMsg.isError ? "bg-red-50 text-red-700 border border-red-200" : "bg-green-50 text-green-800 border border-green-200"
                }`}>
                    {resultMsg.isError ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
                    {resultMsg.text}
                </div>
            )}

            {!isExpired ? (
                <div className="space-y-3">
                    {!previewUrl ? (
                        <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 hover:border-slate-400 transition-colors">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <UploadCloud className="w-6 h-6 text-slate-400 mb-2" />
                                <p className="text-xs font-bold text-slate-700">Unggah Bukti Transfer</p>
                                <p className="text-[10px] text-slate-500 mt-0.5">JPEG, PNG (Maks 5MB)</p>
                            </div>
                            <input 
                                type="file" 
                                className="hidden" 
                                accept="image/jpeg,image/png,image/webp" 
                                onChange={handleFileChange}
                                disabled={isPending}
                            />
                        </label>
                    ) : (
                        <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl bg-slate-50">
                            <div className="w-12 h-12 bg-gray-200 rounded-lg overflow-hidden shrink-0 border border-gray-300">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-slate-900 truncate">{file?.name}</p>
                                <button 
                                    onClick={() => { setFile(null); setPreviewUrl(null); }}
                                    className="text-xs text-red-600 font-bold mt-1 hover:underline disabled:opacity-50"
                                    disabled={isPending}
                                >
                                    Ganti Format / Ubah File
                                </button>
                            </div>
                        </div>
                    )}

                    <button
                        onClick={handleUpload}
                        disabled={!file || isPending}
                        className="w-full btn-primary py-2.5 text-sm flex justify-center items-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isPending ? (
                            <><Loader2 className="w-4 h-4 animate-spin"/> Mengunggah...</>
                        ) : (
                            <><FileImage className="w-4 h-4" /> Kirim Bukti Pembayaran</>
                        )}
                    </button>
                </div>
            ) : (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <div>
                        <h4 className="text-sm font-bold text-red-900">Pembayaran Kadaluarsa</h4>
                        <p className="text-xs text-red-800 mt-1 font-medium">
                            Pesanan ini telah kedaluwarsa karena melewati batas waktu pembayaran 24 jam.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
