"use client";

import { Calendar, Users, Search, MapPin, Ship, UserCheck, Wrench } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function HeroBooking() {
    const router = useRouter();
    const [pax, setPax] = useState(1);
    const [date, setDate] = useState("");
    const [serviceType, setServiceType] = useState("boat");

    const serviceTypes = [
        {
            value: "boat",
            label: "Kapal",
            description: "Trip dan antar-jemput spot",
            icon: Ship,
        },
        {
            value: "instructor",
            label: "Guide",
            description: "Pemandu selam lokal",
            icon: UserCheck,
        },
        {
            value: "gear",
            label: "Peralatan",
            description: "Sewa gear penyelaman",
            icon: Wrench,
        },
    ];

    const handleSearch = () => {
        const params = new URLSearchParams();
        params.set("type", serviceType);
        if (date) params.set("date", date);
        params.set("pax", String(pax));
        router.push(`/services?${params.toString()}`);
    };

    return (
        <section className="relative w-full min-h-[100vh] flex items-center justify-center pt-24 bg-slate-950">
            {/* Background Image & Gradient Overlay */}
            <div className="absolute inset-0 z-0 overflow-hidden">
                <Image
                    src="/images/lembeh-map-baru copy.jpg"
                    alt="Pantai dan perairan Selat Lembeh"
                    fill
                    className="object-cover opacity-90"
                    priority
                />
                <div className="absolute inset-0 z-10 bg-gradient-to-b from-slate-950/70 via-[#023E8A]/35 to-[#F8F9FA]" />
                <div className="absolute inset-0 z-10 bg-[radial-gradient(circle_at_center,rgba(2,119,182,0.12),rgba(3,4,94,0.48)_72%)]" />
                <div className="absolute inset-x-0 bottom-0 z-10 h-44 bg-gradient-to-t from-[#F8F9FA] via-[#F8F9FA]/70 to-transparent" />
            </div>

            {/* Hero Main Content */}
            <div className="relative z-20 container mx-auto px-4 mt-[-10vh] pb-32 md:pb-48 text-center flex flex-col items-center">
                <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/12 border border-white/25 text-white text-sm font-semibold mb-6 uppercase tracking-widest shadow-sm">
                    <MapPin className="w-4 h-4 text-accent" />
                    <span>Lembeh Strait, North Sulawesi</span>
                </div>

                <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight leading-tight text-white drop-shadow-2xl">
                    Reservasi Selam <br />
                    <span className="text-accent">
                        Selat Lembeh
                    </span>
                </h1>

                <p className="mt-6 text-lg md:text-2xl text-gray-100 max-w-2xl font-medium drop-shadow-md">
                    Temukan layanan kapal, guide, dan paket selam makro dari penyedia lokal Bitung dalam satu platform.
                </p>
            </div>

            {/* Floating Booking Bar (Overlaps next section) */}
            <div className="absolute bottom-0 left-0 right-0 z-30 px-4 translate-y-1/2">
                <div className="container mx-auto max-w-5xl">
                    <div className="bg-white rounded-2xl p-4 md:p-5 shadow-[0_24px_70px_rgba(2,62,138,0.18)] border border-slate-100 flex flex-col lg:flex-row items-stretch gap-4 lg:gap-5">

                        {/* Tipe Layanan */}
                        <div className="flex-[1.4] w-full rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 text-left">Kebutuhan Layanan</label>
                            <div className="grid grid-cols-3 gap-2">
                                {serviceTypes.map((type) => {
                                    const Icon = type.icon;
                                    const isActive = serviceType === type.value;
                                    return (
                                        <button
                                            key={type.value}
                                            type="button"
                                            onClick={() => setServiceType(type.value)}
                                            className={`rounded-lg border px-3 py-2.5 text-left transition-colors ${
                                                isActive
                                                    ? "border-primary bg-white text-primary shadow-sm"
                                                    : "border-transparent bg-transparent text-slate-600 hover:bg-white"
                                            }`}
                                        >
                                            <Icon className="mb-1 h-4 w-4" />
                                            <span className="block text-sm font-bold leading-tight">{type.label}</span>
                                            <span className="hidden text-[11px] leading-tight text-slate-400 sm:block">{type.description}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="hidden lg:block w-px h-12 bg-gray-300" />

                        {/* Tanggal Dive */}
                        <div className="flex-1 w-full flex flex-col items-start rounded-xl p-3 md:p-4 border border-slate-200 bg-white transition-colors cursor-pointer">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 w-full text-left">Tanggal Dive</label>
                            <div className="flex items-center gap-3 text-deepSea font-semibold w-full relative">
                                <Calendar className="w-5 h-5 text-primary absolute left-0 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <input
                                    type="date"
                                    className="w-full bg-transparent border-none outline-none pl-8 text-deepSea cursor-pointer font-sans"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="hidden lg:block w-px h-12 bg-gray-300" />

                        {/* Jumlah Penyelam */}
                        <div className="flex-1 w-full rounded-xl p-3 md:p-4 border border-slate-200 bg-white flex flex-col justify-center">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 text-left">Jumlah Penyelam</label>
                            <div className="flex items-center justify-between text-deepSea font-semibold">
                                <div className="flex items-center gap-3">
                                    <Users className="w-5 h-5 text-primary" />
                                    <span>{pax} Divers</span>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setPax(Math.max(1, pax - 1))}
                                        className="w-7 h-7 rounded-md bg-white border border-gray-200 shadow-sm flex items-center justify-center hover:bg-gray-100 transition-colors"
                                        aria-label="Kurangi jumlah penyelam"
                                    >
                                        -
                                    </button>
                                    <button
                                        onClick={() => setPax(pax + 1)}
                                        className="w-7 h-7 rounded-md bg-white border border-gray-200 shadow-sm flex items-center justify-center hover:bg-gray-100 transition-colors"
                                        aria-label="Tambah jumlah penyelam"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* CTA Button */}
                        <button
                            onClick={handleSearch}
                            className="w-full lg:w-auto bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white font-bold py-4 px-8 rounded-xl shadow-lg hover:shadow-primary/30 transition-all active:scale-95 flex items-center justify-center gap-2 h-full whitespace-nowrap lg:min-h-[72px]"
                        >
                            <Search className="w-5 h-5" />
                            Cari Layanan
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}
