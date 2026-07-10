import { createClient } from "@/lib/supabase/server";

export interface NavbarUser {
    id: string;
    email: string | null;
    name: string | null;
}

export interface NavbarAuthState {
    user: NavbarUser | null;
    role: string | null;
    providerVerified: boolean;
    isLoading: boolean;
}

export const guestNavbarState: NavbarAuthState = {
    user: null,
    role: null,
    providerVerified: false,
    isLoading: false,
};

export async function getServerNavbarAuthState(): Promise<NavbarAuthState> {
    try {
        const supabase = await createClient();
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) return guestNavbarState;

        const navbarUser: NavbarUser = {
            id: user.id,
            email: user.email ?? null,
            name: (user.user_metadata?.name as string | undefined) ?? null,
        };

        const { data: userRecord } = await supabase
            .from("users")
            .select("role")
            .eq("id", user.id)
            .maybeSingle();

        const role = userRecord?.role ?? null;
        if (!role) {
            return {
                user: navbarUser,
                role: null,
                providerVerified: false,
                isLoading: true,
            };
        }

        let providerVerified = false;
        if (role === "provider") {
            const { data: provider } = await supabase
                .from("providers")
                .select("verification_status, is_active")
                .eq("owner_user_id", user.id)
                .maybeSingle();

            providerVerified = provider?.verification_status === "verified" && !!provider?.is_active;
        }

        return {
            user: navbarUser,
            role,
            providerVerified,
            isLoading: false,
        };
    } catch {
        return guestNavbarState;
    }
}
