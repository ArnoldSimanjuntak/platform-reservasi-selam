"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import {
    getDocumentDefinition,
    getDocumentTypesForProvider,
    getMissingRequiredDocumentTypes,
    getRequiredDocumentTypes,
    type VerificationDocumentType,
} from "@/lib/provider-verification";
import { sendPushToRole, sendPushToUsers } from "@/lib/push/server";

export interface ProviderSetupResult {
    success: boolean;
    message: string;
}

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const PROVIDER_DOCUMENT_BUCKET = "provider-documents";
const MAX_VERIFICATION_FILE_SIZE = 8 * 1024 * 1024;
const ALLOWED_VERIFICATION_FILE_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
]);

interface UploadedVerificationDocument {
    type: VerificationDocumentType;
    label: string;
    storagePath: string;
    publicUrl: string;
    isRequired: boolean;
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

function normalizeProviderType(value?: string | null) {
    if (value === "boat" || value === "instructor" || value === "gear") return value;
    return null;
}

function normalizeInstructorScope(primaryType: string, value?: string | null) {
    if (primaryType !== "instructor") return null;
    return value === "instructor" ? "instructor" : "guide";
}

function isUploadFile(value: FormDataEntryValue | null): value is File {
    return !!value && typeof value === "object" && "size" in value && "name" in value;
}

function getVerificationFile(formData: FormData, type: VerificationDocumentType) {
    const direct = formData.get(type);
    if (isUploadFile(direct) && direct.size > 0) return direct;

    // Backward compatibility with the old instructor field name.
    if (type === "dive_certificate") {
        const legacy = formData.get("certification");
        if (isUploadFile(legacy) && legacy.size > 0) return legacy;
    }

    return null;
}

function getFileExtension(file: File) {
    const byMime: Record<string, string> = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
        "application/pdf": "pdf",
    };
    if (byMime[file.type]) return byMime[file.type];

    const rawExt = file.name.split(".").pop()?.toLowerCase();
    if (rawExt && /^[a-z0-9]+$/.test(rawExt)) return rawExt;
    return "bin";
}

function validateVerificationFile(file: File, label: string) {
    if (!ALLOWED_VERIFICATION_FILE_TYPES.has(file.type)) {
        return `${label} harus berupa JPG, PNG, WebP, atau PDF.`;
    }

    if (file.size > MAX_VERIFICATION_FILE_SIZE) {
        return `${label} maksimal 8MB.`;
    }

    return null;
}

async function uploadVerificationDocument(
    supabase: SupabaseServerClient,
    userId: string,
    type: VerificationDocumentType,
    file: File,
    isRequired: boolean
): Promise<UploadedVerificationDocument> {
    const definition = getDocumentDefinition(type);
    const ext = getFileExtension(file);
    const storagePath = `${userId}/${type}.${ext}`;

    const { error } = await supabase.storage
        .from(PROVIDER_DOCUMENT_BUCKET)
        .upload(storagePath, file, {
            upsert: true,
            cacheControl: "no-cache",
        });

    if (error) throw error;

    const { data } = supabase.storage
        .from(PROVIDER_DOCUMENT_BUCKET)
        .getPublicUrl(storagePath);

    return {
        type,
        label: definition.label,
        storagePath,
        publicUrl: data.publicUrl,
        isRequired,
    };
}

async function upsertVerificationDocuments(
    supabase: SupabaseServerClient,
    providerId: string,
    documents: UploadedVerificationDocument[]
) {
    if (documents.length === 0) return null;

    const { error } = await supabase
        .from("provider_verification_documents")
        .upsert(
            documents.map((document) => ({
                provider_id: providerId,
                document_type: document.type,
                label: document.label,
                storage_path: document.storagePath,
                public_url: document.publicUrl,
                is_required: document.isRequired,
                status: "submitted",
                notes: null,
                updated_at: new Date().toISOString(),
            })),
            { onConflict: "provider_id,document_type" }
        )
        .select("id");

    return error;
}

