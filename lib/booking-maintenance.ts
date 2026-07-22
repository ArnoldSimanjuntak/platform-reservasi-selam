import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/admin";

/**
 * Menyegarkan booking kedaluwarsa sebelum halaman operasional dibaca.
 * Kegagalan tidak memblokir halaman; RPC booking tetap melakukan validasi ulang
 * ketika pengguna melakukan aksi penting.
 */
export async function refreshExpiredBookings() {
    const admin = createServiceRoleClient();
    if (!admin) return;

    const { error } = await admin.rpc("update_booking_statuses");
    if (error) {
        console.error("Failed to refresh expired booking statuses:", error.message);
    }
}
