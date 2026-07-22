"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Anchor, Clock, ExternalLink, Navigation, Ship, Waves } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { DiveSite, ProviderMapPin } from "@/lib/supabase";
import { formatRupiah } from "@/lib/formatters";

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function createDiveSiteIcon() {
    return L.divIcon({
        className: "",
        html: `
            <div style="
                width: 28px; height: 28px;
                background: #0077B6;
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
                ">DS</span>
            </div>
        `,
        iconSize: [28, 36],
        iconAnchor: [14, 36],
        popupAnchor: [0, -38],
    });
}

const providerBaseIcon = L.divIcon({
    className: "",
    html: `
        <div style="
            width: 38px; height: 38px;
            background: #023E8A;
            border: 3px solid white;
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            box-shadow: 0 3px 10px rgba(2,62,138,0.45);
            color: white;
            font-size: 12px;
            font-weight: 800;
            font-family: sans-serif;
        ">PB</div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -22],
});

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
    const [providers, setProviders] = useState<ProviderMapPin[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const controller = new AbortController();
        const signal = controller.signal;
        const supabase = createClient();

        async function fetchMapData() {
            try {
                const [sitesResult, providersResult] = await Promise.all([
                    supabase
                        .from("dive_sites")
                        .select("*")
                        .order("name", { ascending: true })
                        .abortSignal(signal),
                    supabase
                        .from("providers")
                        .select("id, name, location, contact, latitude, longitude, primary_type")
                        .eq("is_active", true)
                        .eq("verification_status", "verified")
                        .eq("primary_type", "boat")
                        .not("latitude", "is", null)
                        .not("longitude", "is", null)
                        .order("name", { ascending: true })
                        .abortSignal(signal),
                ]);

                if (signal.aborted) return;
                if (sitesResult.error) throw sitesResult.error;
                if (providersResult.error) {
                    console.warn("Providers fetch warn:", providersResult.error.message);
                }

                if (sitesResult.data && sitesResult.data.length > 0) {
                    setSites(sitesResult.data);
                } else {
                    setError("Tidak ada data spot selam ditemukan.");
                }

                if (providersResult.data) {
                    setProviders(providersResult.data as ProviderMapPin[]);
                }
            } catch (err: unknown) {
                if (
                    signal.aborted ||
                    (err instanceof Error && err.name === "AbortError") ||
                    String(err).includes("aborted")
                ) return;

                const errorMsg = err instanceof Error ? err.message : String(err);
                console.error("Map Data Error:", errorMsg);
                setError("Gagal memuat data peta. Silakan muat ulang.");
            } finally {
                if (!signal.aborted) setLoading(false);
            }
        }

        fetchMapData();
        return () => controller.abort();
    }, []);

    const validSites = sites.filter((site) => site.latitude != null && site.longitude != null);

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

            {loading && (
                <div className="absolute inset-0 z-[1000] bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center">
                    <div className="w-10 h-10 border-4 border-[#023E8A] border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-sm font-semibold text-[#023E8A]">Memuat peta...</p>
                </div>
            )}

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

            {validSites.map((site) => (
                <Marker
                    key={`site-${site.id}`}
                    position={[site.latitude!, site.longitude!]}
                    icon={createDiveSiteIcon()}
                >
                    <Popup minWidth={280} maxWidth={340}>
                        <div className="p-1">
                            <h3 className="text-lg font-bold text-[#03045E] mb-1 leading-tight">
                                {site.name}
                            </h3>

                            <div className="flex flex-wrap items-center gap-1.5 mb-3">
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                                    <Navigation className="w-3 h-3 text-blue-500" />
                                    Spot Selam
                                </span>
                                {site.habitat && (
                                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${getHabitatColor(site.habitat)}`}>
                                        {site.habitat}
                                    </span>
                                )}
                            </div>

                            {site.description && (
                                <p className="text-sm text-gray-600 mb-3 leading-relaxed line-clamp-3">
                                    {site.description}
                                </p>
                            )}

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
                                            <div className="text-[10px] text-gray-400 uppercase font-semibold">Estimasi Lama</div>
                                            <div className="text-sm font-bold text-[#023E8A]">{site.waktu_tempuh_kapal_menit} menit</div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-between items-center text-sm mb-3 p-2 bg-blue-50 rounded-lg">
                                <span className="text-gray-600 flex items-center gap-1">
                                    <Anchor className="w-3.5 h-3.5" />
                                    Biaya spot
                                </span>
                                <span className="font-bold text-[#023E8A]">
                                    {site.surcharge_fee === 0
                                        ? "Gratis"
                                        : `+ ${formatRupiah(site.surcharge_fee)}`}
                                </span>
                            </div>

                            <button
                                className="w-full bg-[#023E8A] hover:bg-[#03045E] text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
                                onClick={() => router.push(`/services?type=boat&dive_site=${site.id}`)}
                            >
                                Lihat Layanan Kapal
                            </button>
                        </div>
                    </Popup>
                </Marker>
            ))}

            {providers.map((provider) => (
                <Marker
                    key={`provider-${provider.id}`}
                    position={[provider.latitude, provider.longitude]}
                    icon={providerBaseIcon}
                >
                    <Popup minWidth={260} maxWidth={320}>
                        <div className="p-1">
                            <div className="flex items-start gap-2 mb-2">
                                <div className="w-9 h-9 rounded-full bg-[#023E8A] flex items-center justify-center shrink-0 mt-0.5">
                                    <Ship className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-[#03045E] leading-tight">
                                        {provider.name}
                                    </h3>
                                    <span className="text-[11px] text-gray-400 font-medium">
                                        Pangkalan Kapal Provider
                                    </span>
                                </div>
                            </div>

                            {provider.location && (
                                <p className="text-xs text-gray-500 mb-3 flex items-start gap-1.5">
                                    <Navigation className="w-3.5 h-3.5 text-[#023E8A] shrink-0 mt-0.5" />
                                    {provider.location}
                                </p>
                            )}

                            <p className="text-[10px] text-gray-400 mb-3 font-mono">
                                {provider.latitude.toFixed(5)} N, {provider.longitude.toFixed(5)} E
                            </p>

                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    className="flex items-center justify-center gap-1 bg-[#023E8A] hover:bg-[#03045E] text-white font-semibold py-2 px-3 rounded-lg transition-colors text-xs"
                                    onClick={() => router.push(`/services?type=boat&provider=${provider.id}`)}
                                >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    Lihat Kapal
                                </button>

                                <button
                                    className="flex items-center justify-center gap-1 bg-white border-2 border-[#023E8A] text-[#023E8A] hover:bg-blue-50 font-semibold py-2 px-3 rounded-lg transition-colors text-xs"
                                    onClick={() =>
                                        router.push(
                                            `/route-planner?start_lat=${provider.latitude}&start_lng=${provider.longitude}&start_name=${encodeURIComponent(provider.name)}`
                                        )
                                    }
                                >
                                    <Navigation className="w-3.5 h-3.5" />
                                    Rute Kapal
                                </button>
                            </div>
                        </div>
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    );
}
