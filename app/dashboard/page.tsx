import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Calendar, Anchor, LogOut, Package, ClipboardList, Ship, MapPin, UserCog, TrendingUp, Bell, Waves, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { signOut } from "@/app/auth/actions";
import ProviderOrderFeed from "@/components/ProviderOrderFeed";

export default async function DashboardPage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/auth/login");
    }

    // ─── 1. Ambil data terbaru dari tabel users (bukan metadata) ──
    const { data: userRecord } = await supabase
        .from("users")
        .select("name, role")
        .eq("id", user.id)
        .single();

    const userName = userRecord?.name || user.user_metadata?.name || user.email?.split("@")[0] || "User";
    const userRole = userRecord?.role || user.user_metadata?.role || "customer";
    const userEmail = user.email || "";
    const joinDate = new Date(user.created_at).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });

    // ─── 2. Cek profil provider di tabel providers ────────────
    const { data: providerProfile } = await supabase
        .from("providers")
        .select("id, name, is_active")
        .eq("owner_user_id", user.id)
        .single();

    // ─── 3. Logika routing berdasarkan role + profil ──────────
    if (userRole === "provider") {
        if (!providerProfile || !providerProfile.is_active) {
            redirect("/dashboard/provider/setup");
        }

        // ─── 4. Ambil stats real dari DB ──────────────────────
        const { count: pendingOrderCount } = await supabase
            .from("bookings")
            .select("id", { count: "exact", head: true })
            .eq("provider_id", providerProfile.id)
            .eq("status", "pending");

        const { count: totalOrderCount } = await supabase
            .from("bookings")
            .select("id", { count: "exact", head: true })
            .eq("provider_id", providerProfile.id);

        const { count: activeServiceCount } = await supabase
            .from("services")
            .select("id", { count: "exact", head: true })
            .eq("provider_id", providerProfile.id)
            .eq("is_available", true);

        const { count: totalServiceCount } = await supabase
            .from("services")
            .select("id", { count: "exact", head: true })
            .eq("provider_id", providerProfile.id);

        return (
            <ProviderDashboardView
                provider={providerProfile}
                userName={userName}
                userEmail={userEmail}
                joinDate={joinDate}
                stats={{
                    pendingOrders: pendingOrderCount || 0,
                    totalOrders: totalOrderCount || 0,
                    activeServices: activeServiceCount || 0,
                    totalServices: totalServiceCount || 0,
                }}
            />
        );
    }

    // ─── Auto-Complete Logic ───────────────────────────────────
    const todayStr = new Date().toISOString().split("T")[0];
    await supabase
        .from("bookings")
        .update({ status: "completed" })
        .eq("user_id", user.id)
        .eq("status", "in_progress")
        .lt("booking_date", todayStr);

    // ─── Customer: Fetch booking stats ─────────────────────────
    const { count: totalBookings } = await supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .neq("status", "cancelled");

    const { count: upcomingBookings } = await supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .in("status", ["pending", "confirmed"]);

    const { count: completedBookings } = await supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "completed");

    const { count: inProgressBookings } = await supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "in_progress");

    return (
        <CustomerDashboardView
            userName={userName}
            userEmail={userEmail}
            joinDate={joinDate}
            stats={{
                total: totalBookings || 0,
                upcoming: upcomingBookings || 0,
                completed: completedBookings || 0,
                inProgress: inProgressBookings || 0,
            }}
        />
    );
}

// ═══════════════════════════════════════════════════════════════
// PROVIDER DASHBOARD VIEW
// ═══════════════════════════════════════════════════════════════
interface ProviderStats {
    pendingOrders: number;
    totalOrders: number;
    activeServices: number;
    totalServices: number;
}

