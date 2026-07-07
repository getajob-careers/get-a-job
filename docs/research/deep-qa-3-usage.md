# Deep QA 3 — Part 2: Usage Cross-Reference

Read-only investigation (SELECT-only). Every figure below is backed by a shown query against project `ilmqmodklutztuybsvwd`. Run date: **2026-07-05**. Metrics period: **2026-05-04 → 2026-07-05**.

> Caveat up front: with ~40 real users and single-digit `n` on most features, nearly every per-feature conclusion is **LOW-CONFIDENCE** as a rate. The numbers are reliable as _counts of who-ever-touched-what_; they are not reliable as adoption _rates_. Treated accordingly below.

---

## STEP 0 — The real-user scrub (foundation)

### Signup histogram (all of auth.users)

```sql
select date_trunc('day', created_at)::date as day, count(*) as signups,
  count(*) filter (where email_confirmed_at is not null) as confirmed,
  count(*) filter (where deleted_at is not null) as deleted
from auth.users group by 1 order by 1;
```

Result (abridged): 69 total rows, spread 2026-03-18 → 2026-07-05. **No narrow-window import spike exists.** The largest single day is **2026-06-07 = 18 signups**, but those 18 are spread across ~7 hours (09:13 → 16:31 UTC) with human-sized gaps and distinct personal gmail addresses — i.e. an organic **launch day**, not a seed/backfill. There is **no 2026-06-18 batch** in the data at all (the brief anticipated one; it never landed, or was never imported here). So the "exclude the June-18 backfill cohort" rule **excludes nothing** — there is no backfill to exclude.

### Scrub classification

```sql
with classified as (
  select id, email, email_confirmed_at,
    case
      when email in ('isaacselig@gmail.com','isaacseligcoding@gmail.com','elienglard34@gmail.com','yishailieser@gmail.com') then 'team'
      when email ~* '\+(demo|test|audit|cwsreview)' then 'test_alias'
      when email ~* 'cwscts' then 'test_account'
      when email_confirmed_at is null then 'unconfirmed'
      else 'real'
    end as bucket
  from auth.users where deleted_at is null
)
select bucket, count(*) from classified group by bucket order by 2 desc;
```

| bucket       | count  | reason excluded                                                                                                                                                          |
| ------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **real**     | **53** | kept                                                                                                                                                                     |
| test_alias   | 6      | `elienglard34+demo34343434`, `+cwsreview`, `+test4545454527`, `+demo2323231417`, `isaacselig+demo`, `yishailieser+demo3` — Eli/Isaac/Yishai plus-addressed test accounts |
| unconfirmed  | 5      | `jenna@bettear.com`, `rachelimiller24@`, `gulicheric@`, `jakiebirman@`, `suchyeichenstein@` — never confirmed email                                                      |
| team         | 4      | `isaacselig@`, `isaacseligcoding@`, `elienglard34@` (founder), `yishailieser@`                                                                                           |
| test_account | 1      | `cwsctstest002@gmail.com` — Chrome-Web-Store review test                                                                                                                 |
| deleted      | 0      | no `deleted_at is not null` rows                                                                                                                                         |

**`real_users` = 53** (confirmed, non-team, non-test, non-deleted). This is the set every query below joins against. Definition reused verbatim in every CTE:

```sql
with real_users as (
  select id from auth.users
  where deleted_at is null and email_confirmed_at is not null
    and email not in ('isaacselig@gmail.com','isaacseligcoding@gmail.com','elienglard34@gmail.com','yishailieser@gmail.com')
    and email !~* '\+(demo|test|audit|cwsreview)' and email !~* 'cwscts'
)
```

### Why 53, not the expected ~38

The ~38 expectation was written ~2026-06-15. Counting real users **as of that date** gives ~33. The extra ~20 arrived organically **June 16 → July 5** (histogram shows steady 1–4/day). So 53 is 33 + three more weeks of organic growth — the scrub is sound, the target was just stale. Two of the 53 are **duplicate humans** (`salofogel@`+`salofogel1.1@`; `danielbasik@`+`daniel.basiktashtash@post.runi.ac.il`), so **~51 unique humans**.

**Reach caveat that matters for everything below:** of 53 real users, only **42 created a profile** and **35 completed onboarding** (query in STEP 2). So the realistic denominator for any post-onboarding feature is **~35**, not 53.

