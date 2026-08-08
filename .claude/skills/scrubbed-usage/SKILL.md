---
name: scrubbed-usage
description: Start any getajob analytics or usage query from the correct real-user scrub. Use whenever counting users, engagement, retention, or edge-fn cost.
---

# scrubbed-usage

Never report raw getajob numbers; raw gross overstates reality (historically $58 gross edge-fn cost vs $21 real-user). Every analytics query starts from `real_users`.

```sql
with real_users as (
  select u.id, u.email, u.created_at
  from public.users_scrub_view u
  where u.email_confirmed_at is not null                                   -- confirmed signups only
    and u.deleted_at is null                                               -- no deleted ghosts
    and u.email !~* '(elienglard|isaacselig|yishailieser|@getajob|@vectisbuild|\+demo|\+test|\+v2test|\+audit|\+cwsreview|eli\+|isaac@)'
    and u.id <> '90bcf097-77f2-437f-9210-42755ba4d143'                     -- Noms (gymnastgirl323); no email pattern to match
  -- OPTIONAL (cleared for signups, NOT yet confirmed dead for metrics rows):
  -- and date(u.created_at) <> date '2026-06-18'                          -- June-18 backfill; enable only if a metrics backfill is confirmed
)
select count(*) from real_users;
```

Run the scrub to get the live count; do not hard-code it (a count in a skill goes stale as users sign up). Any number here is point-in-time: as of 2026-07-05 it returned ~53 real users. The naive email-only regex overcounts (it misses the bare Isaac/Yishai accounts and Noms), so the `isaacselig`/`yishailieser` terms and the Noms UUID in the CTE are required, not optional.

**Widened 2026-08-04** — added `@vectisbuild` (`isaac@vectisbuild.co`, matched nothing before), `\+v2test`, and two broader catch-alls (`eli\+`, `isaac@`). The old `\+test` term does NOT match `+v2test` — the escape requires `+` immediately before the literal word it's paired with, so `eli+v2test@gmail.com` slipped through undetected until found by hand. The same hole exists for any future `+qatest`, `+devtest`, or other alias nobody has enumerated yet — each one requires discovering the gap after the fact, not before. Verified directly against Postgres `!~*` (not just an equivalent regex engine) on 2026-08-04: `yishailieser+demo@gmail.com`, `eli+v2test@gmail.com`, and `isaac@vectisbuild.co` all correctly excluded; `eliyahu.sigel@gmail.com`, `danielibloom@gmail.com`, `lipworthbelinda@gmail.com`, and `rachelimiller24@gmail.com` (real users whose local parts contain "eli" as a substring) all correctly kept. Both known holes had zero prior activity, so no historical numbers were corrupted by them.

**This is a denylist, and denylists fail silently.** Every fix above closes one gap by discovering it after the fact — there is no way to prove the list is complete, only to keep finding holes one at a time. The real fix is a boolean, not a regex: an `is_internal` column on `profiles`, defaulted `false`, set `true` explicitly for known team/test accounts. That's a positive assertion per row instead of an ever-growing exclusion pattern — worth proposing to Eli as a small migration.

Discipline:

- Join every per-surface count against `real_users` (distinct users ever + last 14 days).
- Separate CHOSEN engagement from AUTO throughput: career-analysis (onboarding + cron refresh) and daily-action crons are not demand.
- ~35-53 real users, so most per-feature n is tiny. Mark small-n findings LOW-CONFIDENCE; do not dress them up.
- Cost from `function_metrics`, real-user-attributable, not gross.
