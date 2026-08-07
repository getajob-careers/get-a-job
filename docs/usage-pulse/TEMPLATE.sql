-- ============================================================
-- /user-pulse TEMPLATE
-- Last promoted: 2026-08-06
-- Cohort boundaries cached here — the canonical copy per the contract
-- in docs/usage-pulse/user-pulse-spec.md. VERIFY against any newer
-- /usage session's findings before trusting them if this file is more
-- than a few weeks old:
--   pre-launch:  created_at::date <= '2026-07-19'
--   launch:      created_at::date between '2026-07-22' and '2026-07-31'
--   post-launch: created_at::date >= '2026-08-01'  -- open-ended; see
--     the pct_post_launch assertion in the population block below —
--     if it crosses ~50%, this scheme needs a new boundary, decided by
--     a human, not inferred by this template.
-- Scrub regex cached here as of 2026-08-06, from
-- .claude/skills/scrubbed-usage/SKILL.md. RE-READ THAT FILE FIRST. If
-- it has changed, update the real_users CTE in every block below
-- before running anything — do not trust this comment over the live
-- file.
-- ============================================================

-- BLOCK: population
-- Source: usage-refresh-a1.sql (unchanged), plus one new assertion
-- column (pct_post_launch) per the assertion-over-timer pass.
-- ASSERTIONS in this block:
--   gap_days_uncategorized EXPECTED 0 — any nonzero value means a
--     signup date is falling through the cohort scheme entirely.
--   pct_post_launch EXPECTED to stay well under 50% — crossing that
--     means post-launch has become the majority bucket, not a
--     distinguishable "recent" one, and the cohort scheme needs a new
--     boundary.
with real_users as (
  select u.id, u.email, u.created_at
  from public.users_scrub_view u
  where u.email_confirmed_at is not null
    and u.deleted_at is null
    and u.email !~* '(elienglard|isaacselig|yishailieser|@getajob|@vectisbuild|\+demo|\+test|\+v2test|\+audit|\+cwsreview|eli\+|isaac@)'
    and u.id <> '90bcf097-77f2-437f-9210-42755ba4d143'
)
select
  count(*) as total_scrubbed_users,
  count(*) filter (where created_at::date <= '2026-07-19') as pre_launch,
  count(*) filter (where created_at::date between '2026-07-22' and '2026-07-31') as launch,
  count(*) filter (where created_at::date >= '2026-08-01') as post_launch,
  count(*) filter (where created_at::date between '2026-07-20' and '2026-07-21') as gap_days_uncategorized,
  round(100.0 * count(*) filter (where created_at::date >= '2026-08-01') / count(*), 1) as pct_post_launch,
  min(created_at) as earliest_signup,
  max(created_at) as latest_signup
from real_users;

-- BLOCK: population (FALSIFY)
-- Source: usage-refresh-a1.sql (unchanged), plus one new assertion
-- column (sum_of_exclusions) per the assertion-over-timer pass.
-- ASSERTION: raw_total - sum_of_exclusions should equal
-- total_scrubbed_users from the population CONFIRM block above. If it
-- doesn't, at least one row is being excluded by more than one reason
-- (bucket overlap) — the exact bug class found this session (the
-- 29-vs-28 mismatch, eventually traced by pulling every row since
-- 2026-08-05 individually). Check this arithmetic every run rather
-- than only when a number looks wrong.
select
  count(*) as raw_total,
  count(*) filter (where email_confirmed_at is null) as excluded_unconfirmed,
  count(*) filter (where deleted_at is not null) as excluded_deleted,
  count(*) filter (
    where email_confirmed_at is not null
      and deleted_at is null
      and email ~* '(elienglard|isaacselig|yishailieser|@getajob|@vectisbuild|\+demo|\+test|\+v2test|\+audit|\+cwsreview|eli\+|isaac@)'
  ) as excluded_denylist,
  count(*) filter (where id = '90bcf097-77f2-437f-9210-42755ba4d143') as excluded_noms,
  (
    count(*) filter (where email_confirmed_at is null)
    + count(*) filter (where deleted_at is not null)
    + count(*) filter (
        where email_confirmed_at is not null
          and deleted_at is null
          and email ~* '(elienglard|isaacselig|yishailieser|@getajob|@vectisbuild|\+demo|\+test|\+v2test|\+audit|\+cwsreview|eli\+|isaac@)'
      )
    + count(*) filter (where id = '90bcf097-77f2-437f-9210-42755ba4d143')
  ) as sum_of_exclusions
