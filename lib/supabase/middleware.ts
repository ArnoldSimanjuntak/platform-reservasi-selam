import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Helper: Ambil role dari tabel public.users.
 * Jika DB tidak bisa diakses atau data tidak ada, fallback ke user.user_metadata?.role
 * agar middleware tetap bisa membuat keputusan redirect yang benar.
 */
async function getRoleFromDB(
    supabase: ReturnType<typeof createServerClient>,
    userId: string,
    metadataRole?: string
): Promise<string> {
    try {
        const { data, error } = await supabase
            .from("users")
            .select("role")
            .eq("id", userId)
            .single();

        if (error) {
            console.warn("[middleware] DB role fetch error, using metadata fallback:", error.message);
            return metadataRole || "customer";
        }
        // Kembalikan role dari DB, atau fallback ke metadata/customer
        return data?.role || metadataRole || "customer";
    } catch (e) {
        // DB tidak bisa diakses sama sekali (network error)
        console.warn("[middleware] DB role fetch exception, using metadata fallback:", e);
        return metadataRole || "customer";
    }
}

/** Helper: Buat response redirect dengan cookie sesi yang sudah diset. */
function makeRedirect(request: NextRequest, pathname: string, params?: Record<string, string>) {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    url.search = "";
    if (params) {
        Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    }
    return NextResponse.redirect(url);
}

/** Helper: Buat response force-logout — hapus semua auth cookies dan redirect login. */
function makeForceLogout(request: NextRequest, reason: string) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    url.search = "";
    url.searchParams.set("error", reason);
    const response = NextResponse.redirect(url);

    // Hapus SEMUA cookie yang terkait sesi Supabase
    request.cookies.getAll().forEach((cookie) => {
        if (
            cookie.name.includes("auth-token") ||
            cookie.name.includes("supabase") ||
            cookie.name.includes("sb-")
        ) {
            response.cookies.delete(cookie.name);
        }
    });

    return response;
}

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({ request });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    );
                    supabaseResponse = NextResponse.next({ request });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    const pathname = request.nextUrl.pathname;
    const protectedPaths = ["/checkout", "/dashboard", "/booking", "/admin"];
    const isProtectedRoute = protectedPaths.some((path) => pathname.startsWith(path));

    // ─── 1. PENGECEKAN AWAL (Mencegah log "Auth session missing") ───
    const hasSessionCookie = request.cookies.getAll().some(c => 
        c.name.includes('auth-token') || c.name.includes('sb-')
    );

    if (!hasSessionCookie) {
        if (isProtectedRoute) {
            const url = request.nextUrl.clone();
            url.pathname = "/auth/login";
            url.searchParams.set("redirectTo", pathname);
            return NextResponse.redirect(url);
        }
        return supabaseResponse;
    }

    // ─── 2. AMBIL USER ───
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        if (isProtectedRoute) {
            const url = request.nextUrl.clone();
            url.pathname = "/auth/login";
            return NextResponse.redirect(url);
        }
        return supabaseResponse;
    }

    // ─── 3. DATABASE-FIRST ROLE (dengan fallback ke metadata) ───
    const role = await getRoleFromDB(supabase, user.id, user.user_metadata?.role);

    // ─── 4. LOGIKA ROUTING & PROTEKSI ROLE ───
    if (pathname.startsWith("/admin") && role !== "admin") {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
    }

    if (role === "provider") {
        if (pathname === "/" || pathname === "/services") {
            const url = request.nextUrl.clone();
            url.pathname = "/dashboard/provider/orders";
            return NextResponse.redirect(url);
        }

        if (pathname.startsWith("/dashboard/provider") && !pathname.startsWith("/dashboard/provider/setup")) {
            const { data: providerRecord } = await supabase
                .from("providers")
                .select("verification_status, is_active")
                .eq("owner_user_id", user.id)
                .single();

            const isVerified = providerRecord?.verification_status === "verified" && providerRecord?.is_active;
            
            if (!isVerified) {
                const url = request.nextUrl.clone();
                url.pathname = "/dashboard/provider/setup";
                return NextResponse.redirect(url);
            }
        }
    }

    if (role === "customer" && pathname.startsWith("/dashboard/provider")) {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
    }

    if (pathname.startsWith("/auth")) {
        const url = request.nextUrl.clone();
        if (role === "admin") url.pathname = "/admin";
        else if (role === "provider") url.pathname = "/dashboard/provider/orders";
        else url.pathname = "/dashboard";
        return NextResponse.redirect(url);
    }

    return supabaseResponse;
}
