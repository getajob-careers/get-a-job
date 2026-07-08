-- ─────────────────────────────────────────────────────────────────────────────
-- DRAFT BACKFILL — Comeet apply_url root-page fix (#comeet-apply-url)
--
-- STATUS: DRAFT. Do NOT place in supabase/migrations/ (that path auto-applies).
--         Run ONCE via MCP apply_migration AFTER review approval, then this file
--         stays as the record of what ran.
--
-- WHAT: For existing Comeet job rows whose apply_url is a bare careers ROOT
--       (custom-site tenants with no per-position URL — e.g. all of Guardio ->
--       guard.io/careers), rewrite apply_url to the position-specific
--       url_comeet_hosted_page already stored in raw_payload.
--
-- SCOPE (verified against live jobs 2026-07-08): 207 rows / 27 companies.
--   - Core shared-root rule: active reused across >=2 openings on the board AND
--     carrying neither the opening uid nor the hosted position slug.
--   - Pure-root allowlist (boards whose EVERY opening is a root, verified — never
--     a board that also emits real deep links):
--       A5.000 Bizzabo · 52.009 Fabric · A9.00F Factify · F9.00D LayerX · F9.003 Magenta Medical
--
-- This logic is IDENTICAL to comeetApplyUrl() in scripts/lib/ats-fetchers.ts, so
-- the nightly cron keeps these rows correct after the one-time backfill.
--
-- SAFETY: idempotent — the `apply_url IS DISTINCT FROM hosted` guard makes a
--         re-run a no-op. Touches only ats_source='comeet'. No other ATS shows
--         this signature (verified: shared-apply_url is Comeet-only).
--
-- PREFLIGHT: run the SELECT variant (swap UPDATE...SET for SELECT count(*)) and
--            confirm it returns 207 before applying.
-- ─────────────────────────────────────────────────────────────────────────────

WITH scored AS (
  SELECT
    external_id,
    apply_url,
    company_slug,
    raw_payload->>'url_active_page'        AS active,
    raw_payload->>'url_comeet_hosted_page' AS hosted,
    count(*) OVER (
      PARTITION BY company_slug, raw_payload->>'url_active_page'
    ) AS active_share,
    (SELECT parts[array_length(parts, 1) - 1]
       FROM (
         SELECT string_to_array(
                  regexp_replace(raw_payload->>'url_comeet_hosted_page',
                                 '^https?://[^/]+/', ''),
                  '/') AS parts
       ) s
    ) AS pos_slug
  FROM public.jobs
  WHERE ats_source = 'comeet'
),
target AS (
  SELECT external_id, hosted
  FROM scored
  WHERE hosted IS NOT NULL
    AND hosted <> ''
    AND apply_url IS DISTINCT FROM hosted
    AND (
      -- pure-root allowlist boards: force the hosted page
      company_slug IN ('A5.000', '52.009', 'A9.00F', 'F9.00D', 'F9.003')
      OR (
        -- core shared-root rule
        active_share > 1
        AND position(external_id IN active) = 0                       -- active lacks the opening uid
        AND NOT (pos_slug IS NOT NULL AND pos_slug <> ''
                 AND active ILIKE '%' || pos_slug || '%')             -- active lacks the position slug
      )
    )
)
UPDATE public.jobs j
SET apply_url = t.hosted
FROM target t
WHERE j.ats_source = 'comeet'
  AND j.external_id = t.external_id;

-- Expected: UPDATE 207
--
-- POST-VERIFY (should return 0 — no Comeet company left with an apply_url reused
-- across >=2 of its openings that isn't a real deep link):
--
--   WITH s AS (
--     SELECT company_slug, apply_url,
--            count(*) OVER (PARTITION BY company_slug, apply_url) AS share
--     FROM public.jobs WHERE ats_source='comeet'
--   )
--   SELECT count(*) FROM s
--   WHERE share > 1
--     AND company_slug NOT IN (  -- position-group deep links legitimately shared
--       SELECT DISTINCT company_slug FROM public.jobs
--       WHERE ats_source='comeet' AND apply_url LIKE 'https://www.comeet.com/jobs/%'
--     );
