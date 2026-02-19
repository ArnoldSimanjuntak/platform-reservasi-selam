# SPESIFIKASI PROYEK: PLATFORM RESERVASI SELAM KAWASAN LEMBEH

## Tech Stack
- Framework: Next.js 14+ (App Router)
- Styling: Tailwind CSS
- Database/Auth: Supabase (PostgreSQL)
- PWA: next-pwa (with Service Worker for offline access)
- Icons: Lucide React

## Ruang Lingkup Data (Studi Kasus)
1. Kawasan: Selat Lembeh, Kota Bitung, Sulawesi Utara.
2. Fokus Destinasi: Fokus pada 'Muck Diving' dan Fotografi Makro.
3. Layanan: Reservasi Kapal (Dive Boat), Instruktur/Guide (Macro Specialist), dan Alat Selam.

## Skema Database Utama (Revised)
- users: (id, name, email, role: 'customer' | 'provider')
- services: (id, name, type: 'boat' | 'instructor' | 'gear', price, dive_site_category: 'Muck' | 'Coral' | 'Wreck', description, image_url)
- bookings: (id, user_id, service_id, booking_date, status: 'pending' | 'confirmed' | 'cancelled')

## Palet Warna (Nuansa Lembeh - Deep & Professional)
- Primary: #023E8A (Deep Ocean Blue) - Mewakili kedalaman Selat Lembeh.
- Secondary: #0077B6 (Starfish Blue) - Untuk elemen interaktif.
- Accent: #ADE8F4 (Clear Water) - Untuk background atau elemen ringan.
- Text: #03045E (Midnight Navy) - Untuk tipografi agar mudah dibaca.
- Neutral: #F8F9FA (Sea Salt) - Warna latar belakang utama.

## Fitur Unggulan PWA
- Offline Mode: Pengguna dapat melihat tiket/detail reservasi tanpa sinyal internet.
- Installable: Dapat diinstal langsung dari browser Chrome/Edge di Android/iOS.