function buildSafetyChecklist(
    primaryType: string,
    uploadedDocuments: UploadedVerificationDocument[]
) {
    if (primaryType !== "boat") return {};

    const submitted = new Set(uploadedDocuments.map((document) => document.type));
    return {
        life_jacket: submitted.has("life_jacket_photo"),
        first_aid: submitted.has("first_aid_photo"),
        lifebuoy: submitted.has("lifebuoy_photo"),
        fire_extinguisher: submitted.has("fire_extinguisher_photo"),
    };
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

async function reviewProviderWithCompensation(
    adminClient: NonNullable<ReturnType<typeof createAdminClient>>,
    providerId: string,
    ownerUserId: string,
    action: "approve" | "reject",
    rejectionReason: string
) {
    const providerPayload = action === "approve"
        ? {
            verification_status: "verified",
            is_active: true,
            rejection_reason: null,
            verified_at: new Date().toISOString(),
        }
        : {
            verification_status: "rejected",
            is_active: false,
            rejection_reason: rejectionReason,
            verified_at: null,
        };

    if (action === "reject") {
        return adminClient.from("providers").update(providerPayload).eq("id", providerId);
    }

    const { data: previousUser, error: previousUserError } = await adminClient
        .from("users")
        .select("role")
        .eq("id", ownerUserId)
        .maybeSingle();
    if (previousUserError || !previousUser) {
        return { error: previousUserError ?? new Error("Profil user provider tidak ditemukan.") };
    }

    let { error: userUpdateError } = await adminClient
        .from("users")
        .update({ role: "provider", wants_provider: false })
        .eq("id", ownerUserId);
    if (userUpdateError?.message.toLowerCase().includes("wants_provider")) {
        userUpdateError = (
            await adminClient.from("users").update({ role: "provider" }).eq("id", ownerUserId)
        ).error;
    }
    if (userUpdateError) return { error: userUpdateError };

    const { error: providerUpdateError } = await adminClient
        .from("providers")
        .update(providerPayload)
        .eq("id", providerId);

    if (providerUpdateError) {
        const { error: rollbackError } = await adminClient
            .from("users")
            .update({ role: previousUser.role })
            .eq("id", ownerUserId);
        return {
            error: new Error(
                rollbackError
                    ? `${providerUpdateError.message}; rollback role juga gagal: ${rollbackError.message}`
                    : providerUpdateError.message
            ),
        };
    }

    return { error: null };
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
    const primaryType = normalizeProviderType((formData.get("primary_type") as string)?.trim());
    const instructorScope = normalizeInstructorScope(
        primaryType ?? "",
        (formData.get("instructor_scope") as string)?.trim()
    );
    const businessLicenseNumber = (formData.get("business_license_number") as string)?.trim();

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
    if (!businessLicenseNumber) {
        return { success: false, message: "Nomor NIB atau izin usaha wajib diisi." };
    }

    // 3. Validasi & upload dokumen verifikasi
    const requiredDocumentTypes = getRequiredDocumentTypes(primaryType, instructorScope);
    const allDocumentTypes = getDocumentTypesForProvider(primaryType, instructorScope);
    const uploadedDocuments: UploadedVerificationDocument[] = [];

    try {
        for (const documentType of allDocumentTypes) {
            const definition = getDocumentDefinition(documentType);
            const file = getVerificationFile(formData, documentType);
            const isRequired = requiredDocumentTypes.includes(documentType);

            if (!file) {
                if (isRequired) {
                    return {
                        success: false,
                        message: `${definition.label} wajib diunggah.`,
                    };
                }
                continue;
            }

            const validationError = validateVerificationFile(file, definition.label);
            if (validationError) {
                return { success: false, message: validationError };
            }

            uploadedDocuments.push(
                await uploadVerificationDocument(
                    supabase,
                    user.id,
                    documentType,
                    file,
                    isRequired
                )
            );
        }
    } catch (err: unknown) {
        console.error("Storage upload error:", err);
        return {
            success: false,
            message:
                "Gagal mengunggah dokumen. Pastikan bucket 'provider-documents' dan policy storage sudah benar. Error: " +
                getErrorMessage(err),
        };
    }

    const identityCardUrl =
        uploadedDocuments.find((document) => document.type === "identity_card")?.publicUrl ?? null;
    const certificationUrl =
        uploadedDocuments.find((document) => document.type === "dive_certificate")?.publicUrl ?? null;

    // ─── 4. Upsert ke tabel providers ─────────────────────────
    const latStr = formData.get("latitude") as string | null;
    const lngStr = formData.get("longitude") as string | null;
    
    const latitude = latStr ? parseFloat(latStr) : null;
    const longitude = lngStr ? parseFloat(lngStr) : null;

    const { data: providerRow, error: upsertError } = await supabase
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
                business_license_number: businessLicenseNumber,
                instructor_scope: instructorScope,
                safety_checklist: buildSafetyChecklist(primaryType, uploadedDocuments),
                rejection_reason: null,
                verification_submitted_at: new Date().toISOString(),
                verified_at: null,
                identity_card_url: identityCardUrl,
                certification_url: certificationUrl,
                is_active: true, // Profil lengkap → aktif di marketplace (tapi butuh verifikasi)
                verification_status: 'pending',
            },
            {
                onConflict: "owner_user_id",
            }
        )
        .select("id")
        .single();

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
    if (!providerRow) {
        return {
            success: false,
            message: "Profil provider tersimpan tetapi ID provider tidak terbaca. Coba muat ulang halaman.",
        };
    }

    const docsError = await upsertVerificationDocuments(
        supabase,
        providerRow.id,
        uploadedDocuments
    );

    if (docsError) {
        console.error("Gagal menyimpan dokumen verifikasi:", docsError.message);
        return {
            success: false,
            message:
                "Profil tersimpan, tetapi checklist dokumen gagal disimpan. Jalankan migration provider_verification_documents lalu coba ajukan ulang. (" +
                docsError.message +
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

    await sendPushToRole("admin", {
        title: "Pengajuan Provider Baru",
        body: `${name} telah mengirim dokumen dan menunggu verifikasi.`,
        url: "/admin/verifikasi",
        tag: `provider-submitted-${providerRow.id}`,
    });

    // ─── 4. Revalidasi cache & redirect ke halaman setup (status verifikasi) ─
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/provider/setup");
    revalidatePath("/admin/verifikasi");

    return {
        success: true,
        message: "Pengajuan verifikasi berhasil dikirim. Dokumen Anda sedang menunggu review admin.",
    };
}

export async function updateProviderProfile(
    formData: FormData
): Promise<ProviderSetupResult> {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/auth/login");
    }

    const name = (formData.get("name") as string)?.trim();
    const location = (formData.get("location") as string)?.trim();
    const contact = (formData.get("contact") as string)?.trim();
    const description = (formData.get("description") as string)?.trim();
    const primaryType = normalizeProviderType((formData.get("primary_type") as string)?.trim());
    const instructorScope = normalizeInstructorScope(
        primaryType ?? "",
        (formData.get("instructor_scope") as string)?.trim()
    );
    const businessLicenseNumber = (formData.get("business_license_number") as string)?.trim() || null;
    const latStr = formData.get("latitude") as string | null;
    const lngStr = formData.get("longitude") as string | null;

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

    const latitude = latStr ? parseFloat(latStr) : null;
    const longitude = lngStr ? parseFloat(lngStr) : null;

    const { data: provider } = await supabase
        .from("providers")
        .select("id, verification_status, is_active")
        .eq("owner_user_id", user.id)
        .maybeSingle();

    if (!provider) {
        return { success: false, message: "Profil provider tidak ditemukan." };
    }

    if (provider.verification_status !== "verified" || !provider.is_active) {
        return {
            success: false,
            message: "Profil belum terverifikasi. Gunakan formulir verifikasi untuk mengajukan ulang data.",
        };
    }

    const { error } = await supabase
        .from("providers")
        .update({
            name,
                location,
                latitude,
                longitude,
                contact,
                description: description || null,
                primary_type: primaryType,
                business_license_number: businessLicenseNumber,
                instructor_scope: instructorScope,
            })
        .eq("id", provider.id);

    if (error) {
        return {
            success: false,
            message: `Gagal memperbarui profil bisnis. (${error.message})`,
        };
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/provider/setup");
    revalidatePath("/services");

    return { success: true, message: "Profil bisnis berhasil diperbarui." };
}

// ─── Admin verification action ───────────────────────────────────
export async function verifyProviderIdentity(
    providerId: string,
    action: "approve" | "reject",
    rejectionReason?: string
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

    const cleanedRejectionReason = rejectionReason?.trim() ?? "";
    if (action === "reject" && !cleanedRejectionReason) {
        return {
            success: false,
            message: "Alasan penolakan wajib diisi agar provider tahu data yang harus diperbaiki.",
        };
    }

    // 2. Ambil owner provider dari DB sebelum mutasi role user.
    const { data: providerRecord, error: providerFetchError } = await supabase
        .from("providers")
        .select("owner_user_id, primary_type, instructor_scope, identity_card_url, certification_url")
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

    if (action === "approve") {
        const { data: documents, error: documentsError } = await supabase
            .from("provider_verification_documents")
            .select("document_type, storage_path, public_url, is_required, status")
            .eq("provider_id", providerId);

        if (documentsError) {
            return {
                success: false,
                message:
                    "Gagal membaca checklist dokumen provider. Pastikan migration provider_verification_documents sudah dijalankan. (" +
                    documentsError.message +
                    ")",
            };
        }

        const missingDocuments = getMissingRequiredDocumentTypes({
            primary_type: providerRecord.primary_type,
            instructor_scope: providerRecord.instructor_scope,
            identity_card_url: providerRecord.identity_card_url,
            certification_url: providerRecord.certification_url,
            verification_documents: documents ?? [],
        });

        if (missingDocuments.length > 0) {
            const labels = missingDocuments
                .map((type) => getDocumentDefinition(type).label)
                .join(", ");
            return {
                success: false,
                message: `Dokumen wajib belum lengkap: ${labels}.`,
            };
        }
    }

    // Pastikan row user tersedia sebelum transaksi lintas tabel dijalankan.
    if (action === "approve") {
        if (!adminClient) {
            return {
                success: false,
                message: "SUPABASE_SERVICE_ROLE_KEY belum terpasang, approve provider tidak dapat diproses.",
            };
        }

        const { data: ownerUser, error: ownerUserError } = await adminClient
            .from("users")
            .select("id")
            .eq("id", providerRecord.owner_user_id)
            .maybeSingle();
        if (ownerUserError) {
            return { success: false, message: `Gagal membaca pemilik provider: ${ownerUserError.message}` };
        }
        if (!ownerUser) {
            const repair = await ensureUserRowExistsFromAuth(providerRecord.owner_user_id);
            if (!repair.ok) {
                return { success: false, message: `Profil user provider tidak ditemukan. ${repair.reason}` };
            }
        }
    }

    const { error: rpcError } = await supabase.rpc("review_provider_verification", {
        p_provider_id: providerId,
        p_action: action,
        p_rejection_reason: cleanedRejectionReason || null,
    });

    if (rpcError) {
        const rpcUnavailable =
            rpcError.code === "PGRST202" ||
            rpcError.code === "42883" ||
            rpcError.message.toLowerCase().includes("review_provider_verification");

        if (!rpcUnavailable || !adminClient) {
            console.error("[verifyProviderIdentity] Atomic review error:", rpcError);
            return {
                success: false,
                message: `Gagal menyimpan verifikasi: ${rpcError.message}`,
            };
        }

        // Kompatibilitas sementara sebelum migration_atomic_provider_verification.sql dijalankan.
        const { error: fallbackError } = await reviewProviderWithCompensation(
            adminClient,
            providerId,
            providerRecord.owner_user_id,
            action,
            cleanedRejectionReason
        );
        if (fallbackError) {
            console.error("[verifyProviderIdentity] Safe fallback error:", fallbackError);
            return {
                success: false,
                message: `Gagal menyimpan verifikasi: ${getErrorMessage(fallbackError)}`,
            };
        }
    }

    await sendPushToUsers([providerRecord.owner_user_id], {
        title: action === "approve" ? "Provider Disetujui" : "Pengajuan Provider Ditolak",
        body: action === "approve"
            ? "Pengajuan provider Anda telah disetujui. Fitur operasional provider kini dapat digunakan."
            : "Pengajuan provider Anda ditolak. Buka aplikasi untuk melihat alasan dan memperbaiki dokumen.",
        url: "/dashboard/provider/setup",
        tag: `provider-reviewed-${providerId}`,
    });

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
