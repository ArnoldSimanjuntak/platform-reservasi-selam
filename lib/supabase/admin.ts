import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export function createServiceRoleClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceRoleKey) return null;

    return createSupabaseClient(url, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
}

export const getAdminContext = cache(async () => {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/auth/login");

    const { data: userRecord } = await supabase
        .from("users")
        .select("role, name")
        .eq("id", user.id)
        .maybeSingle();

    if (userRecord?.role !== "admin") redirect("/dashboard");

    const adminName =
        userRecord.name ||
        (user.user_metadata?.name as string | undefined) ||
        user.email?.split("@")[0] ||
        "Admin";

    return {
        user,
        adminName,
        supabase,
        adminDb: createServiceRoleClient() ?? supabase,
    };
});
