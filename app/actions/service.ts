"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface CreateServiceResult {
    success: boolean;
    message: string;
}

/**
 * Server Action: Menambah layanan baru untuk provider.
 *
 * Alur:
 * 1. Verifikasi user yang sedang login
 * 2. Ambil provider_id dari tabel providers via owner_user_id
 * 3. Validasi input form
 * 4. Upload gambar ke Supabase Storage (jika ada)
 * 5. INSERT ke tabel services dengan provider_id otomatis
 * 6. Revalidasi cache & redirect ke daftar layanan
 */
export async function createService(
    formData: FormData
): Promise<CreateServiceResult> {
    const supabase = await createClient();

    // ─── 1. Verifikasi autentikasi ────────────────────────────
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/auth/login");
    }

    // ─── 2. Ambil role user untuk menentukan alur ─────────────
    const { data: userRecord } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

    const role = userRecord?.role ?? user.user_metadata?.role;

    // ─── 3. Resolve provider_id berdasarkan role ──────────────
    // Admin Bypass: Admin tidak wajib punya baris di tabel providers.
    // Mereka bisa membuat layanan demo/contoh langsung.
    // Provider biasa harus punya profil verified di tabel providers.
    let resolvedProviderId: string | null = null;

    if (role === "admin") {
        // Admin: baca override jika ada (dikirim dari Server Component)
        const override = (formData.get("_provider_id_override") as string) || null;
        resolvedProviderId = override || null;
        // Admin tetap bisa insert meski resolvedProviderId null —
        // layanan akan muncul tanpa provider owner (katalog global)
    } else {
        // Provider biasa: wajib punya baris di tabel providers
        const { data: provider } = await supabase
            .from("providers")
            .select("id, verification_status, is_active")
            .eq("owner_user_id", user.id)
            .single();

        if (!provider) {
            return {
                success: false,
                message: "Profil bisnis Anda belum lengkap. Silakan lengkapi terlebih dahulu.",
            };
        }

        // Double-check verifikasi di sisi Server Action (defense in depth)
        // Halaman sudah memblokir akses, tapi ini failsafe jika bypass URL langsung
        if (provider.verification_status !== "verified" || !provider.is_active) {
            return {
                success: false,
                message: "Akun Anda belum diverifikasi oleh Admin. Silakan tunggu persetujuan.",
            };
        }

        resolvedProviderId = provider.id;
    }

    // ─── 3. Ekstrak & validasi input ──────────────────────────
    const name = (formData.get("name") as string)?.trim();
    const type = (formData.get("type") as string)?.trim();
    const priceStr = formData.get("price") as string;
    const maxCapacityStr = formData.get("max_capacity") as string;
    const description = (formData.get("description") as string)?.trim();
    const diveSiteCategory = (formData.get("dive_site_category") as string)?.trim() || null;
    const imageFile = formData.get("image") as File | null;

    if (!name || name.length < 3) {
        return {
            success: false,
            message: "Nama layanan wajib diisi (minimal 3 karakter).",
        };
    }

    const validTypes = ["boat", "instructor", "gear"];
    if (!type || !validTypes.includes(type)) {
        return {
            success: false,
            message: "Tipe layanan harus dipilih (boat, instructor, atau gear).",
        };
    }

    const price = parseFloat(priceStr);
    if (isNaN(price) || price < 0) {
        return {
            success: false,
            message: "Harga harus berupa angka positif.",
        };
    }

    const maxCapacity = parseInt(maxCapacityStr, 10);
    if (isNaN(maxCapacity) || maxCapacity < 1) {
        return {
            success: false,
            message: "Kapasitas maksimal harus minimal 1 orang.",
        };
    }

    // ─── 4. Upload gambar ke Supabase Storage ─────────────────
    let imageUrl: string | null = null;

    if (imageFile && imageFile.size > 0) {
        // Validasi tipe file
        const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
        if (!allowedTypes.includes(imageFile.type)) {
            return {
                success: false,
                message: "Format gambar harus JPEG, PNG, atau WebP.",
            };
        }

        // Validasi ukuran (maks 5MB)
        const maxSize = 5 * 1024 * 1024;
        if (imageFile.size > maxSize) {
            return {
                success: false,
                message: "Ukuran gambar maksimal 5MB.",
            };
        }

        // Buat nama file unik: (providerId atau userId)/timestamp-randomhex.ext
        const ext = imageFile.name.split(".").pop() || "jpg";
        const folderName = resolvedProviderId ?? user.id;
        const fileName = `${folderName}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;

        const { error: uploadError } = await supabase.storage
            .from("service-images")
            .upload(fileName, imageFile, {
                cacheControl: "3600",
                upsert: false,
            });

        if (uploadError) {
            console.error("Upload gagal:", uploadError.message);
            return {
                success: false,
                message: `Upload gambar layanan gagal. ${uploadError.message}`,
            };
        }

        // Dapatkan public URL
        const { data: publicUrlData } = supabase.storage
            .from("service-images")
            .getPublicUrl(fileName);
        imageUrl = publicUrlData.publicUrl;
    }

    // ─── 5. INSERT ke tabel services ──────────────────────────
    const { error: insertError } = await supabase.from("services").insert({
        provider_id: resolvedProviderId,   // null untuk admin tanpa provider row
        name,
        type,
        price,
        max_capacity: maxCapacity,
        description: description || null,
        dive_site_category: diveSiteCategory,
        image_url: imageUrl,
        is_available: true,
    });

    if (insertError) {
        console.error("Gagal menambah layanan:", insertError.message);
        return {
            success: false,
            message: `Gagal menyimpan layanan. (${insertError.message})`,
        };
    }

    // ─── 6. Revalidasi & redirect ─────────────────────────────
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/provider/services");
    revalidatePath("/services");
    redirect("/dashboard/provider/services");
}

export async function deleteService(formData: FormData) {
    const supabase = await createClient();

    const serviceId = (formData.get("service_id") as string)?.trim();
    const redirectTo = (formData.get("redirect_to") as string) || "/dashboard/provider/services";

    if (!serviceId) {
        redirect(`${redirectTo}?error=${encodeURIComponent("Layanan tidak valid.")}`);
    }

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

    const role = userRecord?.role ?? user.user_metadata?.role ?? "customer";

    let deleteQuery = supabase
        .from("services")
        .delete()
        .eq("id", serviceId);

    if (role !== "admin") {
        const { data: provider } = await supabase
            .from("providers")
            .select("id")
            .eq("owner_user_id", user.id)
            .maybeSingle();

        if (!provider) {
            redirect(`${redirectTo}?error=${encodeURIComponent("Profil provider tidak ditemukan.")}`);
        }

        deleteQuery = deleteQuery.eq("provider_id", provider.id);
    }

    const { data: deletedRows, error } = await deleteQuery.select("id");

    if (error) {
        const message = error.message.toLowerCase().includes("violates foreign key")
            ? "Layanan belum bisa dihapus karena masih punya data booking terkait. Nonaktifkan layanan terlebih dahulu."
            : `Gagal menghapus layanan. (${error.message})`;
        redirect(`${redirectTo}?error=${encodeURIComponent(message)}`);
    }

    if (!deletedRows || deletedRows.length === 0) {
        redirect(`${redirectTo}?error=${encodeURIComponent("Layanan tidak ditemukan atau Anda tidak punya akses.")}`);
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/provider/services");
    revalidatePath("/admin/services");
    revalidatePath("/services");
    redirect(`${redirectTo}?message=${encodeURIComponent("Layanan berhasil dihapus.")}`);
}
