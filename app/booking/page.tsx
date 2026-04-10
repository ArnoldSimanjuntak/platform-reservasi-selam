import { redirect } from "next/navigation";
import { getDiveSiteById, getBoatServices } from "@/lib/supabase";
import BookingPageClient from "./booking-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Booking Kapal - SulutDive Lembeh",
    description: "Pesan kapal selam ke spot pilihan Anda di Selat Lembeh.",
};

export const dynamic = "force-dynamic";

interface BookingPageProps {
    searchParams: Promise<{ dive_site?: string }>;
}

export default async function BookingPage({ searchParams }: BookingPageProps) {
    const { dive_site: diveSiteId } = await searchParams;

    // Jika tidak ada dive_site param, redirect ke halaman lokasi
    if (!diveSiteId) {
        redirect("/lokasi");
    }

    // Fetch dive site detail
    const { data: diveSite, error: siteError } = await getDiveSiteById(diveSiteId);

    if (siteError || !diveSite) {
        redirect("/lokasi");
    }

    // Fetch available boat services
    const { data: services } = await getBoatServices();

    return (
        <BookingPageClient
            diveSite={diveSite}
            services={services || []}
        />
    );
}
