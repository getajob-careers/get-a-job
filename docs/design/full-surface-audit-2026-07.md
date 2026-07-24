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

- **Surfaces not loaded:** Landing, Login/ResetPassword/AuthCallback, Onboarding /
  OnboardingV2 / OnboardingEntry (the onboarding FLOW, high-value), StoryBank,
  Roadmap, Resources, Calendar, Internship, SkillDevelopmentAdvisor, Linkedin,
  CareerAgent, Admin / AdminLaunch / Subagents, Privacy / Terms, Jobs/JobsRouteGate
  redirects.
- **Depth not yet done on ANY surface:** button-by-button dead-click testing;
  empty / loading / error state coverage per surface (force each state); mobile
  breakpoint pass (narrow viewport, drawers, sticky bars); keyboard/focus a11y walk;
  form submit/validation paths; both flag states for every surface (Pass 1 only did
  both for Home + Career).

## Closed this session (context)

- **S4** (corpus scoring main-thread freeze) - FIXED + LIVE, PR #738 (`5905ed6`).
- **S5** (named sub-AA tertiary offenders -> secondary) - FIXED + LIVE, PR #739
  (`bbd7ad7`).
- **Finale** (global reduced-motion fallback, audit N1+N2) - FIXED + LIVE, PR #735.
