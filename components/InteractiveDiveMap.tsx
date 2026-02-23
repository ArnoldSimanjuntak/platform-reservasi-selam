"use client";

import { useState } from "react";
import Image from "next/image";
import { MapPin, X, Navigation } from "lucide-react";

// Mock data based on user request (can be fetched from Supabase later)
const diveSites = [
    {
        id: "police-pier",
        name: "Police Pier",
        zone: "Zona 1 - Dekat Pelabuhan",
        surcharge: 0,
        top: "60%", // Estimated based on Bitung location
        left: "40%",
    },
    {
        id: "hairball-1",
        name: "Hairball 1",
        zone: "Zona 2 - Menengah",
        surcharge: 150000,
        top: "35%", // Estimated further north along the strait
        left: "45%",
    },
    {
        id: "batu-kapal",
        name: "Batu Kapal",
        zone: "Zona 3 - Ujung Selat",
        surcharge: 300000,
        top: "15%", // Estimated northern tip of Lembeh island
        left: "80%",
    }
];

export default function InteractiveDiveMap() {
    const [selectedSite, setSelectedSite] = useState<typeof diveSites[0] | null>(null);

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

            {/* Map Pins */}
            {diveSites.map((site) => {
                const isActive = selectedSite?.id === site.id;
                return (
                    <button
                        key={site.id}
                        onClick={() => setSelectedSite(site)}
                        className={`absolute transform -translate-x-1/2 -translate-y-full transition-all duration-300 z-10 focus:outline-none
              ${isActive ? 'scale-125 z-20' : 'hover:scale-110'}`}
                        style={{ top: site.top, left: site.left }}
                        aria-label={`Pilih spot ${site.name}`}
                    >
                        <div className={`relative flex items-center justify-center ${isActive ? 'text-[#023E8A]' : 'text-blue-500 hover:text-blue-600'}`}>
                            <MapPin className={`w-10 h-10 fill-white transition-all duration-300 ${isActive ? 'animate-bounce drop-shadow-lg' : 'animate-pulse drop-shadow-md'}`} strokeWidth={1.5} />
                        </div>

                        {/* Tooltip Label (Desktop Hover / Active) */}
                        <div className={`absolute left-1/2 -translate-x-1/2 mt-1 px-3 py-1 bg-white/95 backdrop-blur-sm rounded-full shadow-sm text-xs font-bold text-[#03045E] whitespace-nowrap transition-opacity pointer-events-none
                ${isActive ? 'opacity-100' : 'opacity-0 md:group-hover:opacity-100'}`}>
                            {site.name}
                        </div>
                    </button>
                );
            })}

            {/* Grab-style Bottom Sheet Overlay */}
            <div
                className={`absolute inset-0 bg-black/20 backdrop-blur-[2px] z-20 transition-opacity duration-300 ${selectedSite ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setSelectedSite(null)}
            />

            {/* Bottom Sheet Modal */}
            <div
                className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-[2rem] shadow-[0_-20px_40px_rgba(0,0,0,0.15)] z-30 transition-transform duration-500 ease-out ${selectedSite ? 'translate-y-0' : 'translate-y-full'}`}
            >
                {selectedSite && (
                    <div className="p-6 md:p-8">
                        {/* Drag Handle Indicator */}
                        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6 cursor-pointer" onClick={() => setSelectedSite(null)} />

                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-2xl font-bold text-[#03045E]">{selectedSite.name}</h3>
                                <div className="flex items-center gap-1.5 mt-2 text-gray-500 font-medium">
                                    <Navigation className="w-4 h-4 text-secondary" />
                                    <span>{selectedSite.zone}</span>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedSite(null)}
                                className="p-2.5 bg-gray-50 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-[#023E8A]/50"
                                aria-label="Tutup"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Surcharge Info */}
                        <div className="mb-8 p-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex justify-between items-center">
                            <span className="text-gray-600 font-medium">Biaya Tambahan Jarak</span>
                            <span className="font-bold text-lg text-[#023E8A]">
                                {selectedSite.surcharge === 0 ? "Gratis" : `+ Rp ${selectedSite.surcharge.toLocaleString('id-ID')}`}
                            </span>
                        </div>

                        {/* CTA Button */}
                        <button className="w-full bg-[#023E8A] hover:bg-[#03045E] text-white font-bold py-4 rounded-xl shadow-[0_8px_20px_rgba(2,62,138,0.25)] hover:shadow-[0_4px_10px_rgba(2,62,138,0.2)] transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-lg">
                            <MapPin className="w-5 h-5" />
                            Pesan Kapal ke Sini
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
