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

    // IMPORTANT: Do not add code between createServerClient and
    // supabase.auth.getUser(). A simple mistake could make it very
    // hard to debug issues with users being randomly logged out.

    const {
        data: { user },
    } = await supabase.auth.getUser();

    // Protected routes — redirect ke login jika belum auth
    const protectedPaths = ["/checkout", "/dashboard", "/booking"];
    const isProtectedRoute = protectedPaths.some((path) =>
        request.nextUrl.pathname.startsWith(path)
    );

    if (!user && isProtectedRoute) {
        const url = request.nextUrl.clone();
        url.pathname = "/auth/login";
        url.searchParams.set("redirectTo", request.nextUrl.pathname);
        return NextResponse.redirect(url);
    }

    // Jika sudah login dan mengakses halaman auth, redirect ke home
    if (user && request.nextUrl.pathname.startsWith("/auth")) {
        const url = request.nextUrl.clone();
        url.pathname = "/";
        return NextResponse.redirect(url);
    }

    // IMPORTANT: You *must* return the supabaseResponse object as it is.
    // If you're creating a new response object with NextResponse.next(), make sure to:
    // 1. Pass the request in it
    // 2. Copy over the cookies
    // 3. Change the response object to fit your needs
    // 4. Return it
    // If this is not done, the browser and server can go out of sync
    // and terminate the user's session prematurely!

    return supabaseResponse;
}
