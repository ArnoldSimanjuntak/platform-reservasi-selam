import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Pilih Layanan Kapal - SulutDive Lembeh",
    description: "Pilih layanan kapal dari katalog SulutDive sebelum melakukan booking.",
};

export const dynamic = "force-dynamic";

interface BookingPageProps {
    searchParams: Promise<{ dive_site?: string }>;
}

export default async function BookingPage({ searchParams }: BookingPageProps) {
    const { dive_site: diveSiteId } = await searchParams;
    const params = new URLSearchParams({ type: "boat" });

    if (diveSiteId) {
        params.set("dive_site", diveSiteId);
    }

    redirect(`/services?${params.toString()}`);
}
