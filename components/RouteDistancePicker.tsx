"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
    MapContainer,
    Marker,
    Polyline,
    Popup,
    TileLayer,
    useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
    AlertTriangle,
    Anchor,
    ChevronDown,
    Info,
    LoaderCircle,
    Navigation,
    Waves,
} from "lucide-react";
import { getDiveSites, getMapProviders } from "@/lib/supabase";
import type { DiveSite, ProviderMapPin } from "@/lib/supabase";
import {
    buildMarineRoute,
    distanceToMarineNetwork,
} from "@/lib/marine-route";

interface LocationPoint {
    id: string;
    name: string;
    lat: number;
    lng: number;
    type: "dive_spot" | "provider_base";
    label?: string;
}

// Cadangan lokal digunakan apabila data dive_sites tidak dapat dimuat.
const FALLBACK_DIVE_SPOTS: LocationPoint[] = [
    { id: "fallback-nudi-falls", name: "Nudi Falls", lat: 1.4606494, lng: 125.2270824, type: "dive_spot" },
    { id: "fallback-angels-window", name: "Angel's Window", lat: 1.4959408, lng: 125.2618465, type: "dive_spot" },
    { id: "fallback-police-pier", name: "Police Pier", lat: 1.4583598, lng: 125.2209549, type: "dive_spot" },
    { id: "fallback-hairball", name: "Hairball", lat: 1.4974972, lng: 125.2422262, type: "dive_spot" },
    { id: "fallback-nudi-retreat", name: "Nudi Retreat", lat: 1.4858198, lng: 125.2414241, type: "dive_spot" },
    { id: "fallback-jahir", name: "Jahir", lat: 1.4792372, lng: 125.2363678, type: "dive_spot" },
    { id: "fallback-makawide", name: "Makawide", lat: 1.4816689, lng: 125.2383698, type: "dive_spot" },
    { id: "fallback-magic-crack", name: "Magic Crack", lat: 1.4891269, lng: 125.2391822, type: "dive_spot" },
    { id: "fallback-batu-angus", name: "Batu Angus", lat: 1.5070808, lng: 125.2468088, type: "dive_spot" },
    { id: "fallback-california-dreaming", name: "California Dreaming", lat: 1.4893563, lng: 125.2576304, type: "dive_spot" },
    { id: "fallback-batu-kapal", name: "Batu Kapal", lat: 1.5231969, lng: 125.2770809, type: "dive_spot" },
    { id: "fallback-mawali-wreck", name: "Mawali Wreck", lat: 1.4597112, lng: 125.2222424, type: "dive_spot" },
    { id: "fallback-retak-larry", name: "Retak Larry", lat: 1.4901425, lng: 125.2370284, type: "dive_spot" },
    { id: "fallback-tk-123", name: "TK 1 2 3", lat: 1.4934459, lng: 125.2366851, type: "dive_spot" },
    { id: "fallback-aer-prang", name: "Aer Prang", lat: 1.473168, lng: 125.23428, type: "dive_spot" },
    { id: "fallback-critter-hunt", name: "Critter Hunt", lat: 1.4547109, lng: 125.224359, type: "dive_spot" },
    { id: "fallback-pintu-kota", name: "Pintu Kota", lat: 1.4533976, lng: 125.2118496, type: "dive_spot" },
    { id: "fallback-dantes-wall", name: "Dante's Wall", lat: 1.4969704, lng: 125.2633485, type: "dive_spot" },
    { id: "fallback-sarena-north", name: "Sarena North", lat: 1.4611905, lng: 125.2319444, type: "dive_spot" },
    { id: "fallback-serena-besar", name: "Serena Besar", lat: 1.4595817, lng: 125.2338971, type: "dive_spot" },
];

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

const providerIcon = createIcon("#0077B6", "PB");
const diveIcon = createIcon("#E63946", "DS");

function FitBounds({ positions }: { positions: [number, number][] }) {
    const map = useMap();

    useEffect(() => {
        if (positions.length < 2) return;
        map.fitBounds(L.latLngBounds(positions), {
            padding: [50, 50],
            maxZoom: 15,
        });
    }, [map, positions]);

    return null;
}

function isValidCoordinate(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value);
}

