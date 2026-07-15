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

const SERVER_NAVBAR_TIMEOUT_MS = 4_000;

async function resolveServerNavbarAuthState(): Promise<NavbarAuthState> {
    try {
        const supabase = await createClient();
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) return guestNavbarState;

        const navbarUser: NavbarUser = {
            id: user.id,
            email: user.email ?? null,
            name: (user.user_metadata?.name as string | undefined) ?? null,
        };

        // Jalankan pembacaan role dan status provider secara paralel agar navbar
        // provider tidak menunggu dua perjalanan jaringan yang berurutan.
        const [profileResult, providerResult] = await Promise.all([
            supabase
                .from("users")
                .select("role")
                .eq("id", user.id)
                .maybeSingle(),
            supabase
                .from("providers")
                .select("verification_status, is_active")
                .eq("owner_user_id", user.id)
                .maybeSingle(),
        ]);

        // Role navbar hanya mengatur tampilan, bukan otorisasi. Jika pembacaan
        // profil gagal sesaat, gunakan hak paling rendah agar navbar tetap bisa
        // dipakai dan sinkronisasi client dapat mencoba lagi di latar belakang.
        const role = profileResult.error || !profileResult.data?.role
            ? "customer"
            : profileResult.data.role;
        const providerVerified = role === "provider"
            && !providerResult.error
            && providerResult.data?.verification_status === "verified"
            && !!providerResult.data?.is_active;

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

export async function getServerNavbarAuthState(): Promise<NavbarAuthState> {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    try {
        return await Promise.race([
            resolveServerNavbarAuthState(),
            new Promise<NavbarAuthState>((resolve) => {
                timeoutId = setTimeout(() => resolve(guestNavbarState), SERVER_NAVBAR_TIMEOUT_MS);
            }),
        ]);
    } finally {
        if (timeoutId) clearTimeout(timeoutId);
    }
}