function ProviderDashboardView({
    provider,
    userName,
    userEmail,
    joinDate,
    stats,
}: {
    provider: any;
    userName: string;
    userEmail: string;
    joinDate: string;
    stats: ProviderStats;
}) {
    return (
        <div className="min-h-screen pt-24 pb-12 px-4" style={{ background: "linear-gradient(180deg, #f0f7ff 0%, #f9fafb 40%)" }}>
            <div className="container mx-auto max-w-4xl">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-3xl font-bold text-slate-900">Dashboard Provider</h1>
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-primary text-white tracking-wide">PROVIDER</span>
                    </div>
                    <p className="text-slate-500 mt-1">
                        Selamat datang kembali, <span className="font-semibold text-slate-700">{provider.name}</span>!
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* ─── Profile Card ─── */}
                    <div className="md:col-span-1">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div
                                className="h-28 relative"
                                style={{ background: "linear-gradient(135deg, #03045E 0%, #023E8A 50%, #0077B6 100%)" }}
                            >
                                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
                                    <div className="w-20 h-20 rounded-full bg-white shadow-lg flex items-center justify-center ring-4 ring-white">
                                        <div className="w-[72px] h-[72px] rounded-full bg-gradient-to-br from-deepSea to-primary flex items-center justify-center text-white text-2xl font-bold">
                                            {provider.name.charAt(0).toUpperCase()}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-14 pb-6 px-6 text-center">
                                <h2 className="text-lg font-bold text-slate-900">{provider.name}</h2>
                                <p className="text-sm text-slate-500 mt-1">{userEmail}</p>

                                <div className="flex items-center justify-center gap-2 mt-3 text-xs text-slate-400">
                                    <Calendar className="w-3.5 h-3.5" />
                                    Bergabung {joinDate}
                                </div>

                                {/* Quick Nav */}
                                <div className="mt-5 space-y-2">
                                    <Link
                                        href="/dashboard/provider/services"
                                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-800 bg-blue-50 hover:bg-blue-100 transition-colors"
                                    >
                                        <Ship className="w-4 h-4 text-primary" />
                                        Manajemen Kapal
                                    </Link>
                                    <Link
                                        href="/dashboard/provider/orders"
                                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-800 bg-blue-50 hover:bg-blue-100 transition-colors"
                                    >
                                        <ClipboardList className="w-4 h-4 text-primary" />
                                        Daftar Pesanan
                                    </Link>
                                    <Link
                                        href="/dashboard/provider/setup"
                                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-800 bg-blue-50 hover:bg-blue-100 transition-colors"
                                    >
                                        <UserCog className="w-4 h-4 text-primary" />
                                        Profil Bisnis
                                    </Link>
                                </div>

                                <form action={signOut} className="mt-4">
                                    <button
                                        type="submit"
                                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        Keluar
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>

                    {/* ─── Main Content ─── */}
                    <div className="md:col-span-2 space-y-6">
                        {/* Stats Cards — real data from DB */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
                                    <Bell className="w-6 h-6 text-amber-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-slate-900">{stats.pendingOrders}</p>
                                    <p className="text-xs text-slate-500 font-medium">Pesanan Baru</p>
                                </div>
                            </div>
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                                    <ClipboardList className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-slate-900">{stats.totalOrders}</p>
                                    <p className="text-xs text-slate-500 font-medium">Total Pesanan</p>
                                </div>
                            </div>
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
                                    <Package className="w-6 h-6 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-slate-900">{stats.activeServices}</p>
                                    <p className="text-xs text-slate-500 font-medium">Layanan Aktif</p>
                                </div>
                            </div>
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                                    <TrendingUp className="w-6 h-6 text-[#023E8A]" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-slate-900">{stats.totalServices}</p>
                                    <p className="text-xs text-slate-500 font-medium">Total Layanan</p>
                                </div>
                            </div>
                        </div>

                        {/* Recent Bookings Live Feed */}
                        <ProviderOrderFeed providerId={provider.id} />

                        {/* Services Quick View */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold text-slate-900">
                                    Layanan & Armada
                                </h3>
                                <Link href="/dashboard/provider/services" className="text-sm text-primary hover:underline font-medium">
                                    Kelola Layanan →
                                </Link>
                            </div>
                            {stats.totalServices === 0 ? (
                                <div className="text-center py-6">
                                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                                        <Package className="w-6 h-6 text-gray-300" />
                                    </div>
                                    <p className="text-slate-400 text-sm">Belum ada layanan yang ditambahkan.</p>
                                    <Link
                                        href="/dashboard/provider/services/new"
                                        className="inline-block mt-3 text-sm text-primary font-medium hover:underline"
                                    >
                                        + Tambah Layanan Pertama
                                    </Link>
                                </div>
                            ) : (
                                <div className="text-center py-4">
                                    <p className="text-slate-600 text-sm">
                                        <span className="font-bold text-slate-900">{stats.activeServices}</span> layanan aktif dari <span className="font-bold text-slate-900">{stats.totalServices}</span> total terdaftar.
                                    </p>
                                    <Link
                                        href="/dashboard/provider/services"
                                        className="inline-flex items-center gap-2 mt-3 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:shadow-lg"
                                        style={{ background: "linear-gradient(135deg, #023E8A, #0077B6)" }}
                                    >
                                        <Ship className="w-4 h-4" />
                                        Kelola Semua Layanan
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// CUSTOMER DASHBOARD VIEW
// ═══════════════════════════════════════════════════════════════
interface CustomerStats {
    total: number;
    upcoming: number;
    completed: number;
    inProgress: number;
}

function CustomerDashboardView({
    userName,
    userEmail,
    joinDate,
    stats,
}: {
    userName: string;
    userEmail: string;
    joinDate: string;
    stats: CustomerStats;
}) {
    return (
        <div className="min-h-screen pt-24 pb-12 px-4" style={{ background: "linear-gradient(180deg, #f0f7ff 0%, #f9fafb 40%)" }}>
            <div className="container mx-auto max-w-4xl">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
                    <p className="text-slate-500 mt-1">
                        Selamat datang kembali, <span className="font-semibold text-slate-700">{userName}</span>!
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Profile Card */}
                    <div className="md:col-span-1">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div
                                className="h-24 relative"
                                style={{ background: "linear-gradient(135deg, #023E8A 0%, #0077B6 100%)" }}
                            >
                                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
                                    <div className="w-20 h-20 rounded-full bg-white shadow-lg flex items-center justify-center">
                                        <div className="w-[72px] h-[72px] rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-2xl font-bold">
                                            {userName.charAt(0).toUpperCase()}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-14 pb-6 px-6 text-center">
                                <h2 className="text-lg font-bold text-slate-900">{userName}</h2>
                                <p className="text-sm text-slate-500 mt-1">{userEmail}</p>

                                <div className="flex items-center justify-center gap-2 mt-3 text-xs text-slate-400">
                                    <Calendar className="w-3.5 h-3.5" />
                                    Bergabung {joinDate}
                                </div>

                                <form action={signOut} className="mt-6">
                                    <button
                                        type="submit"
                                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        Keluar
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="md:col-span-2 space-y-6">
                        {/* ─── My Trip Stats ────────────────────────── */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 text-center">
                                <div className="w-10 h-10 mx-auto rounded-xl bg-amber-50 flex items-center justify-center mb-2">
                                    <Calendar className="w-5 h-5 text-amber-600" />
                                </div>
                                <p className="text-2xl font-bold text-slate-900">{stats.upcoming}</p>
                                <p className="text-xs text-slate-500 font-medium mt-0.5">Akan Datang</p>
                            </div>
                            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 text-center">
                                <div className="w-10 h-10 mx-auto rounded-xl bg-emerald-50 flex items-center justify-center mb-2">
                                    <Waves className="w-5 h-5 text-emerald-600" />
                                </div>
                                <p className="text-2xl font-bold text-slate-900">{stats.inProgress}</p>
                                <p className="text-xs text-slate-500 font-medium mt-0.5">Berlangsung</p>
                            </div>
                            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 text-center">
                                <div className="w-10 h-10 mx-auto rounded-xl bg-blue-50 flex items-center justify-center mb-2">
                                    <CheckCircle2 className="w-5 h-5 text-blue-600" />
                                </div>
                                <p className="text-2xl font-bold text-slate-900">{stats.completed}</p>
                                <p className="text-xs text-slate-500 font-medium mt-0.5">Selesai</p>
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <h3 className="text-lg font-semibold text-slate-900 mb-4">
                                Menu Cepat
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <Link
                                    href="/services"
                                    className="flex items-center gap-3 p-4 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors group"
                                >
                                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Anchor className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900">Paket Selam</p>
                                        <p className="text-xs text-slate-500">Jelajahi layanan</p>
                                    </div>
                                </Link>

                                <Link
                                    href="/lokasi"
                                    className="flex items-center gap-3 p-4 rounded-xl bg-cyan-50 hover:bg-cyan-100 transition-colors group"
                                >
                                    <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <MapPin className="w-5 h-5 text-secondary" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900">Peta Lokasi</p>
                                        <p className="text-xs text-slate-500">Lihat dive sites</p>
                                    </div>
                                </Link>
                            </div>
                        </div>

                        {/* Bookings Summary */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold text-slate-900">
                                    Booking Saya
                                </h3>
                                {stats.total > 0 && (
                                    <span className="text-xs font-bold text-slate-500">
                                        {stats.total} total
                                    </span>
                                )}
                            </div>

                            {stats.total === 0 ? (
                                <div className="text-center py-8">
                                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                                        <Calendar className="w-8 h-8 text-gray-300" />
                                    </div>
                                    <p className="text-slate-500 text-sm font-medium">
                                        Belum ada perjalanan selam. Mulai petualanganmu!
                                    </p>
                                    <Link
                                        href="/services"
                                        className="inline-block mt-4 px-6 py-2.5 rounded-full text-sm font-semibold text-white transition-all hover:shadow-lg"
                                        style={{ background: "linear-gradient(135deg, #023E8A, #0077B6)" }}
                                    >
                                        Cari Paket Selam
                                    </Link>
                                </div>
                            ) : (
                                <div>
                                    <p className="text-sm text-slate-600 mb-4">
                                        Kamu memiliki <span className="font-bold text-slate-900">{stats.upcoming}</span> perjalanan yang akan datang
                                        {stats.inProgress > 0 && (
                                            <> dan <span className="font-bold text-emerald-700">{stats.inProgress}</span> yang sedang berlangsung</>
                                        )}.
                                    </p>
                                    <Link
                                        href="/dashboard/bookings"
                                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:shadow-lg"
                                        style={{ background: "linear-gradient(135deg, #023E8A, #0077B6)" }}
                                    >
                                        <ClipboardList className="w-4 h-4" />
                                        Lihat Semua Perjalanan
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

