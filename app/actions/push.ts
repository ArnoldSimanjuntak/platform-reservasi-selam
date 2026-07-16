"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { sendPushToUsers } from "@/lib/push/server";
import type { PushActionResult, SerializedPushSubscription } from "@/lib/push/types";

const MAX_ENDPOINT_LENGTH = 4_096;
const MAX_KEY_LENGTH = 1_024;
const MAX_USER_AGENT_LENGTH = 1_000;

function isValidSubscription(subscription: SerializedPushSubscription) {
    if (!subscription || typeof subscription !== "object") return false;
    if (!subscription.endpoint || subscription.endpoint.length > MAX_ENDPOINT_LENGTH) return false;
    if (!subscription.keys?.p256dh || !subscription.keys?.auth) return false;
    if (
        subscription.keys.p256dh.length > MAX_KEY_LENGTH ||
        subscription.keys.auth.length > MAX_KEY_LENGTH
    ) {
        return false;
    }

    try {
        return new URL(subscription.endpoint).protocol === "https:";
    } catch {
        return false;
    }
}

export async function savePushSubscription(
    subscription: SerializedPushSubscription,
    userAgent?: string
): Promise<PushActionResult> {
    const supabase = await createClient();
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        return { success: false, message: "Silakan login sebelum mengaktifkan notifikasi." };
    }
    if (!isValidSubscription(subscription)) {
        return { success: false, message: "Data subscription dari browser tidak valid." };
    }

    const admin = createServiceRoleClient();
    if (!admin) {
        return {
            success: false,
            message: "Konfigurasi server push belum lengkap (service-role tidak tersedia).",
        };
    }

    const now = new Date().toISOString();
    const { error } = await admin
        .from("push_subscriptions")
        .upsert(
            {
                user_id: user.id,
                endpoint: subscription.endpoint,
                p256dh: subscription.keys.p256dh,
                auth_key: subscription.keys.auth,
                user_agent: userAgent?.slice(0, MAX_USER_AGENT_LENGTH) || null,
                updated_at: now,
            },
            { onConflict: "endpoint" }
        );

    if (error) {
        console.error("[push] Failed to save subscription:", error.message);
        const migrationMissing =
            error.code === "42P01" || error.message.toLowerCase().includes("push_subscriptions");
        return {
            success: false,
            message: migrationMissing
                ? "Tabel push_subscriptions belum tersedia di Supabase."
                : "Subscription notifikasi gagal disimpan.",
        };
    }

    return { success: true, message: "Notifikasi berhasil diaktifkan pada perangkat ini." };
}

export async function deletePushSubscription(endpoint: string): Promise<PushActionResult> {
    const supabase = await createClient();
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        return { success: false, message: "Sesi pengguna tidak ditemukan." };
    }
    if (!endpoint || endpoint.length > MAX_ENDPOINT_LENGTH) {
        return { success: false, message: "Endpoint subscription tidak valid." };
    }

    const admin = createServiceRoleClient();
    if (!admin) {
        return { success: false, message: "Konfigurasi server push belum lengkap." };
    }

    const { error } = await admin
        .from("push_subscriptions")
        .delete()
        .eq("endpoint", endpoint)
        .eq("user_id", user.id);

    if (error) {
        console.error("[push] Failed to delete subscription:", error.message);
        return { success: false, message: "Subscription gagal dihapus dari server." };
    }

    return { success: true, message: "Notifikasi dinonaktifkan pada perangkat ini." };
}

export async function sendTestPushNotification(): Promise<PushActionResult> {
    const supabase = await createClient();
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        return { success: false, message: "Silakan login sebelum menguji notifikasi." };
    }

    const delivery = await sendPushToUsers([user.id], {
        title: "Notifikasi SulutDive Aktif",
        body: "Perangkat ini siap menerima pembaruan booking, pembayaran, dan verifikasi provider.",
        url: "/dashboard",
        tag: `push-test-${user.id}`,
    });

    if (delivery.sent > 0) {
        return { success: true, message: "Notifikasi uji berhasil dikirim ke perangkat ini." };
    }

    return {
        success: false,
        message: delivery.skipped
            ? "Notifikasi belum dapat dikirim. Periksa tabel subscription dan konfigurasi VAPID."
            : "Pengiriman notifikasi uji gagal. Coba aktifkan ulang notifikasi pada perangkat ini.",
    };
}
