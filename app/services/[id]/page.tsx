import { notFound } from "next/navigation";
import { getServiceById, getDiveSites } from "@/lib/supabase";
import { createClient } from "@/lib/supabase/server";
import ServiceDetailClient from "@/components/ServiceDetailClient";
import type { Metadata } from "next";

// Force dynamic rendering — needs auth check + specific service ID
export const dynamic = "force-dynamic";

interface PageProps {
    params: Promise<{ id: string }>;
    searchParams?: Promise<{
        dive_site?: string;
        date?: string;
        pax?: string;
        rental_days?: string;
    }>;
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

export default async function ServiceDetailPage({ params, searchParams }: PageProps) {
    const { id } = await params;
    const requested = (await searchParams) ?? {};

    // Fetch service data
    const { data: service, error } = await getServiceById(id);

    if (error || !service) {
        console.error("Error fetching service:", error?.message || "Data tidak ditemukan");
        notFound();
    }

    if (
        !service.provider ||
        service.provider.verification_status !== "verified" ||
        service.provider.is_active !== true
    ) {
        notFound();
    }

    // Fetch dive sites if service is a boat
    let diveSites = [];
    if (service.type === "boat") {
        const { data } = await getDiveSites();
        if (data) diveSites = data;
    }

    const initialDiveSiteId = service.type === "boat" && diveSites.some((site) => site.id === requested.dive_site)
        ? requested.dive_site
        : undefined;
    const initialDate = /^\d{4}-\d{2}-\d{2}$/.test(requested.date || "")
        ? requested.date
        : undefined;
    const parsedPax = Number.parseInt(requested.pax || "", 10);
    const initialPax = Number.isInteger(parsedPax) && parsedPax >= 1
        ? Math.min(parsedPax, service.max_capacity)
        : undefined;
    const parsedRentalDays = Number.parseInt(requested.rental_days || "", 10);
    const initialRentalDays = Number.isInteger(parsedRentalDays) && parsedRentalDays >= 1
        ? Math.min(parsedRentalDays, 30)
        : undefined;

    // ─── Auth check di server (middleware sudah refresh cookies) ──
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    // Ambil role dari DB untuk keperluan Mode Admin
    let initialUserRole = "customer";
    if (user) {
        const { data: userRecord } = await supabase
            .from("users")
            .select("role")
            .eq("id", user.id)
            .single();
        initialUserRole = userRecord?.role || user.user_metadata?.role || "customer";
    }

    return (
        <ServiceDetailClient
            service={service}
            initialIsLoggedIn={!!user}
            initialUserRole={initialUserRole}
            diveSites={diveSites}
            initialDiveSiteId={initialDiveSiteId}
            initialDate={initialDate}
            initialPax={initialPax}
            initialRentalDays={initialRentalDays}
        />
    );
}