from public.users_scrub_view;

-- BLOCK: signups-by-date
-- Source: usage-refresh-b1.sql's daily-totals query, PARAMETERIZED —
-- b1 used 5 hardcoded literal dates for a one-off LinkedIn-post
-- investigation; this swaps that for a rolling 14-day window
-- (mechanical parameterization, not new logic) and adds
-- generate_series so a zero-signup day shows as 0 rather than being
-- silently absent from the output. No assertion/timer here — the
-- window is a fixed design choice, not a claim with a truth value.
with real_users as (
  select u.id, u.email, u.created_at
  from public.users_scrub_view u
  where u.email_confirmed_at is not null
    and u.deleted_at is null
    and u.email !~* '(elienglard|isaacselig|yishailieser|@getajob|@vectisbuild|\+demo|\+test|\+v2test|\+audit|\+cwsreview|eli\+|isaac@)'
    and u.id <> '90bcf097-77f2-437f-9210-42755ba4d143'
),
days as (
  select generate_series(current_date - 13, current_date, interval '1 day')::date as d
)
select
  days.d as signup_date,
  count(r.id) as scrubbed_signups
from days
left join real_users r on r.created_at::date = days.d
group by days.d
order by days.d;

-- BLOCK: signups-by-date (FALSIFY)
-- Source: usage-refresh-b1.sql (same rolling-window parameterization
-- applied identically) — isolates the scrub filter as the one variable.
with days as (
  select generate_series(current_date - 13, current_date, interval '1 day')::date as d
)
select
  days.d as signup_date,
  count(u.id) as raw_signups
from days
left join public.users_scrub_view u on u.created_at::date = days.d
group by days.d
order by days.d;

-- BLOCK: activation (equal 7-day window, matured cohorts only)
-- Source: block2-confirm.sql, COLUMN NAMES RENAMED (distinct-naming
-- rule — alias change only, not new logic).
-- TIMER, not assertion: the deliberate-activity definition below
-- (application_cvs is_master=false / applications / conversations /
-- tasks where updated_at > created_at) was validated 2026-08-06 via
-- code trace (prewarmMasterCv.js, ChatInterface.jsx, onboardingPersist.js,
-- Tasks.jsx) and the tasks-touch sub-second-gap check. No query can
-- detect a FUTURE automatic-write path appearing on one of these
-- tables — that needs re-validation against the code, not
-- re-computation. Re-check if any product change touches these write
-- paths, or after ~60 days regardless.
with real_users as (
  select u.id, u.email, u.created_at
  from public.users_scrub_view u
  where u.email_confirmed_at is not null
    and u.deleted_at is null
    and u.email !~* '(elienglard|isaacselig|yishailieser|@getajob|@vectisbuild|\+demo|\+test|\+v2test|\+audit|\+cwsreview|eli\+|isaac@)'
    and u.id <> '90bcf097-77f2-437f-9210-42755ba4d143'
    and current_date >= (u.created_at::date + 7)
),
activity as (
  select user_id, created_at::date as d from application_cvs where is_master = false
  union all select user_id, created_at::date from applications
  union all select user_id, created_at::date from conversations
  union all select user_id, updated_at::date from tasks where updated_at > created_at
),
windowed_activity as (
  select a.user_id, a.d
  from activity a
  join real_users r on r.id = a.user_id
  where a.d >= r.created_at::date
    and a.d < r.created_at::date + 7
),
per_user as (
  select r.id,
         case
           when r.created_at::date <= '2026-07-19' then 'pre-launch'
           when r.created_at::date between '2026-07-22' and '2026-07-31' then 'launch'
           when r.created_at::date >= '2026-08-01' then 'post-launch'
           else 'other'
         end as cohort,
         coalesce(count(distinct wa.d), 0) as active_days
  from real_users r
  left join windowed_activity wa on wa.user_id = r.id
  group by r.id, r.created_at
)
select
  cohort,
  count(*) as total_users_confirm,
  count(*) filter (where active_days = 0) as never_active_confirm,
  count(*) filter (where active_days = 1) as active_one_day_confirm,
  count(*) filter (where active_days >= 2) as returned_confirm,
  round(100.0 * count(*) filter (where active_days = 0) / count(*), 1) as pct_never_active_confirm,
  round(100.0 * count(*) filter (where active_days = 1) / count(*), 1) as pct_exactly_one_day_confirm,
  round(100.0 * count(*) filter (where active_days >= 2) / count(*), 1) as pct_returned_confirm
