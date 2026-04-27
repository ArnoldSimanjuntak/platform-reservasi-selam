import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    });

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
                    supabaseResponse = NextResponse.next({
                        request,
                    });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    // IMPORTANT: Jangan tambahkan kode di antara createServerClient dan getUser().
    // getUser() sekaligus me-refresh access token secara otomatis jika mendekati
    // kedaluwarsa — ini yang mencegah masalah 'akun tersangkut'.
    const {
        data: { user },
    } = await supabase.auth.getUser();

    const pathname = request.nextUrl.pathname;

    // ─── 1. Admin-only routes: /admin/* ───────────────────────────────
    // Untuk rute admin, cross-check ke DB karena metadata bisa stale jika
    // user dipromosikan manual menjadi admin tanpa re-login.
    if (pathname.startsWith("/admin")) {
        if (!user) {
            const url = request.nextUrl.clone();
            url.pathname = "/auth/login";
            url.searchParams.set("error", "Akses+ditolak.+Silakan+login+sebagai+Admin.");
            return NextResponse.redirect(url);
        }

        const { data: dbUser } = await supabase
            .from("users")
            .select("role")
            .eq("id", user.id)
            .single();
        const role = dbUser?.role ?? user.user_metadata?.role;

        if (role !== "admin") {
            const url = request.nextUrl.clone();
            url.pathname = "/auth/login";
            url.searchParams.set("error", "Akses+ditolak.+Halaman+ini+hanya+untuk+Admin.");
            return NextResponse.redirect(url);
        }

        // Admin OK — langsung lanjutkan, JANGAN redirect ke mana pun
        return supabaseResponse;
    }

    // ─── 2. Protected routes — harus login ────────────────────────────
    const protectedPaths = ["/checkout", "/dashboard", "/booking"];
    const isProtectedRoute = protectedPaths.some((path) =>
        pathname.startsWith(path)
    );

    if (!user && isProtectedRoute) {
        const url = request.nextUrl.clone();
        url.pathname = "/auth/login";
        url.searchParams.set("redirectTo", pathname);
        return NextResponse.redirect(url);
    }

    if (user) {
        // Gunakan metadata untuk guard cepat di sini (tidak perlu DB query lagi)
        const role = user.user_metadata?.role;

        // ─── 3. Admin → blokir akses ke /dashboard/* wisatawan biasa ──────
        // Catatan: Admin BOLEH akses "/" dan "/services" sebagai superadmin.
        if (role === "admin" && pathname.startsWith("/dashboard") && !pathname.startsWith("/dashboard/provider")) {
            const url = request.nextUrl.clone();
            url.pathname = "/admin/verifikasi";
            return NextResponse.redirect(url);
        }

        // ─── 4. Provider → blokir landing page & /services (mereka punya halaman sendiri) ─
        if (role === "provider" && (pathname === "/" || pathname.startsWith("/services"))) {
            const url = request.nextUrl.clone();
            url.pathname = "/dashboard/provider/orders";
            return NextResponse.redirect(url);
        }

        // ─── 4b. Strict Onboarding: Provider yang belum terverifikasi ──────
        // Jika provider mengakses rute mana pun selain /setup, cek status verifikasi.
        // Guard ini hanya aktif untuk rute provider (bukan /setup itu sendiri).
        if (
            role === "provider" &&
            pathname.startsWith("/dashboard/provider") &&
            !pathname.startsWith("/dashboard/provider/setup")
        ) {
            const { data: providerRecord } = await supabase
                .from("providers")
                .select("verification_status, is_active")
                .eq("owner_user_id", user.id)
                .single();

            // Jika provider belum terverifikasi atau belum aktif → paksa ke setup/onboarding
            const isVerified = providerRecord?.verification_status === "verified" && providerRecord?.is_active;
            if (!isVerified) {
                const url = request.nextUrl.clone();
                url.pathname = "/dashboard/provider/setup";
                url.searchParams.set("notice", "Akun+Anda+sedang+menunggu+verifikasi+Admin.");
                return NextResponse.redirect(url);
            }
        }

        // ─── 5. Customer → blokir /dashboard/provider/* ────────────────────
        if (role === "customer" && pathname.startsWith("/dashboard/provider")) {
            const url = request.nextUrl.clone();
            url.pathname = "/dashboard";
            return NextResponse.redirect(url);
        }

        // ─── 6. Sudah login → tidak perlu kunjungi halaman auth lagi ───────
        if (pathname.startsWith("/auth")) {
            // Cross-check DB untuk redirect yang akurat
            const { data: dbUser } = await supabase
                .from("users")
                .select("role")
                .eq("id", user.id)
                .single();
            const realRole = dbUser?.role ?? role;

            const url = request.nextUrl.clone();
            url.pathname =
                realRole === "admin"    ? "/admin/verifikasi" :
                realRole === "provider" ? "/dashboard/provider/orders" :
                "/";
            return NextResponse.redirect(url);
        }
    }

    // Kembalikan supabaseResponse apa adanya agar cookie sesi tersinkronisasi.
    return supabaseResponse;
}
