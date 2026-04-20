"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getDiveSites, getBoatServices } from "@/lib/supabase";
import type { DiveSite, Service } from "@/lib/supabase";
import { MapPin, X, Navigation, Loader2, Ship, Anchor } from "lucide-react";

// Fallback positions jika data dari DB belum ada latitude/longitude
const fallbackPositions: Record<string, { top: string; left: string }> = {
    "Police Pier": { top: "60%", left: "40%" },
    "Hairball 1": { top: "35%", left: "45%" },
    "Batu Kapal": { top: "15%", left: "80%" },
};

function getZoneLabel(zone: number) {
    if (zone === 1) return "Zona 1 - Dekat Pelabuhan";
    if (zone === 2) return "Zona 2 - Menengah";
    return "Zona 3 - Ujung Selat";
}

export default function InteractiveDiveMap() {
    const router = useRouter();
    const [selectedSite, setSelectedSite] = useState<DiveSite | null>(null);
    const [sites, setSites] = useState<DiveSite[]>([]);
    const [boats, setBoats] = useState<Service[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        getDiveSites().then(({ data }) => {
            if (data) setSites(data);
            setIsLoading(false);
        });
        getBoatServices().then(({ data }) => {
            if (data) setBoats(data);
        });
    }, []);

    // Assign positions based on name fallback or index
    const getPosition = (site: DiveSite, idx: number) => {
        const fallback = fallbackPositions[site.name];
        if (fallback) return fallback;
        // Spread evenly if no fallback match
        return { top: `${20 + idx * 25}%`, left: `${30 + idx * 20}%` };
    };

    const formatPrice = (amount: number) =>
        new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount);

    return (
        <div className="relative w-full h-[70vh] min-h-[500px] overflow-hidden rounded-3xl bg-blue-50 border-4 border-white shadow-xl group/map">
            {/* Background Map Image */}
            <div className="absolute inset-0">
                <Image
                    src="/images/lembeh-map.png"
                    alt="Peta Spot Selam Selat Lembeh"
                    fill
                    className="object-contain md:object-cover bg-[#89B9C9]"
                    sizes="(max-width: 1024px) 100vw, 1024px"
                    priority
                />
            </div>

            {/* Loading */}
            {isLoading && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/50 backdrop-blur-sm">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
            )}

            {/* Map Pins */}
            {sites.map((site, idx) => {
                const isActive = selectedSite?.id === site.id;
                const pos = getPosition(site, idx);
                return (
                    <button
                        key={site.id}
                        onClick={() => setSelectedSite(site)}
                        className={`absolute transform -translate-x-1/2 -translate-y-full transition-all duration-300 z-10 focus:outline-none
              ${isActive ? 'scale-125 z-20' : 'hover:scale-110'}`}
                        style={{ top: pos.top, left: pos.left }}
                        aria-label={`Pilih spot ${site.name}`}
                    >
                        <div className={`relative flex items-center justify-center ${isActive ? 'text-[#023E8A]' : 'text-blue-500 hover:text-blue-600'}`}>
                            <MapPin className={`w-10 h-10 fill-white transition-all duration-300 ${isActive ? 'animate-bounce drop-shadow-lg' : 'animate-pulse drop-shadow-md'}`} strokeWidth={1.5} />
                        </div>

                        {/* Tooltip Label */}
                        <div className={`absolute left-1/2 -translate-x-1/2 mt-1 px-3 py-1 bg-white/95 backdrop-blur-sm rounded-full shadow-sm text-xs font-bold text-[#03045E] whitespace-nowrap transition-opacity pointer-events-none
                ${isActive ? 'opacity-100' : 'opacity-0 md:group-hover:opacity-100'}`}>
                            {site.name}
                        </div>
                    </button>
                );
            })}

            {/* Overlay */}
            <div
                className={`absolute inset-0 bg-black/20 backdrop-blur-[2px] z-20 transition-opacity duration-300 ${selectedSite ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setSelectedSite(null)}
            />

            {/* Bottom Sheet */}
            <div
                className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-[2rem] shadow-[0_-20px_40px_rgba(0,0,0,0.15)] z-30 transition-transform duration-500 ease-out ${selectedSite ? 'translate-y-0' : 'translate-y-full'}`}
            >
                {selectedSite && (
                    <div className="p-6 md:p-8 max-h-[80vh] overflow-y-auto">
                        {/* Drag Handle */}
                        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6 cursor-pointer" onClick={() => setSelectedSite(null)} />

                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-2xl font-bold text-[#03045E]">{selectedSite.name}</h3>
                                <div className="flex items-center gap-1.5 mt-2 text-gray-700 font-medium tracking-wide">
                                    <Navigation className="w-4 h-4 text-secondary" />
                                    <span>{getZoneLabel(selectedSite.zone_level)}</span>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedSite(null)}
                                className="p-2.5 bg-gray-50 rounded-full hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
                                aria-label="Tutup"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Description */}
                        {selectedSite.description && (
                            <p className="text-sm text-slate-700 font-medium mb-4 leading-relaxed">
                                {selectedSite.description}
                            </p>
                        )}

                        {/* Surcharge Info */}
                        <div className="mb-6 p-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex justify-between items-center">
                            <span className="text-slate-800 font-bold">Biaya Tambahan Jarak</span>
                            <span className="font-extrabold text-lg text-[#023E8A]">
                                {selectedSite.surcharge_fee === 0 ? "Gratis" : `+ Rp ${selectedSite.surcharge_fee.toLocaleString('id-ID')}`}
                            </span>
                        </div>

                        {/* Boats List */}
                        <div className="mb-6">
                            <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                                <Ship className="w-5 h-5 text-primary" />
                                Kapal Terdaftar untuk Spot Ini
                            </h4>
                            {boats.length === 0 ? (
                                <p className="text-sm text-slate-500 italic">Memuat daftar kapal...</p>
                            ) : (
                                <div className="space-y-3">
                                    {boats.slice(0, 3).map((boat) => (
                                        <button
                                            key={boat.id}
                                            onClick={() => router.push(`/booking?dive_site=${selectedSite.id}`)}
                                            className="w-full p-4 rounded-xl border border-gray-200 text-left hover:border-primary hover:bg-blue-50/50 transition-all group/boat"
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-start gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-gray-100 text-gray-500 group-hover/boat:bg-primary group-hover/boat:text-white flex items-center justify-center transition-colors">
                                                        <Anchor className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-slate-900 text-sm">{boat.name}</h3>
                                                        <p className="text-xs text-slate-600 font-medium mt-0.5">Maks. {boat.max_capacity} pax · {boat.provider?.name}</p>
                                                    </div>
                                                </div>
                                                <span className="font-bold text-primary text-sm whitespace-nowrap">
                                                    {formatPrice(boat.price)}
                                                    <span className="text-xs text-slate-500 font-normal block text-right">/pax</span>
                                                </span>
                                            </div>
                                        </button>
                                    ))}
                                    {boats.length > 3 && (
                                        <p className="text-xs text-center font-bold text-slate-500 mt-2">
                                            + {boats.length - 3} kapal lainnya tersedia
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Main CTA */}
                        <button
                            onClick={() => router.push(`/booking?dive_site=${selectedSite.id}`)}
                            className="w-full bg-[#023E8A] hover:bg-[#03045E] text-white font-bold py-4 rounded-xl shadow-[0_8px_20px_rgba(2,62,138,0.25)] hover:shadow-[0_4px_10px_rgba(2,62,138,0.2)] transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-lg"
                        >
                            <MapPin className="w-5 h-5" />
                            Pesan Kapal ke Sini
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
