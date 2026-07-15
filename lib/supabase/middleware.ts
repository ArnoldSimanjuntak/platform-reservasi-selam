import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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
    // Ambil profil pengguna dan status provider dalam satu putaran jaringan.
    // Hasilnya dipakai ulang agar setiap keputusan redirect tidak mengulang query.
    const { role, wantsProvider, providerRecord } = await (async () => {
        try {
            const [profileResult, providerResult] = await Promise.all([
                supabase
                    .from("users")
                    .select("role, wants_provider")
                    .eq("id", user.id)
                    .maybeSingle(),
                supabase
                    .from("providers")
                    .select("verification_status, is_active")
                    .eq("owner_user_id", user.id)
                    .maybeSingle(),
            ]);

            if (profileResult.error) {
                console.warn(
                    "[middleware] DB profile fetch error, using least-privilege role:",
                    profileResult.error.message
                );
            }
            if (providerResult.error) {
                console.warn(
                    "[middleware] DB provider fetch error, treating provider as unverified:",
                    providerResult.error.message
                );
            }

            // Jangan gunakan user_metadata sebagai fallback karena session cookie
            // dapat tertinggal setelah admin mengubah role di database.
            const resolvedRole = profileResult.error || !profileResult.data?.role
                ? "customer"
                : profileResult.data.role;

            return {
                role: resolvedRole,
                wantsProvider: resolvedRole === "customer" && !!profileResult.data?.wants_provider,
                providerRecord: providerResult.error ? null : providerResult.data,
            };
        } catch (error) {
            // Gangguan jaringan tidak boleh membuat seluruh navigasi gagal.
            console.warn("[middleware] Access context fetch failed:", error);
            return {
                role: "customer",
                wantsProvider: false,
                providerRecord: null,
            };
        }
    })();

    const isVerifiedProvider = providerRecord?.verification_status === "verified" && !!providerRecord.is_active;
    const hasPendingProviderProfile = role === "customer" && !!providerRecord && !isVerifiedProvider;

    // ─── 3. LOGIKA ROUTING & PROTEKSI ROLE ───
    if (pathname.startsWith("/admin") && role !== "admin") {
        return redirectWithSessionCookies(request, supabaseResponse, "/dashboard");
    }

    if (role === "provider") {
        if (pathname === "/" || pathname === "/services") {
            return redirectWithSessionCookies(
                request,
                supabaseResponse,
                isVerifiedProvider ? "/dashboard" : "/dashboard/provider/setup"
            );
        }

        if (pathname.startsWith("/dashboard/provider") && !pathname.startsWith("/dashboard/provider/setup")) {
            if (!isVerifiedProvider) {
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
            return redirectWithSessionCookies(
                request,
                supabaseResponse,
                isVerifiedProvider ? "/dashboard" : "/dashboard/provider/setup"
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
