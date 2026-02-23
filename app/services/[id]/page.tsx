import { notFound } from "next/navigation";
import { getServiceById } from "@/lib/supabase";
import ServiceDetailClient from "@/components/ServiceDetailClient";
import type { Metadata } from "next";

// Force dynamic rendering since we fetch specific IDs
export const dynamic = "force-dynamic";

interface PageProps {
    params: Promise<{ id: string }>;
}

// Generate dynamic metadata based on fetched service data
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { id } = await params;
    const { data: service } = await getServiceById(id);

    if (!service) {
        return { title: "Layanan Tidak Ditemukan - SulutDive" };
    }

    return {
        title: `${service.name} - SulutDive Lembeh`,
        description: service.description || `Detail layanan ${service.name} di Selat Lembeh, Bitung.`,
    };
}

export default async function ServiceDetailPage({ params }: PageProps) {
    const { id } = await params;

    // Fetch service dari Supabase menggunakan helper function
    const { data: service, error } = await getServiceById(id);

    // Jika error atau data tidak ditemukan, tampilkan halaman 404
    if (error || !service) {
        console.error("Error fetching service:", error?.message || "Data tidak ditemukan");
        notFound();
    }

    return <ServiceDetailClient service={service} />;
}
