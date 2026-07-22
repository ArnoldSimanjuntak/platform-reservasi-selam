"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { sendPushToProvider, sendPushToUsers } from "@/lib/push/server";

export interface PaymentVerificationResult {
    success: boolean;
    message: string;
    bookingStatus?: string;
    paymentStatus?: string;
}

/**
 * Server Action: Verifikasi bukti pembayaran yang diunggah wisatawan.
 *
 * Alur:
 * 1. Verifikasi auth session
 * 2. Ambil data booking + cek kepemilikan (user_id === auth.uid)
 * 3. Validasi bahwa payment_proof_url sudah ada (file sudah diunggah)
 * 4. Update payment_status menjadi 'pending_verification'
 */
export async function submitPaymentProof(
    bookingId: string,
    paymentProofUrl: string
): Promise<PaymentVerificationResult> {
    const supabase = await createClient();

    // ─── 1. Verifikasi Auth ─────────────────────────────────────
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        return { success: false, message: "Silakan login terlebih dahulu." };
    }

    // ─── 2. Validasi input ──────────────────────────────────────
    if (!bookingId || !paymentProofUrl) {
        return { success: false, message: "Data tidak lengkap. Pastikan bukti pembayaran sudah diunggah." };
    }

    // ─── 3. Validasi kepemilikan, deadline, dan update secara atomik ───
    const { data: submissionRows, error: submissionError } = await supabase.rpc(
        "submit_payment_proof_secure",
        {
            p_booking_id: bookingId,
            p_payment_proof_url: paymentProofUrl,
        }
    );

    if (submissionError) {
        console.error("Payment proof update error:", submissionError);
        return {
            success: false,
            message: `Gagal menyimpan bukti pembayaran: ${submissionError.message}`,
        };
    }

    const submission = Array.isArray(submissionRows) ? submissionRows[0] : submissionRows;
    if (!submission) {
        return { success: false, message: "Booking tidak ditemukan." };
    }
    if (submission.result_code === "expired") {
        revalidatePath("/dashboard");
        revalidatePath("/dashboard/bookings");
        revalidatePath("/dashboard/provider/orders");
        revalidatePath("/admin/orders");
        return {
            success: false,
            message: "Batas waktu pembayaran telah berakhir. Booking otomatis dibatalkan.",
            bookingStatus: "cancelled",
            paymentStatus: "expired",
        };
    }
    if (submission.result_code === "already_submitted") {
        return { success: false, message: "Bukti pembayaran sudah dikirim dan sedang menunggu verifikasi." };
    }
    if (submission.result_code === "paid") {
        return { success: false, message: "Pembayaran sudah terverifikasi." };
    }

    await sendPushToProvider(submission.provider_id, {
        title: "Bukti Pembayaran Baru",
        body: "Customer telah mengunggah bukti pembayaran yang perlu Anda periksa.",
        url: "/dashboard/provider/orders",
        tag: `payment-proof-${bookingId}`,
        urgency: "high",
        ttlSeconds: 24 * 60 * 60,
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/bookings");
    revalidatePath("/dashboard/provider/orders");
    revalidatePath("/admin/orders");

    return {
        success: true,
        message: "Bukti pembayaran berhasil dikirim! Menunggu verifikasi dari provider.",
    };
}

/**
 * Server Action: Provider memverifikasi pembayaran (approve/reject).
 */
export async function verifyPayment(
    bookingId: string,
    action: "approve" | "reject"
): Promise<PaymentVerificationResult> {
    const supabase = await createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        return { success: false, message: "Silakan login terlebih dahulu." };
    }

    const { data: reviewRows, error: reviewError } = await supabase.rpc(
        "review_payment_secure",
        { p_booking_id: bookingId, p_action: action }
    );

    if (reviewError) {
        console.error("Payment verify error:", reviewError);
        return { success: false, message: `Gagal memverifikasi: ${reviewError.message}` };
    }

    const review = Array.isArray(reviewRows) ? reviewRows[0] : reviewRows;
    if (!review?.user_id) {
        return { success: false, message: "Booking tidak ditemukan atau sudah diproses." };
    }
    const retryAllowed = review.result_code === "rejected_retry";
    const rejectedExpired = review.result_code === "rejected_expired";
    const approvalExpired = review.result_code === "approval_expired";
    const approved = review.result_code === "approved";

    await sendPushToUsers([review.user_id], {
        title: approvalExpired
            ? "Booking Kedaluwarsa"
            : approved ? "Pembayaran Diterima" : "Pembayaran Ditolak",
        body: approvalExpired
            ? "Pembayaran tidak dapat disetujui karena jadwal layanan telah lewat. Booking dibatalkan."
            : approved
            ? "Pembayaran telah diverifikasi dan booking Anda dikonfirmasi."
            : retryAllowed
                ? "Bukti pembayaran ditolak. Silakan unggah kembali sebelum batas waktu pembayaran yang baru."
                : "Bukti pembayaran ditolak dan waktu layanan tidak memungkinkan pengunggahan ulang. Booking dibatalkan.",
        url: "/dashboard/bookings",
        tag: `payment-review-${bookingId}`,
        urgency: "high",
        ttlSeconds: 24 * 60 * 60,
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/bookings");
    revalidatePath("/dashboard/provider/orders");
    revalidatePath("/admin/orders");

    return {
        success: true,
        message: approvalExpired
            ? "Jadwal layanan telah lewat sehingga pembayaran tidak dapat disetujui dan booking dibatalkan."
            : approved
            ? "Pembayaran berhasil diverifikasi. Booking dikonfirmasi."
            : rejectedExpired
                ? "Pembayaran ditolak dan booking dibatalkan karena batas waktunya telah lewat."
                : "Pembayaran ditolak. Wisatawan memperoleh waktu untuk mengunggah ulang.",
        bookingStatus: review.booking_status,
        paymentStatus: approved
            ? "paid"
            : (rejectedExpired || approvalExpired) ? "expired" : "unpaid",
    };
}

/**
 * Server Action: Membuat Signed URL untuk bukti pembayaran.
 *
 * Digunakan saat bucket 'payment-receipts' bersifat PRIVAT.
 * Signed URL berlaku selama 1 jam — cukup untuk sesi review provider.
 *
 * Alur:
 * 1. Verifikasi auth session
 * 2. Verifikasi bahwa caller adalah provider yang memiliki booking tersebut
 * 3. Ekstrak file path dari URL publik / simpan langsung
 * 4. Generate Signed URL dari Supabase Storage
 */
export async function getPaymentProofSignedUrl(
    bookingId: string
): Promise<{ url: string | null; error?: string }> {
    const supabase = await createClient();

    // ─── 1. Verifikasi Auth ─────────────────────────────────────
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        return { url: null, error: "Silakan login terlebih dahulu." };
    }

    // ─── 2. Ambil booking & verifikasi kepemilikan provider ─────
    const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .select("id, provider_id, payment_proof_url")
        .eq("id", bookingId)
        .single();

    if (bookingError || !booking) {
        return { url: null, error: "Booking tidak ditemukan." };
    }

    if (!booking.payment_proof_url) {
        return { url: null, error: "Bukti pembayaran belum diunggah." };
    }

    // Verifikasi caller adalah provider yang memiliki booking ini
    const { data: provider } = await supabase
        .from("providers")
        .select("id")
        .eq("id", booking.provider_id)
        .eq("owner_user_id", user.id)
        .eq("verification_status", "verified")
        .eq("is_active", true)
        .single();

    if (!provider) {
        return { url: null, error: "Anda tidak memiliki izin untuk mengakses dokumen ini." };
    }

    // ─── 3. Ekstrak file path dari URL yang tersimpan ───────────
    // Format URL Supabase storage publik:
    // https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
    // Format URL Supabase storage privat:
    // https://<project>.supabase.co/storage/v1/object/<bucket>/<path>
    const storedUrl = booking.payment_proof_url as string;
    const bucketName = "payment-receipts";
    const expectedOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!expectedOrigin || !storedUrl.startsWith(`${expectedOrigin}/storage/v1/object/`)) {
        return { url: null, error: "Alamat bukti pembayaran tidak valid." };
    }
    
    // Ekstrak path relatif dari URL yang sudah tersimpan
    const publicMarker = `/object/public/${bucketName}/`;
    const privateMarker = `/object/${bucketName}/`;
    
    let filePath: string | null = null;
    if (storedUrl.includes(publicMarker)) {
        filePath = storedUrl.split(publicMarker)[1];
    } else if (storedUrl.includes(privateMarker)) {
        filePath = storedUrl.split(privateMarker)[1];
    }

    if (!filePath) {
        return { url: null, error: "Lokasi berkas bukti pembayaran tidak valid." };
    }

    // ─── 4. Generate Signed URL (berlaku 1 jam) ─────────────────
    const { data: signedData, error: signedError } = await supabase.storage
        .from(bucketName)
        .createSignedUrl(filePath, 3600); // 3600 detik = 1 jam

    if (signedError || !signedData?.signedUrl) {
        console.warn("Signed URL generation failed:", signedError?.message);
        return { url: null, error: "Bukti pembayaran tidak dapat dibuka saat ini." };
    }

    return { url: signedData.signedUrl };
}
