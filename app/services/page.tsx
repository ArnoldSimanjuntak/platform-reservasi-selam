import { supabase } from "@/lib/supabase";
import ServiceCard from "@/components/ServiceCard";
import type { Service } from "@/lib/supabase";

export const revalidate = 60; // Revalidate data every 60 seconds

export default async function ServicesPage() {
    // Fetch services from Supabase
    const { data: services, error } = await supabase
        .from("services")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching services:", error);
        return (
            <div className="container mx-auto px-4 py-20 text-center">
                <h1 className="text-2xl font-bold text-red-500">Gagal memuat layanan.</h1>
                <p className="text-gray-600">Silakan coba lagi nanti.</p>
            </div>
        );
    }

    return (
        <main className="min-h-screen pt-24 pb-20 bg-gray-50">
            <div className="container mx-auto px-4">
                <div className="mb-10 text-center">
                    <h1 className="text-4xl font-bold text-deepSea mb-4">
                        Layanan Selam Kami
                    </h1>
                    <p className="text-gray-600 max-w-2xl mx-auto">
                        Pilih paket selam terbaik di Selat Lembeh. Dari sewa kapal khusus,
                        guide spesialis makro, hingga peralatan fotografi lengkap.
                    </p>
                </div>

                {services && services.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
                        {services.map((service: Service) => (
                            <div key={service.id} className="h-full">
                                <ServiceCard service={service} />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-white rounded-2xl shadow-sm">
                        <p className="text-gray-500 text-lg">Belum ada layanan tersedia.</p>
                    </div>
                )}
            </div>
        </main>
    );
}
