-- search_new_jobs_by_role_titles — a date-filtered clone of
-- search_jobs_by_role_titles (the 6-arg work-types overload, the one the client
-- calls). Returns the SAME role-title-similarity matches, restricted to jobs
-- FIRST SEEN on/after p_since (jobs.first_seen_at, 100% populated). For the
-- redesign home page's "new matching jobs since <your last visit>" widget.
--
-- The ONLY logic difference vs search_jobs_by_role_titles is the added
-- `p_since` filter on first_seen_at; every other predicate/rank clause is
-- byte-for-byte the same. Invariant (verified live): the ELIGIBLE match set is
-- a strict subset of the base RPC's (364 of 562 rows, 0 outside). Note this is a
-- subset of the eligible set, NOT of the base feed's top-N window: dropping older
-- jobs promotes lower-ranked matches into the LIMIT window, so a p_since result
-- can outrank the base top-N cutoff. p_since = NULL reproduces the base RPC exactly.
-- Ordering is kept identical (relevance) for faithful parity; if the home widget
-- wants newest-first, add `first_seen_at DESC` as the lead sort in a follow-up.
-- Applied via MCP apply_migration (db push is dead in this repo, lesson 2026-06-15).

create or replace function public.search_new_jobs_by_role_titles(
  p_role_titles text[],
  p_since timestamptz,
  p_limit integer default 20,
  p_offset integer default 0,
  p_similarity_threshold real default 0.3,
  p_max_seniority text[] default null,
  p_work_types text[] default null
)
returns setof jobs
language sql
stable
set search_path to 'public', 'extensions'
as $function$
  with pairs as (
    select
      j.id,
      r.role as matched_role,
      extensions.similarity(j.title, r.role) as sim,
      row_number() over (
        partition by j.id
        order by extensions.similarity(j.title, r.role) desc, r.role asc
      ) as rn_per_job
    from public.jobs j
    cross join unnest(p_role_titles) as r(role)
    where j.is_il = true
      and j.is_active = true
      and (p_since is null or j.first_seen_at >= p_since)  -- the date filter (only addition)
      and (p_max_seniority is null or j.seniority = any(p_max_seniority))
      and extensions.similarity(j.title, r.role) >= p_similarity_threshold
      and (
        p_work_types is null
        or cardinality(p_work_types) = 0
        or j.is_remote is null
        or 'Hybrid'   = any(p_work_types)
        or 'Flexible' = any(p_work_types)
        or 'Remote'   = any(p_work_types)
        or j.is_remote = false
      )
  ),
  best_role_per_job as (
    select id, matched_role, sim from pairs where rn_per_job = 1
  ),
  ranked as (
    select
      b.id,
      b.matched_role,
      b.sim,
      row_number() over (
        partition by b.matched_role
        order by b.sim desc, j.date_posted desc nulls last, b.id asc
      ) as rn_per_role
    from best_role_per_job b
    join public.jobs j on j.id = b.id
  )
  select j.*
  from ranked r
  join public.jobs j on j.id = r.id
  order by r.rn_per_role asc, r.sim desc, j.date_posted desc nulls last, j.id asc
  limit p_limit
  offset p_offset;
$function$;
