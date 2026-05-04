-- =============================================
-- Migration: explicit onboarding intent flag
-- =============================================
-- Tujuan:
-- 1) Memisahkan customer wisatawan vs customer yang sedang mengajukan provider
-- 2) Routing auth/setup tidak lagi ambigu

ALTER TABLE users
ADD COLUMN IF NOT EXISTS wants_provider BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_users_wants_provider
ON users(wants_provider);