from per_user
group by cohort
order by case cohort when 'pre-launch' then 1 when 'launch' then 2 when 'post-launch' then 3 else 4 end;

-- BLOCK: activation (FALSIFY — broad definition, same window)
-- Source: block2-falsify.sql, COLUMN NAMES RENAMED (_falsify suffix).
-- Isolates the activity-definition as the one variable vs. CONFIRM.
with real_users as (
  select u.id, u.email, u.created_at
  from public.users_scrub_view u
  where u.email_confirmed_at is not null
    and u.deleted_at is null
    and u.email !~* '(elienglard|isaacselig|yishailieser|@getajob|@vectisbuild|\+demo|\+test|\+v2test|\+audit|\+cwsreview|eli\+|isaac@)'
    and u.id <> '90bcf097-77f2-437f-9210-42755ba4d143'
    and current_date >= (u.created_at::date + 7)
),
activity as (
  select user_id, created_at::date as d from application_cvs
  union all select user_id, created_at::date from applications
  union all select user_id, created_at::date from tasks
  union all select user_id, created_at::date from conversations
),
windowed_activity as (
  select a.user_id, a.d
  from activity a
  join real_users r on r.id = a.user_id
  where a.d >= r.created_at::date
    and a.d < r.created_at::date + 7
),
per_user as (
  select r.id,
         case
           when r.created_at::date <= '2026-07-19' then 'pre-launch'
           when r.created_at::date between '2026-07-22' and '2026-07-31' then 'launch'
           when r.created_at::date >= '2026-08-01' then 'post-launch'
           else 'other'
         end as cohort,
         coalesce(count(distinct wa.d), 0) as active_days
  from real_users r
  left join windowed_activity wa on wa.user_id = r.id
  group by r.id, r.created_at
)
select
  cohort,
  count(*) as total_users_falsify,
  count(*) filter (where active_days = 0) as never_active_falsify,
  count(*) filter (where active_days = 1) as active_one_day_falsify,
  count(*) filter (where active_days >= 2) as returned_falsify,
  round(100.0 * count(*) filter (where active_days = 0) / count(*), 1) as pct_never_active_falsify,
  round(100.0 * count(*) filter (where active_days = 1) / count(*), 1) as pct_exactly_one_day_falsify,
  round(100.0 * count(*) filter (where active_days >= 2) / count(*), 1) as pct_returned_falsify
from per_user
group by cohort
order by case cohort when 'pre-launch' then 1 when 'launch' then 2 when 'post-launch' then 3 else 4 end;

-- BLOCK: maturity-gate
-- Source: usage-refresh-a2.sql's maturity-check query, REWRITTEN
-- (Fix 2) to a rolling window. The original was hardcoded to the
-- launch cohort's date range — every launch signup matures within
-- days of the fix landing, so the block ages into permanent all-true
-- noise, and it never covered post-launch, the cohort actually
-- excluded from the activation block above. This version shows the
-- last 14 days of signups regardless of which named cohort they fall
-- into, so it stays informative and naturally follows whichever
-- cohort is currently near the maturity boundary.
select
  u.created_at::date as signup_date,
  count(*) as users,
  (current_date >= (u.created_at::date + 7)) as matured
from public.users_scrub_view u
where u.email_confirmed_at is not null
  and u.deleted_at is null
  and u.email !~* '(elienglard|isaacselig|yishailieser|@getajob|@vectisbuild|\+demo|\+test|\+v2test|\+audit|\+cwsreview|eli\+|isaac@)'
  and u.id <> '90bcf097-77f2-437f-9210-42755ba4d143'
  and u.created_at::date >= current_date - 13
group by signup_date, matured
order by signup_date;

