"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

async function getUserProfile(
    supabase: Awaited<ReturnType<typeof createClient>>,
    userId: string,
    fallbackRole?: string
): Promise<{ role: string; wantsProvider: boolean }> {
    try {
        const { data, error } = await supabase
            .from("users")
            .select("role, wants_provider")
            .eq("id", userId)
            .maybeSingle();
        if (error) throw error;
        return {
            role: data?.role ?? fallbackRole ?? "customer",
            wantsProvider: !!data?.wants_provider,
        };
    } catch {
        return { role: fallbackRole ?? "customer", wantsProvider: false };
    }
}

export async function signUp(formData: FormData) {
    const supabase = await createClient();

    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const role = formData.get("role") as string;

    if (!name || !email || !password) {
        redirect("/auth/register?error=Semua+field+harus+diisi");
    }

    if (!role || !["customer", "provider"].includes(role)) {
        redirect(
            "/auth/register?error=" +
            encodeURIComponent("Silakan pilih peran (Customer/Provider).")
        );
    }

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name, role } },
    });

    if (error) {
        redirect(`/auth/register?error=${encodeURIComponent(error.message)}`);
    }

    if (data.user?.identities?.length === 0) {
        redirect(
            "/auth/login?error=" +
            encodeURIComponent("Email sudah terdaftar. Silakan login atau cek email Anda.")
        );
    }

    if (data.user && !data.session) {
        redirect(
            "/auth/login?message=" +
            encodeURIComponent("Registrasi berhasil! Silakan cek email untuk konfirmasi, lalu login.")
        );
    }

    if (data.user) {
        const userUpsertPromise = (async () => {
            const firstTry = await supabase
                .from("users")
                .upsert(
                    { id: data.user.id, name, email, role, wants_provider: role === "provider" },
                    { onConflict: "id" }
                );

            if (!firstTry.error) return firstTry;

            // Backward compatibility: jika kolom wants_provider belum dimigrasi.
            if (firstTry.error.message.toLowerCase().includes("wants_provider")) {
                return supabase
                    .from("users")
                    .upsert(
                        { id: data.user.id, name, email, role },
                        { onConflict: "id" }
                    );
            }

            return firstTry;
        })();

        const providerInsertPromise = role === "provider"
            ? supabase
                .from("providers")
                .insert({ owner_user_id: data.user.id, name, is_active: false })
            : Promise.resolve({ error: null });

        const [usersResult, providerResult] = await Promise.all([
            userUpsertPromise,
            providerInsertPromise,
        ]);

        if (usersResult.error) {
            console.error("Gagal menyimpan data ke tabel users:", usersResult.error.message);
            redirect(
                "/auth/register?error=" +
                encodeURIComponent("Akun berhasil dibuat, namun gagal menyimpan profil. Silakan hubungi admin.")
            );
        }

        if (role === "provider" && providerResult.error) {
            console.error("Gagal membuat profil provider:", providerResult.error.message);
        }

        if (role === "provider") {
            revalidatePath("/", "layout");
            redirect("/dashboard/provider/setup");
        }
    }

    revalidatePath("/", "layout");
    redirect("/");
}

export async function signIn(formData: FormData) {
    const supabase = await createClient();

    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const redirectTo = (formData.get("redirectTo") as string) || "/";

    if (!email || !password) {
        redirect("/auth/login?error=Email+dan+password+harus+diisi");
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        let errorMessage = error.message;
        if (error.message === "Email not confirmed") {
            errorMessage = "Email belum dikonfirmasi. Silakan cek inbox email Anda.";
        } else if (error.message === "Invalid login credentials") {
            errorMessage = "Email atau password salah.";
        }
        redirect(`/auth/login?error=${encodeURIComponent(errorMessage)}`);
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        const { role, wantsProvider } = await getUserProfile(supabase, user.id, user.user_metadata?.role);
        revalidatePath("/", "layout");

        if (role === "admin") redirect("/admin");
        if (role === "provider") {
            const { data: providerRecord } = await supabase
                .from("providers")
                .select("verification_status, is_active")
                .eq("owner_user_id", user.id)
                .maybeSingle();

            const isVerified = providerRecord?.verification_status === "verified" && !!providerRecord?.is_active;
            redirect(isVerified ? "/dashboard/provider/orders" : "/dashboard/provider/setup");
        }

        if (role === "customer" && wantsProvider) {
            redirect("/dashboard/provider/setup");
        }
    }

    revalidatePath("/", "layout");
    revalidatePath("/dashboard");
    redirect(redirectTo);
}

export async function signOut() {
    const supabase = await createClient();

    try {
        await supabase.auth.signOut({ scope: "global" });
    } catch (error) {
        console.warn("[signOut] Session mungkin sudah expired:", error);
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

    revalidatePath("/", "layout");
    redirect("/auth/login?message=Berhasil+keluar");
}
