"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { updateBookingStatus } from "@/app/actions/booking";
import type { BookingStatusAction } from "@/app/actions/booking";
import { verifyPayment, getPaymentProofSignedUrl } from "@/app/actions/payment";
import type {
    RealtimePostgresInsertPayload,
    RealtimePostgresUpdatePayload,
} from "@supabase/supabase-js";
import {
    ClipboardList,
    Users,
    Calendar,
    CheckCircle2,
    XCircle,
    Clock,
    Loader2,
    Ship,
    Wrench,
    BellRing,
    Waves,
    CalendarCheck,
    Receipt,
    Eye
} from "lucide-react";

interface OrderService {
    id: string;
    name: string;
    type: string;
}

interface Order {
    id: string;
    user_id: string;
    service_id: string;
    provider_id: string;
    dive_site_id?: string;
    booking_date: string;
    total_participants: number;
    status: string;
    total_price: number;
    notes?: string;
    created_at: string;
    updated_at?: string;
    payment_status?: string;
    payment_proof_url?: string;
    payment_deadline?: string;
    service?: OrderService;
}

interface ProviderOrderFeedProps {
    providerId: string;
}

type BookingRealtimeRow = Partial<Order> & { id: string };

// â”€â”€â”€ Helper: Get today's date as YYYY-MM-DD (WITA-safe) â”€â”€â”€â”€â”€â”€â”€â”€
function getTodayStr(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

// â”€â”€â”€ Status Config (updated: upcoming â†’ confirmed) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const statusConfig: Record<string, { label: string; bg: string; text: string; icon: React.ElementType }> = {
    pending:     { label: "Menunggu",    bg: "bg-amber-50 border-amber-200",  text: "text-amber-800",   icon: Clock },
    confirmed:   { label: "Dikonfirmasi", bg: "bg-blue-50 border-blue-200",   text: "text-blue-800",    icon: CalendarCheck },
    in_progress: { label: "Berlangsung",  bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-800", icon: Waves },
    completed:   { label: "Selesai",      bg: "bg-gray-100 border-gray-200",  text: "text-gray-600",    icon: CheckCircle2 },
    cancelled:   { label: "Dibatalkan",   bg: "bg-red-50 border-red-200",     text: "text-red-700",     icon: XCircle },
};

const serviceTypeIcon: Record<string, React.ElementType> = {
    boat: Ship,
    gear: Wrench,
    instructor: Users,
};

export default function ProviderOrderFeed({ providerId }: ProviderOrderFeedProps) {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newOrderAlert, setNewOrderAlert] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [actionResult, setActionResult] = useState<{ id: string; msg: string; ok: boolean } | null>(null);
    const [selectedProofUrl, setSelectedProofUrl] = useState<string | null>(null);
    const [loadingProofId, setLoadingProofId] = useState<string | null>(null);

    const todayStr = getTodayStr();

    useEffect(() => {
        const supabase = createClient();

        // â”€â”€â”€ Initial Fetch â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        const fetchOrders = async () => {
            const { data } = await supabase
                .from("bookings")
                .select("*, service:services(id, name, type)")
                .eq("provider_id", providerId)
                .order("created_at", { ascending: false })
                .limit(30);

            if (data) setOrders(data as Order[]);
            setIsLoading(false);
        };

        fetchOrders();

        // â”€â”€â”€ Realtime Subscription â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        const channel = supabase
            .channel(`provider-orders-${providerId}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "bookings",
                    filter: `provider_id=eq.${providerId}`,
                },
                async (payload: RealtimePostgresInsertPayload<BookingRealtimeRow>) => {
                    const { data: fullBooking } = await supabase
                        .from("bookings")
                        .select("*, service:services(id, name, type)")
                        .eq("id", payload.new.id)
                        .single();

                    if (fullBooking) {
                        setOrders((prev) => [fullBooking as Order, ...prev]);
                        setNewOrderAlert(true);
                        setTimeout(() => setNewOrderAlert(false), 5000);
                    }
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "bookings",
                    filter: `provider_id=eq.${providerId}`,
                },
                (payload: RealtimePostgresUpdatePayload<BookingRealtimeRow>) => {
                    const updated = payload.new;
                    setOrders((prev) =>
                        prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o))
                    );
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [providerId]);

    // â”€â”€â”€ Generic Status Update Handler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const handleStatusUpdate = (bookingId: string, newStatus: BookingStatusAction) => {
        setActionResult(null);
        startTransition(async () => {
            try {
                const result = await updateBookingStatus(bookingId, newStatus);
                setActionResult({ id: bookingId, msg: result.message, ok: result.success });

                if (result.success) {
                    setOrders((prev) =>
                        prev.map((o) =>
                            o.id === bookingId ? { ...o, status: newStatus } : o
                        )
                    );
                    setTimeout(() => setActionResult(null), 4000);
                }
            } catch (err) {
                // Network / connectivity error
                setActionResult({
                    id: bookingId,
                    msg: "Gagal terhubung ke server. Periksa koneksi internet Anda.",
                    ok: false,
                });
            }
        });
    };

    // â”€â”€â”€ Payment Verification Handler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const handleVerifyPayment = (bookingId: string, action: "approve" | "reject") => {
        setActionResult(null);
        startTransition(async () => {
            try {
                const result = await verifyPayment(bookingId, action);
                setActionResult({ id: bookingId, msg: result.message, ok: result.success });

                if (result.success) {
                    setOrders((prev) =>
                        prev.map((o) =>
                            o.id === bookingId 
                                ? { 
                                    ...o, 
                                    payment_status: action === "approve" ? "paid" : "unpaid",
                                    status: action === "approve" ? "confirmed" : "pending"
                                } 
                                : o
                        )
                    );
                    setSelectedProofUrl(null);
                    setTimeout(() => setActionResult(null), 4000);
                }
            } catch (err) {
                setActionResult({
                    id: bookingId,
                    msg: "Gagal memverifikasi pembayaran. Periksa koneksi internet Anda.",
                    ok: false,
                });
            }
        });
    };

    // â”€â”€â”€ Open Payment Proof (via Signed URL jika bucket privat) â”€â”€
    const handleViewProof = async (bookingId: string, fallbackUrl: string) => {
        setLoadingProofId(bookingId);
        try {
            const result = await getPaymentProofSignedUrl(bookingId);
            setSelectedProofUrl(result.url || fallbackUrl);
        } catch {
            // Fallback ke URL asli jika Server Action gagal
            setSelectedProofUrl(fallbackUrl);
        } finally {
            setLoadingProofId(null);
        }
    };

    // â”€â”€â”€ handleStartDive: Only when confirmed + today â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const handleStartOrder = (order: Order) => {
        if (order.status !== "confirmed") return;
        const isGearOrder = order.service?.type === "gear";
        if (order.booking_date !== todayStr) {
            setActionResult({
                id: order.id,
                msg: `${isGearOrder ? "Sewa alat" : "Dive"} hanya bisa dimulai pada tanggal booking (${formatDate(order.booking_date)}). Hari ini bukan jadwalnya.`,
                ok: false,
            });
            return;
        }
        handleStatusUpdate(order.id, "in_progress");
    };

    const formatDate = (dateStr: string) =>
        new Date(dateStr + "T00:00:00").toLocaleDateString("id-ID", {
            weekday: "short",
            day: "numeric",
            month: "short",
            year: "numeric",
        });

    const formatPrice = (amount: number) =>
        new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
        }).format(amount);

    // â”€â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (isLoading) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-center py-8 gap-3">
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                    <span className="text-sm text-slate-600 font-medium">Memuat pesanan...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 pb-4 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <ClipboardList className="w-5 h-5 text-primary" />
                        Pesanan Masuk
                    </h3>
                    {orders.length > 0 && (
                        <span className="text-xs font-bold text-slate-500">
                            {orders.length} pesanan
                        </span>
                    )}
                </div>

                {/* New Order Alert */}
                {newOrderAlert && (
                    <div className="mx-6 mb-4 p-3 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2 animate-pulse">
                        <BellRing className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-bold text-green-800">
                            Pesanan baru masuk!
                        </span>
                    </div>
                )}

                {/* Action Result */}
                {actionResult && (
                    <div className={`mx-6 mb-4 p-3 rounded-xl flex items-center gap-2 text-sm font-medium border ${
                        actionResult.ok
                            ? "bg-green-50 border-green-200 text-green-800"
                            : "bg-red-50 border-red-200 text-red-800"
                    }`}>
                        {actionResult.ok ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                        ) : (
                            <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                        )}
                        {actionResult.msg}
                    </div>
                )}
            </div>

            {/* Image Modal for Payment Proof */}
            {selectedProofUrl && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-3xl overflow-hidden max-w-lg w-full shadow-2xl">
                        <div className="flex items-center justify-between p-4 border-b border-gray-100">
                            <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                <Receipt className="w-5 h-5 text-primary" />
                                Bukti Transfer
                            </h3>
                            <button 
                                onClick={() => setSelectedProofUrl(null)}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                            >
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-1 max-h-[70vh] overflow-hidden bg-gray-50 flex items-center justify-center relative w-full h-[60vh]">
                            <Image 
                                src={selectedProofUrl} 
                                alt="Bukti Pembayaran" 
                                fill 
                                className="object-contain rounded-xl" 
                                unoptimized={true}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Order List */}
            {orders.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 text-center py-10 px-6">
                    <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                        <ClipboardList className="w-7 h-7 text-gray-300" />
                    </div>
                    <p className="text-slate-600 text-sm font-medium">Belum ada pesanan masuk.</p>
                    <p className="text-slate-400 text-xs mt-1">
                        Pesanan baru akan muncul secara real-time di sini.
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {orders.map((order) => {
                        const status = statusConfig[order.status] || statusConfig.pending;
                        const StatusIcon = status.icon;
                        const ServiceIcon = serviceTypeIcon[order.service?.type || "boat"] || Ship;
                        const isToday = order.booking_date === todayStr;
                        const isGearOrder = order.service?.type === "gear";
                        const participantLabel = isGearOrder ? "unit" : "peserta";
                        const canStartOrder = order.status === "confirmed" && isToday;
                        const startLabel = isGearOrder ? "Mulai Sewa" : "Mulai Selam";
                        const todayLabel = isGearOrder ? "Mulai Sewa Hari Ini" : "Tersedia Hari Ini";
                        const statusLabel = order.status === "in_progress" && isGearOrder ? "Sedang Disewa" : status.label;

                        return (
                            <div
                                key={order.id}
                                className={`bg-white rounded-2xl shadow-sm border overflow-hidden transition-all ${
                                    isToday && order.status !== "completed" && order.status !== "cancelled"
                                        ? "border-emerald-300 ring-2 ring-emerald-100"
                                        : "border-gray-100"
                                }`}
                            >
                                {/* Today Badge */}
                                {isToday && order.status !== "completed" && order.status !== "cancelled" && (
                                    <div className="bg-emerald-600 text-white text-xs font-bold px-4 py-1.5 flex items-center gap-1.5">
                                        <Calendar className="w-3.5 h-3.5" />
                                        {todayLabel}
                                    </div>
                                )}

                                <div className="p-5">
                                    <div className="flex justify-between items-start gap-3">
                                        {/* Left: Info */}
                                        <div className="flex items-start gap-3 min-w-0">
                                            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                                                order.status === "in_progress"
                                                    ? "bg-emerald-100 text-emerald-700"
                                                    : order.status === "completed"
                                                    ? "bg-gray-100 text-gray-400"
                                                    : "bg-blue-50 text-primary"
                                            }`}>
                                                <ServiceIcon className="w-5 h-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-bold text-slate-900 text-sm truncate">
                                                    {order.service?.name || "Layanan"}
                                                </p>
                                                <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-600 font-medium">
                                                    <span className="flex items-center gap-1">
                                                        <Users className="w-3.5 h-3.5" />
                                                        {order.total_participants} {participantLabel}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="w-3.5 h-3.5" />
                                                        {formatDate(order.booking_date)}
                                                    </span>
                                                </div>
                                                <p className="text-sm font-extrabold text-primary mt-1.5">
                                                    {formatPrice(order.total_price)}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Right: Status Badge */}
                                        <span className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap flex items-center gap-1 border ${status.bg} ${status.text}`}>
                                            <StatusIcon className="w-3.5 h-3.5" />
                                            {statusLabel}
                                        </span>
                                    </div>

                                    {/* Payment Proof & Actions */}
                                    <div className="flex flex-col md:flex-row md:items-center gap-4 mt-4 ml-[56px] border-t border-gray-100 pt-4">
                                        
                                        {/* Thumbnail Bukti Pembayaran */}
                                        <div className="flex items-center gap-3">
                                            <div 
                                                className={`w-16 h-16 rounded-lg border overflow-hidden relative shrink-0 flex items-center justify-center ${
                                                    order.payment_proof_url ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"
                                                }`}
                                            >
                                                {order.payment_proof_url ? (
                                                    <Image 
                                                        src={order.payment_proof_url} 
                                                        alt="Bukti Bayar" 
                                                        fill 
                                                        sizes="64px"
                                                        className={`object-cover transition-transform ${
                                                            loadingProofId === order.id 
                                                                ? "opacity-50" 
                                                                : "cursor-pointer hover:scale-110"
                                                        }`}
                                                        onClick={() => !loadingProofId && handleViewProof(order.id, order.payment_proof_url!)}
                                                        unoptimized={true}
                                                    />
                                                ) : (
                                                    <Receipt className="w-6 h-6 text-slate-300" />
                                                )}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-slate-700">Bukti Pembayaran</span>
                                                {order.payment_proof_url ? (
                                                    <span className="text-[11px] text-emerald-600 font-bold bg-emerald-100 px-2 py-0.5 rounded-full mt-1 w-fit">
                                                        Sudah Diunggah
                                                    </span>
                                                ) : (
                                                    <span className="text-[11px] text-amber-600 font-bold bg-amber-100 px-2 py-0.5 rounded-full mt-1 w-fit italic">
                                                        Menunggu Pembayaran
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex flex-wrap items-center gap-2 md:ml-auto">
                                            {/* Payment Verification Buttons */}
                                            {order.payment_status === "pending_verification" && (
                                                <div className="flex items-center gap-2 border-gray-200 pr-2">
                                                    <button
                                                        onClick={() => handleVerifyPayment(order.id, "approve")}
                                                        disabled={isPending}
                                                        className="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm"
                                                    >
                                                        Terima Bayar
                                                    </button>
                                                    <button
                                                        onClick={() => handleVerifyPayment(order.id, "reject")}
                                                        disabled={isPending}
                                                        className="px-3 py-2 text-xs font-bold rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
                                                    >
                                                        Tolak
                                                    </button>
                                                </div>
                                            )}

                                            {/* Normal Flow Buttons */}
                                            {order.payment_status !== "pending_verification" && (order.status === "pending" || order.status === "confirmed" || order.status === "in_progress") && (
                                                <>
                                                    {order.status === "pending" && (
                                                        <>
                                                            <button
                                                                onClick={() => handleStatusUpdate(order.id, "confirmed")}
                                                                disabled={isPending || order.payment_status !== "paid"}
                                                                title={order.payment_status !== "paid" ? "Tunggu pembayaran lunas" : "Konfirmasi pesanan"}
                                                                className="px-4 py-2 text-xs font-bold rounded-lg bg-[#023E8A] text-white hover:bg-[#03045E] transition-colors disabled:opacity-50 shadow-sm"
                                                            >
                                                                Konfirmasi Order
                                                            </button>
                                                            <button
                                                                onClick={() => handleStatusUpdate(order.id, "cancelled")}
                                                                disabled={isPending}
                                                                className="px-3 py-2 text-xs font-bold rounded-lg bg-gray-100 text-slate-700 hover:bg-red-50 hover:text-red-700 transition-colors disabled:opacity-50"
                                                            >
                                                                Batal
                                                            </button>
                                                        </>
                                                    )}
                                                    {order.status === "confirmed" && (
                                                        <>
                                                            <button
                                                                onClick={() => handleStartOrder(order)}
                                                                disabled={isPending || !canStartOrder}
                                                                title={!isToday ? `${isGearOrder ? "Sewa dimulai" : "Dive dimulai"} pada ${order.booking_date}` : ""}
                                                                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all disabled:opacity-50 shadow-sm flex items-center gap-1.5 ${
                                                                    canStartOrder
                                                                        ? "bg-emerald-600 text-white hover:bg-emerald-700"
                                                                        : "bg-gray-200 text-gray-500 cursor-not-allowed"
                                                                }`}
                                                            >
                                                                {isGearOrder ? <Wrench className="w-3.5 h-3.5" /> : <Waves className="w-3.5 h-3.5" />}
                                                                {startLabel}
                                                            </button>
                                                        </>
                                                    )}
                                                    {order.status === "in_progress" && (
                                                        <button
                                                            onClick={() => handleStatusUpdate(order.id, "completed")}
                                                            disabled={isPending}
                                                            className="px-4 py-2 text-xs font-bold rounded-lg bg-slate-800 text-white hover:bg-slate-900 transition-colors disabled:opacity-50 shadow-sm"
                                                        >
                                                            Tandai Selesai
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                            {isPending && (
                                                <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                                            )}
                                        </div>
                                    </div>
                        </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

