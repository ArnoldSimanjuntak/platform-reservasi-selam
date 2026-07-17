import RoutePickerWrapper from "@/components/RoutePickerWrapper";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Route Planner Kapal - SulutDive Lembeh",
    description: "Rencanakan estimasi rute laut dari pangkalan kapal provider ke spot selam di Selat Lembeh.",
};

export default function RoutePlannerPage() {
    return (
        <main className="min-h-screen pt-24 pb-12 bg-gray-50">
            <div className="container mx-auto px-4 max-w-5xl">
                <div className="mb-8 text-center">
                    <h1 className="text-3xl md:text-4xl font-bold text-deepSea mb-3">
                        Perencana Rute Kapal
                    </h1>
                    <p className="text-gray-600 max-w-2xl mx-auto">
                        Pilih pangkalan kapal provider dan spot selam untuk melihat estimasi rute laut, jarak, dan waktu tempuh di Selat Lembeh.
                    </p>
                </div>

                <RoutePickerWrapper />

                <div className="mt-10 rounded-2xl bg-white p-5 text-sm text-slate-600 shadow-sm border border-gray-100">
                    <h2 className="font-bold text-[#023E8A] mb-2">Batasan Perhitungan</h2>
                    <p>
                        Route planner ini hanya berlaku untuk layanan kapal karena titik berangkatnya adalah pangkalan kapal provider. Rute dihitung dengan algoritma Dijkstra pada jaringan waypoint laut lokal, bukan sebagai jalur navigasi resmi. Layanan guide/instruktur dan penyewaan alat selam tidak memakai estimasi jarak kapal pada revisi ini.
                    </p>
                    <p className="mt-2">
                        Kategori jarak pada proses booking kapal memakai patokan: dekat sampai 5 km, sedang 5-10 km, dan jauh di atas 10 km dari pangkalan kapal ke spot selam.
                    </p>
                </div>
            </div>
        </main>
    );
}
