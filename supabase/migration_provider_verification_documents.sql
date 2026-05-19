-- ==============================================================
-- MIGRATION: Provider Verification Documents
-- Expands provider screening from simple KTP/cert upload into a
-- type-based verification checklist for boat, gear, and instructor.
-- Run this in Supabase SQL Editor before deploying the code changes.
-- ==============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Allow the app's admin role value when projects still use the old schema check.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('customer', 'provider', 'admin'));

ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS business_license_number TEXT,
  ADD COLUMN IF NOT EXISTS instructor_scope VARCHAR(20)
    CHECK (instructor_scope IS NULL OR instructor_scope IN ('guide', 'instructor')),
  ADD COLUMN IF NOT EXISTS safety_checklist JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS verification_submitted_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'providers_owner_user_id_key'
      AND conrelid = 'providers'::regclass
  ) THEN
    ALTER TABLE providers
      ADD CONSTRAINT providers_owner_user_id_key UNIQUE (owner_user_id);
  END IF;
END $$;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'provider-documents',
  'provider-documents',
  FALSE,
  8388608,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE
SET public = FALSE,
    file_size_limit = 8388608,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

CREATE TABLE IF NOT EXISTS provider_verification_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  document_type VARCHAR(80) NOT NULL,
  label TEXT NOT NULL,
  storage_path TEXT,
  public_url TEXT,
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  status VARCHAR(20) NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'approved', 'rejected')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (provider_id, document_type)
);

CREATE INDEX IF NOT EXISTS idx_provider_docs_provider
  ON provider_verification_documents(provider_id);

CREATE INDEX IF NOT EXISTS idx_provider_docs_type
  ON provider_verification_documents(document_type);

ALTER TABLE provider_verification_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Provider owners manage own verification docs"
  ON provider_verification_documents;
CREATE POLICY "Provider owners manage own verification docs"
ON provider_verification_documents
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM providers p
    WHERE p.id = provider_verification_documents.provider_id
      AND p.owner_user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM providers p
    WHERE p.id = provider_verification_documents.provider_id
      AND p.owner_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Admins view provider verification docs"
  ON provider_verification_documents;
CREATE POLICY "Admins view provider verification docs"
ON provider_verification_documents
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM users u
    WHERE u.id = auth.uid()
      AND u.role = 'admin'
  )
);

DROP POLICY IF EXISTS "Admins update provider verification docs"
  ON provider_verification_documents;
CREATE POLICY "Admins update provider verification docs"
ON provider_verification_documents
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM users u
    WHERE u.id = auth.uid()
      AND u.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM users u
    WHERE u.id = auth.uid()
      AND u.role = 'admin'
  )
);

-- Backfill legacy document URLs into the structured document table.
INSERT INTO provider_verification_documents (
  provider_id,
  document_type,
  label,
  public_url,
  is_required
)
SELECT
  id,
  'identity_card',
  'KTP / Identitas pemilik',
  identity_card_url,
  TRUE
FROM providers
WHERE identity_card_url IS NOT NULL
ON CONFLICT (provider_id, document_type) DO UPDATE
SET public_url = EXCLUDED.public_url,
    label = EXCLUDED.label,
    is_required = TRUE,
    updated_at = NOW();

INSERT INTO provider_verification_documents (
  provider_id,
  document_type,
  label,
  public_url,
  is_required
)
SELECT
  id,
  'dive_certificate',
  'Sertifikat selam',
  certification_url,
  TRUE
FROM providers
WHERE certification_url IS NOT NULL
ON CONFLICT (provider_id, document_type) DO UPDATE
SET public_url = EXCLUDED.public_url,
    label = EXCLUDED.label,
    is_required = TRUE,
    updated_at = NOW();

UPDATE providers
SET verification_submitted_at = COALESCE(verification_submitted_at, updated_at, created_at, NOW())
WHERE verification_status IN ('pending', 'verified', 'rejected')
  AND verification_submitted_at IS NULL
  AND (identity_card_url IS NOT NULL OR certification_url IS NOT NULL);

UPDATE providers
SET verified_at = COALESCE(verified_at, updated_at, NOW())
WHERE verification_status = 'verified'
  AND verified_at IS NULL;

-- Storage policies for provider-owned folders in provider-documents bucket.
-- Folder format used by the app: provider-documents/{auth.uid()}/{document_type}.ext
DROP POLICY IF EXISTS "Provider owners upload verification docs"
  ON storage.objects;
CREATE POLICY "Provider owners upload verification docs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'provider-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Provider owners update verification docs"
  ON storage.objects;
CREATE POLICY "Provider owners update verification docs"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'provider-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'provider-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Provider owners read verification docs"
  ON storage.objects;
CREATE POLICY "Provider owners read verification docs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'provider-documents'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1
      FROM users u
      WHERE u.id = auth.uid()
        AND u.role = 'admin'
    )
  )
);
