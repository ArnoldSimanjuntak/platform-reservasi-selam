import type { BookingStatus, PaymentStatus } from "@/lib/supabase";

export const bookingStatusLabels: Record<BookingStatus, string> = {
    pending: "Menunggu",
    confirmed: "Dikonfirmasi",
    in_progress: "Berlangsung",
    completed: "Selesai",
    cancelled: "Dibatalkan",
};

export const paymentStatusLabels: Record<PaymentStatus, string> = {
    unpaid: "Belum Dibayar",
    pending_verification: "Menunggu Verifikasi Pembayaran",
    paid: "Sudah Dibayar",
    expired: "Kedaluwarsa",
};

export function getBookingStatusLabel(status?: string | null) {
    return status && status in bookingStatusLabels
        ? bookingStatusLabels[status as BookingStatus]
        : "Menunggu";
}

export function getPaymentStatusLabel(status?: string | null) {
    return status && status in paymentStatusLabels
        ? paymentStatusLabels[status as PaymentStatus]
        : "Belum Dibayar";
}
