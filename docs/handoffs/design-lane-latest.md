# Design lane - resume point

**After any context clear, read THIS + tasks/lessons.md first. Never reconstruct
from scratch. Verify every PR/prod claim against `gh` / Vercel before trusting it
(handoffs go stale the instant something merges; other lanes are active).**

## Standing protocols (verbatim)

- **Canary:** begin every reply to Eli with "Eli, ...". Context canary - when the name stops appearing Eli says **"canary"**, and on that word: overwrite THIS file with a fresh resume point and tell him to `/clear`.
- **Statusline:** context-usage % shows first. Proactively offer a handoff at ~80%.
- **Ledger reports:** end every report with a compact ledger (PR, SHA, state, claims to verify, evidence pointers, open questions).
- **Delegate:** design-JUDGMENT fan-out (audits) -> `general-purpose` agents; searches -> `explorer`, gate runs -> `gatekeeper`, sweeps -> `sweeper` (haiku, `.claude/agents/`).
- **Reporting discipline ([[report-gated-means-flag-off-unreachable]]):** "gated" = EVERY changed line unreachable flag-off; shared components that render in BOTH flag states get an explicit UNCONDITIONAL call-out. NOTE: **post-Flip-2 the redesign is the DEFAULT** - "flag-off" now means the `?next=0` kill-switch cohort, not the majority. A change that only affects flag-on now affects ALMOST ALL real users; a change that must stay byte-identical for the `?next=0` escape hatch is the new "flag-off invariance." Onboarding renders slate (data-next-design) regardless of the global flag AND V2 onboarding is live for all un-onboarded users. ThreeTabHome (the 3-tab /Home) is FLAG-ON only (now the default); CanvasShell sidebar is FLAG-ON only.
- **Merge ritual gotcha:** `gh pr merge --delete-branch` FAILS here (local `main` checked out in sibling `getajob-eval` worktree). Merge WITHOUT `--delete-branch`, confirm `state:MERGED` via `gh pr view`, then delete the remote ref via `gh api -X DELETE repos/getajob-careers/get-a-job/git/refs/heads/<branch>` (its OWN command). `block-main-push` hook trips on ANY command with both `push` and `main` tokens - split them. **`block-dangerous.sh` hook BLOCKS any `git push --force`/`--force-with-lease`.** For a STACKED PR after its base merges: `gh pr edit <n> --base main`, then `gh pr close <n> && gh pr reopen <n>` to re-trigger "Test + build", confirm CLEAN + files-list = only that PR's own files, then squash-merge.
- **check:em-dash EVERY gate pass:** `npm run check:em-dash` before every push (flags em dashes on ADDED lines only). Slips easily into JSX/CSS comments.
- **Formatter churn (tasks/lessons.md + [[formatter-strips-just-added-imports]]):** the PostToolUse formatter REFLOWS whole files that aren't already prettier-clean, burying the real change (it lowercases hex, rewraps prose). Remedy that WORKS: `git checkout origin/main -- <file>`, then re-apply ONLY the logical hunks via a python `str.replace` script run through Bash (bypasses the Edit/Write hook -> no reflow -> minimal diff). Single 1-line changes usually stay clean. **Icon/JSX imports: add the USAGE first (or same edit), then the import, then grep the import survived.**
- **Self-verification pipeline (STANDING, replaces per-PR human review):** after build + COMMIT + PUSH (never spawn verifiers before pushing - shared-tree race), spawn IN PARALLEL general-purpose agents (fresh context; verifiers READ via `git diff origin/main...BRANCH` / `git show BRANCH:file`, NEVER checkout/stash): Spec Verifier, QA-Breaker (adversarial vs acceptance), Flag-Scope Auditor when gating claimed, Gatekeeper (CI green; typecheck baseline ~518, measure NET DELTA). Any verifier doubt = fix or drop + log. PR gains a VERIFICATION block. Commit by explicit PATHSPEC (shared index) and diff PR scope with `origin/main...HEAD` (three-dot).

## Identity / owned paths

DESIGN lane, one terminal, persists across clears. Owns: redesign shell/home (`src/components/redesign/*`), jobs cards (`JobGridCard`,`JobDetailModal`,`useJobCardActions`,`cvGenerationJob`), CV Studio (`src/components/cv-studio/*` + write-layer libs), coach FRONTEND (`src/components/agent/*`,`chat/*`,`coachPrompts.js`), onboarding V2 (`Onboarding*`/`OnboardingV2*` + screens + `OnboardingShell` + `onboardingPersist`), app shell (`Layout.jsx`+`layoutMode.js`), tokens (`index.css` `--rd-*`, `tailwind.config.js` `rd-*`), mascot/logo. **STAY OFF (CV lane):** `JobsSearchTab`, `jobsSearchFacets`, `scoreJobFit`, `UnifiedJobsFeed`, `ai-chat/*`, `_shared/libraries/*`.

