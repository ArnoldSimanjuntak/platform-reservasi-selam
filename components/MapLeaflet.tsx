"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Navigation } from "lucide-react";

// ─── Fix Leaflet default icon issue in Next.js / Webpack ───
// Webpack mangles the default icon paths; we must set them manually.
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// ─── Dive Site Data ───
const diveSites = [
    {
        id: "police-pier",
        name: "Police Pier",
        zone: "Zona 1 — Dekat Pelabuhan",
        surcharge: 0,
        position: [1.4405, 125.1895] as [number, number],
        description: "Spot muck diving ikonik, surganya nudibranch & mandarinfish.",
    },
    {
        id: "hairball-1",
        name: "Hairball 1",
        zone: "Zona 2 — Menengah",
        surcharge: 150000,
        position: [1.458, 125.22] as [number, number],
        description: "Hairy frogfish, coconut octopus, dan dasar pasir vulkanik hitam.",
    },
    {
        id: "batu-kapal",
        name: "Batu Kapal",
        zone: "Zona 3 — Ujung Selat",
        surcharge: 300000,
        position: [1.41, 125.245] as [number, number],
        description: "Formasi batu besar dengan eagle ray, reef shark, dan pelagic.",
    },
];

export default function MapLeaflet() {
    return (
        <MapContainer
            center={[1.4424, 125.228]}
            zoom={12}
            scrollWheelZoom={true}
            className="w-full h-full rounded-2xl z-0"
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {diveSites.map((site) => (
                <Marker key={site.id} position={site.position}>
                    <Popup minWidth={260} maxWidth={320}>
                        <div className="p-1">
                            <h3 className="text-lg font-bold text-[#03045E] mb-1">{site.name}</h3>

                            <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-2">
                                <Navigation className="w-3.5 h-3.5 text-blue-500" />
                                <span>{site.zone}</span>
                            </div>

                            <p className="text-sm text-gray-600 mb-3">{site.description}</p>

                            <div className="flex justify-between items-center text-sm mb-3 p-2 bg-blue-50 rounded-lg">
                                <span className="text-gray-600">Surcharge</span>
                                <span className="font-bold text-[#023E8A]">
                                    {site.surcharge === 0
                                        ? "Gratis"
                                        : `+ Rp ${site.surcharge.toLocaleString("id-ID")}`}
                                </span>
                            </div>

                            <button
                                className="w-full bg-[#023E8A] hover:bg-[#03045E] text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
                                onClick={() => alert(`Booking ke ${site.name} — fitur segera hadir!`)}
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
