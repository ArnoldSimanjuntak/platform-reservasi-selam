import { notFound } from "next/navigation";
import { getServiceById, getDiveSites } from "@/lib/supabase";
import { createClient } from "@/lib/supabase/server";
import ServiceDetailClient from "@/components/ServiceDetailClient";
import type { Metadata } from "next";

// Force dynamic rendering — needs auth check + specific service ID
export const dynamic = "force-dynamic";

interface PageProps {
    params: Promise<{ id: string }>;
}

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

    // Fetch service data
    const { data: service, error } = await getServiceById(id);

    if (error || !service) {
        console.error("Error fetching service:", error?.message || "Data tidak ditemukan");
        notFound();
    }

    // Fetch dive sites if service is a boat
    let diveSites = [];
    if (service.type === "boat") {
        const { data } = await getDiveSites();
        if (data) diveSites = data;
    }

    // ─── Auth check di server (middleware sudah refresh cookies) ──
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    return (
        <ServiceDetailClient
            service={service}
            initialIsLoggedIn={!!user}
            userId={user?.id || null}
            diveSites={diveSites}
        />
    );
}
