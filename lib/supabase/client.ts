import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            auth: {
                // Simpan sesi di localStorage agar user tidak perlu login ulang saat refresh tab
                persistSession: true,
                // Otomatis perbarui access token sebelum kedaluwarsa (default: 60 detik sebelum expiry)
                // Jika refresh gagal (mis. refresh token dicabut), Supabase emit SIGNED_OUT
                autoRefreshToken: true,
            },
        }
    );
}
