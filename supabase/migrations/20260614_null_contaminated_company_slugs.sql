-- 20260614_null_contaminated_company_slugs.sql
--
-- Phase 4 of task #391 — null 3 contaminated company rows that surface
-- another company's job board under the wrong brand:
--
--   1. CyberArk  → workday slug pointed at PaloAltoNetworks (acquired-by;
--                  pre-acquisition slug captured but contamination risk
--                  if re-verified). Re-classify ats → unknown; defer
--                  ATS re-discovery.
--   2. Ermetic   → greenhouse slug 'tenableinc' (acquired by Tenable).
--                  verified=true ⇒ ACTIVE fetch-contamination every
--                  cron run. Tenable jobs surface as 'Ermetic'.
--   3. Deci AI   → workday slug 'nvidia/login' (acquired by NVIDIA).
--                  verified=true ⇒ ACTIVE fetch-contamination every
--                  cron run. NVIDIA login-board jobs surface as 'Deci AI'.
--
-- Both Ermetic and Deci AI are absorbed into companies we already carry
-- as correct canonical rows (Tenable + NVIDIA respectively), so their
-- jobs are already covered under the right name. Marking inactive via
-- verified=false + api_url=null is the clean one-step revert; no
-- acquired_by schema is introduced (per #391 decision).
--
-- Paired with edits to supabase/functions/_shared/libraries/companies_il.json
-- in the same PR — the JSON registry is the load-bearing copy
-- refresh-jobs.ts actually reads (scripts/refresh-jobs.ts:264-266).
-- Table edits exist to keep the Browse / Internship surfaces and any
-- joining queries consistent with the fetcher view.
--
-- Down-migration restores pre-state byte-for-byte (per CLAUDE.md
-- cross-review-required convention for shared registry edits).

BEGIN;

-- CyberArk: workday → unknown (re-discovery deferred).
UPDATE public.companies
   SET ats        = 'unknown',
       ats_slug   = NULL,
       api_url    = NULL,
       verified   = false,
       updated_at = now()
 WHERE name      = 'CyberArk'
   AND ats       = 'workday'
   AND ats_slug  = 'paloaltonetworks.wd5.myworkdayjobs.com/PaloAltoNetworks';

-- Ermetic: greenhouse tenableinc → inactive (acquired by Tenable).
UPDATE public.companies
   SET ats_slug   = NULL,
       api_url    = NULL,
       verified   = false,
       updated_at = now()
 WHERE name      = 'Ermetic'
   AND ats       = 'greenhouse'
   AND ats_slug  = 'tenableinc';

-- Deci AI: workday nvidia/login → inactive (acquired by NVIDIA).
UPDATE public.companies
   SET ats_slug   = NULL,
       api_url    = NULL,
       verified   = false,
       updated_at = now()
 WHERE name      = 'Deci AI'
   AND ats       = 'workday'
   AND ats_slug  = 'nvidia.wd5.myworkdayjobs.com/login';

COMMIT;

-- ─────────────────────────────────────────────────────────────────────
-- ROLLBACK (apply manually if revert is needed; restores pre-state
-- byte-for-byte from the live row state captured at investigation time):
-- ─────────────────────────────────────────────────────────────────────
--
-- BEGIN;
--
-- UPDATE public.companies
--    SET ats        = 'workday',
--        ats_slug   = 'paloaltonetworks.wd5.myworkdayjobs.com/PaloAltoNetworks',
--        api_url    = 'https://paloaltonetworks.wd5.myworkdayjobs.com/wday/cxs/paloaltonetworks/PaloAltoNetworks/jobs',
--        verified   = false,
--        updated_at = now()
--  WHERE name      = 'CyberArk'
--    AND ats       = 'unknown'
--    AND ats_slug  IS NULL;
--
-- UPDATE public.companies
--    SET ats_slug   = 'tenableinc',
--        api_url    = 'https://boards-api.greenhouse.io/v1/boards/tenableinc/jobs',
--        verified   = true,
--        updated_at = now()
--  WHERE name      = 'Ermetic'
--    AND ats       = 'greenhouse'
--    AND ats_slug  IS NULL;
--
-- UPDATE public.companies
--    SET ats_slug   = 'nvidia.wd5.myworkdayjobs.com/login',
--        api_url    = 'https://nvidia.wd5.myworkdayjobs.com/wday/cxs/nvidia/login/jobs',
--        verified   = true,
--        updated_at = now()
--  WHERE name      = 'Deci AI'
--    AND ats       = 'workday'
--    AND ats_slug  IS NULL;
--
-- COMMIT;
