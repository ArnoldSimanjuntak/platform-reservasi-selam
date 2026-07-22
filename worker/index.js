/* eslint-env serviceworker */

const DEFAULT_URL = "/dashboard";
const DEFAULT_ICON = "/icons/icon-192x192.png";
const DEFAULT_BADGE = "/icons/icon-96x96.png";

function safeText(value, fallback, maxLength) {
    if (typeof value !== "string") return fallback;
    const normalized = value.trim();
    return normalized ? normalized.slice(0, maxLength) : fallback;
}

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
        const payload = event.data.json();
        return payload && typeof payload === "object" ? payload : {};
    } catch {
        return {
            title: "SulutDive",
            body: event.data.text(),
            url: DEFAULT_URL,
            tag: "sulutdive-update",
        };
    }
}

function deliverToVisibleClient(client, message) {
    return new Promise((resolve) => {
        let channel;
        try {
            channel = new MessageChannel();
        } catch {
            resolve(false);
            return;
        }
        let settled = false;
        let timeoutId;
        const finish = (delivered) => {
            if (settled) return;
            settled = true;
            clearTimeout(timeoutId);
            channel.port1.onmessage = null;
            try {
                channel.port1.close();
            } catch {
                // Port sudah ditutup oleh runtime browser.
            }
            resolve(delivered);
        };
        timeoutId = setTimeout(() => finish(false), 700);

        channel.port1.onmessage = (event) => {
            if (event.data?.type !== "SULUTDIVE_PUSH_ACK") return;
            finish(true);
        };

        try {
            client.postMessage(message, [channel.port2]);
        } catch {
            try {
                channel.port2.close();
            } catch {
                // Port mungkin sempat dipindahkan sebelum postMessage gagal.
            }
            finish(false);
        }
    });
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
    const title = safeText(payload.title, "SulutDive", 80);

    event.waitUntil(
        (async () => {
            const body = safeText(payload.body, "Ada pembaruan baru pada akun Anda.", 240);
            const targetUrl = sameOriginUrl(payload.url);
            const windowClients = await self.clients.matchAll({
                type: "window",
                includeUncontrolled: true,
            });
            const visibleClients = windowClients.filter(
                (client) => client.visibilityState === "visible"
            );

            if (visibleClients.length > 0) {
                const deliveries = await Promise.all(
                    visibleClients.map((client) => deliverToVisibleClient(client, {
                        type: "SULUTDIVE_PUSH_RECEIVED",
                        payload: { title, body, url: targetUrl },
                    }))
                );
                if (deliveries.some(Boolean)) return;
            }

            await self.registration.showNotification(title, {
                body,
                icon: payload.icon || DEFAULT_ICON,
                badge: payload.badge || DEFAULT_BADGE,
                tag: safeText(payload.tag, "sulutdive-update", 120),
                renotify: true,
                silent: false,
                vibrate: [200, 100, 200],
                timestamp: Date.now(),
                data: {
                    url: targetUrl,
                },
            });
        })()
    );
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const targetUrl = sameOriginUrl(event.notification.data?.url);

    event.waitUntil(
        self.clients
            .matchAll({ type: "window", includeUncontrolled: true })
            .then(async (windowClients) => {
                // Fokuskan halaman tujuan apabila sudah terbuka.
                for (const client of windowClients) {
                    if (client.url === targetUrl && "focus" in client) {
                        return client.focus();
                    }
                }

                // Jika aplikasi terbuka pada halaman lain, arahkan satu jendela
                // yang sudah ada. Kegagalan navigasi tidak boleh menghentikan
                // fallback openWindow.
                for (const client of windowClients) {
                    try {
                        if ("navigate" in client) await client.navigate(targetUrl);
                        if ("focus" in client) return client.focus();
                    } catch {
                        // Coba client berikutnya atau buka jendela baru.
                    }
                }
                return self.clients.openWindow ? self.clients.openWindow(targetUrl) : undefined;
            })
    );
});
