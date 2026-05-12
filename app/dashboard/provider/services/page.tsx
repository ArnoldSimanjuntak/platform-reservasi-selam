// force-dynamic: status verifikasi provider harus selalu fresh dari DB.
export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Ship, Wrench, Users, Package, Plus, ArrowLeft, CheckCircle2, XCircle, DollarSign, Pencil } from "lucide-react";
import DeleteServiceButton from "@/components/DeleteServiceButton";

export default async function ProviderServicesPage({
    searchParams,
}: {
    searchParams?: { message?: string; error?: string };
}) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/auth/login");
    }

    // â”€â”€â”€ Ambil role user (dari DB, bukan hanya metadata) â”€â”€â”€â”€â”€â”€
    const { data: userRecord } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

    const role = userRecord?.role ?? user.user_metadata?.role;
    if (role === "admin") {
        redirect("/admin/services");
    }

    if (role !== "provider") {
        redirect("/dashboard");
    }

    const { data: provider } = await supabase
        .from("providers")
        .select("id, name, verification_status, is_active")
        .eq("owner_user_id", user.id)
        .single();

    if (!provider) {
        redirect("/dashboard/provider/setup");
    }

    if (provider.verification_status !== "verified" || !provider.is_active) {
        redirect("/dashboard/provider/setup?notice=Akun+Anda+belum+terverifikasi+untuk+mengelola+layanan.");
    }

    const { data: services, error } = await supabase
        .from("services")
        .select("*")
        .eq("provider_id", provider.id)
        .order("created_at", { ascending: false });

    const typeConfig: Record<string, { label: string; icon: React.ElementType; bg: string; text: string }> = {
        boat: { label: "Kapal", icon: Ship, bg: "bg-blue-50", text: "text-blue-700" },
        diving: { label: "Paket Selam", icon: Ship, bg: "bg-blue-50", text: "text-blue-700" },
        instructor: { label: "Instruktur", icon: Users, bg: "bg-emerald-50", text: "text-emerald-700" },
        gear: { label: "Peralatan", icon: Wrench, bg: "bg-amber-50", text: "text-amber-700" },
    };

    return (
        <div className="min-h-screen pt-24 pb-12 px-4" style={{ background: "linear-gradient(180deg, #f0f7ff 0%, #f9fafb 40%)" }}>
            <div className="container mx-auto max-w-2xl">
                {/* Header */}
                <div className="mb-8">
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary transition-colors mb-3"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Kembali ke Dashboard
                    </Link>
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">Manajemen Layanan</h1>
                            <p className="text-sm text-slate-500 mt-1 font-medium">
                                {provider.name} - {services?.length || 0} layanan terdaftar
                            </p>
                        </div>
                        <Link
                            href="/dashboard/provider/services/new"
                            className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white transition-all hover:shadow-lg active:scale-[0.98] shrink-0"
                            style={{ background: "linear-gradient(135deg, #023E8A, #0077B6)" }}
                        >
                            <Plus className="w-4 h-4" />
                            Tambah Layanan
                        </Link>
                    </div>
                </div>

                {/* Error State */}
                {searchParams?.message && (
                    <div className="bg-green-50 border border-green-200 rounded-2xl p-5 mb-6 flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                        <p className="text-sm text-green-800 font-semibold">{searchParams.message}</p>
                    </div>
                )}

                {searchParams?.error && (
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-5 mb-6 flex items-start gap-3">
                        <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        <p className="text-sm text-red-800 font-semibold">{searchParams.error}</p>
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-5 mb-6 flex items-start gap-3">
                        <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        <p className="text-sm text-red-800 font-semibold">Gagal memuat layanan: {error.message}</p>
                    </div>
                )}

                {/* Empty State */}
                {(!services || services.length === 0) && !error && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                        <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-5">
                            <Package className="w-10 h-10 text-blue-200" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">Belum Ada Layanan</h3>
                        <p className="text-sm text-slate-500 max-w-xs mx-auto mb-6 leading-relaxed">
                            Tambahkan kapal, jasa instruktur, atau peralatan selam Anda agar wisatawan dapat menemukan dan memesan layanan Anda.
                        </p>
                        <Link
                            href="/dashboard/provider/services/new"
                            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-bold text-white transition-all hover:shadow-lg active:scale-[0.98]"
                            style={{ background: "linear-gradient(135deg, #023E8A, #0077B6)" }}
                        >
                            <Plus className="w-4 h-4" />
                            Tambah Layanan Pertama
                        </Link>
                    </div>
                )}

                {/* Services List â€” Mobile-First Card Stack */}
                {services && services.length > 0 && (
                    <div className="space-y-4">
                        {services.map((service: any) => {
                            const config = typeConfig[service.type] || typeConfig.boat;
                            const TypeIcon = config.icon;
                            return (
                                <div
                                    key={service.id}
                                    className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow active:bg-gray-50"
                                >
                                    {/* Top Row: Icon + Name + Status */}
                                    <div className="flex items-start justify-between gap-3 mb-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={`w-11 h-11 rounded-xl ${config.bg} flex items-center justify-center shrink-0`}>
                                                <TypeIcon className={`w-5 h-5 ${config.text}`} />
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="text-base font-bold text-slate-900 truncate">{service.name}</h3>
                                                <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${config.bg} ${config.text}`}>
                                                    {config.label}
                                                </span>
                                            </div>
                                        </div>
                                        {service.is_available ? (
                                            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200 shrink-0">
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                Aktif
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-600 border border-red-200 shrink-0">
                                                <XCircle className="w-3.5 h-3.5" />
                                                Nonaktif
                                            </span>
                                        )}
                                    </div>

                                    {/* Description */}
                                    <p className="text-sm text-slate-600 line-clamp-2 mb-3">
                                        {service.description || "Tidak ada deskripsi layanan."}
                                    </p>

                                    {/* Info Row */}
                                    <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                                        <div className="flex items-center gap-4">
                                            <span className="flex items-center gap-1 text-sm font-bold text-slate-900">
                                                <DollarSign className="w-4 h-4 text-slate-400" />
                                                Rp {Number(service.price).toLocaleString("id-ID")}
                                            </span>
                                            <span className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                                                <Users className="w-3.5 h-3.5" />
                                                Maks. {service.max_capacity} orang
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Link
                                                href={`/dashboard/provider/services/${service.id}/edit`}
                                                className="p-2 rounded-lg text-slate-400 hover:text-primary hover:bg-blue-50 transition-colors"
                                                title="Edit layanan"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </Link>
                                            <DeleteServiceButton
                                                serviceId={service.id}
                                                serviceName={service.name}
                                                redirectTo="/dashboard/provider/services"
                                                compact
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

