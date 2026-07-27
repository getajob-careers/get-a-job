# Design lane - resume point

**After any context clear, read THIS + tasks/lessons.md first. Never reconstruct
from scratch. Verify every PR/prod claim against `gh` / Vercel before trusting it
(handoffs go stale the instant something merges; other lanes are active).**

## Standing protocols (verbatim)

- **Canary:** begin every reply to Eli with "Eli, ...". Context canary - when the name stops appearing Eli says **"canary"**, and on that word: overwrite THIS file with a fresh resume point and tell him to `/clear`.
- **Statusline:** context-usage % shows first. Proactively offer a handoff at ~80%.
- **Ledger reports:** end every report with a compact ledger (PR, SHA, state, claims to verify, evidence pointers, open questions).
- **Delegate:** design-JUDGMENT fan-out (audits) -> `general-purpose` agents; searches -> `explorer`, gate runs -> `gatekeeper`, sweeps -> `sweeper` (haiku, `.claude/agents/`).
- **Reporting discipline ([[report-gated-means-flag-off-unreachable]]):** "gated" = EVERY changed line unreachable flag-off; shared components get an explicit UNCONDITIONAL-with-reason call-out. NOTE onboarding renders slate (data-next-design) regardless of the global reveal flag AND V2 onboarding is live for all un-onboarded users - onboarding changes are UNCONDITIONAL / user-reachable in both flag states. ThreeTabHome (the 3-tab /Home) is FLAG-ON only.
- **Merge ritual gotcha:** `gh pr merge --delete-branch` FAILS here (local `main` checked out in sibling `getajob-eval` worktree). Merge WITHOUT `--delete-branch`, confirm `state:MERGED` via `gh pr view`, then delete the remote ref via `gh api -X DELETE repos/getajob-careers/get-a-job/git/refs/heads/<branch>` (its OWN command). `block-main-push` hook trips on ANY command with both `push` and `main` tokens - split them. **`block-dangerous.sh` hook BLOCKS any `git push --force`/`--force-with-lease` (needs Eli confirmation, never to main).** For a STACKED PR after its base merges: you do NOT need to force-push a rebase - just `gh pr edit <n> --base main`, then `gh pr close <n> && gh pr reopen <n>` to re-trigger the "Test + build" workflow (it only runs for PRs whose base is main), confirm CLEAN + files-list = only that PR's own files, then squash-merge. (A/B/C all merged this way 2026-07-27.)
- **check:em-dash EVERY gatekeeper pass:** `npm run check:em-dash` before every push.
- **Self-verification pipeline (STANDING, replaces per-PR human review):** after build + COMMIT + PUSH (never spawn verifiers before pushing - shared-tree race), spawn IN PARALLEL general-purpose agents (fresh context; verifiers READ via `git diff origin/main...BRANCH` / `git show BRANCH:file`, NEVER checkout/stash): Spec Verifier, QA Breaker (adversarial vs acceptance), Flag-Scope Auditor when gating claimed, Gatekeeper (CI green; typecheck baseline ~518, measure NET DELTA). Any verifier doubt = fix or drop + log. PR gains a VERIFICATION block.

## Identity / owned paths

