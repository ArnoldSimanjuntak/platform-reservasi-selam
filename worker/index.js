/* eslint-env serviceworker */

const DEFAULT_URL = "/dashboard";
const DEFAULT_ICON = "/icons/icon-192x192.png";
const DEFAULT_BADGE = "/icons/icon-96x96.png";

function readPushPayload(event) {
    if (!event.data) {
        return {
            title: "SulutDive",
            body: "Ada pembaruan baru pada akun Anda.",
            url: DEFAULT_URL,
            tag: "sulutdive-update",
        };
    }

    try {
        return event.data.json();
    } catch {
        return {
            title: "SulutDive",
            body: event.data.text(),
            url: DEFAULT_URL,
            tag: "sulutdive-update",
        };
    }
}

function sameOriginUrl(value) {
    try {
        const url = new URL(value || DEFAULT_URL, self.location.origin);
        return url.origin === self.location.origin
            ? url.href
            : new URL(DEFAULT_URL, self.location.origin).href;
    } catch {
        return new URL(DEFAULT_URL, self.location.origin).href;
    }
}

self.addEventListener("push", (event) => {
    const payload = readPushPayload(event);
    const title = payload.title || "SulutDive";

    event.waitUntil(
        self.registration.showNotification(title, {
            body: payload.body || "Ada pembaruan baru pada akun Anda.",
            icon: payload.icon || DEFAULT_ICON,
            badge: payload.badge || DEFAULT_BADGE,
            tag: payload.tag || "sulutdive-update",
            renotify: false,
            data: {
                url: sameOriginUrl(payload.url),
            },
        })
    );
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const targetUrl = sameOriginUrl(event.notification.data?.url);

    event.waitUntil(
        self.clients
            .matchAll({ type: "window", includeUncontrolled: true })
            .then(async (windowClients) => {
                for (const client of windowClients) {
                    if ("navigate" in client) await client.navigate(targetUrl);
                    if ("focus" in client) return client.focus();
                }
                return self.clients.openWindow ? self.clients.openWindow(targetUrl) : undefined;
            })
    );
});
