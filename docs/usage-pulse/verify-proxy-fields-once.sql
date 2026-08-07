-- ONE-TIME VERIFICATION — run once, alongside the first /user-pulse,
-- before trusting the narrowed onboarding-completion FALSIFY
-- (docs/usage-pulse/TEMPLATE.sql) as a long-term assertion.
--
-- Question: do resume_url and primary_domain exist reliably for V1
-- users, or do they have their own undiscovered V1-specific gap — the
-- same shape of assumption that turned out wrong for
-- five_year_goal_role_id? Arithmetic consistency (43 = 28+10+5,
-- entirely attributed to one field) is consistent with the other two
-- fields being clean; it does not establish it. This query checks
-- directly.
--
-- "V1 user" is operationalized as "flagged onboarding_complete = true
-- but missing five_year_goal_role_id" — the field independently
-- established as V2-only — rather than signup-date cohort. The
-- resolved discrepancy (28 pre-launch + 10 launch + 5 post-launch)
-- shows V1 users exist inside the launch and post-launch date-cohorts
-- too, not just pre-launch, so cohort alone would misclassify some
-- users.
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
flagged_complete as (
  select
    c.cohort,
    (p.five_year_goal_role_id is not null) as has_goal_role,
    (p.resume_url is not null) as has_resume,
    (p.primary_domain is not null) as has_domain
  from cohorted c
  join profiles p on p.id = c.id
  where p.onboarding_complete
)
select
  cohort,
  has_goal_role,
  count(*) as total,
  count(*) filter (where has_resume) as has_resume_ct,
  count(*) filter (where has_domain) as has_domain_ct,
  round(100.0 * count(*) filter (where has_resume) / count(*), 1) as pct_resume,
  round(100.0 * count(*) filter (where has_domain) / count(*), 1) as pct_domain
from flagged_complete
group by cohort, has_goal_role
order by cohort, has_goal_role;

-- READING THE RESULT: rows where has_goal_role = false are the
-- operational V1 population. If any of those rows show pct_resume or
-- pct_domain below 100%, the narrowed FALSIFY in TEMPLATE.sql is still
-- wrong in the same way the original one was, and needs a further fix
-- before it becomes a recurring canary.
