import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Calendar, Anchor, LogOut, Package, ClipboardList, Ship, MapPin, UserCog, TrendingUp, Bell, Waves, CheckCircle2, Search, ChevronRight, Clock } from "lucide-react";
import Link from "next/link";
import { signOut } from "@/app/auth/actions";
import ProviderOrderFeed from "@/components/ProviderOrderFeed";

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/auth/login");
    }

    // ─── 1. Ambil data terbaru dari tabel users (bukan metadata) ──
    const [{ data: userRecord }, { data: providerProfile }] = await Promise.all([
        supabase
            .from("users")
            .select("name, role")
            .eq("id", user.id)
            .maybeSingle(),
        supabase
            .from("providers")
            .select("id, name, is_active, verification_status")
            .eq("owner_user_id", user.id)
            .maybeSingle(),
    ]);

    const userName = userRecord?.name || user.user_metadata?.name || user.email?.split("@")[0] || "User";
    const userRole = userRecord?.role || user.user_metadata?.role || "customer";
    const userEmail = user.email || "";
    const joinDate = new Date(user.created_at).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });

    // ─── 2. Cek profil provider di tabel providers ────────────
    // Jika akun sudah punya provider profile tapi belum verified,
    // paksa selalu ke halaman setup/verifikasi (meskipun role users belum sinkron).
    if (
        providerProfile &&
        (providerProfile.verification_status !== "verified" || !providerProfile.is_active)
    ) {
        redirect("/dashboard/provider/setup");
    }

    // ─── 3. Logika routing berdasarkan role + profil ──────────
    // Admin: middleware sudah handle redirect ke /admin/verifikasi.
    // Tidak perlu redirect lagi di sini untuk menghindari loop.

    if (userRole === "provider") {
        if (!providerProfile || !providerProfile.is_active) {
            redirect("/dashboard/provider/setup");
        }

        // ─── 4. Ambil stats real dari DB ──────────────────────
        const [
            { count: pendingOrderCount },
            { count: totalOrderCount },
            { count: activeServiceCount },
            { count: totalServiceCount },
        ] = await Promise.all([
            supabase
                .from("bookings")
                .select("id", { count: "exact", head: true })
                .eq("provider_id", providerProfile.id)
                .eq("status", "pending"),
            supabase
                .from("bookings")
                .select("id", { count: "exact", head: true })
                .eq("provider_id", providerProfile.id),
            supabase
                .from("services")
                .select("id", { count: "exact", head: true })
                .eq("provider_id", providerProfile.id)
                .eq("is_available", true),
            supabase
                .from("services")
                .select("id", { count: "exact", head: true })
                .eq("provider_id", providerProfile.id),
        ]);

        return (
            <ProviderDashboardView
                provider={providerProfile}
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

    if (userRole === "admin") {
        // ─── Admin: Ambil global stats dari DB ──────────────────────
        const [
            { count: pendingOrderCount },
            { count: totalOrderCount },
            { count: activeServiceCount },
            { count: totalServiceCount },
        ] = await Promise.all([
            supabase
                .from("bookings")
                .select("id", { count: "exact", head: true })
                .eq("status", "pending"),
            supabase
                .from("bookings")
                .select("id", { count: "exact", head: true }),
            supabase
                .from("services")
                .select("id", { count: "exact", head: true })
                .eq("is_available", true),
            supabase
                .from("services")
                .select("id", { count: "exact", head: true }),
        ]);

        return (
            <AdminDashboardView
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
// ADMIN DASHBOARD VIEW
// ═══════════════════════════════════════════════════════════════
function AdminDashboardView({
    userName,
    userEmail,
    joinDate,
    stats,
}: {
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
                        <h1 className="text-3xl font-bold text-slate-900">Dashboard Admin</h1>
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#023E8A] text-white tracking-wide">ADMIN</span>
                    </div>
                    <p className="text-slate-500 mt-1">
                        Akses penuh kontrol platform SulutDive, <span className="font-semibold text-slate-700">{userName}</span>!
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

                                {/* Quick Nav */}
                                <div className="mt-5 space-y-2">
                                    <Link
                                        href="/admin"
                                        className="flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[#023E8A] to-[#0077B6] hover:shadow-lg hover:from-[#03045E] hover:to-[#023E8A] transition-all"
                                    >
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 className="w-4 h-4" />
                                            Panel Admin
                                        </div>
                                        <span className="bg-white/20 px-2 py-0.5 rounded text-xs">Hub</span>
                                    </Link>
                                    <Link
                                        href="/admin/services"
                                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-800 bg-blue-50 hover:bg-blue-100 hover:text-[#023E8A] transition-colors"
                                    >
                                        <Ship className="w-4 h-4 text-[#023E8A]" />
                                        Master Layanan
                                    </Link>
                                    <Link
                                        href="/admin/orders"
                                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-800 bg-blue-50 hover:bg-blue-100 hover:text-[#023E8A] transition-colors"
                                    >
                                        <ClipboardList className="w-4 h-4 text-[#023E8A]" />
                                        Semua Pesanan
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
                        {/* Stats Cards — global data from DB */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
                                    <Bell className="w-6 h-6 text-amber-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-slate-900">{stats.pendingOrders}</p>
                                    <p className="text-xs text-slate-500 font-medium">Pesanan Global Menunggu</p>
                                </div>
                            </div>
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                                    <ClipboardList className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-slate-900">{stats.totalOrders}</p>
                                    <p className="text-xs text-slate-500 font-medium">Total Pesanan Global</p>
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
                                    <p className="text-xs text-slate-500 font-medium">Total Layanan Platform</p>
                                </div>
                            </div>
                        </div>

                        {/* Info Card for Admin */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                <Anchor className="w-5 h-5 text-[#023E8A]" />
                                Pusat Kontrol Platform
                            </h3>
                            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                                Sebagai Administrator, Anda memiliki akses penuh ke seluruh transaksi dan layanan yang berjalan di ekosistem SulutDive. 
                                Gunakan menu di bawah atau di samping untuk mengelola operasional.
                            </p>

                            <div className="grid grid-cols-2 gap-4">
                                <Link
                                    href="/admin/verifikasi"
                                    className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-primary hover:shadow-md transition-all group bg-gray-50 hover:bg-white"
                                >
                                    <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center group-hover:scale-110 transition-transform text-emerald-600">
                                        <UserCog className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900">Verifikasi Mitra</p>
                                        <p className="text-xs text-slate-500">Tinjau & Validasi KTP</p>
                                    </div>
                                </Link>

                                <Link
                                    href="/admin/services"
                                    className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-[#023E8A] hover:shadow-md transition-all group bg-gray-50 hover:bg-white cursor-pointer"
                                >
                                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center group-hover:scale-110 group-hover:bg-[#023E8A] group-hover:text-white transition-all text-[#023E8A]">
                                        <Ship className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900 group-hover:text-[#023E8A] transition-colors">Master Layanan</p>
                                        <p className="text-xs text-slate-500">Lihat seluruh paket</p>
                                    </div>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
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
    userEmail,
    joinDate,
    stats,
}: {
    provider: { id: string; name: string };
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
    const statCards = [
        {
            label: "Akan Datang",
            value: stats.upcoming,
            icon: Clock,
            iconColor: "text-amber-600",
            bg: "bg-amber-50",
            border: "border-amber-100",
        },
        {
            label: "Berlangsung",
            value: stats.inProgress,
            icon: Waves,
            iconColor: "text-emerald-600",
            bg: "bg-emerald-50",
            border: "border-emerald-100",
        },
        {
            label: "Selesai",
            value: stats.completed,
            icon: CheckCircle2,
            iconColor: "text-sky-600",
            bg: "bg-sky-50",
            border: "border-sky-100",
        },
        {
            label: "Total Booking",
            value: stats.total,
            icon: ClipboardList,
            iconColor: "text-slate-500",
            bg: "bg-slate-50",
            border: "border-slate-100",
        },
    ];

    const quickActions = [
        {
            href: "/services",
            label: "Cari Paket Selam",
            desc: "Jelajahi layanan diving, sewa alat & kapal",
            icon: Search,
            iconColor: "text-[#023E8A]",
            iconBg: "bg-blue-50",
        },
        {
            href: "/lokasi",
            label: "Peta Dive Sites",
            desc: "Lihat titik penyelaman di Selat Lembeh",
            icon: MapPin,
            iconColor: "text-emerald-600",
            iconBg: "bg-emerald-50",
        },
        {
            href: "/dashboard/bookings",
            label: "Riwayat Booking",
            desc: `${stats.total} perjalanan tercatat`,
            icon: ClipboardList,
            iconColor: "text-amber-600",
            iconBg: "bg-amber-50",
        },
    ];

    const firstName = userName.split(" ")[0] || userName;
    const activeSummary = stats.inProgress > 0
        ? `${stats.inProgress} perjalanan sedang berlangsung`
        : stats.upcoming > 0
            ? `${stats.upcoming} perjalanan terjadwal`
            : stats.total > 0
                ? `${stats.completed} perjalanan selesai`
                : "Belum ada booking aktif";

    return (
        <div className="min-h-screen bg-slate-50 pt-20 pb-28 sm:pb-14">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

                <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0077B6]">
                            Dashboard Wisatawan
                        </p>
                        <h1 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl">
                            Selamat datang, {firstName}
                        </h1>
                        <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
                            Pantau booking selam, lanjutkan rencana perjalanan, dan temukan layanan terbaik di SulutDive.
                        </p>
                    </div>
                    <Link
                        href="/services"
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#023E8A] px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#012f6b]"
                    >
                        <Search className="h-4 w-4" />
                        Cari Paket Selam
                    </Link>
                </div>

                {/* ─── Profile Bar ─────────────────────────────── */}
                <div className="bg-[#023E8A] rounded-2xl border border-[#023E8A] p-4 text-white shadow-sm sm:p-5">
                    <div className="flex items-center gap-4">
                        {/* Avatar */}
                        <div className="w-11 h-11 rounded-xl bg-white/15 ring-1 ring-white/25 flex items-center justify-center text-white text-lg font-semibold shrink-0">
                            {userName.charAt(0).toUpperCase()}
                        </div>

                        {/* Info */}
                        <div className="min-w-0 flex-1">
                            <h2 className="text-base font-semibold text-white truncate">
                                {userName}
                            </h2>
                            <p className="text-sm text-blue-100 truncate">{userEmail}</p>
                        </div>

                        {/* Join date — hidden on very small screens */}
                        <div className="hidden sm:flex items-center gap-1.5 text-xs text-blue-100 shrink-0">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>{joinDate}</span>
                        </div>

                        {/* Logout */}
                        <form action={signOut}>
                            <button
                                type="submit"
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white/85 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                            >
                                <LogOut className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Keluar</span>
                            </button>
                        </form>
                    </div>

                    {/* Join date — visible only on mobile, below the row */}
                    <div className="flex sm:hidden items-center gap-1.5 text-xs text-blue-100 mt-3 pl-[60px]">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Bergabung {joinDate}</span>
                    </div>
                </div>

                {/* ─── Greeting + summary ──────────────────────── */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Status perjalanan
                    </p>
                    <h2 className="mt-2 text-xl font-bold text-slate-950">
                        {activeSummary}
                    </h2>
                    <p className="text-sm text-slate-500 mt-0.5">
                        {stats.total === 0
                            ? "Belum ada booking. Mulai jelajahi paket selam di Lembeh."
                            : stats.upcoming > 0
                                ? `${stats.upcoming} perjalanan akan datang - ${stats.completed} selesai`
                                : `${stats.completed} perjalanan selesai`}
                    </p>
                </div>

                {/* ─── Stats Grid ─────────────────────────────── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {statCards.map((s) => (
                        <div
                            key={s.label}
                            className={`bg-white rounded-2xl border ${s.border} p-4 min-w-0 shadow-sm`}
                        >
                            <div className="flex items-center justify-between gap-2 mb-4">
                                <span className="text-xs font-semibold text-slate-600 truncate">{s.label}</span>
                                <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center shrink-0`}>
                                    <s.icon className={`w-4 h-4 ${s.iconColor}`} />
                                </div>
                            </div>
                            <p className="text-3xl font-bold text-slate-950 tabular-nums">{s.value}</p>
                        </div>
                    ))}
                </div>

                {/* ─── Quick Actions ──────────────────────────── */}
                <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-2 px-1">
                        Menu Cepat
                    </h3>
                    <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                        {quickActions.map((action) => (
                            <Link
                                key={action.href}
                                href={action.href}
                                className="flex items-center gap-3.5 px-4 py-3.5 hover:bg-slate-50 transition-colors group"
                            >
                                <div className={`w-9 h-9 rounded-lg ${action.iconBg} flex items-center justify-center shrink-0`}>
                                    <action.icon className={`w-4 h-4 ${action.iconColor}`} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-slate-900">{action.label}</p>
                                    <p className="text-xs text-slate-400 truncate">{action.desc}</p>
                                </div>
                                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />
                            </Link>
                        ))}
                    </div>
                </div>

                {/* ─── Booking Summary ────────────────────────── */}
                <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-2 px-1">
                        Booking Saya
                    </h3>
                    <div className="bg-white rounded-xl border border-slate-200 p-5">
                        {stats.total === 0 ? (
                            <div className="text-center py-4">
                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                                    <Calendar className="w-5 h-5 text-slate-300" />
                                </div>
                                <p className="text-sm text-slate-500 mb-4">
                                    Belum ada perjalanan selam tercatat.
                                </p>
                                <Link
                                    href="/services"
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-[#023E8A] hover:bg-[#03045E] transition-colors"
                                >
                                    <Search className="w-3.5 h-3.5" />
                                    Cari Paket Selam
                                </Link>
                            </div>
                        ) : (
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-sm text-slate-600">
                                        <span className="font-semibold text-slate-900">{stats.upcoming}</span> akan datang
                                        {stats.inProgress > 0 && (
                                            <> · <span className="font-semibold text-emerald-700">{stats.inProgress}</span> berlangsung</>
                                        )}
                                        {stats.completed > 0 && (
                                            <> · <span className="font-semibold text-slate-700">{stats.completed}</span> selesai</>
                                        )}
                                    </p>
                                </div>
                                <Link
                                    href="/dashboard/bookings"
                                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-[#023E8A] bg-blue-50 hover:bg-blue-100 transition-colors shrink-0"
                                >
                                    <ClipboardList className="w-3.5 h-3.5" />
                                    Lihat Semua
                                </Link>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
