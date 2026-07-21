---
owner: Eli
last_reviewed: 2026-07-21
status: research/plan — no build in scope; five product rulings are LOCKED (Eli's hub owns the ruling text)
code_paths:
  - src/pages/Onboarding.jsx
  - src/components/onboarding/
  - supabase/functions/extract-cv-text/index.ts
  - supabase/functions/extract-proof-signals/index.ts
---

# Onboarding redesign — research & build brief

The **five product rulings are LOCKED** (Eli's hub). This doc holds the design/motion/perf/instrumentation research the build plan references per screen. Scope: **onboarding surfaces only** — Home components belong to the redesign lane; anything Home-side here is a _proposed cross-lane contract_, not a build target.

## Funnel evidence (the base)

Scrubbed baseline ~59 confirmed → 38 completed → 21 leak (matches Eli's 63/41/22 modulo scrub boundary). Two adjacent cliffs, one mechanism: the `profiles` row is written **client-side on the first "Continue" past the step-0 resume wall** (`Onboarding.jsx:459`) — email and OAuth converge, RLS INSERT is just `auth.uid()=id` (no OAuth block).

- **Step 0 (resume-upload wall):** 10 of 13 no-profile users fired `onboarding_started` but never `onboarding_step_completed` → bounced at the wall before the first write. 1 genuine OAuth landing failure (zero events); 2 pre-instrumentation (pre-May-17).
- **Step 1 (review):** 6 of 8 stalls happen immediately after completing step 0, at the heavy review screen. Later steps lose ~2 combined.
- **Redesign leverage is concentrated in the upload + review screens.** A step-0 rework reaches ~10 of 13 "lost" users — Cliff 1 is _not_ upstream/unreachable.

## Motion treatment (per screen) — zero-dep first, one code-split exception

Governing rule: every effect is attempted with **shipped rAF/CSS + `useCountUp` (zero-dep)** before naming a library. Zero-dep is a **bundle-discipline constraint, not an ambition cap** — push timing curves, stagger rhythm, and easing _character_ so CSS reads as designed, not defaulted. Palette stays on `rd-` tokens; `prefers-reduced-motion` collapses everything to instant state changes. Resource citations are **inspiration, not adoption** — each reactbits component pulls `motion` (~32kb) for effects reproducible in CSS.

Bundle facts: Motion full ≈32kb gz (LazyMotion+`m` ≈4.6kb, `useAnimate` mini 2.3kb) · GSAP ≈23kb · react-spring ≈12kb · anime.js v4 tree-shakeable (~few kb via submodules) · shipped `useCountUp` = rAF, zero-dep.

### Screen 1 — CV upload → **the extraction reveal (the in-flow marquee)**

Per Eli's amendment, the orchestrated anime.js moment lives HERE (the counting-numbers reveal), not at a tier screen.

- **"Reading your CV" progress:** anime.js `createDrawable` SVG stroke-draw sensibility — a ring/check that _draws_, so the 10–19s wait reads as work. Zero-dep default via CSS `stroke-dashoffset`.
- **Extraction reveal (marquee):** when extraction lands, an **anime.js timeline** orchestrates the sequence — filename/check settle → the "we found N jobs · M skills · K certs" numbers count up in rhythm → hand-off to review. Inspired by reactbits **CountUp** (spring, in-view `startWhen`, `onEnd` chaining) + **BlurText** (blur→focus stagger). **Library exception (justified): anime.js, tree-shaken to timeline+stagger, code-split and lazy-loaded on screen 1 only.** Reason: this is the single highest-value in-flow moment (the wall where 10 died), and hand-coordinating this many steps in rAF is exactly what a timeline engine is for. The numbers themselves still use `useCountUp`; blur/stagger stays CSS. If reduced-motion or the lazy chunk fails, it degrades to instant text.

### Screen 2 — Review → count-up + hybrid disclosure

- **Count summary count-up** ("5 jobs · 33 skills · 5 certs"): shipped **`useCountUp`**, with three ideas grafted from reactbits CountUp — IntersectionObserver `startWhen`, thousands separator, `onEnd` to chain the section stagger. **Zero new lib** (reactbits CountUp would trade our zero-dep hook for Motion's 32kb).
- **Hybrid collapse** (locked ruling): long/confident sections (skills) collapsed with count-up headers; education (required) + experiences expanded. CSS `grid-template-rows: 0fr→1fr`; reveal-on-scroll sensibility from recent.design/godly. Zero new lib.

### Screen 3 — Direction & preferences

- Practicum checkbox→radio inline-expand: mockup's shipped `.inline-expand` (max-height/grid transition). Zero new lib.

### Screen 4 — **Springboard, not destination**

Per Eli's correction: there is no tier-reveal payoff. Screen 4's job is to **launch the user into Home**, kept light (CSS only) — a confident CTA + a forward-motion transition into Home. No anime.js here.

### The true payoff = onboarding → Home ARRIVAL (cross-lane)

The real wow is landing on Home with master CV + job matches + everything populated. **I own onboarding only.** The arrival moment needs a Home-side entrance state — specified as a **cross-lane contract** (see below), relayed via Eli's hub. Onboarding's side of the contract: emit a handoff signal on completion; play the launch transition out.

## Requirement A — extraction speed (profiled, real timings)

Pipeline (`StepResumeUpload.jsx`): upload → `extract-cv-text` (PDF, server) → **`ai-chat` resume-extractor + `extract-proof-signals` run in PARALLEL** (`StepResumeUpload.jsx:100,264,276`) → client parse/skill-resolve → (write deferred to Continue). Timings from `function_metrics` (30d):

| Stage                                      | p50        | p90   | notes                                                            |
| ------------------------------------------ | ---------- | ----- | ---------------------------------------------------------------- |
| `extract-cv-text` (PDF parse)              | **2.2s**   | 3.1s  | PDFs only; docx parses client-side (~0)                          |
| resume-extractor (`ai-chat`, gpt-5.4-mini) | **7.3s**   | 11.0s | parallel                                                         |
| `extract-proof-signals` (gpt-5.4-mini)     | **11.0s**  | 15.7s | **parallel — the long pole**; reasoning-heavy (avg out 1867 tok) |
| client parse + skill resolve + write       | sub-second |       | not part of the wait                                             |

**Where the 10–30s goes:** `extract-cv-text` (2.2s, PDF) → **then** the parallel LLM stage, gated by the slower of the two = **`extract-proof-signals` ~11s p50 / ~16s p90**. Total ≈ **13s p50 / ~19s p90** (matches the reported 10–30s; the >20s tail is p90+ proof-signals + PDF parse).

**Proposed cuts (ranked):**

1. **Take `extract-proof-signals` off the critical wait (biggest lever).** It's the long pole (11s) and produces `primary_domain` + proof_signals. Review needs the resume-extractor fields (name/edu/experience/skills) to render; `primary_domain`/proof_signals can land **async** and backfill (they gate the feed on Home, not the onboarding screens). Removing it from the blocking wait drops the felt wait to ≈ `extract-cv-text` + resume-extractor = **~9.5s p50**.
2. **Overlap the wait with input (the reorder — see below).** Even ~9.5s should not be a spinner-stare.
3. **Fan-out:** already a 2-way parallel (extractor ‖ proof-signals). Splitting resume-extractor further (per-section) is marginal for one JSON doc — not worth it vs. #1/#2. `extract-cv-text` (2.2s) is small; leave it.

**Background extraction during the pickers — FEASIBLE, via a reorder.** Today the user stares at the spinner at step 0 (the wall). Instead: **upload (screen 1) → direction/preferences (screen 3 content, which needs NO extraction: goal, location, work arrangement, practicum) → review last (screen 2 content).** Extraction runs in the background while the user fills the extraction-independent pickers; by the time they reach review, the ~9.5–13s extraction has almost always completed (picker input > extraction time).

- **Failure path (extraction fails mid-pickers):** the review step, reached last, renders the existing manual-entry state ("we couldn't read your CV — fill these in"). The user's direction/preferences inputs are already saved (profile row exists from the first advance). Honest degradation, no lost work.
- **Blocker:** none structural — it requires (a) creating the profile row on upload/advance so background writes have a target (this is the auth-trigger regardless-fix, below), and (b) the review step tolerating "extraction still running" with a light inline loading state for the tail case. Both are in the onboarding surface.

## Requirement B — target interaction cost (happy path)

- **Full path (clean CV):** target **≤ 8 taps** — situation card (1) + file select/drop (1) + Continue (1) · **review = 1 glance + 1 "Looks good" tap** (locked: review-as-confirmation) · goal (1) + location (1) + work-arrangement (1) · launch (1). No typing when extraction is clean.
- **Skip path (via pickers):** target **≤ 8 taps + 2 typed fields** — situation (1) + Skip (1) · education level picker (1) + start-date picker (1) [institution + field typed — the two unavoidable free-text fields] · goal (1) + location (1) + work (1) · launch (1). Everything that _can_ be a picker is a picker; typing is confined to the two identity fields extraction would otherwise fill.
  These are design targets, not measurements — the build plan holds each screen to them.

## Requirement C — skip-path follow-through (Home nudge)

No-CV users get a **persistent "add your CV" banner on Home, sibling to `GoalRefinementNudge`** (golden-tint pattern; dismissible, re-surfaces per session until a CV exists; **banner, never popup**).

- **Copy (truthful):** names what a CV unlocks — "Add your CV to unlock job matches, a tailored CV, and skill-gap analysis" (grounded in the real gap: no CV → `primary_domain` null → gutted feed + contentless CV-gen).
- **Event contract:** `cv_nudge_viewed` · `cv_nudge_clicked` · `cv_nudge_dismissed`; upload attribution = when a nudge-originated upload completes, stamp source on `resume_uploaded` (e.g. `{source:"home_nudge"}`).
- **Re-engagement:** this banner is the landing target for the future confirmed-but-no-CV re-engagement email (deep-link → Home with the nudge focused).
- **Cross-lane:** the banner mounts on Home (redesign lane owns Home). Spec is here + in the event contract; its actual mount is a cross-lane contract item.

## Born-instrumented (per screen) — event contract

Rule: **every screen emits `_viewed` on arrival AND `_completed` on advance; every escape hatch has its own event.** Today only `onboarding_step_completed` fires, so step-0 bounces are inferred, not observed.

- **Screen 1:** `onboarding_screen_viewed{screen:"cv_upload"}` · `onboarding_cv_upload_started` · `resume_uploaded` (exists) · `onboarding_cv_extract_failed{reason}` · `onboarding_cv_skipped` · `onboarding_step_completed{step_index:0}`.
- **Screen 2 (review):** `onboarding_screen_viewed{screen:"review"}` · `onboarding_section_edited{section}` · `onboarding_step_completed{step_index:1}`.
- **Screen 3 (direction):** `onboarding_screen_viewed{screen:"direction"}` · `onboarding_step_completed{step_index:2}`.
- **Screen 4 (springboard):** tutorial events (exist) · `onboarding_completed{duration_ms}` (exists) · `onboarding_launched_to_home`.
- **Home skip nudge:** `cv_nudge_viewed/clicked/dismissed` + `resume_uploaded{source}` attribution.

## The three regardless-fixes (status + spec)

**Status: UNBUILT** — recommended in the funnel investigation, held; no build ruling issued yet. Specs:

1. **Auth-trigger profile row.** Create the `profiles` row via a server-side `handle_new_user` trigger at confirm/OAuth (there is none today; the row is client-side on first Continue). Makes every confirmed user tracked + re-engageable, gives background extraction a write target, and nearly eliminates the "no profile" category (even the OAuth zero-event user gets a row). RLS unaffected (`auth.uid()=id`).
2. **OAuth callback hardening.** `AuthCallback.jsx` swallows exchange errors into a generic `/login?oauth_error` with no server log — harden + log so the ~1 zero-event failure (and future ones) is visible and recoverable.
3. **AdminLaunch auth.users stage.** `admin_activation_funnel()` starts at "Started onboarding" from `profiles` — no signed-in top stage, so the step-0 abandoners are invisible. Prepend `COUNT(*) FROM auth.users WHERE last_sign_in_at IS NOT NULL AND NOT is_internal_user(id)`; source "Recent signups" from an auth.users admin RPC. **`is_internal_user` verified complete** (2026-07-21): its 5 UUIDs are Eli, two Isaac accounts, Yishai, and Noms (`90bcf097…`); no bare internal account is uncovered — so the "Noms miss" is _not_ in the function; it's any count surface that fails to _apply_ `is_internal_user`. The fix must apply it to the new stage.

## Cross-lane contracts (relayed via Eli's hub — Home lane owns Home)

1. **Arrival payoff.** Onboarding emits a completion handoff signal — proposed: navigate to Home with `?welcome=1` (or set a `just_onboarded` flag on the profile). Home reads it to play a first-landing entrance state (populated master CV + matches revealing in). Onboarding builds only its launch-out transition; the entrance state is Home-lane.
2. **Which Home a new signup lands on (rollout).** Under a flag-gated redesign (flag-off default), **a new signup lands on the CURRENT live Home** until the flag flips. So the arrival entrance state must **no-op gracefully on today's Home** and only "light up" once the Home-redesign lane ships its entrance handler. The handoff signal (`?welcome=1`) is safe to send regardless — an un-upgraded Home ignores it.
3. **Skip-path Home nudge mount** (Requirement C) — the banner component + events are specced here; its mount on Home is Home-lane.
