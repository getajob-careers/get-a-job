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
- **Merge ritual gotcha:** `gh pr merge --delete-branch` FAILS in this worktree (local `main` is checked out in the sibling `getajob-eval` worktree). Merge WITHOUT `--delete-branch`, confirm `merged:true` via `gh pr view`, then delete the remote branch via `gh api -X DELETE repos/getajob-careers/get-a-job/git/refs/heads/<branch>`. Also: the `block-main-push` hook trips on ANY command containing both `push` and `main` tokens - split those commands.

## Identity

- The DESIGN lane, one terminal, persists across context clears. ALL redesign / canvas / CV-surface / token / onboarding-V2-surface work is this lane's. Design lane OWNS V2 onboarding Phase 1 + Phase 2. CV lane keeps sequence/persistence correctness + cross-reviews any of our PRs touching persist paths.
- The "hub" (Eli) verifies claims, applies migrations, rules on merges. One writer per path.
- **The CV lane is actively working the jobs-feed scoring path right now** - stay off `JobsSearchTab`, `jobsSearchFacets`, `scoreJobFit`, `UnifiedJobsFeed`; coordinate through Eli.

## Owned paths

- CV Studio: `src/components/cv-studio/*`; `src/lib/{writeProfileEntity,serializedWriteThrough,revertCvDataField,cvDataAdapter,useSeededCvModel}`; `supabase/functions/_shared/write-mediation.ts`.
- Coach/agents: `src/components/agent/*` (CoachDock, AgentDrawer, CoachInput, CoachThread, AgentComposer, coachPrompts.js); `src/lib/{CoachConversationContext,AgentDrawerContext}`; `src/components/chat/*` (ChatInterface, MessageBubble).
- Redesign surface: `src/components/redesign/*` (shell + ground + home); `src/pages/_preview/*` canvas previews.
- Mascot: `src/components/redesign/mascot/*`, `src/pages/_preview/MascotPreview.jsx`, `docs/design/mascot-*`, `.claude/skills/character-craft/`.
- Onboarding V2: `src/pages/Onboarding*.jsx` / `OnboardingV2*` + screens 0-3 + SpringboardScreenV2 + ReviewScreenV2 + OnboardingTutorial + `src/lib/onboardingPersist` (persist paths = CV-lane cross-review). READ `docs/handoffs/onboarding-restyle-brief.md` + `docs/design/onboarding-v2-phase1-plan.md` BEFORE any onboarding work.
- Tokens/palette: `src/index.css` (`--rd-*` vars + keyframes), `tailwind.config.js` (`rd-*`), the `design-craft` skill doc.

## V2 onboarding step machine (mapped 2026-07-26, verified live)

4-screen linear orchestrator, `src/pages/OnboardingV2.jsx` (SCREENS array ~L45-50), 0-indexed:

- **Screen 0 `cv_upload`** - `StepResumeUpload` (chromeless embed; shell owns header + progress + situation row). Dropzone `accept=".pdf,.docx"` gates only the native PICKER, not a drag-drop. a11y good (`role=button`, `tabIndex=0`, aria-label). Extraction states: uploading -> extracting -> done/empty_text/fail.
- **Screen 1 `review`** - `ReviewScreenV2`. States: extracting / success (count-up) / failed ("We couldn't read your CV") / skipped ("No CV yet"). Manual form; required = Full name, Institution, Education level, Field of study, Start date (Continue disabled until met - correct gating).
- **Screen 2 `direction`** - `DirectionScreenV2`. Goal-role search (debounced, ArrowUp/Down + Enter + Escape + clear-X), location free-text, work-arrangement multi-select, practicum inline-expand (Yes reveals faculty/self). No own Continue - shell drives advance + runs the primary_domain inference write. Continue gated on goal role.
- **Screen 3 `springboard`** - `SpringboardScreenV2`. anime.js code-split pop-in (CSS `onbv2-rise` fallback, reduced-motion static). `hasCv` copy branch. **POINT OF NO RETURN = the "Go to my workspace" button** -> `finaliseAndLaunch()` -> `handleFinalise()` (`onboardingPersist.js:729-730` sets `onboarding_complete=true`, `onboarding_step=6`). NEVER click it on a fresh/test account.

