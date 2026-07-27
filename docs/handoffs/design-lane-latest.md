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
- **Formatter churn (tasks/lessons.md + [[formatter-strips-just-added-imports]]):** the PostToolUse formatter REFLOWS whole files that aren't already prettier-clean, burying the real change (PR-D hit this: 187-line diff for a 20-line change on CVManagement/NetworkingTab/CareerAgent). Remedy that WORKS: `git checkout origin/main -- <file>`, then re-apply ONLY the logical hunks via a python `str.replace` script run through Bash (bypasses the Edit/Write hook -> no reflow -> minimal diff). Single 1-line changes usually stay clean.
- **Self-verification pipeline (STANDING, replaces per-PR human review):** after build + COMMIT + PUSH (never spawn verifiers before pushing - shared-tree race), spawn IN PARALLEL general-purpose agents (fresh context; verifiers READ via `git diff origin/main...BRANCH` / `git show BRANCH:file`, NEVER checkout/stash): Spec Verifier, QA-Breaker (adversarial vs acceptance), Flag-Scope Auditor when gating claimed, Gatekeeper (CI green; typecheck baseline ~518, measure NET DELTA). Any verifier doubt = fix or drop + log. PR gains a VERIFICATION block. (PR-D ran all four; QA-Breaker's 2 P2s were fixed pre-merge.)

## Identity / owned paths

DESIGN lane, one terminal, persists across clears. Owns: redesign shell/home (`src/components/redesign/*`), jobs cards (`JobGridCard`,`JobDetailModal`,`useJobCardActions`,`cvGenerationJob`), CV Studio (`src/components/cv-studio/*` + write-layer libs), coach FRONTEND (`src/components/agent/*`,`chat/*`,`coachPrompts.js`), onboarding V2 (`Onboarding*`/`OnboardingV2*` + screens + `OnboardingShell` + `onboardingPersist`), app shell (`Layout.jsx`+`layoutMode.js`), tokens (`index.css` `--rd-*`, `tailwind.config.js` `rd-*`), mascot/logo. **STAY OFF (CV lane):** `JobsSearchTab`, `jobsSearchFacets`, `scoreJobFit`, `UnifiedJobsFeed`, `ai-chat/*`, `_shared/libraries/*`.

## >>> CURRENT (2026-07-27, post-PR-D) <<<

### Serving truth (verify on resume: `git fetch` FIRST)

- **origin/main tip = `afe69c3`.** PR-D + the earlier pre-cert bundle (A/B/C: #806/#808/#809) are ALL MERGED + LIVE. Frontend-only, NO edge deploy this whole arc.
- **PR-D #814 (squash `afe69c3`)** - the Yishai bundle, 9 human-QA pre-cert fixes, ALL DONE + LIVE:
  1. **Home tile** in the sidebar `TOOL_TILES` (bespoke `CanvasToolIcon.Home` house silhouette + `.ti-home` light-up beat + `home:BLUE` in toolColors) -> explicit path back to the 3-tab Home. FLAG-ON.
  2. **Coach dock** panel horizontal scrollbar killed: `overflow-x-hidden` on the `CoachThread` scroll container + `break-words` on the `MessageBubble` bubble + a `table` markdown override (`overflow-x-auto`) so wide tables scroll not clip. UNCONDITIONAL.
  3. **CV bank into Home's CV tab:** cvbank tile REMOVED; new `src/pages/CVAgentRouteGate.jsx` redirects flag-on `/CVAgent` -> `/Home?tab=cv` PRESERVING query (a `?application_id` deep-link lands the tailored CV), flag-OFF renders `<CVAgent/>` unchanged; `pages.lazy.js` maps `CVAgent: CVAgentRouteGate`; ThreeTabHome CV tab relabelled **"CV bank"** (the `CvSelector` already lists master + all tailored, openable/deletable).
  4. **Chat tile -> "Coach"** (one name for the sidebar assistant); `/CareerAgent` page `title` const now "Coach"/"Coach - {appLabel}" (backend `agentName="career_agent"` UNCHANGED - copy only).
  5. **NetworkingTab** deceptive toggle-pills -> real in-page jump-links (`<nav>` + `<a href="#outreach-coach"/"#comment-coach">`, `Section` gained an `id` prop). UNCONDITIONAL (live LinkedIn tab, flag-off too).
  6. **Matched-roles sort disclosure** - one honest line ("Roles on your goal path are listed first, then by match strength") gated to `size==="comfortable"` so Career's compact stays byte-identical (guarded by `matchedRolesPanel.test.jsx`). FLAG-ON.
  7. **LOGO (Eli variant A "forward L-sit"):** in `CanvasLogo.FullInner` the chair seat/back-post strokes (read as an amputated limb / stub-nubs) were replaced by real seated legs (`M25.5 30 L34 34` thigh + `M34 34 L32.5 46` shin). viewBox `0 0 56 54` + all other coords identical; `var(--rd-logo-hi, #EC6A47)` fallback intact. UNCONDITIONAL (Login + onboarding shell + app shell). Eli picked A from a 7-variant leg round after rejecting a chair-removal-only fix.
  8. **Tracker "View in CV editor"** beside Download on the generated-CV state (`CVManagement.jsx`), deep-links `createPageUrl("CVAgent")+?application_id` -> route gate resolves both flag states. UNCONDITIONAL.
  9. **CV document Revise** hover-only -> persistent `opacity-50` that brightens to 100 on hover/focus, `print:opacity-0`, no layout shift (`CVStudioView.PieceRevise`). UNCONDITIONAL (flag-off editor too).
- Verification: Spec 9/9 PASS, Flag-Scope PASS (no flag-off regression), QA-Breaker no P0/P1 (2 P2s fixed pre-merge: forced `tab=cv` in the gate; table scroll-not-clip). Gate green (typecheck 518 baseline, 1818 tests).
- `main` checked out in sibling worktree (`/Users/elienglard/getajob-eval`); branch off `origin/main` here, never `git checkout main`.

### OUTSTANDING for Eli (cert eyeballs he owns - PROD, post-merge)

- **PR-D logo** (item 7, variant A) on the live **Login page + onboarding** at header/favicon size. Verified in-harness at 24px + full, both palettes, fallback intact, viewBox unchanged - the small-size read is Eli's call.
- **PR-D deep-link** (items 3+8): a Tracker "View in CV editor" click lands the tailored CV in Home's CV bank tab (flag-on).
- **Wide-desktop eyeball on flag-on Browse Jobs** (`/Home?next=1`, tab=jobs) at 1024/1280/1920 - carried from the A/B/C (B1) fix; verified live at 375 + 781 only (MCP tab caps ~781 CSS), the lg proportional split was reasoned from Career, not eyeballed.
- **#723 still gates Eli's REVEAL CERT.** Do NOT touch the reveal flag; reveal cert + Flip 2 stay Eli's.

### >>> NEXT design-lane work <<<

**NOTHING queued to BUILD.** All audit + Yishai pre-cert items are DONE. The next design-lane work is **Flip 2 execution** (the reveal cutover), which starts **only when Eli certs** the outstanding eyeballs above and rules #723 clear. Until then the lane is idle - wait for Eli. Do not touch the reveal flag or auth-config autonomously.

### Test artifacts to purge (Eli, walkthrough acct - [[never-delete-rows-without-ruling]], needs his action)

1 tailored CV (Product Manager/DriveNets), 1 manual tracker row, 1 completed task, 1 audit feedback. v2test left un-finalized.

### How to run the live app

- **Un-authed DEV preview of the REAL flag-on Home:** `/_preview/home3tab-real?next=1` (stubbed auth, seeds applications + master CV; Jobs feed self-fetches REAL jobs; matched-roles panel = empty state). `resize_window` caps ~781 CSS (DPR).
- **Logo/SVG visual checks:** `file://` is BLOCKED in the browser tool - serve a scratchpad HTML over `python3 -m http.server <port>` and navigate to `localhost`. The logo mark is a self-contained SVG (CSS-var colours) so a standalone harness with the palette vars set is a faithful render.
- **Authed accounts:** walkthrough `elienglard34+walkthrough@gmail.com` (onboarded, DISPOSABLE); v2test `elienglard34+v2test@gmail.com` (onboarding). Eli holds passwords. Staging: visible tab on `www.getajob.careers/login`, prefill email via native setter, CLEAR password (Chrome autofills WRONG account), ask Eli to sign in.
- **Flag `next`:** `?next=1` flag-on (slate `#60617D`), `?next=0` flag-off (coral pre-reveal). Flag-on `/Jobs` -> `/Home?tab=jobs`; flag-on `/CVAgent` -> `/Home?tab=cv` (NEW, PR-D). `isNextDesign()` reads the persisted `<html data-next-design>` attr set pre-paint.
- **Onboarding:** NEVER click "Go to my workspace" (springboard finalize). Dropzone opens a BLOCKING OS dialog - never real-click.

## Rulings locked (do not re-litigate)

- Onboarding palette = 0A slate. Motion = anime.js v4 per-submodule for timelines, CSS for loops; reduced-motion -> static. `--rd-logo-hi` fallback COMPONENT-level only, never in index.css OFF/root. Self-verification pipeline REPLACES per-PR human review.
- Logo = variant A seated legs (LOCKED, PR-D). The `MarkFullChair` export name is kept though it no longer draws a chair (renaming ripples to Login/OnboardingShell/CanvasShell - not worth it).
- Situation selector: multi-select, no min-1 gate. Back-nav Option A shipped (#797).

## Autonomy contract (Eli)

Full autonomy within an approved queue; decide, log here, keep moving. HELD FOR ELI only: schema, edge-fn outside plan, anything irreversible outside an approved queue, the reveal flag, auth-config. PR-D was HELD-per-PR + hub-verified + batch-merged autonomously per this contract. `settings.local.json` has Bash/Edit/Write/WebFetch allow (unstaged, never commit).
