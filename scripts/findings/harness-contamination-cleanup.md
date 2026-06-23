# Rebake harness contamination: cleanup investigation

Read-only investigation, 2026-06-23. Maps the synthetic rows the rebake harness (`scripts/refine-rebake.mjs`) wrote into production, locates the `__REBAKE_HARNESS__` marker, scopes the affected users, traces FK entanglement, and proposes a surgical cleanup plus a harness fix. No DELETE, UPDATE, or INSERT was run. All counts come from Supabase MCP queries against project `ilmqmodklutztuybsvwd`.

## Headline correction to the stated contamination shape

Eli's records said "roughly 5 fake applications and 6 fake CVs against Eli's real user account." The live data says something different and broader:

- The real-user subset is indeed 5 applications and 6 CVs, which matches the "5 and 6" figure.
- But NONE of the contamination is on Eli's account (`4b243f3a-5035-474e-a89d-aff13fe06cc2`). Eli has 0 harness-tagged rows.
- The total contamination is 9 applications and 11 application_cvs, spread across 8 distinct user_ids, of which 5 are real non-team pilot users. The harness minted JWTs for those real users and wrote a fake application against each of their real accounts. For all 5 real users, the fake application is their ONLY application.

This is the "contamination spread to other users" case. It is flagged urgently in Section 4.

## Section 1: Tables the harness writes to

| Table           | Operation                                                                                                                                       | refine-rebake.mjs ref                              | Carries the marker?                        |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------ |
| applications    | INSERT                                                                                                                                          | line 426 to 433 (`company: HARNESS_TAG`)           | Yes, in `company`                          |
| application_cvs | Written indirectly by the `generate-tailored-cv` and `refine-cv` edge functions invoked at lines 437 and 444 against the harness application_id | not a direct harness INSERT                        | No, identified only by FK `application_id` |
| jobs            | SELECT only (read)                                                                                                                              | lines 221, 233 (`pickAlignedJd` / `pickStretchJd`) | n/a, read only                             |
| profiles        | SELECT only (read)                                                                                                                              | line 532 (`onboarding_complete=true` load)         | n/a, read only                             |

The marker constant is defined at line 28: `const HARNESS_TAG = "__REBAKE_HARNESS__";`. The INSERT is:

```js
// scripts/refine-rebake.mjs line 426
const { data: app, error: appErr } = await c.from("applications").insert({
  user_id: profile.id,
  role_title: job.title || "Target Role",
  company: HARNESS_TAG,
  job_description: job.description,
  status: "interested",
});
```

The harness has self-cleanup that should have removed these rows: a `finally` block in `runPair` (lines 506 to 510) deletes the application_cvs by `application_id` then the application, and a standalone `cleanup()` (lines 514 to 523) sweeps all `company = HARNESS_TAG` applications. The rows survive because that cleanup did not complete for these pairs (the run was interrupted or errored before the `finally` ran for them). The deletion order in the harness's own cleanup (CVs first, then app) is the correct order and is reused in Section 7.

## Section 2: Marker locations and row counts

The literal string `__REBAKE_HARNESS__` exists in exactly one column: `applications.company`, 9 rows. Every other candidate field is clean. Query run verbatim:

