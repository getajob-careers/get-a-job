# Design lane - resume point

**After any context clear, read THIS + tasks/lessons.md first. Never reconstruct
from scratch. Verify every PR/prod claim against `gh` / Vercel before trusting it
(handoffs go stale the instant something merges; other lanes are active).**

## Standing protocols (verbatim)

- **Canary:** begin every reply to Eli with "Eli, ...". Context canary - when the name stops appearing Eli says **"canary"**, and on that word: overwrite THIS file with a fresh resume point and tell him to `/clear`.
- **Statusline:** context-usage % shows first. Proactively offer a handoff at ~80%.
- **Ledger reports:** end every report with a compact ledger (PR, SHA, state, claims to verify, evidence pointers, open questions).
- **Delegate:** searches -> `explorer`, gate runs -> `gatekeeper`, sweeps/counts -> `sweeper` (haiku subagents in `.claude/agents/`). Newly-added/edited agents need a full quit+relaunch (`/clear` does NOT re-scan). For design-JUDGMENT fan-out (audits), use `general-purpose` agents, not the haiku search subagents.
- **Reporting discipline ([[report-gated-means-flag-off-unreachable]]):** "gated" means EVERY changed line is unreachable flag-off. Shared components get an explicit UNCONDITIONAL-with-reason call-out. PR bodies for coach/canvas work lead with a FLAG SCOPE block. NOTE: onboarding renders the 0A slate palette (`data-next-design` stamped on V2 shell mount) regardless of the global reveal flag, and V2 onboarding is live for all un-onboarded users now - so onboarding changes are UNCONDITIONAL / user-reachable in both global-flag states. State that reachable-state truth plainly; do NOT claim flag-off unreachability for onboarding surfaces.
- **Merge ritual gotcha:** `gh pr merge --delete-branch` FAILS in this worktree (local `main` is checked out in the sibling `getajob-eval` worktree). Merge WITHOUT `--delete-branch`, confirm `merged:true` via `gh pr view`, then delete the remote branch via `gh api -X DELETE repos/getajob-careers/get-a-job/git/refs/heads/<branch>` (its OWN command). Also: the `block-main-push` hook trips on ANY command containing both `push` and `main` tokens - split those commands.
- **check:em-dash EVERY gatekeeper pass:** run `npm run check:em-dash` (shipped in #774, on main) before every push. Diff-scoped, catches only ADDED em dashes in src/ + supabase/functions/. Pre-existing em dashes on main are legitimately out of scope.

## Identity

- The DESIGN lane, one terminal, persists across context clears. ALL redesign / canvas / CV-surface / token / onboarding-V2-surface work is this lane's. Design lane OWNS V2 onboarding Phase 1 + Phase 2. CV lane keeps sequence/persistence correctness + cross-reviews any of our PRs touching persist paths.
- The "hub" (Eli) verifies claims, applies migrations, rules on merges. One writer per path.
- **The CV lane is actively working the jobs-feed scoring path + skill-library expansion + coach backend** - stay off `JobsSearchTab`, `jobsSearchFacets`, `scoreJobFit`, `UnifiedJobsFeed`, `supabase/functions/ai-chat/*`, and `_shared/libraries/*`; coordinate through Eli. (One-line isolated copy edits to JobsSearchTab are OK WHEN verified no open CV-lane PR touches it - see #783 precedent - but default to coordinating.)

## Owned paths

- CV Studio: `src/components/cv-studio/*`; `src/lib/{writeProfileEntity,serializedWriteThrough,revertCvDataField,cvDataAdapter,useSeededCvModel}`; `supabase/functions/_shared/write-mediation.ts`.
- Coach/agents (FRONTEND only; ai-chat backend is CV lane's): `src/components/agent/*`, `coachPrompts.js`; `src/lib/{CoachConversationContext,AgentDrawerContext}`; `src/components/chat/*`.
- Redesign surface: `src/components/redesign/*` (shell + ground + home); `src/pages/_preview/*` canvas previews.
- Jobs cards (ours): `src/components/jobs/{JobGridCard,JobDetailModal}.jsx`, `src/hooks/useJobCardActions.js`, `src/lib/cvGenerationJob.js`. (NOT JobsSearchTab/UnifiedJobsFeed - CV lane.)
- App shell: `src/Layout.jsx` + `src/lib/layoutMode.js` (new, #786).
- Mascot: `src/components/redesign/mascot/*`, `docs/design/mascot-*`, `.claude/skills/character-craft/`.
- Onboarding V2: `src/pages/Onboarding*.jsx` / `OnboardingV2*` + screens 0-3 + SpringboardScreenV2 + ReviewScreenV2 + OnboardingShell + `src/lib/onboardingPersist` (persist paths = CV-lane cross-review). READ `docs/handoffs/onboarding-restyle-brief.md` + `docs/design/onboarding-v2-phase1-plan.md` BEFORE any onboarding work.
- Tokens/palette: `src/index.css` (`--rd-*` vars + keyframes), `tailwind.config.js` (`rd-*`), the `design-craft` skill doc.

## V2 onboarding step machine (mapped 2026-07-26, verified live)

4-screen linear orchestrator, `src/pages/OnboardingV2.jsx` (SCREENS array ~L45-50), 0-indexed:

- **Screen 0 `cv_upload`** - `StepResumeUpload` (chromeless embed; shell owns header + progress + situation row). Dropzone `accept=".pdf,.docx"` gates only the native PICKER, not a drag-drop. Extraction states: uploading -> extracting -> done/empty_text/fail.
- **Screen 1 `review`** - `ReviewScreenV2`. States: extracting / success (count-up) / failed / skipped. Required = Full name, Institution, Education level, Field of study, Start date (Continue gated until met).
- **Screen 2 `direction`** - `DirectionScreenV2`. Goal-role search (debounced, keyboard nav), location free-text, work-arrangement multi-select, practicum inline-expand. Shell drives advance + primary_domain inference write. Continue gated on goal role.
- **Screen 3 `springboard`** - `SpringboardScreenV2`. anime.js pop-in (CSS `onbv2-rise` fallback, reduced-motion static). **POINT OF NO RETURN = the "Go to my workspace" button** -> `finaliseAndLaunch()` -> `handleFinalise()` (`onboardingPersist.js:729-730` sets `onboarding_complete=true`, `onboarding_step=6`). NEVER click it on a fresh/test account.
- **OnboardingShell** (`src/components/onboarding/OnboardingShell.jsx`) = the FLAG-OFF / `?onboarding_v2=0` V1 chrome (renders WITHOUT data-next-design). `OnboardingEntry` = `onboardingV2Enabled() ? V2 : V1`; V2 is env default, V1 is the kill-switch fallback.

## >>> CURRENT (2026-07-27, pass2g) <<<

### Serving truth (verify on resume: `git fetch` FIRST, tip moves between sessions)

- **origin/main HEAD at handoff = `41c9f514`.** Recent tip: #785 (CV-lane skills batch 2, library-only), #784/#783/#782 (MINE, batch 2), #780 (CV-lane coach visibility B+C).
- **Coach job visibility is END-TO-END LIVE:** my 4b frontend (#777) + CV lane's B+C backend (#780, ai-chat v116). No longer dead code.
- **ONE design PR HELD: #786** `eli/coldload-flash-guard` @ tip (off `1ebca6e`, one commit behind main - skills-only #785 won't conflict). Item 8 cold-load flash fix. CI GREEN (lint/typecheck 517/build/1802 tests). Carries a VERIFICATION block. **BLOCKED ON: an authed cold-load browser repro** (Eli signs in as an onboarded user on the preview origin; then drive the hard-reload-under-throttle verification from the MCP tab - confirm the onboarding-style flash is gone, neutral spinner shows instead). #546 state-lifecycle rule = do NOT merge without that eyeball.
- `main` is checked out in a SEPARATE worktree (`/Users/elienglard/getajob-eval`); branch off `origin/main` here, never `git checkout main`. **A running Vite dev server on :5173 is shared across terminals - it serves on-disk files (your branch), fine for verification; don't assume it's yours.**

### SHIPPED THIS SESSION (all merged to main, nothing left HELD except #786)

Batch 1 (7 PRs, squashed onto main): #765 cvgen-theater, #767 feedback-avatar, #774 em-dash guard, #775 cv-mobile, #776 coach-panel, #777 coach-job-context (4b), #778 tasks-tile.
Batch 2 (3 PRs): #782 cvgen-2b-remainder (`f1be2af`), #783 profile-jobs-papercuts (`2f0f929`), #784 onboarding-canvaslogo (`1ebca6e`).

- **Queue items 1-7 all DONE + MERGED.** Item 6 (copy + profile papercuts): 6a honest ranked-count copy + 6b auto-scroll-to-edited-experience shipped in #783. Item 7 (OnboardingShell -> CanvasLogo, RULED pre-flip) shipped in #784 with component-level `var(--rd-logo-hi, #EC6A47)` fallback (NO index.css touch); verified both flag states in-browser (flag-on token wins byte-identical; flag-off clay #EC6A47, no black regression) + #755 ReviewScreenV2 em-dash folded in.
- **Item 6c = DEFERRED post-launch entirely** (Eli ruling): no beforeunload partial (misses in-app nav); the real save/discard confirm needs a react-router data-router migration (BrowserRouter has no useBlocker) - a PR#156-class infra change, post-launch, behind an opt-in flag. **Item 6 is CLOSED.**

### Self-verification pipeline (STANDING, Eli 2026-07-26 - replaces per-PR human review)

Per queue item, after build + COMMIT + PUSH (never spawn verifier agents before pushing - shared-tree race), spawn IN PARALLEL (general-purpose agents, fresh context; verifiers READ via `git diff origin/main...BRANCH` / `git show BRANCH:file`, NEVER checkout/stash):

1. **Spec Verifier** - given ONLY the ruled spec + diff: exactly what was ruled, nothing missing/extra/creep?
2. **QA Breaker** - adversarial vs acceptance criteria + preview (edge inputs, rapid/mid-run nav, refresh, double-fire, mobile, reduced-motion; console clean). Prefer the PUSHED branch / its Vercel preview when it needs a live app.
3. **Flag-Scope Auditor** (when gating claimed) - every changed line unreachable flag-off OR explicitly UNCONDITIONAL-with-reason; render-identity evidence, not assertion.
4. **Gatekeeper** - full CI gate (confirm CI green ON THE PR, not just local). TELL it the typecheck baseline (~519) rather than have it measure via checkout.
   DISAGREEMENT RULE: any verifier failure/doubt = fix or drop + log; never argue a finding down. PR gains a VERIFICATION block. Clean-block PRs merge at batch time on hub verification alone. Still ELI-ONLY: reserved categories (real users, emails, auth-config, reveal flag, schema beyond approved migrations, anything irreversible), taste/IA proposals marked HOLD, final re-audit triage.

### Queue (STANDING ORDER: finish one, proceed IMMEDIATELY to the next; held merges are batch and never block)

1. **NEXT - verify #786 (item 8)** with the authed cold-load repro (needs Eli sign-in on the preview origin), then it's merge-ready. See Serving truth above for the exact repro.
2. **Above-ceiling chip re-open (MINE, not CV lane - JobGridCard/JobDetailModal are our files; theater #765 is now merged into them).** Rebase `eli/above-ceiling-chip` (`a15699b`) onto current main, run it through the self-verify pipeline, HOLD. (This is the chip that was DEFERRED behind the theater PR per [[skill-library-expansion-arc]] - now unblocked.)
3. **Item 9 - Career convergence (investigate + PROPOSE, HOLD for Eli's ruling before building).** Career diverges from the three-tab home (Career carries the track-roles panel, Browse Jobs does not; per-role buttons cramped). Investigate both layouts, propose the convergence (which wins, what moves, what it costs), HOLD. No building before his ruling.
4. **Item 10 - standing tail:** **back-nav** (RULED yes: Back restores prior screen with saved values; screens 2-3 clear; screen-1 back-to-upload awkward - PROPOSE its handling, do not build blind) -> **3d situation MULTI-SELECT** (RULED yes, min 1; INVESTIGATE FIRST - report every single-value CONSUMER with file:line; shallow -> array+map forward + first=primary; deep -> STOP. Lead: `employment_status` already an array on main) -> **Task 3 reset PRODUCTION proof** (CERT BLOCKER: from `www.getajob.careers/login?mode=forgot`, prefill `+v2test`, submit ONCE (60s limit), read email via Gmail MCP `from:noreply@getajob.careers`, expect `redirect_to=https://www.getajob.careers/reset-password`; retry when SMTP quota allows. AUTH-CONFIG = reserved, report-only).
5. **Item 11 - FINAL PRE-CERT RE-AUDIT (last, after everything above merged).** Full-platform audit, both flag states (flag-on priority = reveal cohort), every registered page, both shells, public landing, mobile. PARALLEL specialist tracks (general-purpose for judgment; haiku for searches/counts ONLY): (1) design-craft 9-rule bar per-surface, (2) FUNCTIONAL QA (every button/flow/state honest, console clean via `window.__audit`), (3) mobile, (4) copy/honesty (no dishonest counts, leaked tags, false claims). ONE severity-ranked findings doc, blockers top, for Eli's cert triage. If <80% context can't reach it, hand off and let a fresh session run it whole.

### Logged follow-ups

- Icon-language consistency (tool logos vs brand icon set) - LOGGED, not queued; flag cheap wins.
- `src/Layout.jsx` still has an inline `BrandMark` 4-dot glyph (L122-135) used by the SIDEBAR header - do NOT remove without checking usages. (OnboardingShell's own BrandMark WAS removed in #784.)

### Post-launch list (do NOT build pre-launch)

- **6c unsaved-changes confirm** on Profile - needs react-router data-router migration (BrowserRouter -> createBrowserRouter for useBlocker), opt-in flag, PR#156-class. Deferred entirely (Eli 2026-07-27).
- Scoring items parked to post-launch re-measure - see [[scoring-parked-postlaunch-remeasure]].

### Post-audit purge list (Eli to purge; do NOT delete - [[never-delete-rows-without-ruling]])

Junk test files in the `resumes` bucket under user `2df9b1bc-7c12-4dd3-b12f-e4eb4a3e6564`:
`1785060591196_my-cv.doc`, `1785060670695_audit-cv.pdf`. `+v2test` walked to screen 2/3, NOT finalized (`onboarding_complete=false`).

## Rulings locked (do not re-litigate)

- **CTA = Option A** (#690). **Landing-link = Option C**. **Visit-homepage = Option A** (#698).
- **Mascot Round 1 = MISS -> commissioned sheet; A-frame stays; no more in-house figures** (2026-07-23). Artist brief: `docs/design/mascot-artist-brief.md`. On sheet delivery -> rig (layered SVG + anime.js) -> drops into the built sign-up idle. CV-gen theater DECOUPLED from the mascot (shipped mascot-less, #765).
- **Motion = anime.js v4 per-submodule** (v4.5.0) for timelines; CSS for simple loops. framer-motion pruned. reduced-motion -> static + canvas-only + honest UI.
- **Onboarding palette = 0A** (stamp data-next-design on V2 shell mount, scoped; slate regardless of global reveal). OnboardingShell/V1 renders WITHOUT it (flag-off coral world).
- **CanvasLogo flag-off fallback = `var(--rd-logo-hi, #EC6A47)` COMPONENT-level only** (Eli 2026-07-27); never add `--rd-logo-hi` to the index.css OFF/root block (reveal-adjacent, flag-don't-touch).
- **Back-nav: yes** (screen-1 handling to be proposed not built blind). **Completion (d) = in-place** (#765). **Feedback pill flag-OFF-only** (#767, retires at Flip 2). **3d situation multi-select: yes, min 1** (investigate consumers first).
- **6c DEFERRED post-launch; item 6 CLOSED** (Eli 2026-07-27). **Above-ceiling chip re-open is the DESIGN lane's** (Eli 2026-07-27).
- **Self-verification pipeline REPLACES per-PR human review** (2026-07-26).

## Autonomy contract (in force, Eli)

Full autonomy within the approved queue; decide, log here, keep moving; NO pickers unless a genuine auth-boundary/irreversible call. HELD FOR ELI only for reserved categories: schema, edge-fn outside plan, anything irreversible, anything sending to real users, **the reveal flag**, and **auth-config / auth-internals**. A reveal-token touch is reveal-adjacent - flag it, do not do it unilaterally. `settings.local.json` has Bash/Edit/Write/WebFetch allow (unstaged, never commit).

## How to resume the onboarding audit (test account)

- Account: **elienglard34+v2test@gmail.com / V2audit-2026!** (internal '+' account, auto-scrubbed; DB row `onboarding_complete=false`). Eli's `+walkthrough` account also exists (fresh).
- **Session:** I cannot type passwords. Pattern: open a visible tab on the target origin's `/login`, prefill the email via the native setter, decline the cookie banner, ask Eli to type the password + Sign in. Supabase persists the session to THAT ORIGIN's localStorage, shared across tabs of the same origin - drive from the MCP tab after Eli authenticates. Branch-preview subdomains do NOT share the main-preview session (per-origin), and `/_preview/*` routes are env-gated OFF on branch previews (bounce to /login).
- **Recovery-link mint is ABANDONED** (Gmail API corrupts one byte of the `/verify?token=` URL). Use tab sign-in.
- **Dropzone opens a BLOCKING OS file dialog on click/keyboard-activate** - never real-click it; drive files via `file_upload` / synthetic drop (construct File + DataTransfer, dispatch dragover+drop on the `[role=button][aria-label*=resume]` element).

## Standing facts / techniques

- **Formatter (PostToolUse) STRIPS a just-added import whose usage doesn't exist yet** ([[formatter-strips-just-added-imports]]) - hit TWICE this session (#784 CanvasLogo import, #786 resolveLayoutMode + Loader2). RULE: add the USAGE first, then the import; then `grep -n 'import X'` to confirm it survived + eslint. Formatter also reflows whole non-prettier-clean files (FeedbackWidget did) - for a surgical diff: `git checkout origin/main -- <file>` then re-apply via a `python3` heredoc `str.replace`. Onboarding component files ARE prettier-clean.
- **Auth-free CanvasLogo token verification:** Login uses the GLOBAL flag and renders CanvasLogo. `/Login?next=0` = flag-off (no data-next-design, same token context as V1 onboarding); `/Login` (or `?next=1`) = flag-on. Read the first `<stop offset="0%">` computed `stopColor` via javascript_tool to prove token-vs-fallback. `/_preview/onboarding/:state` renders OnboardingShell without auth (local dev only).
- **Per-surface console sweep:** install a `window.__audit` interceptor on a settled page; reset counters before each step. Reading a React auth-token from localStorage is BLOCKED ("[BLOCKED: Sensitive key]") - infer auth from the route.
- **Read/drive a React controlled input:** native setter + dispatch `input` event. For a DEBOUNCED field, space out reads or confirm with a screenshot. Don't trust a synchronous read right after `.click()`.
- **ci.yml BLOCKING** = mirror-staleness + lint + check:ground + check:em-dash + test:run + build. Typecheck continue-on-error; baseline ~517-519, measure NET DELTA. Gate via `gatekeeper`. GATES GREEN = CI green ON THE PR (`gh pr checks <n>`).
- **Flag param is `next`:** `?next=1` flag-on (persists to localStorage), `?next=0` flag-off. Prod default flag-OFF. index.css: flag-OFF `:root` primary `#d6421f` coral; flag-ON `:root[data-next-design]` primary `#60617d` slate. `--rd-logo-hi` (#8b8ca3) + `--rd-amp-*` live ONLY under [data-next-design]. Login uses the GLOBAL flag; onboarding V2 stamps slate regardless.

## Eli's gate (unchanged)

Item #723 gates Eli's REVEAL CERT (live thin-header CV validation on the flag-on reveal). Do NOT touch the reveal flag; reveal cert + Flip 2 stay Eli's.
