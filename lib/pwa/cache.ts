const PRIVATE_RUNTIME_CACHES = ["supabase-api", "api-routes", "app-pages", "next-data", "others"];
const CACHE_CLEANUP_VERSION = "sulutdive-private-cache-cleanup-v2";

export async function clearLegacyPrivateCaches() {
    if (typeof window === "undefined" || !("caches" in window)) return;

    try {
        if (window.localStorage.getItem(CACHE_CLEANUP_VERSION) === "done") return;
        await Promise.all(PRIVATE_RUNTIME_CACHES.map((cacheName) => window.caches.delete(cacheName)));
        window.localStorage.setItem(CACHE_CLEANUP_VERSION, "done");
    } catch (error) {
        console.warn("[PWA] Failed to clear legacy private caches:", error);
    }
}

export async function clearPrivateCachesOnSignOut() {
    if (typeof window === "undefined" || !("caches" in window)) return;
    try {
        await Promise.all(PRIVATE_RUNTIME_CACHES.map((cacheName) => window.caches.delete(cacheName)));
    } catch (error) {
        console.warn("[PWA] Failed to clear private caches on sign out:", error);
    }
}
