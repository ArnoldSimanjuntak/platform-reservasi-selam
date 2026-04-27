-- =============================================
-- MIGRATION: Gear Rental & Provider Onboarding
-- Tambah kolom rental_days, gear_stock_check,
-- dan strict onboarding flag di providers.
-- =============================================

-- ─── 1. Tambah kolom rental_days ke bookings ──────────────────────
-- Digunakan untuk layanan sewa alat (gear), menyimpan durasi sewa.
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS rental_days INTEGER DEFAULT 1 CHECK (rental_days >= 1);

-- ─── 2. Tambah kolom verification_status ke providers ─────────────
-- Admin harus memverifikasi provider sebelum mereka bisa berjualan.
-- NULL = belum diajukan, 'pending' = menunggu review,
-- 'verified' = aktif, 'rejected' = ditolak.
ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Catatan: kolom verification_status sudah ditambahkan di
-- migration_verification_payment.sql. Tidak perlu duplikasi.
-- Pastikan providers memiliki kolom:
--   verification_status VARCHAR(20) DEFAULT 'pending'
--     CHECK (verification_status IN ('pending', 'verified', 'rejected'))

-- ─── 3. FUNCTION: Cek stok gear yang tersedia ─────────────────────
-- Berbeda dengan carrying capacity (per hari), stok gear dihitung
-- berdasarkan unit yang sedang aktif disewa (booking aktif di mana
-- booking_date <= SEKARANG dan booking_date + rental_days - 1 >= SEKARANG).
-- Untuk simplifikasi skripsi: cek overlap booking pada tanggal yang dipilih.

CREATE OR REPLACE FUNCTION get_gear_available_stock(
  p_service_id  UUID,
  p_start_date  DATE,
  p_rental_days INTEGER DEFAULT 1
)
RETURNS INTEGER AS $$
DECLARE
  v_max_capacity  INTEGER;
  v_booked_units  INTEGER;
  v_end_date      DATE;
BEGIN
  -- Kapasitas maksimal = stok total unit gear
  SELECT max_capacity INTO v_max_capacity
  FROM services
  WHERE id = p_service_id AND type = 'gear';

  IF v_max_capacity IS NULL THEN
    RETURN 0; -- Bukan layanan gear atau tidak ditemukan
  END IF;

  -- Tanggal akhir sewa untuk booking yang sedang diperiksa
  v_end_date := p_start_date + (p_rental_days - 1);

  -- Hitung unit yang sudah terbooking dan tumpang tindih dengan rentang tanggal ini
  -- (booking aktif = status bukan 'cancelled')
  SELECT COALESCE(SUM(total_participants), 0) INTO v_booked_units
  FROM bookings b
  JOIN services s ON b.service_id = s.id
  WHERE b.service_id = p_service_id
    AND s.type = 'gear'
    AND b.status != 'cancelled'
    -- Overlap: booking yang ada mulai sebelum tanggal selesai kita
    -- DAN berakhir setelah tanggal mulai kita
    AND b.booking_date <= v_end_date
    AND (b.booking_date + COALESCE(b.rental_days, 1) - 1) >= p_start_date;

  RETURN GREATEST(v_max_capacity - v_booked_units, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 4. Index untuk performa query gear booking ───────────────────
CREATE INDEX IF NOT EXISTS idx_bookings_gear_date
  ON bookings(service_id, booking_date, status)
  WHERE status != 'cancelled';

-- ─── 5. Berikan akses execute ke anon dan authenticated roles ─────
GRANT EXECUTE ON FUNCTION get_gear_available_stock(UUID, DATE, INTEGER)
  TO anon, authenticated;
