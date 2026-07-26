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

## >>> CURRENT (2026-07-26, pass2d) <<<

### Serving truth (verify on resume)

- **origin/main HEAD = `5d46fd4`** (#756, the pass2c handoff docs squash - DOCS-ONLY on top of
  code-tip `dc801fe`). FIRST ACTION on resume: `git fetch`, confirm this is still the tip.
  (If the pass2d handoff PR has merged by the time you read this, HEAD will be its squash commit,
  docs-only over the same `dc801fe` code-tip - re-verify.)
- **Serving production deployment = `dpl_BLCCpNQ5JwAgdZ1jd1gPqkN4nJTu`** (READY, sha `5d46fd4`,
  aliases `www.getajob.careers` + `getajob.careers`). Confirm via get_deployment on
  `get-a-job-git-main-getajob-team.vercel.app`, teamId `getajob-team`,
  `meta.githubCommitSha == origin/main`. Note `5d46fd4` is docs-only, so served CODE = `dc801fe`.
- **Rollback CODE target = `b8a384b`** (#751) - the last code change was `dc801fe` (#752);
  rolling back further = `b8a384b`. (Docs-only handoff commits roll back to nothing meaningful.)
- After a merge the LOCAL `origin/main` ref is stale until `git fetch`. `main` is checked out in
  a SEPARATE worktree (`/Users/elienglard/getajob-eval`), so you CANNOT `git checkout main` here
  - branch off `origin/main`.

### Where the product actually is

- V2 onboarding is BUILT + LIVE-reachable (default onboarding now, renders even flag-OFF; the
  0A slate palette is stamped regardless of the reveal flag). We are **pre-Flip-2**. The reveal
  (NEXT_DESIGN flag) is NOT flipped in prod (default OFF). Reveal cert + Flip 2 stay Eli's; do
  NOT touch the reveal flag.
- **Task 4 (onboarding steps 3-4 depth audit) is DONE** (walked screens 0-3 live on `+v2test`,
  stopped short of the PONR). It produced two fixes, both now HELD PRs (#758, #759, below).

### HELD PRs (open, awaiting Eli - BATCH MERGE; NONE block the next queue item)

- **#758** `eli/fix-goal-role-exact-match` (P1) - goal-role search returned an EMPTY dropdown on
  any exact canonical-title query, incl. "Product Manager" / "Data Analyst" (the field's own
  placeholder examples), on the required Continue-gating field. Root cause (hub-verified):
  `matchRoles` (`roleMatch.js:47-55`) Pass 1 returns the exact hit SEPARATELY with empty
  `suggestions`; `DirectionScreenV2.jsx:123` read only `suggestions`, dropping `exact`. Fix =
  surface `exact` as top row, de-duped. **CI green + LIVE-VERIFIED** on branch preview
  (product manager -> Product Manager; data analyst -> Data Analyst).
- **#759** `eli/fix-upload-error-copy` (P2) - dropping a legacy `.doc` or a parse-failing PDF
  showed "We couldn't upload that file / the upload didn't go through / check your connection" -
  but the upload SUCCEEDED; the resilient catch (`StepResumeUpload.jsx` ~445) bucketed all
  non-empty_text/non-timeout errors into `upload_failed`, discarding the actionable message and
  causing a doomed retry loop. Fix = code the `.doc` throw `unsupported_format` + route it to a
  new honest recovery mode; route `pdf_parse_failed` -> existing `extract_none` copy. **CI green.
  Eli RULED: skip the live check, CI green suffices for a copy change.**
- **#753** `eli/pre-flip2-copy` (`4a8546a`) - 3a signup copy + CanvasLogo. Needs: (a) ruling on
  flag-OFF `--rd-logo-hi` glaze (reveal-token touch = Eli's call); (b) OnboardingShell dot-grid
  mark swap?
- **#754** `eli/humanize-tags` (`cff0e90`) - `humanizeTag.js` + raw-tag-leak fixes. Needs review;
  fresh-lane TODO: add the swept/ruled-out sites to the PR body.
- **#755** `eli/reveal-pop` (`6013bdf`) - "We read your CV" reveal motion. Needs eye + a
  `/_preview/onboarding` success-reveal harness state (SuccessReveal isn't diff-reviewable).

### Queue (in order; STANDING ORDER: finish one, proceed IMMEDIATELY to the next without asking)

1. **CV-gen "Generate CV" progress theater - PROMOTED to next (Eli 2026-07-26). SHIPS
   MASCOT-LESS.** Eli live-tested the jobs-card Generate CV entry point on prod flag-on. Four
   specifics on top of the standing spec:
   - (a) NO generation indicator unless HOVERING the card.
   - (b) EXPANDING the card mid-run shows no generation state - state must be SHARED across the
     compact and expanded views of the same job.
   - (c) NO progress ring anywhere, despite `CvGenerationProgress` and the `(user_id, source)`
     poller already existing.
   - (d) on completion the user is dumped into the CV surface with NO apply link and no route
     back to the job - completion must keep the APPLY path one tap away.
     Standing spec (from the prior handoff): wire this path into the full `CvGenerationProgress`
     ring per the #747 pattern ((user_id, source='generate-tailored-cv'), terminal-stage stop);
     KILL the hover-coupled spinner (in-progress persists independent of hover, button DISABLED
     while running); inventory EVERY CV-gen entry point (job cards, CV page, onboarding, Coach,
     Studio), list which show the ring vs have this gap, fix small stragglers same PR. **Ships the
     RING / staged honest-progress standing alone, NO mascot** (character is a later additive
     upgrade once the commissioned sheet is rigged; do NOT go looking for or build a mascot).
2. **Back-navigation (Eli RULED yes, 2026-07-26).** Add Back. Answers PERSIST on advance, so Back
   restores the prior screen with saved values. Screens 2-3 are the clear cases. Screen 1
   back-to-upload is AWKWARD (re-upload reruns extraction) - PROPOSE its handling, do NOT build
   blind. Queued AFTER the theater item.
3. **3d - situation MULTI-SELECT** (after theater + back-nav). RULED yes (multi-select, min 1).
   INVESTIGATE FIRST, build only if shallow: report the situation field storage + EVERY
   single-value consumer (scoring, copy, digest eligibility) with file:line; shallow -> array +
   map existing values forward + primary-situation rule (first = primary); deep -> STOP + report.
   **Corroborated lead:** `employment_status` is ALREADY an array on main (`Profile.jsx:372,:401,
:460`; `StepResumeUpload.jsx` array add/remove; written via `SITUATION_TO_EMPLOYMENT`). Storage
   may already be multi; the stop-condition stands - map every single-value CONSUMER first.
4. **Task 3 retry - reset-www proof (BLOCKED on SMTP quota).** To CLOSE the audit reset finding
   (HELD -> FIXED-config) need the verbatim `redirect_to` from a real prod reset email. From
   `www.getajob.careers/login?mode=forgot`, prefill `+v2test`, submit ONCE (60s rate limit),
   read email (Gmail MCP, `from:noreply@getajob.careers`); expect
   `redirect_to=https://www.getajob.careers/reset-password`. Last attempt returned 200 but NO
   email (anti-enum 200 + SMTP quota contention). Retry when quota resets. AUTH-CONFIG = reserved,
   report-only.
5. **Interaction-depth pass** on authenticated surfaces (dead clicks, forced empty/loading/error,
   mobile breakpoints, keyboard/focus). NOTE: mobile-breakpoint verification via the browser
   harness `resize_window` is UNRELIABLE (innerWidth/outerWidth/screenshot disagree, no clean
   mobile viewport); verify responsive via source classes + real device / DevTools emulation.

### Standing order (in force until Flip 2, Eli 2026-07-26)

Finish a queue item, then proceed IMMEDIATELY to the next without asking. Held-PR merges happen in
BATCH and NEVER block your next item. Stop ONLY for: a reserved category, a failing gate, or 80%
context. Full autonomy within the queue; decide, log here, keep moving.

### Post-audit purge list (Eli to purge; do NOT delete - [[never-delete-rows-without-ruling]])

Junk test files in the `resumes` storage bucket under user `2df9b1bc-7c12-4dd3-b12f-e4eb4a3e6564`:

- `1785060591196_my-cv.doc`
- `1785060670695_audit-cv.pdf`
  `+v2test` was walked to screen 2/3 during Task 4 but NOT finalized (`onboarding_complete=false`).

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
