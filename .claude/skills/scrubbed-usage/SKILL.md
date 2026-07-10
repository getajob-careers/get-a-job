---
name: scrubbed-usage
description: Start any getajob analytics or usage query from the correct real-user scrub. Use whenever counting users, engagement, retention, or edge-fn cost.
---

# scrubbed-usage

Never report raw getajob numbers; raw gross overstates reality (historically $58 gross edge-fn cost vs $21 real-user). Every analytics query starts from `real_users`.

```sql
with real_users as (
  select u.id, u.email, u.created_at
  from auth.users u
  where u.email_confirmed_at is not null                                   -- confirmed signups only
    and u.deleted_at is null                                               -- no deleted ghosts
    and u.email !~* '(elienglard|isaacselig|yishailieser|@getajob|\+demo|\+test|\+audit|\+cwsreview)'
    and u.id <> '90bcf097-77f2-437f-9210-42755ba4d143'                     -- Noms (gymnastgirl323); no email pattern to match
  -- OPTIONAL (cleared for signups, NOT yet confirmed dead for metrics rows):
  -- and date(u.created_at) <> date '2026-06-18'                          -- June-18 backfill; enable only if a metrics backfill is confirmed
)
select count(*) from real_users;
```

Run the scrub to get the live count; do not hard-code it (a count in a skill goes stale as users sign up). Any number here is point-in-time: as of 2026-07-05 it returned ~53 real users. The naive email-only regex overcounts (it misses the bare Isaac/Yishai accounts and Noms), so the `isaacselig`/`yishailieser` terms and the Noms UUID in the CTE are required, not optional.

Discipline:

- Join every per-surface count against `real_users` (distinct users ever + last 14 days).
- Separate CHOSEN engagement from AUTO throughput: career-analysis (onboarding + cron refresh) and daily-action crons are not demand.
- ~35-53 real users, so most per-feature n is tiny. Mark small-n findings LOW-CONFIDENCE; do not dress them up.
- Cost from `function_metrics`, real-user-attributable, not gross.
