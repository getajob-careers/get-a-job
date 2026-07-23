# Onboarding V2 restyle brief — for the DESIGN LANE

**Ownership (Eli-ruled 2026-07-23):** the **design lane** now owns all V2 onboarding
**visual + UX** work — Phase 1 restyle (canvas/next-design tokens) AND Phase 2 UX
composition. The **CV/onboarding-sequence lane** owns functional correctness,
persistence, and any data/behavior change Phase 2 needs, and **cross-reviews any
design-lane PR that touches a persist path** (`onboardingPersist.js`,
`careerAnalysis.js`, `persistOnboardingProfileV2.js`, `inferPrimaryDomainWrite.js`).

This brief is the contract: what you may restyle freely, what carries behavior you
must not alter, the ruled Phase-2 backlog, and the invariants every restyle PR keeps
green.

State as of this brief: **#691 (PR-2) merged + LIVE** (squash `70bd110`, serving on
`getajob.careers`). V2 is flag-gated (`ONBOARDING_V2` env flag / `?onboarding_v2=1`
override). Flag flip to real signups is the LAST step (after Phase 2).

---

## V2 flow map

Entry: `src/pages/OnboardingV2.jsx` (the 4-screen shell + all orchestration). Rendered
by `OnboardingEntry.jsx` when the flag is on. Screen order (MOCKUP order, reorder was
tried + reverted):

| step | screen        | component                                                                    | what it does                                                                                                                                           |
| ---- | ------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0    | `cv_upload`   | `StepResumeUpload` (chromeless embed) + situation selector (in OnboardingV2) | pick situation(s), drop a CV or Skip; extraction runs in bg, resolves on the review watch                                                              |
| 1    | `review`      | `ReviewScreenV2` → wraps `StepReview`                                        | success: count-up + populated form; skip/fail: "No CV yet" / "couldn't read" manual-entry floor. Persists profiles row + `extracted` stamp on Continue |
| 2    | `direction`   | `DirectionScreenV2`                                                          | 5-year goal (required), location, work arrangement, internship. Runs primary_domain inference on Continue                                              |
| 3    | `springboard` | `SpringboardScreenV2`                                                        | "You're all set" → "Go to my workspace" = finalise (entity rows + onboarding_complete + bg career analysis)                                            |
| —    | tutorial      | `OnboardingTutorial` (shared with V1)                                        | renders AFTER springboard launch; 6 slides + always-visible "Skip tour"; exit → `/Home?welcome=1`                                                      |

Post-launch handoff: `?welcome=1` on `/Home` (forward-looking arrival signal; no-ops on
current Home — design-lane owns the arrival experience).

---

## Files: SAFE to restyle vs DO-NOT-ALTER behavior

### Restyle freely (visual/layout/copy — no behavior contract)

- `src/pages/OnboardingV2.jsx` — the shell chrome (header, progress bar, eyebrow,
  headings, situation-card grid markup, spacing, tokens). **But** the handler wiring
  and the invariants below are load-bearing — restyle the JSX, keep the calls.
- `src/components/onboarding/StepResumeUpload.jsx` — dropzone visuals (respect the
  `chromeless` prop: V1 renders full chrome without it; V2 passes it. Keep that prop
  contract byte-identical for V1).
- `src/components/onboarding/ReviewScreenV2.jsx`, `StepReview.jsx` — the review form
  (this is the Phase-2 headline; see backlog). `StepReview` is **shared with V1** — any
  change renders in both; keep it behavior-identical for V1.
- `src/components/onboarding/DirectionScreenV2.jsx` — goal search UI, location field,
  work-arrangement cards.
- `src/components/onboarding/SpringboardScreenV2.jsx` — the launch card.
- `src/components/onboarding/OnboardingTutorial.jsx` — **shared with V1** (V1 renders it
  at step 6). Slides/chrome are restyleable; the skip machinery is load-bearing (below).

### DO NOT restyle / DO NOT touch without CV-lane cross-review (no visual surface)

- `src/lib/onboardingPersist.js` — `saveEducations` / `saveProgress` / `handleSurveyNext`
  / `handleFinalise` (live V1 signup path; char-identical extraction from V1).
- `src/lib/careerAnalysis.js` — `runCareerAnalysisAndReplaceRoles` (shared producer).
- `src/lib/persistOnboardingProfileV2.js` — `persistReviewProfile` (profiles row + stamp).
- `src/lib/inferPrimaryDomainWrite.js` — `runPrimaryDomainInference` (precedence guard).
- `src/lib/mapExtractedToOnboarding.js`, `onboardingPayload.js`, `flags.js`, `analytics.js`.

---

## Behavior invariants (a restyle PR must preserve these EXACTLY)

1. **Persist call graph + ordering** (in OnboardingV2):
   - review Continue → `advanceFromReview` → `persistReviewProfile({...})` then `advance()`.
   - direction Continue → `advanceFromDirection` → `runPrimaryDomainInference({...})`,
     emit the inferred event, backfill an APPLIED inference into `profileData.primary_domain`,
     then `advance()`.
   - springboard launch → `finaliseAndLaunch` → STEP_COMPLETED{3} + `setShowTutorial(true)`,
     then `saveEducations(ctx)` + `handleFinalise(ctx)`, then BACKGROUND
     `runCareerAnalysisAndReplaceRoles({force:true})` + invalidate `["careerRoles"]`.
   - tutorial exit → `handleTutorialEnd` → persist `has_seen_onboarding_tutorial=true`,
     track LAUNCHED_TO_HOME, `navigate("/Home?welcome=1",{replace:true})`.
     Do not reorder, drop, or move these across components.

