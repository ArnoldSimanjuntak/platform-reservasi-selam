"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signUp(formData: FormData) {
    const supabase = await createClient();

    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!name || !email || !password) {
        redirect("/auth/register?error=Semua+field+harus+diisi");
    }

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                name,
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

    // Registrasi berhasil & auto-confirmed → redirect ke halaman utama
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
