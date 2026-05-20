import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { NavbarInitialAuthState } from "@/components/Navbar";

const guestState: NavbarInitialAuthState = {
    user: null,
    role: null,
    providerVerified: false,
    isLoading: false,
};

const noStoreHeaders = {
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
    "CDN-Cache-Control": "no-store",
    "Vercel-CDN-Cache-Control": "no-store",
    Pragma: "no-cache",
    Expires: "0",
};

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
            return NextResponse.json(guestState, {
                headers: noStoreHeaders,
            });
        }

        const { data: userRecord } = await supabase
            .from("users")
            .select("role")
            .eq("id", user.id)
            .maybeSingle();

        const role = userRecord?.role ?? null;
        let providerVerified = false;

        if (role === "provider") {
            const { data: provider } = await supabase
                .from("providers")
                .select("verification_status, is_active")
                .eq("owner_user_id", user.id)
                .maybeSingle();

            providerVerified = provider?.verification_status === "verified" && !!provider?.is_active;
        }

        const state: NavbarInitialAuthState = {
            user: {
                id: user.id,
                email: user.email ?? null,
                name: (user.user_metadata?.name as string | undefined) ?? null,
            },
            role,
            providerVerified,
            isLoading: false,
        };

        return NextResponse.json(state, {
            headers: noStoreHeaders,
        });
    } catch {
        return NextResponse.json(guestState, {
            headers: noStoreHeaders,
        });
    }
}
