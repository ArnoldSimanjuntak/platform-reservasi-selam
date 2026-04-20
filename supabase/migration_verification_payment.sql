-- ==============================================================
-- MIGRATION: Provider Verification & Payment System
-- Adds identity constraints for providers and payment columns
-- ==============================================================

-- 1. Tambahan kolom Provider Verification di tabel providers
ALTER TABLE providers 
  ADD COLUMN IF NOT EXISTS primary_type VARCHAR(20) CHECK (primary_type IN ('boat', 'instructor', 'gear')),
  ADD COLUMN IF NOT EXISTS identity_card_url TEXT,
  ADD COLUMN IF NOT EXISTS certification_url TEXT;

-- 2. Memastikan kolom payment di tabel bookings sudah lengkap
ALTER TABLE bookings 
  ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS payment_deadline TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS payment_proof_url TEXT;

-- 3. Info Storage Buckets
-- PENTING: Jalankan perintah berikut di UI Supabase Storage:
-- a) Buat bucket public dengan nama: "provider-documents" (Untuk KTP dan Sertifikasi)
-- b) Buat bucket public dengan nama: "payment-proofs" (Untuk Bukti Transfer)
-- c) Buat Storage RLS Policy (INSERT) agar Authenticated users bisa upload 
-- d) Buat Storage RLS Policy (SELECT) agar public/authenticated bisa baca file
