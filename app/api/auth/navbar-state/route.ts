import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { NavbarInitialAuthState } from "@/components/Navbar";

const guestState: NavbarInitialAuthState = {
    user: null,
    role: null,
    providerVerified: false,
    isLoading: false,
};

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
            return NextResponse.json(guestState, {
                headers: { "Cache-Control": "private, no-store" },
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
            isLoading: role === null,
        };

        return NextResponse.json(state, {
            headers: { "Cache-Control": "private, no-store" },
        });
    } catch {
        return NextResponse.json(guestState, {
            headers: { "Cache-Control": "private, no-store" },
        });
    }
}
