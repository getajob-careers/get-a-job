# CV lane — latest handoff (resume point)

Overwrite-on-update (standing rule, 2026-07-22). **After any context clear, read
THIS + `tasks/lessons.md` first.** ~150-line resume point, not a log.

## Lane identity

The **onboarding-V2 / CV lane**. Owns the onboarding redesign flow, its persistence,
and `primary_domain` provenance. **NOT** the canvas/Home design lane (ground dial,
arrival moment, token rename #677) — that is a separate terminal; coordinate, do not
build there.

Owned paths:

- `src/pages/OnboardingV2.jsx`, `src/pages/OnboardingEntry.jsx`
- `src/components/onboarding/**` (StepResumeUpload, DirectionScreenV2, StepReview, …)
- `src/lib/inferPrimaryDomainWrite.js`, `src/lib/flags.js` (`onboardingV2Enabled`), `src/lib/analytics.js` (V2 taxonomy)
- `supabase/functions/_shared/infer-primary-domain.ts`
- `supabase/migrations/*primary_domain_source*`, `*handle_new_user*`

## PR states

- **#670** scaffold · **#671** inference module · **#672** screen 0 (upload) · **#674** order-revert · **#675** direction screen — **ALL MERGED** to main.
- Migration `20260722_profiles_primary_domain_source.sql` — **APPLIED live** (verified 2026-07-22: `text`, nullable, `CHECK IN ('extracted','inferred')`).
- **#677** (design lane): `rd-coral`→`rd-primary` rename — **HELD**, queued behind this lane's merges; its rebase sweep absorbs our `rd-coral` refs. **Do not rename yourself.**
- **PR 5** = onboarding V2 **review screen (index 1)** — IN PROGRESS.

## V2 shell state (on main)

Mockup order: `0 cv_upload · 1 review · 2 direction · 3 springboard`.

- **Screen 0** (cv_upload): situation selector + `StepResumeUpload(deferProofSignals)` → `onExtracted` sets shell `extracted` (resume fields immediately; proof-signals backfill via `onProofSignals`). Stroke-draw `ReadingAffordance`.
- **Screen 2** (direction): `DirectionScreenV2` (goal/location/work/practicum) + `runPrimaryDomainInference` on advance (precedence invariant; fires `onboarding_primary_domain_inferred`).
- **Screens 1 (review) + 3 (springboard)**: placeholders.
- **Persistence: NONE yet in V2** — all shell state. **PR 5's review screen is the FIRST persistence.**

## Standing rulings (honor verbatim)

- **Mockup order** — reorder tried + reverted; `ONBOARDING_CV_READY` retired; extraction resolves on the **review screen's watch** (no cross-screen signal).
- **Precedence invariant** — extraction-derived `primary_domain` NEVER overwritten by inference; inference writes only into null-or-previously-inferred; enforced by DB guard `WHERE primary_domain IS NULL OR primary_domain_source='inferred'` + a client CV-first guard.
- **'extracted' stamp contract** — PR 5's persistence, when it writes `primary_domain` from extraction, MUST stamp `primary_domain_source='extracted'`. (This is what makes the invariant fully honest; logged as a #675 follow-up.)
- **Failure UX** — one screen, one moment of truth: animated wait → count-up marquee on success / "couldn't read your CV" retry + **manual-entry floor** on failure. Bounded retry.
- **Event taxonomy at ACTUAL (mockup) indices** — `onboarding_screen_viewed` / `onboarding_step_completed` carry `step_index` = mockup index (review = 1); `onboarding_cv_extract_failed` on failure.
- **rd-primary utilities once #677 lands** — until then build with **`rd-coral`** (current main's utility); #677's sweep renames it.

## PR 5 scope (review screen, index 1)

1. **Persist** the extracted profile (first V2 persistence) via the `profiles` write; **stamp `primary_domain_source='extracted'`** when writing `primary_domain`. Mirror legacy `cleanProfilePayload` shape.
2. **Watch** — extraction resolves here (shell `extracted`); show the animated wait until resolved.
3. **Success** — count-up marquee summarizing what was found (experiences / skills / education counts); code-split `anime.js` for the marquee only.
4. **Failure** — "couldn't read your CV" + bounded retry + manual-entry floor.
5. **Hybrid collapse** review UI (compact confirm of extracted fields).
6. Events at `step_index:1`; `onboarding_cv_extract_failed` on failure.
7. Held PR; flag-off byte-identical; no deploy (client only; migration already applied).

## Next actions

1. Build PR 5 (persistence-first, then wait / success / failure UX). Hold PR; gates green.
2. After #677 lands: switch this lane's classes to `rd-primary`.
3. Springboard (screen 3) + rollout flag flip are later CV-lane slices.

## Open questions

- Exact review-UI content (which extracted fields to surface in the hybrid collapse) — building best interpretation; flagged in the PR body for Eli's review.
- Persist full profile vs. subset — mirroring the legacy persist shape (`cleanProfilePayload`) unless ruled otherwise.
