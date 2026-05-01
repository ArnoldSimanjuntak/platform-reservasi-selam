-- ============================================================
-- MIGRATION: Tambahkan koordinat pangkalan ke tabel providers
-- Digunakan untuk marker "Pangkalan Keberangkatan" di Dive Map
-- dan sebagai titik awal di Route Planner.
-- ============================================================

-- Tambah kolom latitude & longitude ke tabel providers
ALTER TABLE providers
    ADD COLUMN IF NOT EXISTS latitude  DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Index untuk query spatial (filter NOT NULL)
CREATE INDEX IF NOT EXISTS idx_providers_coordinates
    ON providers (latitude, longitude)
    WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- ── Seed data contoh: koordinat pangkalan umum di Bitung ────────────────
-- UPDATE sesuai data aktual masing-masing provider.
-- Koordinat di bawah adalah estimasi geografis area Bitung / Selat Lembeh.

COMMENT ON COLUMN providers.latitude  IS 'Koordinat lintang pangkalan keberangkatan provider (WGS-84)';
COMMENT ON COLUMN providers.longitude IS 'Koordinat bujur pangkalan keberangkatan provider (WGS-84)';

-- Contoh update manual (sesuaikan id dengan data aktual):
-- UPDATE providers
--     SET latitude = 1.4560, longitude = 125.2100
--     WHERE name = 'Nama Bisnis Provider';
