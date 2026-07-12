const withPWA = require("next-pwa")({
    dest: "public",
    // Registration is handled by components/ServiceWorkerRegistration.tsx so we
    // can force updateViaCache="none" and avoid stale service worker installs.
    register: false,
    skipWaiting: true,
    cleanupOutdatedCaches: true,
    disable: process.env.NODE_ENV === "development",
    // Offline fallback: only show /offline when a document request fails.
    // Next.js routes must not be replaced by the offline page while online.
    fallbacks: {
        document: "/offline",
    },
    runtimeCaching: [
        // Private pages contain user-specific data. Never serve them from cache.
        {
            urlPattern: /\/(auth|dashboard|admin)(\/.*)?$/i,
            handler: "NetworkOnly",
            options: {},
        },
        {
            urlPattern: /^https:\/\/fonts\.(?:gstatic|googleapis)\.com\/.*/i,
            handler: "CacheFirst",
            options: {
                cacheName: "google-fonts",
                expiration: {
                    maxEntries: 10,
                    maxAgeSeconds: 365 * 24 * 60 * 60,
                },
            },
        },
        {
            urlPattern: /^https:\/\/[abc]\.tile\.openstreetmap\.org\/.*/i,
            handler: "CacheFirst",
            options: {
                cacheName: "leaflet-map-tiles",
                expiration: {
                    maxEntries: 200,
                    maxAgeSeconds: 30 * 24 * 60 * 60,
                },
            },
        },
        {
            urlPattern: /^https:\/\/unpkg\.com\/leaflet@.*/i,
            handler: "CacheFirst",
            options: {
                cacheName: "leaflet-assets",
                expiration: {
                    maxEntries: 10,
                    maxAgeSeconds: 30 * 24 * 60 * 60,
                },
            },
        },
        {
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i,
            handler: "NetworkOnly",
            options: {},
        },
        {
            urlPattern: /^https:\/\/(images\.unsplash\.com|picsum\.photos)\/.*/i,
            handler: "StaleWhileRevalidate",
            options: {
                cacheName: "external-images",
                expiration: {
                    maxEntries: 64,
                    maxAgeSeconds: 30 * 24 * 60 * 60,
                },
            },
        },
        {
            urlPattern: /\/_next\/image\?url=.+$/i,
            handler: "StaleWhileRevalidate",
            options: {
                cacheName: "next-image",
                expiration: {
                    maxEntries: 64,
                    maxAgeSeconds: 24 * 60 * 60,
                },
            },
        },
        {
            urlPattern: /\.(?:eot|otf|ttc|ttf|woff|woff2|font\.css)$/i,
            handler: "StaleWhileRevalidate",
            options: {
                cacheName: "static-fonts",
                expiration: {
                    maxEntries: 10,
                    maxAgeSeconds: 7 * 24 * 60 * 60,
                },
            },
        },
        {
            urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
            handler: "StaleWhileRevalidate",
            options: {
                cacheName: "static-images",
                expiration: {
                    maxEntries: 64,
                    maxAgeSeconds: 24 * 60 * 60,
                },
            },
        },
        {
            urlPattern: /\.(?:js)$/i,
            handler: "StaleWhileRevalidate",
            options: {
                cacheName: "static-js",
                expiration: {
                    maxEntries: 48,
                    maxAgeSeconds: 24 * 60 * 60,
                },
            },
        },
        {
            urlPattern: /\.(?:css|less)$/i,
            handler: "StaleWhileRevalidate",
            options: {
                cacheName: "static-css",
                expiration: {
                    maxEntries: 32,
                    maxAgeSeconds: 24 * 60 * 60,
                },
            },
        },
        // API responses can contain session-specific data and are never cached.
        {
            urlPattern: /\/api\/.*$/i,
            handler: "NetworkOnly",
            options: {},
        },
        // Navigation documents are fetched from the network. If they fail,
        // next-pwa serves the precached /offline document fallback.
        {
            urlPattern: /.*/i,
            handler: "NetworkOnly",
            options: {},
        },
    ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    async headers() {
        return [
            {
                source: "/sw.js",
                headers: [
                    {
                        key: "Content-Type",
                        value: "application/javascript; charset=utf-8",
                    },
                    {
                        key: "Cache-Control",
                        value: "no-cache, no-store, must-revalidate",
                    },
                ],
            },
        ];
    },
    experimental: {
        serverActions: {
            bodySizeLimit: "5mb",
        },
    },
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "images.unsplash.com",
            },
            {
                protocol: "https",
                hostname: "picsum.photos",
            },
            {
                protocol: "https",
                hostname: "*.supabase.co",
            },
        ],
    },
};

module.exports = withPWA(nextConfig);
