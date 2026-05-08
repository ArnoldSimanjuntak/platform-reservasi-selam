import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
    try {
        const supabase = await createClient();
        await supabase.auth.signOut({ scope: "global" });
    } catch (error) {
        console.warn("[idle-signout] Supabase signOut skipped:", error);
    }

    const cookieStore = await cookies();
    cookieStore.getAll().forEach((cookie) => {
        if (
            cookie.name.includes("auth-token") ||
            cookie.name.includes("supabase") ||
            cookie.name.includes("sb-")
        ) {
            cookieStore.delete(cookie.name);
            cookieStore.set(cookie.name, "", {
                path: "/",
                maxAge: 0,
                expires: new Date(0),
            });
        }
    });

    return NextResponse.json(
        { ok: true },
        { headers: { "Cache-Control": "private, no-store" } }
    );
}
