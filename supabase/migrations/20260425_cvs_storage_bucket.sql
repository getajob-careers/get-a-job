-- The generate-tailored-cv edge function uploads generated PDFs to a Supabase
-- Storage bucket named "cvs" under the path `{user.id}/{role}_CV_{timestamp}.pdf`.
-- The bucket was created by hand in the dashboard on the live project, so a
-- fresh clone would be missing it. This migration creates the bucket and RLS
-- policies so the schema is reproducible.
--
-- Idempotent: safe to re-run.

INSERT INTO storage.buckets (id, name, public)
VALUES ('cvs', 'cvs', false)
ON CONFLICT (id) DO NOTHING;

-- MIME whitelist: PDF (current primary output format from
-- generate-tailored-cv), DOCX (prior primary, kept for older CVs already
-- in storage that users may still download), DOC (legacy Word fallback).
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword'
]
WHERE id = 'cvs';

-- Owner-only CRUD, keyed by the first path segment being the user's UUID
-- (matches the path shape used by generate-tailored-cv).
DROP POLICY IF EXISTS cvs_select_own ON storage.objects;
CREATE POLICY cvs_select_own ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'cvs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS cvs_insert_own ON storage.objects;
CREATE POLICY cvs_insert_own ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'cvs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS cvs_update_own ON storage.objects;
CREATE POLICY cvs_update_own ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'cvs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'cvs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS cvs_delete_own ON storage.objects;
CREATE POLICY cvs_delete_own ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'cvs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
