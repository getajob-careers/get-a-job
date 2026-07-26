# Design lane - resume point

**After any context clear, read THIS + tasks/lessons.md first. Never reconstruct
from scratch. Verify every PR/prod claim against `gh` / Vercel before trusting it
(handoffs go stale the instant something merges; other lanes are active).**

## Standing protocols (verbatim)

- **Canary:** begin every reply to Eli with "Eli, ...". Context canary - when the name stops appearing Eli says **"canary"**, and on that word: overwrite THIS file with a fresh resume point and tell him to `/clear`.
- **Statusline:** context-usage % shows first. Proactively offer a handoff at ~80%.
- **Ledger reports:** end every report with a compact ledger (PR, SHA, state, claims to verify, evidence pointers, open questions).
- **Delegate:** searches -> `explorer`, gate runs -> `gatekeeper`, sweeps/counts -> `sweeper` (haiku subagents in `.claude/agents/`). Newly-added/edited agents need a full quit+relaunch (`/clear` does NOT re-scan). For design-JUDGMENT fan-out (audits), use `general-purpose` agents, not the haiku search subagents.
- **Reporting discipline ([[report-gated-means-flag-off-unreachable]]):** "gated" means EVERY changed line is unreachable flag-off. Shared components get an explicit UNCONDITIONAL-with-reason call-out. PR bodies for coach/canvas work lead with a FLAG SCOPE block.
- **Merge ritual gotcha:** `gh pr merge --delete-branch` FAILS in this worktree (local `main` is checked out in the sibling `getajob-eval` worktree). Merge WITHOUT `--delete-branch`, confirm `merged:true` via `gh pr view`, then delete the remote branch via `gh api -X DELETE repos/getajob-careers/get-a-job/git/refs/heads/<branch>`. Also: the `block-main-push` hook trips on ANY command containing both `push` and `main` tokens - split those commands.

## Identity

- The DESIGN lane, one terminal, persists across context clears. ALL redesign / canvas / CV-surface / token / onboarding-V2-surface work is this lane's. Design lane OWNS V2 onboarding Phase 1 + Phase 2. CV lane keeps sequence/persistence correctness + cross-reviews any of our PRs touching persist paths.
- The "hub" (Eli) verifies claims, applies migrations, rules on merges. One writer per path.
- **The CV lane is actively working the jobs-feed scoring path right now** - stay off it; coordinate through Eli.

## Owned paths

- CV Studio: `src/components/cv-studio/*`; `src/lib/{writeProfileEntity,serializedWriteThrough,revertCvDataField,cvDataAdapter,useSeededCvModel}`; `supabase/functions/_shared/write-mediation.ts`.
- Coach/agents: `src/components/agent/*` (CoachDock, AgentDrawer, CoachInput, CoachThread, AgentComposer, coachPrompts.js); `src/lib/{CoachConversationContext,AgentDrawerContext}`; `src/components/chat/*` (ChatInterface, MessageBubble).
- Redesign surface: `src/components/redesign/*` (shell + ground + home); `src/pages/_preview/*` canvas previews.
- Mascot: `src/components/redesign/mascot/*`, `src/pages/_preview/MascotPreview.jsx`, `docs/design/mascot-*`, `.claude/skills/character-craft/`.
- Onboarding V2: `src/pages/Onboarding*.jsx` / `OnboardingV2*` + screens 0-3 + SpringboardScreenV2 + ReviewScreenV2 + OnboardingTutorial + `src/lib/onboardingPersist` (persist paths = CV-lane cross-review). READ `docs/handoffs/onboarding-restyle-brief.md` + `docs/design/onboarding-v2-phase1-plan.md` BEFORE any onboarding work.
- Tokens/palette: `src/index.css` (`--rd-*` vars + keyframes), `tailwind.config.js` (`rd-*`), the `design-craft` skill doc.

## >>> CURRENT (2026-07-26, pass2c) <<<

