"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Navigation, Waves, Clock, Anchor, Ship, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getMapProviders } from "@/lib/supabase";
import type { DiveSite, ProviderMapPin } from "@/lib/supabase";

// ─── Fix Leaflet default icon in Next.js / Webpack ────────────────────────
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
    // Referensi ke CDN — akan di-cache oleh Workbox service worker (PWA)
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// ─── Zone Icons (Dive Spots) ─── teardrop per zona ────────────────────────
const zoneColors: Record<number, string> = {
    1: "#22c55e", // Zona 1 — Dekat — hijau
    2: "#f59e0b", // Zona 2 — Menengah — amber
    3: "#ef4444", // Zona 3 — Jauh — merah
};

function createZoneIcon(zone: number) {
    const color = zoneColors[zone] || "#3b82f6";
    return L.divIcon({
        className: "",
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
        popupAnchor: [0, -38],
    });
}

// ─── Pangkalan Icon (Provider Base) ─── jangkar biru gelap ────────────────
const pangkalanIcon = L.divIcon({
    className: "",
    html: `
        <div style="
            width: 38px; height: 38px;
            background: #023E8A;
            border: 3px solid white;
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            box-shadow: 0 3px 10px rgba(2,62,138,0.45);
            font-size: 17px;
        ">⚓</div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -22],
});

// ─── Helpers ───────────────────────────────────────────────────────────────
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

function getPrimaryTypeLabel(type?: string) {
    switch (type) {
        case "boat": return "🚤 Kapal";
        case "instructor": return "🤿 Instruktur";
        case "gear": return "🔧 Peralatan";
        default: return "⚓ Penyedia Jasa";
    }
}

// ─── Main Component ────────────────────────────────────────────────────────
export default function MapLeaflet() {
    const router = useRouter();
    const [sites, setSites] = useState<DiveSite[]>([]);
    const [providers, setProviders] = useState<ProviderMapPin[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // AbortController memastikan request dibatalkan jika user
        // berpindah halaman sebelum data selesai dimuat — menghilangkan AbortError
        const controller = new AbortController();
        const signal = controller.signal;

        async function fetchMapData() {
            try {
                // Query paralel — lebih cepat dari sequential
                const [sitesResult, providersResult] = await Promise.all([
                    supabase
                        .from("dive_sites")
                        .select("*")
                        .order("zone_level", { ascending: true }),
                    getMapProviders(),
                ]);

                // Jika komponen sudah unmount, jangan update state
                if (signal.aborted) return;

                if (sitesResult.error) throw sitesResult.error;
                if (providersResult.error) {
                    // Provider error tidak critical — peta tetap tampil meski tanpa pangkalan
                    console.warn("Providers fetch warn:", providersResult.error.message);
                }

                if (sitesResult.data && sitesResult.data.length > 0) {
                    setSites(sitesResult.data);
                } else {
                    setError("Tidak ada data dive site ditemukan.");
                }

                if (providersResult.data) {
                    setProviders(providersResult.data as ProviderMapPin[]);
                }
            } catch (err: unknown) {
                // Abaikan AbortError dari fetch internal (sering terjadi saat user pindah halaman cepat)
                const msg = err instanceof Error ? err.message : String(err);
                if (msg.includes("aborted") || msg.includes("AbortError")) return;
                if (signal.aborted) return;

                console.error("Map data fetch failed:", msg);
                setError(msg);
            } finally {
                if (!signal.aborted) {
                    setLoading(false);
                }
            }
        }

        fetchMapData();

        // Cleanup: batalkan request saat komponen unmount / user navigasi
        return () => {
            controller.abort();
        };
    }, []);

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
            {/* ── Tile Layer ─────────────────────────────────────────── */}
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* ── Loading Overlay ──────────────────────────────────── */}
            {loading && (
                <div className="absolute inset-0 z-[1000] bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center">
                    <div className="w-10 h-10 border-4 border-[#023E8A] border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-sm font-semibold text-[#023E8A]">Memuat peta...</p>
                </div>
            )}

            {/* ── Error Component ──────────────────────────────────────── */}
            {error && !loading && (
                <div className="absolute inset-0 z-[1000] bg-red-50/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
                    <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-3">
                        <Anchor className="w-6 h-6 rotate-180" />
                    </div>
                    <h3 className="font-bold text-red-900 mb-1">Gagal Memuat Peta</h3>
                    <p className="text-sm text-red-700 mb-4 max-w-xs">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold shadow-sm hover:bg-red-700 transition-colors"
                    >
                        Coba Lagi
                    </button>
                </div>
            )}

            {/* ════════════════════════════════════════════════════════
                LAYER 1 — SPOT SELAM (teardrop berwarna per zona)
            ════════════════════════════════════════════════════════ */}
            {validSites.map((site) => (
                <Marker
                    key={`site-${site.id}`}
                    position={[site.latitude!, site.longitude!]}
                    icon={createZoneIcon(site.zone_level)}
                >
                    <Popup minWidth={280} maxWidth={340}>
                        <div className="p-1">
                            {/* Title */}
                            <h3 className="text-lg font-bold text-[#03045E] mb-1 leading-tight">
                                🤿 {site.name}
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

            {/* ════════════════════════════════════════════════════════
                LAYER 2 — PANGKALAN PROVIDER (lingkaran biru ⚓)
                Berbeda visual dari spot selam untuk clarity di mobile.
            ════════════════════════════════════════════════════════ */}
            {providers.map((prov) => (
                <Marker
                    key={`prov-${prov.id}`}
                    position={[prov.latitude, prov.longitude]}
                    icon={pangkalanIcon}
                >
                    <Popup minWidth={260} maxWidth={320}>
                        <div className="p-1">
                            {/* Header — nama pangkalan */}
                            <div className="flex items-start gap-2 mb-2">
                                <div className="w-9 h-9 rounded-full bg-[#023E8A] flex items-center justify-center shrink-0 mt-0.5">
                                    <Ship className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-[#03045E] leading-tight">
                                        {prov.name}
                                    </h3>
                                    <span className="text-[11px] text-gray-400 font-medium">
                                        {getPrimaryTypeLabel(prov.primary_type)}
                                    </span>
                                </div>
                            </div>

                            {/* Lokasi */}
                            {prov.location && (
                                <p className="text-xs text-gray-500 mb-3 flex items-start gap-1.5">
                                    <Navigation className="w-3.5 h-3.5 text-[#023E8A] shrink-0 mt-0.5" />
                                    {prov.location}
                                </p>
                            )}

                            {/* Koordinat — berguna untuk Route Sync */}
                            <p className="text-[10px] text-gray-400 mb-3 font-mono">
                                {prov.latitude.toFixed(5)}°N, {prov.longitude.toFixed(5)}°E
                            </p>

                            {/* Tombol aksi — 2 kolom */}
                            <div className="grid grid-cols-2 gap-2">
                                {/* Lihat Paket → /services filter by provider */}
                                <button
                                    className="flex items-center justify-center gap-1 bg-[#023E8A] hover:bg-[#03045E] text-white font-semibold py-2 px-3 rounded-lg transition-colors text-xs"
                                    onClick={() => router.push(`/services?provider=${prov.id}`)}
                                >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    Lihat Paket
                                </button>

                                {/* Jadikan Titik Awal di Route Planner */}
                                <button
                                    className="flex items-center justify-center gap-1 bg-white border-2 border-[#023E8A] text-[#023E8A] hover:bg-blue-50 font-semibold py-2 px-3 rounded-lg transition-colors text-xs"
                                    onClick={() =>
                                        router.push(
                                            `/route-planner?start_lat=${prov.latitude}&start_lng=${prov.longitude}&start_name=${encodeURIComponent(prov.name)}`
                                        )
                                    }
                                >
                                    <Navigation className="w-3.5 h-3.5" />
                                    Rencanakan Rute
                                </button>
                            </div>
                        </div>
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    );
}
