import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
    return await updateSession(request);
}

export const config = {
    matcher: [
        "/",
        "/services",
        "/auth/:path*",
        "/dashboard/:path*",
        "/booking/:path*",
        "/checkout/:path*",
        "/admin/:path*",
    ],
};
