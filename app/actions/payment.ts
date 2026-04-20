"use server";

import { createClient } from "@/lib/supabase/server";

export interface PaymentVerificationResult {
    success: boolean;
    message: string;
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

    // ─── 3. Ambil booking + verifikasi kepemilikan ──────────────
    const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .select("id, user_id, payment_status, payment_deadline")
        .eq("id", bookingId)
        .single();

    if (bookingError || !booking) {
        return { success: false, message: "Booking tidak ditemukan." };
    }

    if (booking.user_id !== user.id) {
        return { success: false, message: "Anda tidak memiliki izin untuk booking ini." };
    }

    // ─── 4. Cek apakah deadline sudah lewat ─────────────────────
    if (booking.payment_deadline) {
        const deadline = new Date(booking.payment_deadline);
        if (Date.now() > deadline.getTime()) {
            // Auto-expire
            await supabase
                .from("bookings")
                .update({ payment_status: "expired", status: "cancelled", updated_at: new Date().toISOString() })
                .eq("id", bookingId);

            return {
                success: false,
                message: "Batas waktu pembayaran telah berakhir. Booking otomatis dibatalkan.",
            };
        }
    }

    // ─── 5. Cek apakah sudah pernah dikirim ─────────────────────
    if (booking.payment_status === "pending_verification") {
        return { success: false, message: "Bukti pembayaran sudah dikirim dan sedang menunggu verifikasi." };
    }

    if (booking.payment_status === "paid") {
        return { success: false, message: "Pembayaran sudah terverifikasi." };
    }

    // ─── 6. Update payment_proof_url + status ───────────────────
    const { error: updateError } = await supabase
        .from("bookings")
        .update({
            payment_proof_url: paymentProofUrl,
            payment_status: "pending_verification",
            updated_at: new Date().toISOString(),
        })
        .eq("id", bookingId);

    if (updateError) {
        console.error("Payment proof update error:", updateError);

        if (updateError.code === "42501" || updateError.message.includes("policy")) {
            return {
                success: false,
                message: "Gagal menyimpan: kebijakan keamanan database tidak mengizinkan. Hubungi admin.",
            };
        }

        return {
            success: false,
            message: `Gagal menyimpan bukti pembayaran: ${updateError.message}`,
        };
    }

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

    // Ambil booking
    const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .select("id, provider_id, payment_status")
        .eq("id", bookingId)
        .single();

    if (bookingError || !booking) {
        return { success: false, message: "Booking tidak ditemukan." };
    }

    // Verifikasi kepemilikan provider
    const { data: provider } = await supabase
        .from("providers")
        .select("id")
        .eq("id", booking.provider_id)
        .eq("owner_user_id", user.id)
        .single();

    if (!provider) {
        return { success: false, message: "Anda tidak memiliki izin untuk memverifikasi pembayaran ini." };
    }

    if (booking.payment_status !== "pending_verification") {
        return { success: false, message: "Pembayaran tidak dalam status menunggu verifikasi." };
    }

    const newPaymentStatus = action === "approve" ? "paid" : "unpaid";
    const newBookingStatus = action === "approve" ? "confirmed" : "pending";

    const { error: updateError } = await supabase
        .from("bookings")
        .update({
            payment_status: newPaymentStatus,
            status: newBookingStatus,
            updated_at: new Date().toISOString(),
        })
        .eq("id", bookingId);

    if (updateError) {
        console.error("Payment verify error:", updateError);
        return { success: false, message: `Gagal memverifikasi: ${updateError.message}` };
    }

    return {
        success: true,
        message: action === "approve"
            ? "Pembayaran berhasil diverifikasi. Booking dikonfirmasi."
            : "Pembayaran ditolak. Wisatawan diminta mengunggah ulang.",
    };
}
