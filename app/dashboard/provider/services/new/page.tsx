// ─── Server Component — auth guard + verification check ───────────────────
// force-dynamic: status verifikasi harus selalu fresh dari DB, jangan pakai cache.
export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NewServiceForm from "./NewServiceForm";

export default async function NewServicePage() {
    const supabase = await createClient();

    // ─── 1. Verifikasi sesi ──────────────────────────────────────
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/auth/login");
    }

    // ─── 2. Ambil role dari DB (ground truth, bukan hanya metadata) ──
    const { data: userRecord } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

    const role = userRecord?.role ?? user.user_metadata?.role;

    // ─── 3. Admin Bypass: Admin tidak perlu cek tabel providers ─────
    // Admin bisa menambah layanan contoh / demo tanpa perlu jadi provider.
    if (role === "admin") {
        // Langsung render form, lewati seluruh pengecekan provider
        return <NewServiceForm isAdmin={true} providerId={null} />;
    }

    // ─── 4. Non-admin: harus role 'provider' ───────────────────────
    if (role !== "provider") {
        redirect("/dashboard");
    }

    // ─── 5. Cek status verifikasi provider secara real-time dari DB ─
    // (force-dynamic memastikan baris ini selalu berjalan, tidak terpakai cache)
    const { data: provider } = await supabase
        .from("providers")
        .select("id, verification_status, is_active")
        .eq("owner_user_id", user.id)
        .single();

    // Jika profil provider belum dibuat sama sekali → paksa ke setup
    if (!provider) {
        redirect("/dashboard/provider/setup?notice=Lengkapi+profil+bisnis+Anda+terlebih+dahulu.");
    }

    // ─── 6. Blokir akses jika belum terverifikasi ──────────────────
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

    // ─── 7. Semua validasi lulus → render form ─────────────────────
    return <NewServiceForm isAdmin={false} providerId={provider.id} />;
}
