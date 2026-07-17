-- =============================================================
-- MIGRATION: Align Supabase Auth, application users, and providers
--
-- Final relationship:
--   public.users.id             -> auth.users.id
--   public.providers.owner_user_id -> public.users.id
--
-- Column names may differ. The FOREIGN KEY constraint is what
-- defines the relationship between the child and parent columns.
-- =============================================================

BEGIN;

-- Abort if a provider points to an authentication account that no
-- longer exists. Such data must be reviewed manually.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.providers p
    LEFT JOIN auth.users au ON au.id = p.owner_user_id
    WHERE p.owner_user_id IS NOT NULL
      AND au.id IS NULL
  ) THEN
    RAISE EXCEPTION
      'Migration dibatalkan: terdapat owner_user_id yang tidak ditemukan pada auth.users.';
  END IF;
END;
$$;

-- Backfill an application profile when an existing provider owner is
-- present in auth.users but absent from public.users.
INSERT INTO public.users (
  id,
  name,
  email,
  role,
  wants_provider,
  created_at,
  updated_at
)
SELECT DISTINCT ON (au.id)
  au.id,
  COALESCE(
    NULLIF(BTRIM(au.raw_user_meta_data ->> 'name'), ''),
    SPLIT_PART(au.email, '@', 1),
    'Provider'
  ),
  au.email,
  CASE
    WHEN p.verification_status = 'verified' THEN 'provider'
    ELSE 'customer'
  END,
  COALESCE(p.verification_status, 'pending') <> 'verified',
  au.created_at,
  NOW()
FROM public.providers p
JOIN auth.users au ON au.id = p.owner_user_id
LEFT JOIN public.users u ON u.id = au.id
WHERE p.owner_user_id IS NOT NULL
  AND u.id IS NULL
  AND au.email IS NOT NULL
ORDER BY au.id, p.created_at DESC;

-- Every provider must now have a matching application user profile.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.providers p
    LEFT JOIN public.users u ON u.id = p.owner_user_id
    WHERE p.owner_user_id IS NULL
       OR u.id IS NULL
  ) THEN
    RAISE EXCEPTION
      'Migration dibatalkan: masih terdapat provider tanpa profil public.users.';
  END IF;
END;
$$;

-- public.users.id is supplied by Supabase Auth, so it must not create
-- an unrelated UUID by itself.
ALTER TABLE public.users
  ALTER COLUMN id DROP DEFAULT;

-- Make public.users.id a shared key: PK in public.users and FK to the
-- managed authentication account in auth.users.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.users'::regclass
      AND confrelid = 'auth.users'::regclass
      AND contype = 'f'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_id_auth_users_fkey
      FOREIGN KEY (id)
      REFERENCES auth.users(id)
      ON DELETE CASCADE;
  END IF;
END;
$$;

-- Remove the previous owner_user_id FK, which referred directly to
-- auth.users. The provider business entity should reference the
-- application profile in public.users.
ALTER TABLE public.providers
  DROP CONSTRAINT IF EXISTS providers_owner_user_id_fkey;

ALTER TABLE public.providers
  ALTER COLUMN owner_user_id SET NOT NULL;

-- One application user can own at most one provider profile.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.providers'::regclass
      AND conname = 'providers_owner_user_id_key'
      AND contype = 'u'
  ) THEN
    ALTER TABLE public.providers
      ADD CONSTRAINT providers_owner_user_id_key
      UNIQUE (owner_user_id);
  END IF;
END;
$$;

ALTER TABLE public.providers
  ADD CONSTRAINT providers_owner_user_id_fkey
  FOREIGN KEY (owner_user_id)
  REFERENCES public.users(id)
  ON DELETE CASCADE;

COMMIT;
