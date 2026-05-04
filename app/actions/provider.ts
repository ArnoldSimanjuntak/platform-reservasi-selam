"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export interface ProviderSetupResult {
    success: boolean;
    message: string;
}

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (error && typeof error === "object") {
        const obj = error as {
            message?: string;
            details?: string | null;
            detail?: string | null;
            hint?: string | null;
            code?: string | null;
        };
        const parts = [
            obj.message,
            obj.details ?? obj.detail ?? undefined,
            obj.hint ?? undefined,
            obj.code ? `(code: ${obj.code})` : undefined,
        ].filter(Boolean);
        if (parts.length > 0) return parts.join(" | ");
    }
    return "Terjadi error tak terduga saat akses database.";
}

function createAdminClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceRoleKey) return null;
    return createSupabaseClient(url, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
}

async function ensureUserRowExistsFromAuth(ownerUserId: string) {
    const admin = createAdminClient();
    if (!admin) {
        return {
            ok: false,
            reason: "SUPABASE_SERVICE_ROLE_KEY belum terpasang, tidak bisa auto-repair users row.",
        } as const;
    }

    const { data: authUserData, error: authUserErr } = await admin.auth.admin.getUserById(ownerUserId);
    if (authUserErr || !authUserData?.user) {
        return {
            ok: false,
            reason: `Gagal baca auth.users: ${getErrorMessage(authUserErr)}`,
        } as const;
    }

    const authUser = authUserData.user;
    if (!authUser.email) {
        return {
            ok: false,
            reason: "User auth tidak memiliki email, tidak bisa membuat row users.",
        } as const;
    }
    const fallbackName =
        (authUser.user_metadata?.name as string | undefined) ||
        authUser.email?.split("@")[0] ||
        "Provider";

    const { error: upsertErr } = await admin
        .from("users")
        .upsert(
            {
                id: ownerUserId,
                name: fallbackName,
                email: authUser.email,
                role: "customer",
                wants_provider: true,
            },
            { onConflict: "id" }
        );

    if (upsertErr) {
        return {
            ok: false,
            reason: `Gagal membuat users row: ${getErrorMessage(upsertErr)}`,
        } as const;
    }

    return { ok: true } as const;
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
    } catch (err: unknown) {
        console.error("Storage upload error:", err);
        return {
            success: false,
            message: "Gagal mengunggah dokumen. Pastikan Anda telah membuat bucket 'provider-documents'. Error: " + getErrorMessage(err),
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

    // Pastikan intent onboarding provider tersimpan eksplisit.
    try {
        const { error: flagError } = await supabase
            .from("users")
            .update({ wants_provider: true })
            .eq("id", user.id);
        if (flagError && !flagError.message.toLowerCase().includes("wants_provider")) {
            console.warn("[setupProviderProfile] Failed to set wants_provider:", flagError.message);
        }
    } catch (error) {
        console.warn("[setupProviderProfile] wants_provider update skipped:", error);
    }

    // ─── 4. Revalidasi cache & redirect ke halaman setup (status verifikasi) ─
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/provider/setup");
    redirect("/dashboard/provider/setup?notice=Dokumen+berhasil+diunggah.+Status+menunggu+verifikasi+admin.");
}

// ─── Admin verification action ───────────────────────────────────
export async function verifyProviderIdentity(
    providerId: string,
    action: "approve" | "reject"
): Promise<{ success: boolean; message: string }> {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    // 1. Verify caller is Admin
    let user;
    try {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        if (authError) throw new Error(getErrorMessage(authError));
        user = authUser;
    } catch {
        return { success: false, message: "Koneksi ke server autentikasi gagal. Coba lagi." };
    }

    if (!user) return { success: false, message: "Unauthorized." };

    let userRecord;
    try {
        const { data, error } = await supabase.from("users").select("role").eq("id", user.id).single();
        if (error) throw new Error(getErrorMessage(error));
        userRecord = data;
    } catch (err: unknown) {
        console.error("[verifyProviderIdentity] Admin role fetch error:", err);
        return { success: false, message: `Gagal membaca data admin: ${getErrorMessage(err)}` };
    }

    if (userRecord?.role !== "admin") {
        return { success: false, message: "Hanya Admin yang dapat memverifikasi provider." };
    }

    // 2. Ambil owner provider dari DB sebelum mutasi role user.
    const { data: providerRecord, error: providerFetchError } = await supabase
        .from("providers")
        .select("owner_user_id")
        .eq("id", providerId)
        .single();

    if (providerFetchError) {
        console.error("[verifyProviderIdentity] Provider fetch error:", providerFetchError);
        return {
            success: false,
            message: `Provider tidak ditemukan: ${providerFetchError.message}`,
        };
    }

    if (action === "approve" && !providerRecord?.owner_user_id) {
        return {
            success: false,
            message: "Provider belum terhubung ke akun user, role tidak dapat diubah.",
        };
    }

    // 3. Update status verifikasi + is_active (approve juga mengaktifkan provider)
    const updatePayload =
        action === "approve"
            ? { verification_status: "verified", is_active: true }
            : { verification_status: "rejected", is_active: false };

    try {
        const { error: providerUpdateError } = await supabase
            .from("providers")
            .update(updatePayload)
            .eq("id", providerId);

        if (providerUpdateError) throw new Error(getErrorMessage(providerUpdateError));

        if (action === "approve") {
            if (!adminClient) {
                throw new Error("SUPABASE_SERVICE_ROLE_KEY belum terpasang, approve provider lintas-user tidak dapat diproses.");
            }

            let { error: userUpdateError } = await adminClient
                .from("users")
                .update({ role: "provider", wants_provider: false })
                .eq("id", providerRecord.owner_user_id);

            // Backward compatibility jika kolom wants_provider belum ada.
            if (userUpdateError?.message?.toLowerCase().includes("wants_provider")) {
                const retry = await supabase
                    .from("users")
                    .update({ role: "provider" })
                    .eq("id", providerRecord.owner_user_id);
                userUpdateError = retry.error;
            }

            // Jika masih gagal karena RLS/client session, paksa retry via service role.
            if (userUpdateError) {
                const retryByAdmin = await adminClient
                    .from("users")
                    .update({ role: "provider" })
                    .eq("id", providerRecord.owner_user_id);
                userUpdateError = retryByAdmin.error;
            }

            if (userUpdateError) throw new Error(getErrorMessage(userUpdateError));

            // Verifikasi pasca update: jika role belum berubah, biasanya karena RLS/policy.
            const { data: verifyUser, error: verifyError } = await adminClient
                .from("users")
                .select("role")
                .eq("id", providerRecord.owner_user_id)
                .maybeSingle();

            if (verifyError) {
                throw new Error(`Role check gagal: ${getErrorMessage(verifyError)}`);
            }
            if (!verifyUser) {
                const repair = await ensureUserRowExistsFromAuth(providerRecord.owner_user_id);
                if (!repair.ok) {
                    throw new Error(
                        `Profil user provider tidak ditemukan di tabel users. ${repair.reason}`
                    );
                }

                const { data: repairedUser, error: repairedReadErr } = await adminClient
                    .from("users")
                    .select("role")
                    .eq("id", providerRecord.owner_user_id)
                    .maybeSingle();

                if (repairedReadErr || !repairedUser) {
                    throw new Error(
                        `Auto-repair users row gagal diverifikasi: ${getErrorMessage(repairedReadErr)}`
                    );
                }
            }
            const effectiveRole = verifyUser?.role;
            if (effectiveRole !== "provider") {
                const { error: promoteRetryErr } = await adminClient
                    .from("users")
                    .update({ role: "provider", wants_provider: false })
                    .eq("id", providerRecord.owner_user_id);
                if (promoteRetryErr) {
                    throw new Error(`Gagal promote role provider: ${getErrorMessage(promoteRetryErr)}`);
                }

                const { data: promotedUser, error: promotedReadErr } = await adminClient
                    .from("users")
                    .select("role")
                    .eq("id", providerRecord.owner_user_id)
                    .maybeSingle();
                if (promotedReadErr || promotedUser?.role !== "provider") {
                    throw new Error(
                        "Role user belum berubah menjadi provider. Kemungkinan policy RLS update users belum mengizinkan admin."
                    );
                }
            }
        }
    } catch (err: unknown) {
        console.error("[verifyProviderIdentity] DB update error:", err);
        return {
            success: false,
            message: `Gagal menyimpan ke database: ${getErrorMessage(err)}`,
        };
    }

    // 4. Revalidasi root layout agar role baru terbaca di seluruh App Router tree.
    revalidatePath("/", "layout");
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
