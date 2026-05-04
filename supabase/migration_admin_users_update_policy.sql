-- =============================================
-- Migration: Allow admin update any users row
-- =============================================
-- Masalah yang diselesaikan:
-- - Admin verifikasi provider perlu mengubah users.role customer -> provider
-- - Policy lama hanya mengizinkan user update profile dirinya sendiri

DROP POLICY IF EXISTS "Admins can update any user" ON users;
CREATE POLICY "Admins can update any user"
ON users
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM users me
    WHERE me.id = auth.uid()
      AND me.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM users me
    WHERE me.id = auth.uid()
      AND me.role = 'admin'
  )
);

