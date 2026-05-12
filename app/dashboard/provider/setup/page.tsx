import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProviderSetupClient, { type ProviderProfileSnapshot } from "./ProviderSetupClient";

export const dynamic = "force-dynamic";

interface ProviderSetupPageProps {
    searchParams?: {
        notice?: string;
        submitted?: string;
    };
}

type ProviderMode = "setup" | "pending" | "verified" | "rejected";

function resolveMode(provider: ProviderProfileSnapshot | null): ProviderMode {
    if (!provider) return "setup";
    if (provider.verification_status === "verified" && provider.is_active) return "verified";
    if (provider.verification_status === "rejected") return "rejected";
    if (!provider.identity_card_url) return "setup";
    return "pending";
}

export default async function ProviderSetupPage({ searchParams }: ProviderSetupPageProps) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/auth/login");
    }

    const [{ data: userRecord }, { data: provider }] = await Promise.all([
        supabase
            .from("users")
            .select("role, wants_provider")
            .eq("id", user.id)
            .maybeSingle(),
        supabase
            .from("providers")
            .select("id, name, location, contact, description, primary_type, latitude, longitude, verification_status, is_active, identity_card_url, certification_url")
            .eq("owner_user_id", user.id)
            .maybeSingle(),
    ]);

    const role = userRecord?.role ?? user.user_metadata?.role ?? "customer";
    const wantsProvider = !!userRecord?.wants_provider;

    if (role !== "provider" && !wantsProvider && !provider) {
        redirect("/dashboard");
    }

    const profile: ProviderProfileSnapshot | null = provider
        ? {
            id: provider.id,
            name: provider.name ?? null,
            location: provider.location ?? null,
            contact: provider.contact ?? null,
            description: provider.description ?? null,
            primary_type: provider.primary_type ?? null,
            latitude: provider.latitude ?? null,
            longitude: provider.longitude ?? null,
            verification_status: provider.verification_status ?? null,
            is_active: provider.is_active ?? null,
            identity_card_url: provider.identity_card_url ?? null,
            certification_url: provider.certification_url ?? null,
        }
        : null;

    return (
        <ProviderSetupClient
            mode={resolveMode(profile)}
            provider={profile}
            notice={searchParams?.notice ?? null}
            submitted={searchParams?.submitted === "1"}
        />
    );
}
