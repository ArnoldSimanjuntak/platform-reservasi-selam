import MapWrapper from "@/components/MapWrapper";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Peta Spot Selam & Pangkalan - SulutDive Lembeh",
    description: "Jelajahi spot selam dan pangkalan keberangkatan di Selat Lembeh melalui peta interaktif SulutDive.",
};

export default function LokasiPage() {
    return (
        <main className="min-h-screen pt-24 pb-10 bg-gray-50">
            <div className="container mx-auto px-4 max-w-6xl">
                <div className="mb-8 text-center">
                    <h1 className="text-3xl md:text-4xl font-bold text-deepSea mb-3">
                        Peta Selam Interaktif Lembeh
                    </h1>
                    <p className="text-gray-600 max-w-2xl mx-auto">
                        Tap marker untuk melihat info spot selam atau pangkalan kapal. Klik &quot;Rencanakan Rute&quot; untuk kalkulasi jarak ke spot tujuan.
                    </p>
                </div>

                {/* ── Marker Legend Pills ───────────────────────────── */}
                <div className="mb-4 flex flex-wrap justify-center gap-3 text-sm">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full shadow-sm border border-gray-100">
                        <span className="w-5 h-5 rounded-full bg-green-500 border-2 border-white shadow-sm flex items-center justify-center text-[9px] font-bold text-white">1</span>
                        <span className="text-gray-600 font-medium">Spot Dekat</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full shadow-sm border border-gray-100">
                        <span className="w-5 h-5 rounded-full bg-amber-500 border-2 border-white shadow-sm flex items-center justify-center text-[9px] font-bold text-white">2</span>
                        <span className="text-gray-600 font-medium">Spot Menengah</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full shadow-sm border border-gray-100">
                        <span className="w-5 h-5 rounded-full bg-red-500 border-2 border-white shadow-sm flex items-center justify-center text-[9px] font-bold text-white">3</span>
                        <span className="text-gray-600 font-medium">Spot Jauh</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full shadow-sm border border-gray-100">
                        <span className="w-5 h-5 rounded-full bg-[#023E8A] border-2 border-white shadow-sm flex items-center justify-center text-[11px]">⚓</span>
                        <span className="text-gray-600 font-medium">Pangkalan Provider</span>
                    </div>
                </div>

                {/* Map Container */}
                <div className="w-full h-[70vh] min-h-[450px] rounded-2xl overflow-hidden shadow-xl border-4 border-white">
                    <MapWrapper />
                </div>

                {/* Zone Surcharge Legend */}
                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-center">
                    <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-100">
                        <span className="font-bold text-green-600 block mb-1">Zona 1 (Dekat)</span>
                        <span className="text-gray-500">Tanpa biaya tambahan.</span>
                    </div>
                    <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-100">
                        <span className="font-bold text-amber-500 block mb-1">Zona 2 (Menengah)</span>
                        <span className="text-gray-500">+ Rp 150.000 / trip.</span>
                    </div>
                    <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-100">
                        <span className="font-bold text-red-500 block mb-1">Zona 3 (Jauh)</span>
                        <span className="text-gray-500">+ Rp 300.000 / trip.</span>
                    </div>
                </div>
            </div>
        </main>
    );
}
