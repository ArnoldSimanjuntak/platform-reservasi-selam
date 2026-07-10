# Checklist Pengujian Mobile PWA SulutDive

Gunakan checklist ini setelah aplikasi ter-deploy ke Vercel production dengan HTTPS.

## Identitas Pengujian

- URL production:
- Browser/device:
- Tanggal pengujian:
- Penguji:

## Skenario Uji

| No | Skenario | Langkah | Expected Output | Actual Output | Status |
| --- | --- | --- | --- | --- | --- |
| 1 | Manifest dapat dibaca | Buka `/manifest.json` dari browser production | JSON tampil dan memuat `name`, `short_name`, `icons`, `start_url`, `display`, `theme_color`, dan `background_color` |  |  |
| 2 | Service worker aktif | Buka DevTools atau remote debugging, cek Application -> Service Workers | `/sw.js` terdaftar, aktif, dan scope `/` |  |  |
| 3 | Installable di Chrome Android | Buka aplikasi, tunggu load awal, cek menu browser atau prompt install | Aplikasi bisa ditambahkan ke Home Screen |  |  |
| 4 | Installable di Brave Android | Buka aplikasi, tunggu load awal, cek menu browser atau prompt install | Aplikasi bisa ditambahkan ke Home Screen |  |  |
| 5 | Offline fallback | Buka aplikasi online, pastikan service worker aktif, matikan internet, refresh halaman baru | Halaman offline SulutDive tampil, bukan offline default browser |  |  |
| 6 | Halaman statis dasar | Saat online, buka `/`, `/services`, `/lokasi`, dan `/offline` | Semua halaman dapat dimuat tanpa error fatal |  |  |
| 7 | Batasan offline | Saat offline, coba booking/upload bukti pembayaran | Sistem tidak mengklaim transaksi offline; fitur transaksi membutuhkan koneksi |  |  |
| 8 | Lighthouse PWA | Jalankan Lighthouse kategori PWA di browser desktop | Manifest valid dan service worker terdeteksi |  |  |

## Catatan

- PWA tidak mendukung booking offline, upload bukti pembayaran offline, push notification, atau background sync.
- Jika offline fallback belum muncul, hapus service worker lama, clear site data, buka ulang aplikasi online, lalu ulangi pengujian.
- Service worker hanya aktif pada production build/HTTPS, bukan pada `npm run dev`.
