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

## >>> CURRENT (2026-07-26, pass2f) <<<

### Serving truth (verify on resume)

- **origin/main HEAD at handoff = `5956ce3`** (#772, CV-lane handoff docs). CV lane is active:
  #770 (coach prompt ask-don't-tell), #771 (coach job-context DEEP map, HELD), #772 (their
  handoff, "items A/B shipped"), #766 (skills batch-1 aliases). FIRST ACTION on resume: `git fetch`,
  confirm tip (it moves; other lanes merge between sessions).
- **SEVEN design PRs HELD (not merged), all carry a VERIFICATION block; batch-merge when Eli is
  ready. Two from the prior session (#765/#767), five from THIS session (#774-778):**
  - **#765 `eli/cvgen-theater` @ `65f3a57`** - CV-gen progress theater fix (mascot-less). New
    module store `src/lib/cvGenerationJob.js`; in-place "CV ready" -> View CV + Apply. Verified
    4/4 live. (Prior session.)
  - **#767 `eli/feedback-avatar` @ `64543b3`** - feedback pill -> avatar menu (FLAG-ON only) +
    flip-aware dropdown placement + new `src/lib/feedbackStore.js`. Verified 4/4 live. (Prior
    session.) FeedbackWidget open-state store is UNCONDITIONAL (both flag states), launcher only is
    flag-gated; flag-off BEHAVIORALLY identical, not byte-identical.
  - **#774 `eli/emdash-guard`** - diff-scoped em-dash guard (`scripts/check-em-dash.mjs` +
    `npm run check:em-dash`, wired into the gatekeeper agent). The one non-colliding piece of item
    2b (the rest collides with #765/#767 - see queue 2b). CI green.
  - **#775 `eli/cv-mobile-pass`** (item 3) - standalone `/CVAgent` flag-on CV tab was crushed at
    mobile (doc 168px, name one-letter-per-line). Fix in `CVStudioView.jsx`: coach panel stacks
    below md, templates default-collapse below md, doc padding responsive, header shrinks/icon-only
    below sm. Verified via `getBoundingClientRect` both flag states (doc 168->634px, no overflow);
    header-375-fit confirmed by label-hidden simulation (resize_window capped ~750 here). CI green.
  - **#776 `eli/coach-panel-fixes`** (item 4, flag-ON) - AgentComposer dropped the search magnifier
    (reads as chat input) + removed the re-appearing focus pop-up; starters moved to the CoachThread
    empty-state as dismissible inline chips (only before first message). Verified live on the shell
    preview. CI green.
  - **#777 `eli/coach-job-context`** (item 4b Piece A, FRONTEND) - UnifiedJobsFeed surfaces
    `{visibleJobIds, openJobId}` via new `onPageContextChange`; Career forwards to
    `buildCareerPageContext` (added `jobId` -> `job_id`). Backend (`ai-chat/page-context.ts`) already
    accepts both. No render loop live (`/_preview/career`). UNBLOCKS the CV lane's backend piece
    (was dead code). CI green.
  - **#778 `eli/tasks-tile`** (item 5, flag-ON) - added the Tasks tile to `TOOL_TILES` (route Tasks,
    ListTodo rail glyph) + registered `tasks` in `toolColors` (BLUE). Bespoke silhouette already
    existed. Verified 9 tiles live. CI pending at handoff (built+tested locally -> expect green).
- **This handoff = PR `eli/design-handoff-pass2f`** (docs-only, self-merged per Eli's protocol
  update). Next session reads it on origin/main.
- `main` is checked out in a SEPARATE worktree (`/Users/elienglard/getajob-eval`); branch off
  `origin/main` here, never `git checkout main`.

### Item 2b HELD remainder (colliding with the held branches - fold in at #765/#767 batch merge, or fast-follow after)

