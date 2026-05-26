-- Pilot gate — invite codes + waitlist + cohort stamping for the
-- Aug-Nov 2026 100-student pilot. Three components:
--
-- 1. invite_codes: per-cohort codes with optional max_uses caps.
--    Atomic redemption via redeem_invite_code() — no direct table
--    access from any role except service_role + the RPC itself.
-- 2. waitlist_signups: anon INSERT only. No SELECT/UPDATE/DELETE.
--    Email-only capture for users who hit an invalid/exhausted code.
-- 3. profiles.invite_code + profiles.cohort_label: nullable. Stamped
--    at first-profile-insert from user_metadata (passed through
--    auth.signUp options.data). Existing users stay null — fully
--    backwards-compatible.
--
-- The 4 cohort types (label values) the app distinguishes:
--   - 'practicum_reichman' — Reichman BBA practicum students
--   - 'pilot_whatsapp'     — 100-student WhatsApp pilot
--   - 'employee'           — Get A Job team members
--   - 'handpicked'         — manually invited individuals
--
-- Code creation is SQL-only admin. Example seed pattern (NOT committed
-- as part of this migration — seed live via execute_sql or the dashboard):
--
--   insert into invite_codes (code, max_uses, cohort_label)
--   values
--     ('REICHMAN-2026', 100, 'practicum_reichman'),
--     ('PILOT-WHATSAPP', 150, 'pilot_whatsapp'),   -- buffer over the 100 cap
--     ('GAJ-EMPLOYEE',   null, 'employee'),         -- uncapped
--     ('FRIENDS-FAMILY', 50,   'handpicked');

create table public.invite_codes (
  id           uuid        primary key default gen_random_uuid(),
  code         text        not null unique,
  max_uses     int,        -- null = uncapped (e.g., employee codes)
  current_uses int         not null default 0,
  cohort_label text        not null,
  is_active    boolean     not null default true,
  created_at   timestamptz not null default now()
);

comment on table public.invite_codes is
  'Pilot-gate invite codes. Atomic redemption only via public.redeem_invite_code() RPC. No direct INSERT/UPDATE/DELETE for anon or authenticated — service_role + RPC are the only mutators.';
comment on column public.invite_codes.max_uses is
  'Per-code cap. null = uncapped. Race-safe atomicity via the RPC s UPDATE...WHERE current_uses < max_uses predicate.';

-- RLS on. NO policies means default-deny for anon + authenticated.
-- service_role bypasses RLS, and the SECURITY DEFINER RPC runs as
-- table owner, so both legit paths still work.
alter table public.invite_codes enable row level security;

create table public.waitlist_signups (
  id         uuid        primary key default gen_random_uuid(),
  email      text        not null unique,
  created_at timestamptz not null default now()
);

comment on table public.waitlist_signups is
  'Pilot-gate waitlist. Anon INSERT-only (and authenticated, in case a logged-in user fills it for someone else). No SELECT/UPDATE/DELETE policies — write-only from clients; reads via service_role / dashboard.';

alter table public.waitlist_signups enable row level security;

create policy "anon can join waitlist"
  on public.waitlist_signups
  for insert
  to anon, authenticated
  with check (true);

-- profiles columns. Nullable so existing rows pass the migration without
-- backfill. New profiles get stamped at first-insert from user_metadata.
alter table public.profiles add column invite_code  text;
alter table public.profiles add column cohort_label text;

comment on column public.profiles.invite_code is
  'The invite code redeemed at signup. Null for users created before pilot-gate (existing). Stamped from auth.users.raw_user_meta_data->>invite_code on first profile insert.';
comment on column public.profiles.cohort_label is
  'The cohort_label of the redeemed invite_code. Null for existing pre-pilot-gate users.';

-- Atomic redemption RPC.
--
-- Single UPDATE statement is the entire critical section — Postgres
-- guarantees row-level locking for UPDATE...RETURNING, so two
-- simultaneous redeems on the last slot of a max_uses=100 code
-- serialize: one increments to 100 and returns the row, the other
-- sees current_uses=100, fails the predicate, returns zero rows,
-- and the RPC returns invalid.
--
-- SECURITY DEFINER + locked search_path so the RPC can mutate
-- invite_codes (which has no anon/authenticated policies) on behalf
-- of a logged-out signup form caller.
--
-- Returns shape: { valid: bool, cohort_label?: text, reason?: text }
-- Generic 'invalid_or_exhausted' reason — no info leak about which
-- failure mode (per scope decision).
create function public.redeem_invite_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path to public
as $$
declare
  v_cohort text;
begin
  -- Trim + reject empty here so we don t even touch the table for
  -- whitespace input. (Client-side trim is a UX win; this is the
  -- belt-and-suspenders.)
  if p_code is null or length(trim(p_code)) = 0 then
    return jsonb_build_object('valid', false, 'reason', 'invalid_or_exhausted');
  end if;

  update public.invite_codes
  set current_uses = current_uses + 1
  where code = trim(p_code)
    and is_active
    and (max_uses is null or current_uses < max_uses)
  returning cohort_label into v_cohort;

  if v_cohort is null then
    return jsonb_build_object('valid', false, 'reason', 'invalid_or_exhausted');
  end if;

  return jsonb_build_object('valid', true, 'cohort_label', v_cohort);
end;
$$;

-- anon needs execute because users on the signup form are pre-auth.
grant execute on function public.redeem_invite_code(text) to anon, authenticated;
