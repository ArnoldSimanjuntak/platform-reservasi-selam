export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NewServiceForm, { type ServiceFormInitialValue } from "../../new/NewServiceForm";

interface EditServicePageProps {
    params: {
        id: string;
    };
}

export default async function EditServicePage({ params }: EditServicePageProps) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/auth/login");
    }

    const { data: userRecord } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

    const role = userRecord?.role ?? user.user_metadata?.role;

    if (role === "admin") {
        redirect("/admin/services");
    }

    if (role !== "provider") {
        redirect("/dashboard");
    }

    const { data: provider } = await supabase
        .from("providers")
        .select("id, primary_type, verification_status, is_active")
        .eq("owner_user_id", user.id)
        .maybeSingle();

    if (!provider) {
        redirect("/dashboard/provider/setup?notice=Lengkapi+profil+bisnis+Anda+terlebih+dahulu.");
    }

    if (provider.verification_status !== "verified" || provider.is_active !== true) {
        redirect("/dashboard/provider/setup?notice=Akun+Anda+belum+terverifikasi+untuk+mengelola+layanan.");
    }

    const { data: service } = await supabase
        .from("services")
        .select("id, provider_id, name, type, price, max_capacity, description, dive_site_category, image_url, is_available")
        .eq("id", params.id)
        .eq("provider_id", provider.id)
        .maybeSingle();

    if (!service) {
        redirect("/dashboard/provider/services?error=Layanan+tidak+ditemukan+atau+Anda+tidak+punya+akses.");
    }

    const initialService: ServiceFormInitialValue = {
        id: service.id,
        name: service.name,
        type: service.type,
        price: Number(service.price),
        max_capacity: Number(service.max_capacity),
        description: service.description,
        dive_site_category: service.dive_site_category,
        image_url: service.image_url,
        is_available: service.is_available,
    };

    return (
        <NewServiceForm
            isAdmin={false}
            providerId={provider.id}
            providerPrimaryType={provider.primary_type}
            mode="edit"
            initialService={initialService}
        />
    );
}
