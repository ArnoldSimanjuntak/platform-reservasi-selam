"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

/**
 * Helper: Ambil role user langsung dari tabel public.users (STRICT).
 * Tidak mengandalkan user_metadata karena bisa stale setelah perubahan manual.
 */
async function getStrictRole(
    supabase: Awaited<ReturnType<typeof createClient>>,
    userId: string,
    fallback?: string
): Promise<string> {
    try {
        const { data, error } = await supabase
            .from("users")
            .select("role")
            .eq("id", userId)
            .single();
        if (error) throw error;
        return data?.role ?? fallback ?? "customer";
    } catch {
        return fallback ?? "customer";
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

    // Validasi role — hanya customer atau provider yang diizinkan mendaftar
    if (!role || !["customer", "provider"].includes(role)) {
        redirect(
            "/auth/register?error=" +
            encodeURIComponent("Silakan pilih peran (Customer/Provider).")
        );
    }

    // ─── 1. Buat akun di Supabase Auth ────────────────────────────────────
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

    // ─── 2. Simpan role ke tabel public.users ─────────────────────────────
    if (data.user) {
        const { error: usersError } = await supabase
            .from("users")
            .upsert(
                { id: data.user.id, name, email, role },
                { onConflict: "id" }
            );

        if (usersError) {
            console.error("Gagal menyimpan data ke tabel users:", usersError.message);
            redirect(
                "/auth/register?error=" +
                encodeURIComponent("Akun berhasil dibuat, namun gagal menyimpan profil. Silakan hubungi admin.")
            );
        }

        // ─── 3. Jika Provider, buat skeleton row di tabel providers ───────
        if (role === "provider") {
            const { error: providerError } = await supabase
                .from("providers")
                .insert({ owner_user_id: data.user.id, name, is_active: false });

            if (providerError) {
                console.error("Gagal membuat profil provider:", providerError.message);
                // Non-blocking — provider bisa melengkapi dari halaman setup
            }

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

    // ─── Ambil role dari DB (STRICT) untuk redirect yang akurat ───────────
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        const role = await getStrictRole(supabase, user.id, user.user_metadata?.role);

        revalidatePath("/", "layout");

        if (role === "admin") {
            redirect("/admin");
        }
        if (role === "provider") {
            redirect("/dashboard/provider/orders");
        }
    }

    revalidatePath("/", "layout");
    revalidatePath("/dashboard");
    redirect(redirectTo);
}

/**
 * signOut: Logout yang eksplisit dan tahan terhadap Ghost Session.
 * 
 * Ghost Session terjadi ketika cookie auth masih ada di browser tapi
 * sesi sudah tidak valid di Supabase DB. Fungsi ini menangani kasus itu
 * dengan: (1) mencoba signOut normal, (2) jika gagal, tetap lanjut
 * membersihkan cookie secara manual, (3) revalidasi seluruh cache.
 */
export async function signOut() {
    const supabase = await createClient();

    // 1. Coba hapus sesi — bungkus try-catch untuk ghost session
    try {
        await supabase.auth.signOut();
    } catch (error) {
        // Ghost session: sesi di DB sudah tidak ada tapi cookie masih ada.
        // Tidak perlu throw — kita tetap lanjut membersihkan cookie di bawah.
        console.warn("[signOut] Session mungkin sudah expired:", error);
    }

    // 2. Hapus cookie auth secara eksplisit sebagai safety net
    const cookieStore = await cookies();
    cookieStore.getAll().forEach((cookie) => {
        if (
            cookie.name.includes("auth-token") ||
            cookie.name.includes("supabase") ||
            cookie.name.includes("sb-")
        ) {
            cookieStore.delete(cookie.name);
        }
    });

    // 3. Revalidasi semua rute untuk membuang data 'stale' (basi)
    revalidatePath("/", "layout");
    revalidatePath("/dashboard", "layout");
    revalidatePath("/admin", "layout");

    // 4. Redirect — ini akan throw NEXT_REDIRECT yang ditangkap oleh
    // handleSignOut di Navbar.tsx, lalu finally block melakukan hard redirect.
    redirect("/auth/login?message=Berhasil+keluar");
}