2. **Event schema** — keep `ONBOARDING_STEP_COMPLETED` step_index 0-3 per screen,
   `ONBOARDING_SCREEN_VIEWED`, `ONBOARDING_PRIMARY_DOMAIN_INFERRED` (must carry the
   `situations` ARRAY + single `situation`), `ONBOARDING_CV_EXTRACT_FAILED`,
   `ONBOARDING_LAUNCHED_TO_HOME`, and the tutorial events. Keep `flow:"v2"` on all.
   The hub checks PostHog for these — a dropped index or renamed prop breaks the funnel.

3. **Precedence invariant** — extraction-derived `primary_domain` is NEVER overwritten by
   inference. Client CV-first guard (`extracted?.primary_domain`) + the review-screen
   `primary_domain_source='extracted'` stamp + server guard. The applied-inference backfill
   into `profileData` exists so `handleFinalise` doesn't clobber the inferred domain to null.
   Keep all four legs.

4. **Situation XOR-multi** — `SITUATION_CONFLICTS` (unemployed⊖{have_job,looking};
   have_job⊖{unemployed,looking}; looking⊖{unemployed,have_job}; student/freelancing stack),
   `SITUATION_TO_EMPLOYMENT` mapping, `SITUATION_PRIORITY` for the single audit value.
   `employment_status` is written as the mapped ARRAY. The situation UI is restyleable but
   the toggle/conflict logic and the array write are contract.

5. **Goal-required gating (R2)** — direction Continue stays disabled until
   `five_year_goal_role_id` is set. `DirectionScreenV2` writes BOTH `five_year_goal_role_id`
   (scoring contract) AND `five_year_role` (human label) together — `five_year_role` is what
   feeds `dream_roles` in the career analysis; don't drop it.

6. **Completed-user mount guard** — OnboardingV2 redirects `onboarding_complete` users to
   `/Home`. Keep it.

7. **Tutorial contract** — V2 passes `isReturningUser={false}`. The "Skip tour" for fresh
   users must HOLD until `setupComplete` (shows "Finishing setup…" if the finalise writes are
   still running) before firing `onTutorialEnd({skipped:true})`. `skipReasonRef` labels the
   SKIPPED event. `has_seen` persists on end. All V1 paths (returning-user gate, Go to
   platform, completion beat) unchanged.

---

## Phase 2 UX backlog (Eli-ruled)

1. **Review screen (screen 1) — the headline.** "Hard to get through, discouraging, too
   long." Verify collapsed-by-default sections actually shipped (vs default-open); give
   "what we found" stronger visual hierarchy; cut page length. This is the biggest lever.
2. **Upload-wait loading.** Needs a loading treatment between "Upload to continue" (screen 0)
   and the review screen while extraction runs.
3. **Location autocomplete** on the direction screen (check what V1 uses for suggestions).
4. **Entrance motion / marquee — RE-OPENED.** The deferred marquee/entrance-motion ruling is
   back on the table for this arc ("passes but barely, feels like V1 not V2").
5. **Thin-profile empty-roadmap nudge (NEW, from the #691 drive).** A skip-path / no-experience
   completion lands with an EMPTY roadmap because `generate-career-analysis` deliberately returns
   0 roles for thin profiles ("couldn't find clear role matches — add skills / experience").
   PR-2 wires the producer correctly; the gap is UX. Add an empty-state/nudge on Home + Roadmap
   guiding thin-profile users to add a CV / experience then Build. (Any data change here is
   CV-lane; the nudge UI is design-lane.)

---

## Acceptance invariants (keep green on any restyle PR)

**4-path live drive** (fresh `+6b-*` account on the preview; 6a admin-user + magic-link
technique; Vercel SSO bypass via a share link):

- **Path A (real CV):** extraction → review count-up → springboard → tutorial → Home.
  `onboarding_complete=true`, `primary_domain_source='extracted'`, entity rows match CV,
  tasks populated.
- **Path B (skip → inferred):** manual floor → goal → inference fires with `situations`
  array → `primary_domain_source='inferred'` (domain NOT clobbered at finalise).
- **Failure (bad file):** "couldn't read" banner + retry + manual floor → completes like B.
- **Tutorial exit:** appears after springboard; "Skip tour" visible for fresh users and holds
  until setup, then → `/Home?welcome=1`; `has_seen_onboarding_tutorial=true`.

**The 3 born-acceptance criteria** (hub verifies): (1) `career_roles>0` for a profile with
signal (thin profiles legitimately yield 0 — see backlog #5); (2) tutorial after springboard
with a working visible skip; (3) `onboarding_primary_domain_inferred` carries the `situations`
array (`flow:v2`).

**Behavior-identity tests** — `src/test/onboardingPersist.test.js` (12 tests) must stay green.
Any change to `onboardingPersist.js` / `careerAnalysis.js` is behavior-preserving; if a restyle
PR touches them, it needs CV-lane cross-review + these tests green + one live persist drive.

**Flag-off byte-identity** — flag-off `/Onboarding` must stay byte-identical to legacy V1.
Shared components (`StepReview`, `StepResumeUpload`, `OnboardingTutorial`) render in BOTH flag
states — call out any change to them as UNCONDITIONAL and drive V1 too.

**Gate** — lint + typecheck (baseline-neutral) + build + test, plus a cold-load browser smoke on
the real route (onboarding UI is exactly the "green build ≠ page renders" class; formatter can
strip a just-added import — grep it after adding, smoke the route).
