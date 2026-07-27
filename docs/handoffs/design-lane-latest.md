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

## >>> CURRENT (2026-07-27, pass2h) <<<

### Serving truth (verify on resume: `git fetch` FIRST, tip moves between sessions)

- **origin/main HEAD at handoff = `ffa8dd4` (#786 merged).** Verify with `git fetch` - tip may have moved (CV-lane batches land in parallel).
- **Item 8 DONE + MERGED: #786** (`eli/coldload-flash-guard`, squash `ffa8dd4`, branch deleted). Cold-load flash fix (neutral loader while profile unresolved) - `Layout.jsx` + `layoutMode.js` + a `check-ground.mjs` gate exemption. Frontend-only, no edge deploy. Live on the next Vercel build of main. Verified LIVE both cases (see technique note below).
- **ONE design PR HELD: #791** `eli/above-ceiling-chip` (`fa58baa`, off `ffa8dd4`). Item 2. Quiet "Above your current level" chip (JobGridCard) + modal note; derives `aboveCeiling` from `signals.seniority_match === "above_ceiling"`. **Clean-block: spec PASS · QA PASS (C1 fixed, C2 open) · flag-scope GATED (flag-off unreachable, both surfaces via `alive=isNextDesign()`) · gate GREEN.** VERIFICATION block on the PR. **Awaits Eli's C2 ruling** (see queue item 2 below), then merge-ready.
- `main` is checked out in a SEPARATE worktree (`/Users/elienglard/getajob-eval`); branch off `origin/main` here, never `git checkout main`. Shared Vite dev on :5173 serves on-disk files.

### SHIPPED THIS SESSION (pass2h)

- **#786 (item 8)** - cold-load flash fix. MERGED `ffa8dd4`. The prior 7+3 PR batches (items 1-7) all merged in pass2g.

### Verification technique that WORKED (record - reuse for any loading/cold-load repro)

DevTools network throttle does NOT reach the MCP-driven tab (it lives in a separate MCP window; the extension's CDP session and DevTools' CDP session don't compose - a timed probe fetch read ~140ms even with a 3000ms-latency profile "on"). **Do not burn time trying to route DevTools throttle to the MCP tab.** Instead, drive the query state directly: reach the TanStack `queryClient` by walking the React fiber from `#root` (`__reactContainer$*` key; find the node whose `memoizedProps.client`/`memoizedState.memoizedState` has `getQueryCache`+`resetQueries`), then hold a query in a deterministic loading state - `q.cancel(); q.fetch = () => new Promise(()=>{}); q.setState({status:'pending',fetchStatus:'fetching',data:undefined,dataUpdatedAt:0,dataUpdateCount:0})`. That put `Layout` into the fix's spinner branch with zero timing luck; a follow-up `setState` to a not-onboarded `data` proved the `/Onboarding` route branch. Restore with `location.reload()` (client-cache only, no DB writes). `resetQueries` alone is too fast + janks the sampler - use the held-fetch override.

### Self-verification pipeline (STANDING, Eli 2026-07-26 - replaces per-PR human review)

Per queue item, after build + COMMIT + PUSH (never spawn verifier agents before pushing - shared-tree race), spawn IN PARALLEL (general-purpose agents, fresh context; verifiers READ via `git diff origin/main...BRANCH` / `git show BRANCH:file`, NEVER checkout/stash):

1. **Spec Verifier** - given ONLY the ruled spec + diff: exactly what was ruled, nothing missing/extra/creep?
2. **QA Breaker** - adversarial vs acceptance criteria + preview (edge inputs, rapid/mid-run nav, refresh, double-fire, mobile, reduced-motion; console clean). Prefer the PUSHED branch / its Vercel preview when it needs a live app.
3. **Flag-Scope Auditor** (when gating claimed) - every changed line unreachable flag-off OR explicitly UNCONDITIONAL-with-reason; render-identity evidence, not assertion.
4. **Gatekeeper** - full CI gate (confirm CI green ON THE PR, not just local). TELL it the typecheck baseline (~519) rather than have it measure via checkout.
   DISAGREEMENT RULE: any verifier failure/doubt = fix or drop + log; never argue a finding down. PR gains a VERIFICATION block. Clean-block PRs merge at batch time on hub verification alone. Still ELI-ONLY: reserved categories (real users, emails, auth-config, reveal flag, schema beyond approved migrations, anything irreversible), taste/IA proposals marked HOLD, final re-audit triage.

### Queue (STANDING ORDER: finish one, proceed IMMEDIATELY to the next; held merges are batch and never block)

1. ~~Verify #786 (item 8)~~ **DONE + MERGED `ffa8dd4`.** Both cases proven live (spinner not chromeless flash; not-onboarded still routes /Onboarding).
2. **Item 2 - above-ceiling chip #791: AWAITS ELI'S C2 RULING, then merge-ready.** Clean-block (spec/QA/flag-scope/gate all green). **C2 (open):** card/modal asymmetry - the card chip shows on any `alive && aboveCeiling`; the modal note additionally needs `d.bandMeta` (unified surfaces only), so on an `alive && !unified` surface the card shows the chip but the opened modal shows nothing. Both honest; low severity. Open Q: does any live surface render `alive && !unified` (e.g. the Search tab)? If yes = acceptable-but-asymmetric (or add the note outside `showBreakdown`); if no = moot. No behavior change made pending the ruling. On ruling: merge via the ritual (no `--delete-branch`; then `gh api DELETE` the ref).
3. **Item 9 - Career convergence: PROPOSAL DELIVERED (below), AWAITS ELI'S RULING. Do NOT build past it.**

   **Facts (investigated pass2h):** Career page "Job search" tab = two columns: `UnifiedJobsFeed singleColumn` (left, `flex-[1.55]`) + a **track-roles panel** (right, `md:flex-1`) showing `career_roles` (role titles, Qualified-now/Path `AxisBar`s, matched+gap skill chips, one "Full role detail -> /Roadmap" link). **That panel is INLINE JSX in `Career.jsx:877-1013` (+ `AxisBar` `:1044`), NOT a component.** ThreeTabHome (flag-ON only, `/Home`) "Browse Jobs" tab = `UnifiedJobsFeed singleColumn` ALONE, no roles panel. The feed is SHARED (same component both surfaces, no drift). `CvMatchedRolesRail` (CV tab) is a mislabeled JOBS rail, not career_roles. **Career is flag-AGNOSTIC** (no `isNextDesign` gate; renders both shells); ThreeTabHome is flag-on only. So a flag-on user reaches both `/Home` (three tabs) and `/Career`, and only Career shows the roles panel.

   **Proposal - options + build size (Eli picks):**
   - **Option A (recommended) - extract + mount.** Pull the inline Career panel into a `MatchedRolesPanel` ({roles, goalName} props), render it in ThreeTabHome Browse Jobs beside the feed (two-column, mirroring Career). Build **M**: extraction is the bulk (mechanical, but MUST keep Career byte-identical incl. flag-off - add a both-flag Career smoke); wiring into ThreeTabHome is **S**.
   - **Option B - don't converge; link.** Roles panel stays Career-only; Browse Jobs links to Career instead of duplicating. Build **S**. One home for roles, no dup, surfaces stay intentionally different.
   - **Option C - full shared sub-view.** Career "Job search" + Browse Jobs both render ONE `<JobSearchView>` (feed + panel) so they can't drift. Build **L** - likely over-scope pre-launch.
   - **"Cramped buttons" needs Eli disambiguation (changes scope):** (i) the **roles-panel rows** are actually minimal (a toggle + one link) but sit in a narrow ~39% column at `text-[12.5px]`/`[10px]` - "cramped" = spatial/type, fix folds into Option A's re-layout (**S**); OR (ii) the **`JobGridCard` action cluster** (Generate CV / Apply / "+" crammed at `text-[11px]`, `JobGridCard.jsx:452-504`) - the SHARED card in the narrow single-column feed - fix = re-flow the 3-button row (**S-M**, shared card -> flag-scope + both-surface check).
   - Recommend: **Option A + confirm which "cramped."** HOLD - no build before the ruling.

4. **Item 10 - standing tail:** **back-nav** (RULED yes: Back restores prior screen with saved values; screens 2-3 clear; screen-1 back-to-upload awkward - PROPOSE its handling, do not build blind) -> **3d situation MULTI-SELECT** (RULED yes, min 1; INVESTIGATE FIRST - report every single-value CONSUMER with file:line; shallow -> array+map forward + first=primary; deep -> STOP. Lead: `employment_status` already an array on main) -> **Task 3 reset PRODUCTION proof (see status below).**
   - **Task 3 status (pass2h): STILL PENDING - 2 draws sent (`www.getajob.careers/login?mode=forgot`, `+v2test`, Turnstile auto-verifies, "Password reset email sent" both times), 0 delivered to Gmail after ~25 min. SMTP quota is not delivering this window.** Standing order = attempt at session start + once before handoff (more draws, earlier), independent of queue position. Re-poll Gmail `from:getajob.careers newer_than:2h` on resume (the pass2h emails may yet trickle in); if delivered, open the reset link's `redirect_to`, expect `https://www.getajob.careers/reset-password`. AUTH-CONFIG = reserved, report-only. NOTE: forgot-page submit button settles at ~(738,704); a `getBoundingClientRect` read BEFORE Turnstile renders gives a stale (535,510) that misses - screenshot to confirm position before clicking.
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
