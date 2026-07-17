import "server-only";

import webpush from "web-push";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import type { SulutDivePushPayload } from "@/lib/push/types";

interface StoredSubscription {
    id: string;
    user_id: string;
    endpoint: string;
    p256dh: string;
    auth_key: string;
}

export interface PushDeliverySummary {
    sent: number;
    failed: number;
    removed: number;
    skipped: boolean;
}

const EMPTY_SUMMARY: PushDeliverySummary = {
    sent: 0,
    failed: 0,
    removed: 0,
    skipped: true,
};

const DEFAULT_TTL_SECONDS = 60 * 60;
const MAX_TTL_SECONDS = 7 * 24 * 60 * 60;
const PUSH_REQUEST_TIMEOUT_MS = 8_000;

let configuredVapidSignature: string | null = null;

function configureWebPush() {
    const subject = process.env.VAPID_SUBJECT;
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;

    if (!subject || !publicKey || !privateKey) return false;

    const signature = `${subject}:${publicKey}:${privateKey}`;
    if (configuredVapidSignature !== signature) {
        webpush.setVapidDetails(subject, publicKey, privateKey);
        configuredVapidSignature = signature;
    }
    return true;
}

function readStatusCode(error: unknown) {
    if (error && typeof error === "object" && "statusCode" in error) {
        const statusCode = Number((error as { statusCode?: unknown }).statusCode);
        return Number.isFinite(statusCode) ? statusCode : null;
    }
    return null;
}

async function sendPushToSubscriptions(
    subscriptions: StoredSubscription[],
    payload: SulutDivePushPayload
): Promise<PushDeliverySummary> {
    if (subscriptions.length === 0) return EMPTY_SUMMARY;
    if (!configureWebPush()) {
        console.warn("[push] VAPID environment variables are incomplete; notification skipped.");
        return EMPTY_SUMMARY;
    }

    const admin = createServiceRoleClient();
    if (!admin) {
        console.warn("[push] Service-role client is unavailable; notification skipped.");
        return EMPTY_SUMMARY;
    }

    const { ttlSeconds, urgency, ...visiblePayload } = payload;
    const notification = JSON.stringify({
        ...visiblePayload,
        icon: payload.icon || "/icons/icon-192x192.png",
        badge: payload.badge || "/icons/icon-96x96.png",
    });
    const expiredIds: string[] = [];
    const successfulIds: string[] = [];
    const failedIds: string[] = [];
    let sent = 0;
    let failed = 0;
    const ttl = Number.isFinite(ttlSeconds)
        ? Math.min(MAX_TTL_SECONDS, Math.max(60, Math.round(ttlSeconds as number)))
        : DEFAULT_TTL_SECONDS;

    await Promise.all(
        subscriptions.map(async (subscription) => {
            try {
                await webpush.sendNotification(
                    {
                        endpoint: subscription.endpoint,
                        keys: {
                            p256dh: subscription.p256dh,
                            auth: subscription.auth_key,
                        },
                    },
                    notification,
                    {
                        TTL: ttl,
                        urgency: urgency || "normal",
                        timeout: PUSH_REQUEST_TIMEOUT_MS,
                    }
                );
                sent += 1;
                successfulIds.push(subscription.id);
            } catch (error) {
                failed += 1;
                const statusCode = readStatusCode(error);
                if (statusCode === 404 || statusCode === 410) {
                    expiredIds.push(subscription.id);
                } else {
                    failedIds.push(subscription.id);
                    console.warn("[push] Delivery failed:", statusCode ?? "network error");
                }
            }
        })
    );

    if (expiredIds.length > 0) {
        const { error } = await admin.from("push_subscriptions").delete().in("id", expiredIds);
        if (error) console.warn("[push] Failed to remove expired subscriptions:", error.message);
    }

    const deliveryTimestamp = new Date().toISOString();
    const metadataUpdates: PromiseLike<void>[] = [];

    if (successfulIds.length > 0) {
        metadataUpdates.push(
            admin
                .from("push_subscriptions")
                .update({ last_success_at: deliveryTimestamp })
                .in("id", successfulIds)
                .then(({ error }) => {
                    if (error) {
                        console.warn("[push] Failed to update delivery success metadata:", error.message);
                    }
                })
        );
    }
    if (failedIds.length > 0) {
        metadataUpdates.push(
            admin
                .from("push_subscriptions")
                .update({ last_failure_at: deliveryTimestamp })
                .in("id", failedIds)
                .then(({ error }) => {
                    if (error) {
                        console.warn("[push] Failed to update delivery failure metadata:", error.message);
                    }
                })
        );
    }
    await Promise.all(metadataUpdates);

    return {
        sent,
        failed,
        removed: expiredIds.length,
        skipped: false,
    };
}

