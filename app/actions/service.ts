"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getServiceTypeLabel, isServiceType } from "@/lib/service-types";

export interface CreateServiceResult {
    success: boolean;
    message: string;
    redirectTo?: string;
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

    // â”€â”€â”€ 1. Verifikasi autentikasi â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/auth/login");
    }

    // â”€â”€â”€ 2. Ambil role user untuk menentukan alur â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const { data: userRecord } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

    const role = userRecord?.role ?? user.user_metadata?.role;

    let resolvedProviderId: string | null = null;

    if (role !== "provider") {
        return {
            success: false,
            message: "Hanya provider terverifikasi yang dapat membuat layanan.",
        };
    }

    const { data: provider } = await supabase
        .from("providers")
        .select("id, primary_type, verification_status, is_active")
        .eq("owner_user_id", user.id)
        .single();

    if (!provider) {
        return {
            success: false,
            message: "Profil bisnis Anda belum lengkap. Silakan lengkapi terlebih dahulu.",
        };
    }

    if (provider.verification_status !== "verified" || !provider.is_active) {
        return {
            success: false,
            message: "Akun Anda belum diverifikasi oleh Admin. Silakan tunggu persetujuan.",
        };
    }

    resolvedProviderId = provider.id;

    // â”€â”€â”€ 3. Ekstrak & validasi input â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const name = (formData.get("name") as string)?.trim();
    const type = (formData.get("type") as string)?.trim();
    const priceStr = formData.get("price") as string;
    const maxCapacityStr = formData.get("max_capacity") as string;
    const description = (formData.get("description") as string)?.trim();
    const rawDiveSiteCategory = (formData.get("dive_site_category") as string)?.trim() || null;
    const imageFile = formData.get("image") as File | null;

    if (!name || name.length < 3) {
        return {
            success: false,
            message: "Nama layanan wajib diisi (minimal 3 karakter).",
        };
    }

    if (!isServiceType(type)) {
        return {
            success: false,
            message: "Tipe layanan harus dipilih.",
        };
    }

    if (!isServiceType(provider.primary_type) || type !== provider.primary_type) {
        return {
            success: false,
            message: `Provider dengan kategori ${getServiceTypeLabel(provider.primary_type)} hanya dapat membuat layanan ${getServiceTypeLabel(provider.primary_type)}.`,
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
            message: type === "gear"
                ? "Stok unit alat harus minimal 1."
                : "Kapasitas maksimal harus minimal 1 orang.",
        };
    }

    // â”€â”€â”€ 4. Upload gambar ke Supabase Storage â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

    // â”€â”€â”€ 5. INSERT ke tabel services â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const { error: insertError } = await supabase.from("services").insert({
        provider_id: resolvedProviderId,   // null untuk admin tanpa provider row
        name,
        type,
        price,
        max_capacity: maxCapacity,
        description: description || null,
        dive_site_category: type === "gear" ? null : rawDiveSiteCategory,
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

    // â”€â”€â”€ 6. Revalidasi & redirect â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/provider/services");
    revalidatePath("/services");
    return {
        success: true,
        message: "Layanan berhasil dibuat.",
        redirectTo: "/dashboard/provider/services?message=Layanan+berhasil+dibuat.",
    };
}

