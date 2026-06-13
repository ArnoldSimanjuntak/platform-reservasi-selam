"use client";

import Image from "next/image";
import Link from "next/link";
import { Ship, Anchor, Camera, ArrowRight, Loader2 } from "lucide-react";
import type { Service } from "@/lib/supabase";
import { useState } from "react";
import { getServiceTypeLabel } from "@/lib/service-types";

interface ServiceCardProps {
    service: Service;
}

export default function ServiceCard({ service }: ServiceCardProps) {
    const [isBooking, setIsBooking] = useState(false);
    const previewImage = service.image_url || "/images/lembeh-map.png";

    const getIcon = (type: string) => {
        switch (type) {
            case "boat": return <Ship className="w-5 h-5 mb-2 text-white/90" />;
            case "instructor": return <Anchor className="w-5 h-5 mb-2 text-white/90" />;
            case "gear": return <Camera className="w-5 h-5 mb-2 text-white/90" />;
            default: return <Ship className="w-5 h-5 mb-2 text-white/90" />;
        }
    };

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(price);
    };

    const handleNavigate = () => {
        setIsBooking(true);
    };

    return (
        <div className="group relative flex flex-col bg-white overflow-hidden cursor-pointer shadow-lg hover:shadow-2xl transition-all duration-500 rounded-2xl w-full h-full">
            {/* Image Container with Tall Aspect Ratio */}
            <div className="relative w-full aspect-[4/5] overflow-hidden bg-neutral-900">
                <Image
                    src={previewImage}
                    alt={service.name}
                    fill
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-110 opacity-90 group-hover:opacity-100"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
                
                {/* Overlay Gradient for Text Readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-opacity duration-500" />

                {/* Top Badge: Type Category */}
                <div className="absolute top-4 left-4 z-10 flex flex-col items-start gap-2">
                    <span className="inline-block bg-white/20 backdrop-blur-md text-white text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-white/30">
                        {getServiceTypeLabel(service.type)}
                    </span>
                    {service.dive_site_category && (
                        <span className="inline-block bg-accent/90 text-white text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-md">
                            {service.dive_site_category}
                        </span>
                    )}
                </div>

                {/* Bottom Content Area Overlapping Image */}
                <div className="absolute bottom-0 inset-x-0 p-6 z-10 flex flex-col justify-end text-white transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                    {getIcon(service.type)}
                    
                    <h3 className="text-2xl font-bold mb-1 leading-tight line-clamp-2 drop-shadow-md">
                        {service.name}
                    </h3>

                    {/* Hidden on default, appears on hover */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100 mt-2 h-0 group-hover:h-auto overflow-hidden">
                        {service.description && (
                            <p className="text-gray-200 text-sm line-clamp-2 mb-4 font-light">
                                {service.description}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Info & Action Bar (White BG) */}
            <div className="p-5 flex items-center justify-between bg-white border-t border-neutral-100 relative z-20 mt-auto">
                <div className="flex flex-col">
                    <span className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold mb-1">Mulai Dari</span>
                    <span className="text-xl font-bold text-deepSea">
                        {formatPrice(service.price)}
                    </span>
                </div>

                <Link
                    href={`/services/${service.id}`}
                    onClick={handleNavigate}
                    className={`flex items-center justify-center w-12 h-12 rounded-full bg-neutral-100 text-deepSea hover:bg-primary hover:text-white transition-all duration-300 shrink-0 ${
                        isBooking ? "pointer-events-none opacity-50" : ""
                    }`}
                >
                    {isBooking ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <ArrowRight className="w-5 h-5 -rotate-45 group-hover:rotate-0 transition-transform duration-300" />
                    )}
                </Link>
            </div>
        </div>
    );
}
