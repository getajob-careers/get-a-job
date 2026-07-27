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

## >>> CURRENT (2026-07-27, pass3) <<<

### Serving truth (verify on resume: `git fetch` FIRST, tip moves between sessions)

- **origin/main HEAD at handoff = `ffa8dd4` (#786 merged).** Verify with `git fetch` - tip may have moved (CV-lane batches land in parallel).
- **origin/main HEAD (pass3 start) = `c5397c0` (#791 merged this session).** Verify with `git fetch` - CV-lane batches (#790/#792/#794) landed in parallel this window.
- **Item 2 DONE + MERGED: #791** (`eli/above-ceiling-chip`, squash `c5397c0`, branch deleted). Above-ceiling chip + modal note. C2 RESOLVED per Eli's ruling: moved the modal note OUT of `showBreakdown` so it renders on the same gate as the card chip (`alive && aboveCeiling`), independent of `bandMeta` - card + modal can't diverge on any surface. All 3 surfaces (feed/Search/CV-rail) pass `unified` + scoreResult; proof was code-identity (couldn't stage a live above_ceiling match). Frontend-only.
- **Item 9 DONE + MERGED: #795** (`eli/matched-roles-panel`, squash `356bcaf`, branch deleted). Extracted Career's inline roles panel -> `src/components/career/MatchedRolesPanel.jsx` (controlled; shared `sortMatchedRoles`/`resolveActiveRoleId` helpers); mounted `size="comfortable"` beside the Browse Jobs feed in ThreeTabHome (two-column); re-flowed the flag-on JobGridCard action cluster out of `text-[11px]` cramping (both idle + CV-ready, whitespace-nowrap CTAs). Career byte-identical (test `src/test/matchedRolesPanel.test.jsx` 13/13). All 4 verifiers clean-block; hub merged on verification (Eli's visual check happens on prod flag-on; item-11 re-audit is the formal pass). Frontend-only.
- **ONE design PR HELD: #797** `eli/onboarding-back-nav` (off `356bcaf`). **Item 10 back-nav, RULED Option A.** One shell-level Back on OnboardingV2 for `step >= 2` (direction 2->1, springboard 3->2); removed the screen-1 review->upload back (StepReview back gated on `onBack`, V1 keeps it). **UNCONDITIONAL both flag states.** **All 3 verifiers ran: spec+QA / flag-scope / gatekeeper - 3 RULED items PASS + gate GREEN.** BUT spec+QA surfaced ONE exposed deviation -> **HELD for Eli's ruling (NOT clean-block):** the new back round-trip on the CV-LESS path (springboard->back->direction->back->review->Continue) makes `buildReviewProfilePayload` (`persistOnboardingProfileV2.js:36-38`) stamp `primary_domain_source:'extracted'` on an INFERRED domain that `advanceFromDirection` backfilled into profileData (`OnboardingV2.jsx:261-265`) - flips 'inferred'->'extracted', violating the fn's OWN comment (line 20-22). Low-severity (value stays correct, label-only, CV-less + this round-trip only, no user-visible/functional harm). **It's a CV-LANE persist path - do NOT patch unilaterally.** Eli picks: (a) accept+merge as-is, (b rec) gate the 'extracted' stamp on actual extraction (CV-lane cross-review), (c) design-lane clear-inferred-backfill-on-back workaround. VERIFICATION block + these 3 options on the PR. Live V2 walkthrough folds into item-11 functional QA.
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

1. ~~Item 2 above-ceiling chip #791~~ **DONE + MERGED `c5397c0`** (C2 resolved: note moved out of showBreakdown).
2. ~~Item 9 #795~~ **DONE + MERGED `356bcaf`.** Eli's prod flag-on visual check pending (item-11 is the formal pass).
3. **Item 10 - mostly CLOSED pass3.** Task 3 RESOLVED (SMTP ~20-min lag, redirect_to confirmed; draw order RETIRED). Situation min-1 RULED OPTIONAL (no build). Back-nav RULED Option A -> BUILT in #797, verified (3 ruled items PASS) but **HELD for Eli's ruling on the exposed provenance-stamp deviation** (see PR #797 bullet above: (a) accept / (b) CV-lane persist fix / (c) design-lane workaround). ONLY open item-10 thread = that ruling; on ruling, apply + merge #797 via ritual.

   **Facts (investigated pass2h):** Career page "Job search" tab = two columns: `UnifiedJobsFeed singleColumn` (left, `flex-[1.55]`) + a **track-roles panel** (right, `md:flex-1`) showing `career_roles` (role titles, Qualified-now/Path `AxisBar`s, matched+gap skill chips, one "Full role detail -> /Roadmap" link). **That panel is INLINE JSX in `Career.jsx:877-1013` (+ `AxisBar` `:1044`), NOT a component.** ThreeTabHome (flag-ON only, `/Home`) "Browse Jobs" tab = `UnifiedJobsFeed singleColumn` ALONE, no roles panel. The feed is SHARED (same component both surfaces, no drift). `CvMatchedRolesRail` (CV tab) is a mislabeled JOBS rail, not career_roles. **Career is flag-AGNOSTIC** (no `isNextDesign` gate; renders both shells); ThreeTabHome is flag-on only. So a flag-on user reaches both `/Home` (three tabs) and `/Career`, and only Career shows the roles panel.

   **Proposal - options + build size (Eli picks):**
   - **Option A (recommended) - extract + mount.** Pull the inline Career panel into a `MatchedRolesPanel` ({roles, goalName} props), render it in ThreeTabHome Browse Jobs beside the feed (two-column, mirroring Career). Build **M**: extraction is the bulk (mechanical, but MUST keep Career byte-identical incl. flag-off - add a both-flag Career smoke); wiring into ThreeTabHome is **S**.
   - **Option B - don't converge; link.** Roles panel stays Career-only; Browse Jobs links to Career instead of duplicating. Build **S**. One home for roles, no dup, surfaces stay intentionally different.
   - **Option C - full shared sub-view.** Career "Job search" + Browse Jobs both render ONE `<JobSearchView>` (feed + panel) so they can't drift. Build **L** - likely over-scope pre-launch.
   - **"Cramped buttons" needs Eli disambiguation (changes scope):** (i) the **roles-panel rows** are actually minimal (a toggle + one link) but sit in a narrow ~39% column at `text-[12.5px]`/`[10px]` - "cramped" = spatial/type, fix folds into Option A's re-layout (**S**); OR (ii) the **`JobGridCard` action cluster** (Generate CV / Apply / "+" crammed at `text-[11px]`, `JobGridCard.jsx:452-504`) - the SHARED card in the narrow single-column feed - fix = re-flow the 3-button row (**S-M**, shared card -> flag-scope + both-surface check).
   - Recommend: **Option A + confirm which "cramped."** HOLD - no build before the ruling.

4. **Item 10 - DELIVERED pass3 (investigate/propose, nothing built - awaits rulings):**
   - **Task 3 reset: RESOLVED.** All 3 draws DID deliver (SMTP delivers with a ~20+ min LAG - NOT broken; the session-start `{}` poll was simply before delivery). Draw-3 (10:44:02Z, `elienglard34+v2test`) reset link `redirect_to=https://www.getajob.careers/reset-password` CONFIRMED (read-only, token not consumed). No server-side SMTP investigation needed. Standing draw order can retire.
   - **Situation multi-select: ALREADY BUILT + LIVE (#688 `bb9dc6e`).** `OnboardingV2.jsx` situation row IS multi-select ("pick all that apply", `situations[]` state, XOR conflict rules, SITUATION_PRIORITY -> single `primarySituation` + `employment_status` V1 enum; writes `situation` primary + `situations[]` alongside). Single-value consumers read the back-compat primary -> no breakage. **Only open sub-point: min-1 NOT enforced.** Screen-0 advance (upload/skip) is not gated on situation; enforcing min-1 would gate the PRIMARY CV-upload path on a secondary context field (real-user friction). RECOMMEND leave optional; **Eli to rule** min-1 vs optional.
   - **Back-nav: PROPOSAL (build HELD for Eli's screen-1 ruling).** State model (explorer-mapped): ALL screen DATA is LIFTED into OnboardingV2 (profileData, educations, experiences, projects, certifications, situations) - so naive back-nav ALREADY preserves saved values; only TRANSIENT UI resets (DirectionScreenV2 local: `query`/`debouncedQuery`/`showSuggestions`/`highlightedIndex`/`practicumYes`; StepResumeUpload local: `fileName`/`done`/`extracting` etc). Current back wiring: only screen1(review)->0(upload) via `onBack={()=>setStep(0)}` (OnboardingV2.jsx:618); screens 2(direction) + 3(springboard) have NO back. Persist-on-advance (re-advance idempotence): review->profiles UPDATE (scalars + skills_canonical + `primary_domain_source='extracted'`); direction->`primary_domain` inferred UPDATE WITH SERVER GUARD (only writes if null/already-inferred, so extraction values block re-clobber); springboard launch = POINT OF NO RETURN (`onboarding_complete=true`). **Proposal:** add Back on screen 2->1 and 3->2 (safe: lifted data + idempotent/guarded re-advance). **Screen-1 back-to-upload (the "awkward" one) - Eli picks:** (A rec) DROP the screen-1 back entirely (upload isn't a meaningful return target once extraction ran; review already lets you edit everything) - minimal, no half-reset; OR (B) LIFT StepResumeUpload's `fileName`/`done` into shell so returning shows "CV: file.pdf ✓ [replace]" instead of a blank dropzone (richer "change my CV" path, more build). Do NOT build until Eli rules A vs B.
   - **Task 3 status (pass2h): STILL PENDING - 2 draws sent (`www.getajob.careers/login?mode=forgot`, `+v2test`, Turnstile auto-verifies, "Password reset email sent" both times), 0 delivered to Gmail after ~25 min. SMTP quota is not delivering this window.** Standing order = attempt at session start + once before handoff (more draws, earlier), independent of queue position. Re-poll Gmail `from:getajob.careers newer_than:2h` on resume (the pass2h emails may yet trickle in); if delivered, open the reset link's `redirect_to`, expect `https://www.getajob.careers/reset-password`. AUTH-CONFIG = reserved, report-only. NOTE: forgot-page submit button settles at ~(738,704); a `getBoundingClientRect` read BEFORE Turnstile renders gives a stale (535,510) that misses - screenshot to confirm position before clicking.
5. **>>> ACTIVE NEXT: Item 11 - FINAL PRE-CERT RE-AUDIT (Eli ruled: run it AFTER back-nav).** Full-platform, both flag states, **flag-on priority** (reveal cohort), every registered page, both shells, public landing, mobile. PARALLEL specialist tracks via **general-purpose** agent fan-out (judgment; haiku for searches/counts ONLY): (1) design-craft 9-rule bar per-surface, (2) FUNCTIONAL QA - every button does what it CLAIMS, every flow COMPLETES, honest states, console sweep (`window.__audit`), (3) mobile, (4) copy-honesty (no dishonest counts, leaked tags, false claims). Include the #797 V2 back-nav walkthrough in track 2. Output = **ONE severity-ranked findings doc**, blockers top, as the input to Eli's cert triage. **Eli's standing instruction: if context runs short, HAND OFF BEFORE STARTING the audit - do NOT split it across sessions.** Needs an authed demo session for the functional/mobile live tracks (pasted session; Turnstile).

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
