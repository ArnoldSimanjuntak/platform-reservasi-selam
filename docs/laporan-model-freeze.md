# Pembekuan Fitur dan Model Data SulutDive

Tanggal keputusan: 13 Juli 2026  
Tujuan: menjadi sumber kebenaran untuk revisi ERD, Bab IV, Bab V, pengujian, dan presentasi tugas akhir.

## 1. Batas Sistem yang Dibekukan

SulutDive dibekukan sebagai aplikasi agregator dan booking wisata selam berbasis Progressive Web App di kawasan Lembeh. Aplikasi menghubungkan wisatawan dengan provider lokal untuk tiga kategori layanan:

1. Kapal (`boat`)
2. Guide atau instruktur selam (`instructor`)
3. Penyewaan alat selam (`gear`)

Role autentikasi tetap hanya:

- `customer`
- `provider`
- `admin`

Kategori bisnis provider bukan role autentikasi. Kategori tersebut disimpan pada `providers.primary_type` dan membatasi jenis layanan yang dapat dibuat oleh provider.

## 2. Fitur Final Berdasarkan Aktor

### Customer

- Mendaftar dan login.
- Melihat halaman publik, katalog, detail layanan, peta lokasi selam, dan route planner.
- Melakukan booking layanan.
- Memilih dive site hanya untuk layanan kapal.
- Memilih jumlah peserta untuk kapal dan guide/instruktur.
- Memilih jumlah unit dan durasi sewa untuk alat selam.
- Mengunggah bukti pembayaran.
- Melihat status pembayaran dan status booking.

### Provider

- Mengisi profil bisnis dan memilih satu kategori bisnis utama.
- Mengunggah dokumen verifikasi sesuai kategori.
- Menunggu persetujuan admin sebelum membuat layanan.
- Membuat, mengubah, menonaktifkan, dan menghapus layanan miliknya sesuai batasan data booking.
- Melihat pesanan untuk layanan miliknya.
- Memeriksa bukti pembayaran dan memperbarui status pesanan.

### Admin

- Melihat dashboard operasional platform.
- Memeriksa checklist dan dokumen verifikasi provider.
- Menyetujui atau menolak provider dengan alasan penolakan.
- Memantau seluruh layanan.
- Memantau seluruh booking, pembayaran, dan nilai transaksi terbayar.

Admin tidak dibekukan sebagai pembuat atau editor layanan. Kepemilikan dan pengelolaan layanan tetap berada pada provider.

## 3. Entitas Database Inti untuk Laporan dan ERD

### `users`

Menyimpan profil pengguna aplikasi dan role. Nilai `id` mengikuti identitas pengguna dari Supabase Auth.

Atribut inti:

- `id`
- `name`
- `email`
- `role`
- `wants_provider`
- `created_at`
- `updated_at`

### `providers`

Menyimpan profil bisnis dan status verifikasi provider.

Atribut inti:

- `id`
- `owner_user_id`
- `name`
- `location`
- `contact`
- `description`
- `primary_type`
- `instructor_scope`
- `business_license_number`
- `verification_status`
- `is_active`
- `rejection_reason`
- `latitude`
- `longitude`
- `verification_submitted_at`
- `verified_at`

Kolom URL dokumen lama seperti `identity_card_url` dan `certification_url` diperlakukan sebagai kompatibilitas data lama. Model final dokumen verifikasi menggunakan tabel `provider_verification_documents`.

### `provider_verification_documents`

Menyimpan metadata setiap dokumen verifikasi provider. File aslinya disimpan pada Supabase Storage.

Atribut inti:

- `id`
- `provider_id`
- `document_type`
- `label`
- `storage_path`
- `public_url`
- `is_required`
- `status`
- `notes`
- `created_at`
- `updated_at`

### `services`

Menyimpan layanan yang dibuat dan dimiliki provider.

Atribut inti:

- `id`
- `provider_id`
- `name`
- `description`
- `type`
- `price`
- `max_capacity`
- `dive_site_category`
- `image_url`
- `is_available`
- `created_at`
- `updated_at`

Makna `max_capacity` bergantung pada jenis layanan:

- Kapal: jumlah maksimum peserta per tanggal.
- Guide/instruktur: jumlah maksimum peserta per tanggal.
- Alat selam: jumlah unit yang tersedia untuk disewa.

### `bookings`

Menyimpan transaksi booking dan pembayaran.

Atribut inti:

- `id`
- `user_id`
- `service_id`
- `provider_id`
- `dive_site_id`
- `booking_date`
- `total_participants`
- `rental_days`
- `status`
- `total_price`
- `payment_status`
- `payment_deadline`
- `payment_proof_url`
- `notes`
- `created_at`
- `updated_at`

Makna `total_participants`:

- Kapal dan guide/instruktur: jumlah peserta.
- Alat selam: jumlah unit yang disewa.

Nilai `dive_site_id` wajib untuk booking kapal dan bernilai kosong untuk guide/instruktur serta alat selam.

Status booking final yang digunakan aplikasi:

- `pending`
- `confirmed`
- `in_progress`
- `completed`
- `cancelled`

Status pembayaran final:

- `unpaid`
- `pending_verification`
- `paid`
- `expired`

### `dive_sites`

Menyimpan lokasi penyelaman dan informasi pendukung perhitungan layanan kapal.

Atribut inti:

- `id`
- `name`
- `zone_level`
- `surcharge_fee`
- `description`
- `latitude`
- `longitude`
- `image_url`
- `is_active`
- `kedalaman_meter`
- `waktu_tempuh_kapal_menit`
- `habitat`

