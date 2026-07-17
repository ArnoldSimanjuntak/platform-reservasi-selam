-- =============================================================
-- MIGRATION: Remove unused resources table
-- SulutDive final database model no longer manages provider
-- resources individually. Availability is calculated from
-- services.max_capacity and bookings.total_participants.
-- =============================================================

BEGIN;

-- Safety guard: the table was verified empty before this migration.
-- Abort instead of deleting data if rows are added before execution.
DO $$
DECLARE
  v_has_rows BOOLEAN;
BEGIN
  IF to_regclass('public.resources') IS NOT NULL THEN
    EXECUTE 'SELECT EXISTS (SELECT 1 FROM public.resources LIMIT 1)'
      INTO v_has_rows;

    IF v_has_rows THEN
      RAISE EXCEPTION
        'Migration dibatalkan: tabel public.resources masih memiliki data.';
    END IF;
  END IF;
END;
$$;

-- No CASCADE: PostgreSQL will stop the migration if another database
-- object still depends on this table.
DROP TABLE IF EXISTS public.resources;

COMMIT;
