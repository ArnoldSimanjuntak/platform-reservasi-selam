import { redirect } from "next/navigation";
import { getDiveSiteById, getBoatServices } from "@/lib/supabase";
import { createClient } from "@/lib/supabase/server";
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

    if (!diveSiteId) {
        redirect("/lokasi");
    }

    const { data: diveSite, error: siteError } = await getDiveSiteById(diveSiteId);

    if (siteError || !diveSite) {
        redirect("/lokasi");
    }

    const { data: services } = await getBoatServices();

    // ─── Auth check di server (reliable, dari httpOnly cookies via middleware) ─
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    return (
        <BookingPageClient
            diveSite={diveSite}
            services={services || []}
            initialIsLoggedIn={!!user}
        />
    );
}
