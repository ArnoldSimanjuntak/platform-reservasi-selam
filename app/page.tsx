import HeroSection from "@/components/HeroSection";
import ServiceCard from "@/components/ServiceCard";
import type { Service } from "@/lib/supabase";

// Mock Data for demonstration (Lembeh Focused)
const mockServices: Service[] = [
  {
    id: "1",
    name: "Private Macro Photography Boat",
    type: "boat",
    price: 1500000,
    dive_site_category: "Muck",
    image_url: "https://images.unsplash.com/photo-1544551763-46a42a4636e2?q=80&w=2069&auto=format&fit=crop",
    description: "Kapal khusus fotografer dengan ruang kamera luas dan guide rasio 2:1."
  },
  {
    id: "2",
    name: "Master Guide - Nudibranch Specialist",
    type: "instructor",
    price: 750000,
    dive_site_category: "Muck",
    image_url: "https://images.unsplash.com/photo-1588615419958-392576dd2b38?q=80&w=1964&auto=format&fit=crop",
    description: "Guide lokal legendaris dengan mata elang untuk menemukan critters langka."
  },
  {
    id: "3",
    name: "Mawali Wreck Dive Trip",
    type: "boat",
    price: 1200000,
    dive_site_category: "Wreck",
    image_url: "https://images.unsplash.com/photo-1622329244247-d5d888127393?q=80&w=1934&auto=format&fit=crop",
    description: "Eksplorasi kapal karam Jepang Perang Dunia II di kedalaman 30m."
  },
  {
    id: "4",
    name: "Professional Macro Lens Rental",
    type: "gear",
    price: 350000,
    dive_site_category: "Muck", // Gear valid for muck
    image_url: "https://images.unsplash.com/photo-1627581134094-1cd74026bd2c?q=80&w=1974&auto=format&fit=crop",
    description: "Lensa makro 100mm f/2.8L untuk kamera Canon. Hasil tajam maksimal."
  },
];

export default function Home() {
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
          <button className="text-sm font-semibold text-primary hover:text-secondary transition-colors underline decoration-2 underline-offset-4">
            Lihat Semua Layanan
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {mockServices.map((service) => (
            <div key={service.id} className="h-full">
              <ServiceCard service={service} />
            </div>
          ))}
        </div>
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
