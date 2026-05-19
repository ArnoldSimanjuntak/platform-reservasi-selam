"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
    MapContainer,
    TileLayer,
    Marker,
    Polyline,
    Popup,
    useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Anchor, ChevronDown, Info, Waves } from "lucide-react";
import { getMapProviders } from "@/lib/supabase";
import type { ProviderMapPin } from "@/lib/supabase";

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface LocationPoint {
    id: string;
    name: string;
    lat: number;
    lng: number;
    type: "dive_spot" | "provider_base";
    label?: string;
}


// â”€â”€â”€ Dive Spots (loaded from data_selam.json coordinates) â”€â”€â”€
const DIVE_SPOTS: LocationPoint[] = [
    { id: "nudi-falls", name: "Nudi Falls", lat: 1.4606494, lng: 125.2270824, type: "dive_spot" },
    { id: "angels-window", name: "Angel's Window", lat: 1.4959408, lng: 125.2618465, type: "dive_spot" },
    { id: "police-pier", name: "Police Pier", lat: 1.4583598, lng: 125.2209549, type: "dive_spot" },
    { id: "hairball", name: "Hairball", lat: 1.4974972, lng: 125.2422262, type: "dive_spot" },
    { id: "nudi-retreat", name: "Nudi Retreat", lat: 1.4858198, lng: 125.2414241, type: "dive_spot" },
    { id: "jahir", name: "Jahir", lat: 1.4792372, lng: 125.2363678, type: "dive_spot" },
    { id: "makawide", name: "Makawide", lat: 1.4816689, lng: 125.2383698, type: "dive_spot" },
    { id: "magic-crack", name: "Magic Crack", lat: 1.4891269, lng: 125.2391822, type: "dive_spot" },
    { id: "batu-angus", name: "Batu Angus", lat: 1.5070808, lng: 125.2468088, type: "dive_spot" },
    { id: "california-dreaming", name: "California Dreaming", lat: 1.4893563, lng: 125.2576304, type: "dive_spot" },
    { id: "batu-kapal", name: "Batu Kapal", lat: 1.5231969, lng: 125.2770809, type: "dive_spot" },
    { id: "mawali-wreck", name: "Mawali Wreck", lat: 1.4597112, lng: 125.2222424, type: "dive_spot" },
    { id: "retak-larry", name: "Retak Larry", lat: 1.4901425, lng: 125.2370284, type: "dive_spot" },
    { id: "tk-123", name: "TK 1 2 3", lat: 1.4934459, lng: 125.2366851, type: "dive_spot" },
    { id: "aer-prang", name: "Aer Prang", lat: 1.473168, lng: 125.23428, type: "dive_spot" },
    { id: "critter-hunt", name: "Critter Hunt", lat: 1.4547109, lng: 125.224359, type: "dive_spot" },
    { id: "pintu-kota", name: "Pintu Kota", lat: 1.4533976, lng: 125.2118496, type: "dive_spot" },
    { id: "dantes-wall", name: "Dante's Wall", lat: 1.4969704, lng: 125.2633485, type: "dive_spot" },
    { id: "sarena-north", name: "Sarena North", lat: 1.4611905, lng: 125.2319444, type: "dive_spot" },
    { id: "serena-besar", name: "Serena Besar", lat: 1.4595817, lng: 125.2338971, type: "dive_spot" },
];

