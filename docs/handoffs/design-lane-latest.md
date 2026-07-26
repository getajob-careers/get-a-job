# Design lane - resume point

**After any context clear, read THIS + tasks/lessons.md first. Never reconstruct
from scratch. Verify every PR/prod claim against `gh` / Vercel before trusting it
(handoffs go stale the instant something merges; other lanes are active).**

## >>> CURRENT (2026-07-26, pass2c) <<<

### Serving truth (verify on resume)

- **origin/main HEAD = `dc801fe`** (#752). FIRST ACTION on resume: `git fetch`, then
  confirm this is still the tip and still serving.
- **Serving production deployment = `dpl_2HZEZ5x5Br4z7C6g4aViHM7p6jsx`** (READY, sha
  `dc801fe`, aliases `www.getajob.careers` + `getajob.careers`). Confirm via
  get_deployment on `get-a-job-git-main-getajob-team.vercel.app`, teamId `getajob-team`,
  `meta.githubCommitSha == origin/main`.
- After a merge the LOCAL `origin/main` ref is stale until `git fetch`. `main` is checked
  out in a SEPARATE worktree (`/Users/elienglard/getajob-eval`), so you CANNOT
  `git checkout main` here - branch off `origin/main` instead.

### Where the product actually is (the dead framing is gone)

- V2 onboarding is BUILT and LIVE-reachable; Eli walked the real flow on production
  (`?next=1`) on 2026-07-26. It is not "gated on option-pair picks".
- We are **pre-Flip-2**. The reveal (NEXT_DESIGN flag) is NOT flipped in prod (default
  OFF, verified). The gate to Flip-2 is Eli's cert on the pre-Flip-2 walkthrough fix
  list below - NOT "after onboarding Phase 2".
- Audit triage is DONE. The active work is the pre-Flip-2 walkthrough fix list.

### Merged to main this session

- **#751** (`b8a384b`) - audit findings doc.
- **#752** (`dc801fe`) - **Flip-2 onboarding-skip blocker CLOSED + LIVE-VERIFIED.**
  `/Home` = `Home3Tab` (`pages.lazy.js:75`): flag-OFF -> `<Home/>` (guard `Home.jsx:263-275`)
  vs flag-ON -> `<ThreeTabHome/>`, which had NO onboarding guard, so a fresh un-onboarded
  user under `?next=1` landed on the 3-tab home and stayed (skipped V2 onboarding). Fix =
  guard added to `ThreeTabHome.jsx` (now on main at lines ~49-61; verbatim parity with
  `Home.jsx:263-275`), flag-on only so flag-off stays byte-identical. Layout only strips
  chrome (`Layout.jsx:260`), never redirects, so the guard has to live per-page. Prod
  default flag-OFF (served-HTML `envDefault` bakes false) so it was never live-now: a
  Flip-2 reveal-cohort blocker. Verified: cold-loaded `/Home?next=1` as authed un-onboarded
  `+v2test` on the branch preview -> bounced to `/Onboarding`, V2 flow rendered.

### HELD PRs (open, awaiting Eli - each needs something)

- **#753** `eli/pre-flip2-copy` (`4a8546a`) - 3a signup: dropped the stale "Pilot phase"
  eyebrow + swapped the old 2x2 dot-grid `BrandMark` for `CanvasLogo` (official locked
  logotype). Both flag states browser-verified. **Needs from Eli:** (a) ruling on the
  flag-OFF logo glaze - `--rd-logo-hi` is defined ONLY in the flag-ON `:root[data-next-design]`
  block, so flag-off the mark's top-lit stop falls dark (looks fine, not broken). Pixel-perfect
  fidelity = add `--rd-logo-hi: #ec6a47;` to the OFF `:root` in `src/index.css` (clay's
  canonical value per CanvasLogo) + update the line-33 comment + mirror the `tasks/redesign.md`
  token table. That is a reveal-token touch = Eli's call. (b) `OnboardingShell.jsx` still uses
  the same old dot-grid mark - swap it too (signup flows straight into onboarding)?
- **#754** `eli/humanize-tags` (`cff0e90`) - 3b: new `src/lib/humanizeTag.js` (`deslug` for
  mid-sentence prose + `humanizeTag` for standalone labels, acronym allowlist). Fixed the raw
  tag leaks at `extractionObservations.js:85` ("centers on software_engineering") and the
  Roadmap qualification band (`Roadmap.jsx:417`). 1740 tests green. **Needs from Eli:** review.
  **Fresh-lane TODO on this PR** (Eli's ask): the original item said "all surfaces printing
  these tags"; the PR landed two. Add to the PR body the sweep sites CHECKED and the ones
  RULED OUT (skill IDs already humanized via `humanizeSkillId`; everything else on
  `primary_domain`/`qualification_level` was writes/reads, not display) so coverage is explicit.
- **#755** `eli/reveal-pop` (`6013bdf`) - 3c: "We read your CV" reveal - staggered per-bullet
  reveal + warm `--rd-golden-tint` radial glow + check zoom-in (count-up already existed,
  reduced-motion-safe). All `motion-safe:`, tokens-only. **Needs from Eli:** eyeball the motion
  feel. **Fresh-lane TODO on this PR** (Eli's ruling): the `SuccessReveal` is NOT in the
  `/_preview/onboarding` harness (renders only in the live flow post-extraction) so it cannot
  be judged from a diff - ADD a `/_preview/onboarding` success-reveal state so Eli can review it.

### Task 3 - reset-www proof: BLOCKED on SMTP quota, NOT closed

Root cause + apex/localhost were resolved earlier; Eli added `www.getajob.careers/reset-password`
to the Supabase Auth redirect allowlist. To CLOSE (flip the audit doc's reset finding
HELD -> FIXED-config), we still need the verbatim `redirect_to` from a real production reset
email. RETRY STEPS: from `www.getajob.careers/login?mode=forgot`, prefill `+v2test` via the
native setter, submit ONCE (Turnstile auto-passes as a managed challenge; 60s rate limit).
Then read the email (Gmail MCP, `from:noreply@getajob.careers`) - the Gmail token-corruption
bug hits the `token=` byte, not the later `redirect_to=` param, so `redirect_to` is readable.
Expect `redirect_to=https://www.getajob.careers/reset-password`; confirm the form renders.
LAST ATTEMPT (07-26) returned a 200 "sent" but NO email arrived - `resetPasswordForEmail`
returns 200 even when rate-limited/nonexistent (anti-enumeration), and there was SMTP
hourly-quota contention from a concurrent `+walkthrough` signup. Retry when the quota resets,
or verify the allowlist directly in the Supabase dashboard. `/reset-password` already RENDERS
on www and resolves to the honest-error state (PR #748 live).

### Queue remaining (in order)

1. **Task 4 - onboarding steps 3-4 depth.** Steps 3 + 4 UI/console/states; forced error state
   (invalid file type on the dropzone - activating it opens a BLOCKING OS file dialog, drive
   via synthetic drop / `file_upload`, never a real click); CV-extraction loading state;
   forward-nav; dropzone keyboard activation; mobile breakpoints. Do NOT trigger the
   point-of-no-return (the final action committing `onboarding_complete=true`) on a fresh
   account. See "How to resume the onboarding audit" below.
2. **3d - situation MULTI-SELECT.** RULED yes (multi-select, min 1). INVESTIGATE FIRST, then
   build only if shallow: (1) report the situation field's storage + EVERY single-value
   consumer with file:line (scoring, copy, digest eligibility, anything). (2) shallow -> convert
   picker to multi-select, store as array, map existing single values forward, adapt consumers
   with a stated primary-situation rule (first selection = primary). (3) deep -> STOP and report
   the map. Copy stays plain and warm. **Corroborated lead:** `employment_status` is ALREADY an
   array on main (`Profile.jsx:372,:401,:460`; `StepResumeUpload.jsx:185-200` does array
   add/remove; written via `SITUATION_TO_EMPLOYMENT`, `OnboardingV2.jsx:181`). Storage may
   already be multi; the stop-condition still stands - map every single-value CONSUMER first.
3. **CV-page "Generate CV" progress theater.** The per-job "Generate CV" button on the CV page
   is NOT wired to the progress system: backend writes honest progress (7/7, source
   `generate-tailored-cv`, hub-verified) but the UI shows only a small spinner coupled to the
   button's HOVER state, so moving the mouse off makes it vanish mid-generation (10-16s of
   perceived nothing). Two-part fix: (1) wire this path into the full `CvGenerationProgress`
   ring per the #747 pattern ((user_id, source='generate-tailored-cv'), terminal-stage stop),
   same as the wired surfaces. (2) Kill the hover-coupled spinner: in-progress state persists
   independent of hover, button disabled while running. WHILE THERE: inventory EVERY CV-gen
   entry point (job cards, CV page, onboarding, Coach, Studio); list which show the ring vs
   have this gap; fix small stragglers in the same PR, report if not.
4. **Task 3 retry** (when SMTP quota allows - see above).
5. **Interaction-depth pass** on authenticated surfaces (buttons/dead-clicks, forced
   empty/loading/error, mobile breakpoints, keyboard/focus, both flag states).

Each queue item = its own scoped PR, HELD for Eli, off a fresh branch from `origin/main`.

## Autonomy contract (in force, Eli)

Full autonomy within the approved queue; decide, log here, keep moving; NO pickers unless a
genuine auth-boundary/irreversible call. HELD FOR ELI only for reserved categories: schema,
edge-fn outside plan, anything irreversible, anything sending to real users, **the reveal
flag**, and **auth-config / auth-internals** (Eli's ruling on the reset flow). A reveal-token
touch (e.g. adding `--rd-logo-hi` to the OFF block) is reveal-adjacent - flag it, do not do it
unilaterally. `settings.local.json` has Bash/Edit/Write/WebFetch allow (unstaged, never commit).

## How to resume the onboarding audit (test account)

- Account: **elienglard34+v2test@gmail.com / V2audit-2026!** (internal '+' account,
  auto-scrubbed; live DB row confirmed `onboarding_complete=false`, `onboarding_step=0`,
  created 2026-07-24). Eli's `+walkthrough` account also exists (fresh, un-onboarded).
- **Session:** I cannot type passwords. Working pattern: open a visible tab on the target
  origin's `/login` (dev `localhost:5173` serves the current branch with HMR; or a branch
  preview `get-a-job-git-<branch>-getajob-team.vercel.app`), prefill the email via the native
  setter, ask Eli to type the password + Sign in. Supabase persists the session to that
  origin's localStorage, shared across tabs of the same origin - so I can drive from my MCP
  tab after Eli authenticates in his.
- **Flag-on cold-load test:** navigate `/Home?next=1` (sets + persists `localStorage.nextDesign=1`);
  authed un-onboarded should bounce to `/Onboarding` (the #752 fix).
- **Recovery-link mint is ABANDONED** - the Gmail API corrupts one byte of the Supabase
  `/verify?token=` URL, so reconstructed tokens read `otp_expired`. Use tab sign-in instead.
- **Dropzone (step 1) opens a BLOCKING OS file dialog on click** - never real-click; drive via
  `file_upload` / synthetic drop.

## Standing facts / techniques

- **Per-surface console sweep:** install a `window.__audit` interceptor (`console.error`/`warn`
  - window error/rejection listeners, counting `Maximum update depth` + `validateDOMNesting`
    separately) on a settled page, then client-nav via
    `history.pushState(url); dispatchEvent(new PopStateEvent('popstate'))` so it SURVIVES the
    route change and counts only FRESH warnings. Reset counters before each step.
- **Read a React controlled input reliably:** set via the native setter
  (`Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,v)`) then
  dispatch `new Event('input',{bubbles:true})`. Plain `.value=` / computer-type is flaky.
- **Don't trust a synchronous read right after `.click()`** - React hasn't re-rendered.
- **Formatter (PostToolUse) reflows whole non-prettier-clean files** (Login.jsx, index.css,
  the big pages). For a SURGICAL diff: `git checkout origin/main -- <file>` then re-apply via a
  `python3` heredoc `str.replace` (bypasses the Edit formatter hook). Verify `git diff --stat`.
  Also: the formatter STRIPS a just-added import whose usage does not exist yet - add the usage
  first (or in the same surgical write), then the import.
- **Merge ritual (3 steps):** `gh pr merge <n> --squash`; confirm MERGED
  (`gh pr view --json state,mergeCommit`); delete the branch
  (`gh api -X DELETE repos/getajob-careers/get-a-job/git/refs/heads/<branch>`, run ALONE - the
  `block-main-push` hook trips on any command containing both `push`/`main` tokens). Then
  serving-sha confirm. Deploy ~30-60s.
- **No em dashes** in additions: `git diff --cached | grep '^+' | grep -P '[the em/en dash chars]'`.
  Scope to YOUR files (handoff/lessons M files carry dashes).
- **ci.yml BLOCKING** = mirror-staleness + lint + check:ground + test:run + build. Typecheck
  continue-on-error; baseline ~519-522, measure NET DELTA. Gate via the `gatekeeper` subagent.
- **Flag param is `next`:** `?next=1` flag-on (persists to localStorage), `?next=0` flag-off.
  Dev `:5173` serves the CURRENT branch (HMR). Prod default flag-OFF.

## Eli's gate (unchanged)

Item #723 gates Eli's REVEAL CERT (live thin-header CV validation on the flag-on reveal). Do
NOT touch the reveal flag; reveal cert + Flip 2 stay Eli's.