```sql
WITH harness_apps AS (SELECT id FROM applications WHERE company='__REBAKE_HARNESS__')
SELECT 'applications.company' k, count(*) n FROM applications WHERE company ILIKE '%__REBAKE_HARNESS__%'
UNION ALL SELECT 'applications.role_title', count(*) FROM applications WHERE role_title ILIKE '%__REBAKE_HARNESS__%'
UNION ALL SELECT 'applications.job_description', count(*) FROM applications WHERE job_description ILIKE '%__REBAKE_HARNESS__%'
UNION ALL SELECT 'applications.notes', count(*) FROM applications WHERE coalesce(notes,'') ILIKE '%__REBAKE_HARNESS__%'
UNION ALL SELECT 'application_cvs.cv_data(jsonb)', count(*) FROM application_cvs WHERE cv_data::text ILIKE '%__REBAKE_HARNESS__%'
UNION ALL SELECT 'application_cvs.source_jd', count(*) FROM application_cvs WHERE coalesce(source_jd,'') ILIKE '%__REBAKE_HARNESS__%'
UNION ALL SELECT 'jobs.raw_payload', count(*) FROM jobs WHERE raw_payload::text ILIKE '%__REBAKE_HARNESS__%'
UNION ALL SELECT 'jobs.company_name', count(*) FROM jobs WHERE company_name ILIKE '%__REBAKE_HARNESS__%'
UNION ALL SELECT 'FKchild:status_changes', count(*) FROM status_changes WHERE application_id IN (SELECT id FROM harness_apps)
UNION ALL SELECT 'FKchild:calendar_events', count(*) FROM calendar_events WHERE application_id IN (SELECT id FROM harness_apps)
UNION ALL SELECT 'FKchild:conversations', count(*) FROM conversations WHERE application_id IN (SELECT id FROM harness_apps)
ORDER BY k;
```

Result:

| Location                        | Rows |
| ------------------------------- | ---- |
| applications.company            | 9    |
| applications.role_title         | 0    |
| applications.job_description    | 0    |
| applications.notes              | 0    |
| application_cvs.cv_data (jsonb) | 0    |
| application_cvs.source_jd       | 0    |
| jobs.raw_payload                | 0    |
| jobs.company_name               | 0    |
| FK child status_changes         | 0    |
| FK child calendar_events        | 0    |
| FK child conversations          | 0    |

The synthetic CV bodies do not embed the marker (cv_data jsonb = 0), so the contaminated CVs cannot be found by string search. They are identified only by their FK to the 9 marked applications.

## Section 3: Contaminated row listings

### Applications (9 rows). Query:

```sql
SELECT a.id, a.user_id, u.email,
       to_char(a.created_at,'YYYY-MM-DD HH24:MI:SS') AS created_at,
       a.company, a.role_title, a.status, a.source
FROM applications a
LEFT JOIN auth.users u ON u.id=a.user_id
WHERE a.company = '__REBAKE_HARNESS__'
ORDER BY a.created_at;
```

| application id                       | user email                   | created_at          | company (marker)   | role_title                                           |
| ------------------------------------ | ---------------------------- | ------------------- | ------------------ | ---------------------------------------------------- |
| 8943503a-bd87-46ce-a9ce-72485085d444 | yishailieser+demo3@gmail.com | 2026-06-19 11:24:44 | **REBAKE_HARNESS** | QA Engineer                                          |
| 0c60f49f-c000-46e6-bceb-2b2a8586c852 | nevo.liani@gmail.com         | 2026-06-19 11:24:45 | **REBAKE_HARNESS** | Director Sterile Operational Quality Assurance       |
| 70297c78-e40b-4929-b5cf-0ceac9b25a20 | matiborlak@gmail.com         | 2026-06-19 11:24:48 | **REBAKE_HARNESS** | Senior Solution Architect, Networking Solutions Labs |
| 1ab67757-0693-4536-b55e-7c0f1028deee | isaacselig@gmail.com         | 2026-06-19 11:28:51 | **REBAKE_HARNESS** | QA Engineer                                          |
| 0bc5d2a1-3abd-4a6c-8cf0-43c7430a5a20 | werner.gidon@gmail.com       | 2026-06-19 11:28:53 | **REBAKE_HARNESS** | Office Manager                                       |
| 8c309fdf-0f23-4c19-98cd-d9f6dd832a5b | yishailieser+demo3@gmail.com | 2026-06-19 11:29:37 | **REBAKE_HARNESS** | QA Engineer                                          |
| 23584a6e-29df-4652-9824-938d9e8d9490 | idodagan1414@gmail.com       | 2026-06-19 11:35:24 | **REBAKE_HARNESS** | QA Engineer                                          |
| bb96ae5e-2821-48c2-a9da-a682277d4549 | amischapiro@gmail.com        | 2026-06-19 11:35:33 | **REBAKE_HARNESS** | QA Engineer                                          |
| ec93c8e4-d89b-44e0-801f-fa8230fc2c17 | isaacselig+demo@gmail.com    | 2026-06-19 11:35:36 | **REBAKE_HARNESS** | Director Sterile Operational Quality Assurance       |

