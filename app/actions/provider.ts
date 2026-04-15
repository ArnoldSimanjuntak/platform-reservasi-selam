"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface ProviderSetupResult {
    success: boolean;
    message: string;
}

/**
 * Server Action: Melengkapi profil bisnis provider.
 *
 * Alur:
 * 1. Verifikasi user yang sedang login
 * 2. Validasi input form (nama usaha wajib diisi)
 * 3. Upsert ke tabel providers berdasarkan owner_user_id
 *    - Jika skeleton row sudah ada dari signUp → UPDATE
 *    - Jika belum ada (edge case) → INSERT
 * 4. Set is_active = true (profil lengkap, siap tampil di marketplace)
 * 5. Redirect ke dashboard utama
 */
export async function setupProviderProfile(
    formData: FormData
): Promise<ProviderSetupResult> {
    const supabase = await createClient();

    // ─── 1. Verifikasi autentikasi ────────────────────────────
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/auth/login");
    }

    // ─── 2. Ekstrak & validasi input ──────────────────────────
    const name = (formData.get("name") as string)?.trim();
    const location = (formData.get("location") as string)?.trim();
    const contact = (formData.get("contact") as string)?.trim();
    const description = (formData.get("description") as string)?.trim();

    if (!name || name.length < 3) {
        return {
            success: false,
            message: "Nama usaha wajib diisi (minimal 3 karakter).",
        };
    }

    if (!location) {
        return {
            success: false,
            message: "Lokasi pangkalan/dermaga wajib diisi.",
        };
    }

    if (!contact) {
        return {
            success: false,
            message: "Nomor WhatsApp wajib diisi.",
        };
    }

    // ─── 3. Upsert ke tabel providers ─────────────────────────
    // Menggunakan upsert agar aman: jika skeleton row dari signUp
    // sudah ada, ia akan di-UPDATE. Jika belum → INSERT baru.
    const { error: upsertError } = await supabase
        .from("providers")
        .upsert(
            {
                owner_user_id: user.id,
                name,
                location,
                contact,
                description: description || null,
                is_active: true, // Profil lengkap → aktif di marketplace
            },
            {
                onConflict: "owner_user_id",
            }
        );

    if (upsertError) {
        console.error("Gagal menyimpan profil provider:", upsertError.message);
        return {
            success: false,
            message:
                "Gagal menyimpan profil bisnis Anda. Silakan coba lagi. (" +
                upsertError.message +
                ")",
        };
    }

    // ─── 4. Redirect ke dashboard provider ────────────────────
    redirect("/dashboard");
}
