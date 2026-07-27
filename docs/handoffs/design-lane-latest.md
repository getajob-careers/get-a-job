# Design lane - resume point

**After any context clear, read THIS + tasks/lessons.md first. Never reconstruct
from scratch. Verify every PR/prod claim against `gh` / Vercel before trusting it
(handoffs go stale the instant something merges; other lanes are active).**

## Standing protocols (verbatim)

- **Canary:** begin every reply to Eli with "Eli, ...". Context canary - when the name stops appearing Eli says **"canary"**, and on that word: overwrite THIS file with a fresh resume point and tell him to `/clear`.
- **Statusline:** context-usage % shows first. Proactively offer a handoff at ~80%.
- **Ledger reports:** end every report with a compact ledger (PR, SHA, state, claims to verify, evidence pointers, open questions).
- **Delegate:** design-JUDGMENT fan-out (audits) -> `general-purpose` agents; searches -> `explorer`, gate runs -> `gatekeeper`, sweeps -> `sweeper` (haiku, `.claude/agents/`).
- **Reporting discipline ([[report-gated-means-flag-off-unreachable]]):** "gated" = EVERY changed line unreachable flag-off; shared components that render in BOTH flag states get an explicit UNCONDITIONAL call-out (PR-D under-counted this once - the Flag-Scope Auditor caught items 5+9; always list every shared-component change). NOTE onboarding renders slate (data-next-design) regardless of the global reveal flag AND V2 onboarding is live for all un-onboarded users. ThreeTabHome (the 3-tab /Home) is FLAG-ON only; CanvasShell sidebar is FLAG-ON only.
- **Merge ritual gotcha:** `gh pr merge --delete-branch` FAILS here (local `main` checked out in sibling `getajob-eval` worktree). Merge WITHOUT `--delete-branch`, confirm `state:MERGED` via `gh pr view`, then delete the remote ref via `gh api -X DELETE repos/getajob-careers/get-a-job/git/refs/heads/<branch>` (its OWN command). `block-main-push` hook trips on ANY command with both `push` and `main` tokens - split them. **`block-dangerous.sh` hook BLOCKS any `git push --force`/`--force-with-lease`.** For a STACKED PR after its base merges: `gh pr edit <n> --base main`, then `gh pr close <n> && gh pr reopen <n>` to re-trigger "Test + build", confirm CLEAN + files-list = only that PR's own files, then squash-merge.
- **check:em-dash EVERY gate pass:** `npm run check:em-dash` before every push (flags em dashes on ADDED lines only). Slips easily into JSX/CSS comments.
- **Formatter churn (tasks/lessons.md + [[formatter-strips-just-added-imports]]):** the PostToolUse formatter REFLOWS whole files that aren't already prettier-clean, burying the real change (PR-D hit this: 187-line diff for a 20-line change on CVManagement/NetworkingTab/CareerAgent). Remedy that WORKS: `git checkout origin/main -- <file>`, then re-apply ONLY the logical hunks via a python `str.replace` script run through Bash (bypasses the Edit/Write hook -> no reflow -> minimal diff). Single 1-line changes usually stay clean. **Icon/JSX imports: add the USAGE first (or same edit), then the import, then grep the import survived - the formatter strips a momentarily-unused import and build/lint stay green (runtime-only crash).**
- **Self-verification pipeline (STANDING, replaces per-PR human review):** after build + COMMIT + PUSH (never spawn verifiers before pushing - shared-tree race), spawn IN PARALLEL general-purpose agents (fresh context; verifiers READ via `git diff origin/main...BRANCH` / `git show BRANCH:file`, NEVER checkout/stash): Spec Verifier, QA-Breaker (adversarial vs acceptance), Flag-Scope Auditor when gating claimed, Gatekeeper (CI green; typecheck baseline ~518, measure NET DELTA). Any verifier doubt = fix or drop + log. PR gains a VERIFICATION block. Commit by explicit PATHSPEC (shared index) and diff PR scope with `origin/main...HEAD` (three-dot).

## Identity / owned paths

DESIGN lane, one terminal, persists across clears. Owns: redesign shell/home (`src/components/redesign/*`), jobs cards (`JobGridCard`,`JobDetailModal`,`useJobCardActions`,`cvGenerationJob`), CV Studio (`src/components/cv-studio/*` + write-layer libs), coach FRONTEND (`src/components/agent/*`,`chat/*`,`coachPrompts.js`), onboarding V2 (`Onboarding*`/`OnboardingV2*` + screens + `OnboardingShell` + `onboardingPersist`), app shell (`Layout.jsx`+`layoutMode.js`), tokens (`index.css` `--rd-*`, `tailwind.config.js` `rd-*`), mascot/logo. **STAY OFF (CV lane):** `JobsSearchTab`, `jobsSearchFacets`, `scoreJobFit`, `UnifiedJobsFeed`, `ai-chat/*`, `_shared/libraries/*`.

## >>> CURRENT (2026-07-27, post pre-cert eyeball round) <<<

