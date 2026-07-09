import { getServices } from "@/lib/supabase";
import ServiceCard from "@/components/ServiceCard";
import type { Service } from "@/lib/supabase";
import { Compass } from "lucide-react";
import { getServiceTypeLabel } from "@/lib/service-types";

export const revalidate = 60; // Revalidate data every 60 seconds

type ServicesPageProps = {
    searchParams?: {
        type?: string;
        date?: string;
        pax?: string;
    };
};

export default async function ServicesPage({ searchParams }: ServicesPageProps) {
    // Fetch services dari Supabase menggunakan helper
    const { data: services, error } = await getServices();
    const selectedType = ["boat", "instructor", "gear"].includes(searchParams?.type || "")
        ? searchParams?.type
        : undefined;
    const selectedDate = searchParams?.date;
    const selectedPax = searchParams?.pax;
    const visibleServices = selectedType
        ? services?.filter((service) => service.type === selectedType)
        : services;

    if (error) {
        console.error("Error fetching services:", error);
        return (
            <div className="container mx-auto px-4 py-32 text-center min-h-[60vh] flex flex-col items-center justify-center">
                <h1 className="text-3xl font-extrabold text-red-500 mb-4">Gagal memuat paket selam.</h1>
                <p className="text-gray-500">Silakan coba lagi nanti atau pastikan koneksi internet Anda stabil.</p>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-neutral-50 font-sans pb-32">
            {/* Elegant Premium Header Section */}
            <section className="relative w-full py-32 md:py-40 flex items-center justify-center overflow-hidden bg-deepSea">
                <div className="absolute inset-0 bg-[url('/images/lembeh-map.png')] bg-cover bg-center opacity-30" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-deepSea/80 to-neutral-50 z-10" />

                <div className="relative z-20 container mx-auto px-4 text-center">
                    <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-bold mb-6 uppercase tracking-widest shadow-lg">
                        <Compass className="w-4 h-4 text-accent" />
                        <span>Katalog Layanan Selam</span>
                    </div>

                    <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-tight text-white drop-shadow-2xl mb-6">
                        Layanan <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-white font-sans">Selam</span> Kami
                    </h1>

                    <p className="text-lg md:text-xl text-gray-200 max-w-3xl mx-auto font-light drop-shadow-md leading-relaxed">
                        Temukan layanan kapal, guide atau instruktur selam, dan penyewaan alat selam yang tersedia di kawasan Lembeh.
                    </p>
                </div>
            </section>

            {/* Service Grid Section */}
            <section className="container mx-auto px-4 -mt-16 md:-mt-20 relative z-30 max-w-7xl">
                {(selectedType || selectedDate || selectedPax) && (
                    <div className="mb-6 rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
                        <p className="text-sm font-semibold text-slate-900">
                            Hasil pencarian
                            {selectedType ? ` untuk ${getServiceTypeLabel(selectedType)}` : ""}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                            {selectedDate ? `Tanggal: ${selectedDate}` : "Tanggal belum dipilih"}
                            {" - "}
                            {selectedPax ? `${selectedPax} penyelam` : "Jumlah penyelam belum dipilih"}
                        </p>
                    </div>
                )}

                {visibleServices && visibleServices.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 md:gap-10">
                        {visibleServices.map((service: Service) => (
                            <ServiceCard key={service.id} service={service} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-24 bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-gray-100 max-w-3xl mx-auto">
                        <Compass className="w-16 h-16 text-gray-300 mx-auto mb-6" />
                        <h2 className="text-2xl font-extrabold text-deepSea mb-2">
                            {selectedType ? `Belum ada ${getServiceTypeLabel(selectedType)} tersedia` : "Belum ada layanan tersedia"}
                        </h2>
                        <p className="text-gray-500 font-medium">
                            {selectedType
                                ? "Coba pilih tipe layanan lain atau kembali tanpa filter."
                                : "Paket selam premium akan segera hadir di katalog kami."}
                        </p>
                    </div>
                )}
            </section>
        </main>
    );
}