export async function updateService(
    formData: FormData
): Promise<CreateServiceResult> {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/auth/login");
    }

    const serviceId = (formData.get("service_id") as string)?.trim();
    const name = (formData.get("name") as string)?.trim();
    const type = (formData.get("type") as string)?.trim();
    const priceStr = formData.get("price") as string;
    const maxCapacityStr = formData.get("max_capacity") as string;
    const description = (formData.get("description") as string)?.trim();
    const rawDiveSiteCategory = (formData.get("dive_site_category") as string)?.trim() || null;
    const imageFile = formData.get("image") as File | null;
    const isAvailable = formData.get("is_available") === "true";

    if (!serviceId) {
        return {
            success: false,
            message: "Layanan tidak valid.",
        };
    }

    if (!name || name.length < 3) {
        return {
            success: false,
            message: "Nama layanan wajib diisi (minimal 3 karakter).",
        };
    }

    if (!isServiceType(type)) {
        return {
            success: false,
            message: "Tipe layanan harus dipilih.",
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
            message: type === "gear"
                ? "Stok unit alat harus minimal 1."
                : "Kapasitas maksimal harus minimal 1 orang.",
        };
    }

    const { data: userRecord } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

    const role = userRecord?.role ?? user.user_metadata?.role;

    if (role !== "provider") {
        return {
            success: false,
            message: "Hanya provider pemilik layanan yang dapat mengedit layanan.",
        };
    }

    const { data: provider } = await supabase
        .from("providers")
        .select("id, primary_type, verification_status, is_active")
        .eq("owner_user_id", user.id)
        .maybeSingle();

    if (!provider) {
        return {
            success: false,
            message: "Profil provider tidak ditemukan.",
        };
    }

    if (provider.verification_status !== "verified" || !provider.is_active) {
        return {
            success: false,
            message: "Akun Anda belum diverifikasi oleh Admin.",
        };
    }

    const providerId = provider.id;

    if (!isServiceType(provider.primary_type) || type !== provider.primary_type) {
        return {
            success: false,
            message: `Provider dengan kategori ${getServiceTypeLabel(provider.primary_type)} hanya dapat mengelola layanan ${getServiceTypeLabel(provider.primary_type)}.`,
        };
    }

    let imageUrl: string | undefined;

    if (imageFile && imageFile.size > 0) {
        const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
        if (!allowedTypes.includes(imageFile.type)) {
            return {
                success: false,
                message: "Format gambar harus JPEG, PNG, atau WebP.",
            };
        }

        const maxSize = 5 * 1024 * 1024;
        if (imageFile.size > maxSize) {
            return {
                success: false,
                message: "Ukuran gambar maksimal 5MB.",
            };
        }

        const ext = imageFile.name.split(".").pop() || "jpg";
        const folderName = providerId ?? user.id;
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

        const { data: publicUrlData } = supabase.storage
            .from("service-images")
            .getPublicUrl(fileName);
        imageUrl = publicUrlData.publicUrl;
    }

    const updatePayload: Record<string, unknown> = {
        name,
        type,
        price,
        max_capacity: maxCapacity,
        description: description || null,
        dive_site_category: type === "gear" ? null : rawDiveSiteCategory,
        is_available: isAvailable,
    };

    if (imageUrl) {
        updatePayload.image_url = imageUrl;
    }

    let updateQuery = supabase
        .from("services")
        .update(updatePayload)
        .eq("id", serviceId);

    updateQuery = updateQuery.eq("provider_id", providerId);

    const { data: updatedRows, error } = await updateQuery.select("id");

    if (error) {
        console.error("Gagal memperbarui layanan:", error.message);
        return {
            success: false,
            message: `Gagal memperbarui layanan. (${error.message})`,
        };
    }

    if (!updatedRows || updatedRows.length === 0) {
        return {
            success: false,
            message: "Layanan tidak ditemukan atau Anda tidak punya akses.",
        };
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/provider/services");
    revalidatePath(`/dashboard/provider/services/${serviceId}/edit`);
    revalidatePath(`/services/${serviceId}`);
    revalidatePath("/services");
    return {
        success: true,
        message: "Layanan berhasil diperbarui.",
        redirectTo: "/dashboard/provider/services?message=Layanan+berhasil+diperbarui.",
    };
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

    if (role === "admin") {
        if (!redirectTo.startsWith("/admin/services")) {
            redirect(`/admin/services?error=${encodeURIComponent("Admin hanya dapat menghapus layanan dari panel admin.")}`);
        }
    } else {
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