## >>> CURRENT (2026-07-26, pass2e) <<<

### Serving truth (verify on resume)

- **origin/main HEAD = `8ca318e`** (#764, CV-lane handoff docs). Includes the 5-PR batch this
  session squash-merged: #758 `6375ac3`, #759 `7a274d1`, #754 `b6c2700`, #753 `2fd3a96`,
  #755 `533ff00`, plus CV-lane #760/#763/#764. FIRST ACTION on resume: `git fetch`, confirm tip.
- **Two design PRs HELD (not merged), both carry a full VERIFICATION block; batch-merge when Eli
  is ready:**
  - **#765 `eli/cvgen-theater` @ `65f3a57`** - CV-gen progress theater fix (mascot-less). Ring
    rendered OUTSIDE `.cx-actions` (visible off-hover), shared card/modal state via new module
    store `src/lib/cvGenerationJob.js`, honest ring off the `(user_id,'generate-tailored-cv')`
    poller, in-place "CV ready" -> View CV + Apply (auto-redirect killed). Dev harness in
    JobsGridPreview. Verified 4/4 live. QA P2 (superseded CV-ready toast) FIXED in `65f3a57`.
    CI: recheck the P2 commit run (green locally: lint/typecheck 519).
  - **#767 `eli/feedback-avatar` @ `64543b3`** - feedback pill -> avatar menu (FLAG-ON only; pill
    kept flag-off since that shell has no avatar menu, retires at Flip 2) + flip-aware avatar
    dropdown placement (was opening upward off-screen) + `CanvasCommandItem` `style` default
    (typecheck 519->517). New `src/lib/feedbackStore.js` + `feedbackStore.test.js`. Verified
    4/4 live on `/_preview/shell/shell-home-active?next=1`. Gate GREEN.
- **This handoff = PR `eli/design-handoff-pass2e`** (docs-only). Merge it before /clear so the next
  session reads the fresh resume point on origin/main.
- `main` is checked out in a SEPARATE worktree (`/Users/elienglard/getajob-eval`); branch off
  `origin/main` here, never `git checkout main`.

### Self-verification pipeline (STANDING PROTOCOL, Eli 2026-07-26 - replaces per-PR human review)

Per queue item, after the build is done, spawn IN PARALLEL (general-purpose agents, fresh context):

1. **Spec Verifier** - given ONLY the ruled spec + the diff: does it implement exactly what was
   ruled, nothing missing/extra, no scope creep?
2. **QA Breaker** - adversarial, given acceptance criteria + the preview/harness: try to break it
   (edge inputs, rapid interactions, mid-run nav, refresh, double-fire, mobile, reduced-motion;
   console must stay clean). Pass/fail per criterion + repro steps.
3. **Flag-Scope Auditor** (when flag gating claimed) - every changed line unreachable flag-off, or
   explicitly UNCONDITIONAL-with-reason; render-identity evidence, not assertion.
4. **Gatekeeper** - full CI gate.
   DISAGREEMENT RULE: any verifier failure or doubt = fix it or drop that piece and log it; never
   argue a finding down. PR body gains a **VERIFICATION block** (one line per verifier + evidence); a
   PR without it is not HELD-ready. Clean-block PRs merge at batch time on hub verification alone.
   Still ELI-ONLY: reserved categories (real users, emails, auth-config, reveal flag, schema beyond
   approved migrations, anything irreversible), taste/IA proposals marked HOLD (e.g. Career
   convergence), and the final re-audit triage.

### >>> CRITICAL OPERATIONAL LESSON (this session) <<<

