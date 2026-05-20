-- LinkedIn post image attachments (PR-B of the LinkedIn redesign).
--
-- Adds optional image_url to linkedin_posts so the generated-post preview
-- card can render an attached image (jpg/png/webp, ≤5 MB). Creates a
-- private Storage bucket with per-user RLS so users can only read/write
-- their own image objects.
--
-- Storage path convention: {user_id}/{post_id}_{timestamp}_{filename}
-- The first folder segment must equal auth.uid() — RLS enforces it.

ALTER TABLE public.linkedin_posts
  ADD COLUMN IF NOT EXISTS image_url TEXT;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'linkedin_post_images',
  'linkedin_post_images',
  false,
  5242880,  -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "linkedin_post_images select own"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'linkedin_post_images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "linkedin_post_images insert own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'linkedin_post_images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "linkedin_post_images update own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'linkedin_post_images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "linkedin_post_images delete own"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'linkedin_post_images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