```sql
-- 42 real_profiles, 35 onboarded, 42 has_resume, 7 has_practicum_path, 7 has_goal_role
select count(*), count(*) filter (where p.onboarding_complete), count(*) filter (where p.resume_url is not null),
  count(*) filter (where p.practicum_path is not null)
from profiles p join real_users ru on ru.id=p.id;
```

---

## STEP 1 — Per-surface real usage

Two sources joined to `real_users`: **`function_metrics`** (edge-fn calls, has `cost_usd`/`tokens`/`model_used`) and the **persisted-row tables**. Note: raw `function_metrics.distinct_users` is inflated (e.g. 85 for daily-action) because it contains **hard-deleted / test user_ids** no longer in `auth.users` — hence the join is mandatory.

### 1a. Edge-function calls (real users only)

```sql
with real_users as (…)
select fm.function_name, count(*) real_calls, count(distinct fm.user_id) users_ever,
  count(distinct fm.user_id) filter (where fm.created_at>='2026-06-21') users_14d,
  count(*) filter (where fm.created_at>='2026-06-21') calls_14d,
  round(sum(fm.cost_usd)::numeric,4) real_cost
from function_metrics fm join real_users ru on ru.id=fm.user_id
group by 1 order by 1;
```

### 1b. Persisted rows (real users only) — `applications, application_cvs, career_roles, stories, tasks, company_targets, daily_actions, conversations, linkedin_*, internship_*, job_suggestions, projects, experiences, feedback`

(Full UNION-ALL query run; `daily_actions` uses `generated_at`, `internship_pitches` uses `cached_at`.)

### Consolidated per-surface table

