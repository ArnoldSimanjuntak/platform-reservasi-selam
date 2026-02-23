-- =============================================
-- MIGRATION: Multi-Layanan Terintegrasi & Carrying Capacity
-- Rumusan Masalah Skripsi: Bagaimana mengelola
-- multi-layanan yang terintegrasi dengan validasi
-- daya tampung (carrying capacity) per hari.
-- Jalankan di Supabase SQL Editor
-- =============================================

-- =============================================
-- 1. TABEL PROVIDERS (Resort / Dive Center)
-- =============================================
-- Entitas penyedia layanan selam yang terpisah dari tabel users.
-- Satu provider bisa memiliki banyak services dan resources.

CREATE TABLE providers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  location TEXT,
  contact VARCHAR(255),
  description TEXT,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_providers_active ON providers(is_active);

-- =============================================
-- 2. UPDATE TABEL SERVICES
-- =============================================
-- Tambah kolom provider_id (FK ke providers) dan max_capacity.
-- Pertama, hapus FK lama provider_id -> users (jika ada),
-- lalu ubah menjadi FK ke tabel providers.

-- 2a. Hapus constraint FK lama dari provider_id (referensi ke users)
ALTER TABLE services DROP CONSTRAINT IF EXISTS services_provider_id_fkey;

-- 2b. Tambah FK baru ke tabel providers
ALTER TABLE services
  ADD CONSTRAINT services_provider_id_fkey
  FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE SET NULL;

-- 2c. Tambah kolom max_capacity (jumlah slot/peserta maksimal per hari)
ALTER TABLE services
  ADD COLUMN IF NOT EXISTS max_capacity INTEGER NOT NULL DEFAULT 10
  CHECK (max_capacity > 0);

-- =============================================
-- 3. TABEL RESOURCES (Sumber Daya Provider)
-- =============================================
-- Mengelola sumber daya fisik milik provider:
-- instructor, boat, gear. Digunakan untuk validasi
-- ketersediaan saat booking.

CREATE TABLE resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('instructor', 'boat', 'gear')),
  name VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'in_use', 'maintenance')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_resources_provider ON resources(provider_id);
CREATE INDEX idx_resources_type ON resources(type);
CREATE INDEX idx_resources_status ON resources(status);

-- =============================================
-- 4. UPDATE TABEL BOOKINGS
-- =============================================
-- Tambah kolom total_participants untuk validasi carrying capacity.
-- Kolom booking_date sudah ada dari schema awal.

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS total_participants INTEGER NOT NULL DEFAULT 1
  CHECK (total_participants > 0);

-- =============================================
-- 5. FUNCTION: Cek Carrying Capacity
-- =============================================
-- Fungsi ini menghitung total peserta yang sudah terbooking
-- pada suatu service di tanggal tertentu, lalu membandingkan
-- dengan max_capacity. Digunakan oleh aplikasi sebelum INSERT booking.

CREATE OR REPLACE FUNCTION check_carrying_capacity(
  p_service_id UUID,
  p_booking_date DATE,
  p_participants INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  v_max_capacity INTEGER;
  v_current_total INTEGER;
BEGIN
  -- Ambil max_capacity dari service
  SELECT max_capacity INTO v_max_capacity
  FROM services
  WHERE id = p_service_id;

  IF v_max_capacity IS NULL THEN
    RAISE EXCEPTION 'Service tidak ditemukan';
  END IF;

  -- Hitung total peserta yang sudah booking pada tanggal tersebut
  -- (hanya yang statusnya bukan 'cancelled')
  SELECT COALESCE(SUM(total_participants), 0) INTO v_current_total
  FROM bookings
  WHERE service_id = p_service_id
    AND booking_date = p_booking_date
    AND status != 'cancelled';

  -- Return TRUE jika masih ada slot tersedia
  RETURN (v_current_total + p_participants) <= v_max_capacity;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 6. FUNCTION: Hitung Sisa Kapasitas
-- =============================================
-- Mengembalikan jumlah slot tersisa untuk UI availability indicator.

CREATE OR REPLACE FUNCTION get_remaining_capacity(
  p_service_id UUID,
  p_booking_date DATE
)
RETURNS INTEGER AS $$
DECLARE
  v_max_capacity INTEGER;
  v_current_total INTEGER;
BEGIN
  SELECT max_capacity INTO v_max_capacity
  FROM services
  WHERE id = p_service_id;

  IF v_max_capacity IS NULL THEN
    RETURN 0;
  END IF;

  SELECT COALESCE(SUM(total_participants), 0) INTO v_current_total
  FROM bookings
  WHERE service_id = p_service_id
    AND booking_date = p_booking_date
    AND status != 'cancelled';

  RETURN GREATEST(v_max_capacity - v_current_total, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 7. RLS POLICIES
-- =============================================
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

-- Providers: semua orang bisa lihat provider aktif
CREATE POLICY "Public view active providers"
  ON providers FOR SELECT
  USING (is_active = true);

-- Resources: semua orang bisa lihat resources yang tersedia
CREATE POLICY "Public view resources"
  ON resources FOR SELECT
  USING (true);

-- =============================================
-- 8. SEED DATA: Contoh Providers & Resources
-- =============================================
INSERT INTO providers (id, name, location, contact, description)
VALUES
  (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'Lembeh Divers Resort',
    'Bitung, Sulawesi Utara',
    '+62 812 3456 7890',
    'Resort selam premium di Selat Lembeh, spesialis muck diving dan fotografi makro bawah air.'
  ),
  (
    'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    'Hairball Dive Center',
    'Lembeh Island, Sulawesi Utara',
    '+62 821 9876 5432',
    'Dive center lokal dengan guide berpengalaman dan peralatan lengkap untuk eksplorasi Selat Lembeh.'
  );

-- Update services yang sudah ada agar terhubung ke provider
UPDATE services SET provider_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', max_capacity = 8
WHERE type = 'boat';

UPDATE services SET provider_id = 'b2c3d4e5-f6a7-8901-bcde-f12345678901', max_capacity = 4
WHERE type = 'instructor';

UPDATE services SET provider_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', max_capacity = 10
WHERE type = 'gear';

-- Seed resources
INSERT INTO resources (provider_id, type, name, status)
VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'boat', 'Kapal Manta I', 'available'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'boat', 'Kapal Manta II', 'available'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'gear', 'Canon 100mm Macro Set A', 'available'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'gear', 'Canon 100mm Macro Set B', 'in_use'),
  ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'instructor', 'Pak Roni (Guide Senior)', 'available'),
  ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'instructor', 'Ibu Sari (Guide Spesialis Nudibranch)', 'available'),
  ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'boat', 'Kapal Nudi Explorer', 'maintenance');
