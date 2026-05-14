-- C-4 (pre-pilot security audit follow-up): scope manual companies to creator.
-- Previously any authenticated user could update any row with source='manual'
-- — A-to-B data tampering vector.
--
-- All 391 existing rows are source='research' (system-seeded), so the new
-- column starts NULL for them and no backfill is required.

ALTER TABLE public.companies
  ADD COLUMN created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

DROP POLICY IF EXISTS "Users insert manual companies" ON public.companies;
DROP POLICY IF EXISTS "Users update manual companies" ON public.companies;

CREATE POLICY "Users insert own manual companies" ON public.companies
  FOR INSERT TO authenticated
  WITH CHECK (
    source = 'manual'
    AND created_by = auth.uid()
  );

CREATE POLICY "Users update own manual companies" ON public.companies
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = created_by
    AND source = 'manual'
  )
  WITH CHECK (
    auth.uid() = created_by
    AND source = 'manual'
  );

CREATE INDEX IF NOT EXISTS idx_companies_created_by
  ON public.companies(created_by) WHERE created_by IS NOT NULL;
