import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Helper: Ambil role dari tabel public.users.
 * Jangan fallback ke user_metadata karena metadata tersimpan di session cookie
 * dan bisa stale setelah admin mengubah role di DB.
 */
async function getRoleFromDB(
    supabase: ReturnType<typeof createServerClient>,
    userId: string
): Promise<string> {
    try {
        const { data, error } = await supabase
            .from("users")
            .select("role")
            .eq("id", userId)
            .maybeSingle();

        if (error) {
            console.warn("[middleware] DB role fetch error, using least-privilege role:", error.message);
            return "customer";
        }
        return data?.role || "customer";
    } catch (e) {
        // DB tidak bisa diakses sama sekali (network error)
        console.warn("[middleware] DB role fetch exception, using least-privilege role:", e);
        return "customer";
    }
}

async function getOnboardingFlagFromDB(
    supabase: ReturnType<typeof createServerClient>,
    userId: string
): Promise<boolean> {
    try {
        const { data, error } = await supabase
            .from("users")
            .select("wants_provider")
            .eq("id", userId)
            .maybeSingle();

        if (error) return false;
        return !!data?.wants_provider;
    } catch {
        return false;
    }
}

async function getPendingProviderProfileFromDB(
    supabase: ReturnType<typeof createServerClient>,
    userId: string
): Promise<boolean> {
    try {
        const { data, error } = await supabase
            .from("providers")
            .select("verification_status, is_active")
            .eq("owner_user_id", userId)
            .maybeSingle();

        if (error || !data) return false;
        return data.verification_status !== "verified" || !data.is_active;
    } catch {
        return false;
    }
}

function redirectWithSessionCookies(
    request: NextRequest,
    supabaseResponse: NextResponse,
    pathname: string
) {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    const response = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
        response.cookies.set(cookie.name, cookie.value, cookie);
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

    // ─── 1. AMBIL USER ───
    // Ikuti pattern Supabase SSR: panggil getUser() langsung setelah createServerClient
    // agar refresh sesi/cookie sinkron antara browser dan server.
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        if (isProtectedRoute) {
            return redirectWithSessionCookies(request, supabaseResponse, "/auth/login");
        }
        return supabaseResponse;
    }

    // ─── 2. DATABASE-FIRST ROLE (tanpa fallback ke metadata/cookie) ───
    const role = await getRoleFromDB(supabase, user.id);
    const [wantsProvider, hasPendingProviderProfile] = role === "customer"
        ? await Promise.all([
            getOnboardingFlagFromDB(supabase, user.id),
            getPendingProviderProfileFromDB(supabase, user.id),
        ])
        : [false, false];

    // ─── 3. LOGIKA ROUTING & PROTEKSI ROLE ───
    if (pathname.startsWith("/admin") && role !== "admin") {
        return redirectWithSessionCookies(request, supabaseResponse, "/dashboard");
    }

    if (role === "provider") {
        const { data: providerRecord } = await supabase
            .from("providers")
            .select("verification_status, is_active")
            .eq("owner_user_id", user.id)
            .maybeSingle();

        const isVerified = providerRecord?.verification_status === "verified" && providerRecord?.is_active;

        if (pathname === "/" || pathname === "/services") {
            return redirectWithSessionCookies(
                request,
                supabaseResponse,
                isVerified ? "/dashboard" : "/dashboard/provider/setup"
            );
        }

        if (pathname.startsWith("/dashboard/provider") && !pathname.startsWith("/dashboard/provider/setup")) {
            if (!isVerified) {
                return redirectWithSessionCookies(request, supabaseResponse, "/dashboard/provider/setup");
            }
        }
    }

    // Customer boleh mengakses setup provider untuk proses pengajuan/verifikasi identitas.
    // Selain route setup, customer tetap dilarang masuk area operasional provider.
    if (
        role === "customer" &&
        pathname.startsWith("/dashboard/provider") &&
        (
            !pathname.startsWith("/dashboard/provider/setup") ||
            (!wantsProvider && !hasPendingProviderProfile)
        )
    ) {
        return redirectWithSessionCookies(request, supabaseResponse, "/dashboard");
    }

    if (pathname.startsWith("/auth")) {
        if (role === "admin") {
            return redirectWithSessionCookies(request, supabaseResponse, "/admin");
        }
        else if (role === "provider") {
            const { data: providerRecord } = await supabase
                .from("providers")
                .select("verification_status, is_active")
                .eq("owner_user_id", user.id)
                .maybeSingle();

            const isVerified = providerRecord?.verification_status === "verified" && providerRecord?.is_active;
            return redirectWithSessionCookies(
                request,
                supabaseResponse,
                isVerified ? "/dashboard" : "/dashboard/provider/setup"
            );
        }
        else {
            return redirectWithSessionCookies(
                request,
                supabaseResponse,
                wantsProvider || hasPendingProviderProfile ? "/dashboard/provider/setup" : "/dashboard"
            );
        }
    }

    return supabaseResponse;
}
