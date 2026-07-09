import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import Link from "next/link";
import { signOut } from "@/app/auth/actions";
import {
    ClipboardList,
    ShieldCheck,
    LogOut,
    Anchor,
    Clock,
    CheckCircle2,
    XCircle,
    ArrowLeft,
    TrendingUp,
    AlertCircle,
} from "lucide-react";
import { getServiceTypeLabel } from "@/lib/service-types";

export const dynamic = "force-dynamic";

function createAdminDbClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceRoleKey) return null;

    return createSupabaseClient(url, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
    pending:     { label: "Menunggu",    bg: "bg-amber-100",   text: "text-amber-700" },
    confirmed:   { label: "Dikonfirmasi", bg: "bg-blue-100",   text: "text-blue-700" },
    in_progress: { label: "Berjalan",    bg: "bg-indigo-100",  text: "text-indigo-700" },
    completed:   { label: "Selesai",     bg: "bg-emerald-100", text: "text-emerald-700" },
    cancelled:   { label: "Dibatalkan",  bg: "bg-red-100",     text: "text-red-700" },
};

export default async function AdminOrdersPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/auth/login");

    const { data: userRecord } = await supabase.from("users").select("role, name").eq("id", user.id).single();
    if (userRecord?.role !== "admin" && user.user_metadata?.role !== "admin") redirect("/dashboard");

    const adminName = userRecord?.name || user.user_metadata?.name || user.email?.split("@")[0] || "Admin";

    const adminDb = createAdminDbClient() ?? supabase;

    // Admin sudah diverifikasi di atas; service-role dipakai server-side agar RLS user/provider
    // tidak menyembunyikan transaksi platform dari panel admin.
    const { data: bookings, error } = await adminDb
        .from("bookings")
        .select(`
            id, status, total_price, booking_date, total_participants, created_at,
            service:services ( name, type )
        `)
        .order("created_at", { ascending: false })
        .limit(200);

    const allBookings = bookings || [];
    const pendingCount = allBookings.filter((b) => b.status === "pending").length;
    const completedCount = allBookings.filter((b) => b.status === "completed").length;
    const totalRevenue = allBookings
        .filter((b) => b.status !== "cancelled")
        .reduce((sum, b) => sum + Number(b.total_price || 0), 0);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Admin Top Bar */}
            <header className="bg-[#023E8A] border-b border-[#0077B6] sticky top-0 z-40">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 justify-between items-center text-white">
                        <div className="flex items-center gap-3">
                            <Link href="/admin" className="flex items-center gap-2 font-black text-xl italic tracking-tighter hover:opacity-80 transition-opacity">
                                <Anchor className="w-5 h-5 text-cyan-400" />
                                SULUT<span className="text-cyan-400">DIVE</span>
                            </Link>
                            <span className="text-sm font-bold opacity-60 not-italic border-l border-white/20 pl-3">
                                Semua Pesanan
                            </span>
                        </div>
                        <div className="flex items-center gap-4">
                            <nav className="hidden md:flex items-center gap-1">
                                {[
                                    { href: "/admin/verifikasi", label: "Verifikasi" },
                                    { href: "/admin/services", label: "Layanan" },
                                    { href: "/admin/orders", label: "Pesanan" },
                                ].map((item) => (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className="px-3 py-1.5 rounded-lg text-sm font-semibold text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                                    >
                                        {item.label}
                                    </Link>
                                ))}
                            </nav>
                            <div className="flex items-center gap-2 text-sm font-bold border-l border-white/20 pl-4">
                                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                                {adminName}
                            </div>
                            <form action={signOut}>
                                <button type="submit" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                                    <LogOut className="w-3.5 h-3.5" />
                                    Keluar
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <Link href="/admin" className="p-2 rounded-xl text-slate-400 hover:text-[#023E8A] hover:bg-blue-50 transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-black text-[#023E8A] flex items-center gap-2">
                            <ClipboardList className="w-6 h-6 text-[#0077B6]" />
                            Semua Pesanan Platform
                        </h1>
                        <p className="text-sm text-slate-500 mt-0.5">
                            {allBookings.length} transaksi tercatat &bull; {pendingCount} menunggu konfirmasi
                        </p>
                    </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: "Menunggu Konfirmasi", value: pendingCount, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
                        { label: "Selesai", value: completedCount, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
                        { label: "Total Transaksi", value: allBookings.length, icon: TrendingUp, color: "text-[#023E8A]", bg: "bg-blue-50" },
                        {
                            label: "Total Revenue",
                            value: `Rp ${totalRevenue.toLocaleString("id-ID")}`,
                            icon: AlertCircle,
                            color: "text-rose-600",
                            bg: "bg-rose-50",
                        },
                    ].map((s) => (
                        <div key={s.label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
                            <div className={`w-11 h-11 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                                <s.icon className={`w-5 h-5 ${s.color}`} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xl font-black text-slate-900 truncate">{s.value}</p>
                                <p className="text-[11px] font-bold text-slate-500 leading-tight">{s.label}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Orders Table */}
                {error ? (
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
                        <XCircle className="w-10 h-10 text-red-400 mx-auto mb-2" />
                        <p className="text-sm font-bold text-red-700">Gagal memuat data pesanan.</p>
                        <p className="text-xs text-red-500 mt-1">{error.message}</p>
                    </div>
                ) : allBookings.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                        <ClipboardList className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                        <p className="font-bold text-slate-500">Belum ada pesanan masuk</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-100 bg-slate-50">
                                        <th className="text-left px-5 py-3.5 text-xs font-black text-slate-500 uppercase tracking-wider">Layanan</th>
                                        <th className="text-left px-5 py-3.5 text-xs font-black text-slate-500 uppercase tracking-wider">Tipe</th>
                                        <th className="text-left px-5 py-3.5 text-xs font-black text-slate-500 uppercase tracking-wider">Tgl Booking</th>
                                        <th className="text-left px-5 py-3.5 text-xs font-black text-slate-500 uppercase tracking-wider">Peserta</th>
                                        <th className="text-left px-5 py-3.5 text-xs font-black text-slate-500 uppercase tracking-wider">Total</th>
                                        <th className="text-left px-5 py-3.5 text-xs font-black text-slate-500 uppercase tracking-wider">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {allBookings.map((booking) => {
                                        const service = (Array.isArray(booking.service) ? booking.service[0] : booking.service) as { name: string; type: string } | null;
                                        const statusCfg = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;
                                        return (
                                            <tr key={booking.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-5 py-4 font-bold text-slate-900 max-w-[200px] truncate">
                                                    {service?.name ?? "-"}
                                                </td>
                                                <td className="px-5 py-4">
                                                    {service?.type && (
                                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-black ${
                                                            service.type === "boat" ? "bg-blue-100 text-blue-800"
                                                            : service.type === "gear" ? "bg-amber-100 text-amber-800"
                                                            : "bg-emerald-100 text-emerald-800"
                                                        }`}>
                                                            {getServiceTypeLabel(service.type)}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-4 text-slate-600">
                                                    {new Date(booking.booking_date).toLocaleDateString("id-ID", {
                                                        day: "numeric",
                                                        month: "short",
                                                        year: "numeric",
                                                    })}
                                                </td>
                                                <td className="px-5 py-4 text-slate-600 text-center">
                                                    {booking.total_participants}
                                                </td>
                                                <td className="px-5 py-4 font-bold text-slate-700">
                                                    Rp {Number(booking.total_price || 0).toLocaleString("id-ID")}
                                                </td>
                                                <td className="px-5 py-4">
                                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-black ${statusCfg.bg} ${statusCfg.text}`}>
                                                        {statusCfg.label}
                                                    </span>
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
        </div>
    );
}
