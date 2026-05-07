import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { signOut } from "@/app/auth/actions";
import {
    Ship,
    ShieldCheck,
    LogOut,
    Anchor,
    Package,
    CheckCircle2,
    XCircle,
    ArrowLeft,
    PlusCircle,
} from "lucide-react";
import DeleteServiceButton from "@/components/DeleteServiceButton";

export const dynamic = "force-dynamic";

export default async function AdminServicesPage({
    searchParams,
}: {
    searchParams?: { message?: string; error?: string };
}) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/auth/login");

    const { data: userRecord } = await supabase.from("users").select("role, name").eq("id", user.id).single();
    if (userRecord?.role !== "admin" && user.user_metadata?.role !== "admin") redirect("/dashboard");

    const adminName = userRecord?.name || user.user_metadata?.name || user.email?.split("@")[0] || "Admin";

    // Fetch all services with provider info
    const { data: services, error } = await supabase
        .from("services")
        .select(`
            id, name, type, price, is_available, created_at,
            provider_id
        `)
        .order("created_at", { ascending: false });

    const allServices = services || [];
    const activeCount = allServices.filter((s) => s.is_available).length;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col overflow-x-hidden">
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
                                Master Layanan
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
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/admin" className="p-2 rounded-xl text-slate-400 hover:text-[#023E8A] hover:bg-blue-50 transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-black text-[#023E8A] flex items-center gap-2">
                                <Ship className="w-6 h-6 text-[#0077B6]" />
                                Master Layanan Platform
                            </h1>
                            <p className="text-sm text-slate-500 mt-0.5">
                                {allServices.length} layanan terdaftar &bull; {activeCount} aktif
                            </p>
                        </div>
                    </div>
                    <Link
                        href="/dashboard/provider/services/new"
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[#023E8A] to-[#0077B6] hover:opacity-90 transition-opacity"
                    >
                        <PlusCircle className="w-4 h-4" />
                        Tambah Layanan
                    </Link>
                </div>

                {searchParams?.message && (
                    <div className="bg-green-50 border border-green-200 rounded-2xl p-5 flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                        <p className="text-sm text-green-800 font-semibold">{searchParams.message}</p>
                    </div>
                )}

                {searchParams?.error && (
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start gap-3">
                        <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        <p className="text-sm text-red-800 font-semibold">{searchParams.error}</p>
                    </div>
                )}

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-2 sm:gap-4">
                    {[
                        { label: "Total Layanan", value: allServices.length, icon: Package, color: "text-[#023E8A]", bg: "bg-blue-50" },
                        { label: "Layanan Aktif", value: activeCount, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
                        { label: "Layanan Nonaktif", value: allServices.length - activeCount, icon: XCircle, color: "text-red-500", bg: "bg-red-50" },
                    ].map((s) => (
                        <div key={s.label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 sm:p-5 flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-center sm:text-left min-w-0">
                            <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                                <s.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${s.color}`} />
                            </div>
                            <div className="min-w-0 w-full">
                                <p className="text-xl sm:text-2xl font-black text-slate-900">{s.value}</p>
                                <p className="text-[10px] sm:text-xs font-bold text-slate-500 truncate">{s.label}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Services Table */}
                {error ? (
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
                        <XCircle className="w-10 h-10 text-red-400 mx-auto mb-2" />
                        <p className="text-sm font-bold text-red-700">Gagal memuat data layanan.</p>
                        <p className="text-xs text-red-500 mt-1">{error.message}</p>
                    </div>
                ) : allServices.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                        <Ship className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                        <p className="font-bold text-slate-500">Belum ada layanan yang terdaftar</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-100 bg-slate-50">
                                        <th className="text-left px-5 py-3.5 text-xs font-black text-slate-500 uppercase tracking-wider">Nama Layanan</th>
                                        <th className="text-left px-5 py-3.5 text-xs font-black text-slate-500 uppercase tracking-wider">Tipe</th>
                                        <th className="text-left px-5 py-3.5 text-xs font-black text-slate-500 uppercase tracking-wider">Harga</th>
                                        <th className="text-left px-5 py-3.5 text-xs font-black text-slate-500 uppercase tracking-wider">Status</th>
                                        <th className="text-left px-5 py-3.5 text-xs font-black text-slate-500 uppercase tracking-wider">Terdaftar</th>
                                        <th className="text-right px-5 py-3.5 text-xs font-black text-slate-500 uppercase tracking-wider">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {allServices.map((service) => (
                                        <tr key={service.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-5 py-4">
                                                <Link
                                                    href={`/services/${service.id}`}
                                                    className="font-bold text-slate-900 hover:text-[#023E8A] hover:underline transition-colors"
                                                >
                                                    {service.name}
                                                </Link>
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider ${
                                                    service.type === "boat"
                                                        ? "bg-blue-100 text-blue-800"
                                                        : service.type === "gear"
                                                        ? "bg-amber-100 text-amber-800"
                                                        : "bg-emerald-100 text-emerald-800"
                                                }`}>
                                                    {service.type === "boat" ? "⛵ Kapal" : service.type === "gear" ? "🤿 Alat" : "🎓 Instruktur"}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 font-bold text-slate-700">
                                                Rp {Number(service.price).toLocaleString("id-ID")}
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-black ${
                                                    service.is_available
                                                        ? "bg-emerald-100 text-emerald-700"
                                                        : "bg-slate-100 text-slate-500"
                                                }`}>
                                                    {service.is_available ? "✅ Aktif" : "⏸ Nonaktif"}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-xs text-slate-400">
                                                {new Date(service.created_at).toLocaleDateString("id-ID", {
                                                    day: "numeric",
                                                    month: "short",
                                                    year: "numeric",
                                                })}
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex justify-end">
                                                    <DeleteServiceButton
                                                        serviceId={service.id}
                                                        serviceName={service.name}
                                                        redirectTo="/admin/services"
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