## 4. Relasi Final untuk ERD

- Satu `users` dapat memiliki nol atau satu `providers` melalui `providers.owner_user_id`.
- Satu `providers` dapat memiliki banyak `provider_verification_documents`.
- Satu `providers` dapat memiliki banyak `services`.
- Satu `users` dapat membuat banyak `bookings`.
- Satu `services` dapat muncul pada banyak `bookings`.
- Satu `providers` dapat menerima banyak `bookings`.
- Satu `dive_sites` dapat digunakan pada banyak `bookings`.
- Satu `bookings` hanya memiliki nol atau satu `dive_sites` karena relasi tersebut hanya dipakai untuk layanan kapal.

`bookings.provider_id` disimpan untuk memudahkan dan mengamankan pengambilan pesanan berdasarkan provider, walaupun provider juga dapat diketahui melalui relasi `bookings.service_id -> services.provider_id`.

## 5. Keputusan tentang `resources`

`resources` awalnya dirancang sebagai tabel inventaris operasional milik provider. Contohnya adalah kapal tertentu, guide tertentu, atau set alat tertentu dengan status `available`, `in_use`, atau `maintenance`.

Pada implementasi final:

- Tidak ada halaman yang mengelola `resources`.
- Proses booking tidak memilih record `resources`.
- Pemeriksaan kapasitas tidak menghitung record `resources`.
- Kapasitas kapal dan guide/instruktur dihitung dari `services.max_capacity` dan booking aktif pada tanggal yang sama.
- Stok alat dihitung dari `services.max_capacity`, jumlah unit pada `bookings.total_participants`, dan irisan periode `bookings.rental_days`.
- Helper TypeScript untuk membaca `resources` tersedia, tetapi tidak dipanggil oleh fitur aplikasi.

Keputusan pembekuan:

1. `resources` tidak dimasukkan dalam ERD inti, struktur tabel Bab IV, pengujian, kesimpulan, atau presentasi.
2. Tabel dan migrasi lama tidak langsung dihapus dari Supabase agar tidak menimbulkan risiko pada data atau deployment.
3. `resources` dicatat sebagai sisa rancangan awal yang tidak digunakan pada prototipe final.
4. Jika pembersihan kode dilakukan setelah laporan stabil, tipe dan helper `resources` yang tidak terpakai dapat dihapus dari kode aplikasi.

Jawaban singkat jika ditanya dosen:

> Pada rancangan awal, resources disiapkan untuk mencatat setiap kapal, guide, atau set alat secara individual. Setelah kebutuhan disederhanakan, prototipe final menggunakan kapasitas pada tabel services dan transaksi bookings. Karena resources tidak digunakan oleh alur aplikasi final, entitas tersebut tidak dimasukkan dalam ERD akhir.

## 6. Fungsi Database yang Benar-Benar Digunakan

- `get_remaining_capacity`: menghitung sisa kapasitas kapal atau guide/instruktur pada tanggal tertentu.
- `get_gear_available_stock`: menghitung sisa unit alat berdasarkan irisan tanggal dan durasi sewa.
- `review_provider_verification`: menyetujui atau menolak provider secara atomik.

`check_carrying_capacity` masih tersedia sebagai helper lama, tetapi proses pembuatan booking saat ini menggunakan `get_remaining_capacity`.

## 7. Supabase Storage

- `service-images`: gambar layanan.
- `provider-documents`: dokumen verifikasi provider; diperlakukan sebagai bucket privat dan dibuka melalui signed URL.
- `payment-receipts`: bukti pembayaran yang digunakan oleh kode aplikasi saat ini.

Nama bucket bukti pembayaran pada dokumentasi atau migrasi lama yang masih menyebut `payment-proofs` harus diseragamkan menjadi `payment-receipts` sebelum pengujian final.

## 8. Fitur yang Tidak Diklaim pada Laporan Final

- Booking atau pembayaran offline.
- Sinkronisasi transaksi saat kembali online.
- Payment gateway otomatis.
- Push notification.
- Rating dan ulasan.
- Pemilihan kapal, guide, atau set alat individual dari tabel `resources`.
- Admin membuat atau mengedit layanan milik provider.

## 9. Ketidaksinkronan Teknis yang Harus Diselesaikan Sebelum Pengujian Akhir

1. `supabase/schema.sql` masih merupakan schema dasar lama dan belum mencerminkan seluruh migrasi. Struktur final laporan harus mengikuti implementasi dan migrasi yang benar-benar digunakan, bukan hanya file schema dasar tersebut.
2. `migration_booking_status_lifecycle.sql` menetapkan `upcoming`, sedangkan aplikasi final menggunakan `confirmed`. Untuk laporan, nilai yang dibekukan adalah `confirmed`; constraint database production perlu dipastikan sesuai sebelum pengujian transaksi.
3. Dokumentasi lama menyebut bucket `payment-proofs`, sedangkan aplikasi menggunakan `payment-receipts`.
4. Server action lama masih memiliki jalur yang secara teknis mengizinkan admin menghapus layanan, tetapi UI admin bersifat monitoring. Fitur final yang diklaim adalah monitoring saja.
5. `resources` dan helper terkait tidak digunakan oleh alur aplikasi final.

## 10. Aturan Revisi Laporan Setelah Pembekuan

Mulai tahap ini, seluruh use case, activity diagram, ERD, struktur tabel, uraian implementasi, tabel pengujian, kesimpulan, dan bahan presentasi harus mengikuti keputusan dalam dokumen ini. Fitur yang tidak tercantum sebagai fitur final tidak boleh diklaim sebagai hasil implementasi.
