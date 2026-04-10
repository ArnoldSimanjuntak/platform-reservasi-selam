import { getServices } from "@/lib/supabase";
import ServiceCard from "@/components/ServiceCard";
import Link from "next/link";
import type { Service } from "@/lib/supabase";
import { Compass } from "lucide-react";

export const revalidate = 60; // Revalidate data every 60 seconds

export default async function ServicesPage() {
    // Fetch services dari Supabase menggunakan helper
    const { data: services, error } = await getServices();

    if (error) {
        console.error("Error fetching services:", error);
        return (
            <div className="container mx-auto px-4 py-32 text-center min-h-[60vh] flex flex-col items-center justify-center">
                <h1 className="text-3xl font-serif font-bold text-red-500 mb-4">Gagal memuat paket selam.</h1>
                <p className="text-gray-500">Silakan coba lagi nanti atau pastikan koneksi internet Anda stabil.</p>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-neutral-50 font-sans pb-32">
            {/* Elegant Premium Header Section */}
            <section className="relative w-full py-32 md:py-40 flex items-center justify-center overflow-hidden bg-deepSea">
                <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/coral/1920/1080')] bg-cover bg-center opacity-30" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-deepSea/80 to-neutral-50 z-10" />

                <div className="relative z-20 container mx-auto px-4 text-center">
                    <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-bold mb-6 uppercase tracking-widest shadow-lg">
                        <Compass className="w-4 h-4 text-accent" />
                        <span>Premium Experiences</span>
                    </div>

                    <h1 className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tight leading-tight text-white drop-shadow-2xl font-serif mb-6">
                        Layanan <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-white font-sans">Selam</span> Kami
                    </h1>

                    <p className="text-lg md:text-xl text-gray-200 max-w-3xl mx-auto font-light drop-shadow-md leading-relaxed">
                        Pilih paket selam terbaik di "The Critter Capital of The World". Dari perkenalan scuba (Discover Scuba), paket sertifikasi PADI, hingga sewa kapal privat khusus makro.
                    </p>
                </div>
            </section>

            {/* Service Grid Section */}
            <section className="container mx-auto px-4 -mt-16 md:-mt-20 relative z-30 max-w-7xl">
                {services && services.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 md:gap-10">
                        {services.map((service: Service) => (
                            <Link href={`/services/${service.id}`} key={service.id} className="block h-full group outline-none ring-0">
                                <ServiceCard service={service} />
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-24 bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-gray-100 max-w-3xl mx-auto">
                        <Compass className="w-16 h-16 text-gray-300 mx-auto mb-6" />
                        <h2 className="text-2xl font-serif font-bold text-deepSea mb-2">Belum ada layanan tersedia</h2>
                        <p className="text-gray-500 font-medium">Paket selam premium akan segera hadir di katalog kami.</p>
                    </div>
                )}
            </section>
        </main>
    );
}