### Application CVs (11 rows, all is_master=false). Query:

```sql
WITH harness_apps AS (
  SELECT id, user_id FROM applications WHERE company = '__REBAKE_HARNESS__'
)
SELECT ac.id, ac.user_id, u.email,
       to_char(ac.created_at,'YYYY-MM-DD HH24:MI:SS') AS created_at,
       ac.application_id, ac.is_master, left(coalesce(ac.source_jd,''),40) AS source_jd
FROM application_cvs ac
JOIN harness_apps h ON h.id = ac.application_id
LEFT JOIN auth.users u ON u.id = ac.user_id
ORDER BY ac.created_at;
```

| cv id                                | user email                   | created_at          | application_id | is_master |
| ------------------------------------ | ---------------------------- | ------------------- | -------------- | --------- |
| 8d376bc7-b891-4bac-b38c-9f425243c56f | yishailieser+demo3@gmail.com | 2026-06-19 11:25:13 | 8943503a-...   | false     |
| 9fa3fa18-1ae2-4158-9a0b-926fff876eb0 | nevo.liani@gmail.com         | 2026-06-19 11:25:14 | 0c60f49f-...   | false     |
| ed0f90fb-a069-4768-a4ed-811005a5f846 | matiborlak@gmail.com         | 2026-06-19 11:25:20 | 70297c78-...   | false     |
| d2588526-664a-4bca-a133-f36cc9d011f5 | isaacselig@gmail.com         | 2026-06-19 11:29:18 | 1ab67757-...   | false     |
| 2d2fb297-82b8-4590-b718-43f9911997ec | werner.gidon@gmail.com       | 2026-06-19 11:29:23 | 0bc5d2a1-...   | false     |
| 3ec87d1d-8903-4128-bcf6-56b6d2f0d5ec | werner.gidon@gmail.com       | 2026-06-19 11:29:36 | 0bc5d2a1-...   | false     |
| 0cdd9f75-ce1a-4c60-968a-f2ab896fcfe8 | isaacselig@gmail.com         | 2026-06-19 11:29:37 | 1ab67757-...   | false     |
| e323f6ae-be60-451a-bbb1-aa3d90a26d72 | yishailieser+demo3@gmail.com | 2026-06-19 11:30:03 | 8c309fdf-...   | false     |
| 0ab125a0-3d9f-4193-a843-5145973c9f09 | amischapiro@gmail.com        | 2026-06-19 11:36:01 | bb96ae5e-...   | false     |
| edd6576e-2e3e-4fcb-a356-b54c25b67f1f | idodagan1414@gmail.com       | 2026-06-19 11:36:02 | 23584a6e-...   | false     |
| 975ab90e-b3d2-4c32-b4e0-8e8bd40a4ba6 | isaacselig+demo@gmail.com    | 2026-06-19 11:36:03 | ec93c8e4-...   | false     |

Confidence: high. The applications carry an unambiguous synthetic sentinel (`company = '__REBAKE_HARNESS__'`, a string that cannot occur organically), all created in a 12-minute window on 2026-06-19 with placeholder role titles. The CVs are each FK-linked to one of those applications, created seconds after their parent app, all is_master=false. No row in either list is ambiguous. No false positives identified.

## Section 4: User scope confirmation (URGENT)

8 distinct user_ids are contaminated. None is Eli. Query:

```sql
WITH harness_apps AS (SELECT id, user_id FROM applications WHERE company='__REBAKE_HARNESS__'),
harness_cvs AS (SELECT ac.id, ac.user_id FROM application_cvs ac JOIN harness_apps h ON h.id=ac.application_id),
affected AS (SELECT DISTINCT user_id FROM harness_apps)
SELECT u.email,
  (u.email LIKE '%+%' OR u.id IN (
    '4b243f3a-5035-474e-a89d-aff13fe06cc2','294d7fca-15e1-4131-bf47-cd82718990c4',
    'b16b7ad7-dfe8-44ff-8ebf-13eedb1ecdd3','6de6aa99-a940-4f5d-88c9-3a32e387c761',
    '90bcf097-77f2-437f-9210-42755ba4d143')) AS is_internal,
  (SELECT count(*) FROM applications a WHERE a.user_id=af.user_id) AS apps_total,
  (SELECT count(*) FROM harness_apps h WHERE h.user_id=af.user_id) AS apps_harness,
  (SELECT count(*) FROM application_cvs ac WHERE ac.user_id=af.user_id) AS cvs_total,
  (SELECT count(*) FROM harness_cvs hc WHERE hc.user_id=af.user_id) AS cvs_harness
FROM affected af JOIN auth.users u ON u.id=af.user_id
ORDER BY is_internal, u.email;
```

| email                        | internal?  | apps total | apps harness | cvs total | cvs harness |
| ---------------------------- | ---------- | ---------- | ------------ | --------- | ----------- |
| amischapiro@gmail.com        | no (real)  | 1          | 1            | 2         | 1           |
| idodagan1414@gmail.com       | no (real)  | 1          | 1            | 2         | 1           |
| matiborlak@gmail.com         | no (real)  | 1          | 1            | 2         | 1           |
| nevo.liani@gmail.com         | no (real)  | 1          | 1            | 2         | 1           |
| werner.gidon@gmail.com       | no (real)  | 1          | 1            | 3         | 2           |
| isaacselig@gmail.com         | yes (team) | 7          | 1            | 3         | 2           |
| isaacselig+demo@gmail.com    | yes (seed) | 2          | 1            | 2         | 1           |
| yishailieser+demo3@gmail.com | yes (seed) | 14         | 2            | 3         | 2           |

Urgent points:

- 5 real non-team pilot users (amischapiro, idodagan1414, matiborlak, nevo.liani, werner.gidon) each have the harness application as their ONLY application. The platform currently shows each of them with one fake "QA Engineer" or "Director Sterile Operational Quality Assurance" application they never created.
- The harness reached these accounts by minting magic-link JWTs for their real emails (the `mintJwt(email)` call at the top of `runPair`). The same mint also overwrote their `auth.users.last_sign_in_at` to 2026-06-19, a separate already-documented artifact.
- For every affected user the master CV is preserved: all 11 harness CVs are is_master=false, and the remaining CV per user (cvs_total minus cvs_harness) is their real master or earlier real CV. Cleanup does not touch any master.
- Eli scope: 0 harness applications and 0 harness CVs are on Eli's user_id. Eli's own 42 applications and 31 CVs (his testing data) are entirely separate and are not touched by this cleanup.

## Section 5: FK entanglement and deletion order

FK references pointing AT the contaminated parents (from `information_schema`):

| child table     | child fk column | parent          | on delete |
| --------------- | --------------- | --------------- | --------- |
| application_cvs | application_id  | applications.id | SET NULL  |
| conversations   | application_id  | applications.id | SET NULL  |
| calendar_events | application_id  | applications.id | CASCADE   |
| status_changes  | application_id  | applications.id | CASCADE   |

Nothing references `application_cvs` (no FK has application_cvs as its parent), so the contaminated CVs have no downstream children.