### Serving truth (verify on resume)

- **origin/main HEAD = `dc801fe`** (#752). FIRST ACTION on resume: `git fetch`, then confirm
  this is still the tip and still serving.
- **Serving production deployment = `dpl_2HZEZ5x5Br4z7C6g4aViHM7p6jsx`** (READY, sha `dc801fe`,
  aliases `www.getajob.careers` + `getajob.careers`). Confirm via get_deployment on
  `get-a-job-git-main-getajob-team.vercel.app`, teamId `getajob-team`,
  `meta.githubCommitSha == origin/main`.
- **Rollback target = `b8a384b`** (#751) / `dpl_CExryJ2eAUX4WSqgW1bB9JRUC2Bi` (the deployment
  serving immediately before #752). (Supersedes the old handoff's `bc221d0` /
  `dpl_5xsizkWrF7d2ZwSeoeKwVCwKDFes`, which is now stale.)
- After a merge the LOCAL `origin/main` ref is stale until `git fetch`. `main` is checked out in
  a SEPARATE worktree (`/Users/elienglard/getajob-eval`), so you CANNOT `git checkout main` here
  - branch off `origin/main`.

### Where the product actually is (dead framing removed)

- V2 onboarding is BUILT and LIVE-reachable; Eli walked the real flow on production (`?next=1`)
  on 2026-07-26. It is NOT "gated on option-pair picks".
- We are **pre-Flip-2**. The reveal (NEXT_DESIGN flag) is NOT flipped in prod (default OFF,
  verified). The gate to Flip-2 is Eli's cert on the pre-Flip-2 walkthrough fix list below - NOT
  "after onboarding Phase 2".
- Audit triage is DONE. Active work = the pre-Flip-2 walkthrough fix list.

### Merged to main this session

- **#751** (`b8a384b`) - audit findings doc.
- **#752** (`dc801fe`) - **Flip-2 onboarding-skip blocker CLOSED + LIVE-VERIFIED.** `/Home` =
  `Home3Tab` (`pages.lazy.js:75`): flag-OFF -> `<Home/>` (guard `Home.jsx:263-275`) vs flag-ON ->
  `<ThreeTabHome/>`, which had NO onboarding guard, so a fresh un-onboarded user under `?next=1`
  landed on the 3-tab home and stayed (skipped V2 onboarding). Fix = guard added to
  `ThreeTabHome.jsx` (on main ~lines 49-61; verbatim parity with `Home.jsx:263-275`), flag-on
  only so flag-off stays byte-identical. Layout only strips chrome (`Layout.jsx:260`), never
  redirects, so the guard lives per-page. Prod default flag-OFF (served-HTML `envDefault` bakes
  false), never live-now: a Flip-2 reveal-cohort blocker. Verified: cold-loaded `/Home?next=1` as
  authed un-onboarded `+v2test` on branch preview -> bounced to `/Onboarding`.

### HELD PRs (open, awaiting Eli - each needs something)

- **#753** `eli/pre-flip2-copy` (`4a8546a`) - 3a signup: dropped stale "Pilot phase" eyebrow +
  swapped old 2x2 dot-grid `BrandMark` for `CanvasLogo` (official locked logotype). Both flag
  states verified. **Needs from Eli:** (a) ruling on flag-OFF logo glaze - `--rd-logo-hi` is
  defined ONLY in the flag-ON `:root[data-next-design]` block, so flag-off the mark's top-lit
  stop falls dark (looks fine). Pixel-perfect = add `--rd-logo-hi: #ec6a47;` to the OFF `:root`
  in `src/index.css` (clay's canonical value per CanvasLogo) + update the line-33 comment + mirror
  `tasks/redesign.md`. That is a reveal-token touch = Eli's call. (b) `OnboardingShell.jsx` still
  uses the same old dot-grid mark - swap too?
- **#754** `eli/humanize-tags` (`cff0e90`) - 3b: new `src/lib/humanizeTag.js` (`deslug` +
  `humanizeTag`, acronym allowlist). Fixed raw-tag leaks at `extractionObservations.js:85` +
  Roadmap qual band (`Roadmap.jsx:417`). 1740 tests green. **Needs from Eli:** review.
  **Fresh-lane TODO on the PR** (Eli's ask): the item said "all surfaces printing these tags";
  landed two. Add to the PR body the sweep sites CHECKED and RULED OUT (skill IDs already
  humanized via `humanizeSkillId`; everything else on `primary_domain`/`qualification_level` was
  writes/reads, not display) so coverage is explicit.
- **#755** `eli/reveal-pop` (`6013bdf`) - 3c: "We read your CV" reveal - staggered per-bullet
  reveal + warm `--rd-golden-tint` radial glow + check zoom-in (count-up already existed,
  reduced-motion-safe). All `motion-safe:`, tokens-only. **Needs from Eli:** eyeball the motion.
  **Fresh-lane TODO on the PR** (Eli's ruling): `SuccessReveal` is NOT in the `/_preview/onboarding`
  harness (renders only in the live flow post-extraction) so it cannot be judged from a diff - ADD
  a `/_preview/onboarding` success-reveal state so Eli can review it.
- **#756** `eli/handoff-pass2c` - THIS handoff rewrite. Fast-merge so `main` carries it.

### Task 3 - reset-www proof: BLOCKED on SMTP quota, NOT closed

Eli added `www.getajob.careers/reset-password` to the Supabase Auth redirect allowlist. To CLOSE
(flip the audit doc's reset finding HELD -> FIXED-config) we still need the verbatim `redirect_to`
from a real production reset email. RETRY: from `www.getajob.careers/login?mode=forgot`, prefill
`+v2test` via the native setter, submit ONCE (Turnstile auto-passes; 60s rate limit). Read the
email (Gmail MCP, `from:noreply@getajob.careers`) - the token-corruption bug hits the `token=`
byte, not the later `redirect_to=` param, so `redirect_to` is readable. Expect
`redirect_to=https://www.getajob.careers/reset-password`; confirm the form renders. LAST ATTEMPT
(07-26) returned 200 "sent" but NO email - `resetPasswordForEmail` returns 200 even when
rate-limited/nonexistent (anti-enum), plus SMTP hourly-quota contention with a concurrent
`+walkthrough` signup. Retry when quota resets, or verify the allowlist in the Supabase dashboard.
`/reset-password` already RENDERS on www + resolves to the honest-error state (PR #748 live).

### Queue remaining (in order; each = own scoped PR, HELD, off a fresh branch from origin/main)

1. **Task 4 - onboarding steps 3-4 depth.** Steps 3 + 4 UI/console/states; forced error state
   (invalid file type on the dropzone - activating it opens a BLOCKING OS file dialog, drive via
   synthetic drop / `file_upload`, never a real click); CV-extraction loading state; forward-nav;
   dropzone keyboard activation; mobile breakpoints. Do NOT trigger the point-of-no-return (final
   action committing `onboarding_complete=true`) on a fresh account. See "How to resume" below.
2. **3d - situation MULTI-SELECT.** RULED yes (multi-select, min 1). INVESTIGATE FIRST, build only
   if shallow: (1) report the situation field storage + EVERY single-value consumer with file:line
   (scoring, copy, digest eligibility, anything). (2) shallow -> multi-select, store array, map
   existing single values forward, adapt consumers with a stated primary-situation rule (first
   selection = primary). (3) deep -> STOP and report the map. Copy stays plain and warm.
   **Corroborated lead:** `employment_status` is ALREADY an array on main (`Profile.jsx:372,:401,
:460`; `StepResumeUpload.jsx:185-200` array add/remove; written via `SITUATION_TO_EMPLOYMENT`,
   `OnboardingV2.jsx:181`). Storage may already be multi; the stop-condition stands - map every
   single-value CONSUMER first.
3. **CV-page "Generate CV" progress theater - SHIPS MASCOT-LESS (Eli ruled, see Rulings locked).**
   The per-job "Generate CV" button on the CV page is NOT wired to the progress system: backend
   writes honest progress (7/7, source `generate-tailored-cv`, hub-verified) but the UI shows only
   a small spinner coupled to the button's HOVER state, so moving the mouse off makes it vanish
   mid-generation (10-16s of perceived nothing). Two-part fix: (1) wire this path into the full
   `CvGenerationProgress` ring per the #747 pattern ((user_id, source='generate-tailored-cv'),
   terminal-stage stop) - **the RING / staged honest-progress, NO mascot (the character is a later
   upgrade once the commissioned sheet is rigged; do NOT go looking for a mascot).** (2) Kill the
   hover-coupled spinner: in-progress state persists independent of hover, button disabled while
   running. WHILE THERE: inventory EVERY CV-gen entry point (job cards, CV page, onboarding, Coach,
   Studio); list which show the ring vs have this gap; fix small stragglers same PR, report if not.
4. **Task 3 retry** (when SMTP quota allows - see above).
5. **Interaction-depth pass** on authenticated surfaces (buttons/dead-clicks, forced
   empty/loading/error, mobile breakpoints, keyboard/focus, both flag states).

## Rulings locked (do not re-litigate)

- **CTA = Option A** (landed #690). **Landing-link = Option C** (landed). **Visit-homepage = Option A** (landed #698).
- **Mascot Round 1 = MISS -> commissioned sheet; A-frame stays; no more in-house figures** (2026-07-23, below). CV-gen theater decoupled, ships mascot-less.
- **Motion = anime.js v4 per-submodule** (installed v4.5.0) for timelines/orchestration; CSS for simple loops. framer-motion being pruned. reduced-motion->static + canvas-only + honest UI bind all motion work.
- **Onboarding palette = 0A** (stamp data-next-design on V2 shell mount, scoped).
- **Dead deps** (framer-motion/three/canvas-confetti in 0 src files) - prune-PR LOGGED, Eli's call, not built.

### MASCOT: Round 1 = MISS -> COMMISSIONED SHEET (Eli ruled 2026-07-23)

- **Verdict:** MISS. Motion doesn't read (sip/typing unconvincing), laptop doesn't read as a laptop, figure not seated on the chair, appeal missed. **NO further in-house figure attempts.**
- **Ruled fallback taken:** commissioned character sheet. **The A-frame concept STAYS** (character seated at an A-frame desk that genuinely reads as the logotype's "A", per the storyboard spine).
- **Artist brief WRITTEN:** `docs/design/mascot-artist-brief.md` - commission-ready (character desc, A-frame-reads-as-A requirement matched to CanvasLogo MarkFullChair, 6-pose vocabulary [rest-in-A / working / drinking / reading / celebrating / horizon], separable-parts + pivot rigging spec, palette->hex token table, deliverables/turnaround). Reference board + motion registers indexed for the illustrator.
- **NEXT on mascot:** Eli sources an illustrator / hands the brief out. On sheet delivery -> rig it (layered SVG + anime.js) -> drops into the already-built sign-up idle + queued slots. governed by `character-craft` skill.
- **CV-gen theater DECOUPLED from the mascot (Eli ruled):** when its queue slot arrives it ships MASCOT-LESS (ring / staged honest-progress standing alone); the character drops in later as an upgrade once the sheet lands + is rigged. DO NOT build the character now.

## Autonomy contract (in force, Eli)

Full autonomy within the approved queue; decide, log here, keep moving; NO pickers unless a
genuine auth-boundary/irreversible call. HELD FOR ELI only for reserved categories: schema, edge-fn
outside plan, anything irreversible, anything sending to real users, **the reveal flag**, and
**auth-config / auth-internals** (Eli's ruling on the reset flow). A reveal-token touch (e.g. adding
`--rd-logo-hi` to the OFF block) is reveal-adjacent - flag it, do not do it unilaterally.
`settings.local.json` has Bash/Edit/Write/WebFetch allow (unstaged, never commit).

## How to resume the onboarding audit (test account)

- Account: **elienglard34+v2test@gmail.com / V2audit-2026!** (internal '+' account, auto-scrubbed;
  live DB row confirmed `onboarding_complete=false`, `onboarding_step=0`, created 2026-07-24). Eli's
  `+walkthrough` account also exists (fresh, un-onboarded).
- **Session:** I cannot type passwords. Pattern: open a visible tab on the target origin's `/login`
  (dev `localhost:5173` serves the current branch with HMR; or a branch preview
  `get-a-job-git-<branch>-getajob-team.vercel.app`), prefill the email via the native setter, ask
  Eli to type the password + Sign in. Supabase persists the session to that origin's localStorage,
  shared across tabs of the same origin - drive from the MCP tab after Eli authenticates.
- **Flag-on cold-load test:** navigate `/Home?next=1` (sets + persists `localStorage.nextDesign=1`);
  authed un-onboarded should bounce to `/Onboarding` (the #752 fix).
- **Recovery-link mint is ABANDONED** - the Gmail API corrupts one byte of the Supabase
  `/verify?token=` URL, so reconstructed tokens read `otp_expired`. Use tab sign-in.
- **Dropzone (step 1) opens a BLOCKING OS file dialog on click** - never real-click; drive via
  `file_upload` / synthetic drop.

## Standing facts / techniques

- **Per-surface console sweep:** install a `window.__audit` interceptor (`console.error`/`warn` +
  window error/rejection listeners, counting `Maximum update depth` + `validateDOMNesting`
  separately) on a settled page, then client-nav via
  `history.pushState(url); dispatchEvent(new PopStateEvent('popstate'))` so it SURVIVES the route
  change and counts only FRESH warnings. Reset counters before each step.
- **Read a React controlled input reliably:** set via the native setter
  (`Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,v)`) then
  dispatch `new Event('input',{bubbles:true})`. Plain `.value=` / computer-type is flaky.
- **Don't trust a synchronous read right after `.click()`** - React hasn't re-rendered.
- **Formatter (PostToolUse) reflows whole non-prettier-clean files** (Login.jsx, index.css, big
  pages). For a SURGICAL diff: `git checkout origin/main -- <file>` then re-apply via a `python3`
  heredoc `str.replace` (bypasses the Edit formatter hook). Verify `git diff --stat`. The formatter
  also STRIPS a just-added import whose usage does not exist yet - add the usage first (or same
  surgical write), then the import.
- **No em dashes** in additions; scope the grep to YOUR files (handoff/lessons M files carry dashes).
- **ci.yml BLOCKING** = mirror-staleness + lint + check:ground + test:run + build. Typecheck
  continue-on-error; baseline ~519-522, measure NET DELTA. Gate via the `gatekeeper` subagent.
- **Flag param is `next`:** `?next=1` flag-on (persists to localStorage), `?next=0` flag-off. Dev
  `:5173` serves the CURRENT branch (HMR). Prod default flag-OFF. FLAG-OFF BYTE-IDENTITY: edit
  shared components via python text-surgery. Two flag token blocks in index.css: flag-OFF `:root`
  primary `#d6421f` coral / tertiary `#5e584e`; flag-ON `:root[data-next-design]` primary `#60617d`
  slate / tertiary `#a6957f` (self-documented sub-AA).

## Eli's gate (unchanged)

Item #723 gates Eli's REVEAL CERT (live thin-header CV validation on the flag-on reveal). Do NOT
touch the reveal flag; reveal cert + Flip 2 stay Eli's.
