import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ArrowLeft, ClipboardList, Wifi } from "lucide-react";
import ProviderOrderFeed from "@/components/ProviderOrderFeed";
import { getServiceTypeLabel } from "@/lib/service-types";
import { refreshExpiredBookings } from "@/lib/booking-maintenance";

export default async function ProviderOrdersPage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/auth/login");
    }

    // ─── Ambil provider milik user ini ────────────────────────
    const { data: provider } = await supabase
        .from("providers")
        .select("id, name, primary_type, verification_status, is_active")
        .eq("owner_user_id", user.id)
        .single();

    if (!provider) {
        redirect("/dashboard/provider/setup");
    }

    if (provider.verification_status !== "verified" || provider.is_active !== true) {
        redirect("/dashboard/provider/setup");
    }

    await refreshExpiredBookings();

    return (
        <div className="min-h-screen pt-24 pb-12 px-4" style={{ background: "linear-gradient(180deg, #f0f7ff 0%, #f9fafb 40%)" }}>
            <div className="container mx-auto max-w-4xl">
                {/* Header */}
                <div className="mb-8">
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary transition-colors mb-3"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Kembali ke Dashboard
                    </Link>
                    <div className="flex items-center gap-3">
                        <ClipboardList className="w-7 h-7 text-primary" />
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">Daftar Pesanan</h1>
                            <p className="text-sm text-slate-500 font-medium mt-0.5">
                                {provider.name} - {getServiceTypeLabel(provider.primary_type)}
                            </p>
                        </div>
                    </div>
                    <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                        <Wifi className="w-3.5 h-3.5" />
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        Real-time — Pesanan otomatis muncul di sini
                    </div>
                </div>

                {/* Real-time Order Feed */}
                <ProviderOrderFeed providerId={provider.id} />
            </div>
        </div>
    );
}