DESIGN lane, one terminal, persists across clears. Owns: redesign shell/home (`src/components/redesign/*`), jobs cards (`JobGridCard`,`JobDetailModal`,`useJobCardActions`,`cvGenerationJob`), CV Studio (`src/components/cv-studio/*` + write-layer libs), coach FRONTEND (`src/components/agent/*`,`chat/*`,`coachPrompts.js`), onboarding V2 (`Onboarding*`/`OnboardingV2*` + screens + `OnboardingShell` + `onboardingPersist`), app shell (`Layout.jsx`+`layoutMode.js`), tokens (`index.css` `--rd-*`, `tailwind.config.js` `rd-*`), mascot. **STAY OFF (CV lane):** `JobsSearchTab`, `jobsSearchFacets`, `scoreJobFit`, `UnifiedJobsFeed`, `ai-chat/*`, `_shared/libraries/*`. One-line isolated JobsSearchTab copy/focus edits OK only when verified no open CV-lane PR touches it (#783 precedent).

## >>> CURRENT (2026-07-27, pass4) <<<

### Serving truth (verify on resume: `git fetch` FIRST)

- **origin/main tip = `c6a61f0`.** THE FIX BUNDLE (PR-A/B/C) is MERGED + LIVE. Frontend-only, NO edge deploy.
  - **PR-A #806 (squash `b4eeb8c`)** - B1 flag-on Browse Jobs readable at every width. lg-gated stack: below lg the feed+panel STACK (jobs container owns scroll), at lg+ side-by-side proportional (feed `lg:flex-[1.55]` : panel `lg:flex-1`). `MatchedRolesPanel` gained additive `scrollAt` prop (default "md" = Career byte-identical; ThreeTabHome passes "lg"). JobDetailModal footer `flex-wrap`. Root cause: coach shell rail (248px) makes the md-band region ~470px (measured, 781 viewport), too narrow for two comfortable columns (feed>=266 + panel>=242 + gap = ~528 > 470). Career-mirror-alone proven insufficient by measurement -> escalated to Eli's lg-gating hypothesis per handoff sanction.
  - **PR-B #808 (squash `c6a61f0`)** - interaction-states pass. 44px + hover/focus-visible/active on JobGridCard + JobDetailModal action clusters (raw elements, states matched not RdButton-swapped - RdButton is primary-pill-only). ThreeTabHome tab control = ARIA APG (roving tabindex + Arrow/Home/End + aria-label + **white inset focus ring** - dark-on-slate-pill contrast was the one verifier FAIL, fixed). MatchedRolesPanel toggle hover/active/focus-visible + aria-expanded (SHARED/UNCONDITIONAL, Career too). JobsSearchTab search-bar + facet focus (one-line #783 exception). AgentComposer focus-within ring /35 -> /60.
  - **PR-C #809 (squash `1272d34`)** - onboarding. M5 situation grid `grid-cols-3 sm:grid-cols-5`. M7 removed have_job<->looking XOR (kept unemployed's) - employed+looking now coexist (aligns with already-live V1 `StepResumeUpload` behavior; verifier confirmed no other consumer assumed exclusivity). Copy: CompanyBrowseCard "No profile details yet."; StepReview `cvExtracted` prop branches review subtext (default true = V1 byte-identical, straight apostrophes); em-dash sweep of shipped V2 onboarding copy.
- All three: Spec + QA-Breaker verified PASS, gate green (typecheck 518), PR CI green.
- `main` checked out in sibling worktree (`/Users/elienglard/getajob-eval`); branch off `origin/main` here, never `git checkout main`.

### OUTSTANDING for Eli (cert)

- **Wide-desktop eyeball on flag-on Browse Jobs** (`/Home?next=1`, tab=jobs) at 1024 / 1280 / 1920. B1 fix verified live at 375 (byte-identical below-md) + 781 (md-band stack: feed 469 / panel 469, no char-per-line). MCP tab caps ~781 CSS so 820/1024/1280 side-by-side (the proportional lg split) was REASONED from the Career reference, not eyeballed. **Cert-eyeball note (QA-breaker):** at md-band the jobs CONTAINER scrolls with scrollbar HIDDEN; the bottom edge-fade is the "more below" affordance - glance it reads.
- #723 still gates Eli's REVEAL CERT. Do NOT touch the reveal flag; reveal cert + Flip 2 stay Eli's.

### >>> NEXT: PR-D - the Yishai bundle (Eli 2026-07-27, human QA, Eli-ruled fix-before-cert) <<<

**HELD-per-PR, hub verifies, in one or two PRs. Do NOT split item 7 (logo) or item 8 (tracker CV) across sessions.** Verbatim queue:

1. **Home navigation:** add a Home tile to `TOOL_TILES` (same pattern as the Tasks tile) so there is an explicit path back to the 3-tab Home; keep logo-as-home working.
2. **Coach sidebar panel:** kill the horizontal scrollbar in the UNEXPANDED panel (chips row or fixed-min-width child overflowing; wrap or clip correctly).
3. **3-REVISED (Eli re-ruled 2026-07-27, SUPERSEDES the old rename):** CV bank moves INTO Home's CV tab.
   a. REMOVE the cvbank tile from `TOOL_TILES` entirely.
   b. Flag-on `/CVAgent`: redirect to the Home CV tab (superseded by the coach). **FLAG-OFF `/CVAgent` UNTOUCHED** - live editor until Flip 2.
   c. **INVESTIGATE-FIRST** on Home's CV tab: what the "Master CV" control does today, and whether tailored CVs surface anywhere there. Then relabel it **"CV bank"** and make it the visible home of ALL the user's CVs - master + tailored, listed and openable. If that's wiring+labeling, BUILD; if it needs new data/capability, STOP and report shape + size for Eli. **The label must be TRUE - no "CV bank" over a single-document view.**
4. **RULING PENDING (Eli deciding drop-vs-rename for the "Chat" tile):** originally "rename Chat -> Coach (same feature as sidebar Coach, one name)"; Eli is deciding whether to DROP the tile instead. Hub relays the ruling to the fresh session - do NOT act on item 4 until Eli rules.
5. **NetworkingTab.jsx:103-108:** two pill-styled `<span>`s (Outreach Coach / Comment Coach) look like toggle buttons but are static labels - deceptive affordance. Either make them real jump-links to their sections OR restyle as plain headings. Comment Coach WORKS; do not rebuild it.
6. **Matched-roles sort disclosure:** one visible line near the list - goal-path roles rank first, then match % (ordering deliberate; just needs to say so). COPY, not logic. (The sort is `sortMatchedRoles` in `MatchedRolesPanel.jsx`: tier order sweet-spot -> growth -> detour, then match_score DESC.)
7. **LOGO (Eli-ruled):** in the `CanvasLogo` mark, the horizontal stroke under the seated figure's arm reads as an amputated limb. Remove/reshape per the QA suggestion so the figure still reads seated-at-desk. CAUTION: renders on signup, onboarding shell, app shell - verify ALL surfaces BOTH flag states, keep viewBox/dimensions IDENTICAL, keep `var(--rd-logo-hi, #EC6A47)` fallback intact.
8. **Tracker CV tab (INVESTIGATE-FIRST):** add "View in CV editor" next to Download on the generated-CV state, opening that tailored version in the CV surface. If the editor can already load a tailored version by route/param, wire it (small). If it needs new capability, STOP and report the shape - Eli decides scope.
9. **Revise-button discoverability on the CV document:** replace hover-only with a persistent low-opacity affordance that brightens on hover (QA's middle ground). No layout shift; print/export output unaffected.

### How to run the live app

- **Un-authed DEV preview of the REAL flag-on Home:** `/_preview/home3tab-real?next=1` (stubbed auth, seeds applications + master CV; Jobs feed self-fetches REAL jobs; matched-roles panel = empty state, no roles seeded). This is how B1 was width-verified WITHOUT auth. `resize_window` caps ~781 CSS (DPR); ~615 device did NOT drop below 781.
- **Authed accounts:** walkthrough `elienglard34+walkthrough@gmail.com` (onboarded, DISPOSABLE); v2test `elienglard34+v2test@gmail.com` (onboarding). Eli holds passwords. Staging: visible tab on `www.getajob.careers/login`, prefill email via native setter, CLEAR password (Chrome autofills WRONG account), `document.title="SIGN IN HERE"`, ask Eli to sign in.
- **Flag `next`:** `?next=1` flag-on (slate `#60617d`), `?next=0` flag-off (coral). Bootstrap reads URL param `next` (NOT `nextDesign` = the localStorage key). Flag-on `/Jobs` -> `/Home?tab=jobs` (ThreeTabHome). Flag-off `/Jobs` -> `/Career`.
- **Onboarding:** NEVER click "Go to my workspace" (springboard finalize). Dropzone opens a BLOCKING OS dialog - never real-click.

### Test artifacts to purge (Eli, walkthrough acct - [[never-delete-rows-without-ruling]], needs his action): 1 tailored CV (Product Manager/DriveNets), 1 manual tracker row, 1 completed task, 1 audit feedback. v2test left un-finalized.

## Rulings locked (do not re-litigate)

- Onboarding palette = 0A slate. Motion = anime.js v4 per-submodule for timelines, CSS for loops; reduced-motion -> static. `--rd-logo-hi` fallback COMPONENT-level only, never in index.css OFF/root. Self-verification pipeline REPLACES per-PR human review.
- Situation selector: multi-select, no min-1 gate (RULED optional). Back-nav Option A shipped (#797).

## Autonomy contract (Eli)

Full autonomy within the approved queue; decide, log here, keep moving. HELD FOR ELI only: schema, edge-fn outside plan, anything irreversible outside an approved queue, the reveal flag, auth-config. The pre-cert fix bundle (A/B/C) was pre-ruled + batch-merged autonomously per this contract. PR-D is HELD-per-PR, hub verifies. `settings.local.json` has Bash/Edit/Write/WebFetch allow (unstaged, never commit).
