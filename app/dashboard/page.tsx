import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { User, Calendar, Anchor, LogOut, Settings, Package, ClipboardList } from "lucide-react";
import Link from "next/link";
import { signOut } from "@/app/auth/actions";
import ProviderOrderFeed from "@/components/ProviderOrderFeed";

export default async function DashboardPage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    // Jika belum login, redirect ke login (double-check selain middleware)
    if (!user) {
        redirect("/auth/login");
    }

    const userName =
        user.user_metadata?.name || user.email?.split("@")[0] || "User";
    const userEmail = user.email || "";
    const joinDate = new Date(user.created_at).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });

    const { data: providerProfile } = await supabase
        .from("providers")
        .select("id, name")
        .eq("owner_user_id", user.id)
        .single();

    const isProvider = !!providerProfile;

    if (isProvider) {
        return <ProviderDashboard provider={providerProfile} userName={userName} userEmail={userEmail} joinDate={joinDate} />;
    }

    return <CustomerDashboard userName={userName} userEmail={userEmail} joinDate={joinDate} />;
}

function ProviderDashboard({ provider, userName, userEmail, joinDate }: any) {
    return (
        <div className="min-h-screen pt-24 pb-12 px-4">
            <div className="container mx-auto max-w-4xl">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-deepSea">Dashboard Provider</h1>
                    <p className="text-gray-500 mt-1">
                        Selamat datang kembali, {provider.name}!
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Profile Card */}
                    <div className="md:col-span-1">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div
                                className="h-24 relative"
                                style={{
                                    background: "linear-gradient(135deg, #023E8A 0%, #0077B6 100%)",
                                }}
                            >
                                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
                                    <div className="w-20 h-20 rounded-full bg-white shadow-lg flex items-center justify-center">
                                        <div className="w-[72px] h-[72px] rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-2xl font-bold">
                                            {provider.name.charAt(0).toUpperCase()}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-14 pb-6 px-6 text-center">
                                <h2 className="text-lg font-bold text-deepSea">{provider.name}</h2>
                                <p className="text-sm text-gray-500 mt-1">{userEmail}</p>

                                <div className="flex items-center justify-center gap-2 mt-3 text-xs text-gray-400">
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

                    {/* Main Content Provider */}
                    <div className="md:col-span-2 space-y-6">
                        {/* Provider Stats */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
                                    <ClipboardList className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-deepSea">0</p>
                                    <p className="text-xs text-gray-500">Pesanan Masuk</p>
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-cyan-50 flex items-center justify-center">
                                    <Package className="w-6 h-6 text-secondary" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-deepSea">0</p>
                                    <p className="text-xs text-gray-500">Layanan Aktif</p>
                                </div>
                            </div>
                        </div>

                        {/* Recent Bookings Live Feed */}
                        <ProviderOrderFeed providerId={provider.id} />

                        {/* Services List Placeholder */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold text-deepSea">
                                    Layanan & Armada
                                </h3>
                                <Link href="/dashboard/provider/services" className="text-sm text-primary hover:underline font-medium">
                                    Kelola Layanan
                                </Link>
                            </div>
                            <div className="text-center py-6">
                                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                                    <Package className="w-6 h-6 text-gray-300" />
                                </div>
                                <p className="text-gray-400 text-sm">Belum ada layanan yang ditambahkan.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function CustomerDashboard({ userName, userEmail, joinDate }: any) {
    return (
        <div className="min-h-screen pt-24 pb-12 px-4">
            <div className="container mx-auto max-w-4xl">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-deepSea">Dashboard</h1>
                    <p className="text-gray-500 mt-1">
                        Selamat datang kembali, {userName}!
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Profile Card */}
                    <div className="md:col-span-1">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            {/* Profile header */}
                            <div
                                className="h-24 relative"
                                style={{
                                    background:
                                        "linear-gradient(135deg, #023E8A 0%, #0077B6 100%)",
                                }}
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
                                <h2 className="text-lg font-bold text-deepSea">{userName}</h2>
                                <p className="text-sm text-gray-500 mt-1">{userEmail}</p>

                                <div className="flex items-center justify-center gap-2 mt-3 text-xs text-gray-400">
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
                        {/* Quick Actions */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <h3 className="text-lg font-semibold text-deepSea mb-4">
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
                                        <p className="text-sm font-semibold text-deepSea">
                                            Paket Selam
                                        </p>
                                        <p className="text-xs text-gray-500">Jelajahi layanan</p>
                                    </div>
                                </Link>

                                <Link
                                    href="/lokasi"
                                    className="flex items-center gap-3 p-4 rounded-xl bg-cyan-50 hover:bg-cyan-100 transition-colors group"
                                >
                                    <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Settings className="w-5 h-5 text-secondary" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-deepSea">
                                            Peta Lokasi
                                        </p>
                                        <p className="text-xs text-gray-500">Lihat dive sites</p>
                                    </div>
                                </Link>
                            </div>
                        </div>

                        {/* Bookings Placeholder */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <h3 className="text-lg font-semibold text-deepSea mb-4">
                                My Bookings
                            </h3>
                            <div className="text-center py-8">
                                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                                    <Calendar className="w-8 h-8 text-gray-300" />
                                </div>
                                <p className="text-gray-400 text-sm">
                                    Manage your upcoming and past diving trips.
                                </p>
                                <Link
                                    href="/dashboard/bookings"
                                    className="inline-block mt-4 px-6 py-2.5 rounded-full text-sm font-semibold text-white transition-all hover:shadow-lg"
                                    style={{
                                        background: "linear-gradient(135deg, #023E8A, #0077B6)",
                                    }}
                                >
                                    My Diving Trips
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