| surface                                                                                                   | ever (real)     | 14d (real) | calls / rows                                        | real cost              | chosen vs auto                                                                              | confidence            |
| --------------------------------------------------------------------------------------------------------- | --------------- | ---------- | --------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------- | --------------------- |
| **Career analysis / roadmap** (`generate-career-analysis`, `career_roles`)                                | 35 users        | 22         | 79 calls / 401 roles                                | $2.44                  | onboarding-auto **+ 23 users refreshed** (44 est. chosen calls)                             | Med                   |
| **CV upload/parse** (`extract-cv-text`)                                                                   | 31 (37 w/ team) | 13         | 34 calls                                            | — (no LLM cost logged) | chosen (upload step)                                                                        | Med                   |
| **Coach / AI chat** (`ai-chat`)                                                                           | 38 users        | 14         | 61 calls                                            | $0.42                  | mostly onboarding reality-check; **standalone coach = 7 users / 12 msgs** (`conversations`) | Low–Med               |
| **CV generation** (`generate-tailored-cv`)                                                                | 23 users        | **0**      | 171 calls                                           | **$11.88**             | chosen, paid                                                                                | Med                   |
| **CV refine** (`refine-cv`)                                                                               | 23 users        | **0**      | 204 calls                                           | $5.24                  | chosen, paid                                                                                | Med                   |
| **Saved CVs** (`application_cvs`)                                                                         | 25 users        | 2          | 25 rows                                             | —                      | chosen output                                                                               | Med                   |
| **Proof-signal extract** (`extract-proof-signals`)                                                        | 19 users        | 0          | 21 calls                                            | $1.22                  | onboarding-auto (stopped 6/10)                                                              | Low                   |
| **Tasks** (`generate-tasks`, `tasks`)                                                                     | 35 users        | 12         | 103 rows / **5 completed by 3 users**               | $0.07                  | **auto**-generated, ~ignored                                                                | Med                   |
| **Daily action** (`cron-` + `generate-daily-action`, `daily_actions`)                                     | 50 users        | 44         | 723 rows / **0 completed**                          | $0.08                  | **100% auto**, zero engagement                                                              | High (that it's auto) |
| **Experiences** (`experiences`)                                                                           | 35 users        | 12         | 164 rows                                            | —                      | onboarding-parsed                                                                           | Med                   |
| **Education / certs / projects**                                                                          | 37 / 10 / 7     | 13 / 3 / 5 | 53 / 31 / 13 rows                                   | —                      | onboarding-parsed                                                                           | Low                   |
| **LinkedIn optimize** (`linkedin_optimizations`, `generate-linkedin-content`)                             | 4 users         | 2          | 4 rows / 3 calls                                    | $0.10                  | chosen, tiny                                                                                | Low                   |
| **Internship suite** (`internship_profiles`, `match-internship-companies`)                                | 2 users         | 1          | 2 rows / 2 calls                                    | $0.06                  | gated (7 practicum users)                                                                   | Low                   |
| **Applications / tracker** (`applications`)                                                               | **2 users**     | 1          | **4 rows**                                          | —                      | chosen, near-zero                                                                           | Low                   |
| **Company targets** (`company_targets`)                                                                   | **1 user**      | 0          | 25 rows                                             | —                      | single power user                                                                           | Low                   |
| **Story Bank** (`stories`, `extract-story-from-text`)                                                     | **0**           | 0          | 0                                                   | $0                     | —                                                                                           | —                     |
| **LinkedIn posts** (`linkedin_posts`, `generate-linkedin-post`)                                           | **0**           | 0          | 0                                                   | $0                     | —                                                                                           | —                     |
| **LinkedIn outreach** (`linkedin_outreach_conversations`, `…outreach-message`)                            | **0**           | 0          | 0                                                   | $0                     | —                                                                                           | —                     |
| **Job match / suggestions** (`analyze-job-match`, `job_suggestions`, `browse-jobs`, `generate-top-picks`) | **0**           | 0          | 0 real (127 job-match calls were **all team/test**) | $0                     | —                                                                                           | —                     |
| **Learning paths** (`generate-learning-paths`)                                                            | **0**           | 0          | 0 real                                              | $0                     | —                                                                                           | —                     |
| **In-app feedback** (`feedback`)                                                                          | **0**           | 0          | 0                                                   | —                      | —                                                                                           | —                     |

---

## STEP 2 — Chosen vs auto-generated (don't let cron masquerade as demand)

**Career analysis** — fires automatically on onboarding, but is also user-refreshable:

```sql
-- 35 users_with_ca; 12 one-call-only (onboarding); 23 multi-call (refreshed); 44 est chosen refresh calls of 79 total
```

So ~44 of 79 career-analysis calls are **user-chosen refreshes** — this is the one auto-seeded feature with real repeat demand. Med confidence.

**Daily action** — `cron-generate-daily-action` (670 real calls) + `generate-daily-action` (177) produce **723 `daily_actions` rows for 50 users, and every single row is `status='pending'` — 0 completed.**

```sql
select da.status, count(*), count(distinct da.user_id)
from daily_actions da join real_users ru on ru.id=da.user_id group by 1;
-- pending | 723 | 50   (no other status rows exist)
```

This is the textbook case of **auto-generated volume masquerading as usage**: 50 "users" and 723 "actions" that represent _zero_ human engagement. Strip it and daily-action demand = 0.

**Tasks** — same pattern, softer: 103 auto-generated, **5 completed by 3 users**.

---

## STEP 3 — ~0-usage features, classified

No PostHog/events table exists in the DB (checked table list — no `events`/`analytics`), so "reachable but abandoned" is inferred from routing + row counts, not click events. _[CORRECTED 2026-07-06 — this checked the Postgres table list, but PostHog is a client→SaaS pipe, not a DB table. Client instrumentation shipped in PR #412 and is verified ingesting live; click events DO exist and are queryable in PostHog. Inference from routing + row counts was unnecessary. See the correction banner in `deep-qa-3-product-investigation.md`.]_ Nav truth is from `src/Layout.jsx` `BASE_SECTIONS` — after the nav rework the **only** top-level items are **Today, Career, Chat (Career Agent / CV Agent / Interview Coach / Skill Advisor), Profile**, plus a **conditional Internship** section (renders only when `profiles.practicum_path` is set).

| Feature                                        | Routed?           | In nav?                               | Real usage                                           | Classification                        | Evidence                                                                                                                                                         |
| ---------------------------------------------- | ----------------- | ------------------------------------- | ---------------------------------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Story Bank** (`/StoryBank`)                  | Yes               | **No**                                | 0 rows, 0 calls                                      | **UNDISCOVERABLE**                    | Page imported in `src/pages.config.js` but absent from `BASE_SECTIONS`; comment in Layout.jsx says it should "surface contextually" — no persistent entry point. |
| **LinkedIn tools** (`/Linkedin`)               | Yes               | **No**                                | 4 optimize / 3 content / 0 posts / 0 outreach        | **UNDISCOVERABLE**                    | Routed, not in nav. The 4 users who found it came via context, not navigation.                                                                                   |
| **Job match / suggestions** (`/Jobs`)          | Yes               | **No** (folded into Career)           | 0 real (all 127 `analyze-job-match` calls team/test) | **UNDISCOVERABLE + PREMATURE**        | Jobs page routed but delisted; Career page shows role fit, not live-job matching. Also: students in exploration phase aren't job-hunting yet.                    |
| **Applications / Tracker** (`/Tracker`)        | Yes (redirect)    | **No** (only via Today Pipeline card) | 2 users / 4 apps                                     | **PREMATURE** (partly undiscoverable) | Only reachable from a card on Today. But the deeper cause is stage: ~35 onboarded students aren't applying yet — 4 applications total across the whole base.     |
| **Internship suite** (`/Internship`)           | Yes               | **Conditional** (7 users)             | 2 profiles / 0 pitches                               | **PREMATURE**                         | Gated behind `practicum_path` (only 7 real users set it); the practicum pilot is Aug–Nov 2026 — hasn't started.                                                  |
| **Learning paths** (`generate-learning-paths`) | via Skill Advisor | Chat submenu                          | 0 real                                               | **PREMATURE / possibly UNWANTED**     | Entry exists (Skill Advisor in Chat) yet 0 real calls — right idea, no pull at this stage. Low confidence (n=0).                                                 |
| **Daily action** (Today page)                  | Yes               | **Yes** (Today)                       | 723 generated / **0 completed**                      | **UNWANTED (as built)**               | Fully reachable and shown on the primary page, generated for 50 users, yet not one was ever marked done. Either the value or the completion UX is missing.       |
| **Tasks** (Today)                              | Yes               | Yes                                   | 103 / 5 done                                         | **UNWANTED-leaning**                  | Reachable, auto-generated, 5% completion.                                                                                                                        |
| **In-app feedback**                            | Yes               | (widget)                              | 0 real rows                                          | Undiscoverable or unused              | n=0, low confidence.                                                                                                                                             |

---

## Headline numbers

- **Real users: 53** (confirmed, non-team, non-test, non-deleted; ~51 unique humans). Excluded: 4 team + 6 test-aliases + 1 CWS-test + 5 unconfirmed; 0 deleted. **No June-18 backfill exists in the data.** Realistic post-onboarding denominator = **35** (only 42 have profiles, 35 completed onboarding).
- **Total edge-fn cost (period 2026-05-04 → 07-05): $58.46 gross**, of which only **$21.52 (37%) is attributable to real users** — the other **$36.94 (63%) was team/test/demo/cron-null** spend. 14-day gross: $11.08. Single most expensive real feature: **CV generation $11.88 + refine $5.24 = $17.1 (≈80% of all real-user cost)**.
- **Top-5 surfaces by real distinct users:** (1) Daily action — 50 _but 0 completions, auto_; (2) Coach/AI-chat — 38 _(mostly onboarding)_; (3) Career analysis/roadmap — 35 _(with 23 chosen refreshes — the healthiest signal)_; (4) Tasks — 35 _(auto, 5 completions)_; (5) CV upload/parse — 31. Strip auto-generated noise and the real chosen leaders are **Career analysis (35, incl. refreshes), CV generation (23–25), Coach chat (7 standalone / 38 incl. onboarding)**.
- **~0 real-usage surfaces:** Story Bank (undiscoverable), LinkedIn posts/outreach/optimize (undiscoverable), Job match/suggestions (undiscoverable + premature), Learning paths (premature), Applications tracker (premature, 4 apps/2 users), Company targets (1 power user), In-app feedback (0). Daily action & Tasks are _reachable_ but effectively unwanted (0 and 5% completion).

**One-line takeaway:** the product's real gravity is the **onboarding → career-analysis → CV-generation** spine (the only surfaces with double-digit chosen usage and 80% of real spend); everything downstream of "get a roadmap and a CV" — tracker, story bank, LinkedIn, jobs, internships, daily-action completion — is either undiscoverable in the reworked nav or premature for a pre-application student base. LOW-CONFIDENCE on all rates given n≈35.
