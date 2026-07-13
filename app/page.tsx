import HeroBooking from "@/components/HeroBooking";
import PremiumServiceCard from "@/components/PremiumServiceCard";
import MapWrapper from "@/components/MapWrapper";
import Link from "next/link";
import { getServices } from "@/lib/supabase";
import type { Service } from "@/lib/supabase";
import { Camera, UserCheck, Waves } from "lucide-react";

export const revalidate = 60;

export default async function Home() {
    const { data: services, error } = await getServices();

    return (
        <main className="min-h-screen pb-20 bg-neutral-50 font-sans selection:bg-primary/20">
            <HeroBooking />

            {/* Map Section: Discover The Critter Capital */}
            <section id="locations" className="bg-white py-20 md:py-28 border-b border-gray-100">
                <div className="container mx-auto px-4 max-w-6xl text-center">
                    <span className="text-secondary font-bold uppercase tracking-widest text-xs mb-3 block">Peta Interaktif</span>
                    <h2 className="text-3xl md:text-5xl font-extrabold text-deepSea mb-5 tracking-tight">
                        Jelajahi Titik Selam Lembeh
                    </h2>
                    <p className="max-w-2xl mx-auto text-slate-500 text-base mb-10">
                        Lihat persebaran dive site, area keberangkatan, dan titik populer sebelum memilih layanan selam.
                    </p>
                    
                    <div className="w-full h-[65vh] min-h-[450px] rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(2,62,138,0.12)] border border-slate-200 bg-gray-50">
                        <MapWrapper />
                    </div>
                    <p className="mt-6 text-gray-500 text-sm font-medium">
                        Gunakan peta ini untuk membandingkan lokasi sebelum membuat pesanan.
                    </p>
                </div>
            </section>

            {/* Featured Services Section */}
            <section id="services" className="container mx-auto px-4 py-24 md:py-32 max-w-7xl">
                <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
                    <div>
                        <span className="text-secondary font-bold uppercase tracking-widest text-xs mb-3 block">Layanan Tersedia</span>
                        <h2 className="text-3xl md:text-5xl font-extrabold text-deepSea leading-tight tracking-tight">
                            Paket Selam <br />
                            <span className="text-primary">Pilihan</span>
                        </h2>
                    </div>
                    <Link
                        href="/services"
                        className="group flex items-center gap-3 text-sm font-bold text-primary hover:text-deepSea transition-colors uppercase tracking-wider mb-2"
                    >
                        Lihat Semua Layanan
                        <span className="w-10 h-[2px] bg-primary group-hover:w-16 transition-all duration-300" />
                    </Link>
                </div>

                {error ? (
                    <div className="text-center py-20 bg-white rounded-3xl shadow-sm border border-red-100">
                        <p className="text-red-500 font-semibold text-xl mb-2">Gagal memuat layanan.</p>
                        <p className="text-gray-500">Silakan coba lagi nanti atau periksa koneksi internet Anda.</p>
                    </div>
                ) : services && services.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-10 mt-8">
                        {services.slice(0, 4).map((service: Service) => (
                            <PremiumServiceCard key={service.id} service={service} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-24 bg-white rounded-3xl shadow-sm border border-gray-100">
                        <p className="text-gray-500 text-xl font-medium">Belum ada layanan tersedia saat ini.</p>
                        <p className="text-gray-400 mt-2">Layanan baru akan ditampilkan setelah tersedia.</p>
                    </div>
                )}
            </section>

            {/* Why Choose Us / Value Prop for Lembeh */}
            <section className="bg-slate-50 py-20 md:py-28">
                <div className="container mx-auto px-4 max-w-5xl text-center">
                    <span className="text-secondary font-bold uppercase tracking-widest text-xs mb-3 block">Keunggulan Platform</span>
                    <h2 className="text-3xl md:text-5xl font-extrabold text-deepSea mb-14 tracking-tight">
                        Pengalaman Selam yang Lebih Terarah
                    </h2>
                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="p-7 bg-white rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg transition-shadow duration-300 group">
                            <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-5 text-primary">
                                <Waves className="w-7 h-7" />
                            </div>
                            <h3 className="text-lg font-bold mb-3 text-deepSea">Critter Capital</h3>
                            <p className="text-gray-500 leading-relaxed">Rumah bagi mimic octopus, hairy frogfish, dan pygmy seahorse.</p>
                        </div>
                        <div className="p-7 bg-white rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg transition-shadow duration-300 group">
                            <div className="w-14 h-14 bg-cyan-50 rounded-xl flex items-center justify-center mx-auto mb-5 text-cyan-700">
                                <Camera className="w-7 h-7" />
                            </div>
                            <h3 className="text-lg font-bold mb-3 text-deepSea">Surga Fotografer</h3>
                            <p className="text-gray-500 leading-relaxed">Arus tenang dan dasar pasir hitam, kondisi sempurna untuk foto makro resolusi tinggi.</p>
                        </div>
                        <div className="p-7 bg-white rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg transition-shadow duration-300 group">
                            <div className="w-14 h-14 bg-emerald-50 rounded-xl flex items-center justify-center mx-auto mb-5 text-emerald-700">
                                <UserCheck className="w-7 h-7" />
                            </div>
                            <h3 className="text-lg font-bold mb-3 text-deepSea">Guide Ahli</h3>
                            <p className="text-gray-500 leading-relaxed">Guide kami terlatih khusus untuk menemukan hewan unik berukuran milimeter.</p>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
