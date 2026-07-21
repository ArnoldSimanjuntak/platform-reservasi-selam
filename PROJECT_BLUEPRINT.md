# 🌊 SulutDive PWA — Project Blueprint
**Project Identity:** Rancang Bangun PWA Booking Wisata Selam Lembeh (Skripsi)

Dokumen ini berfungsi sebagai panduan utama/konteks ringkas untuk AI Agent yang membantu dalam pengembangan proyek. Jangan memodifikasi file ini kecuali ada perubahan signifikan pada arsitektur proyek.

## 🛠️ Tech Stack
- **Framework:** Next.js 16 (App Router)
- **Backend & Auth:** Supabase (Auth + PostgreSQL)
- **Styling:** Tailwind CSS v4
- **Maps:** Leaflet.js (`react-leaflet` v5)
- **PWA:** `next-pwa` (Workbox)

## 📂 Current Architecture
- `/app`: Routing utama berbasis App Router. Terdiri dari route `/` (Home), `/services`, `/services/[id]` (Detail), `/lokasi` (Peta Leaflet), `/booking`, `/dashboard` (User profil), `/offline`, dan `/auth` (Login/Register).
- `/components`: Reusable UI components (seperti `Navbar`, `Footer`, `ServiceCard`, `HeroBooking`, `MapLeaflet`, `BookingForm`).
- `/lib`: Helper functions & konfigurasi. Khususnya `lib/supabase.ts` untuk fetching data, dan direktori `lib/supabase/` untuk auth client (client, server, middleware).
- `/public`: Static assets, gambar, PWA icons, manifest, sw.js, dan tile proxy jika ada.

## 🗄️ Database Schema Summary (Supabase)
Beroperasi pada Supabase PostgreSQL:
- `users`: User entity (di-manage oleh Supabase Auth).
- `providers`: Entitas penyedia jasa selam (boat, dive center).
- `services`: Layanan yang ditawarkan (Boat, Instructor, Gear). Berlaku sistem *carrying capacity* (`max_capacity`).
- `dive_sites`: Data titik selam Lembeh (koordinat, zona, info).
- `bookings`: Transaksi reservasi. Relasi ke `users`, `services`, `dive_sites`.

## ⚙️ Core Logic 
- **Alur Booking (Server Actions):** Di-handle via `app/actions/booking.ts`. Alurnya: Auth check → Validasi Input → Cek Surcharge (berdasarkan zone dive_site) → **Validasi Carrying Capacity** via RPC calls ke Supabase  → Insert ke tabel `bookings`. Booking difasilitasi di halaman detail layanan (`BookingForm`) dan via peta (`/booking?dive_site=x`).
- **Validasi Carrying Capacity:** Diimplementasikan melalui 2 PostgreSQL function. `check_carrying_capacity` mensimulasikan ketersediaan, `get_remaining_capacity` me-return jumlah sisa slot.
- **PWA & Caching:** Di-handle `next.config.js`. Memiliki 14 aturan caching runtime Workbox (misal: Leaflet map tiles & assets di-cache `CacheFirst` selama 30 hari untuk peta offline; Next.js routes menggunakan `StaleWhileRevalidate`, API call `NetworkFirst`). Terdapat custom fallback `/offline`. Instalasi diprompt secara manual (`InstallPrompt`).

## 🎨 Style Guide
- **Tema:** Nuansa Lembeh (Ocean/Dive theme).
- **Primary Color:** Deep Ocean Blue (`#023E8A`). Secondary: Starfish Blue (`#0077B6`).
- **UI Components:** Menggunakan Tailwind CSS. Glassmorphism (`backdrop-blur`), komponen membulat (`rounded-2xl`, `rounded-xl`), hover efek pada card, gradient pada banner/hero section.
- **Tipografi & Ikon:** Menggunakan font Inter dan Lucide React icons.

## 🚀 Remaining Tasks (Tugas yang Tersisa)
1. **Migrasi Data Dive Sites:** Meng-insert 65 data dari `data_selam.json` ke tabel `dive_sites` di Supabase.
2. **Dashboard History:** Fetch dan tampilkan UI riwayat `bookings` di halaman `/dashboard`. Saat ini bagian riwayat masih berbentuk placeholder.
3. **Refactoring ServiceCard:** Merapikan `components/ServiceCard.tsx` untuk memastikan fungsionalitas quick booking-nya menggunakan Server Action yang konsisten (seperti pada `BookingForm`).

---
**Agent Instruction:** Saat membuka workspace ini, baca dan gunakan file blueprint ini untuk memahami konteks codebase. Prioritaskan dan selesaikan bagian "Remaining Tasks" kecuali diinstruksikan lain oleh user.
