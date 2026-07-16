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
}

export interface PushActionResult {
    success: boolean;
    message: string;
}
