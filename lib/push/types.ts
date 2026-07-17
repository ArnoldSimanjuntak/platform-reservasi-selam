export interface SerializedPushSubscription {
    endpoint: string;
    expirationTime?: number | null;
    keys: {
        p256dh: string;
        auth: string;
    };
}

export interface SulutDivePushPayload {
    title: string;
    body: string;
    url: string;
    tag: string;
    icon?: string;
    badge?: string;
    /** Lama pesan disimpan push service apabila perangkat sedang offline. */
    ttlSeconds?: number;
    /** Prioritas pengiriman ke perangkat. */
    urgency?: "very-low" | "low" | "normal" | "high";
}

export interface PushActionResult {
    success: boolean;
    message: string;
}
