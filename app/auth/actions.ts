"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signUp(formData: FormData) {
    const supabase = await createClient();

    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const role = formData.get("role") as string;

    if (!name || !email || !password) {
        redirect("/auth/register?error=Semua+field+harus+diisi");
    }

    // Validasi role — harus customer atau provider
    if (!role || !["customer", "provider"].includes(role)) {
        redirect(
            "/auth/register?error=" +
            encodeURIComponent("Silakan pilih peran (Customer/Provider).")
        );
    }

    // ─── 1. Buat akun di Supabase Auth ────────────────────────
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                name,
                role,
            },
        },
    });

    if (error) {
        redirect(`/auth/register?error=${encodeURIComponent(error.message)}`);
    }

    // Cek apakah email confirmation diaktifkan di Supabase
    // Jika identities kosong, artinya user sudah ada tapi belum dikonfirmasi
    if (data.user && data.user.identities && data.user.identities.length === 0) {
        redirect(
            "/auth/login?error=" +
            encodeURIComponent("Email sudah terdaftar. Silakan login atau cek email Anda.")
        );
    }

    // Jika session null, artinya perlu konfirmasi email dulu
    if (data.user && !data.session) {
        redirect(
            "/auth/login?message=" +
            encodeURIComponent("Registrasi berhasil! Silakan cek email untuk konfirmasi, lalu login.")
        );
    }

    // ─── 2. Simpan role ke tabel users (custom) ───────────────
    // Gunakan upsert agar aman jika trigger database sudah insert terlebih dulu
    if (data.user) {
        const { error: usersError } = await supabase
            .from("users")
            .upsert(
                {
                    id: data.user.id,
                    name,
                    email,
                    role,
                },
                { onConflict: "id" }
            );

        if (usersError) {
            console.error("Gagal menyimpan data ke tabel users:", usersError.message);
            redirect(
                "/auth/register?error=" +
                encodeURIComponent(
                    "Akun berhasil dibuat, namun gagal menyimpan profil. Silakan hubungi admin."
                )
            );
        }

        // ─── 3. Jika Provider, buat skeleton di tabel providers ───
        if (role === "provider") {
            const { error: providerError } = await supabase
                .from("providers")
                .insert({
                    owner_user_id: data.user.id,
                    name,
                    is_active: false, // Belum aktif sampai profil lengkap
                });

            if (providerError) {
                console.error("Gagal membuat profil provider:", providerError.message);
                // Tidak blocking — provider bisa melengkapi nanti
            }

            // Redirect provider ke halaman setup profil bisnis
            redirect("/dashboard/provider/setup");
        }
    }

    // Registrasi berhasil & auto-confirmed (Customer) → redirect ke halaman utama
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

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        // Pesan yang lebih jelas untuk error umum
        let errorMessage = error.message;
        if (error.message === "Email not confirmed") {
            errorMessage =
                "Email belum dikonfirmasi. Silakan cek inbox email Anda atau minta kirim ulang.";
        } else if (error.message === "Invalid login credentials") {
            errorMessage = "Email atau password salah.";
        }
        redirect(`/auth/login?error=${encodeURIComponent(errorMessage)}`);
    }

    redirect(redirectTo);
}

export async function signOut() {
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/");
}
