"use client";

import { useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default icon issue
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Custom icon for provider base
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
});

interface ProviderMapPickerProps {
    onLocationSelect: (lat: number, lng: number) => void;
    onAddressFound?: (address: string) => void;
    initialLat?: number;
    initialLng?: number;
}

// Center of Bitung / Lembeh Strait
const DEFAULT_CENTER: [number, number] = [1.4475, 125.1950];

function MapEvents({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
    useMapEvents({
        click(e) {
            onMapClick(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
}

export default function ProviderMapPicker({ 
    onLocationSelect, 
    onAddressFound,
    initialLat,
    initialLng
}: ProviderMapPickerProps) {
    const [position, setPosition] = useState<[number, number] | null>(
        initialLat && initialLng ? [initialLat, initialLng] : null
    );
    const [isGeocoding, setIsGeocoding] = useState(false);
    const markerRef = useRef<L.Marker>(null);

    // Simpan AbortController aktif agar request lama bisa dibatalkan
    // jika marker dipindah lagi sebelum geocoding selesai
    const geocodeAbortRef = useRef<AbortController | null>(null);

    const handleLocationChange = async (lat: number, lng: number) => {
        setPosition([lat, lng]);
        onLocationSelect(lat, lng);

        if (onAddressFound) {
            // Batalkan request geocoding sebelumnya jika masih berjalan
            if (geocodeAbortRef.current) {
                geocodeAbortRef.current.abort();
            }
            const controller = new AbortController();
            geocodeAbortRef.current = controller;

            setIsGeocoding(true);
            try {
                // Rate limit: 1 request per second for Nominatim (OSM policy)
                const res = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
                    { signal: controller.signal }
                );
                if (res.ok) {
                    const data = await res.json();
                    if (data?.display_name) {
                        onAddressFound(data.display_name);
                    }
                }
            } catch (error: unknown) {
                // AbortError bukan error nyata — user memindahkan marker sebelum selesai
                if (error instanceof Error && error.name === "AbortError") return;
                console.error("Geocoding error:", error);
            } finally {
                // Hanya reset loading jika ini masih request yang aktif
                if (geocodeAbortRef.current === controller) {
                    setIsGeocoding(false);
                    geocodeAbortRef.current = null;
                }
            }
        }
    };

    const handleMarkerDragEnd = () => {
        const marker = markerRef.current;
        if (marker) {
            const latLng = marker.getLatLng();
            handleLocationChange(latLng.lat, latLng.lng);
        }
    };

    return (
        <div className="relative w-full h-[300px] rounded-xl overflow-hidden border-2 border-[#023E8A]/20 shadow-sm">
            <MapContainer
                center={position || DEFAULT_CENTER}
                zoom={13}
                scrollWheelZoom={true}
                className="w-full h-full z-0"
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                <MapEvents onMapClick={(lat, lng) => handleLocationChange(lat, lng)} />

                {position && (
                    <Marker
                        position={position}
                        icon={pangkalanIcon}
                        draggable={true}
                        eventHandlers={{
                            dragend: handleMarkerDragEnd,
                        }}
                        ref={markerRef}
                    />
                )}
            </MapContainer>

            {/* Helper Overlay */}
            <div className="absolute bottom-2 left-2 right-2 bg-white/90 backdrop-blur-sm p-2 rounded-lg text-xs text-slate-700 shadow border border-gray-200 z-[400] pointer-events-none text-center font-medium">
                {isGeocoding ? (
                    <span className="flex items-center justify-center gap-2">
                        <span className="w-3 h-3 border-2 border-[#023E8A] border-t-transparent rounded-full animate-spin" />
                        Mencari alamat...
                    </span>
                ) : position ? (
                    "Geser marker (⚓) atau klik peta untuk mengubah lokasi"
                ) : (
                    "Klik pada peta untuk menentukan lokasi pangkalan"
                )}
            </div>
        </div>
    );
}
