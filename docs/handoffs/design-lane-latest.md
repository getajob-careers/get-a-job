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
- **Merge ritual gotcha:** `gh pr merge --delete-branch` FAILS here (local `main` checked out in sibling `getajob-eval` worktree). Merge WITHOUT `--delete-branch`, confirm `state:MERGED` via `gh pr view`, then delete the remote ref via `gh api -X DELETE repos/getajob-careers/get-a-job/git/refs/heads/<branch>` (its OWN command). `block-main-push` hook trips on ANY command with both `push` and `main` tokens - split them. (#797 + #802 both merged this way this session.)
- **check:em-dash EVERY gatekeeper pass:** `npm run check:em-dash` before every push (diff-scoped, ADDED em dashes in src/ + supabase/functions/ only; docs/ not scanned but house style still avoids them).
- **Self-verification pipeline (STANDING, replaces per-PR human review):** after build + COMMIT + PUSH (never spawn verifiers before pushing - shared-tree race), spawn IN PARALLEL general-purpose agents (fresh context; verifiers READ via `git diff origin/main...BRANCH` / `git show BRANCH:file`, NEVER checkout/stash): (1) Spec Verifier, (2) QA Breaker (adversarial vs acceptance), (3) Flag-Scope Auditor when gating claimed, (4) Gatekeeper (CI green ON THE PR; typecheck baseline ~519, measure NET DELTA). Any verifier doubt = fix or drop + log. PR gains a VERIFICATION block. Clean-block PRs merge at batch time on hub verification alone.

## Identity / owned paths

DESIGN lane, one terminal, persists across clears. Owns: redesign shell/home (`src/components/redesign/*`), jobs cards (`JobGridCard`,`JobDetailModal`,`useJobCardActions`,`cvGenerationJob`), CV Studio (`src/components/cv-studio/*` + write-layer libs), coach FRONTEND (`src/components/agent/*`,`chat/*`,`coachPrompts.js`), onboarding V2 (`Onboarding*`/`OnboardingV2*` + screens + `OnboardingShell` + `onboardingPersist`; persist paths = CV-lane cross-review), app shell (`Layout.jsx`+`layoutMode.js`), tokens (`index.css` `--rd-*`, `tailwind.config.js` `rd-*`), mascot. **STAY OFF (CV lane):** `JobsSearchTab`, `jobsSearchFacets`, `scoreJobFit`, `UnifiedJobsFeed`, `ai-chat/*`, `_shared/libraries/*`. One-line isolated JobsSearchTab copy/focus edits OK only when verified no open CV-lane PR touches it (#783 precedent).

## >>> CURRENT (2026-07-27, pass3) <<<

### Serving truth (verify on resume: `git fetch` FIRST)

- **origin/main at handoff = `509edd3` then #802 merged (squash `9e739e7`, docs-only) -> new tip.** Verify with `git fetch`.
- **#797 (V2 back-nav) MERGED, squash `7222180`, branch deleted.** Onboarding-only, no edge deploy. Back-nav LIVE + verified.
- **#802 (pre-cert re-audit findings doc) MERGED, squash `9e739e7`, branch deleted.** Canonical findings + severity at `docs/audits/2026-07-27-pre-cert-reaudit.md`.
- `main` checked out in sibling worktree (`/Users/elienglard/getajob-eval`); branch off `origin/main` here, never `git checkout main`.

### THE FIX BUNDLE (Eli triage 2026-07-27) - three separable PRs, fix-before-cert, HELD per PR, batch-merge at end. **Touch NOTHING beyond these three lists** - everything else in the audit is RULED ship-with/post-launch.

#### PR-A - B1 layout (flag-on Browse Jobs readable at EVERY width 320-1920). THE IMPORTANT ONE, do not rush.

**Acceptance:** no character-per-line titles, no overlap at 375 / 770 / 820 / 1024 / 1280 simulated widths; MatchedRolesPanel on Career UNREGRESSED (shared). Also add `flex-wrap` to the JobDetailModal footer (P3, `JobDetailModal.jsx:341`, same PR).

**ROOT CAUSE (fully investigated pass3):** `ThreeTabHome.jsx:173-186` jobs tab. Feed `md:flex-1 min-w-0` (`UnifiedJobsFeed singleColumn`); panel `md:w-[360px] lg:w-[400px] xl:w-[440px] flex-shrink-0`. The Coach shell rail (`CanvasSidebar.jsx:140` = `hidden md:flex md:w-[248px]`) appears at the SAME `md` breakpoint, so at ~770 viewport the content region is ~450px and the non-shrinking 360px panel starves the flex-1 feed to ~78px -> singleColumn cards char-per-line.

**LOW-RISK FIX (recommended - mirror Career, NO scroll-model surgery):** Career (`Career.jsx:770-798`) renders the SAME `UnifiedJobsFeed singleColumn` + SAME MatchedRolesPanel and does NOT break, because its panel is PROPORTIONAL: feed `md:flex-[1.55] min-w-0`, panel className `md:flex-1 min-w-0` (no fixed width, no flex-shrink-0). In ThreeTabHome:

- Feed div: `md:flex-1` -> `md:flex-[1.55]` (keep `min-w-0` + `md:h-full md:overflow-y-auto` UNCHANGED).
- Panel className: `w-full md:w-[360px] lg:w-[400px] xl:w-[440px] flex-shrink-0` -> `w-full md:flex-1 min-w-0` (keep `scrollSelf`, `size="comfortable"`).
  Self-scroll model is IDENTICAL to Career's (already works) -> NO tab-body / overflow / breakpoint changes. ThreeTabHome only changes its OWN feed sibling + panel `className` prop -> Career's `<MatchedRolesPanel>` call untouched = byte-identical.
- **CAVEAT TO VERIFY:** ThreeTabHome passes `size="comfortable"` (p-5, text-16) vs Career's `size="compact"`. At ~770 the proportional split is ~feed 286px / panel 184px; confirm the COMFORTABLE panel doesn't overflow/clip at ~184px. If it does: add a modest `md:min-w-[240px]` + `flex-wrap` on the container (then re-check `md:h-full` height when the panel wraps below), OR ask Eli before switching to `size="compact"` (he chose comfortable deliberately).

**WHY NOT lg-gating (Eli's other hypothesis):** works but HIGHER risk - `lg:flex-row` forces moving EVERY `md:` in the jobs subtree to `lg:` (container/feed/panel self-scroll at `MatchedRolesPanel.jsx:159-161`) AND aligning the SHARED tab body (`ThreeTabHome.jsx:146` = `overflow-y-auto md:overflow-hidden`, also used by CV+Tracker) for the md-lg band or the jobs content clips. The Career-mirror fix sidesteps all of it. Only escalate to lg-gating if the comfortable-panel caveat proves proportional insufficient.

**VERIFICATION tooling limit:** MCP tab CSS viewport is DPR-capped ~770 (device 1280 = 770 CSS; screen limit blocks wider). CAN reach ~375 CSS (device ~620). So live-verify 375 + 770; 820/1024/1280 = reason from proportional-flex math + the Career reference (proportional flex is width-agnostic) OR Eli eyeballs. State this in the PR VERIFICATION block (same "wide-desktop eyeball outstanding" caveat as the audit).

#### PR-B - interaction-states pass (M1+M2+M3+P1).

- Swap hand-rolled buttons on `JobGridCard` (`:432,443,459,471,486`) + `JobDetailModal` (`:342-407,248-255`) action clusters to `RdButton` (`src/components/redesign/RdButton.jsx` - 4 states + min-h-[44px] + focus-visible + tokens), OR match its states + min-h-44 where a raw element must stay. Targets: track "+" 36px, Generate CV/View/Apply ~38-40px, modal close ~26px -> all >= 44px.
- `ThreeTabHome.jsx:125-140` tab control: focus-visible ring + roving arrow-key tabindex (ARIA APG tab pattern).
- `MatchedRolesPanel.jsx:212-215` toggle (`sz.toggle` in BOTH compact+comfortable SIZES): add hover/focus-visible/active. SHARED (Career too) = UNCONDITIONAL, call it out.
- Restore focus styles `JobsSearchTab.jsx:330,733` + `AgentComposer.jsx:64` via `focus:border-rd-primary focus:shadow-[0_0_0_3px_var(--rd-primary-tint)]` (pattern at `onboarding/StepReview.jsx:78`). JobsSearchTab is CV-lane-owned - one-line focus edits are the #783 exception BUT verify no open CV-lane PR touches it first.
- **Acceptance:** keyboard-only walk Browse Jobs -> card -> modal -> panel shows visible focus at EVERY stop; all action targets >= 44px.

#### PR-C - onboarding fixes (M5 + M7 + copy).

- **M5:** `OnboardingV2.jsx:515` `grid grid-cols-5` -> `grid-cols-3 sm:grid-cols-5` (sibling `DirectionScreenV2.jsx:307`).
- **M7 (Eli's correction - the audit misread it):** the situation selector is ALREADY multi-select; the deselect was an XOR entry in `SITUATION_CONFLICTS`, not a single-select control. FIX = remove ONLY the `have_job` <-> `looking` conflict pair from `SITUATION_CONFLICTS` (KEEP unemployed's conflicts). Then VERIFY `SITUATION_PRIORITY` derivation + all array consumers of the situation/employment_status array unaffected. Grep those three symbols first.
- **Copy:** (1) `CompanyBrowseCard.jsx:67` "Profile details coming soon." -> "No profile details yet." (2) Review-screen subtext ("Here's what we found in your CV.") -> branch on has-CV state so the skip/no-CV path doesn't claim a CV was read (`ReviewScreenV2`). (3) em-dash sweep of shipped onboarding copy.

### How to run the live app (authed)

- **Accounts:** walkthrough `elienglard34+walkthrough@gmail.com` (onboarded, populated, DISPOSABLE + queued for purge - complete write flows for real). v2test `elienglard34+v2test@gmail.com` (un-finalized, for onboarding). Eli holds passwords; never typed in chat.
- **Staging pattern:** open a visible tab on `www.getajob.careers/login`, prefill email via native setter (`Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,val)` + dispatch input/change), CLEAR the password field (Chrome re-autofills the WRONG account - warn Eli to clear + type), `document.title="SIGN IN HERE"`, ask Eli to sign in. Session persists to the origin localStorage (shared across same-origin tabs). Switch accounts: account menu (bottom-left chevron flag-on) -> Sign out -> re-stage.
- **Flag `next`:** `?next=1` flag-on (slate `#60617d`), `?next=0` flag-off (coral `#d6421f`). Flag-on `/Jobs` -> `/Home?tab=jobs` (ThreeTabHome). Flag-off `/Jobs` -> `/Career`.
- **Console:** install `window.__audit` interceptor (wrap console.error/warn + error/unhandledrejection) on a settled page; read via it + `read_console_messages{onlyErrors:true}`. localStorage auth reads BLOCKED - infer auth from route.
- **Width testing:** resize window device px; CSS = device / DPR(~1.66). ~620 device -> 375 CSS; ~1280 device -> 770 CSS; wider blocked by screen cap.
- **Onboarding:** NEVER click "Go to my workspace" (springboard screen 3 = finalize/point-of-no-return). Dropzone opens a BLOCKING OS dialog - never real-click it.

### Test artifacts to purge (Eli, walkthrough acct - [[never-delete-rows-without-ruling]], needs his action): 1 tailored CV (Product Manager/DriveNets), 1 manual tracker row "Associate Product Manager (audit)/Audit Co", 1 completed task, 1 audit-labeled feedback submission. v2test left un-finalized on onboarding screen 2.

## Rulings locked (do not re-litigate)

- Onboarding palette = 0A slate. Motion = anime.js v4 per-submodule for timelines, CSS for loops; reduced-motion -> static. Back-nav yes (screen-1 back deferred; screens 2-3 shipped #797). Feedback pill flag-OFF-only (#767) + flag-on menu item. `--rd-logo-hi` fallback COMPONENT-level only, never in index.css OFF/root (reveal-adjacent). Self-verification pipeline REPLACES per-PR human review.

## Autonomy contract (Eli)

Full autonomy within the approved queue (the 3 PRs); decide, log here, keep moving. HELD FOR ELI only: schema, edge-fn outside plan, anything irreversible, anything sending to real users, the reveal flag, auth-config. Fix bundle is HELD-per-PR, hub verifies, batch-merge at end. `settings.local.json` has Bash/Edit/Write/WebFetch allow (unstaged, never commit).

## Eli's gate (unchanged)

#723 gates Eli's REVEAL CERT. Do NOT touch the reveal flag; reveal cert + Flip 2 stay Eli's. Once PR-A/B/C merge, Eli does the final wide-desktop eyeball on flag-on Browse Jobs (the width the MCP tab can't reach) + cert triage.
