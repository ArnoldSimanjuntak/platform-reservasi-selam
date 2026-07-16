# Aktivasi dan Pengujian Push Notification SulutDive

## 1. Terapkan migration Supabase

Buka **Supabase Dashboard > SQL Editor**, salin seluruh isi
`supabase/migration_push_subscriptions.sql`, lalu jalankan satu kali. Migration ini
membuat tabel subscription perangkat, indeks, foreign key, dan kebijakan RLS.

## 2. Tambahkan environment variables di Vercel

Tambahkan variabel berikut untuk environment Production, Preview, dan Development:

- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`

Gunakan pasangan nilai yang sama dengan `.env.local`, kemudian lakukan redeploy.
Jangan menaruh private key di source code atau dokumen laporan.

## 3. Aktifkan pada perangkat

1. Login ke aplikasi melalui HTTPS.
2. Tekan tombol **Notifikasi** di kanan bawah.
3. Tekan **Aktifkan Notifikasi** dan izinkan notifikasi dari browser.
4. Tekan **Kirim Notifikasi Uji**.
5. Pindahkan aplikasi ke background dan pastikan notifikasi tetap muncul.

Pada iPhone/iPad, tambahkan aplikasi ke Home Screen terlebih dahulu, buka aplikasi
dari ikon tersebut, lalu aktifkan notifikasi.

## 4. Skenario notifikasi bisnis

| Peristiwa | Penerima | Tujuan saat ditekan |
|---|---|---|
| Customer membuat booking | Provider terkait | Riwayat pesanan provider |
| Customer mengunggah bukti pembayaran | Provider terkait | Riwayat pesanan provider |
| Provider mengubah status booking | Customer pemilik booking | Riwayat booking customer |
| Provider menerima/menolak pembayaran | Customer pemilik booking | Riwayat booking customer |
| Pengguna mengirim pengajuan provider | Admin | Verifikasi provider |
| Admin menerima/menolak provider | Pengguna yang mengajukan | Halaman provider |

Notifikasi merupakan fitur tambahan. Kegagalan pengiriman push tidak membatalkan
booking, pembayaran, atau proses verifikasi yang sedang dijalankan.
