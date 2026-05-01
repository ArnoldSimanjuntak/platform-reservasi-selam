import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Helper: Ambil role dari tabel public.users (STRICT — tidak dari metadata).
 * Alasan: user_metadata.role bisa stale jika Admin diassign manual tanpa re-login.
 * Fallback ke metadata HANYA jika DB benar-benar tidak bisa diakses (network error).
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

        if (error) throw error;
        // Kembalikan role dari DB jika ada, fallback ke metadata jika baris tidak ada
        return data?.role ?? metadataRole ?? "customer";
    } catch {
        // DB tidak bisa diakses (network putus sesaat) — fallback ke metadata
        // Ini mencegah user ter-lock-out, bukan bypass security
        console.warn("[middleware] DB role fetch failed, using metadata fallback");
        return metadataRole ?? "customer";
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
                    // PENTING: Tulis cookie ke request DAN ke response agar sesi
                    // selalu di-refresh saat user berpindah halaman.
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

    // PENTING: Panggil getUser() LANGSUNG setelah createServerClient — ini yang
    // me-refresh access token secara otomatis. Jangan sisipkan kode di antaranya.
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    // ─── 0. Auth Error Handling ───────────────────────────────────────────────
    // Jika refresh token sudah tidak valid, paksa logout total untuk mencegah
    // reload loop ERR_TOO_MANY_REDIRECTS.
    if (authError) {
        const msg = authError.message ?? "";
        if (
            msg.includes("refresh_token_not_found") ||
            msg.includes("invalid_refresh_token") ||
            msg.includes("Invalid Refresh Token")
        ) {
            return makeForceLogout(request, "Sesi telah berakhir. Silakan login ulang.");
        }
    }

    const pathname = request.nextUrl.pathname;

    // ─── 1. Admin-only routes: /admin/* ──────────────────────────────────────
    // Cakupan: /admin, /admin/verifikasi, /admin/services, /admin/orders
    if (pathname.startsWith("/admin")) {
        if (!user) {
            return makeRedirect(request, "/auth/login", {
                error: "Akses ditolak. Silakan login sebagai Admin.",
            });
        }

        // STRICT: Selalu ambil role dari DB, BUKAN dari metadata
        const role = await getRoleFromDB(supabase, user.id, user.user_metadata?.role);

        if (role !== "admin") {
            return makeRedirect(request, "/auth/login", {
                error: "Akses ditolak. Halaman ini hanya untuk Admin.",
            });
        }

        // Admin OK — lanjutkan tanpa redirect
        return supabaseResponse;
    }

    // ─── 2. Protected routes — wajib login ───────────────────────────────────
    const protectedPaths = ["/checkout", "/dashboard", "/booking"];
    const isProtectedRoute = protectedPaths.some((p) => pathname.startsWith(p));

    if (!user && isProtectedRoute) {
        return makeRedirect(request, "/auth/login", { redirectTo: pathname });
    }

    if (user) {
        // Ambil role dari DB STRICT untuk semua guard di bawah.
        // Cache-kan hasil agar tidak query ulang di setiap branch.
        const role = await getRoleFromDB(supabase, user.id, user.user_metadata?.role);

        // ─── 3. Bypass guard untuk Admin ─────────────────────────────────────
        // Admin boleh mengakses SEMUA rute dashboard dan provider tanpa pembatasan.
        if (role !== "admin") {

            // ─── 4. Provider → blokir landing page & /services ───────────────
            if (role === "provider" && (pathname === "/" || pathname.startsWith("/services"))) {
                return makeRedirect(request, "/dashboard/provider/orders");
            }

            // ─── 4b. Onboarding Guard: Provider belum terverifikasi ───────────
            // Hanya aktif untuk rute /dashboard/provider/* (bukan /setup itu sendiri)
            if (
                role === "provider" &&
                pathname.startsWith("/dashboard/provider") &&
                !pathname.startsWith("/dashboard/provider/setup")
            ) {
                try {
                    const { data: providerRecord } = await supabase
                        .from("providers")
                        .select("verification_status, is_active")
                        .eq("owner_user_id", user.id)
                        .single();

                    const isVerified =
                        providerRecord?.verification_status === "verified" &&
                        providerRecord?.is_active;

                    if (!isVerified) {
                        return makeRedirect(request, "/dashboard/provider/setup", {
                            notice: "Akun Anda sedang menunggu verifikasi Admin.",
                        });
                    }
                } catch {
                    // Jika DB tidak responsif, biarkan provider lanjut daripada loop
                }
            }

            // ─── 5. Customer → blokir /dashboard/provider/* ──────────────────
            if (role === "customer" && pathname.startsWith("/dashboard/provider")) {
                return makeRedirect(request, "/dashboard");
            }
        }

        // ─── 6. Sudah login → jangan buka halaman auth ───────────────────────
        if (pathname.startsWith("/auth")) {
            const destination =
                role === "admin"    ? "/admin" :
                role === "provider" ? "/dashboard/provider/orders" :
                "/";
            return makeRedirect(request, destination);
        }
    }

    // Kembalikan supabaseResponse apa adanya agar cookie sesi tersinkronisasi.
    return supabaseResponse;
}
