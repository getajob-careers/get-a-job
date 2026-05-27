-- Sync repo with production state (2026-05-27 audit).
--
-- The 3-argument overload of replace_career_roles was applied directly to
-- production on 2026-05-26 (recorded as migration version
-- 20260526125648_replace_career_roles_with_hash in pg_migrations) but the
-- corresponding .sql file was never committed to the repo. It pairs with
-- 20260526_function_cache.sql (the function_cache table, which IS in repo)
-- and is what generate-career-analysis uses for atomic change-detection
-- caching (PR #159).
--
-- This file captures the overload verbatim from prod via pg_get_functiondef.
--
-- The new signature adds p_input_hash (text, default null). When provided,
-- the RPC atomically UPSERTs a row into function_cache inside the same
-- transaction as the career_roles delete/insert — so the failure mode is
-- "no cache marker → next call regenerates" rather than "marker says fresh
-- but content is stale." When null, the function behaves identically to
-- the 2-arg overload (legacy path).
--
-- IMPORTANT — this migration is repo-only sync. It is already in
-- pg_migrations on production, so supabase db push WILL NOT re-execute
-- it. CREATE OR REPLACE FUNCTION is idempotent regardless.
--
-- SECURITY NOTE — captured faithfully from prod: this overload currently
-- has PUBLIC + anon EXECUTE in production (proacl shows
-- `=X/postgres, anon=X/postgres, authenticated=X/postgres, service_role=X/postgres`).
-- The 2-arg overload was hardened in 2026-05-13 (REVOKE FROM PUBLIC, anon)
-- but the 3-arg overload was not. The function body still gates on
-- `auth.uid() = p_user_id` so anon calls fail at the auth check — but
-- defense-in-depth would REVOKE here too. Left as-is in this sync
-- migration; flagged for a follow-up hardening PR.

CREATE OR REPLACE FUNCTION public.replace_career_roles(
  p_user_id     uuid,
  p_roles       jsonb,
  p_input_hash  text DEFAULT NULL::text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'forbidden: caller is not the target user'
      using errcode = 'insufficient_privilege';
  end if;

  delete from career_roles where user_id = p_user_id;

  if jsonb_array_length(p_roles) > 0 then
    insert into career_roles (
      user_id, title, track, match_score, readiness_score, goal_alignment_score,
      matched_skills, missing_skills, skills_gap,
      alignment_to_goal, alignment_reason, reasoning, action_items
    )
    select
      p_user_id,
      (r->>'title')::text,
      (r->>'track')::text,
      (r->>'match_score')::numeric,
      (r->>'readiness_score')::numeric,
      nullif(r->>'goal_alignment_score','')::numeric,
      array(select jsonb_array_elements_text(coalesce(r->'matched_skills', '[]'::jsonb))),
      array(select jsonb_array_elements_text(coalesce(r->'missing_skills', '[]'::jsonb))),
      array(select jsonb_array_elements_text(coalesce(r->'skills_gap',     '[]'::jsonb))),
      coalesce(r->>'alignment_to_goal', ''),
      coalesce(r->>'alignment_reason', ''),
      coalesce(r->>'reasoning', ''),
      array(select jsonb_array_elements_text(coalesce(r->'action_items', '[]'::jsonb)))
    from jsonb_array_elements(p_roles) as r;
  end if;

  -- Atomic cache marker. Written inside the same transaction as the
  -- career_roles delete/insert above so the failure mode is "no cache
  -- marker → next call regenerates" rather than "marker says fresh but
  -- content is stale." If p_input_hash is null, skip — caller is on the
  -- legacy path without caching.
  if p_input_hash is not null then
    insert into function_cache (user_id, function_name, input_hash, cached_at)
    values (p_user_id, 'generate-career-analysis', p_input_hash, now())
    on conflict (user_id, function_name)
    do update set input_hash = excluded.input_hash, cached_at = excluded.cached_at;
  end if;
end;
$function$;
