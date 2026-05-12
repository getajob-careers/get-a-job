-- companies — allow authenticated users to INSERT + UPDATE rows where
-- source = 'manual'. JSearch / faculty_seeded rows stay admin-only.
--
-- Why this exists: the Career Agent's SUGGESTED_COMPANY_TARGET_JSON
-- block lets a student add a company to their practicum kanban that
-- isn't already in the global pool (e.g. they mention "Lemonade" and
-- the matcher hasn't surfaced it yet). The frontend Apply handler
-- INSERTs the company first then INSERTs the company_target. The
-- agent's follow-up "tell me what they do" question lands as an
-- `enrich_company` action that UPDATEs description / sector / domain
-- on the manual row.
--
-- Source-gated to 'manual':
--   * users can't pretend their row came from JSearch (that would
--     break source-attribution for future de-dup / quality cleanup).
--   * faculty_seeded rows are seeded by admin SQL — students can't
--     impersonate faculty assignments.
--
-- WITH CHECK on INSERT and USING + WITH CHECK on UPDATE both pin
-- source = 'manual' so the policy can't be bypassed by smuggling a
-- different source into the row.

DROP POLICY IF EXISTS "Users insert manual companies" ON companies;
CREATE POLICY "Users insert manual companies" ON companies
  FOR INSERT
  WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL
    AND source = 'manual'
  );

DROP POLICY IF EXISTS "Users update manual companies" ON companies;
CREATE POLICY "Users update manual companies" ON companies
  FOR UPDATE
  USING (
    (SELECT auth.uid()) IS NOT NULL
    AND source = 'manual'
  )
  WITH CHECK (
    source = 'manual'
  );

-- DELETE intentionally not granted to authenticated users. The
-- existing admin-only DELETE policy stays in place — if a student
-- adds a junk company, admin cleans up.