-- BLOCK: onboarding-completion-by-cohort
-- Source: usage-refresh-c1.sql (unchanged)
with real_users as (
  select u.id, u.email, u.created_at
  from public.users_scrub_view u
  where u.email_confirmed_at is not null
    and u.deleted_at is null
    and u.email !~* '(elienglard|isaacselig|yishailieser|@getajob|@vectisbuild|\+demo|\+test|\+v2test|\+audit|\+cwsreview|eli\+|isaac@)'
    and u.id <> '90bcf097-77f2-437f-9210-42755ba4d143'
),
cohorted as (
  select r.id,
    case
      when r.created_at::date <= '2026-07-19' then 'pre-launch'
      when r.created_at::date between '2026-07-22' and '2026-07-31' then 'launch'
      when r.created_at::date >= '2026-08-01' then 'post-launch'
      else 'other'
    end as cohort
  from real_users r
)
select
  c.cohort,
  count(*) as total_users,
  count(*) filter (where p.onboarding_complete) as completed,
  round(100.0 * count(*) filter (where p.onboarding_complete) / count(*), 1) as pct_completed
from cohorted c
join profiles p on p.id = c.id
group by c.cohort
order by case c.cohort when 'pre-launch' then 1 when 'launch' then 2 when 'post-launch' then 3 else 4 end;

-- BLOCK: onboarding-completion-by-cohort (FALSIFY — reliability canary)
-- Source: usage-refresh-c1.sql's FALSIFY, NARROWED (Fix 1): dropped
-- five_year_goal_role_id from the proxy — verified V2-only, absent by
-- design for V1 users (see getajob-schema.md §5) — this was never a
-- completion-flag defect. profiles.onboarding_complete was validated
-- as sound 2026-08-06.
-- ASSERTION, not open question: with only resume_url + primary_domain,
-- flag_true_proxy_false and flag_false_proxy_true are EXPECTED TO BE
-- ZERO every run. A nonzero result here is a new signal, not routine
-- commentary — this is what would catch onboarding_complete breaking
-- again (getajob-schema.md §5 already documents one prior instance of
-- profiles disagreeing with real progress for a different reason).
-- PENDING: docs/usage-pulse/verify-proxy-fields-once.sql should be run
-- once, alongside the first /user-pulse, to confirm resume_url and
-- primary_domain don't have their own undiscovered V1-specific gap —
-- the arithmetic that identified five_year_goal_role_id as the sole
-- cause is consistent with the other two fields being clean, but
-- consistent-with is not the same as verified.
with real_users as (
  select u.id, u.email, u.created_at
  from public.users_scrub_view u
  where u.email_confirmed_at is not null
    and u.deleted_at is null
    and u.email !~* '(elienglard|isaacselig|yishailieser|@getajob|@vectisbuild|\+demo|\+test|\+v2test|\+audit|\+cwsreview|eli\+|isaac@)'
    and u.id <> '90bcf097-77f2-437f-9210-42755ba4d143'
),
cohorted as (
  select r.id,
    case
      when r.created_at::date <= '2026-07-19' then 'pre-launch'
      when r.created_at::date between '2026-07-22' and '2026-07-31' then 'launch'
      when r.created_at::date >= '2026-08-01' then 'post-launch'
      else 'other'
    end as cohort
  from real_users r
),
joined as (
  select
    c.cohort,
    p.onboarding_complete,
    (p.resume_url is not null and p.primary_domain is not null) as proxy_complete
  from cohorted c
  join profiles p on p.id = c.id
)
select
  cohort,
  count(*) as total_users,
  count(*) filter (where onboarding_complete) as flag_completed,
  count(*) filter (where proxy_complete) as proxy_completed,
  round(100.0 * count(*) filter (where proxy_complete) / count(*), 1) as pct_proxy_completed,
  count(*) filter (where onboarding_complete and not proxy_complete) as flag_true_proxy_false,
  count(*) filter (where not onboarding_complete and proxy_complete) as flag_false_proxy_true
from joined
group by cohort
order by case cohort when 'pre-launch' then 1 when 'launch' then 2 when 'post-launch' then 3 else 4 end;

