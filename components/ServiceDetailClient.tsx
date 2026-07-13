"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import {
    MapPin,
    Anchor,
    Ship,
    Clock,
    Info,
    ShieldAlert,
    Users,
    Package,
    Tag,
} from "lucide-react";
import type { Service, DiveSite } from "@/lib/supabase";
import BookingForm from "@/components/BookingForm";
import AddToTripButton from "@/components/AddToTripButton";
import { createClient } from "@/lib/supabase/client";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { getServiceTypeLabel } from "@/lib/service-types";
import { formatRupiah } from "@/lib/formatters";

interface ServiceDetailClientProps {
    service: Service;
    initialIsLoggedIn: boolean;
    initialUserRole?: string;
    diveSites?: DiveSite[];
}

export default function ServiceDetailClient({ service, initialIsLoggedIn, initialUserRole = "customer", diveSites = [] }: ServiceDetailClientProps) {
    const [userRole, setUserRole] = useState<string>(initialUserRole);

    useEffect(() => {
        const supabase = createClient();

        // Verifikasi token secara kriptografis — lebih andal dari SSR cookie race condition
        const syncAuth = async () => {
            const authRes = await supabase.auth.getUser();
            const user = authRes.data.user;

            if (user) {
                // Sinkronisasi role dari DB
                const roleRes = await supabase
                    .from("users")
                    .select("role")
                    .eq("id", user.id)
                    .single();
                if (roleRes.data?.role) setUserRole(roleRes.data.role);
            } else {
                setUserRole("customer");
            }
        };
        void syncAuth();

        // Pantau perubahan sesi secara real-time (login di tab lain, logout, refresh token)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
            if (!session?.user) setUserRole("customer");
        });

        return () => subscription.unsubscribe();
    }, []);

    const isGear = service.type === "gear";
    const isBoat = service.type === "boat";
    const heroImage = service.image_url || "/images/lembeh-map.jpg";
    const serviceTypeLabel = getServiceTypeLabel(service.type);
    const providerBase =
        service.provider &&
        typeof service.provider.latitude === "number" &&
        typeof service.provider.longitude === "number"
            ? {
                name: service.provider.name,
                latitude: service.provider.latitude,
                longitude: service.provider.longitude,
            }
            : null;

    const serviceFacts = [
        {
            icon: Tag,
            label: "Tipe Layanan",
            description: serviceTypeLabel,
        },
        {
            icon: Users,
            label: isGear ? "Jumlah Unit" : "Kapasitas Maksimal",
            description: isGear
                ? `${service.max_capacity} unit tersedia per hari`
                : `${service.max_capacity} peserta per hari`,
        },
        ...(service.provider?.name
            ? [{
                icon: Anchor,
                label: "Penyedia",
                description: service.provider.name,
            }]
            : []),
        ...(service.provider?.location
            ? [{
                icon: MapPin,
                label: "Lokasi Provider",
                description: service.provider.location,
            }]
            : []),
        ...(service.dive_site_category
            ? [{
                icon: Ship,
                label: "Kategori Spot",
                description: service.dive_site_category,
            }]
            : []),
        {
            icon: Clock,
            label: "Ketersediaan",
            description: service.is_available === false ? "Tidak tersedia" : "Tersedia untuk dipesan",
        },
    ];

    const bookingNotes = [
        isBoat
            ? "Wisatawan memilih spot selam dan tanggal pada formulir pemesanan."
            : isGear
            ? "Penyewaan alat tidak memerlukan pilihan spot selam. Pemesanan dihitung berdasarkan tanggal mulai, durasi sewa, dan jumlah unit."
            : "Wisatawan memilih tanggal dan jumlah sesuai ketersediaan layanan.",
        ...(isGear
            ? ["Lokasi pengambilan atau pengembalian alat mengikuti informasi dari provider dan sebaiknya dikonfirmasi sebelum hari sewa."]
            : []),
        "Fasilitas tambahan hanya berlaku jika dicantumkan langsung pada deskripsi layanan.",
        service.provider?.contact
            ? `Kontak provider: ${service.provider.contact}`
            : "Kontak provider belum dicantumkan.",
    ];

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* 1. Hero Header */}
            <div className="relative h-[60vh] min-h-[500px] w-full overflow-hidden">
                <Image
                    src={heroImage}
                    alt={service.name}
                    fill
                    className="object-cover"
                    priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#023E8A] via-[#03045E]/60 to-transparent" />

                <div className="absolute bottom-0 left-0 right-0 container mx-auto px-4 pb-12 z-10">
                    <div className="max-w-4xl animate-fade-in-up">
                        <div className="flex flex-wrap items-center gap-3 mb-4">
                            <span className="bg-accent/20 backdrop-blur-md border border-accent/30 text-accent px-3 py-1 rounded-full text-sm font-semibold uppercase tracking-wider">
                                {serviceTypeLabel}
                            </span>
                            <span className="bg-white/20 backdrop-blur-md border border-white/30 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5" />
                                Bitung, Sulawesi Utara
                            </span>
                            {service.dive_site_category && (
                                <span className="bg-yellow-500/20 backdrop-blur-md border border-yellow-500/30 text-yellow-200 px-3 py-1 rounded-full text-sm font-medium">
                                    Kategori {service.dive_site_category}
                                </span>
                            )}
                        </div>

                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 drop-shadow-lg leading-tight">
                            {service.name}
                        </h1>

                        <p className="text-sm font-semibold text-blue-100">
                            Detail layanan mengikuti data yang diisi oleh penyedia.
                        </p>
                    </div>
                </div>
            </div>

            <main className="container mx-auto px-4 -mt-8 relative z-20">
                <div className="flex flex-col lg:flex-row gap-8">

                    {/* 2. Left Column (Content) */}
                    <div className="w-full lg:w-[65%] space-y-8">

                        {/* About Section */}
                        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100">
                            <h2 className="text-2xl font-bold text-deepSea mb-4">Tentang Layanan Ini</h2>
                            <p className="text-gray-600 leading-relaxed text-lg">
                                {service.description || "Provider belum menambahkan deskripsi layanan. Detail fasilitas dan ketentuan sebaiknya dikonfirmasi sebelum memesan."}
                            </p>
                        </div>

                        {/* Service Facts */}
                        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100">
                            <h2 className="text-2xl font-bold text-deepSea mb-6">Informasi Layanan</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {serviceFacts.map((feature, idx) => (
                                    <div key={idx} className="flex items-start gap-4 p-4 rounded-xl bg-gray-50 hover:bg-blue-50 transition-colors border border-gray-100">
                                        <div className="bg-white p-2.5 rounded-lg shadow-sm text-primary">
                                            <feature.icon className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-deepSea">{feature.label}</h3>
                                            <p className="text-sm text-gray-500">{feature.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Booking Notes */}
                        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100">
                            <h2 className="text-2xl font-bold text-deepSea mb-6">Catatan Pemesanan</h2>
                            <ul className="space-y-3">
                                {bookingNotes.map((item, idx) => (
                                    <li key={idx} className="flex items-start gap-3 text-gray-600">
                                        <Package className="w-4 h-4 text-primary mt-1 shrink-0" />
                                        <span className="text-sm">{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                    </div>

                    {/* 3. Right Column (Sticky Booking Card) */}
                    <div className="w-full lg:w-[35%] relative">
                        <div className="sticky top-24 space-y-6">
                            <div className="bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] border border-blue-100 overflow-hidden">
                                <div className="bg-gradient-to-r from-primary to-deepSea p-6 text-white text-center">
                                    <p className="text-sm font-medium opacity-90 mb-1">
                                        {isGear ? "Harga Sewa" : "Mulai Dari"}
                                    </p>
                                    <h3 className="text-3xl font-bold">{formatRupiah(service.price)}</h3>
                                    <p className="text-xs opacity-75">
                                        {isGear ? "per unit / hari" : "per pax / hari"}
                                    </p>
                                </div>

                                <div className="p-6">
                                    {userRole === "admin" || userRole === "provider" ? (
                                        /* ─── Mode Admin/Provider: Tidak bisa memesan ─── */
                                        <div className="flex flex-col items-center justify-center gap-4 py-6 text-center">
                                            <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center">
                                                <ShieldAlert className="w-7 h-7 text-amber-500" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800 text-sm">Akses Dibatasi</p>
                                                <p className="text-xs text-slate-500 mt-1">
                                                    Anda tidak dapat memesan layanan dengan akun {userRole === "admin" ? "Admin" : "Provider"}.
                                                </p>
                                            </div>
                                            <div className="w-full py-3.5 rounded-xl text-sm font-semibold text-amber-700 bg-amber-50 border border-amber-200 flex items-center justify-center gap-2">
                                                <ShieldAlert className="w-4 h-4" />
                                                Hanya wisatawan yang dapat memesan
                                            </div>
                                        </div>
                                    ) : (
                                        /* ─── Booking Form Normal ─── */
                                        <>
                                            <BookingForm
                                                serviceId={service.id}
                                                serviceName={service.name}
                                                price={service.price}
                                                maxCapacity={service.max_capacity}
                                                initialIsLoggedIn={initialIsLoggedIn}
                                                isBoat={isBoat}
                                                isGear={isGear}
                                                diveSites={diveSites}
                                                providerBase={providerBase}
                                            />

                                            <AddToTripButton
                                                serviceId={service.id}
                                                serviceName={service.name}
                                                price={service.price}
                                                imageUrl={service.image_url || ""}
                                                diveSiteCategory={service.dive_site_category ?? undefined}
                                                initialIsLoggedIn={initialIsLoggedIn}
                                            />
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="bg-blue-50 rounded-xl p-4 flex items-start gap-3 border border-blue-100">
                                <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                                <p className="text-xs text-blue-800 leading-relaxed">
                                    <strong>Catatan:</strong> Informasi fasilitas mengikuti deskripsi yang ditulis provider atau admin pada layanan ini.
                                </p>
                            </div>
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
}