export async function sendPushToUserEndpoint(
    userId: string,
    endpoint: string,
    payload: SulutDivePushPayload
): Promise<PushDeliverySummary> {
    try {
        const admin = createServiceRoleClient();
        if (!admin) return EMPTY_SUMMARY;

        const { data, error } = await admin
            .from("push_subscriptions")
            .select("id, user_id, endpoint, p256dh, auth_key")
            .eq("user_id", userId)
            .eq("endpoint", endpoint)
            .maybeSingle();

        if (error) {
            console.warn("[push] Failed to read device subscription:", error.message);
            return EMPTY_SUMMARY;
        }
        if (!data) return EMPTY_SUMMARY;

        return sendPushToSubscriptions([data as StoredSubscription], payload);
    } catch (error) {
        console.warn("[push] Device notification skipped:", error);
        return EMPTY_SUMMARY;
    }
}

export async function sendPushToUsers(
    userIds: Array<string | null | undefined>,
    payload: SulutDivePushPayload
): Promise<PushDeliverySummary> {
    try {
        const uniqueUserIds = [...new Set(userIds.filter((id): id is string => !!id))];
        if (uniqueUserIds.length === 0) return EMPTY_SUMMARY;

        const admin = createServiceRoleClient();
        if (!admin) return EMPTY_SUMMARY;

        const { data, error } = await admin
            .from("push_subscriptions")
            .select("id, user_id, endpoint, p256dh, auth_key")
            .in("user_id", uniqueUserIds);

        if (error) {
            console.warn("[push] Failed to read subscriptions:", error.message);
            return EMPTY_SUMMARY;
        }

        return sendPushToSubscriptions((data ?? []) as StoredSubscription[], payload);
    } catch (error) {
        console.warn("[push] User notification skipped:", error);
        return EMPTY_SUMMARY;
    }
}

export async function sendPushToProvider(
    providerId: string | null | undefined,
    payload: SulutDivePushPayload
) {
    try {
        if (!providerId) return EMPTY_SUMMARY;
        const admin = createServiceRoleClient();
        if (!admin) return EMPTY_SUMMARY;

        const { data, error } = await admin
            .from("providers")
            .select("owner_user_id")
            .eq("id", providerId)
            .maybeSingle();

        if (error) {
            console.warn("[push] Failed to resolve provider owner:", error.message);
            return EMPTY_SUMMARY;
        }
        return sendPushToUsers([data?.owner_user_id], payload);
    } catch (error) {
        console.warn("[push] Provider notification skipped:", error);
        return EMPTY_SUMMARY;
    }
}

export async function sendPushToRole(role: string, payload: SulutDivePushPayload) {
    try {
        const admin = createServiceRoleClient();
        if (!admin) return EMPTY_SUMMARY;

        const { data, error } = await admin.from("users").select("id").eq("role", role);
        if (error) {
            console.warn("[push] Failed to resolve role recipients:", error.message);
            return EMPTY_SUMMARY;
        }
        return sendPushToUsers((data ?? []).map((user) => user.id), payload);
    } catch (error) {
        console.warn("[push] Role notification skipped:", error);
        return EMPTY_SUMMARY;
    }
}