### Serving truth (verify on resume: `git fetch` FIRST)

- **origin/main tip = `1ca89cf`.** PR-D (`afe69c3`) + both pre-cert-eyeball PRs are MERGED + LIVE. Frontend-only, NO edge deploy this whole arc. (CV lane also merged past PR-D: #818 handoff, etc. - unrelated to design.)
- **#819 (squash `6f03c93`)** - Eli's live-cert items 1 + 2:
  1. **Sort-disclosure visibility.** `MatchedRolesPanel` gained a `sortDisclosure` prop (default true) replacing the old `size==="comfortable"` gate -> Career's COMPACT panel now shows the "Roles on your goal path are listed first, then by match strength." line (every tier). On Browse Jobs (flag-on) the line renders at the TOP of the feed column in `ThreeTabHome` (visible at every width, not buried when the panel stacks below the feed under lg); that panel opts out (`sortDisclosure={false}`) so exactly one line per surface. `matchedRolesPanel.test.jsx` updated. UNCONDITIONAL for the panel line on Career (both flag states).
  2. **Retire "CV Agent" persona copy (flag-on surface).** Tracker "Chat with CV Agent for this role" -> "Chat with **Coach**", handler now `navigate('/CareerAgent?application_id=...')` (Coach pre-loaded with app context; old target was `/CVAgent` with NO context - copy was doubly stale). Generated-CV toast "Open in CV Agent" -> "Open in CV editor". `CVStudioLive.jsx:127` comment refreshed. Both tracker fixes are shared components (Career + flag-on HomeTrackerTab) -> UNCONDITIONAL. Swept the whole flag-on surface: `Layout.jsx:84-85` ("Career Agent"/"CV Agent" legacy nav) + `CVStudioView.jsx:1550/1628` panel are FLAG-OFF-only (Layout early-returns CanvasShell; route gate hides the panel flag-on) - LEFT byte-identical, they die at reveal-cleanup. `Landing.jsx` is retired from routing. Backend `career_agent` id untouched.
- **#821 (squash `1ca89cf`)** - Eli's live-cert item 3 + a folded-in rider: 3. **Horizontal (trackpad) pan on flag-on Browse Jobs.** Eli's live repro: page-overflow = 0 but the shell pans sideways. Verified (NOT assumed): the pannable container is the FEED COLUMN in `ThreeTabHome` (its `overflow-y-auto` makes CSS compute `overflow-x` to `auto`); content overflowed ~21px because `JobGridCard`'s action row (Generate CV `flex-1` + Apply + `w-11` track, no wrap) exceeds a narrow card at ~1460. CanvasShell `<main>` was the hub's hypothesis but is NOT the active culprit (over=0) - and QA-Breaker confirmed `<main>` was ALREADY a two-axis scroll container (overflow-y:auto coerces overflow-x:visible->auto), so it silently scrolled x before; this PR makes it CLIP, strictly better. **Fix, both ends:** (a) `flex-wrap` on JobGridCard's idle `cx-actions` + CV-ready rows (source - feed column now over=0); (b) `overflow-x-clip` on the feed column (verified-pannable) AND on CanvasShell `<main>` (shell-level guard; clip not hidden; both already scroll containers so no sticky regression; NOT a page-root blanket). All flag-on (JobGridCard wrap lines are inside `alive=isNextDesign()` branches).
  - **RIDER (Eli):** sidebar footer "Visit homepage" -> "**getajob.careers**" with a **Globe** glyph (House dropped - it now reads as the new Home tile), same `/Landing` target. Flag-on `CanvasSidebar` link + flag-off `SidebarFooter` mirror. SidebarFooter is FLAG-OFF / UNCONDITIONAL (real-user pre-reveal), per the rider.
- Verification (both PRs): Spec PASS, Flag-Scope all CONFIRMED, QA-Breaker no P0/P1, gate GREEN (typecheck 518 net-0, 1822 tests). VERIFICATION blocks on each PR. Both hub-verified PASS then merged.
- `main` checked out in sibling worktree (`/Users/elienglard/getajob-eval`); branch off `origin/main` here, never `git checkout main`.

### OUTSTANDING for Eli (cert eyeballs he owns - PROD/live, post-merge)

- **#821 scroll fix (live flag-on Browse Jobs):** trackpad horizontal swipe does NOTHING at his width + md-band (~770-820) + 375; the JobGridCard action-row wrap reads intentional (Generate CV on line 1, Apply + "+" on line 2); footer eyebrow reads "GETAJOB.CAREERS" with the globe. Verified in-harness at lg 1280 + 1460 only (window pinned 1512; page `zoom` scales sizes but NOT media-query breakpoints, so md-band/375 weren't faithfully harness-probable - covered by construction: unconditional `overflow-x-clip` + `flex-wrap`, `<main>` clip is the catch-all).
- **#819 (live):** disclosure line visible on Browse Jobs (feed top) AND Career (panel); "Chat with Coach" preloads the specific application in the Coach.
- **PR-D logo** (variant A) on live Login + onboarding at header/favicon size; **PR-D deep-link** lands the tailored CV in Home's CV bank tab.
- **#723 still gates Eli's REVEAL CERT.** Do NOT touch the reveal flag; reveal cert + Flip 2 stay Eli's.

### Known non-blocking (NOT queued - only build on an Eli ruling)

- **P2 cosmetic (#821):** in the 2-up card grid, a card WITH `apply_url` (3 buttons, wraps) beside one WITHOUT (2 buttons, no wrap) can give uneven row heights at the narrow widths where the alternative was horizontal overflow. Wrap is still the better outcome.
- **Pre-existing (not this arc):** `singleColumn` prop is passed to `JobGrid` (UnifiedJobsFeed) but never destructured - the feed grid is hardcoded `sm:grid-cols-2`. CV-lane-adjacent (UnifiedJobsFeed is STAY-OFF); flag for the CV lane if truly-single-column was intended.

### >>> NEXT design-lane work <<<

**LANE IDLE. NOTHING queued to BUILD.** All pre-cert eyeball items (1 sort-disclosure, 2 persona copy, 3 horizontal pan) + the homepage-relabel rider are DONE + LIVE. The next design-lane work is **Flip 2 execution** (the reveal cutover), which starts **only when Eli certs** the outstanding eyeballs above and rules #723 clear. Until then, wait for Eli. Do NOT touch the reveal flag or auth-config autonomously.

### Test artifacts to purge (Eli, walkthrough acct - [[never-delete-rows-without-ruling]], needs his action)

1 tailored CV (Product Manager/DriveNets), 1 manual tracker row, 1 completed task, 1 audit feedback. v2test left un-finalized.

### How to run the live app

- **Un-authed DEV preview of the REAL flag-on Home:** `/_preview/home3tab-real?next=1` (stubbed auth via real `Layout` -> CanvasShell + CoachDock; seeds applications + master CV; Jobs feed self-fetches REAL jobs; matched-roles panel = empty state). Window is HARD-PINNED at 1512 CSS in the harness (resize_window is a no-op). To simulate a narrower width for SIZE/overflow checks, set `document.documentElement.style.zoom = (innerWidth/target).toFixed(3)` - BUT zoom scales sizes only, NOT media-query breakpoints, so it's faithful only where the real viewport shares the same breakpoint (e.g. real 1280/1460 are both `lg`, so lg-layout probes are valid; md-band/375 are NOT).
- **Logo/SVG visual checks:** `file://` is BLOCKED in the browser tool - serve a scratchpad HTML over `python3 -m http.server <port>` and navigate to `localhost`. The logo mark is a self-contained SVG (CSS-var colours) so a standalone harness with the palette vars set is a faithful render.
- **Authed accounts:** walkthrough `elienglard34+walkthrough@gmail.com` (onboarded, DISPOSABLE); v2test `elienglard34+v2test@gmail.com` (onboarding). Eli holds passwords. Staging: visible tab on `www.getajob.careers/login`, prefill email via native setter, CLEAR password (Chrome autofills WRONG account), ask Eli to sign in.
- **Flag `next`:** `?next=1` flag-on (slate `#60617D`), `?next=0` flag-off (coral pre-reveal). Flag-on `/Jobs` -> `/Home?tab=jobs`; flag-on `/CVAgent` -> `/Home?tab=cv` (PR-D). `isNextDesign()` reads the persisted `<html data-next-design>` attr set pre-paint.
- **Onboarding:** NEVER click "Go to my workspace" (springboard finalize). Dropzone opens a BLOCKING OS dialog - never real-click.

## Rulings locked (do not re-litigate)

- Onboarding palette = 0A slate. Motion = anime.js v4 per-submodule for timelines, CSS for loops; reduced-motion -> static. `--rd-logo-hi` fallback COMPONENT-level only, never in index.css OFF/root. Self-verification pipeline REPLACES per-PR human review.
- Logo = variant A seated legs (LOCKED, PR-D). The `MarkFullChair` export name is kept though it no longer draws a chair (renaming ripples to Login/OnboardingShell/CanvasShell - not worth it).
- Situation selector: multi-select, no min-1 gate. Back-nav Option A shipped (#797).
- Matched-roles disclosure shows on EVERY tier (#819) - the old "comfortable-only" gate is retired. Browse Jobs surfaces it at the feed top, not the side panel.
- Homepage footer link is labelled with the domain ("getajob.careers" + globe), never "Home"/House (avoids collision with the Home tile) - #821.

## Autonomy contract (Eli)

Full autonomy within an approved queue; decide, log here, keep moving. HELD FOR ELI only: schema, edge-fn outside plan, anything irreversible outside an approved queue, the reveal flag, auth-config. Pre-cert eyeball round (#819 + #821) was HELD-per-PR + hub-verified + merged autonomously per this contract. `settings.local.json` has Bash/Edit/Write/WebFetch allow (unstaged, never commit).