-- BLOCK: multi-day-users
-- Source: usage-refresh-a3.sql, COLUMN NAMES RENAMED (per distinct-
-- naming rule). Shares the same TIMER-based deliberate-activity-
-- definition assumption as the activation block above — not repeated
-- here, see that block's comment.
with real_users as (
  select u.id, u.email, u.created_at
  from public.users_scrub_view u
  where u.email_confirmed_at is not null
    and u.deleted_at is null
    and u.email !~* '(elienglard|isaacselig|yishailieser|@getajob|@vectisbuild|\+demo|\+test|\+v2test|\+audit|\+cwsreview|eli\+|isaac@)'
    and u.id <> '90bcf097-77f2-437f-9210-42755ba4d143'
),
activity as (
  select user_id, created_at::date as d from application_cvs where is_master = false
  union all select user_id, created_at::date from applications
  union all select user_id, created_at::date from conversations
  union all select user_id, updated_at::date from tasks where updated_at > created_at
),
scrubbed_activity as (
  select a.* from activity a join real_users r on r.id = a.user_id
),
per_user as (
  select r.id, r.email, r.created_at,
         case
           when r.created_at::date <= '2026-07-19' then 'pre-launch'
           when r.created_at::date between '2026-07-22' and '2026-07-31' then 'launch'
           when r.created_at::date >= '2026-08-01' then 'post-launch'
           else 'other'
         end as cohort,
         count(distinct sa.d) as active_days,
         min(sa.d) as first_active_date,
         max(sa.d) as last_active_date
  from real_users r
  join scrubbed_activity sa on sa.user_id = r.id
  group by r.id, r.email, r.created_at
)
select
  cohort as cohort_confirm,
  email as email_confirm,
  signup_date_confirm,
  first_active_date as first_active_date_confirm,
  last_active_date as last_active_date_confirm,
  active_days as active_days_confirm
from (
  select cohort, email, created_at::date as signup_date_confirm,
         first_active_date, last_active_date, active_days
  from per_user
  where active_days >= 2
) x
order by last_active_date_confirm desc;

-- BLOCK: multi-day-users (FALSIFY — broad definition)
-- Source: usage-refresh-a3.sql's FALSIFY, COLUMN NAMES RENAMED.
with real_users as (
  select u.id, u.email, u.created_at
  from public.users_scrub_view u
  where u.email_confirmed_at is not null
    and u.deleted_at is null
    and u.email !~* '(elienglard|isaacselig|yishailieser|@getajob|@vectisbuild|\+demo|\+test|\+v2test|\+audit|\+cwsreview|eli\+|isaac@)'
    and u.id <> '90bcf097-77f2-437f-9210-42755ba4d143'
),
activity as (
  select user_id, created_at::date as d from application_cvs
  union all select user_id, created_at::date from applications
  union all select user_id, created_at::date from tasks
  union all select user_id, created_at::date from conversations
),
scrubbed_activity as (
  select a.* from activity a join real_users r on r.id = a.user_id
),
per_user as (
  select r.id, r.email, r.created_at,
         case
           when r.created_at::date <= '2026-07-19' then 'pre-launch'
           when r.created_at::date between '2026-07-22' and '2026-07-31' then 'launch'
           when r.created_at::date >= '2026-08-01' then 'post-launch'
           else 'other'
         end as cohort,
         count(distinct sa.d) as active_days,
         min(sa.d) as first_active_date,
         max(sa.d) as last_active_date
  from real_users r
  join scrubbed_activity sa on sa.user_id = r.id
  group by r.id, r.email, r.created_at
)
select
  cohort as cohort_falsify,
  email as email_falsify,
  signup_date_falsify,
  first_active_date as first_active_date_falsify,
  last_active_date as last_active_date_falsify,
  active_days as active_days_falsify
from (
  select cohort, email, created_at::date as signup_date_falsify,
         first_active_date, last_active_date, active_days
  from per_user
  where active_days >= 2
) x
order by last_active_date_falsify desc;

-- BLOCK: unconfirmed-email-canary
-- Source: usage-refresh-a1-unconfirmed.sql, WINDOWED (Fix 4) to the
-- same rolling 14 days as signups-by-date — this canary's job is
-- catching a future spike, a recent-window concern; the original's
-- full-history scope was a one-time background-rate investigation
-- (May-July 2026, on record, not needed as a live recurring feature).
with unconfirmed as (
  select created_at::date as signup_date
  from public.users_scrub_view
  where email_confirmed_at is null
    and created_at::date >= current_date - 13
),
daily_unconfirmed as (
  select signup_date, count(*) as unconfirmed_count
  from unconfirmed
  group by signup_date
),
daily_totals as (
  select created_at::date as signup_date, count(*) as total_signups
  from public.users_scrub_view
  where created_at::date >= current_date - 13
  group by signup_date
)
select
  du.signup_date,
  du.unconfirmed_count,
  dt.total_signups,
  round(100.0 * du.unconfirmed_count / dt.total_signups, 1) as pct_unconfirmed_that_day
from daily_unconfirmed du
join daily_totals dt on dt.signup_date = du.signup_date
order by du.signup_date;
