import Link from "next/link";
import { AlertCircle, ArrowLeft, CheckCircle2, ClipboardList, Clock, TrendingUp, XCircle } from "lucide-react";
import { getAdminContext } from "@/lib/supabase/admin";
import { getServiceTypeLabel } from "@/lib/service-types";
import { bookingStatusLabels, paymentStatusLabels } from "@/lib/booking-status";
import { formatDateId, formatRupiah } from "@/lib/formatters";

export const dynamic = "force-dynamic";

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
    pending: { label: bookingStatusLabels.pending, bg: "bg-amber-100", text: "text-amber-700" },
    confirmed: { label: bookingStatusLabels.confirmed, bg: "bg-blue-100", text: "text-blue-700" },
    in_progress: { label: bookingStatusLabels.in_progress, bg: "bg-indigo-100", text: "text-indigo-700" },
    completed: { label: bookingStatusLabels.completed, bg: "bg-emerald-100", text: "text-emerald-700" },
    cancelled: { label: bookingStatusLabels.cancelled, bg: "bg-red-100", text: "text-red-700" },
};

function getRelation<T>(value: T | T[] | null): T | null {
    return Array.isArray(value) ? value[0] ?? null : value;
}

export default async function AdminOrdersPage() {
    const { adminDb } = await getAdminContext();
    const { data: bookings, error } = await adminDb
        .from("bookings")
        .select(`
            id, status, payment_status, total_price, booking_date,
            total_participants, created_at,
            service:services (
                name, type,
                provider:providers ( name )
            )
        `)
        .order("created_at", { ascending: false })
        .limit(200);

    const allBookings = bookings ?? [];
    const pendingCount = allBookings.filter((booking) => booking.status === "pending").length;
    const completedCount = allBookings.filter((booking) => booking.status === "completed").length;
    const paidRevenue = allBookings
        .filter((booking) => booking.status === "completed" && booking.payment_status === "paid")
        .reduce((sum, booking) => sum + Number(booking.total_price ?? 0), 0);

    return (
        <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
                <Link href="/admin" className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-blue-50 hover:text-[#023E8A]">
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <div>
                    <h1 className="flex items-center gap-2 text-2xl font-black text-[#023E8A]">
                        <ClipboardList className="h-6 w-6 text-[#0077B6]" />
                        Semua Pesanan Platform
                    </h1>
                    <p className="mt-0.5 text-sm text-slate-500">
                        {allBookings.length} transaksi tercatat &bull; {pendingCount} menunggu konfirmasi
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {[
                    { label: "Menunggu Konfirmasi", value: pendingCount, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
                    { label: "Selesai", value: completedCount, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
                    { label: "Total Transaksi", value: allBookings.length, icon: TrendingUp, color: "text-[#023E8A]", bg: "bg-blue-50" },
                    { label: "Pendapatan Terbayar", value: formatRupiah(paidRevenue), icon: AlertCircle, color: "text-rose-600", bg: "bg-rose-50" },
                ].map((stat) => (
                    <div key={stat.label} className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${stat.bg}`}>
                            <stat.icon className={`h-5 w-5 ${stat.color}`} />
                        </div>
                        <div className="min-w-0">
                            <p className="truncate text-xl font-black text-slate-900">{stat.value}</p>
                            <p className="text-[11px] font-bold leading-tight text-slate-500">{stat.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
                    <XCircle className="mx-auto mb-2 h-10 w-10 text-red-400" />
                    <p className="text-sm font-bold text-red-700">Gagal memuat data pesanan.</p>
                    <p className="mt-1 text-xs text-red-500">{error.message}</p>
                </div>
            ) : allBookings.length === 0 ? (
                <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center shadow-sm">
                    <ClipboardList className="mx-auto mb-3 h-12 w-12 text-slate-200" />
                    <p className="font-bold text-slate-500">Belum ada pesanan masuk</p>
                </div>
            ) : (
                <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 bg-slate-50">
                                    {['Layanan', 'Provider', 'Tipe', 'Tanggal', 'Jumlah', 'Pembayaran', 'Total', 'Status'].map((label) => (
                                        <th key={label} className="px-5 py-3.5 text-left text-xs font-black uppercase tracking-wider text-slate-500">{label}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {allBookings.map((booking) => {
                                    const service = getRelation(booking.service);
                                    const provider = service ? getRelation(service.provider) : null;
                                    const status = STATUS_CONFIG[booking.status] ?? STATUS_CONFIG.pending;
                                    return (
                                        <tr key={booking.id} className="transition-colors hover:bg-slate-50">
                                            <td className="max-w-52 truncate px-5 py-4 font-bold text-slate-900">{service?.name ?? "-"}</td>
                                            <td className="px-5 py-4 text-slate-600">{provider?.name ?? "-"}</td>
                                            <td className="px-5 py-4 text-xs font-bold text-slate-600">{service?.type ? getServiceTypeLabel(service.type) : "-"}</td>
                                            <td className="px-5 py-4 text-slate-600">{formatDateId(booking.booking_date)}</td>
                                            <td className="px-5 py-4 text-center text-slate-600">{booking.total_participants}</td>
                                            <td className="px-5 py-4 text-xs font-bold text-slate-600">{paymentStatusLabels[booking.payment_status as keyof typeof paymentStatusLabels] ?? booking.payment_status ?? "-"}</td>
                                            <td className="px-5 py-4 font-bold text-slate-700">{formatRupiah(booking.total_price)}</td>
                                            <td className="px-5 py-4">
                                                <span className={`inline-flex rounded-lg px-2.5 py-1 text-[11px] font-black ${status.bg} ${status.text}`}>{status.label}</span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </main>
    );
}
