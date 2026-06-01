# 0c gap — 23 object-form role-skill rows silently break onboarding suggestions

## What

`04_role_skill_mapping.ts` has 23 rows where `core_skills` / `secondary_skills` / `differentiator_skills` contain `{skill_id, importance, notes}` objects instead of flat strings. The regen script `scripts/regen-role-skills.mjs:48` passes both shapes through unchanged → the generated JSON mirrors the mix.

Downstream:

- `src/lib/roleSkillsLookup.js::suggestSkillsForTitle` (lines 136-149) spreads `role.core_skills` raw into a `Set`. For object-form rows the Set ends up containing `{skill_id, ...}` objects, not strings.
- `src/components/onboarding/StepRoleSkills.jsx::RoleSuggestions` (line 74) then calls `humanizeSkillId(id)` on each entry, expecting strings. With objects it produces garbage or empties.

Net effect: onboarding skill suggestions for any of the 23 affected roles return zero usable IDs.

## Target-student impact (pull forward before the Aug-Nov 2026 pilot)

Affected roles that ARE student-facing for the business-student cohort:

- `junior_consultant_analyst` — Junior Consultant / Analyst (classic target)
- `consultant` — Consultant
- `senior_consultant` — Senior Consultant
- `consulting_manager` — Manager / Engagement Manager
- `growth_marketing_manager` — Growth Marketing Manager
- `performance_marketing_manager` — Performance Marketing Manager
- `solutions_engineer_junior` — Junior Solutions Engineer
- `solutions_engineer` — Solutions Engineer

That's 8 of 23 that matter for the pilot. Onboarding suggestions for these silently misfire today.

Not target-student:

- 12 AI/ML roles (junior_ai_ml_engineer through ai_solutions_engineering_manager)
- senior_solutions_engineer, solutions_engineering_manager, head_of_solutions_engineering

## Fix options

**A. Normalize at the consumer (smallest blast radius).** In `roleSkillsLookup.js::suggestSkillsForTitle`, map each entry: `typeof e === "string" ? e : e?.skill_id`. Filter falsy. Done.

**B. Normalize at the generator.** In `scripts/regen-role-skills.mjs:48-49`, unwrap objects before writing to JSON. Generated JSON ends up uniformly flat; consumers untouched.

**C. Normalize in source.** Convert the 23 object-form rows in `04_role_skill_mapping.ts` to flat strings, losing the `importance` / `notes` metadata. Doesn't get us to tiered scoring later.

Recommend **A + B together**: defensive consumer normalization (cheap insurance) + generator unwrap (canonical mirror is uniformly flat). Keeps the source rows tiered so a future PR can wire tiered scoring without re-migrating.

## Out of scope here

This was deliberately deferred from PR #201 (role-library coverage gap A) to keep that PR focused on coverage. The 23 rows have been broken since the object-form was introduced — fixing now vs. with PR #201 is identical risk.

## Acceptance

- `suggestSkillsForTitle("Growth Marketing Manager")` returns ≥5 flat skill IDs.
- `suggestSkillsForTitle("Junior Consultant / Analyst")` returns ≥5 flat skill IDs.
- Both pass through `humanizeSkillId` to readable labels.
- All 8 target-student roles above smoke-pass the same.
