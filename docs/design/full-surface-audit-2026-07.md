# Full-surface audit - 2026-07

Standing "intense audit" of the app: every page/button/feature, both flag states,
looking for broken interactions, dead buttons, console errors, mobile breakpoints,
and empty/loading/error states. Findings ranked **blocker / should / nice** with
`file:line` where known.

**Flag param:** `?next=1` = flag-on reveal, `?next=0` = flag-off. Signed in as Eli
(already-onboarded user) on the local dev server. LIVE product - severity matters.

> **Coverage status: PASS 1 (partial) - console-health + render smoke on the core
> journey.** This pass loaded the core authenticated surfaces and measured, per
> surface, console errors / uncaught exceptions / React `Maximum update depth`
> warnings / that content actually rendered. It is NOT yet the full button-level,
> empty/loading/error-state, mobile-breakpoint audit the standing prompt calls for.
> The "Not yet audited" list below is explicit - no silent caps. Extend in the next
> session; keep appending findings here.

## Findings

### SHOULD

- **S-A1 - `Career.jsx` pre-existing render loop (`Maximum update depth exceeded`),
  both flag states.** On `/Career` load React fires the "Maximum update depth
  exceeded" warning - flag-off (`?next=0`) ~2x, flag-on (`?next=1`) ~3x - attributed
  to `Career` (src/pages/Career.jsx). A `setState` inside a `useEffect` whose
  dependency changes every render; it self-resolves after a few iterations, so no
  user-visible break today, but it drives extra renders during initial load on the
  flagship surface. Independent of the jobs feed (Home is clean in both states; the
  count is the same order with the S4 chunked scorer stashed vs applied, so S4 is
  loop-neutral). **Fix:** locate the offending effect in `Career.jsx`, stabilize the
  unstable dep (useMemo/useCallback/ref). Own scoped PR.
  _Evidence:_ dev console, `console.error` interceptor counted fresh warnings on
  `/Career?next=0` (2) and `/Career?next=1` (3); `/Home` both states = 0.

- **S-A2 - Whole-corpus fetch latency ~13s on the flag-on jobs surface (pre-existing,
  NOT scoring).** `JobsSearchTab` paginates the full active-IL corpus (6,140 rows)
  in sequential 1000-row Supabase round-trips (`src/components/jobs/JobsSearchTab.jsx`
  ~149-166); measured ~13s wall to reach the full 6,140 count. First page (~1000)
  paints in <1s so results appear fast, and S4 made scoring non-blocking within that
  window, but "Best match" ranking is not final until the full corpus lands ~13s in.
  **Fix candidates (own PR, needs measurement):** a single ranged fetch / larger page
  size, a server-side pre-ranked endpoint, or parallel page requests. Distinct from
  S4 (that was the main-thread scoring freeze, now shipped).

### NICE

- **N-A1 - `singleColumn` prop unused in `JobsSearchTab`** (lint warning
  `unused-imports/no-unused-vars` at the props destructure). Pre-existing. Either wire
  it (the flag-on grid ignores it) or drop it. Cosmetic; not gate-blocking (warning).

- **N-A2 - Typecheck baseline carries ~519 pre-existing errors** (shadcn
  Command/RefAttributes, react-query `{enabled?}`, StoryBank). `deno`/tsc is
  continue-on-error in CI. Tracked separately (edge-function-typecheck-backlog); noted
  here so the audit's net-delta discipline stays honest.

## Pass 2 findings (2026-07-24)

Pass 2 swept every remaining authenticated surface (console-health + render
smoke, both by client-side nav so a fresh mount is measured), using the same
`console.error` interceptor method as Pass 1. Signed in as Eli
(already-onboarded), so the logged-out surfaces (Landing, Login /
ResetPassword / AuthCallback, the Onboarding FLOW) redirect and are still
outstanding, called out below (no silent cap).

### SHOULD (Pass 2)

