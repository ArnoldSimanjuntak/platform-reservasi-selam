import HeroBooking from "@/components/HeroBooking";
import PremiumServiceCard from "@/components/PremiumServiceCard";
import MapWrapper from "@/components/MapWrapper";
import Link from "next/link";
import { getServices } from "@/lib/supabase";
import type { Service } from "@/lib/supabase";

// Revalidate data setiap 60 detik (ISR)
export const revalidate = 60;

export default async function Home() {
    // Fetch services dari Supabase
    const { data: services, error } = await getServices();

    return (
        <main className="min-h-screen pb-20 bg-neutral-50 font-sans selection:bg-primary/20">
            <HeroBooking />

            {/* Map Section: Discover The Critter Capital */}
            <section className="bg-white py-24 md:py-32 border-b border-gray-100">
                <div className="container mx-auto px-4 max-w-6xl text-center">
                    <span className="text-accent font-bold uppercase tracking-widest text-xs mb-3 block">Interactive Guide</span>
                    <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-deepSea mb-12">
                        Discover The Critter Capital <br className="hidden md:block" /> of The World
                    </h2>
                    
                    <div className="w-full h-[65vh] min-h-[450px] rounded-[2rem] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-gray-100 bg-gray-50 transform hover:scale-[1.01] transition-transform duration-700">
                        <MapWrapper />
                    </div>
                    <p className="mt-6 text-gray-500 text-sm font-medium">
                        Explore our curated map to find the perfect muck diving locations.
                    </p>
                </div>
            </section>

            {/* Featured Services Section */}
            <section className="container mx-auto px-4 py-24 md:py-32 max-w-7xl">
                <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
                    <div>
                        <span className="text-accent font-bold uppercase tracking-widest text-xs mb-3 block">Curated Experiences</span>
                        <h2 className="text-4xl md:text-5xl font-serif font-bold text-deepSea leading-tight">
                            Premium Dive <br />
                            <span className="text-primary font-sans">Packages</span>
                        </h2>
                    </div>
                    <Link
                        href="/services"
                        className="group flex items-center gap-3 text-sm font-bold text-primary hover:text-deepSea transition-colors uppercase tracking-wider mb-2"
                    >
                        Explore All Packages
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
                            <Link key={service.id} href={`/services/${service.id}`} className="block h-full">
                                <PremiumServiceCard service={service} />
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-24 bg-white rounded-3xl shadow-sm border border-gray-100">
                        <p className="text-gray-500 text-xl font-medium">Belum ada layanan tersedia saat ini.</p>
                        <p className="text-gray-400 mt-2">Premium dive packages will be added soon.</p>
                    </div>
                )}
            </section>

            {/* Why Choose Us / Value Prop for Lembeh */}
            <section className="bg-gradient-to-b from-white to-[#023E8A]/5 py-24 md:py-32">
                <div className="container mx-auto px-4 max-w-5xl text-center">
                    <span className="text-accent font-bold uppercase tracking-widest text-xs mb-3 block">Why Choose Us</span>
                    <h2 className="text-4xl md:text-5xl font-serif font-bold text-deepSea mb-16">
                        The Lembeh Experience
                    </h2>
                    <div className="grid md:grid-cols-3 gap-10">
                        <div className="p-8 bg-white/50 backdrop-blur-sm rounded-3xl shadow-sm border border-white hover:bg-white hover:shadow-xl transition-all duration-500 group">
                            <div className="w-20 h-20 bg-blue-50/80 rounded-2xl flex items-center justify-center mx-auto mb-6 text-3xl group-hover:scale-110 transition-transform duration-500">🐙</div>
                            <h3 className="text-xl font-bold mb-3 font-serif">Critter Capital</h3>
                            <p className="text-gray-500 leading-relaxed">Rumah bagi mimic octopus, hairy frogfish, dan pygmy seahorse.</p>
                        </div>
                        <div className="p-8 bg-white/50 backdrop-blur-sm rounded-3xl shadow-sm border border-white hover:bg-white hover:shadow-xl transition-all duration-500 group">
                            <div className="w-20 h-20 bg-teal-50/80 rounded-2xl flex items-center justify-center mx-auto mb-6 text-3xl group-hover:scale-110 transition-transform duration-500">📸</div>
                            <h3 className="text-xl font-bold mb-3 font-serif">Surga Fotografer</h3>
                            <p className="text-gray-500 leading-relaxed">Arus tenang dan dasar pasir hitam, kondisi sempurna untuk foto makro resolusi tinggi.</p>
                        </div>
                        <div className="p-8 bg-white/50 backdrop-blur-sm rounded-3xl shadow-sm border border-white hover:bg-white hover:shadow-xl transition-all duration-500 group">
                            <div className="w-20 h-20 bg-purple-50/80 rounded-2xl flex items-center justify-center mx-auto mb-6 text-3xl group-hover:scale-110 transition-transform duration-500">👨‍✈️</div>
                            <h3 className="text-xl font-bold mb-3 font-serif">Guide Ahli</h3>
                            <p className="text-gray-500 leading-relaxed">Guide kami terlatih khusus untuk menemukan hewan unik berukuran milimeter.</p>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
