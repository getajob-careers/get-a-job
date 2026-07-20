-- reset_user_data was failing for EVERY user: it ran DELETE FROM job_suggestions,
-- a table that no longer exists (42P01), so the whole atomic function rolled back
-- ("Reset failed. Please try again."). Because it's atomic, no data was ever lost.
-- Applied via MCP apply_migration (db push is dead in this repo, lesson 2026-06-15).
--
-- This: (1) removes the dead job_suggestions delete; (2) expands the wipe to match
-- the settings dialog + fresh-start intent (applications, application_cvs, stories,
-- daily_actions, linkedin_*); KEEPS onboarding_events (funnel analytics); (3) adds
-- reset_audit so this destructive op is never invisible again — returns jsonb
-- {ok,error} and runs the wipe in a SUBTRANSACTION so a failure is isolated and the
-- outer function survives to log the outcome and RETURN a status (RAISE would roll
-- the audit row back too). All FKs among these tables are SET NULL, so delete order
-- is unconstrained. Self-only auth check preserved.

create table if not exists public.reset_audit (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  outcome text not null,  -- 'success' | 'error'
  error text,
  created_at timestamptz not null default now()
);
alter table public.reset_audit enable row level security;
drop policy if exists reset_audit_own_read on public.reset_audit;
create policy reset_audit_own_read on public.reset_audit for select using (auth.uid() = user_id);

drop function if exists public.reset_user_data(uuid);  -- return type changes void -> jsonb
create function public.reset_user_data(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_err text;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'forbidden: caller is not the target user'
      using errcode = 'insufficient_privilege';
  end if;

  begin
    delete from career_roles                    where user_id = p_user_id;
    delete from tasks                           where user_id = p_user_id;
    delete from experiences                     where user_id = p_user_id;
    delete from projects                        where user_id = p_user_id;
    delete from certifications                  where user_id = p_user_id;
    delete from education                       where user_id = p_user_id;
    delete from rate_limits                     where user_id = p_user_id;
    delete from applications                    where user_id = p_user_id;
    delete from application_cvs                 where user_id = p_user_id;
    delete from stories                         where user_id = p_user_id;
    delete from daily_actions                   where user_id = p_user_id;
    delete from linkedin_optimizations          where user_id = p_user_id;
    delete from linkedin_outreach_conversations where user_id = p_user_id;
    delete from linkedin_posts                  where user_id = p_user_id;
    -- onboarding_events (funnel analytics) intentionally NOT wiped.

    update profiles set
      onboarding_complete = false, onboarding_step = 0, skills = '{}', summary = null,
      five_year_role = null, primary_domain = null, adjacent_fields = '[]'::jsonb,
      proof_signals = '[]'::jsonb, relevant_coursework = '{}', gpa = null, honors = null,
      overall_assessment = null, qualification_level = null, skill_gaps = '{}',
      last_reality_check_date = null
    where id = p_user_id;
  exception when others then
    v_err := SQLERRM;
    insert into public.reset_audit(user_id, outcome, error) values (p_user_id, 'error', v_err);
    return jsonb_build_object('ok', false, 'error', v_err);
  end;

  insert into public.reset_audit(user_id, outcome, error) values (p_user_id, 'success', null);
  return jsonb_build_object('ok', true, 'error', null);
end;
$function$;
