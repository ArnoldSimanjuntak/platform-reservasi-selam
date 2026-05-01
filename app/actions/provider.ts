"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
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

    // ─── 2. Ekstrak input dasar ───────────────────────────────
    const name = (formData.get("name") as string)?.trim();
    const location = (formData.get("location") as string)?.trim();
    const contact = (formData.get("contact") as string)?.trim();
    const description = (formData.get("description") as string)?.trim();
    const primaryType = (formData.get("primary_type") as string)?.trim();

    if (!name || name.length < 3) {
        return { success: false, message: "Nama usaha wajib diisi (minimal 3 karakter)." };
    }
    if (!location) {
        return { success: false, message: "Lokasi pangkalan/dermaga wajib diisi." };
    }
    if (!contact) {
        return { success: false, message: "Nomor WhatsApp wajib diisi." };
    }
    if (!primaryType) {
        return { success: false, message: "Tipe layanan utama wajib dipilih." };
    }

    // ─── 3. Upload File Verifikasi (KTP & Sertifikasi) ────────
    const idCardFile = formData.get("identity_card") as File | null;
    const certFile = formData.get("certification") as File | null;

    if (!idCardFile || idCardFile.size === 0) {
        return { success: false, message: "KTP/Identitas wajib diunggah." };
    }

    if (primaryType === "instructor" && (!certFile || certFile.size === 0)) {
        return { success: false, message: "Sertifikasi selam wajib diunggah untuk instruktur." };
    }

    let identityCardUrl = null;
    let certificationUrl = null;

    try {
        // Upload KTP — path deterministik agar upsert storage bisa menimpa file lama
        // Menggunakan user.id sebagai folder dan nama file tetap (tanpa timestamp)
        // sehingga update profil tidak membuat dokumen baru yang membingungkan Admin.
        const idExt = idCardFile.name.split(".").pop();
        const idPath = `${user.id}/ktp.${idExt}`;
        const { error: idUploadError } = await supabase.storage
            .from("provider-documents")
            .upload(idPath, idCardFile, {
                upsert: true,  // Timpa file lama jika sudah ada — hindari duplikat
                cacheControl: "no-cache",
            });

        if (idUploadError) throw idUploadError;
        const { data: idUrlData } = supabase.storage.from("provider-documents").getPublicUrl(idPath);
        identityCardUrl = idUrlData.publicUrl;

        // Upload Certification (if instructor) — sama, path deterministik
        if (primaryType === "instructor" && certFile) {
            const certExt = certFile.name.split(".").pop();
            const certPath = `${user.id}/cert.${certExt}`;
            const { error: certUploadError } = await supabase.storage
                .from("provider-documents")
                .upload(certPath, certFile, {
                    upsert: true,  // Timpa file lama
                    cacheControl: "no-cache",
                });
            
            if (certUploadError) throw certUploadError;
            const { data: certUrlData } = supabase.storage.from("provider-documents").getPublicUrl(certPath);
            certificationUrl = certUrlData.publicUrl;
        }
    } catch (err: any) {
        console.error("Storage upload error:", err);
        return {
            success: false,
            message: "Gagal mengunggah dokumen. Pastikan Anda telah membuat bucket 'provider-documents'. Error: " + err.message,
        };
    }

    // ─── 4. Upsert ke tabel providers ─────────────────────────
    const latStr = formData.get("latitude") as string | null;
    const lngStr = formData.get("longitude") as string | null;
    
    const latitude = latStr ? parseFloat(latStr) : null;
    const longitude = lngStr ? parseFloat(lngStr) : null;

    const { error: upsertError } = await supabase
        .from("providers")
        .upsert(
            {
                owner_user_id: user.id,
                name,
                location,
                latitude,
                longitude,
                contact,
                description: description || null,
                primary_type: primaryType,
                identity_card_url: identityCardUrl,
                certification_url: certificationUrl,
                is_active: true, // Profil lengkap → aktif di marketplace (tapi butuh verifikasi)
                verification_status: 'pending',
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

    // ─── 4. Revalidasi cache & redirect ke dashboard provider ─
    revalidatePath("/dashboard");
    redirect("/dashboard");
}

// ─── Admin verification action ───────────────────────────────────
export async function verifyProviderIdentity(
    providerId: string,
    action: "approve" | "reject"
): Promise<{ success: boolean; message: string }> {
    const supabase = await createClient();

    // 1. Verify caller is Admin
    let user;
    try {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        user = authUser;
    } catch {
        return { success: false, message: "Koneksi ke server autentikasi gagal. Coba lagi." };
    }

    if (!user) return { success: false, message: "Unauthorized." };

    let userRecord;
    try {
        const { data, error } = await supabase.from("users").select("role").eq("id", user.id).single();
        if (error) throw error;
        userRecord = data;
    } catch {
        // Fallback ke metadata jika DB tidak bisa diakses
        if (user.user_metadata?.role !== "admin") {
            return { success: false, message: "Koneksi ke database gagal. Coba lagi." };
        }
    }

    if (userRecord?.role !== "admin" && user.user_metadata?.role !== "admin") {
        return { success: false, message: "Hanya Admin yang dapat memverifikasi provider." };
    }

    // 2. Update status verifikasi + is_active (approve juga mengaktifkan provider)
    const updatePayload =
        action === "approve"
            ? { verification_status: "verified", is_active: true }
            : { verification_status: "rejected", is_active: false };

    try {
        const { error } = await supabase
            .from("providers")
            .update(updatePayload)
            .eq("id", providerId);

        if (error) throw error;
    } catch (err: any) {
        console.error("[verifyProviderIdentity] DB update error:", err);
        return {
            success: false,
            message: `Gagal menyimpan ke database: ${err.message || "Periksa koneksi internet Anda."}`,
        };
    }

    // 3. Revalidasi semua rute Admin yang terkait agar Next.js hapus cache lama
    revalidatePath("/admin/verifikasi");
    revalidatePath("/admin");
    revalidatePath("/admin/services");
    revalidatePath("/admin/orders");
    revalidatePath("/dashboard");

    return {
        success: true,
        message: `Provider berhasil di-${action === "approve" ? "verifikasi" : "tolak"}.`,
    };
}
