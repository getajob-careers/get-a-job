# CV lane — latest handoff (resume point)

Overwrite-on-update (standing rule, 2026-07-22). **After any context clear, read
THIS + `tasks/lessons.md` first.** ~150-line resume point, not a log.

## Lane identity

The **onboarding-V2 / CV lane**. Owns the onboarding redesign flow, its persistence,
and `primary_domain` provenance. **NOT** the canvas/Home design lane (ground dial,
arrival moment, token rename #677) — separate terminal; coordinate, don't build there.

Owned paths:

- `src/pages/OnboardingV2.jsx`, `src/pages/OnboardingEntry.jsx`, `src/pages/Onboarding.jsx` (V1)
- `src/components/onboarding/**`
- `src/lib/inferPrimaryDomainWrite.js`, `persistOnboardingProfileV2.js`, `mapExtractedToOnboarding.js`, `onboardingPayload.js`, `flags.js`, `analytics.js` (V2 taxonomy)
- `supabase/functions/_shared/infer-primary-domain.ts`; `supabase/migrations/*primary_domain_source*`, `*handle_new_user*`

## PR states

- **#670/#671/#672/#674/#675** (scaffold → inference → screen0 → order-revert → direction) — MERGED.
- **#677** (design lane): `rd-coral`→`rd-primary` rename — **MERGED** (1697063). `rd-coral` utility no longer exists; use **`rd-primary`** for all new work.
- **#679** (PR 5, review screen) — **MERGED** (24b0d74). Watch → count-up reveal / failure floor, `StepReview` reuse, `mapExtractedToOnboarding` seed, profiles persist + `extracted` stamp. **Precedence invariant closed end-to-end.**
- Migration `20260722_profiles_primary_domain_source.sql` — **APPLIED live** (verified: text, nullable, CHECK in (extracted,inferred)).
- **PR 6a (next)** — persist-helper extraction (see below). **PR 6b** — V2 persist + springboard. Then the acceptance guide (launch-1 gate).

## ✔ Coordination gap — RESOLVED (Eli ruling, 2026-07-22)

#677 merged BEFORE #679, so its sweep could not absorb `ReviewScreenV2.jsx`
(didn't exist yet). `src/components/onboarding/ReviewScreenV2.jsx` still has
inert `rd-coral` classes (utility gone). **Eli ruled: fold the fix into PR 6b**
as **its OWN commit** — rename-only, `rd-coral*`→`rd-primary*`, with the exact
**occurrence count in the commit message** so the hub can verify it separately
from the persistence diff. Do NOT bundle the rename into the persist commit.

## Standing rulings (honor verbatim)

- **Mockup order** — `0 cv_upload · 1 review · 2 direction · 3 springboard`; reorder reverted; extraction resolves on the review screen's watch.
- **Precedence invariant** — extraction-derived `primary_domain` NEVER overwritten by inference; DB guard `WHERE primary_domain IS NULL OR primary_domain_source='inferred'` + client CV-first guard. **CLOSED** (#679 stamps `extracted` on review, before direction infers).
- **Failure UX** — one screen, one moment of truth: wait → count-up on success / "couldn't read your CV" retry + **manual-entry floor** on failure.
- **Event taxonomy at ACTUAL (mockup) indices** — `step_index` = mockup index; `onboarding_cv_extract_failed` on failure.
- **rd-primary now** (#677 landed).
- **Marquee** — anime.js marquee DEFERRED; `useCountUp` carries the reveal for launch. Logged as **post-acceptance polish**; Eli re-rules after his in-flow drive if the moment feels flat.

## Persist fork — RULED: shared helper, split for risk containment

- **PR 6a — PURE MECHANICAL extraction.** Move V1's four inline persist fns (`saveEducations` :384, `saveProgress` :435, `handleSurveyNext` :523, `handleFinalise` :760 in `Onboarding.jsx`) into a shared helper VERBATIM; V1 calls it; **zero behavior change**. Touches the LIVE signup path → **PR #156 care**: prove behavior-identity with tests AND a **real +test signup drive on the preview** (profiles + entity rows land identically; timestamps in the PR body) BEFORE holding for merge. **Hub independently re-verifies the signup evidence against the live DB before merge approval** (Eli, 2026-07-22) → the PR body MUST carry the exact `+test` account email AND the write timestamps so the hub can match them. Context: these fns close over `user`, `supabase`, `profileData`/`experiences`/`educations`/`projects`/`certifications` + setters, `existingProfileId`/`setExistingProfileId`, `cleanProfilePayload`, career-analysis + `generate-tasks` + `replace_career_roles`. Extract via a ctx bag.
- **PR 6b** — V2 review/springboard persistence calling the SAME helper + the **springboard screen** (screen 3; `?welcome=1` handoff to Home per scaffold). Build in `rd-primary`. Fold the ReviewScreenV2 rd-coral fix here (pending Eli's OK).

## Next actions

1. Build PR 6a: extract the four fns → shared helper, wire V1, behavior-identity tests, push for preview, run the +test signup drive, then HOLD with evidence.
2. PR 6b: V2 persist via the helper + springboard + ReviewScreenV2 color fix.
3. After 6a+6b: HOLD everything; hand Eli the in-flow acceptance guide (exact preview links; both paths — real CV and skip-via-pickers — + how to trigger one deliberate extraction failure). **That drive is the launch-1 gate.**

## Open questions

- ReviewScreenV2 inert-`rd-coral` fix ownership (see gap above).
- 6a extraction faithfulness is the whole risk — the live signup drive is the proof, not the unit tests alone.
