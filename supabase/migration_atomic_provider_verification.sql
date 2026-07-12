-- Atomic admin review for provider verification.
-- Run this migration after migration_wants_provider_flag.sql.

CREATE OR REPLACE FUNCTION public.review_provider_verification(
  p_provider_id UUID,
  p_action TEXT,
  p_rejection_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_owner_user_id UUID;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid()
      AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Hanya admin yang dapat memverifikasi provider.';
  END IF;

  IF p_action NOT IN ('approve', 'reject') THEN
    RAISE EXCEPTION 'Aksi verifikasi tidak valid.';
  END IF;

  IF p_action = 'reject' AND NULLIF(BTRIM(p_rejection_reason), '') IS NULL THEN
    RAISE EXCEPTION 'Alasan penolakan wajib diisi.';
  END IF;

  SELECT owner_user_id
  INTO v_owner_user_id
  FROM public.providers
  WHERE id = p_provider_id
  FOR UPDATE;

  IF v_owner_user_id IS NULL THEN
    RAISE EXCEPTION 'Provider atau akun pemilik tidak ditemukan.';
  END IF;

  IF p_action = 'approve' THEN
    UPDATE public.users
    SET role = 'provider',
        wants_provider = FALSE
    WHERE id = v_owner_user_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Profil user provider tidak ditemukan.';
    END IF;

    UPDATE public.providers
    SET verification_status = 'verified',
        is_active = TRUE,
        rejection_reason = NULL,
        verified_at = NOW()
    WHERE id = p_provider_id;
  ELSE
    UPDATE public.providers
    SET verification_status = 'rejected',
        is_active = FALSE,
        rejection_reason = BTRIM(p_rejection_reason),
        verified_at = NULL
    WHERE id = p_provider_id;
  END IF;

  RETURN jsonb_build_object(
    'provider_id', p_provider_id,
    'owner_user_id', v_owner_user_id,
    'verification_status', CASE WHEN p_action = 'approve' THEN 'verified' ELSE 'rejected' END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.review_provider_verification(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_provider_verification(UUID, TEXT, TEXT) TO authenticated;