// â”€â”€â”€ Custom Icons â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const createIcon = (color: string, label: string) =>
    L.divIcon({
        html: `<div style="
            background: ${color};
            width: 36px; height: 36px;
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font-size: 16px;
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            color: white;
            font-weight: 800;
            letter-spacing: -0.03em;
        ">${label}</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        className: "",
    });

const providerIcon  = createIcon("#0077B6", "PB"); // Pangkalan provider dari DB
const diveIcon      = createIcon("#E63946", "DS");

// â”€â”€â”€ Haversine Distance â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLng / 2) *
            Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// â”€â”€â”€ Map Bounds Fitter â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function FitBounds({ start, end }: { start: [number, number]; end: [number, number] }) {
    const map = useMap();

    useEffect(() => {
        const bounds = L.latLngBounds([start, end]);
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
    }, [map, start, end]);

    return null;
}

// â”€â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function RouteDistancePicker() {
    const searchParams = useSearchParams();
    const [departureId, setDepartureId] = useState("");
    const [destinationId, setDestinationId] = useState("");
    // Pangkalan provider dari Supabase (terverifikasi + punya koordinat)
    const [providerBases, setProviderBases] = useState<LocationPoint[]>([]);

    // â”€â”€ Route Sync: baca koordinat dari URL params (dikirim oleh Dive Map popup)
    // Format: /route-planner?start_lat=1.456&start_lng=125.21&start_name=Pangkalan+X
    const [customStart, setCustomStart] = useState<LocationPoint | null>(null);

    useEffect(() => {
        const lat  = parseFloat(searchParams.get("start_lat") || "");
        const lng  = parseFloat(searchParams.get("start_lng") || "");
        const name = searchParams.get("start_name");

        if (!isNaN(lat) && !isNaN(lng) && name) {
            const fromMap: LocationPoint = {
                id:    `map-${lat}-${lng}`,
                name:  decodeURIComponent(name),
                lat,
                lng,
                type:  "provider_base",
                label: "Dari Peta",
            };
            setCustomStart(fromMap);
            setDepartureId(fromMap.id);
        }
    }, [searchParams]);

    // â”€â”€ Fetch provider bases dari Supabase
    useEffect(() => {
        getMapProviders().then(({ data }) => {
            if (data) {
                const mapped: LocationPoint[] = (data as ProviderMapPin[]).map((p) => ({
                    id:    `provider-${p.id}`,
                    name:  p.name,
                    lat:   p.latitude,
                    lng:   p.longitude,
                    type:  "provider_base" as const,
                    label: p.location || "Pangkalan Provider",
                }));
                setProviderBases(mapped);
            }
        });
    }, []);

    // Departure point hanya memakai pangkalan provider agar estimasi mengikuti layanan aktual.
    const allDeparturePoints = useMemo(() => {
        const points = [...providerBases];
        if (customStart && !points.find((p) => p.id === customStart.id)) {
            points.unshift(customStart);
        }
        return points;
    }, [providerBases, customStart]);

    const departure = useMemo(
        () => allDeparturePoints.find((p) => p.id === departureId) || null,
        [departureId, allDeparturePoints]
    );
    const destination = useMemo(
        () => DIVE_SPOTS.find((p) => p.id === destinationId) || null,
        [destinationId]
    );

    const distance = useMemo(() => {
        if (!departure || !destination) return null;
        return haversineDistance(departure.lat, departure.lng, destination.lat, destination.lng);
    }, [departure, destination]);

    // Estimated boat speed ~25km/h for Lembeh waters
    const estimatedTime = distance ? Math.round((distance / 25) * 60) : null;

    const center: [number, number] = [1.4750, 125.2400];

    return (
        <div className="space-y-6">
            {/* â”€â”€â”€ Dropdowns â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Departure */}
                <div className="space-y-2">
                    <label className="text-sm font-semibold text-deepSea block">
                        Departure Point
                    </label>
                    <div className="relative">
                        <Anchor className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#0077B6]" />
                        <select
                            value={departureId}
                            onChange={(e) => setDepartureId(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-700 font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all appearance-none cursor-pointer text-sm"
                        >
                            <option value="">Select provider base...</option>
                            {providerBases.length > 0 && (
                                <optgroup label="Pangkalan Provider">
                                    {providerBases.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.name}
                                        </option>
                                    ))}
                                </optgroup>
                            )}
                            {customStart && (
                                <optgroup label="Dari Peta">
                                    <option value={customStart.id}>{customStart.name}</option>
                                </optgroup>
                            )}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    </div>
                    {departure && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[#023E8A]/10 text-[#023E8A]">
                            Pangkalan Provider
                        </span>
                    )}
                    {providerBases.length === 0 && !customStart && (
                        <p className="text-xs text-slate-500">
                            Belum ada pangkalan provider terverifikasi dengan koordinat.
                        </p>
                    )}
                </div>

                {/* Destination */}
                <div className="space-y-2">
                    <label className="text-sm font-semibold text-deepSea block">
                        Dive Destination
                    </label>
                    <div className="relative">
                        <Waves className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#E63946]" />
                        <select
                            value={destinationId}
                            onChange={(e) => setDestinationId(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-700 font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all appearance-none cursor-pointer text-sm"
                        >
                            <option value="">Select dive spot...</option>
                            {DIVE_SPOTS.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.name}
                                </option>
                            ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    </div>
                </div>
            </div>

            {/* â”€â”€â”€ Map â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <div className="w-full h-[400px] md:h-[500px] rounded-2xl overflow-hidden border-4 border-white shadow-xl relative">
                <MapContainer
                    center={center}
                    zoom={12}
                    scrollWheelZoom={true}
                    className="w-full h-full z-0"
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    {/* Departure marker */}
                    {departure && (
                        <Marker
                            position={[departure.lat, departure.lng]}
                            icon={providerIcon}
                        >
                            <Popup>
                                <div className="text-center">
                                    <strong className="text-sm">{departure.name}</strong>
                                    <br />
                                    <span className="text-xs text-gray-500">{departure.label}</span>
                                    <br />
                                    <span className="text-[10px] text-gray-400">
                                        {departure.lat.toFixed(5)}, {departure.lng.toFixed(5)}
                                    </span>
                                </div>
                            </Popup>
                        </Marker>
                    )}

                    {/* Destination marker */}
                    {destination && (
                        <Marker
                            position={[destination.lat, destination.lng]}
                            icon={diveIcon}
                        >
                            <Popup>
                                <div className="text-center">
                                    <strong className="text-sm">{destination.name}</strong>
                                    <br />
                                    <span className="text-xs text-gray-500">Dive Spot</span>
                                    <br />
                                    <span className="text-[10px] text-gray-400">
                                        {destination.lat.toFixed(5)}, {destination.lng.toFixed(5)}
                                    </span>
                                </div>
                            </Popup>
                        </Marker>
                    )}

                    {/* Route Polyline */}
                    {departure && destination && (
                        <>
                            <Polyline
                                positions={[
                                    [departure.lat, departure.lng],
                                    [destination.lat, destination.lng],
                                ]}
                                pathOptions={{
                                    color: "#023E8A",
                                    weight: 3,
                                    dashArray: "8, 8",
                                    opacity: 0.8,
                                }}
                            />
                            <FitBounds
                                start={[departure.lat, departure.lng]}
                                end={[destination.lat, destination.lng]}
                            />
                        </>
                    )}
                </MapContainer>
            </div>

            {/* â”€â”€â”€ Route Info Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            {departure && destination && distance !== null && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                    {/* Header gradient */}
                    <div className="bg-gradient-to-r from-primary to-secondary px-6 py-4 text-white">
                        <h3 className="font-bold text-lg">Route Summary</h3>
                        <p className="text-sm opacity-80">
                            {departure.name} {"->"} {destination.name}
                        </p>
                    </div>

                    <div className="p-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {/* Distance */}
                            <div className="text-center p-4 rounded-xl bg-blue-50">
                                <p className="text-[10px] text-gray-500 uppercase font-semibold tracking-wider mb-1">
                                    Distance
                                </p>
                                <p className="text-2xl font-bold text-primary">
                                    {distance.toFixed(1)}
                                </p>
                                <p className="text-xs text-gray-500">km (straight line)</p>
                            </div>

                            {/* Estimated Time */}
                            <div className="text-center p-4 rounded-xl bg-green-50">
                                <p className="text-[10px] text-gray-500 uppercase font-semibold tracking-wider mb-1">
                                    Est. Time
                                </p>
                                <p className="text-2xl font-bold text-green-600">
                                    ~{estimatedTime}
                                </p>
                                <p className="text-xs text-gray-500">minutes by boat</p>
                            </div>

                            {/* Departure Type */}
                            <div className="text-center p-4 rounded-xl bg-amber-50">
                                <p className="text-[10px] text-gray-500 uppercase font-semibold tracking-wider mb-1">
                                    Departure
                                </p>
                                <p className="text-lg font-bold text-amber-700">
                                    Provider
                                </p>
                                <p className="text-xs text-gray-500">{departure.label}</p>
                            </div>

                            {/* Coordinates */}
                            <div className="text-center p-4 rounded-xl bg-gray-50">
                                <p className="text-[10px] text-gray-500 uppercase font-semibold tracking-wider mb-1">
                                    Destination
                                </p>
                                <p className="text-lg font-bold text-gray-700">Dive Spot</p>
                                <p className="text-xs text-gray-500">
                                    {destination.lat.toFixed(4)} deg N
                                </p>
                            </div>
                        </div>

                        {/* Info note */}
                        <div className="mt-4 p-3 rounded-xl bg-blue-50/50 border border-blue-100 text-xs text-blue-800 flex items-start gap-2">
                            <Info className="mt-0.5 h-4 w-4 shrink-0" />
                            <p>
                                Distance shown is a straight-line estimate (Haversine formula).
                                Actual boat route may vary due to weather conditions, currents,
                                and navigational requirements. Estimated time assumes ~25 km/h boat speed.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Empty state */}
            {(!departure || !destination) && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
                    <p className="text-gray-400 text-sm">
                        Select both a departure point and dive destination to see the route and estimated distance.
                    </p>
                </div>
            )}
        </div>
    );
}
