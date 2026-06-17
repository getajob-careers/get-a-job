-- application_cvs — persisted, structured, versioned tailored CVs.
-- Foundation for conversational CV editing (no user-facing behavior change yet:
-- generate-tailored-cv still returns the same rendered PDF; it now ALSO writes
-- the reconciled structured cv_data here as version 1).
--
-- application_id is NULLABLE on purpose: the browser extension will tailor a CV
-- from a pasted JD before any applications row exists (standalone CV). source_jd
-- lets a standalone CV remember what it was tailored to (today the only JD-text
-- path is applications.job_description).
--
-- FK on-delete: application_id SET NULL (a deleted application leaves the CV as a
-- valid standalone row rather than blocking the delete); user_id CASCADE (account
-- deletion removes the user's CVs). Both chosen so this table can never block an
-- existing applications/account delete.
CREATE TABLE IF NOT EXISTS public.application_cvs (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id uuid        REFERENCES public.applications(id) ON DELETE SET NULL,
  source_jd      text,
  cv_data        jsonb       NOT NULL,
  cv_url         text,
  version        int         NOT NULL DEFAULT 1,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_application_cvs_user_id        ON public.application_cvs(user_id);
CREATE INDEX IF NOT EXISTS idx_application_cvs_application_id ON public.application_cvs(application_id);

ALTER TABLE public.application_cvs ENABLE ROW LEVEL SECURITY;

-- 4-policy own-row pattern, gated on auth.uid() = user_id.
CREATE POLICY "application_cvs_select_own" ON public.application_cvs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "application_cvs_insert_own" ON public.application_cvs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "application_cvs_update_own" ON public.application_cvs
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "application_cvs_delete_own" ON public.application_cvs
  FOR DELETE USING (auth.uid() = user_id);
