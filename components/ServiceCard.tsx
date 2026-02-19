"use client";

import Image from "next/image";
import { Ship, Anchor, Camera, Tag, Star, ArrowRight, Loader2 } from "lucide-react";
import type { Service } from "@/lib/supabase";
import { supabase } from "@/lib/supabase";
import { useState } from "react";

interface ServiceCardProps {
    service: Service;
}

export default function ServiceCard({ service }: ServiceCardProps) {
    const [isBooking, setIsBooking] = useState(false);

    // Determine icon based on service type
    const getIcon = (type: string) => {
        switch (type) {
            case "boat":
                return <Ship className="w-4 h-4" />;
            case "instructor":
                return <Anchor className="w-4 h-4" />;
            case "gear":
                return <Camera className="w-4 h-4" />;
            default:
                return <Ship className="w-4 h-4" />;
        }
    };

    // Format currency to IDR
    const formatPrice = (price: number) => {
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(price);
    };

    const badgeColors: Record<string, string> = {
        boat: "bg-blue-50 text-blue-700 border-blue-200",
        instructor: "bg-teal-50 text-teal-700 border-teal-200",
        gear: "bg-purple-50 text-purple-700 border-purple-200",
    };

    const categoryColors: Record<string, string> = {
        Muck: "bg-amber-100/90 text-amber-800",
        Coral: "bg-rose-100/90 text-rose-800",
        Wreck: "bg-slate-100/90 text-slate-800",
    };

    const handleBooking = async () => {
        try {
            setIsBooking(true);

            const { data: { user }, error: authError } = await supabase.auth.getUser();

            if (authError || !user) {
                alert("Silakan login terlebih dahulu untuk melakukan pemesanan.");
                return;
            }

            const { data, error } = await supabase
                .from("bookings")
                .insert([
                    {
                        user_id: user.id,
                        service_id: service.id,
                        booking_date: new Date().toISOString(),
                        status: "pending",
                        total_price: service.price,
                    },
                ])
                .select();

            if (error) {
                throw error;
            }

            alert(`Berhasil memesan: ${service.name}!`);

        } catch (error: any) {
            console.error("Booking error:", error);
            alert(`Gagal memproses pesanan: ${error.message}`);
        } finally {
            setIsBooking(false);
        }
    };

    return (
        <div className="group h-full flex flex-col bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className="relative h-56 w-full overflow-hidden bg-gray-100">
                <Image
                    src={service.image_url || "/images/placeholder.jpg"}
                    alt={service.name}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />

                {/* Service Type Badge */}
                <div className="absolute top-3 right-3 flex gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide border backdrop-blur-md shadow-sm ${badgeColors[service.type] || "bg-gray-50 text-gray-700 border-gray-200"
                        }`}>
                        {getIcon(service.type)}
                        {service.type}
                    </span>
                </div>

                {/* Dive Site Category Badge (Replaces Location) */}
                {service.dive_site_category && (
                    <div className="absolute top-3 left-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium backdrop-blur-md shadow-sm ${categoryColors[service.dive_site_category] || "bg-white/90 text-deepSea"
                            }`}>
                            <Tag className="w-3 h-3" />
                            {service.dive_site_category}
                        </span>
                    </div>
                )}

                <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/60 to-transparent opacity-60" />
            </div>

            <div className="p-5 flex flex-col flex-grow">
                <div className="mb-3">
                    <h3 className="font-bold text-lg text-deepSea leading-snug group-hover:text-primary transition-colors line-clamp-2">
                        {service.name}
                    </h3>
                </div>

                {/* Description Snippet if available */}
                {service.description && (
                    <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                        {service.description}
                    </p>
                )}

                <div className="flex items-center gap-2 mb-4 mt-auto">
                    <div className="flex gap-0.5 text-yellow-400">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <Star className="w-3.5 h-3.5 fill-current" />
                    </div>
                    <span className="text-xs text-slate-500 font-medium">Top Rated</span>
                </div>

                <div className="pt-4 border-t border-slate-50 flex items-end justify-between">
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Mulai dari</span>
                        <span className="text-lg font-bold text-primary">
                            {formatPrice(service.price)}
                        </span>
                    </div>
                    <button
                        onClick={handleBooking}
                        disabled={isBooking}
                        className="flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-accent/30 text-primary font-semibold text-sm group-hover:bg-primary group-hover:text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isBooking ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <>
                                <span>Pesan</span>
                                <ArrowRight className="w-4 h-4 transition-transform group-hover:-rotate-45" />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
