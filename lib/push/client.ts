"use client";

import { deletePushSubscription } from "@/app/actions/push";

export async function getCurrentPushSubscription() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return null;
    const registration = await navigator.serviceWorker.ready;
    return registration.pushManager.getSubscription();
}

export async function unsubscribeCurrentDevicePush() {
    try {
        const subscription = await getCurrentPushSubscription();
        if (!subscription) return;

        try {
            await deletePushSubscription(subscription.endpoint);
        } finally {
            await subscription.unsubscribe();
        }
    } catch (error) {
        console.warn("[push] Device unsubscribe skipped:", error);
    }
}
