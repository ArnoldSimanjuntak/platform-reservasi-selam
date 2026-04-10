"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Navigation, Waves, Clock, Anchor } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { DiveSite } from "@/lib/supabase";

// ─── Fix Leaflet default icon issue in Next.js / Webpack ───
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Custom colored marker icons per zone
const zoneColors: Record<number, string> = {
    1: "#22c55e", // green
    2: "#f59e0b", // amber
    3: "#ef4444", // red
};

function createZoneIcon(zone: number) {
    const color = zoneColors[zone] || "#3b82f6";
    return L.divIcon({
        className: "custom-zone-marker",
        html: `
            <div style="
                width: 28px; height: 28px;
                background: ${color};
                border: 3px solid white;
                border-radius: 50% 50% 50% 0;
                transform: rotate(-45deg);
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                display: flex; align-items: center; justify-content: center;
            ">
                <span style="
                    transform: rotate(45deg);
                    color: white;
                    font-weight: 700;
                    font-size: 11px;
                    font-family: sans-serif;
                ">${zone}</span>
            </div>
        `,
        iconSize: [28, 36],
        iconAnchor: [14, 36],
        popupAnchor: [0, -36],
    });
}

function getZoneLabel(zone: number) {
    if (zone === 1) return "Zona 1 — Dekat";
    if (zone === 2) return "Zona 2 — Menengah";
    return "Zona 3 — Jauh";
}

function getHabitatColor(habitat?: string) {
    switch (habitat) {
        case "Coral": return "bg-rose-100 text-rose-700";
        case "Wreck": return "bg-slate-100 text-slate-700";
        case "Sand & Rubble": return "bg-amber-100 text-amber-700";
        case "Mixed": return "bg-blue-100 text-blue-700";
        default: return "bg-gray-100 text-gray-700";
    }
}

export default function MapLeaflet() {
    const router = useRouter();
    const [sites, setSites] = useState<DiveSite[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchSites() {
            try {
                const { data, error: fetchError } = await supabase
                    .from("dive_sites")
                    .select("*")
                    .order("zone_level", { ascending: true });

                if (fetchError) throw fetchError;

                if (data && data.length > 0) {
                    setSites(data);
                } else {
                    setError("Tidak ada data dive site ditemukan.");
                }
            } catch (err: any) {
                console.error("Failed to fetch dive sites:", err);
                setError(err.message || "Gagal memuat data dive sites.");
            } finally {
                setLoading(false);
            }
        }

        fetchSites();
    }, []);

    // Filter only sites that have valid coordinates
    const validSites = sites.filter(
        (s) => s.latitude != null && s.longitude != null
    );

    return (
        <MapContainer
            center={[1.47, 125.24]}
            zoom={12}
            scrollWheelZoom={true}
            className="w-full h-full rounded-2xl z-0"
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Loading / Error State overlay */}
            {loading && (
                <div className="absolute inset-0 z-[1000] bg-white/60 flex items-center justify-center">
                    <div className="w-8 h-8 border-4 border-[#023E8A] border-t-transparent rounded-full animate-spin" />
                </div>
            )}

            {error && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm shadow border border-red-200">
                    {error}
                </div>
            )}

            {validSites.map((site) => (
                <Marker
                    key={site.id}
                    position={[site.latitude!, site.longitude!]}
                    icon={createZoneIcon(site.zone_level)}
                >
                    <Popup minWidth={280} maxWidth={340}>
                        <div className="p-1">
                            {/* Title */}
                            <h3 className="text-lg font-bold text-[#03045E] mb-1 leading-tight">
                                {site.name}
                            </h3>

                            {/* Zone & Habitat Badges */}
                            <div className="flex flex-wrap items-center gap-1.5 mb-3">
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                                    <Navigation className="w-3 h-3 text-blue-500" />
                                    {getZoneLabel(site.zone_level)}
                                </span>
                                {site.habitat && (
                                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${getHabitatColor(site.habitat)}`}>
                                        {site.habitat}
                                    </span>
                                )}
                            </div>

                            {/* Description */}
                            {site.description && (
                                <p className="text-sm text-gray-600 mb-3 leading-relaxed line-clamp-3">
                                    {site.description}
                                </p>
                            )}

                            {/* Stats Row */}
                            <div className="grid grid-cols-2 gap-2 mb-3">
                                {site.kedalaman_meter && (
                                    <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                                        <Waves className="w-4 h-4 text-blue-500 shrink-0" />
                                        <div>
                                            <div className="text-[10px] text-gray-400 uppercase font-semibold">Kedalaman</div>
                                            <div className="text-sm font-bold text-[#023E8A]">{site.kedalaman_meter}m</div>
                                        </div>
                                    </div>
                                )}
                                {site.waktu_tempuh_kapal_menit && (
                                    <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                                        <Clock className="w-4 h-4 text-blue-500 shrink-0" />
                                        <div>
                                            <div className="text-[10px] text-gray-400 uppercase font-semibold">Boat Trip</div>
                                            <div className="text-sm font-bold text-[#023E8A]">{site.waktu_tempuh_kapal_menit} min</div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Surcharge Info */}
                            <div className="flex justify-between items-center text-sm mb-3 p-2 bg-blue-50 rounded-lg">
                                <span className="text-gray-600 flex items-center gap-1">
                                    <Anchor className="w-3.5 h-3.5" />
                                    Surcharge
                                </span>
                                <span className="font-bold text-[#023E8A]">
                                    {site.surcharge_fee === 0
                                        ? "Gratis"
                                        : `+ Rp ${site.surcharge_fee.toLocaleString("id-ID")}`}
                                </span>
                            </div>

                            {/* CTA */}
                            <button
                                className="w-full bg-[#023E8A] hover:bg-[#03045E] text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
                                onClick={() => router.push(`/booking?dive_site=${site.id}`)}
                            >
                                Pesan Kapal ke Sini
                            </button>
                        </div>
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    );
}
