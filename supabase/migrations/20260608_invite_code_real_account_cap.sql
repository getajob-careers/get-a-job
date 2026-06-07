-- Invite-code cap now enforces REAL ACCOUNTS, not call count.
--
-- Why: the previous redeem_invite_code() incremented current_uses on
-- every call, but the client necessarily calls it BEFORE auth.signUp.
-- Anything that aborts the signup after the call — Turnstile expiry,
-- auth.signUp validation errors, unconfirmed email, drop-off during
-- onboarding — left the increment locked in and the user re-submitted
-- against the now-higher count. GETAJOBPILOT was running at ~2x reality
-- (27 calls vs 12 real accounts) which would have locked the 100-student
-- pilot at ~50 actual seats.
--
-- New model:
--   • redeem_invite_code(): validates against (select count(*) from
--     profiles where invite_code = p_code) < max_uses. No side effects.
--     Same return shape — no client change needed.
--   • AFTER INSERT trigger on profiles syncs invite_codes.current_uses
--     to the real count, so the AdminLaunch capacity dashboard stays
--     accurate without being the gate.
--
-- profiles.invite_code is set once at first profile insert
-- (Onboarding.jsx:451) from auth.user_metadata, never updated, so the
-- insert-only trigger has no double-count risk.
--
-- Race overshoot: two concurrent signups for the last slot can both
-- pass the count check; cap of 30 can land at 31. Accepted scope for
-- the pilot — the call-count overshoot was 2x, not "by one".
--
-- Applied to live prod via Supabase MCP apply_migration before merge.
-- This file mirrors the live definition.

create or replace function public.redeem_invite_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path to public
as $$
declare
  v_row        public.invite_codes%rowtype;
  v_real_count int;
begin
  if p_code is null or length(trim(p_code)) = 0 then
    return jsonb_build_object('valid', false, 'reason', 'invalid_or_exhausted');
  end if;

  select * into v_row from public.invite_codes where code = trim(p_code);

  if not found or not v_row.is_active then
    return jsonb_build_object('valid', false, 'reason', 'invalid_or_exhausted');
  end if;

  -- Uncapped codes (TEAMGETAJOB, VIPGETAJOB): always valid while active.
  if v_row.max_uses is null then
    return jsonb_build_object('valid', true, 'cohort_label', v_row.cohort_label);
  end if;

  -- Capped: gate on actual profile count, not call count.
  select count(*) into v_real_count
  from public.profiles
  where invite_code = trim(p_code);

  if v_real_count >= v_row.max_uses then
    return jsonb_build_object('valid', false, 'reason', 'exhausted', 'cohort_label', v_row.cohort_label);
  end if;

  return jsonb_build_object('valid', true, 'cohort_label', v_row.cohort_label);
end;
$$;

-- AFTER INSERT trigger keeps invite_codes.current_uses as a cached
-- mirror of count(profiles where invite_code = X). The cap doesn't read
-- this column anymore — it's purely for the AdminLaunch dashboard.
--
-- SECURITY DEFINER because invite_codes has no anon/authenticated
-- policies (only service_role + SECURITY DEFINER funcs can write).
--
-- = count(*) not += 1 so the trigger is self-healing on any manual
-- ops fix-up (cheap — predicate hits the unique index on code).
create or replace function public.sync_invite_code_current_uses()
returns trigger
language plpgsql
security definer
set search_path to public
as $$
begin
  if NEW.invite_code is not null then
    update public.invite_codes
    set current_uses = (
      select count(*) from public.profiles where invite_code = NEW.invite_code
    )
    where code = NEW.invite_code;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_profiles_sync_invite_uses on public.profiles;
create trigger trg_profiles_sync_invite_uses
after insert on public.profiles
for each row execute function public.sync_invite_code_current_uses();