The em-dash GUARD shipped (#774); these five 2b pieces target lines that only exist on #765/#767 and
so could not land off main. Do them when those branches merge:

- Em-dash sweep of `FeedbackWidget.jsx` (flag-off-only comment, #767) + `JobsGridPreview.jsx`
  (harness copy, #765). (The "2026-07-26 lessons.md entry" the prior handoff named exists on NO
  branch - it was uncommitted then and is gone; skip it.)
- Unicode ellipsis -> ASCII in the JobGridCard/JobDetailModal "Tailoring your CV" label (#765).
- Gate the error toast in `useJobCardActions` on the same guard as the ready toast (`#765` files).
- Unit tests for `cvGenerationJob` (ready-on-superseded=false, error-on-superseded=no-op,
  clear(jobKey) only clears a match) (#765 files).

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

2b. **DONE (partial) - em-dash GUARD shipped as #774; the five colliding pieces are HELD (see
"Item 2b HELD remainder" above - fold in when #765/#767 merge). Original spec kept below for those:** - (a) **Em-dash sweep of 4 added-line sites:** `FeedbackWidget.jsx` (the FLAG-OFF ONLY
comment), `JobsGridPreview.jsx` (2, harness copy), `tasks/lessons.md` (the 2026-07-26 entry).
ALSO replace the Unicode ellipsis in the "Tailoring your CV" label (JobGridCard +
JobDetailModal) with three ASCII periods. AND add an em-dash grep to the Gatekeeper's gate so
the pipeline catches this itself from now on. - (b) **Gate the error toast** in `useJobCardActions` on the SAME guard as the ready toast:
make `markCvGenerationError` return a boolean and toast only when it applied. Same defect
class as the P2 already fixed - a superseded FAILING run currently reports failure over a
different job's live run. - (c) **Add unit tests for `cvGenerationJob`:** ready-on-superseded returns false,
error-on-superseded is a no-op, `clear(jobKey)` only clears a matching run.
NOTE: (b) and (c) touch #765's files (`cvGenerationJob.js`, `useJobCardActions.js`) - if #765
has already batch-merged by pickup, this is a fresh PR off main; if not, coordinate so it does
not conflict with the held #765 branch (cleanest: land after #765 merges).

3. **DONE (#775 HELD).** CV-tab mobile pass - CV page is a mess at mobile widths (Tracker + Browse Jobs are fine).
   Audit CV tab at mobile widths, findings file:line, fix defensible layout breaks in ONE scoped
   PR; anything needing an IA decision -> HELD in the report. (resize_window is UNRELIABLE; verify
   via source classes + real device / DevTools.)
4. **DONE (#776 HELD).** Coach panel fixes (one PR) - (a) suggested-message blocks must STOP covering the
   conversation: show only at thread start before the first message, dismissible with an x, never
   overlay/re-appear over the thread; (b) composer reads as a search bar (magnifying-glass icon,
   placeholder low) - make it read as a chat input. Coach SURFACES only; ai-chat backend is the CV
   lane's - do NOT touch it. (Saw the search-bar composer live in ShellPreview: "Ask about this
   page..." with a magnifier icon.)

4b. **DONE (#777 HELD).** Wire the jobs feed into coach page context. YOUR half = Piece A,
FRONTEND WIRING ONLY (unblocks the CV lane's backend, was dead code): - Pass `job_id` when a job card/modal is open. - Pass the displayed feed ids as `visibleJobIds` up through Career's `setPageContext` call -
currently hardcoded `[]` at `Career.jsx:443`; `UnifiedJobsFeed` must surface its displayed
ids so Career can forward them. - `buildCareerPageContext` and ai-chat's "VISIBLE ON SCREEN" render path ALREADY support both -
this is WIRING, not a new contract. - Backend half (capped JD + strict-match name lookup) is the CV lane's - do NOT touch
`supabase/functions`. Coordination: the CV lane's backend piece is DEAD CODE until 4b lands,
so this unblocks them.

5. **DONE (#778 HELD).** Tasks tile - added `{id:"tasks", page:"Tasks", icon:ListTodo}` after
   Career in `TOOL_TILES` + registered `tasks` (BLUE) in `toolColors`. 9 tiles now.
6. **NEXT. Copy + profile paper cuts (one PR)** - (a) flag-on jobs status line "N roles matched to you"
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
