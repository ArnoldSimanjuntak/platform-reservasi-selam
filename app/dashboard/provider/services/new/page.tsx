// â”€â”€â”€ Server Component â€” auth guard + verification check â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// force-dynamic: status verifikasi harus selalu fresh dari DB, jangan pakai cache.
export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NewServiceForm from "./NewServiceForm";

export default async function NewServicePage() {
    const supabase = await createClient();

    // â”€â”€â”€ 1. Verifikasi sesi â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/auth/login");
    }

    // â”€â”€â”€ 2. Ambil role dari DB (ground truth, bukan hanya metadata) â”€â”€
    const { data: userRecord } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

    const role = userRecord?.role ?? user.user_metadata?.role;

    if (role === "admin") {
        redirect("/admin/services");
    }

    // â”€â”€â”€ 4. Non-admin: harus role 'provider' â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (role !== "provider") {
        redirect("/dashboard");
    }

    // â”€â”€â”€ 5. Cek status verifikasi provider secara real-time dari DB â”€
    // (force-dynamic memastikan baris ini selalu berjalan, tidak terpakai cache)
    const { data: provider } = await supabase
        .from("providers")
        .select("id, verification_status, is_active")
        .eq("owner_user_id", user.id)
        .single();

    // Jika profil provider belum dibuat sama sekali â†’ paksa ke setup
    if (!provider) {
        redirect("/dashboard/provider/setup?notice=Lengkapi+profil+bisnis+Anda+terlebih+dahulu.");
    }

    // â”€â”€â”€ 6. Blokir akses jika belum terverifikasi â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Hanya provider yang sudah 'verified' DAN is_active yang boleh tambah layanan.
    const isVerified =
        provider.verification_status === "verified" && provider.is_active === true;

    if (!isVerified) {
        const statusMsg =
            provider.verification_status === "rejected"
                ? "Akun+Anda+ditolak+oleh+Admin.+Silakan+hubungi+support."
                : "Akun+Anda+sedang+menunggu+verifikasi+Admin.";
        redirect(`/dashboard/provider/setup?notice=${statusMsg}`);
    }

    // â”€â”€â”€ 7. Semua validasi lulus â†’ render form â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    return <NewServiceForm isAdmin={false} providerId={provider.id} />;
}
