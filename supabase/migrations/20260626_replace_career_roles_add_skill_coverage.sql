-- Additive: thread skill_coverage_ratio (Phase 0 coverage gate) through the
-- replace_career_roles writer. Backward-compatible: payloads without the
-- field resolve to NULL via nullif(). Body otherwise verbatim from prod
-- (3-arg overload). CREATE OR REPLACE preserves existing grants. Applied to
-- production via apply_migration; committed here for repo<->prod sync.
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
      alignment_to_goal, alignment_reason, reasoning, action_items,
      skill_coverage_ratio
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
      array(select jsonb_array_elements_text(coalesce(r->'action_items', '[]'::jsonb))),
      nullif(r->>'skill_coverage_ratio','')::numeric
    from jsonb_array_elements(p_roles) as r;
  end if;

  if p_input_hash is not null then
    insert into function_cache (user_id, function_name, input_hash, cached_at)
    values (p_user_id, 'generate-career-analysis', p_input_hash, now())
    on conflict (user_id, function_name)
    do update set input_hash = excluded.input_hash, cached_at = excluded.cached_at;
  end if;
end;
$function$;
