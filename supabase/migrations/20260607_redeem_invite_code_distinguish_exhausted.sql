-- redeem_invite_code now returns reason="exhausted" when a valid,
-- active code is at its cap (vs reason="invalid_or_exhausted" for an
-- unknown or inactive code). This lets the signup gate show the right
-- copy: "this pilot is full" for a real cohort fill vs the generic
-- "invalid invite code" for a typo / unknown code.
--
-- Applied to live prod by the operator via Supabase MCP apply_migration.
-- This file mirrors the live definition so the repo matches what's
-- running. Do NOT re-apply.
--
-- Shape:
--   valid:true                                  → { valid:true, cohort_label }
--   valid code, cohort at cap                   → { valid:false, reason:"exhausted", cohort_label }
--   unknown / inactive / blank / no_max_at_cap  → { valid:false, reason:"invalid_or_exhausted" }
--
-- Atomic + race-safe: the cap check + increment happen in one UPDATE so
-- two concurrent redeems can't both win the last slot.

CREATE OR REPLACE FUNCTION public.redeem_invite_code(p_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_cohort text;
  v_row    public.invite_codes%rowtype;
begin
  if p_code is null or length(trim(p_code)) = 0 then
    return jsonb_build_object('valid', false, 'reason', 'invalid_or_exhausted');
  end if;

  -- atomic, race-safe: cap check + increment in one statement
  update public.invite_codes
  set current_uses = current_uses + 1
  where code = trim(p_code)
    and is_active
    and (max_uses is null or current_uses < max_uses)
  returning cohort_label into v_cohort;

  if v_cohort is not null then
    return jsonb_build_object('valid', true, 'cohort_label', v_cohort);
  end if;

  -- no increment happened: tell a valid-but-full code apart from an invalid/inactive one
  select * into v_row from public.invite_codes where code = trim(p_code);

  if found and v_row.is_active
     and v_row.max_uses is not null
     and v_row.current_uses >= v_row.max_uses then
    return jsonb_build_object('valid', false, 'reason', 'exhausted', 'cohort_label', v_row.cohort_label);
  end if;

  return jsonb_build_object('valid', false, 'reason', 'invalid_or_exhausted');
end;
$function$
;
