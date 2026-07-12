import Link from "next/link";
import {
    ShieldCheck,
    Ship,
    ClipboardList,
    UserCog,
    Anchor,
    Clock,
    TrendingUp,
    Users,
    CheckCircle2,
    ShieldAlert,
} from "lucide-react";
import { getAdminContext } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function AdminHubPage() {
    const { adminDb, adminName } = await getAdminContext();

    // ─── Auth & Role Check ────────────────────────────────────────
    // ─── Global Stats ─────────────────────────────────────────────
    const [
        { count: pendingProviders },
        { count: verifiedProviders },
        { count: rejectedProviders },
        { count: pendingOrders },
        { count: totalOrders },
        { count: totalServices },
    ] = await Promise.all([
        adminDb.from("providers").select("id", { count: "exact", head: true }).eq("verification_status", "pending"),
        adminDb.from("providers").select("id", { count: "exact", head: true }).eq("verification_status", "verified"),
        adminDb.from("providers").select("id", { count: "exact", head: true }).eq("verification_status", "rejected"),
        adminDb.from("bookings").select("id", { count: "exact", head: true }).eq("status", "pending"),
        adminDb.from("bookings").select("id", { count: "exact", head: true }),
        adminDb.from("services").select("id", { count: "exact", head: true }),
    ]);

    const navItems = [
        {
            href: "/admin/verifikasi",
            label: "Verifikasi Mitra",
            desc: "Tinjau KTP & dokumen provider baru",
            icon: UserCog,
            badge: pendingProviders ?? 0,
            badgeColor: "bg-amber-100 text-amber-700",
            iconColor: "text-amber-600",
            iconBg: "bg-amber-50",
            border: "border-amber-100 hover:border-amber-300",
        },
        {
            href: "/admin/services",
            label: "Master Layanan",
            desc: "Kelola seluruh paket & layanan platform",
            icon: Ship,
            badge: totalServices ?? 0,
            badgeColor: "bg-blue-100 text-blue-700",
            iconColor: "text-[#023E8A]",
            iconBg: "bg-blue-50",
            border: "border-blue-100 hover:border-[#023E8A]",
        },
        {
            href: "/admin/orders",
            label: "Semua Pesanan",
            desc: "Pantau transaksi dan status booking global",
            icon: ClipboardList,
            badge: pendingOrders ?? 0,
            badgeColor: "bg-rose-100 text-rose-700",
            iconColor: "text-rose-600",
            iconBg: "bg-rose-50",
            border: "border-rose-100 hover:border-rose-300",
        },
    ];

    return (
        <main className="mx-auto w-full max-w-6xl space-y-10 px-4 py-10 sm:px-6 lg:px-8">
                {/* Page Title */}
                <div>
                    <h1 className="text-3xl font-black text-[#023E8A] flex items-center gap-3">
                        <Anchor className="w-8 h-8 text-[#0077B6]" />
                        Pusat Kontrol Admin
                    </h1>
                    <p className="text-slate-500 mt-1 text-sm">
                        Selamat datang kembali, <span className="font-semibold text-slate-700">{adminName}</span>. Pilih panel yang ingin dikelola.
                    </p>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-4">
                    {[
                        { label: "Menunggu Verifikasi", value: pendingProviders ?? 0, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
                        { label: "Provider Terverifikasi", value: verifiedProviders ?? 0, icon: ShieldCheck, color: "text-emerald-600", bg: "bg-emerald-50" },
                        { label: "Provider Ditolak", value: rejectedProviders ?? 0, icon: ShieldAlert, color: "text-red-500", bg: "bg-red-50" },
                        { label: "Pesanan Pending", value: pendingOrders ?? 0, icon: ClipboardList, color: "text-rose-600", bg: "bg-rose-50" },
                        { label: "Total Pesanan", value: totalOrders ?? 0, icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50" },
                        { label: "Total Layanan", value: totalServices ?? 0, icon: Ship, color: "text-[#023E8A]", bg: "bg-blue-50" },
                    ].map((stat) => (
                        <div key={stat.label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 sm:p-4 flex flex-col gap-1.5 sm:gap-2 min-w-0">
                            <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl ${stat.bg} flex items-center justify-center shrink-0`}>
                                <stat.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${stat.color}`} />
                            </div>
                            <p className="text-xl sm:text-2xl font-black text-slate-900">{stat.value}</p>
                            <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight truncate">{stat.label}</p>
                        </div>
                    ))}
                </div>

                {/* Menu Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`group bg-white rounded-2xl shadow-sm border-2 p-6 hover:shadow-lg transition-all cursor-pointer ${item.border}`}
                        >
                            <div className="flex items-start justify-between mb-5">
                                <div className={`w-14 h-14 rounded-2xl ${item.iconBg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                    <item.icon className={`w-7 h-7 ${item.iconColor}`} />
                                </div>
                                {(item.badge > 0) && (
                                    <span className={`text-xs font-black px-2.5 py-1 rounded-full ${item.badgeColor}`}>
                                        {item.badge}
                                    </span>
                                )}
                            </div>
                            <h2 className="text-lg font-black text-slate-900 group-hover:text-[#023E8A] transition-colors">
                                {item.label}
                            </h2>
                            <p className="text-sm text-slate-500 mt-1">{item.desc}</p>
                            <div className="mt-5 flex items-center gap-1.5 text-xs font-bold text-[#023E8A] opacity-0 group-hover:opacity-100 transition-opacity">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Buka Panel →
                            </div>
                        </Link>
                    ))}
                </div>
        </main>
    );
}
