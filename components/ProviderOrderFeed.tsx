"use client";

import { useEffect, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { updateBookingStatus } from "@/app/actions/booking";
import type { BookingStatusAction } from "@/app/actions/booking";
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
    service?: OrderService;
}

interface ProviderOrderFeedProps {
    providerId: string;
}

const statusConfig: Record<string, { label: string; bg: string; text: string; icon: React.ElementType }> = {
    pending: { label: "Menunggu", bg: "bg-amber-50", text: "text-amber-700", icon: Clock },
    upcoming: { label: "Diterima", bg: "bg-blue-50", text: "text-blue-700", icon: Calendar },
    in_progress: { label: "Berlangsung", bg: "bg-cyan-50", text: "text-cyan-700", icon: Ship },
    completed: { label: "Selesai", bg: "bg-green-50", text: "text-green-700", icon: CheckCircle2 },
    cancelled: { label: "Dibatalkan", bg: "bg-red-50", text: "text-red-700", icon: XCircle },
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

    useEffect(() => {
        const supabase = createClient();

        // ─── Initial Fetch ─────────────────────────────────────────
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

        // ─── Realtime Subscription ─────────────────────────────────
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
                async (payload) => {
                    // Fetch the full record with service join
                    const { data: fullBooking } = await supabase
                        .from("bookings")
                        .select("*, service:services(id, name, type)")
                        .eq("id", (payload.new as Order).id)
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
                (payload) => {
                    const updated = payload.new as Order;
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

    // ─── Status Update Handler ─────────────────────────────────
    const handleStatusUpdate = (bookingId: string, newStatus: BookingStatusAction) => {
        setActionResult(null);
        startTransition(async () => {
            const result = await updateBookingStatus(bookingId, newStatus);
            setActionResult({ id: bookingId, msg: result.message, ok: result.success });

            if (result.success) {
                // Optimistic update
                setOrders((prev) =>
                    prev.map((o) =>
                        o.id === bookingId ? { ...o, status: newStatus } : o
                    )
                );
                setTimeout(() => setActionResult(null), 3000);
            }
        });
    };

    const formatDate = (dateStr: string) =>
        new Date(dateStr).toLocaleDateString("id-ID", {
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

    // ─── Render ────────────────────────────────────────────────
    if (isLoading) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-center py-8 gap-3">
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                    <span className="text-sm text-gray-500">Memuat pesanan...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="p-6 pb-4 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-deepSea flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-primary" />
                    Pesanan Masuk
                </h3>
                {orders.length > 0 && (
                    <span className="text-xs font-medium text-gray-400">
                        {orders.length} pesanan
                    </span>
                )}
            </div>

            {/* New Order Alert */}
            {newOrderAlert && (
                <div className="mx-6 mb-4 p-3 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2 animate-pulse">
                    <BellRing className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">
                        Pesanan baru masuk!
                    </span>
                </div>
            )}

            {/* Action Result */}
            {actionResult && (
                <div className={`mx-6 mb-4 p-3 rounded-xl flex items-center gap-2 text-sm border ${
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

            {/* Order List */}
            {orders.length === 0 ? (
                <div className="text-center py-10 px-6">
                    <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                        <ClipboardList className="w-7 h-7 text-gray-300" />
                    </div>
                    <p className="text-gray-400 text-sm">Belum ada pesanan masuk.</p>
                    <p className="text-gray-300 text-xs mt-1">
                        Pesanan baru akan muncul secara real-time di sini.
                    </p>
                </div>
            ) : (
                <div className="divide-y divide-gray-50">
                    {orders.map((order) => {
                        const status = statusConfig[order.status] || statusConfig.pending;
                        const StatusIcon = status.icon;
                        const ServiceIcon = serviceTypeIcon[order.service?.type || "boat"] || Ship;

                        return (
                            <div
                                key={order.id}
                                className="px-6 py-4 hover:bg-gray-50/50 transition-colors"
                            >
                                <div className="flex justify-between items-start gap-3">
                                    {/* Left: Info */}
                                    <div className="flex items-start gap-3 min-w-0">
                                        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
                                            <ServiceIcon className="w-5 h-5 text-primary" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-semibold text-deepSea text-sm truncate">
                                                {order.service?.name || "Layanan"}
                                            </p>
                                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                                <span className="flex items-center gap-1">
                                                    <Users className="w-3 h-3" />
                                                    {order.total_participants} peserta
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {formatDate(order.booking_date)}
                                                </span>
                                            </div>
                                            <p className="text-xs font-medium text-primary mt-1">
                                                {formatPrice(order.total_price)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Right: Status Badge */}
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap flex items-center gap-1 ${status.bg} ${status.text}`}>
                                        <StatusIcon className="w-3 h-3" />
                                        {status.label}
                                    </span>
                                </div>

                                {/* Action Buttons (only for actionable statuses) */}
                                {(order.status === "pending" || order.status === "upcoming" || order.status === "in_progress") && (
                                    <div className="flex items-center gap-2 mt-3 ml-[52px]">
                                        {order.status === "pending" && (
                                            <>
                                                <button
                                                    onClick={() => handleStatusUpdate(order.id, "upcoming")}
                                                    disabled={isPending}
                                                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
                                                >
                                                    Konfirmasi Pesanan
                                                </button>
                                                <button
                                                    onClick={() => handleStatusUpdate(order.id, "cancelled")}
                                                    disabled={isPending}
                                                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
                                                >
                                                    Tolak
                                                </button>
                                            </>
                                        )}
                                        {order.status === "upcoming" && (
                                            <>
                                                <button
                                                    onClick={() => handleStatusUpdate(order.id, "in_progress")}
                                                    disabled={isPending}
                                                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-cyan-600 text-white hover:bg-cyan-700 transition-colors disabled:opacity-50"
                                                >
                                                    Mulai Dive
                                                </button>
                                                <button
                                                    onClick={() => handleStatusUpdate(order.id, "cancelled")}
                                                    disabled={isPending}
                                                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
                                                >
                                                    Batalkan
                                                </button>
                                            </>
                                        )}
                                        {order.status === "in_progress" && (
                                            <button
                                                onClick={() => handleStatusUpdate(order.id, "completed")}
                                                disabled={isPending}
                                                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
                                            >
                                                Selesai
                                            </button>
                                        )}
                                        {isPending && (
                                            <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin" />
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
