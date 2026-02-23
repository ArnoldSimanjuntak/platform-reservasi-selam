"use client";

import { useState } from "react";
import Image from "next/image";
import {
    MapPin,
    Star,
    CheckCircle2,
    XCircle,
    Calendar,
    Users,
    Camera,
    Anchor,
    Wifi,
    Utensils,
    Ship,
    Clock,
    Minus,
    Plus,
    ArrowRight,
    Loader2,
    Info
} from "lucide-react";
import type { Service } from "@/lib/supabase";

interface ServiceDetailClientProps {
    service: Service;
}

export default function ServiceDetailClient({ service }: ServiceDetailClientProps) {
    const [guests, setGuests] = useState(1);
    const [date, setDate] = useState("");
    const [isBooking, setIsBooking] = useState(false);

    // Dummy features data based on service type
    const features = [
        { icon: Camera, label: "Camera Room", description: "Ruang khusus bilas & setup kamera" },
        { icon: Anchor, label: "Dive Guide", description: "Ratio 1:4 guide to diver" },
        { icon: Wifi, label: "Free Wi-Fi", description: "Koneksi satelit di kapal" },
        { icon: Utensils, label: "Makan Siang", description: "Prasmanan masakan Manado" },
        { icon: Ship, label: "Speadboat", description: "Twin engine 200PK" },
        { icon: Clock, label: "Durasi", description: "8 Jam (08:00 - 16:00)" },
    ];

    const includes = [
        "Jemputan dari hotel area Bitung",
        "3x Dive (Tank & Weight)",
        "Makan siang & snack",
        "Handuk bersih",
        "P3K & Oksigen Darurat",
    ];

    const excludes = [
        "Sewa alat (BCD, Regulator, Wetsuit)",
        "Tiket masuk taman laut",
        "Tip untuk crew & guide",
        "Dokumentasi foto/video",
    ];

    const handleBooking = async () => {
        setIsBooking(true);
        // Simulate booking process
        await new Promise(resolve => setTimeout(resolve, 1500));
        alert("Fitur booking akan segera hadir!");
        setIsBooking(false);
    };

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(price);
    };

    const totalPrice = service.price * guests;

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* 1. Hero Header */}
            <div className="relative h-[60vh] min-h-[500px] w-full overflow-hidden">
                <Image
                    src={service.image_url || "https://picsum.photos/seed/lembeh/1920/1080"} // Fallback managed by parent or this default
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
                                {service.type}
                            </span>
                            <span className="bg-white/20 backdrop-blur-md border border-white/30 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5" />
                                Bitung, North Sulawesi
                            </span>
                            {service.dive_site_category && (
                                <span className="bg-yellow-500/20 backdrop-blur-md border border-yellow-500/30 text-yellow-200 px-3 py-1 rounded-full text-sm font-medium">
                                    {service.dive_site_category} Specialist
                                </span>
                            )}
                        </div>

                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 drop-shadow-lg leading-tight">
                            {service.name}
                        </h1>

                        <div className="flex items-center gap-2 text-yellow-400">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <Star key={i} className="w-5 h-5 fill-current" />
                            ))}
                            <span className="text-white ml-2 text-sm font-medium">(24 Reviews)</span>
                        </div>
                    </div>
                </div>
            </div>

            <main className="container mx-auto px-4 -mt-8 relative z-20">
                <div className="flex flex-col lg:flex-row gap-8">

                    {/* 2. Left Column (Content) */}
                    <div className="w-full lg:w-[65%] space-y-8">

                        {/* About Section */}
                        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100">
                            <h2 className="text-2xl font-bold text-deepSea mb-4">Tentang Layanan</h2>
                            <p className="text-gray-600 leading-relaxed text-lg">
                                {service.description || "Nikmati pengalaman menyelam terbaik di Selat Lembeh bersama kami. Layanan ini dirancang khusus untuk fotografer makro dan pecinta muck diving yang mencari kenyamanan dan pelayanan personal."}
                            </p>
                            <p className="text-gray-600 leading-relaxed text-lg mt-4">
                                Dipandu oleh dive master bersertifikat yang hafal setiap jengkal pasir hitam Lembeh, Anda akan menemukan "Critters" langka seperti Blue Ring Octopus, Flamboyant Cuttlefish, dan Hairy Frogfish dengan mudah.
                            </p>
                        </div>

                        {/* Facilities */}
                        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100">
                            <h2 className="text-2xl font-bold text-deepSea mb-6">Fasilitas & Fitur Utama</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {features.map((feature, idx) => (
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

                        {/* Includes / Excludes */}
                        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100">
                            <h2 className="text-2xl font-bold text-deepSea mb-6">Detail Paket</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div>
                                    <h3 className="font-semibold text-green-700 mb-4 flex items-center gap-2">
                                        <CheckCircle2 className="w-5 h-5" />
                                        Yang Termasuk
                                    </h3>
                                    <ul className="space-y-3">
                                        {includes.map((item, idx) => (
                                            <li key={idx} className="flex items-start gap-3 text-gray-600">
                                                <CheckCircle2 className="w-4 h-4 text-green-500 mt-1 shrink-0" />
                                                <span className="text-sm">{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-red-700 mb-4 flex items-center gap-2">
                                        <XCircle className="w-5 h-5" />
                                        Tidak Termasuk
                                    </h3>
                                    <ul className="space-y-3">
                                        {excludes.map((item, idx) => (
                                            <li key={idx} className="flex items-start gap-3 text-gray-600">
                                                <XCircle className="w-4 h-4 text-red-500 mt-1 shrink-0" />
                                                <span className="text-sm">{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* 3. Right Column (Sticky Booking Card) */}
                    <div className="w-full lg:w-[35%] relative">
                        <div className="sticky top-24 space-y-6">
                            <div className="bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] border border-blue-100 overflow-hidden">
                                <div className="bg-gradient-to-r from-primary to-deepSea p-6 text-white text-center">
                                    <p className="text-sm font-medium opacity-90 mb-1">Harga Mulai Dari</p>
                                    <h3 className="text-3xl font-bold">{formatPrice(service.price)}</h3>
                                    <p className="text-xs opacity-75">per pax / hari</p>
                                </div>

                                <div className="p-6 space-y-6">
                                    {/* Date Picker Dummy */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700 block">Pilih Tanggal Dive</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3.5 top-3 w-5 h-5 text-gray-400" />
                                            <input
                                                type="date"
                                                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-gray-600 font-medium"
                                                value={date}
                                                onChange={(e) => setDate(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    {/* Guest Counter */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700 block">Jumlah Divers</label>
                                        <div className="flex items-center justify-between p-1 rounded-lg border border-gray-200">
                                            <button
                                                onClick={() => setGuests(Math.max(1, guests - 1))}
                                                className="w-10 h-10 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-md transition-colors"
                                            >
                                                <Minus className="w-4 h-4" />
                                            </button>
                                            <span className="text-lg font-bold text-deepSea w-12 text-center">{guests}</span>
                                            <button
                                                onClick={() => setGuests(guests + 1)}
                                                className="w-10 h-10 flex items-center justify-center text-primary hover:bg-blue-50 rounded-md transition-colors"
                                            >
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Total Summary */}
                                    <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                                        <span className="text-gray-600 font-medium">Total Estimasi</span>
                                        <span className="text-xl font-bold text-primary">{formatPrice(totalPrice)}</span>
                                    </div>

                                    {/* CTAs */}
                                    <button
                                        onClick={handleBooking}
                                        disabled={isBooking}
                                        className="w-full btn-primary py-3.5 text-base flex items-center justify-center gap-2 group"
                                    >
                                        {isBooking ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <>
                                                Pesan Sekarang
                                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                            </>
                                        )}
                                    </button>

                                    <button className="w-full py-3 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-deepSea font-medium transition-colors text-sm flex items-center justify-center gap-2">
                                        <Info className="w-4 h-4" />
                                        Tanya Admin (WA)
                                    </button>
                                </div>
                            </div>

                            <div className="bg-blue-50 rounded-xl p-4 flex items-start gap-3 border border-blue-100">
                                <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                                <p className="text-xs text-blue-800 leading-relaxed">
                                    <strong>Jaminan Harga Terbaik:</strong> Jika Anda menemukan harga lebih murah untuk paket yang sama, kami akan samakan harganya.
                                </p>
                            </div>
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
}