## >>> CURRENT (2026-07-27, FLIP 2 SHIPPED - the reveal is LIVE) <<<

### Serving truth (verify on resume: `git fetch` FIRST)

- **origin/main tip = `ed31a47`** (PR #826, squash `ed31a477e5594c789d09ec899e95e8478b1859c0`). **The NEXT_DESIGN redesign is now the DEFAULT for all users.** Frontend-only, NO edge deploy this whole arc.
- **Vercel prod deployment `dpl_5PisB8ZQbCgSu6hn19ywRuRsz5yE`** (READY, target production, commit ed31a47, aliased to www.getajob.careers). Serving-truth verified live: the served HTML carries the flipped bootstrap (`localStorage.getItem("nextDesign") !== "0"`); no `%VITE_NEXT_DESIGN%` / `removeItem` / `envDefault` residue.
- **The flip mechanism (PR #826):**
  - `index.html` bootstrap: default is ON in code (env-decoupled - VITE_NEXT_DESIGN fully removed from the codebase). `?next=0` now PERSISTS `localStorage 'nextDesign'="0"` (the kill switch that STICKS; old code did `removeItem`, which would revert to the new default). `?next=1` persists `"1"` (no-op on the default). Private-mode catch honors the live `?next=` param for that load, defaults on.
  - `src/Layout.jsx`: `revealMode = true` (was `import.meta.env.VITE_NEXT_DESIGN === "1"`). This suppresses the corner "NEXT" preview badge in BOTH Layout.jsx:332 and CanvasShell.jsx:46 - the ONE intentional flag-on-visible change of the flip.
  - `src/lib/nextDesign.js` reader UNCHANGED (still `hasAttribute("data-next-design")`); only its doc comment updated.
  - **OnboardingV2 UNCHANGED** - the `had`-guard (OnboardingV2.jsx:141-148) already composes: default-on user keeps the attr after onboarding (revealed home); `?next=0` user has `had=false` so the attr is stripped on unmount (returns to legacy). Kill switch preserved through onboarding.
  - New test `src/test/nextDesignBootstrap.test.js` executes the REAL index.html bootstrap (6/6): default-on, `?next=0` stickiness, `?next=1` re-enable, legacy-removeItem sweep-in.
- **Verification chain (all clean):** Gate GREEN (typecheck 517 vs ~518 net-1, 1828 tests) - Spec Verifier PASS - QA-Breaker NO BLOCKERS - Flag-Scope CONFIRMED - hub PASS @ 1af61d8 - Eli cert authorized the merge. Launch-critical prior blocker independently re-confirmed CLOSED: onboarding-redirect guard is LIVE at `ThreeTabHome.jsx:48-66` (un-onboarded users are bounced into V2 onboarding under the now-default reveal).
- **Docs updated in-PR (docs-are-part-of-done):** `canvas-tokens.md` + `full-surface-audit-2026-07.md` no longer describe the removed VITE_NEXT_DESIGN precedence; the audit's reveal-cohort ThreeTabHome blocker is marked RESOLVED.
- `main` checked out in sibling worktree (`/Users/elienglard/getajob-eval`); branch off `origin/main` here, never `git checkout main`.

### Rollback (if the reveal needs backing out)

1. **Per-user, live now:** append `?next=0` -> that browser reverts to legacy and sticks.
2. **Vercel instant-rollback:** prior production deploy `dpl_7rCwFmCdDrU9LrhWDurS8TcXBffc` (commit `b106afe`, #827, pre-flip, marked rollback-candidate).
3. **Git:** `git revert ed31a47` -> redeploy.

### OUTSTANDING for Eli (live eyeball, post-reveal)

- **The reveal itself:** open `www.getajob.careers` in a CLEAN browser (no param, no localStorage) -> should be the redesign. Then `?next=0` -> legacy sticks across reloads. Then `?next=1` -> back on. Confirm the "NEXT" badge is GONE for default users.
- Prior-arc cert eyeballs that carried into the reveal (all shipped, verify live): #819 sort-disclosure (Browse Jobs feed-top + Career panel) + "Chat with Coach" preload; #821 no sideways trackpad pan on Browse Jobs + footer "GETAJOB.CAREERS" globe; #824 wide-desktop (>1400px) seamless cream gutters + toolkit tile order (Tasks, Interview coach, LinkedIn, Home, Profile, Career, Story bank, Skill hub, Coach - remainder is Claude's proposed order, re-rule if wanted); PR-D logo variant A on Login/onboarding + deep-link CV bank tab.

### Known non-blocking (NOT queued - only build on an Eli ruling)

- **P2 dev/preview-only (QA-Breaker):** `src/pages/_preview/UnifiedJobsPreview.jsx:287` removes `data-next-design` UNCONDITIONALLY on unmount (others use the `had`-guard). Under default-on, visiting that preview route + navigating away strips the attr app-wide until reload. PROD-SAFE: all `_preview/*` routes are tree-shaken out of production (`SHOW_PREVIEW_ROUTES`/`__PREVIEW_ROUTES__`). One-line fix = match the `had`-guard. Not queued.
- **P2 cosmetic (#821):** uneven 2-up card row heights at narrow widths where a card wraps its action row. Wrap is still the better outcome.
- **Pre-existing (not this arc):** `singleColumn` prop passed to `JobGrid` (UnifiedJobsFeed) but never destructured. CV-lane-adjacent (STAY-OFF).

### >>> NEXT design-lane work <<<

**LANE IDLE. Flip 2 (the reveal) is DONE + LIVE.** Nothing queued to BUILD. The natural next arc is **reveal cleanup** (delete the whole flag mechanism: the index.html bootstrap, `nextDesign.js`, every `isNextDesign()` guard + `nextDesign &&` branch, the flag-off `:root` palette + the `:root[data-next-design]` selector - promote ON values into `:root`; the two homes unify; drop `revealMode`/CanvasShell `revealMode` prop + the badge; retire the legacy Layout shell return). That is a LARGE, IRREVERSIBLE sweep - **HELD FOR ELI's explicit go** (do not start autonomously; it deletes the escape hatch). Until Eli rules, wait.

### Test artifacts to purge (Eli, walkthrough acct - [[never-delete-rows-without-ruling]], needs his action)

1 tailored CV (Product Manager/DriveNets), 1 manual tracker row, 1 completed task, 1 audit feedback. v2test left un-finalized.

### How to run the live app

- **Un-authed DEV preview of the REAL flag-on Home:** `/_preview/home3tab-real?next=1` (stubbed auth via real `Layout` -> CanvasShell + CoachDock). Window is HARD-PINNED at 1512 CSS in the harness (resize_window is a no-op). To simulate a narrower width for SIZE/overflow checks, set `document.documentElement.style.zoom = (innerWidth/target).toFixed(3)` - BUT zoom scales sizes only, NOT media-query breakpoints (faithful only where the real viewport shares the breakpoint; real 1280/1460 are both `lg`, so lg probes valid; md-band/375 are NOT).
- **Logo/SVG visual checks:** `file://` is BLOCKED - serve a scratchpad HTML over `python3 -m http.server <port>` and navigate to `localhost`.
- **Authed accounts:** walkthrough `elienglard34+walkthrough@gmail.com` (onboarded, DISPOSABLE); v2test `elienglard34+v2test@gmail.com` (onboarding). Eli holds passwords. Staging: visible tab on `www.getajob.careers/login`, prefill email via native setter, CLEAR password (Chrome autofills WRONG account), ask Eli to sign in.
- **Flag `next` (POST-REVEAL):** default = flag-ON (slate #60617D redesign). `?next=0` = flag-OFF (legacy coral) kill switch, STICKS. `?next=1` = no-op on the default. Flag-on `/Jobs` -> `/Home?tab=jobs`; flag-on `/CVAgent` -> `/Home?tab=cv`. `isNextDesign()` reads the persisted `<html data-next-design>` attr set pre-paint.
- **Onboarding:** NEVER click "Go to my workspace" (springboard finalize). Dropzone opens a BLOCKING OS dialog - never real-click.

## Rulings locked (do not re-litigate)

- **Flip 2 mechanism (Claude-owned, shipped):** in-code default flip (NOT a Vercel env var - `.env.*` is gitignored, and the flip must ride the merged code). `?next=0` persists `"0"` as the sticky kill switch (mirrors the ?scoring_v2=0 escape hatch). `revealMode = true` suppresses the NEXT badge. Env `VITE_NEXT_DESIGN` fully removed.
- Onboarding palette = 0A slate. Motion = anime.js v4 per-submodule for timelines, CSS for loops; reduced-motion -> static. `--rd-logo-hi` fallback COMPONENT-level only, never in index.css OFF/root. Self-verification pipeline REPLACES per-PR human review.
- Logo = variant A seated legs (LOCKED, PR-D). `MarkFullChair` export name kept though it no longer draws a chair.
- Situation selector: multi-select, no min-1 gate. Back-nav Option A shipped (#797).
- Matched-roles disclosure shows on EVERY tier (#819); Browse Jobs surfaces it at the feed top.
- Homepage footer link labelled with the domain ("getajob.careers" + globe), never "Home"/House - #821.

## Autonomy contract (Eli)

Full autonomy within an approved queue; decide, log here, keep moving. HELD FOR ELI only: schema, edge-fn outside plan, anything irreversible outside an approved queue, the reveal flag (NOW FLIPPED - **reveal cleanup is the next irreversible step, HELD**), auth-config. Flip 2 was executed autonomously on Eli's cert + hub PASS per this contract. `settings.local.json` has Bash/Edit/Write/WebFetch allow (unstaged, never commit).