- **S-B1 - Calendar + Internship agent-drawer render loops (`Maximum update
depth exceeded`).** Same root cause as S-A1: the page-context `useEffect`
  listed the whole `agentDrawer` context object as a dependency, so it
  ping-ponged (cleanup `setPageContext(null)` + body `setPageContext(ctx)` are
  `null<->ctx` transitions the shallow guard never bails on, each minting a
  fresh `agentDrawer`). Measured fresh-mount: Calendar 110 warnings, Internship 34. Profile carried the identical anti-pattern but happened to settle clean;
  fixed alongside so it can never regress. **FIXED** (PR #743): destructure the
  stable `setPageContext` and depend on that, mirroring Home/Career. Re-swept:
  Calendar 0, Internship 0, Profile 0.

- **S-B3 - StoryBank nested `<button>` (invalid DOM nesting / a11y).**
  `StoryCard` renders the whole card header as a `<button>` (the expand toggle)
  with the edit / delete / confirm action `<button>`s nested inside it, tripping
  React's `validateDOMNesting` warning (`<button> cannot be a descendant of
<button>`). Works today via `stopPropagation`, but nested interactive controls
  are invalid HTML and break keyboard/screen-reader semantics. **Fix:** make the
  outer card a non-interactive `<div>`; the toggle button and the action cluster
  become siblings. **FIXED**: re-swept StoryBank after the fix - 0 nesting
  warnings, story cards + edit/delete controls still render, toggle still expands.

### Pass 2 console-health matrix

All swept over a ~5s fresh-mount window; "clean" = 0 errors, 0 uncaught, 0
`Maximum update depth`, content rendered.

| Surface                    | result                        |
| -------------------------- | ----------------------------- |
| Profile                    | clean                         |
| Roadmap                    | clean                         |
| Resources                  | clean                         |
| Tasks                      | clean                         |
| Calendar                   | **loop x110** (S-B1, fixed)   |
| StoryBank                  | **nested-button warn** (S-B3) |
| CareerAgent                | clean                         |
| CVAgent                    | clean                         |
| InterviewCoach             | clean                         |
| SkillDevelopmentAdvisor    | clean                         |
| Linkedin                   | clean                         |
| Internship                 | **loop x34** (S-B1, fixed)    |
| Jobs (-> Home redirect)    | clean                         |
| Subagents (-> CareerAgent) | clean                         |
| Admin                      | clean                         |
| AdminLaunch                | clean                         |
| Settings                   | clean                         |

## Console-health matrix (Pass 1)

| Surface             | flag-off (`?next=0`) | flag-on (`?next=1`) | content rendered |
| ------------------- | -------------------- | ------------------- | ---------------- |
| Home                | clean                | clean               | yes              |
| Career (jobs)       | **loop x2** (S-A1)   | **loop x3** (S-A1)  | yes              |
| CVAgent (CV studio) | clean                | -                   | yes              |
| Tasks               | -                    | clean               | yes              |
| InterviewCoach      | -                    | clean               | yes              |
| Profile             | -                    | clean               | yes              |
| Settings            | -                    | clean               | yes              |

"clean" = 0 console errors, 0 uncaught exceptions, 0 `Maximum update depth` warnings,
content present, over a ~5.5-6s post-load window.

## Not yet audited (outstanding for Pass 2+)

- **Surfaces not loaded:** AuthCallback (needs a real token), Onboarding /
  OnboardingV2 / OnboardingEntry (the onboarding FLOW lifecycle, high-value - HELD,
  needs an un-onboarded test user), StoryBank, Roadmap, Resources, Calendar,
  Internship, SkillDevelopmentAdvisor, Linkedin, CareerAgent, Admin / AdminLaunch /
  Subagents, Privacy / Terms, Jobs/JobsRouteGate redirects.
  (Landing, Login, ResetPassword, onboarding step-preview: DONE in Pass 2 above.)
- **Depth not yet done on ANY surface:** button-by-button dead-click testing;
  empty / loading / error state coverage per surface (force each state); mobile
  breakpoint pass (narrow viewport, drawers, sticky bars); keyboard/focus a11y walk;
  form submit/validation paths; both flag states for every surface (Pass 1 only did
  both for Home + Career).

## Pass 2 - logged-out surfaces (2026-07-24)

Method: logged-out dev session (localhost `sb-*-auth-token` cleared; localhost
origin only, production session untouched). Per-surface console tap (interceptor

- client-nav) + a static interaction/a11y probe (dead controls, accessible names,
  alt text, tap-target < 44px, unlabeled inputs, heading order).

Console health: **Landing, Login, ResetPassword, and the onboarding step preview
all CLEAN** (0 `Maximum update depth`, 0 `validateDOMNesting`, 0 other console
errors) over a ~6s post-load window.

Findings:

- **P1 - ResetPassword infinite "Verifying reset link…"** - FIXED this pass
  (PR pending on branch `eli/reset-password-expired-link-state`). Reached WITHOUT a
  valid recovery token (expired/reused link, or a direct visit), Supabase never
  fires `PASSWORD_RECOVERY`, so `ready` stays false and the page hangs on the
  "Verifying reset link…" spinner forever - no timeout, no error, no escape
  (design-craft rule 7). Fix: an 8s timeout flips to an honest "This reset link
  isn't valid" state with a "Back to sign in" button -> `/login`. Verified live on
  dev (error state renders at 8s; button routes to /login).
- **P2 - sub-44px tap targets** (WCAG 2.5.5 / design-craft rule 8):
  - Landing: 22 interactive els < 44px, incl. carousel Prev/Next arrows 40x40 (two
    carousels), header "Log in" 48x33, "Start" 70x39, plus several 18-20px text-link
    CTAs ("See how it works", "See your roadmap").
  - Login: "Continue with Google" 362x42 and Turnstile "Verifying…" 362x40 (2-4px
    under), "Forgot?" 44x17, "Create an account" 112x19 (text links).
  - Onboarding step: primary "Upload to continue" 148x40 (4px under), "Skip - I'll
    enter details" 177x18, "About Get A Job" 93x18.
    Inline text links are commonly exempt; the defensible fixes are the icon/CTA
    controls (carousel arrows 40x40, header buttons, primary CTAs at 40-42px height).
    Scope as one batched tap-target pass, not per-PR.
  - **FIXED (2026-07-24, PR tap-target-44-batch):** the defensible CTA controls now
    meet the 44px floor. On re-verify against current `main`, the two Landing carousel
    arrows (`.lv-caro-btn`) were ALREADY 44x44 (the audit's 40x40 was a stale live
    measurement, fixed by a prior change) - no action needed. Bumped: (1) shared
    `RdButton` (`min-h-[44px]`) - covers onboarding "Upload to continue" + Login submit
    - every primary pill app-wide; (2) Login "Continue with Google" (`min-h-[44px]`,
      matches the submit beneath it); (3) Landing nav "Log in" (`.lv-nav-login`) and
      (4) "Start" (`.btn-sm`) via the `rd-hit-44` invisible-::before pattern (keeps the
      compact 33/39px visual, extends the hit area to 44x44). Browser-verified live on
      dev: Landing Log in/Start = 44x44 ::before; Login Google + submit = h44. Text-link
      CTAs (Forgot?, Create an account, Skip, About, See how it works) left exempt.
- **P2 - ResetPassword is entirely off-token** (design-craft rule 1): raw hex
  (`#FAFAFA`/`#0A0A0A`/`#E5E5E5`, `bg-red-50`, a gradient), no `rd-*` tokens. The
  P1 dead-end fix matched the file's local idiom to stay surgical; a full token
  migration of this page is a separate cosmetic pass.
- **P2 - unlabeled `<input type=file>`** on Landing + the onboarding step (no
  label / aria-label). On Landing this is likely the known "fake dropzone" (queued
  for removal); still an a11y gap - add an aria-label or associate a `<label>`.

HELD (blocked): the REAL onboarding FLOW lifecycle (`OnboardingEntry` /
`OnboardingV2`) needs an authenticated-but-UN-onboarded user - I'm onboarded, so
it redirects, and Eli's `onboarding_step` must not be reset. `/_preview/onboarding/
:state` audits the styled steps but not the flow's state machine. Needs a fresh /
throwaway un-onboarded test account.

Still outstanding for Pass 2: AuthCallback (needs a real token in the URL),
and the interaction-DEPTH pass on the authenticated surfaces (button-by-button
dead-click, forced empty/loading/error states, mobile breakpoints, keyboard/focus
walk, both flag states).

## Closed this session (context)

- **S4** (corpus scoring main-thread freeze) - FIXED + LIVE, PR #738 (`5905ed6`).
- **S5** (named sub-AA tertiary offenders -> secondary) - FIXED + LIVE, PR #739
  (`bbd7ad7`).
- **Finale** (global reduced-motion fallback, audit N1+N2) - FIXED + LIVE, PR #735.
