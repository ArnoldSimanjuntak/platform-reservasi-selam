-- =============================================
-- MIGRATION: Fix bookings.user_id FK constraint
-- =============================================
-- Masalah: bookings.user_id mereferensi tabel custom `users(id)`,
-- tapi Supabase Auth menyimpan user di `auth.users`.
-- Solusi: Drop FK constraint agar user_id bisa menyimpan auth.uid() langsung.
-- RLS policy tetap aman karena sudah menggunakan auth.uid().
--
-- Jalankan di Supabase SQL Editor.
-- =============================================

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_user_id_fkey;
