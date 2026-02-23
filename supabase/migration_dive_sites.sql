-- =============================================
-- MIGRATION: Tambah tabel dive_sites dan relasi ke bookings
-- Fitur: Booking berbasis peta dengan zona surcharge
-- Jalankan di Supabase SQL Editor
-- =============================================

-- =============================================
-- 1. TABEL DIVE_SITES (Spot Selam Lembeh)
-- =============================================
-- Zone Level menentukan jarak tempuh dan biaya tambahan:
--   Zona 1: Spot dekat pelabuhan (0 surcharge)
--   Zona 2: Spot menengah (surcharge sedang)
--   Zona 3: Spot ujung selat (surcharge tinggi)

CREATE TABLE dive_sites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  zone_level INTEGER NOT NULL CHECK (zone_level IN (1, 2, 3)),
  surcharge_fee INTEGER NOT NULL DEFAULT 0 CHECK (surcharge_fee >= 0),
  description TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_dive_sites_zone ON dive_sites(zone_level);

-- =============================================
-- 2. TAMBAH KOLOM dive_site_id KE BOOKINGS
-- =============================================
-- Relasi: Setiap booking bisa memilih satu dive site
-- NULL diizinkan untuk booking sewa alat (gear) yang tidak butuh lokasi

ALTER TABLE bookings
  ADD COLUMN dive_site_id UUID REFERENCES dive_sites(id) ON DELETE SET NULL;

CREATE INDEX idx_bookings_dive_site ON bookings(dive_site_id);

-- =============================================
-- 3. RLS POLICY UNTUK DIVE_SITES
-- =============================================
ALTER TABLE dive_sites ENABLE ROW LEVEL SECURITY;

-- Semua orang bisa melihat dive sites yang aktif
CREATE POLICY "Public view active dive sites"
  ON dive_sites FOR SELECT
  USING (is_active = true);

-- =============================================
-- 4. SEED DATA: 3 Spot Selam Lembeh
-- =============================================
INSERT INTO dive_sites (name, zone_level, surcharge_fee, description, latitude, longitude, image_url)
VALUES
  (
    'Police Pier',
    1,
    0,
    'Spot muck diving ikonik tepat di depan pelabuhan Bitung. Surganya nudibranch, crab, dan shrimp. Kedalaman 3-15m, cocok untuk semua level penyelam. Night dive di sini sangat recommended untuk bertemu mandarinfish.',
    1.4405,
    125.1895,
    'https://picsum.photos/seed/policepier/800/600'
  ),
  (
    'Hairball 1',
    2,
    150000,
    'Salah satu spot terbaik untuk menemukan hairy frogfish dan coconut octopus. Dasar pasir vulkanik hitam menjadi latar sempurna untuk foto makro. Kedalaman 5-22m. Perlu boat ride 15 menit dari pelabuhan.',
    1.4580,
    125.2200,
    'https://picsum.photos/seed/hairball/800/600'
  ),
  (
    'Batu Kapal',
    3,
    300000,
    'Spot paling ujung selatan Selat Lembeh. Formasi batu besar dengan arus kuat yang menarik schooling fish dan pelagic. Sering terlihat eagle ray dan reef shark. Kedalaman 10-35m. Khusus Advanced diver.',
    1.4100,
    125.2450,
    'https://picsum.photos/seed/batukapal/800/600'
  );
