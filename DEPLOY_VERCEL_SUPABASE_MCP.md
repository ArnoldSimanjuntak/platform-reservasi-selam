# Deploy-First Runbook (Vercel + Supabase + MCP)

Dokumen ini dibuat agar Anda bisa langsung pindah dari mode development ke environment live.

## 1) Arsitektur yang dipakai

- Frontend + server actions Next.js: deploy ke **Vercel**
- Database/Auth/Storage: tetap di **Supabase** (tidak dideploy ke Vercel)
- MCP untuk operasional/debug: **Supabase MCP server**

## 2) Prasyarat

- Akun Vercel
- Akun Supabase + project aktif
- Repo SulutDive sudah di GitHub
- `SUPABASE_SERVICE_ROLE_KEY` tersedia (untuk flow admin lintas-user)

## 3) Environment Variables di Vercel (wajib)

Set ke semua environment: `Production`, `Preview`, `Development`.

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`
  - Production: `https://<domain-produksi-anda>`
  - Preview: bisa pakai URL preview Vercel

Catatan:
- `SUPABASE_SERVICE_ROLE_KEY` jangan pernah diekspos ke client/browser.
- Variabel ini aman dipakai di server actions dan middleware server-side.

## 4) Deploy ke Vercel (UI paling cepat)

1. Buka Vercel dashboard -> **Add New Project**
2. Import repo SulutDive
3. Framework otomatis: **Next.js**
4. Isi Environment Variables (bagian #3)
5. Klik **Deploy**

Setelah deploy berhasil:
- Ambil URL production
- Update `NEXT_PUBLIC_APP_URL` ke URL production
- Redeploy sekali agar konsisten

## 5) Konfigurasi Auth Redirect di Supabase

Di Supabase Dashboard -> Authentication -> URL Configuration:

- Site URL: `https://<domain-produksi-anda>`
- Redirect URLs:
  - `https://<domain-produksi-anda>/auth/login`
  - `https://<domain-produksi-anda>/auth/register`
  - `https://<domain-preview-vercel-anda>/*` (opsional, untuk preview testing)

## 6) Jalankan migration SQL ke project Supabase production

Minimal migration yang sudah dipakai di kode auth terbaru:

1. `supabase/migration_wants_provider_flag.sql`
2. `supabase/migration_admin_users_update_policy.sql`

Disarankan juga memastikan migration onboarding/verifikasi sebelumnya sudah applied (providers + verification_status + owner_user_id).

Jika migration belum sinkron, gejala yang muncul biasanya:
- approve provider gagal
- role tidak berubah ke provider
- redirect onboarding tidak konsisten

## 7) Verifikasi smoke-test pasca deploy

1. Guest buka `/services`:
   - gambar layanan tampil stabil (tidak random generated)
2. Guest buka detail layanan:
   - klik `Add to Trip` -> diarahkan ke login jika belum login
3. Login sebagai admin:
   - buka `/admin/verifikasi`
   - tombol `Buat Layanan Platform` muncul
4. Approve provider:
   - tidak muncul error `PGRST116`
   - role user target berubah jadi `provider`

## 8) Setup MCP Supabase

### Opsi A: Read-only (aman untuk observasi)

Gunakan konfigurasi MCP Supabase dengan `read_only=true`.

Contoh (generic MCP client config):

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--project-ref=YOUR_PROJECT_REF",
        "--read-only=true"
      ],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "YOUR_SUPABASE_PERSONAL_ACCESS_TOKEN"
      }
    }
  }
}
```

### Opsi B: Read/Write (untuk operasi admin/migration assist)

Sama seperti di atas, ubah:
- `--read-only=false`

Gunakan mode ini hanya saat perlu.

## 9) MCP untuk Vercel (opsional)

Jika Anda ingin operasi deployment/observability via MCP juga:
- tambahkan server MCP Vercel di client Anda
- scope token hanya ke project SulutDive

## 10) Troubleshooting cepat

- `Profil user provider tidak ditemukan di tabel users`:
  - cek `SUPABASE_SERVICE_ROLE_KEY` di Vercel
  - cek migration `users.wants_provider` sudah jalan
- `Cannot coerce result to single JSON object (PGRST116)`:
  - biasanya update/read dikunci RLS atau query memaksa `.single()` untuk hasil 0 row
  - cek policy admin update users sudah applied
- Gambar layanan fallback:
  - cek bucket `service-images` ada dan policy upload benar
  - create service sekarang akan gagal eksplisit jika upload gagal

