-- =============================================================
-- PHASE 2: hardening setelah kode aplikasi baru selesai deploy
--
-- Jalankan file ini SETELAH migration_booking_operational_details.sql
-- dan SETELAH deployment yang sudah memakai RPC secure.
-- =============================================================

BEGIN;

DO $$
BEGIN
  IF to_regprocedure(
       'public.create_booking_atomic(uuid,date,integer,uuid,integer,character varying,text)'
     ) IS NULL
     OR to_regprocedure('public.submit_payment_proof_secure(uuid,text)') IS NULL
     OR to_regprocedure('public.review_payment_secure(uuid,text)') IS NULL
     OR to_regprocedure('public.update_booking_status_secure(uuid,text)') IS NULL
  THEN
    RAISE EXCEPTION
      'Hardening dibatalkan: jalankan migration_booking_operational_details.sql dan deploy kode aplikasi baru terlebih dahulu.';
  END IF;

  IF EXISTS (SELECT 1 FROM public.bookings WHERE provider_id IS NULL) THEN
    RAISE EXCEPTION
      'Hardening dibatalkan: masih ada bookings.provider_id yang kosong dan harus diperbaiki terlebih dahulu.';
  END IF;
END
$$;

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Semua mutasi booking harus melalui RPC SECURITY DEFINER yang tervalidasi.
DO $$
DECLARE
  v_policy RECORD;
BEGIN
  FOR v_policy IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'bookings'
      AND cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.bookings',
      v_policy.policyname
    );
  END LOOP;
END
$$;

REVOKE INSERT, UPDATE, DELETE ON public.bookings FROM PUBLIC, anon, authenticated;

ALTER TABLE public.bookings ALTER COLUMN provider_id SET NOT NULL;

-- Provider tetap dapat membaca booking yang benar-benar menjadi tanggung jawabnya.
DROP POLICY IF EXISTS "Providers view service bookings" ON public.bookings;
CREATE POLICY "Providers view service bookings"
  ON public.bookings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.providers p
      WHERE p.id = bookings.provider_id
        AND p.owner_user_id = auth.uid()
        AND p.verification_status = 'verified'
        AND p.is_active = TRUE
    )
  );

-- Bersihkan istilah status lama setelah semua instance aplikasi memakai upcoming.
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;

UPDATE public.bookings
SET status = 'upcoming', updated_at = NOW()
WHERE status = 'confirmed';

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_status_check
  CHECK (status IN ('pending', 'upcoming', 'in_progress', 'completed', 'cancelled'));

COMMIT;