For the 9 contaminated applications specifically: status_changes = 0, calendar_events = 0, conversations = 0 (Section 2 query). So there are no cascade or set-null side effects in practice for those four child tables.

Critical ordering note: `application_cvs.application_id` is ON DELETE SET NULL, not CASCADE. If the applications were deleted first, the 11 contaminated CVs would survive with `application_id = NULL`, losing the only link that identifies them as synthetic, becoming untraceable orphans. They must be deleted explicitly and first.

Correct deletion order:

1. DELETE the 11 application_cvs rows, keyed by `application_id IN (the 9 harness app ids)`. They have no children.
2. DELETE the 9 applications rows, keyed by `company = '__REBAKE_HARNESS__'`. Their CASCADE children (status_changes, calendar_events) are empty; their SET NULL children (the now-deleted CVs, and conversations which are empty) are not a concern.

This matches the order the harness's own `cleanup()` already uses.

## Section 6: Engagement metrics impact

Query:

```sql
WITH harness_apps AS (SELECT id, user_id FROM applications WHERE company='__REBAKE_HARNESS__'),
harness_cvs AS (SELECT ac.id, ac.user_id FROM application_cvs ac JOIN harness_apps h ON h.id=ac.application_id)
SELECT 'apps_total_all_users' k, count(*)::text v FROM applications
UNION ALL SELECT 'apps_harness', (SELECT count(*) FROM harness_apps)::text
UNION ALL SELECT 'cvs_total_all_users', count(*)::text FROM application_cvs
UNION ALL SELECT 'cvs_harness', (SELECT count(*) FROM harness_cvs)::text
UNION ALL SELECT 'eli_apps_total', count(*)::text FROM applications WHERE user_id='4b243f3a-5035-474e-a89d-aff13fe06cc2'
UNION ALL SELECT 'eli_apps_harness', count(*)::text FROM harness_apps WHERE user_id='4b243f3a-5035-474e-a89d-aff13fe06cc2'
UNION ALL SELECT 'eli_cvs_total', count(*)::text FROM application_cvs WHERE user_id='4b243f3a-5035-474e-a89d-aff13fe06cc2'
UNION ALL SELECT 'eli_cvs_harness', count(*)::text FROM harness_cvs WHERE user_id='4b243f3a-5035-474e-a89d-aff13fe06cc2';
```

| Metric                            | Before | Harness | After cleanup  |
| --------------------------------- | ------ | ------- | -------------- |
| Total applications (all users)    | 76     | 9       | 67             |
| Total application_cvs (all users) | 74     | 11      | 63             |
| Eli applications                  | 42     | 0       | 42 (unchanged) |
| Eli application_cvs               | 31     | 0       | 31 (unchanged) |

The largest distortion is on the 5 real pilot users, each of whom goes from a recorded 1 application to the true 0. The aggregate "users with at least one application" metric is inflated by those 5 phantom trackers.

## Section 7: Cleanup script design (do not run yet)

A standalone Node script (for example `scripts/cleanup-harness-contamination.mjs`) using the service-role client, modeled on the harness's own ordering, with a mandatory DRY RUN default.

Design:

- Default mode is DRY RUN. A live delete requires an explicit `--apply` flag. DRY RUN prints the exact rows and counts it would delete and exits without writing.
- Preconditions asserted before any delete (abort on mismatch): the application set is exactly those with `company = '__REBAKE_HARNESS__'`; every target CV has `is_master = false`; the counts equal the expected 9 applications and 11 CVs (or whatever the DRY RUN surfaced in the same run, to guard against drift between preview and apply).
- Atomic. Because supabase-js does not wrap multiple statements in one transaction, the apply path should run a single Postgres function or a raw SQL transaction via the service role (for example an RPC, or `execute_sql` of a `BEGIN ... COMMIT` block). The transaction outline:

```sql
BEGIN;

-- snapshot expected ids
CREATE TEMP TABLE _harness_apps ON COMMIT DROP AS
  SELECT id FROM applications WHERE company = '__REBAKE_HARNESS__';

-- safety asserts (raise and rollback on any violation)
DO $$
DECLARE n_app int; n_master int;
BEGIN
  SELECT count(*) INTO n_app FROM _harness_apps;
  IF n_app <> 9 THEN RAISE EXCEPTION 'expected 9 harness apps, found %', n_app; END IF;
  SELECT count(*) INTO n_master FROM application_cvs
    WHERE application_id IN (SELECT id FROM _harness_apps) AND is_master;
  IF n_master <> 0 THEN RAISE EXCEPTION 'refusing: % master CVs in target set', n_master; END IF;
END $$;

-- step 1: children first (SET NULL FK means these must go before the apps)
DELETE FROM application_cvs WHERE application_id IN (SELECT id FROM _harness_apps);
-- step 2: the marked applications (CASCADE children are already empty)
DELETE FROM applications WHERE company = '__REBAKE_HARNESS__';

-- verify post-state, else rollback
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM applications WHERE company = '__REBAKE_HARNESS__';
  IF n <> 0 THEN RAISE EXCEPTION 'apps remain: %', n; END IF;
END $$;

COMMIT;
```

- Expected effect: 11 application_cvs deleted, 9 applications deleted, 0 master CVs touched, 0 rows on any other user beyond the 8 listed.
- Post-run verification: re-run the Section 2 marker query and confirm `applications.company = 0`, and re-run the Section 6 metrics and confirm 67 applications and 63 CVs.

## Section 8: Harness fix proposal (separate scope from cleanup)

Root cause: `main()` selects eligible profiles from ALL `onboarding_complete = true` users that have a master CV, then `mintJwt(email)` mints a real JWT for each and writes a real application against `profile.id`. There is no guard preventing a real, non-test user from being selected, and the best-effort `finally` cleanup leaks rows on any interrupted run.

Recommended changes, in order of importance:

1. Restrict the eligible set to dedicated seed accounts only. Filter to the known test seeds (the `+`-convention accounts, for example `isaacselig+demo@gmail.com`, `yishailieser+demo3@gmail.com`, or an explicit allowlist of seed user_ids). Never select a profile whose email lacks `+` and whose id is not in the seed allowlist.
2. Add a hard pre-flight guard that aborts the whole run if any selected user_id or email is not in the seed allowlist. Fail closed, not open. This is the single change that makes "write to a real user_id in production" impossible.
3. Make cleanup guaranteed rather than best-effort. Run the marker sweep at both start and end of every run, and have the harness exit non-zero if any tagged row remains after the sweep, so a leak is loud rather than silent.
4. Optionally, tag every written row (not just applications) and prefer a dedicated throwaway schema or a branch database for harness writes, so production user tables are never the target.

These are a fix proposal only. No change to `refine-rebake.mjs` was made in this task.

## Open items and uncertainty

- The contamination set is unambiguous (sentinel string plus FK linkage plus tight timestamp window). I did not find any borderline row. If a row's status were unclear I would have excluded it; none were.
- Out of scope but related: the harness also wrote `function_metrics` telemetry rows for its `generate-tailored-cv` and `refine-cv` calls on 2026-06-19, and overwrote `last_sign_in_at` for the minted users. Those carry no marker, are not user-facing engagement data, and are not FK-linked to the applications. They are noted here for awareness and are not part of this cleanup. Decide separately whether to scrub telemetry.
- The "5 and 6" in Eli's records corresponds exactly to the real-user subset (5 apps, 6 CVs). The team and seed accounts add 4 more apps and 5 more CVs, for the 9 and 11 totals. Confirm whether cleanup should remove all 9 and 11, or only the 5 and 6 real-user rows. The proposed script removes all rows carrying the synthetic marker, which is the safer default for a clean registry, but the team and seed rows could be retained if there is a reason to keep them.
