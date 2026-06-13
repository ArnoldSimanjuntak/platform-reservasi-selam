import MapWrapper from "@/components/MapWrapper";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Peta Spot Selam & Pangkalan - SulutDive Lembeh",
    description: "Jelajahi spot selam dan pangkalan kapal provider di Selat Lembeh melalui peta interaktif SulutDive.",
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
                        Tap marker untuk melihat info spot selam atau pangkalan kapal. Estimasi jarak baru dihitung ketika titik pangkalan kapal dan spot tujuan sudah dipilih.
                    </p>
                </div>

                <div className="mb-4 flex flex-wrap justify-center gap-3 text-sm">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full shadow-sm border border-gray-100">
                        <span className="w-5 h-5 rounded-full bg-[#0077B6] border-2 border-white shadow-sm flex items-center justify-center text-[9px] font-bold text-white">DS</span>
                        <span className="text-gray-600 font-medium">Spot Selam</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full shadow-sm border border-gray-100">
                        <span className="w-5 h-5 rounded-full bg-[#023E8A] border-2 border-white shadow-sm flex items-center justify-center text-[9px] font-bold text-white">PB</span>
                        <span className="text-gray-600 font-medium">Pangkalan Kapal</span>
                    </div>
                </div>

                <div className="w-full h-[70vh] min-h-[450px] rounded-2xl overflow-hidden shadow-xl border-4 border-white">
                    <MapWrapper />
                </div>

                <div className="mt-8 rounded-xl bg-white p-4 text-sm text-slate-600 shadow-sm border border-gray-100">
                    <span className="font-bold text-[#023E8A] block mb-1">Catatan Jarak</span>
                    <span>
                        Marker spot selam dibuat netral pada tampilan umum. Kategori dekat, sedang, atau jauh hanya muncul pada booking kapal setelah sistem mengetahui pangkalan provider kapal dan spot tujuan.
                    </span>
                </div>
            </div>
        </main>
    );
}
