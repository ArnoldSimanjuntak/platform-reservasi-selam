-- ==============================================================
-- MIGRATION: Admin Verification System
-- Adds verification_status to providers table
-- ==============================================================

-- Tambahkan kolom verification_status ke tabel providers
ALTER TABLE providers 
  ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected'));

-- Buat indeks untuk mempercepat query filtering verification_status
CREATE INDEX IF NOT EXISTS idx_providers_verification_status ON providers(verification_status);