**Do NOT spawn parallel agents that run `git checkout`/`git stash`/branch-switching in the SHARED
working tree.** This session a background Gatekeeper agent measured a typecheck baseline by
checking out another ref, and concurrent verifier git ops raced - the working tree got switched off
my feature branch mid-work with a spurious `tasks/lessons.md` UU conflict. The PRs were safe (all
work was committed+pushed first), but the tree needed manual recovery (`git checkout HEAD --
tasks/lessons.md`; `git restore --staged .claude/settings.local.json`). RULES: (a) always COMMIT +
PUSH your branch BEFORE spawning verifier agents; (b) verifiers may READ via `git diff
origin/main...BRANCH` / `git show BRANCH:file` (no branch switch) but must NOT checkout/stash;
(c) TELL the Gatekeeper the baseline number (519) rather than have it measure via checkout;
(d) prefer running QA verifiers against the PUSHED branch / its Vercel preview when they need a
live app, not the shared local tree.

### Queue (STANDING ORDER: finish one, proceed IMMEDIATELY to the next; held merges are batch and never block)

1. DONE - CV-gen theater (#765 HELD).
2. DONE - feedback pill + avatar menu (#767 HELD). (c) mobile coach entry EXISTS
   (`CanvasMobileRail.jsx:49` Sparkles -> CoachDock sheet); pill removal clears the occlusion.
3. **CV-tab mobile pass** - CV page is a mess at mobile widths (Tracker + Browse Jobs are fine).
   Audit CV tab at mobile widths, findings file:line, fix defensible layout breaks in ONE scoped
   PR; anything needing an IA decision -> HELD in the report. (resize_window is UNRELIABLE; verify
   via source classes + real device / DevTools.)
4. **Coach panel fixes (one PR)** - (a) suggested-message blocks must STOP covering the
   conversation: show only at thread start before the first message, dismissible with an x, never
   overlay/re-appear over the thread; (b) composer reads as a search bar (magnifying-glass icon,
   placeholder low) - make it read as a chat input. Coach SURFACES only; ai-chat backend is the CV
   lane's - do NOT touch it. (Saw the search-bar composer live in ShellPreview: "Ask about this
   page..." with a magnifier icon.)
5. **Tasks tile (small PR)** - coach-accepted tasks land on the Tasks page, which has NO entry in
   the flag-on sidebar (`TOOL_TILES` in `CanvasSidebar.jsx`, 8 tiles, Tasks absent). Add a Tasks
   tile matching the existing pattern. No Tasks-page redesign, just the door.
6. **Copy + profile paper cuts (one PR)** - (a) flag-on jobs status line "N roles matched to you"
   -> "N roles, ranked for you" (keep the live count); (b) Profile: edit silently fills the form up
   top without scrolling -> auto-scroll to the form on edit; (c) Profile: leaving with unsaved
   changes loses work -> unsaved-changes confirm (save/discard).
7. **OnboardingShell logo (RULED pre-flip)** - swap the OnboardingShell dot-mark for CanvasLogo
   (carried from #753). Fold the #755 em-dash sweep ("counts - a soft golden" in ReviewScreenV2)
   into whichever PR touches ReviewScreenV2 first.
8. **Fresh-load flash (investigate-first, then fix)** - cold load briefly flashes a
   complete-your-onboarding-style page before the real page renders. Likely a guard rendering
   before auth/profile queries resolve. Reproduce cold/throttled, find the flashing component, fix
   so unresolved auth/profile shows a NEUTRAL loading state, never guard copy. First-impression bug.
9. **Career convergence (investigate + PROPOSE, HOLD for Eli's ruling before building)** - Career
   diverges from the three-tab home (Career carries the track-roles panel, Browse Jobs does not;
   per-role buttons cramped). Investigate both layouts, propose the convergence (which wins, what
   moves, what it costs), HOLD. No building before his ruling.
10. Standing tail: **back-nav** (RULED yes: Back restores prior screen with saved values; screens
    2-3 clear; screen-1 back-to-upload awkward - PROPOSE its handling, do not build blind) ->
    **3d situation MULTI-SELECT** (RULED yes, min 1; INVESTIGATE FIRST - report every single-value
    CONSUMER with file:line; shallow -> array + map forward + first=primary; deep -> STOP.
    Corroborated lead: `employment_status` already an array on main) -> **Task 3 reset PRODUCTION
    proof** (now a CERT BLOCKER: reset is login-critical, prove on prod before Eli's cert; from
    `www.getajob.careers/login?mode=forgot`, prefill `+v2test`, submit ONCE (60s limit), read email
    via Gmail MCP `from:noreply@getajob.careers`, expect
    `redirect_to=https://www.getajob.careers/reset-password`; retry when SMTP quota allows.
    AUTH-CONFIG = reserved, report-only).
11. **FINAL PRE-CERT RE-AUDIT (last, after everything above merged)** - full-platform audit of the
    CURRENT state, both flag states (flag-on priority = reveal cohort), every registered page, both
    shells, public landing, mobile widths. Structure as PARALLEL specialist tracks (general-purpose
    agents for judgment; haiku subagents for searches/counts ONLY): (1) design-craft (9-rule bar,
    per-surface, audit-2026-07 method), (2) FUNCTIONAL QA (feature correctness: every button does
    what it claims, every flow completes, every state empty/loading/error/mid-run renders honestly,
    console clean per surface via the `window.__audit` sweep), (3) mobile, (4) copy/honesty (no
    dishonest counts, no leaked internal tags, no false action/match claims). Synthesize ONE
    severity-ranked findings doc, blockers at top, for Eli's cert triage. If you can't reach it
    before 80% context, hand off cleanly and let a fresh session run it whole.

### Logged follow-ups

- #753 OnboardingShell dot-mark -> CanvasLogo (now queue item 7, RULED pre-flip).
- #755 em-dash "counts - a soft golden" in ReviewScreenV2 comment -> sweep in next PR touching it.
- Icon-language consistency (tool logos vs brand icon set) - LOGGED, not queued; flag cheap wins.

### Post-audit purge list (Eli to purge; do NOT delete - [[never-delete-rows-without-ruling]])

Junk test files in the `resumes` bucket under user `2df9b1bc-7c12-4dd3-b12f-e4eb4a3e6564`:
`1785060591196_my-cv.doc`, `1785060670695_audit-cv.pdf`. `+v2test` walked to screen 2/3, NOT
finalized (`onboarding_complete=false`).

## Rulings locked (do not re-litigate)

- **CTA = Option A** (#690). **Landing-link = Option C**. **Visit-homepage = Option A** (#698).
- **Mascot Round 1 = MISS -> commissioned sheet; A-frame stays; no more in-house figures**
  (2026-07-23). Artist brief WRITTEN: `docs/design/mascot-artist-brief.md`. On sheet delivery ->
  rig (layered SVG + anime.js) -> drops into the built sign-up idle. CV-gen theater DECOUPLED
  from the mascot - ships mascot-less now, character drops in later.
- **Motion = anime.js v4 per-submodule** (v4.5.0) for timelines; CSS for simple loops.
  framer-motion being pruned. reduced-motion -> static + canvas-only + honest UI.
- **Onboarding palette = 0A** (stamp data-next-design on V2 shell mount, scoped; renders slate
  regardless of the global reveal flag).
- **#759 copy fix: CI green suffices, skip live check** (2026-07-26).
- **Back-nav: yes** (2026-07-26; screen-1 handling to be proposed not built blind).
- **Completion (d) = in-place** (2026-07-26): kill auto-redirect; ready -> View CV + Apply on card and modal, no nav without a tap.
- **Feedback pill flag-OFF-only** (2026-07-26): flag-off has no avatar menu; pill retires at Flip 2, relocated to CanvasAvatarChip flag-on. Verifiers blessed; Eli to confirm.
- **Self-verification pipeline REPLACES per-PR human review** (2026-07-26); see the CURRENT section.

## Autonomy contract (in force, Eli)

Full autonomy within the approved queue; decide, log here, keep moving; NO pickers unless a
genuine auth-boundary/irreversible call. HELD FOR ELI only for reserved categories: schema,
edge-fn outside plan, anything irreversible, anything sending to real users, **the reveal flag**,
and **auth-config / auth-internals**. A reveal-token touch (e.g. adding `--rd-logo-hi` to the OFF
block) is reveal-adjacent - flag it, do not do it unilaterally. `settings.local.json` has
Bash/Edit/Write/WebFetch allow (unstaged, never commit).

## How to resume the onboarding audit (test account)

- Account: **elienglard34+v2test@gmail.com / V2audit-2026!** (internal '+' account, auto-scrubbed;
  DB row `onboarding_complete=false`). Eli's `+walkthrough` account also exists (fresh).
- **Session:** I cannot type passwords. Pattern: open a visible tab on the target origin's
  `/login`, prefill the email via the native setter, decline the cookie banner, ask Eli to type
  the password + Sign in. Supabase persists the session to THAT ORIGIN's localStorage, shared
  across tabs of the same origin - drive from the MCP tab after Eli authenticates. **Branch-preview
  subdomains do NOT share the main-preview session** (per-origin), and `/_preview/*` routes are
  env-gated OFF on branch previews (bounce to /login) - so a branch-preview walkthrough needs its
  own sign-in on that subdomain.
- **Venue for walkthroughs:** the branch-preview alias for the branch under test (real build at
  the code tip, no dev-server dependency). Password sign-in works from any preview origin; only
  OAuth/magic-link needs the allowlist.
- **Recovery-link mint is ABANDONED** (Gmail API corrupts one byte of the `/verify?token=` URL).
  Use tab sign-in.
- **Dropzone opens a BLOCKING OS file dialog on click/keyboard-activate** - never real-click or
  keyboard-activate it; drive files via `file_upload` / **synthetic drop** (construct a File +
  DataTransfer, dispatch dragover+drop on the `[role=button][aria-label*=resume]` element).

## Standing facts / techniques

- **Per-surface console sweep:** install a `window.__audit` interceptor
  (`console.error`/`warn` + window error/rejection listeners) on a settled page; reset counters
  before each step. Reading a React auth-token from localStorage is BLOCKED by the harness
  ("[BLOCKED: Sensitive key]") - infer auth from the route (a signed-in un-onboarded user lands
  on /Onboarding, not /login), not from the token value.
- **Read/drive a React controlled input:** native setter
  (`Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,v)`) + dispatch
  `new Event('input',{bubbles:true})`. For a DEBOUNCED search field, a tight JS poll loop races
  the debounce and catches the PRIOR query's dropdown - space out reads or confirm with a
  screenshot (that's how #758 was verified). Real computer-type also works and is the tie-breaker.
- **Don't trust a synchronous read right after `.click()`** - React hasn't re-rendered.
- **Formatter (PostToolUse) reflows whole non-prettier-clean files.** For a SURGICAL diff:
  `git checkout origin/main -- <file>` then re-apply via a `python3` heredoc `str.replace`. The
  onboarding component files ARE prettier-clean (Edit produced minimal diffs for #758/#759).
  Formatter also STRIPS a just-added import whose usage doesn't exist yet.
- **No em dashes** in additions; scope the grep to YOUR files (handoff/lessons M files carry them).
- **ci.yml BLOCKING** = mirror-staleness + lint + check:ground + test:run + build. Typecheck
  continue-on-error; baseline ~519-522, measure NET DELTA. Gate via the `gatekeeper` subagent.
  GATES GREEN means CI green ON THE PR, not just local (confirm via `gh pr checks <n>`).
- **Flag param is `next`:** `?next=1` flag-on (persists to localStorage), `?next=0` flag-off. Prod
  default flag-OFF. Two flag token blocks in index.css: flag-OFF `:root` primary `#d6421f` coral;
  flag-ON `:root[data-next-design]` primary `#60617d` slate. Login page uses the GLOBAL flag
  (coral flag-off); onboarding stamps slate regardless.

## Eli's gate (unchanged)

Item #723 gates Eli's REVEAL CERT (live thin-header CV validation on the flag-on reveal). Do NOT
touch the reveal flag; reveal cert + Flip 2 stay Eli's.
