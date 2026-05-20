const withPWA = require("next-pwa")({
    dest: "public",
    register: true,
    skipWaiting: true,
    disable: process.env.NODE_ENV === "development",
    // ─── Offline Fallback ────────────────────────────────────
    // Saat user offline dan halaman belum di-cache,
    // service worker akan menampilkan /offline secara otomatis.
    fallbacks: {
        document: "/offline",
    },
    // ─── Runtime Caching Strategies ──────────────────────────
    // Setiap rule mendefinisikan:
    //   urlPattern  : regex URL yang cocok
    //   handler     : strategi caching Workbox
    //   options     : konfigurasi cache (nama, TTL, max entries)
    runtimeCaching: [
        // Auth/Dashboard routes should not serve stale shell from cache.
        {
            urlPattern: /\/(auth|dashboard)(\/.*)?$/i,
            handler: "NetworkFirst",
            options: {
                cacheName: "auth-dashboard-pages",
                networkTimeoutSeconds: 5,
                expiration: {
                    maxEntries: 16,
                    maxAgeSeconds: 60 * 30,
                },
            },
        },
        // ── 1. Google Fonts (CacheFirst — jarang berubah) ────
        {
            urlPattern: /^https:\/\/fonts\.(?:gstatic|googleapis)\.com\/.*/i,
            handler: "CacheFirst",
            options: {
                cacheName: "google-fonts",
                expiration: {
                    maxEntries: 10,
                    maxAgeSeconds: 365 * 24 * 60 * 60, // 1 tahun
                },
            },
        },
        // ── 2. Leaflet Map Tiles (CacheFirst — aset statis) ──
        // Tile peta OpenStreetMap yang digunakan oleh react-leaflet.
        // CacheFirst: tile di-cache permanen setelah pertama kali diunduh.
        // Ini krusial agar peta tetap terlihat saat offline di Lembeh.
        {
            urlPattern: /^https:\/\/[abc]\.tile\.openstreetmap\.org\/.*/i,
            handler: "CacheFirst",
            options: {
                cacheName: "leaflet-map-tiles",
                expiration: {
                    maxEntries: 200,                     // ±200 tile area Lembeh
                    maxAgeSeconds: 30 * 24 * 60 * 60,   // 30 hari
                },
            },
        },
        // ── 3. Leaflet Library Assets (CacheFirst) ───────────
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
        // ── 4. Supabase REST API (NetworkFirst) ──────────────
        // Data dari Supabase (services, dive_sites, bookings).
        // NetworkFirst: selalu coba ambil data segar, tapi fallback
        // ke cache jika offline (timeout 10 detik).
        {
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i,
            handler: "NetworkFirst",
            options: {
                cacheName: "supabase-api",
                networkTimeoutSeconds: 10,
                expiration: {
                    maxEntries: 50,
                    maxAgeSeconds: 24 * 60 * 60, // 24 jam
                },
            },
        },
        // ── 5. External Images — Unsplash / Picsum (SWR) ─────
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
        // ── 6. Next.js Image Optimization (SWR) ─────────────
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
        // ── 7. Static Font Assets (SWR) ──────────────────────
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
        // ── 8. Static Image Assets (SWR) ─────────────────────
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
        // ── 9. JS Bundles (SWR) ──────────────────────────────
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
        // ── 10. CSS Stylesheets (SWR) ────────────────────────
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
        // ── 11. Next.js Data (SWR) ───────────────────────────
        {
            urlPattern: /\/_next\/data\/.+\/.+\.json$/i,
            handler: "StaleWhileRevalidate",
            options: {
                cacheName: "next-data",
                expiration: {
                    maxEntries: 32,
                    maxAgeSeconds: 24 * 60 * 60,
                },
            },
        },
        // ── 12. Internal API Routes (NetworkFirst) ───────────
        // Auth state must never be served from the PWA cache. Stale auth JSON is
        // the main cause of navbar role/menu drift after login, back, or resume.
        {
            urlPattern: /\/api\/auth\/navbar-state(?:\?.*)?$/i,
            handler: "NetworkOnly",
            options: {},
        },
        {
            urlPattern: /\/api\/auth\/idle-signout(?:\?.*)?$/i,
            handler: "NetworkOnly",
            options: {},
        },
        {
            urlPattern: /\/api\/.*$/i,
            handler: "NetworkFirst",
            options: {
                cacheName: "api-routes",
                networkTimeoutSeconds: 10,
                expiration: {
                    maxEntries: 16,
                    maxAgeSeconds: 24 * 60 * 60,
                },
            },
        },
        // ── 13. Halaman Navigasi — /services, /lokasi (SWR) ──
        // Halaman yang sering dikunjungi di-cache agar bisa
        // diakses offline oleh penyelam di area tanpa sinyal.
        {
            urlPattern: /\/(services|lokasi)(\/.*)?$/i,
            handler: "StaleWhileRevalidate",
            options: {
                cacheName: "app-pages",
                expiration: {
                    maxEntries: 32,
                    maxAgeSeconds: 24 * 60 * 60,
                },
            },
        },
        // ── 14. Catch-all (NetworkFirst) ─────────────────────
        {
            urlPattern: /.*/i,
            handler: "NetworkFirst",
            options: {
                cacheName: "others",
                networkTimeoutSeconds: 10,
                expiration: {
                    maxEntries: 32,
                    maxAgeSeconds: 24 * 60 * 60,
                },
            },
        },
    ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    experimental: {
        serverActions: {
            bodySizeLimit: '5mb',
        },
    },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'images.unsplash.com',
            },
            {
                protocol: 'https',
                hostname: 'picsum.photos',
            },
            {
                protocol: 'https',
                hostname: '*.supabase.co',
            },
        ],
    },
};

module.exports = withPWA(nextConfig);
