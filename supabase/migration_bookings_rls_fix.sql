-- =============================================
-- MIGRATION: Fix Bookings RLS & Schema for reliable INSERT
-- =============================================
-- This ensures:
-- 1. The FK constraint on bookings.user_id (to custom users table) is dropped,
--    since auth.uid() comes from auth.users, not the custom users table.
-- 2. The dive_site_id column exists on bookings.
-- 3. RLS INSERT policy exists and is correct.
-- 4. The total_participants column exists.
--
-- This is IDEMPOTENT — safe to run multiple times.
-- Run in Supabase SQL Editor.
-- =============================================

-- ─── 1. Drop incorrect FK on user_id → custom users table ────
-- Supabase Auth UIDs come from auth.users, not from the custom "users" table.
-- If this FK exists, any INSERT with auth.uid() will fail because the UUID
-- doesn't exist in the custom users table.
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_user_id_fkey;

-- ─── 2. Ensure required columns exist ────────────────────────
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS dive_site_id UUID;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS total_participants INTEGER NOT NULL DEFAULT 1;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS total_price DECIMAL(12, 2);

-- ─── 3. Ensure RLS is enabled ────────────────────────────────
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- ─── 4. Re-create RLS policies (drop first to avoid duplicates) ──
DROP POLICY IF EXISTS "Users view own bookings" ON bookings;
DROP POLICY IF EXISTS "Users create bookings" ON bookings;
DROP POLICY IF EXISTS "Users update own bookings" ON bookings;
DROP POLICY IF EXISTS "Providers view service bookings" ON bookings;

-- SELECT: Users can only view their own bookings
CREATE POLICY "Users view own bookings"
  ON bookings FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT: Authenticated users can create bookings (user_id must match their auth.uid)
CREATE POLICY "Users create bookings"
  ON bookings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can only update their own bookings (e.g., cancel)
CREATE POLICY "Users update own bookings"
  ON bookings FOR UPDATE
  USING (auth.uid() = user_id);

-- SELECT: Providers can view bookings for their services
CREATE POLICY "Providers view service bookings"
  ON bookings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM services
      WHERE id = bookings.service_id
        AND provider_id = auth.uid()
    )
  );

-- ─── 5. Verification queries ─────────────────────────────────
-- Check that the constraints and policies are correct:

-- Should show NO FK constraint on user_id:
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'bookings'::regclass
  AND contype = 'f'
  AND conname LIKE '%user_id%';

-- Should show the RLS policies:
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'bookings';

-- Should show all columns including dive_site_id and total_participants:
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'bookings'
ORDER BY ordinal_position;
