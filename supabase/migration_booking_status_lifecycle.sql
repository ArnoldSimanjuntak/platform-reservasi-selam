-- =============================================
-- MIGRATION: Booking Status Lifecycle
-- Adds full dive activity lifecycle statuses:
--   pending → upcoming → in_progress → completed
--                                    → cancelled (at any point before completed)
--
-- Run this in the Supabase SQL Editor.
-- This migration is SAFE: it preserves all existing data.
-- =============================================

-- =============================================
-- STEP 1: Expand the status CHECK constraint
-- =============================================
-- The original constraint allows: ('pending', 'confirmed', 'cancelled').
-- We need to add: 'upcoming', 'in_progress', 'completed'.
-- We keep 'confirmed' temporarily so existing rows don't violate constraints
-- during migration, then convert them to 'upcoming'.

-- 1a. Drop the old CHECK constraint
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;

-- 1b. Add the new CHECK constraint with all valid values
ALTER TABLE bookings ADD CONSTRAINT bookings_status_check
  CHECK (status IN ('pending', 'confirmed', 'upcoming', 'in_progress', 'completed', 'cancelled'));

-- =============================================
-- STEP 2: Migrate existing 'confirmed' rows to 'upcoming'
-- =============================================
-- 'confirmed' is being replaced by 'upcoming' to better reflect
-- a dive booking that has been approved but hasn't happened yet.
-- We also handle edge cases where the booking_date has already passed.

-- 2a. Confirmed bookings in the future → upcoming
UPDATE bookings
SET status = 'upcoming', updated_at = NOW()
WHERE status = 'confirmed'
  AND booking_date >= CURRENT_DATE;

-- 2b. Confirmed bookings in the past → completed
UPDATE bookings
SET status = 'completed', updated_at = NOW()
WHERE status = 'confirmed'
  AND booking_date < CURRENT_DATE;

-- 2c. Pending bookings in the past that were never confirmed → cancelled
UPDATE bookings
SET status = 'cancelled', updated_at = NOW()
WHERE status = 'pending'
  AND booking_date < CURRENT_DATE;

-- =============================================
-- STEP 3: Remove 'confirmed' from the constraint
-- =============================================
-- Now that no rows have status='confirmed', we can tighten the constraint
-- to the final target values only.

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_status_check
  CHECK (status IN ('pending', 'upcoming', 'in_progress', 'completed', 'cancelled'));

-- =============================================
-- STEP 4: Function — Auto-transition booking statuses
-- =============================================
-- This function should be called periodically (via pg_cron, edge function,
-- or application-level cron) to keep statuses in sync with real dates.
--
-- Logic:
--   • 'pending'  + booking_date = today        → stays 'pending' (needs confirmation)
--   • 'upcoming' + booking_date = today         → 'in_progress'
--   • 'upcoming' + booking_date < today         → 'completed'  (missed transition)
--   • 'in_progress' + booking_date < today      → 'completed'
--   • 'pending'  + booking_date < today         → 'cancelled'  (expired, never confirmed)
--
-- Returns: number of rows updated.

CREATE OR REPLACE FUNCTION update_booking_statuses()
RETURNS INTEGER AS $$
DECLARE
  v_updated INTEGER := 0;
  v_count INTEGER;
BEGIN
  -- 1. upcoming → in_progress (dive day is today)
  UPDATE bookings
  SET status = 'in_progress', updated_at = NOW()
  WHERE status = 'upcoming'
    AND booking_date = CURRENT_DATE;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_updated := v_updated + v_count;

  -- 2. upcoming → completed (dive day already passed, missed in_progress)
  UPDATE bookings
  SET status = 'completed', updated_at = NOW()
  WHERE status = 'upcoming'
    AND booking_date < CURRENT_DATE;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_updated := v_updated + v_count;

  -- 3. in_progress → completed (dive day is over)
  UPDATE bookings
  SET status = 'completed', updated_at = NOW()
  WHERE status = 'in_progress'
    AND booking_date < CURRENT_DATE;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_updated := v_updated + v_count;

  -- 4. pending → cancelled (never confirmed, date passed)
  UPDATE bookings
  SET status = 'cancelled', updated_at = NOW()
  WHERE status = 'pending'
    AND booking_date < CURRENT_DATE;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_updated := v_updated + v_count;

  RETURN v_updated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- STEP 5: Update capacity functions
-- =============================================
-- The carrying capacity functions should exclude 'cancelled' AND 'completed'
-- bookings, since completed dives no longer occupy future capacity.
-- (In practice 'completed' bookings are always in the past, but this is
-- defensive coding for correctness.)

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
  SELECT max_capacity INTO v_max_capacity
  FROM services
  WHERE id = p_service_id;

  IF v_max_capacity IS NULL THEN
    RAISE EXCEPTION 'Service tidak ditemukan';
  END IF;

  SELECT COALESCE(SUM(total_participants), 0) INTO v_current_total
  FROM bookings
  WHERE service_id = p_service_id
    AND booking_date = p_booking_date
    AND status NOT IN ('cancelled', 'completed');

  RETURN (v_current_total + p_participants) <= v_max_capacity;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
    AND status NOT IN ('cancelled', 'completed');

  RETURN GREATEST(v_max_capacity - v_current_total, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- STEP 6: (Optional) Schedule with pg_cron
-- =============================================
-- If pg_cron is enabled on your Supabase project, uncomment below
-- to run the status updater every day at midnight UTC:
--
-- SELECT cron.schedule(
--   'update-booking-statuses',
--   '0 0 * * *',
--   'SELECT update_booking_statuses()'
-- );

-- =============================================
-- VERIFICATION
-- =============================================
-- Check the constraint is correct:
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'bookings'::regclass
  AND conname = 'bookings_status_check';

-- Quick count by status to verify migration:
SELECT status, count(*) FROM bookings GROUP BY status ORDER BY status;
