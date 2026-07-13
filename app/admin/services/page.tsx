import Link from "next/link";
import { ArrowLeft, CheckCircle2, Eye, Package, Ship, XCircle } from "lucide-react";
import { getAdminContext } from "@/lib/supabase/admin";
import { getServiceTypeLabel } from "@/lib/service-types";
import { formatDateId, formatRupiah } from "@/lib/formatters";

export const dynamic = "force-dynamic";

function getProviderName(provider: unknown) {
    if (Array.isArray(provider)) return provider[0]?.name ?? "-";
    if (provider && typeof provider === "object" && "name" in provider) {
        return String((provider as { name?: string }).name ?? "-");
    }
    return "-";
}

export default async function AdminServicesPage() {
    const { adminDb } = await getAdminContext();
    const { data: services, error } = await adminDb
        .from("services")
        .select(`
            id, name, type, price, is_available, created_at,
            provider_id,
            provider:providers ( name )
        `)
        .order("created_at", { ascending: false });

    const allServices = services ?? [];
    const activeCount = allServices.filter((service) => service.is_available).length;

    return (
        <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
                <Link href="/admin" className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-blue-50 hover:text-[#023E8A]">
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <div>
                    <h1 className="flex items-center gap-2 text-2xl font-black text-[#023E8A]">
                        <Ship className="h-6 w-6 text-[#0077B6]" />
                        Monitor Layanan Platform
                    </h1>
                    <p className="mt-0.5 text-sm text-slate-500">
                        {allServices.length} layanan terdaftar &bull; {activeCount} aktif
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                        Admin memantau seluruh layanan. Pembuatan dan perubahan layanan dilakukan oleh provider pemiliknya.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-4">
                {[
                    { label: "Total Layanan", value: allServices.length, icon: Package, color: "text-[#023E8A]", bg: "bg-blue-50" },
                    { label: "Layanan Aktif", value: activeCount, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
                    { label: "Layanan Nonaktif", value: allServices.length - activeCount, icon: XCircle, color: "text-red-500", bg: "bg-red-50" },
                ].map((stat) => (
                    <div key={stat.label} className="flex min-w-0 flex-col items-center gap-2 rounded-2xl border border-gray-100 bg-white p-3 text-center shadow-sm sm:flex-row sm:gap-4 sm:p-5 sm:text-left">
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-11 sm:w-11 ${stat.bg}`}>
                            <stat.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${stat.color}`} />
                        </div>
                        <div className="min-w-0 w-full">
                            <p className="text-xl font-black text-slate-900 sm:text-2xl">{stat.value}</p>
                            <p className="truncate text-[10px] font-bold text-slate-500 sm:text-xs">{stat.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
                    <XCircle className="mx-auto mb-2 h-10 w-10 text-red-400" />
                    <p className="text-sm font-bold text-red-700">Gagal memuat data layanan.</p>
                    <p className="mt-1 text-xs text-red-500">{error.message}</p>
                </div>
            ) : allServices.length === 0 ? (
                <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center shadow-sm">
                    <Ship className="mx-auto mb-3 h-12 w-12 text-slate-200" />
                    <p className="font-bold text-slate-500">Belum ada layanan yang terdaftar</p>
                </div>
            ) : (
                <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 bg-slate-50">
                                    {['Nama Layanan', 'Provider', 'Tipe', 'Harga', 'Status', 'Terdaftar', 'Detail'].map((label) => (
                                        <th key={label} className={`${label === 'Detail' ? 'text-right' : 'text-left'} px-5 py-3.5 text-xs font-black uppercase tracking-wider text-slate-500`}>
                                            {label}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {allServices.map((service) => (
                                    <tr key={service.id} className="transition-colors hover:bg-slate-50">
                                        <td className="px-5 py-4 font-bold text-slate-900">{service.name}</td>
                                        <td className="px-5 py-4 text-slate-600">{getProviderName(service.provider)}</td>
                                        <td className="px-5 py-4">
                                            <span className={`inline-flex rounded-lg px-2.5 py-1 text-[11px] font-black uppercase tracking-wider ${
                                                service.type === "boat" ? "bg-blue-100 text-blue-800" : service.type === "gear" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                                            }`}>
                                                {getServiceTypeLabel(service.type)}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 font-bold text-slate-700">{formatRupiah(service.price)}</td>
                                        <td className="px-5 py-4">
                                            <span className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-black ${service.is_available ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                                                {service.is_available ? "Aktif" : "Nonaktif"}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 text-xs text-slate-400">{formatDateId(service.created_at)}</td>
                                        <td className="px-5 py-4 text-right">
                                            <Link href={`/services/${service.id}`} className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 font-bold text-[#023E8A] transition-colors hover:bg-blue-100">
                                                <Eye className="h-4 w-4" />
                                                Lihat
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </main>
    );
}