function mapDiveSites(sites: DiveSite[]) {
    const uniqueByName = new Map<string, LocationPoint>();

    for (const site of sites) {
        if (
            site.is_active === false ||
            !isValidCoordinate(site.latitude) ||
            !isValidCoordinate(site.longitude)
        ) {
            continue;
        }

        const point: LocationPoint = {
            id: `site-${site.id}`,
            name: site.name.trim(),
            lat: site.latitude,
            lng: site.longitude,
            type: "dive_spot",
            label: `Zona ${site.zone_level}`,
        };
        const normalizedName = point.name.toLocaleLowerCase("id-ID");
        const existing = uniqueByName.get(normalizedName);

        // Jika nama ganda, pilih koordinat yang paling dekat dengan koridor laut.
        if (
            !existing ||
            distanceToMarineNetwork(point.lat, point.lng) <
                distanceToMarineNetwork(existing.lat, existing.lng)
        ) {
            uniqueByName.set(normalizedName, point);
        }
    }

    return Array.from(uniqueByName.values()).sort((a, b) =>
        a.name.localeCompare(b.name, "id-ID")
    );
}

export default function RouteDistancePicker() {
    const searchParams = useSearchParams();
    const [departureId, setDepartureId] = useState("");
    const [destinationId, setDestinationId] = useState("");
    const [providerBases, setProviderBases] = useState<LocationPoint[]>([]);
    const [diveSpots, setDiveSpots] = useState<LocationPoint[]>([]);
    const [customStart, setCustomStart] = useState<LocationPoint | null>(null);
    const [isLoadingLocations, setIsLoadingLocations] = useState(true);
    const [locationWarning, setLocationWarning] = useState<string | null>(null);

    useEffect(() => {
        const lat = Number.parseFloat(searchParams.get("start_lat") || "");
        const lng = Number.parseFloat(searchParams.get("start_lng") || "");
        const name = searchParams.get("start_name");

        if (Number.isFinite(lat) && Number.isFinite(lng) && name) {
            const fromMap: LocationPoint = {
                id: `map-${lat}-${lng}`,
                name,
                lat,
                lng,
                type: "provider_base",
                label: "Dari Peta",
            };
            setCustomStart(fromMap);
            setDepartureId(fromMap.id);
        }
    }, [searchParams]);

    useEffect(() => {
        let isMounted = true;

        async function loadLocations() {
            setIsLoadingLocations(true);
            const warnings: string[] = [];

            try {
                const [providerResult, diveSiteResult] = await Promise.all([
                    getMapProviders(),
                    getDiveSites(),
                ]);

                if (!isMounted) return;

                if (providerResult.error) {
                    warnings.push("Pangkalan provider belum dapat dimuat.");
                } else {
                    const mappedProviders = ((providerResult.data ?? []) as ProviderMapPin[])
                        .filter(
                            (provider) =>
                                isValidCoordinate(provider.latitude) &&
                                isValidCoordinate(provider.longitude)
                        )
                        .map((provider) => ({
                            id: `provider-${provider.id}`,
                            name: provider.name,
                            lat: provider.latitude,
                            lng: provider.longitude,
                            type: "provider_base" as const,
                            label: provider.location || "Pangkalan Kapal",
                        }));
                    setProviderBases(mappedProviders);
                }

                if (diveSiteResult.error) {
                    setDiveSpots(FALLBACK_DIVE_SPOTS);
                    warnings.push("Spot selam memakai data cadangan lokal.");
                } else {
                    const mappedSites = mapDiveSites((diveSiteResult.data ?? []) as DiveSite[]);
                    if (mappedSites.length === 0) {
                        setDiveSpots(FALLBACK_DIVE_SPOTS);
                        warnings.push("Spot selam memakai data cadangan lokal.");
                    } else {
                        setDiveSpots(mappedSites);
                    }
                }
            } catch {
                if (!isMounted) return;
                setDiveSpots(FALLBACK_DIVE_SPOTS);
                warnings.push("Koneksi data terganggu; spot selam memakai data cadangan lokal.");
            } finally {
                if (isMounted) {
                    setLocationWarning(warnings.length > 0 ? warnings.join(" ") : null);
                    setIsLoadingLocations(false);
                }
            }
        }

        void loadLocations();
        return () => {
            isMounted = false;
        };
    }, []);

    const allDeparturePoints = useMemo(() => {
        const points = [...providerBases];
        if (customStart && !points.some((point) => point.id === customStart.id)) {
            points.unshift(customStart);
        }
        return points;
    }, [providerBases, customStart]);

    const departure = useMemo(
        () => allDeparturePoints.find((point) => point.id === departureId) ?? null,
        [allDeparturePoints, departureId]
    );
    const destination = useMemo(
        () => diveSpots.find((point) => point.id === destinationId) ?? null,
        [destinationId, diveSpots]
    );
    const route = useMemo(() => {
        if (!departure || !destination) return null;
        return buildMarineRoute(
            [departure.lat, departure.lng],
            [destination.lat, destination.lng]
        );
    }, [departure, destination]);

    const estimatedTime = route
        ? Math.max(1, Math.round((route.distanceKm / 25) * 60))
        : null;
    const routeDifferencePercent = route && route.directDistanceKm > 0.01
        ? Math.max(0, Math.round((route.distanceKm / route.directDistanceKm - 1) * 100))
        : 0;
    const farFromCorridor = route
        ? Math.max(route.startAccessDistanceKm, route.endAccessDistanceKm) > 2.5
        : false;
    const center: [number, number] = [1.475, 125.24];

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                    <label className="block text-sm font-semibold text-deepSea">
                        Pangkalan Kapal
                    </label>
                    <div className="relative">
                        <Anchor className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#0077B6]" />
                        <select
                            value={departureId}
                            onChange={(event) => setDepartureId(event.target.value)}
                            disabled={isLoadingLocations && !customStart}
                            className="w-full cursor-pointer appearance-none rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm font-medium text-gray-700 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-wait disabled:bg-slate-50"
                        >
                            <option value="">
                                {isLoadingLocations ? "Memuat pangkalan..." : "Pilih pangkalan kapal..."}
                            </option>
                            {providerBases.length > 0 && (
                                <optgroup label="Pangkalan Kapal Provider">
                                    {providerBases.map((point) => (
                                        <option key={point.id} value={point.id}>
                                            {point.name}
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
                        {isLoadingLocations ? (
                            <LoaderCircle className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />
                        ) : (
                            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        )}
                    </div>
                    {departure && (
                        <span className="inline-flex items-center rounded-full bg-[#023E8A]/10 px-2.5 py-1 text-xs font-semibold text-[#023E8A]">
                            Pangkalan Kapal
                        </span>
                    )}
                    {!isLoadingLocations && providerBases.length === 0 && !customStart && (
                        <p className="text-xs text-slate-500">
                            Belum ada pangkalan kapal provider terverifikasi dengan koordinat.
                        </p>
                    )}
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-semibold text-deepSea">
                        Tujuan Selam
                    </label>
                    <div className="relative">
                        <Waves className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#E63946]" />
                        <select
                            value={destinationId}
                            onChange={(event) => setDestinationId(event.target.value)}
                            disabled={isLoadingLocations}
                            className="w-full cursor-pointer appearance-none rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm font-medium text-gray-700 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-wait disabled:bg-slate-50"
                        >
                            <option value="">
                                {isLoadingLocations ? "Memuat spot selam..." : "Pilih spot selam..."}
                            </option>
                            {diveSpots.map((spot) => (
                                <option key={spot.id} value={spot.id}>
                                    {spot.name}
                                </option>
                            ))}
                        </select>
                        {isLoadingLocations ? (
                            <LoaderCircle className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />
                        ) : (
                            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        )}
                    </div>
                </div>
            </div>

            {locationWarning && (
                <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>{locationWarning}</p>
                </div>
            )}

            <div className="relative h-[400px] w-full overflow-hidden rounded-2xl border-4 border-white shadow-xl md:h-[500px]">
                <MapContainer
                    center={center}
                    zoom={12}
                    scrollWheelZoom
                    className="z-0 h-full w-full"
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    {departure && (
                        <Marker position={[departure.lat, departure.lng]} icon={providerIcon}>
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

                    {destination && (
                        <Marker position={[destination.lat, destination.lng]} icon={diveIcon}>
                            <Popup>
                                <div className="text-center">
                                    <strong className="text-sm">{destination.name}</strong>
                                    <br />
                                    <span className="text-xs text-gray-500">
                                        {destination.label || "Spot Selam"}
                                    </span>
                                    <br />
                                    <span className="text-[10px] text-gray-400">
                                        {destination.lat.toFixed(5)}, {destination.lng.toFixed(5)}
                                    </span>
                                </div>
                            </Popup>
                        </Marker>
                    )}

                    {route && (
                        <>
                            {route.corridorCoordinates.length >= 2 && (
                                <Polyline
                                    positions={route.corridorCoordinates}
                                    pathOptions={{
                                        color: route.usesFallback ? "#E63946" : "#023E8A",
                                        weight: 5,
                                        opacity: 0.9,
                                    }}
                                />
                            )}
                            {route.startAccessCoordinates.length >= 2 && (
                                <Polyline
                                    positions={route.startAccessCoordinates}
                                    pathOptions={{
                                        color: "#38BDF8",
                                        weight: 4,
                                        dashArray: "7, 7",
                                        opacity: 0.9,
                                    }}
                                />
                            )}
                            {route.endAccessCoordinates.length >= 2 && (
                                <Polyline
                                    positions={route.endAccessCoordinates}
                                    pathOptions={{
                                        color: "#38BDF8",
                                        weight: 4,
                                        dashArray: "7, 7",
                                        opacity: 0.9,
                                    }}
                                />
                            )}
                            <FitBounds positions={route.allCoordinates} />
                        </>
                    )}
                </MapContainer>

                {route && !route.usesFallback && (
                    <div className="pointer-events-none absolute bottom-3 left-3 z-[400] rounded-lg bg-white/95 px-3 py-2 text-[10px] font-medium text-slate-600 shadow-md backdrop-blur">
                        <div className="flex items-center gap-2">
                            <span className="h-1 w-6 rounded bg-[#023E8A]" />
                            Koridor laut
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                            <span className="w-6 border-t-2 border-dashed border-sky-400" />
                            Akses titik ke koridor
                        </div>
                    </div>
                )}
            </div>

            {departure && destination && route && (
                <div className="animate-in overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm fade-in slide-in-from-bottom-2">
                    <div className="bg-gradient-to-r from-primary to-secondary px-6 py-4 text-white">
                        <h3 className="text-lg font-bold">Ringkasan Rute Kapal</h3>
                        <p className="text-sm opacity-80">
                            {departure.name} {"->"} {destination.name}
                        </p>
                    </div>

                    <div className="p-6">
                        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                            <div className="rounded-xl bg-blue-50 p-4 text-center">
                                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                                    Jarak Rute
                                </p>
                                <p className="text-2xl font-bold text-primary">
                                    {route.distanceKm.toFixed(1)}
                                </p>
                                <p className="text-xs text-gray-500">km melalui koridor laut</p>
                            </div>

                            <div className="rounded-xl bg-green-50 p-4 text-center">
                                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                                    Estimasi Waktu
                                </p>
                                <p className="text-2xl font-bold text-green-600">
                                    ~{estimatedTime}
                                </p>
                                <p className="text-xs text-gray-500">menit dengan kapal</p>
                            </div>

                            <div className="rounded-xl bg-amber-50 p-4 text-center">
                                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                                    Metode
                                </p>
                                <div className="flex items-center justify-center gap-1 text-lg font-bold text-amber-700">
                                    <Navigation className="h-4 w-4" />
                                    Dijkstra
                                </div>
                                <p className="text-xs text-gray-500">jaringan waypoint laut</p>
                            </div>

                            <div className="rounded-xl bg-gray-50 p-4 text-center">
                                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                                    Dibanding Garis Lurus
                                </p>
                                <p className="text-lg font-bold text-gray-700">
                                    +{routeDifferencePercent}%
                                </p>
                                <p className="text-xs text-gray-500">
                                    garis lurus {route.directDistanceKm.toFixed(1)} km
                                </p>
                            </div>
                        </div>

                        {farFromCorridor && (
                            <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                                <p>
                                    Salah satu koordinat berjarak lebih dari 2,5 km dari jaringan waypoint.
                                    Periksa kembali koordinat pangkalan atau spot selam untuk meningkatkan ketepatan rute.
                                </p>
                            </div>
                        )}

                        <div className="mt-4 flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50/50 p-3 text-xs text-blue-800">
                            <Info className="mt-0.5 h-4 w-4 shrink-0" />
                            <p>
                                Garis biru tua adalah estimasi rute terpendek pada jaringan waypoint laut,
                                sedangkan garis putus-putus menghubungkan koordinat awal dan tujuan ke koridor.
                                Hasil ini bukan navigasi resmi. Waktu tempuh memakai asumsi kecepatan kapal
                                sekitar 25 km/jam dan dapat berubah karena cuaca, arus, serta kondisi operasional.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {(!departure || !destination) && (
                <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
                    <p className="text-sm text-gray-400">
                        Pilih pangkalan kapal dan spot selam untuk melihat rute laut serta estimasi jarak.
                    </p>
                </div>
            )}
        </div>
    );
}
