# SulutDive: Project Blueprint & Technical Context

> Dokumen ini dirancang sebagai **konteks injeksi untuk AI Agent**. Jika Anda membaca dokumen ini di awal percakapan, posisikan diri Anda sebagai Senior Full-Stack Engineer yang melanjutkan pengembangan sistem ini.

## 1. Gambaran Proyek
- **Misi:** **SulutDive** adalah Aggregator & Marketplace layanan reservasi selam (Makro/Muck Diving) di Selat Lembeh, Bitung, Sulawesi Utara.
- **Konsep Inti:** Mengelola _Carrying Capacity_ (Batas daya tampung penyelam bawah laut), reservasi privat, persewaan perlengkapan, dan pengalokasian kapal wisata (*Boat*).
- **Format Target:** **Progressive Web App (PWA)** _Mobile-first_, ditujukan untuk kemudahan akses wisatawan dan penyedia jasa secara langsung di dermaga / perairan laut lepas menggunakan perangkat HP.

## 2. Tech Stack Detail
- **Framework Utama:** Next.js 14 (App Router) menggunakan Server Actions dan SSR.
- **Visual & UI:** Tailwind CSS. Ikon melalui `lucide-react`. Geospasial dengan `Leaflet.js` (`react-leaflet`).
- **Backend & BaaS (Supabase):**
  - **Auth:** Otorisasi SSR (Cookie-based middleware) dan sinkronisasi _real-time_ via klien.
  - **Database:** PostgreSQL (Supabase DB) dengan RLS (*Row Level Security*) ketat.
  - **Storage:** Bucket publik (`provider-documents`, `payment-proofs`, `service-images`) dengan kontrol MIME & Restriksi ukuran 5MB.
  - **Realtime:** Broadcaster Supabase Channel (Digunakan pada pembaruan Provider Feed).

## 3. Skema Basis Data (Database Architecture)
Terdapat struktur *Foreign Key* relasional yang mengikat 4 pilar logika:
1. **`users` (Data Otentikasi Modifikasi):** Profil UUID utama. Memiliki kolom `role` dengan nilai mutlak: `'admin'`, `'provider'`, `'customer'`.
2. **`providers` (Data Pemilik Bisnis):** Profil _merchant_. Terikat ke `users.id`. Terdapat *State Machine* melalui kolom `verification_status` (`'pending' | 'verified' | 'rejected'`) dan lampiran wajib (`identity_card_url`, `certification_url`).
3. **`services` (Katalog Layanan/Produk):** Dimiliki oleh `provider_id`. Modalnya bervariasi lewat kolom `type` (`'boat'`, `'instructor'`, `'gear'`). Termasuk metadata harga, kapasitas, dan `image_url`. Hanya ditampilkan publik jika Provider = `'verified'`.
4. **`bookings` (Transaksi):** Mencatat `user_id` pesanan ke spesifik `service_id`. Dilengkapi _timestamp_ manual transfer: kolom `payment_status` (`unpaid`, `pending_verification`, `paid`) dan batas kedaluwarsa keranjang di kolom `payment_deadline` (+24 jam penguncian slot). Dilengkapi relasional ke rel tujuan koordinat `dive_site_id`.

## 4. Logika Bisnis & Sistem Fundamental Terimplementasi
- **Sistem Verifikasi Super Admin:**
  Panel UI Kartu (Card-Based) `app/admin/verifikasi` terproteksi melalui pengecekan Server Otoritas. Admin ditugaskan me-review KTP dan Sertifikasi _Dive Master_ (berupa popup Image Modal) dengan saklar 'Setujui' atau 'Tolak'. Algoritma Katalog Marketplace hanya me-_render_ _query list_ jika pemiliknya terverifikasi.
- **Workflow Pembayaran Manual Wisatawan:**
  Booking dibuat → memicu *countdown limit* 24 Jam di Dasbor Wisatawan → Wisatawan menyerahkan bukti struk (.jpeg/.png) ke Bucket Supabase → Status berubah menjadi `pending_verification` → *Provider* menerima dan mem-validasi gambar tagihan tersebut dari dasbor mereka → Pesanan dikunci menjadi *Confirmed*.
- **Integrasi Destinasi (Dive Map & Boat Service):**
  Layanan `type="boat"` yang tersedia tersinkronisasi otomatis dengan pilihan titik penyelaman di Peta Interaktif (Lebih interaktif mendeteksi *Zone* laut dan *Carrying Capacity*).
- **Prosedur *Auto-Complete Bookings*:** 
  Agenda selam berstatus `"in_progress"` otomatis bermutasi menjadi `"completed"` apabila diakses melebihi tanggal `< booking_date` hari kalender ini (Proses _Garbage/Housekeeping_ pada PWA Dashboard Home).

## 5. Prosedur Navigasi & Proteksi (Progres Terakhir)
- **Stale Data / Cache Immunity:** 
  Rute otentikasi (`app/auth/actions.ts`) dipersenjatai metode `revalidatePath('/', 'layout')` mutlak di metode `signIn` dan `signOut` untuk menghukum hancur data cache lama apabila ganti akun / sesi peramban.
- **Role-Aware Bottom Navigation Bar (PWA):** 
  Menu UI mengambang di bawah layar standar iOS/Android yang menyesuaikan wujud pintasan menurut _role_, contoh: Wisatawan melihat rel 'Pesanan' (`/bookings`), namun Super Admin melihat rel eksklusif 'Verifikasi' (`/admin/verifikasi`).

## 6. Batasan Desain Konstruktif (Design Constraints)
- **Aturan Warna (STRICT):** **Dilarang memakai *class* utilitas warna UNGU (`purple-*`)!** Aplikasi dikodifikasi mematuhi palet ***Deep Sea Blue*** laut (Warna aksen: `#023E8A` atau Tailwind standar ke `blue-50` via `blue-900`) untuk menduplikasi kesan profesionalisme maritim.
- **Hi-Visibility (Standar PWA Outdoor):** Platform ini diakses nahkoda kapal di bawah silau terik matahari laut Tropis. Semua UI kartu, teks input isian form, dan *metric counter dashboard* harus menggunakan font yang mendominasi / gelap tebal (Contoh: `text-slate-900`, BUKAN `text-cyan-400` atau tipis *light*).
- **Mobile-First Realitas:** Hindari penggunaan tabel HTML horizontal (`<table />`) beralih ke UI kartu (*Card-based layout*) di setiap halaman baru yang mengurus daftar tabel basis data agar tak rusak pada *Viewport* gawai.
