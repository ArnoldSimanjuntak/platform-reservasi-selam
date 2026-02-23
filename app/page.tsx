import HeroSection from "@/components/HeroSection";
import ServiceCard from "@/components/ServiceCard";
import Link from "next/link";
import { getServices } from "@/lib/supabase";
import type { Service } from "@/lib/supabase";

// Revalidate data setiap 60 detik (ISR)
export const revalidate = 60;

export default async function Home() {
  // Fetch services dari Supabase
  const { data: services, error } = await getServices();

  return (
    <main className="min-h-screen pb-20 bg-neutral">
      <HeroSection />

      {/* Featured Services Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-4">
          <div>
            <span className="text-secondary font-semibold uppercase tracking-wider text-sm">Best of Lembeh</span>
            <h2 className="text-3xl md:text-4xl font-bold text-deepSea mt-1">
              Paket Spesial <br />
              <span className="text-primary">Minggu Ini</span>
            </h2>
          </div>
          <Link
            href="/services"
            className="text-sm font-semibold text-primary hover:text-secondary transition-colors underline decoration-2 underline-offset-4"
          >
            Lihat Semua Layanan
          </Link>
        </div>

        {error ? (
          <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-red-100">
            <p className="text-red-500 font-semibold text-lg mb-2">Gagal memuat layanan.</p>
            <p className="text-gray-500 text-sm">Silakan coba lagi nanti atau periksa koneksi internet Anda.</p>
          </div>
        ) : services && services.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {services.map((service: Service) => (
              <Link key={service.id} href={`/services/${service.id}`} className="h-full block">
                <ServiceCard service={service} />
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-2xl shadow-sm">
            <p className="text-gray-500 text-lg">Belum ada layanan tersedia saat ini.</p>
            <p className="text-gray-400 text-sm mt-2">Layanan baru akan segera ditambahkan.</p>
          </div>
        )}
      </section>

      {/* Why Choose Us / Value Prop for Lembeh */}
      <section className="bg-gradient-to-b from-white to-accent/20 py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-deepSea mb-12">Kenapa Diving di Lembeh?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-6 bg-white rounded-2xl shadow-sm border border-neutral-100">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-primary text-3xl">🐙</div>
              <h3 className="text-xl font-bold mb-2">Critter Capital</h3>
              <p className="text-gray-600">Rumah bagi mimic octopus, hairy frogfish, dan pygmy seahorse.</p>
            </div>
            <div className="p-6 bg-white rounded-2xl shadow-sm border border-neutral-100">
              <div className="w-16 h-16 bg-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-teal-600 text-3xl">📸</div>
              <h3 className="text-xl font-bold mb-2">Surga Fotografer</h3>
              <p className="text-gray-600">Arus tenang dan dasar pasir hitam, kondisi sempurna untuk foto makro.</p>
            </div>
            <div className="p-6 bg-white rounded-2xl shadow-sm border border-neutral-100">
              <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-purple-600 text-3xl">👨‍✈️</div>
              <h3 className="text-xl font-bold mb-2">Guide Ahli</h3>
              <p className="text-gray-600">Guide kami terlatih khusus untuk menemukan hewan unik berukuran milimeter.</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
