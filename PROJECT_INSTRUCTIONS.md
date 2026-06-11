# PROJECT_INSTRUCTIONS — Get A Job

**Last updated: 2026-06-11 (Coach docked in sidebar + mobile header trigger — REWORK of the agent-entry-sidebar PR after a founder design revision. The coach is no longer a nav-item launcher but a **persistent docked live chat** in the sidebar's dead space below the nav items (desktop) plus a **persistent header trigger chip** beside the hamburger (mobile). New `CoachConversationContext` lifts conversation state (messages / input / sending / conversation_id / sendMessage) out of `ChatInterface` for the drawer surface so dock + panel are one conversation, two views — anything sent in either appears instantly in the other via the shared provider. New `CoachDock` between nav and `SidebarFooter` (flex-1 min-h-0): slim header, compact `CoachThread`, persistent `CoachInput` ("Ask about this page…"). Short-viewport collapse via `ResizeObserver` below ~220px. Scroll contract: thread is its own container with `overscroll-behavior: contain`; sidebar already `fixed lg:static`. `MessageBubble` gains a `variant` prop (no fork) — dock variant tightens density. Suggested-action cards render condensed in the dock + panel with an "Open in panel" expand path; rich-card Apply handlers deferred to a Phase-B card-extraction PR. `AgentDrawer` panel replaces `ChatInterface variant="drawer"` with the same shared `CoachThread variant="panel"` + `CoachInput`. Panel mechanics (z-order, 520px desktop, 85vh mobile, seed pre-populates shared input) unchanged. New `MobileCoachTrigger` coral chip in the mobile top header beside hamburger = PRIMARY mobile entry. Dock also renders inside the opened mobile sidebar = SECONDARY path; sending/expanding from there opens the bottom sheet. Right edge stays clear. The previous nav-item Coach attempt is reverted. `ai-chat` + all server prompts UNTOUCHED (bake-off asserting byte-equality against production in parallel). Preview: `docs/design/redesign/previews/agent-entry-sidebar.pdf` (8 captures including the independent-scroll proof + short-viewport collapse + both mobile paths). Typecheck: 404 (0 delta). Previously: PR-B2 page-context.).** ----- **Earlier (2026-06-11, agent-entry-sidebar attempt 1):** Coach as a sidebar nav item.\n\n_Original attempt-1 note:_ **Last updated: 2026-06-11 (Agent entry → sidebar Coach item. Founder decision after production use of PR-A3: the right-edge floating "Ask your agent" tab was too invisible, so the agent entry moves into the left sidebar as a first-class top-level "Coach" nav item (Sparkles icon for surface continuity with Home's coach band) directly under Today + above Career. Coach is NOT a route — `onClick` calls `useAgentDrawer().open()`; active-state styling applies while the panel is open. `SidebarSection` gains a third render branch (`action: "open-agent-drawer"`) parallel to `section.page` and `section.items`. `Layout` split into outer wrapper (provider) + inner `LayoutBody` that consumes `useAgentDrawer` for the active-state read. Mobile: Coach reachable via hamburger → sidebar tap-through; Coach click closes the mobile sidebar before opening the drawer. Mobile lean documented in PR body (separate mobile trigger is a follow-up if pilot data shows friction). `AgentDrawer.jsx`: right-edge tab JSX deleted, MessageCircle import dropped. Panel mechanics (desktop 520px right panel + mobile 85vh bottom sheet, z-[58]/[60] over ApplicationDetailDrawer's z-50 Sheet, ChatInterface drawer variant, seed mechanics, rolling-conversation mount) UNCHANGED. ai-chat edge function NOT touched (a prompt bake-off is asserting byte-equality against production in parallel). Chat nav group untouched. Preview: `docs/design/redesign/previews/agent-entry-sidebar.pdf` (9 captures including the mobile sidebar reachability proof). Typecheck: 404 (0 delta). Previously: PR-B2 page-context injection.).** ----- **Earlier (2026-06-11, PR-B2):** Agent page-context injection.\n\n_Original PR-B2 note:_ **Last updated: 2026-06-11 (Agent page-context injection Phase B2 — PR-B2. Drawer now forwards `page_context: {page, application_id?, job_id?, role_id?, track?, company_target_id?}` on every turn. Contract is LOCKED + server-authoritative: client sends route + UUIDs only, server fetches each entity under `auth.uid()`, LLM never receives client-authored content. New `supabase/functions/ai-chat/page-context.ts` with `sanitizePageContext` (whitelist enum + UUID format), `fetchPageContextEntities` (scoped fetch per ID; unknown/foreign IDs silently drop), and `renderPageContextBlocks` (pure; empty input → "" preserves the byte-identical-legacy contract). Server injects `CURRENT PAGE` / `CURRENT TRACK` / `TARGET ROLE` / `TARGET JOB` / `TARGET COMPANY` blocks parallel to the existing TARGET APPLICATION pattern. `application_id` precedence: explicit top-level body field beats `page_context.application_id` (legacy CVAgent/InterviewCoach callers untouched). RATE_LIMIT_CALLS bumped 30 → 50, same 1-hour window — drawer-volume allowance. New `useAgentDrawer().setPageContext(ctx)` slot with shallow-equal guard. ChatInterface threads `pageContext` into both invoke sites. Per-page wiring: Career (track + role_id + application_id), Internship (company_target_id), Today/Profile/Calendar (page only). Telemetry: `page_context_keys` added to function_metrics. No schema migration. 22 server tests + 7 frontend tests. Typecheck: 404 (0 delta). Deno: 4 errors (0 delta vs main baseline). After Eli approves merge → squash + Vercel + `supabase functions deploy ai-chat` + smoke test from Career drawer. Previously: PR-A3 drawer shell.).** ----- **Earlier (2026-06-11, PR-A3):** Agent drawer shell Phase A.\n\n_Original PR-A3 note:_ **Last updated: 2026-06-11 (Agent drawer shell Phase A — PR-A3. Persistent right-edge "Ask your agent" tab + panel/sheet now mounts in `Layout.jsx` inside the authenticated chrome (gated on `user && onboardingComplete`, never on Login/Onboarding/public). `src/lib/AgentDrawerContext.jsx` exposes `open({seed, applicationId})` / `close` / state. Desktop ≥ 768px = right-side 520px panel, mobile < 768px = bottom sheet at 85vh — tab stays right-edge on both. Z-order: tab z-[55], overlay z-[58], panel z-[60] so the agent always wins the foreground (ApplicationDetailDrawer's Sheet sits at z-50 underneath; capture in the preview proves the overlap). Panel stays mounted once first opened so the rolling conversation persists across close/reopen cycles. `ChatInterface` gains `variant="drawer"` + `initialInput` props — no fork of internal logic (same 20-turn slice, 401-refresh-retry, conversation persistence, every `SUGGESTED_*_JSON` card renderer). Drawer variant trims padding `px-6 → px-4`, hides the description + conversation-switcher (one rolling conversation per user in the drawer), and lets the panel own the chrome. Coach-band rewire: Home's coach CTA changes from `<Link to={chatUrl(...)}>` to `<button onClick={agentDrawer.open(...)}>`; `chatUrl` helper stays in-file as a rollback path. `/CareerAgent` page + Chat nav group untouched (full-screen entry preserved). `ai-chat` edge function contract unchanged — no `page_context` injection, no agent merge, no model changes, no proactive triggers (all out of scope for Phase A). DEV preview harness: `/_preview/drawer/:state` × 5 states. Preview: `docs/design/redesign/previews/agent-drawer.pdf` (10 captures). Typecheck: 404 (0 delta). Previously: Career inline pipeline board.).** ----- **Earlier (2026-06-11, PR-A2):** Career inline pipeline board — final Tracker-absorption PR.\n\n_Original PR-A2 note:_ **Last updated: 2026-06-11 (Career inline pipeline board — PR-A2, final Tracker-absorption roll. Career.jsx's pipeline strip now toggles an inline expandable section that mounts `<ApplicationsKanban>` + `<ApplicationDetailDrawer>` exactly as `Tracker.jsx` does. URL contract: `?pipeline=open` renders expanded + scrolls into view; `&app=<id>` opens the detail drawer. Param mutations use `setSearchParams(..., { replace: true })` — no nav, no history pollution. The live `/Tracker` route becomes `<Navigate to="/Career?pipeline=open" replace>` via a small eager `src/pages/TrackerRedirect.jsx` swapped into `pages.lazy.js`'s `LAZY_PAGES.Tracker`; `?app=<id>` passthrough preserved. `Tracker.jsx` + `TrackerPreview` stay in the repo untouched — kanban regression checks still mount the real Tracker via `/_preview/tracker/:state`. First-time guide: the 4-tile 7-step framing card moves into the expanded board as a dismissible card; dismissal persists in localStorage. Cleanup rider: `funnelBuckets.js` comment fixed (`rejected` is the sole exclusion). Manual-add path: extracted `AddApplicationDialog` to `src/components/tracker/AddApplicationDialog.jsx` (Path 1 — zero TS delta because the Dialog forwardRef-in-JSX errors move with the JSX), mounted from both `Tracker.jsx` (preserved behavior) and `Career.jsx`'s expanded board (Add-manually button beside the Pipeline board heading). Pilot students keep the manual-tracking path after the absorption. Preview: `docs/design/redesign/previews/career-board.pdf` (12 captures including add-dialog-open). Typecheck: 404 (0 delta). Previously: PR-A1 pipeline strip + funnel-bucket extraction + optimistic apply loop.).** ----- **Earlier (2026-06-11, PR-A1):** Career pipeline strip — first of the Tracker-absorption rolls. Career.jsx gains a 4-tile `RdFunnelTile` strip below the track band (saved / applied / interview / offer) reading off the canonical `["applications", uid]` cache. `FUNNEL_BUCKETS` extracted from Home.jsx → `src/lib/funnelBuckets.js`; `FunnelTile` extracted Home.jsx → `src/components/redesign/RdFunnelTile.jsx` so both surfaces share one source of truth. JobCard's Apply path is now optimistic: cache prepend + Tracked-button toggle in the same frame, rollback + `toast.error` on insert failure (cache-key + JSDoc-cast discipline from b1ee594). Entry points anchored to the pipeline retarget to `/Career?pipeline=open` (no-op until PR-A2): Home daily action / "In pipeline" StatBlock / Pipeline attention rows / footer "Open pipeline"; Calendar's two `/Tracker` targets; OutreachComposer comment. `/Tracker` route itself stays — PR-A2's job. Rider: `This track` / `All jobs` scope toggle is always visible whenever the search input renders, default `This track` — discoverability fix for the hidden-until-typing gate. Preview: `docs/design/redesign/previews/career-strip.pdf`. Typecheck count: 404 (0 delta). Previously: seamless-IA Home rebuild + Career condensed page. Design rulings live in `docs/design/redesign/isaac/RULINGS.md` and are part of the spec: (a) one SCORE per card maximum; counts and fractions are exempt — the funnel strip is counts; (b) explanatory axes render as bars with NO numerals; (c) no UI string asserts anything without a grounding data source; (d) low-fit provenance reads "shown for completeness, not recommended" (trigger-honest); (e) null score columns never render as 0% — omit. The PNG mockups in that directory are visual direction only; conflicts with RULINGS.md resolve to the ruling.).**

## Visual redesign in flight

Rolling page by page in funnel order. Foundation tokens + Rokkitt + the
first two primitives (RdButton, RdCard) land additively — nothing reads
`--rd-*` until a page opts in. Login is the first restyled page.
Standing rules + token reference + typecheck baseline live in
`tasks/redesign.md`. Preview pipeline for public routes:
`scripts/preview-login.mjs` (Playwright + pdf-lib) →
`docs/design/redesign/previews/<page>.pdf`. Auth-gated pages will
choose between test-session and component-harness preview strategies
per-PR before building.

---

This file is the **living source of truth** for the project. Read this first, then follow cross-references for depth.

**Every PR must update this file.** When the change is non-trivial — new feature, new edge function, new schema, sprint progress — append/edit the relevant section. The CLAUDE.md / ROADMAP.md / lessons.md files have one job each; this file is the index that ties them together. If you read this and something feels stale, fix it.

Cross-references:
- `DOCUMENTATION.md` — map of every doc in the repo (start here if you don't know where to look)
- `CLAUDE.md` — coding conventions, branch + PR rules, commit format, lessons doctrine
- `ROADMAP.md` — week-by-week sprint plan with the v1/v2 cut table
- `tasks/lessons.md` — append-only log of "took multiple attempts" gotchas; read before non-trivial work in track scoring, LLM prompts, edge-function deploys, role/skill libraries, onboarding
- `README.md` — local setup + env vars
- `docs/research/linkedin-post-performance.md` — research findings that ground every LinkedIn-related prompt
- `docs/strategy/installation-checklist.md` + `docs/strategy/design-strategy.md` — installation roadmap + UX reference

---

## What this app is

Get A Job is an AI-powered career operating system. The first pilot cohort is **business students at Reichman University entering the Israeli tech market**, but the platform is designed for any job seeker at any stage.

**Two pilots, in this order:**

1. **WhatsApp pilot — imminent.** 100 users (hard cap, enforced by the invite code), launching in the next few days via WhatsApp groups. Overflow goes to a waitlist email capture. Purpose: get real signup → onboarding → first-week-use data ahead of the academic cohort.
2. **Reichman practicum — Aug–Nov 2026, CONFIRMED.** Separate cohort. Professor + Dr. Miller personally vouching. **Exact student count TBD** — could be 10, could be 100, depends on practicum enrollment which we don't control. The cohort will get its own invite code or an extended cap on the existing one (TBD when the window opens). The Internship Company Picker is a P0 requirement specific to this cohort.

The two pilots don't sum to a single planned total. WhatsApp = 100 hard. Reichman = whatever enrolls.

Target users for the pilot are not generic job seekers — they are early-career business students aiming at CS, Marketing, BD, RevOps, PM, CSM, Solutions, GTM-style roles (not engineering). All pilot-phase product decisions are anchored to that audience: reply rates, tone, role library, voice rules, framework defaults.

**These are the pilot users.** The platform architecture is not hard-coded to this audience — role libraries, skill libraries, and voice rules are extensible to other markets and career stages. Today's defaults reflect today's cohort; the structure supports adding new role/skill packs and voice variants without architectural changes.

---

## Where we are right now (2026-05-19)

**Live at `getajob.careers`** since 2026-05-12. Production stack:
- Vercel (frontend, auto-deploy from `main`)
- Supabase (`ilmqmodklutztuybsvwd`) for DB + Auth + Edge Functions + Storage
- Langfuse Cloud for LLM tracing
- PostHog Cloud (EU) for product analytics

**Most recent merged work (PR #59 onward — Isaac's 6 live-test bugs + supporting PRs):**

| # | Date | What |
|---|---|---|
| #59 | May 19 | fix(layout) — sidebar shows CV-extracted full_name from profiles, not `Test Agent` auth metadata |
| #60 | May 19 | fix(career-analysis) — `inferQualificationLevel` excludes internships; no-roles empty-state branches copy by qualification |
| #61 | May 19 | fix(career-analysis) — D3 skill-propagation: 170-entry alias map (`_shared/skill-aliases.ts`) + LLM semantic-credit pass. Match rate 19% → 77% (live dry-run against 10 users) |
| #62 | May 19 | fix(profile) — `HONORS_SUGGESTIONS` autocomplete + `suggestionType="none"` for coursework/projects |
| #63 | May 19 | fix(onboarding) — drop tutorial's FinalisingPanel; header progress + button state already convey status |
| #64 | May 19 | fix(onboarding) — employment_status XOR (looking_for_job / employed / unemployed mutually exclusive; student + freelance stack) |
| #65 | May 19 | fix(onboarding) — replace tutorial slide-1 quadrant grid with text bullets (Career Roadmap WhyTab keeps the grid pending design pass) |
| #66 | May 19 | feat(settings) — `/Settings` page (Account / Onboarding / Danger zone), `delete-account` edge function, `account_deletions` audit table, `?deleted=1` toast on Login |
| #67 | May 19 | fix(settings) — register Settings in `pages.config.js`, move access to sidebar avatar (no longer a nav item) |
| #68 | May 19 | fix(settings) — case-insensitive delete-confirmation phrase |
| #69 | May 19 | feat(practicum) — unified faculty + self-sourced pipeline, drag-drop kanban (`@hello-pangea/dnd`), Add-my-own-company modal, Outreach Coach prefill via `?prefillCompany=&prefillRole=` |
| #70 | May 19 | docs — refresh stale counts in CLAUDE.md + refresh-jobs.yml header (183 roles, 387 skills, 16 .ts files, 831/~440 ATS companies) |

**Currently in flight:** Bug #6 from Isaac's live-test list (Tracker layout) is the only deferred item — pending Isaac's screenshot. Pre-existing Tracker.jsx typecheck errors that surfaced during PR #60 may be the same root cause.

---

## Architecture at a glance

**Frontend:** React 18 + Vite + Tailwind + shadcn/ui + TanStack Query + sonner (toasts) + `@hello-pangea/dnd` (drag-and-drop). Pages in `src/pages/` register via `src/pages.config.js` — **the file is hand-maintained** despite its "auto-generated" docstring (PR #67 had to add `Settings` manually). Routing: BrowserRouter; `createPageUrl(pageName)` from `@/utils` builds page paths.

**Backend:** Supabase. Project ref `ilmqmodklutztuybsvwd`.
- Postgres + RLS — **36 tables, all RLS-enabled.** 4-policy own-row pattern: SELECT / INSERT / UPDATE / DELETE all gate on `auth.uid() = user_id`.
- Auth (email + password). Password change is two-step (compose → email-nonce verify) via `auth.reauthenticate()` + `updateUser({password, nonce})`.
- Account deletion via the `delete-account` edge function: validates JWT (self-only), wipes `resumes/{user.id}/` storage folder, tombstones into `account_deletions`, then calls `auth.admin.deleteUser` (triggers 20 CASCADE FKs + 2 SET NULL on `companies.created_by` / `error_logs.user_id`).
- Edge Functions in Deno (`supabase/functions/<slug>/index.ts`) — 18 of them.
- Storage: `resumes` bucket (private, signed URLs).
- Migrations in `supabase/migrations/<YYYYMMDD>_<slug>.sql`.

**LLM provider:** OpenAI.
- `gpt-4o-mini` for cheap classification / extraction
- `gpt-4o` for generation surfaces (CV, posts, comments, outreach, career analysis, daily action framing)
- `response_format: json_object` for any structured output
- All 13 OpenAI-calling functions traced via Langfuse (PR #41–#44)

**Job source (rebuilt PR #56-ish):** Direct ATS fetching. **No more JSearch / RapidAPI / Active Jobs DB.** `scripts/refresh-jobs.ts` iterates the 831-company registry in `_shared/libraries/companies_il.json`, filters to ~440 entries with a supported ATS (Greenhouse / Lever / Ashby / Workday / SmartRecruiters / Comeet / SuccessFactors), fetches public listings, UPSERTs into `public.jobs` (currently ~3k rows). Runs nightly via GHA `refresh-jobs.yml` at 01:00 UTC. Failure threshold: GHA run fails if >20% of companies error.

**Domain libraries** (currently curated for the Israeli tech market — the pilot audience; designed to be extensible to other markets, **183 roles + 387 unique skill IDs**): consolidated under `supabase/functions/_shared/libraries/`. 16 `.ts` files + `companies_il.json`. Two skills curate this material: `.claude/skills/schema-validator/` (read-only structural checker) and `.claude/skills/role-research/` (research-grade enrichment). Edge functions importing from this single source: `generate-career-analysis`, `generate-tasks`, `extract-proof-signals`, `generate-tailored-cv`, `lookup-role-skills`, `match-internship-companies`, `generate-internship-profile`. **Edits require explicit cross-review by the other dev.**

**Skill propagation** (PR #61): the deterministic scorer used to fail-match ~95% of user-stated skills against library IDs because of strict snake_case normalization. Layer 1 fix is `_shared/skill-aliases.ts` (170 curated entries covering all StepSkills chips + common variants). Layer 2 fix is an LLM semantic-credit pass — `generate-career-analysis` includes a CANDIDATE_SKILLS list in its prompt; the LLM returns `additional_credited_skill_ids` (validated against the offered set), and the server re-scores the selected roles with augmented skills. Match rate jumped from 19% → 77% in a dry-run against the 10 live users.

**Track scoring:** `src/lib/scoreApplication.js` (`trackFromScores`) mirrors `assignTrackWithGoal` in `generate-career-analysis`. LLM-derived alignment uses tighter thresholds than the deterministic path. Qualification level (Junior / Mid-Level / Senior) is inferred from full_time + freelance experience count only — internships, military, volunteer, leadership don't count (PR #60).

**Onboarding flow (10 steps — 9 data-capture + 1 post-flow tutorial):**

`OnboardingShell` wraps steps 0–8 (data capture); step 9 (tutorial) renders
full-screen outside the shell. The header counter reads "Step X of 9" —
the tutorial is intentionally NOT counted (it's post-flow orientation,
not data capture). `STEP_NAMES` in `Onboarding.jsx` mirrors this table;
when adding/moving a step, grep the regex `(setStep|step === |step !== |STEP_NAMES\[|step_index:|onboarding_step:)` or you'll silently break a
forward-only branch (lesson 2026-05-25).

| Idx | Component | Notes |
|---|---|---|
| 0 | StepResumeUpload | Employment status XOR (PR #64) — `looking_for_job` / `employed` / `unemployed` mutex; `student` + `freelance` stack. Fires `ai-chat` resume-extractor + parallel `extract-proof-signals` |
| 1 | StepEducation | Primary degree row (`educations[0]`, `display_order=0`); secondary education silently mirrored from CV |
| 2 | StepInternship | `practicum_path` (faculty / self_sourced / none). Renamed from StepPracticum |
| 3 | StepExperience | Multi-entry experiences; commitment + founder type from PR #211 |
| 4 | StepRoleSkills | **Inserted PR #136.** Per-entity skill capture across experiences / education / projects (accordion-per-entity) |
| 5 | StepSkills | Catch-all skills (`profiles.skills`); SkillChipBank for category presets |
| 6 | StepCareerDirection | `five_year_role` (role-library autocomplete) + target titles + industries + work environment + 2 booleans |
| 7 | StepConstraints | location + start date + work_type. Triggers `generate-career-analysis` on submit |
| 8 | StepSurvey | 6 self-assessment Qs. Triggers `handleFinalise` (background career-analysis + tasks + role cache) |
| 9 | OnboardingTutorial | 6 slides (Browse Jobs / Tracker / Story Bank / LinkedIn / CV / Chat Agents). Full-screen, no shell. Returning-user gate via `profiles.has_seen_onboarding_tutorial` |

The tutorial **replaced** the original "Your Roles" reveal page — slides 1-6 carry the same orienting work in a paced carousel, and the platform-finalising progress bar lives in the header (not as a competing card; PR #63). Returning users (those with `profiles.has_seen_onboarding_tutorial=true`) see a skip-or-watch gate.

**Sidebar:** `/Settings` is **not** a nav item. Access is via the avatar circle in `SidebarFooter` (PR #67). Logout is a separate icon next to the name+email row.

**Deployment:**
- **Repo:** `getajob-careers/get-a-job` on GitHub
- **Frontend:** Vercel auto-deploys every PR (preview) and `main` (production)
- **Edge functions:** NOT auto-deployed by CI. Manual via `supabase functions deploy <slug> --project-ref ilmqmodklutztuybsvwd`
- **CI:** `.github/workflows/ci.yml` runs lint + typecheck (non-blocking — Tracker.jsx baseline) + tests + build on every PR and push to main
- **Cron:** `.github/workflows/refresh-jobs.yml` at 01:00 UTC daily
- **Observability:** Langfuse Cloud (per-call LLM traces with userId metadata) + Supabase `function_metrics` table (per-call latency/cost/tokens, populated by `_shared/metrics.ts`) + Supabase edge function logs dashboard
- **Analytics:** PostHog (`src/lib/analytics.js`) — **17 events** spanning signup, 4 onboarding events, 4 tutorial events, CV upload, career analysis, job-match check, application tracking, 2 practicum events, chat, 2 subscription events

---

## Business model

**Subscription, no free tier.**

- **7-day free trial** starts on signup. Full feature access during the trial — onboarding, career analysis, CV gen, LinkedIn, practicum, chat agents.
- **$12/month** after the trial ends. Single price point. No discount tiers.
- **No perpetual free plan.** Trial expiry → paywall, not a degraded free experience.

**Pilot access:**

- **Shared invite code** unlocks signup. Single code, gated at sign-up. Hard cap at **100 users** — once the cap is hit, the code stops working and new visitors hit a waitlist screen.
- **Waitlist email capture** for overflow. Captures email + timestamp; we drain it manually after the WhatsApp pilot stabilizes.
- The Reichman practicum cohort (Aug–Nov 2026) will get a separate code or extended cap — TBD when that window opens.

**Subscription events instrumented** (PostHog): `SUBSCRIPTION_STARTED`, `SUBSCRIPTION_CANCELED`. Payment provider TBD (Stripe most likely); not yet wired.

---

## Edge functions (18)

All under `supabase/functions/<slug>/index.ts`. Each writes per-call metrics via `_shared/metrics.ts` and (where they call OpenAI) emits Langfuse traces via `_shared/openai-chat.ts`. Non-OpenAI models route through `_shared/openrouter-chat.ts` — same OpenAI-shaped Response contract, same fire-and-forget Langfuse trace (reuses `sendLangfuseTrace` unchanged), same retry semantics (`openrouterChatCompletionWithRetry` mirrors the OpenAI wrapper: 3 retries, exponential + jitter, Retry-After honor). Used by `generate-tailored-cv` for the Sonnet branch.

| Slug | Model | Rate | Purpose |
|---|---|---|---|
| `ai-chat` | gpt-4o-mini (conversational agents) / **gpt-5.4-mini** (resume-extractor) | 30/h | Career Agent multi-turn chat. Emits `SUGGESTED_*_JSON` blocks (TASKS, ROADMAP_CHANGES, APPLICATION_ACTIONS, COMPANY_TARGET, CV_GENERATION, AGENT, STORY_CAPTURE) the frontend renders as cards. The `resume-extractor` agent reads from `_shared/model-routing.ts` and runs on **gpt-5.4-mini** with `reasoning_effort: 'none'` + `max_completion_tokens: 16000` + `response_format: { type: 'json_object' }`. The 5.x model swap landed after the post-PR-#277 bake-off across 5 controls picked gpt-5.4-mini for the best cost/latency/quality on the onboarding spinner; bake-off-validated cap is 16k because reasoning models count hidden thinking against the cap. callOpenAI branches on the route's `reasoning_effort` field: present → `max_completion_tokens`, absent → legacy `max_tokens`. Every agent except resume-extractor (conversational + legacy stubs) stays on the hardcoded `MODEL = 'gpt-4o-mini'` constant with the legacy max_tokens path, byte-identical to pre-#277. Client-side parse is the hardened `parseExtractedJson` from PR #277 — fixed the silent zero-experience loss that hit 4 of 19 pilot users |
| `analyze-job-match` | gpt-4o-mini | 30/h | Score JD vs profile → `match_score` + `goal_alignment_score` + `required_seniority`. Retries on token exhaustion (BASE 2048 / RETRY 4096) |
| `delete-account` | — | — | Self-service account deletion (PR #66). JWT-gated, wipes resumes/, inserts tombstone, calls `auth.admin.deleteUser` (fires CASCADEs) |
| `extract-proof-signals` | gpt-4o | 10/h | Pull proof signals (metrics, named tools, named outcomes) from CV text. Maps to skill IDs |
| `extract-story-from-text` | gpt-4o-mini | 60/h | STAR extraction from free-text. 3-layer anti-fabrication. Powers Story Bank |
| `generate-career-analysis` | gpt-4o | 10/h | Tiered role recs (`career_roles`). 3-phase: alias-aware skill resolution → deterministic scoring → LLM writes reasoning + `additional_credited_skill_ids` → server re-scores. 90s timeout |
| `generate-daily-action` | gpt-4o-mini | 60/h | Daily Action Card. Rule-based pick from tasks/apps/career_roles + LLM framing. UNIQUE per (user, for_date) |
| `generate-internship-profile` | gpt-4o | 4/h | Internship pitch strategy from profile + career_roles + experiences + stories. Single batched call, strict JSON. Anti-fab grounds `pitch_strength_signals` against source haystack |
| `generate-learning-paths` | gpt-4o-mini | 10/h | Course recs to close skill gaps. URL validation via Coursera API / YouTube oEmbed / trusted-domain checks |
| `generate-linkedin-comment` | gpt-4o | 60/h | Paste a post → 3 substantive comment options. Anti-fab: empty options + `no_fit_reason` when nothing genuine to say |
| `generate-linkedin-content` | gpt-4o | 30/h | 7-section LinkedIn profile generation (headline, about, experiences, volunteering, military, skills_priority, honors). Refinement mode supported |
| `generate-linkedin-outreach-message` | gpt-4o | 60/h | Multi-turn outreach coach. 8 goals. Two modes: new conversation or continue thread. Anti-pattern detection in post-process |
| `generate-linkedin-post` | gpt-4o | 60/h | 7 post types (project / lessons / milestone / recap / observation / question / free_form). Refinement mode UPDATES same row |
| `generate-tailored-cv` | gpt-4o (Pass 1) + **claude-sonnet-4-6 via OpenRouter** (Pass 2/3) | 30/h | Three-pass CV: keyword extraction (gpt-4o) → CV authoring (Sonnet + Option A overlay) → coverage retry (Sonnet) when must-include-phrase coverage drops below 50% AND user skill overlap ≥ 30%. Both call sites send `cv_model: 'sonnet'` from the frontend (PR ramp); server keeps gpt-4o as the rollback default. PDF render via pdf-lib. DEFENSIVE JSON PARSE: three-tier fence-tolerant parser (strict → ` ```json ``` ` regex → greedy brace) handles Sonnet's markdown-wrapped output. RECONCILE WARNINGS in response payload flag cross-bucket migrations + positional fallbacks. Phase 0 bake-off evidence: `docs/research/cv-bakeoff-2026-06.md` |
| `generate-tasks` | gpt-4o-mini | 10/h | Personalised tasks. Retry on truncation. Role library scoped to user's career_roles only |
| `import-linkedin-archive` | — | 10/h | LinkedIn data-export ZIP parser (positions, education, skills, recommendations, honors, volunteering, languages). Privacy-first: ZIP never persisted, counts-only logging |
| `lookup-role-skills` | — | — | Deterministic role → skills lookup against role library. No LLM, no rate limit |
| `match-internship-companies` | gpt-4o | 4/h | Two-stage: rule-based pre-filter (stage / sector / signal / geography → top 30) then ONE batched LLM call scoring fit + career-compound + per-company pitch. UPSERTs into `company_targets` |

**Deploy:** `supabase functions deploy <slug> --project-ref ilmqmodklutztuybsvwd`. CI does NOT auto-deploy — each change requires manual deploy after merge. The token lives at `/tmp/.gaj_supabase_token` for current sessions; see `tasks/lessons.md` 2026-05-05 entry.

**Standing items:**
- `resume-extractor` moved from `gpt-4o-mini` to `gpt-5.4-mini` in the post-#277 model-swap PR. The `ai-chat` callOpenAI helper now branches on the route's `reasoning_effort` field — present → `max_completion_tokens`, absent → legacy `max_tokens`. Adding a future reasoning model to any other route works the same way: include `reasoning_effort` + (optionally) `max_completion_tokens` and callOpenAI handles the translation. No other agent's body shape changed.
- `generate-tailored-cv` Pass 2/3 routes through `_shared/openrouter-chat.ts` to `anthropic/claude-sonnet-4.6`. The frontend sends `cv_model: 'sonnet'` from both call sites (`CVManagement.jsx`, `ChatInterface.jsx`); the server-side default stays `gpt-4o`, so a frontend revert at either call site returns that surface to gpt-4o with no edge-function redeploy. Required Supabase secret: `OPENROUTER_API_KEY`. Server returns HTTP 500 `no_openrouter_key` if the secret is unset and the request asked for Sonnet; the default branch never reads the key. Validate post-deploy via `scripts/validate-cv-deploy.ts` (model+ok per cell, reconcile_warnings, unsourced_bullets, Pass-3-fired heuristic from tokens_out ratio).

---

## Voice rules (5 constants)

All in `supabase/functions/_shared/voice-rules.ts`. Each is a long string injected into the system prompt of the relevant edge function. Source-of-truth voice across surfaces.

| Constant | Surface | Notes |
|---|---|---|
| `CV_VOICE_RULES` | `generate-tailored-cv` | Resume voice — concrete > generic, named outcomes, specific metrics, active voice |
| `LINKEDIN_VOICE_RULES` | LinkedIn profile content | Headline + summary + experience bullets — same anti-fluff discipline as CV |
| `POST_VOICE_RULES` | `generate-linkedin-post` | Hook rules, engagement-bait blacklist, suppressed openers ("Excited to share", "Thrilled to announce", "Humbled to") |
| `COMMENT_VOICE_RULES` | `generate-linkedin-comment` | 50–150 word sweet spot, anti-platitude list, Israeli direct register |
| `OUTREACH_VOICE_RULES` | `generate-linkedin-outreach-message` | The outreach contract, ≤200 char connection notes, anti-pattern list incl. "I hope this finds you well" variants, ask-temperature principle |

**The replace-banned-vocab-with-positive-voice-rules refactor was PR #20.** Voice-rules approach gives the model what TO write, not just what NOT to. For OUTREACH specifically, the model still slips template phrases even with hard-rule injection — PR #35 added programmatic post-process detection in `sanitizeSuggestion` that surfaces warning chips into `suggestion.warnings`.

---

## Schema (29 tables, all RLS-enabled)

Full live list:

```
account_deletions          admin_users                applications
calendar_events            career_roles               certifications
chat_messages              companies                  company_target_status_changes
company_targets            conversations              cv_templates
daily_actions              education                  error_logs
experiences                function_metrics           internship_profiles
job_suggestions            jobs                       linkedin_optimizations
linkedin_outreach_conversations  linkedin_posts       profiles
projects                   rate_limits                status_changes
stories                    tasks
```

**FKs from `auth.users`:** 22 total — 20 CASCADE (user data wipes on delete) + 2 SET NULL (`companies.created_by`, `error_logs.user_id` — both correct anonymization paths).

### Recent migrations (most recent first)

| Migration | Purpose |
|---|---|
| `20260520_account_deletions_audit.sql` | Audit table for self-service deletions (id, deleted_at, email, user_id_was). No FK to auth.users — row survives the cascade it describes. RLS on, service-role only |
| `20260520_profiles_has_seen_onboarding_tutorial.sql` | Returning-user flag for the tutorial skip gate. NOT cleared by `reset_user_data` |
| `20260519_chat_messages_company_target_actions.sql` | `suggested_company_target_actions jsonb` column + admin RPC update |
| `20260519_companies_user_managed_manual_rows.sql` | RLS so users can INSERT/UPDATE `companies.source='manual'` rows only |
| `20260519_company_target_status_changes.sql` | Audit log of kanban transitions, trigger-driven |
| `20260518_internship_finder.sql` | 3 tables (internship_profiles + companies + company_targets) + 4 profiles cols. 12 RLS policies, 7 indexes |
| `20260517_create_jobs_cache_table.sql` | `jobs` table — the direct-ATS scrape cache |
| `20260517_jobs_trgm_search_rpc.sql` | pg_trgm-based fuzzy title search RPC for JobSuggestions |
| `20260517_applications_ats_link.sql` | Link applications back to source ATS job posting |
| `20260517_profiles_referral_source.sql` | Capture how users heard about the platform |
| `20260514_education_table_phase_a.sql` + Phase B / FK / reset migrations | Move education off profiles flat columns into separate `education` table |
| `20260513_companies_source_research.sql` + seed | 391-row Israeli tech market seed (`source='research'`) |

### Key earlier migrations (cited often)

- `20260511_daily_actions.sql` — Daily Action Card table
- `20260506_linkedin_posts.sql` / `20260506_linkedin_outreach_conversations.sql` — Posts + Outreach Coach
- `20260504_stories_schema.sql` — Story Bank
- `20260504_function_metrics.sql` — Per-call edge-fn observability
- `20260504_application_outcome_loop_schema.sql` — Application status audit

---

## Key files

Single index — when something feels load-bearing, it's probably in here.

### Frontend

| Path | What |
|---|---|
| `src/Layout.jsx` | Sidebar nav + `profile_layout_chrome` query for full_name. Settings is NOT in NAV_ITEMS — access via SidebarFooter avatar |
| `src/components/layout/SidebarFooter.jsx` | Avatar circle = Link to /Settings (PR #67). Logout is a separate button |
| `src/pages/Settings.jsx` | Account / Onboarding / Danger zone. Reuses PasswordCard, RPC `reset_user_data`, and the `delete-account` edge function |
| `src/pages/Practicum.jsx` | Unified pipeline (PR #69). Both practicum_path values coexist; Add-my-own button + drag kanban + drawer for every user |
| `src/components/practicum/CompanyTargetsKanban.jsx` | Drag-and-drop kanban via `@hello-pangea/dnd`. Optimistic mutate + rollback on error |
| `src/pages/Tracker.jsx` | **Board-only** (was List+Board until 2026-06-04). Single kanban view across 7 status columns; clicking a card opens the full `ApplicationRow` detail in a right-side drawer (Sheet) defaulting to the Steps tab. List view, `?view=kanban` URL param, and status-filter pills all removed — columns serve that role |
| `src/components/tracker/ApplicationsKanban.jsx` | Drag-drop board via `@hello-pangea/dnd` (practicum pattern). Card root is `<div role="button">` — not `<button>` — so DnD's interactive-element guard doesn't swallow drag intent. Carries Track badge + "May be inactive" warning on the card itself |
| `src/components/tracker/ApplicationDetailDrawer.jsx` | Right-side Sheet wrapping `ApplicationRow` with `defaultExpanded` + `initialTab="checklist"`. Opens on board card click; reads the full app from the wide `["applications", uid]` cache so JD/checklist/etc. survive navigation to step CTAs |
| `src/components/practicum/AddOwnCompanyModal.jsx` | Two-write insert (companies + company_targets). Source values: `manual` / `self_added` |
| `src/components/practicum/CompanyTargetDrawer.jsx` | Right-side Sheet. "Open in Outreach Coach" link prefills `?prefillCompany=&prefillRole=` |
| `src/components/linkedin/NetworkingTab.jsx` | Reads prefill query params, strips them, jumps to new-conversation composer |
| `src/components/linkedin/networking/OutreachComposer.jsx` | Accepts `prefillCompany` / `prefillRole` props; seeds target on mount |
| `src/components/onboarding/OnboardingTutorial.jsx` | 6-slide carousel (Browse Jobs / Tracker / Story Bank / LinkedIn / CV / Chat Agents). Replaces the old "Your Roles" reveal |
| `src/components/onboarding/SkillTagInput.jsx` | Multi-mode autocomplete: `skills` (default), `job_titles`, `industries`, `work_environment`, `work_arrangement`, `honors`, `none` |
| `src/components/onboarding/StepResumeUpload.jsx` | Employment status XOR (PR #64): `looking_for_job` / `employed` / `unemployed` mutex; `student` + `freelance` stack |
| `src/lib/scoreApplication.js` | `trackFromScores` — deterministic track mapping; mirrors LLM-derived `assignTrackWithGoal` |

### Backend (edge functions + shared)

| Path | What |
|---|---|
| `supabase/functions/_shared/skill-aliases.ts` | **PR #61.** 170-entry alias map. `resolveSkillAliases(label, idSet)` covers chips + variants, falls through to snake_case match |
| `supabase/functions/_shared/voice-rules.ts` | The 5 voice-rule constants |
| `supabase/functions/_shared/metrics.ts` | `startMetric` / `finishMetric` writing to `function_metrics` |
| `supabase/functions/_shared/openai-chat.ts` | `openaiChatCompletion()` fetch wrapper with Langfuse pass-through tracing |
| `supabase/functions/_shared/model-routing.ts` | **PR #277.** Job-to-model routing map (`chat-agent`, `resume-extractor`, `structured-extract`). Only the `resume-extractor` agent in `ai-chat` consumes it today; other entries documented for the eventual agent-merge work. `ModelRoute` supports `response_format`, `reasoning_effort`, and `transport: 'openai' \| 'openrouter'` for forward-compat |
| `supabase/functions/_shared/libraries/00_role_library.ts` | 183 roles, v2.0 schema. Source of truth |
| `supabase/functions/_shared/libraries/01_skill_library.ts` | 387 unique skill IDs |
| `supabase/functions/_shared/libraries/companies_il.json` | 831-company ATS-tagged Israeli registry. Drives `scripts/refresh-jobs.ts` |
| `supabase/functions/delete-account/index.ts` | Self-service deletion (PR #66) |

### Scripts

| Path | What |
|---|---|
| `scripts/refresh-jobs.ts` | Direct-ATS scrape. 831 companies → ~440 ATS-supported → ~3k jobs. Nightly cron via GHA |
| `scripts/dry-run-skill-aliases.ts` | Offline impact-measurement against any user dump (PR #61) |

### Docs / process

| Path | What |
|---|---|
| `DOCUMENTATION.md` | Map of every doc in the repo |
| `CLAUDE.md` | Coding conventions, branch + PR rules, commit format |
| `ROADMAP.md` | Sprint plan, v1/v2 cuts, risk register |
| `tasks/lessons.md` | Append-only log of "took multiple attempts" gotchas |
| `.github/pull_request_template.md` | PR checklist + checkboxes |
| `.claude/settings.json` + hooks | Auto-format, file protection, dangerous-command blocking |

---

## Post-pilot backlog

Deliberately deferred. Pilot is Aug–Nov 2026; revisit in Dec 2026.

### Done since the previous backlog snapshot

- ✅ **Account deletion** — built and shipped (PR-C / #66). `delete-account` edge function + `account_deletions` audit table + typed-phrase consent gate. CASCADE coverage verified against live FKs.

### Still pending (auth surface)

- **Resend confirmation email** — Login.jsx in signin mode could surface a "Resend" button when the server returns "Email not confirmed". Calls `supabase.auth.resend({type:'signup', email})`. ~30 min.
- **Custom signup-confirmation landing page** — `/welcome` route shown briefly after the email link clicks through. Use `emailRedirectTo` on signup. ~45 min.
- **Post-signup welcome email** — non-transactional, sent ~1 day after confirmation if onboarding isn't complete. Needs Resend + an edge function on a cron or auth webhook. ~2–3h. Wait for pilot signal on drop-off.

### Still pending (architecture)

- **`company_enrichments` table** — per-user annotations on shared `companies` rows, instead of letting users UPDATE the row directly. Cleaner long-term; current pattern (manual rows scoped to `created_by`) blocks A-to-B tampering at the cost of duplicate rows when student B's agent enriches student A's company. Acceptable for 100-student pilot. See PR #22 (2026-05-14, security audit C-4).

### Still pending (bugs)

- **Tracker layout (#6 from Isaac's live-test list)** — visible typecheck errors in `Tracker.jsx` may be the root cause. Pending Isaac's screenshot.

---

## How to work with Claude Code

We use Claude (Opus 4.7 / 1M context) in two surfaces: **Claude Code** (terminal — direct file edits, command execution, lint/build) and **Claude.ai** (browser — research, deep planning, prompt-writing). The patterns below are how we've actually worked in PRs #20–#70.

The repo has **production Claude Code hooks** at `.claude/settings.json`: every file edit runs Prettier + ESLint, protected paths (migrations, voice-rules, libraries, .env, package-lock) require confirmation, dangerous bash commands (`rm -rf`, destructive SQL, `git push --force`, `--no-verify`) are blocked outright.

### The ask-don't-tell pattern

When in doubt, Claude pauses and asks. Non-negotiable for:
- **Decisions that change scope** — "should I add X?" not "I added X"
- **Decisions that lock in design** — surface options + leans before building
- **Risky / hard-to-reverse actions** — `git push --force`, dropping tables, force-merging, sending public messages
- **Anything visible to others** — pushing branches, opening PRs, posting comments

Eli's auto-memory: "Surface decisions for confirmation; don't lock in unilaterally even when broader scope is approved." If you find Claude diving into multi-file work without checking, redirect — the prompt was under-scoped.

### The pre-build investigation pattern (established in the D1-D4 / PR-C sequence)

For non-trivial work, Claude surfaces a numbered investigation report before building. Standard fields:

- **Existing tests** — what test coverage already exists?
- **Regression risk** — what could break?
- **Shared code** — what other surfaces touch this?
- **Rollback path** — single-commit revert vs migration vs data backfill?
- **Live-data check** — for anything touching schema, RLS, or count claims, verify against the live DB (`pg_class`, `pg_indexes`, `information_schema`, or direct `SELECT COUNT`)

Eli answers numbered options or redirects, then Claude builds. This is the explicit form of decision checkpointing.

### The full-CI-before-push rule

Per `tasks/lessons.md` 2026-05-06 entry: `vite build` ≠ ESLint. CI runs `npm run lint && npm run typecheck && npm run build` — three separate gates. Before any push:

```bash
npm run lint && npm test -- --run && npm run build
```

Typecheck is currently `continue-on-error: true` in CI (shadcn Button/Input typedef issues + Tracker.jsx baseline) — lint and build are blocking.

### Commit + PR conventions

From `CLAUDE.md`:
- Conventional commits: `feat(area):`, `fix(area):`, `refactor(area):`, `docs(area):`
- Co-author trailer: `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`
- Branch: `eli/<topic>` or `isaac/<topic>` — never push to main
- PR template: `.github/pull_request_template.md`
- Squash-merge to keep main linear
- Cross-review required for `_shared/libraries/` edits

---

## Tools / skills we use

Full toolkit across both surfaces. Isaac, you have access to all of these.

### Web research (Claude.ai — deep research mode)

Long-running multi-source research. Good for: industry data we don't already know, validating claims before they ground product decisions. Used for the LinkedIn post performance research that became `docs/research/linkedin-post-performance.md`.

**Pattern:** Eli specifies the research scope in Claude.ai → Claude.ai produces a long-form findings doc with cross-validated / single-sourced / contested tagging → Eli pastes the doc into the repo via Claude Code → related edge-function prompts cite it as source.

### Supabase MCP server (Claude.ai)

Direct Postgres queries against the live project. Used heavily this session for migration verification, FK audits, table inventory. When MCP isn't loaded, the fallback is the Supabase Management API + a personal access token stashed at `/tmp/.gaj_supabase_token` — see `tasks/lessons.md` 2026-05-05 entry.

### gh CLI (Claude Code terminal)

GitHub from the terminal — opening PRs, commenting, listing PRs/issues, checking CI status. Used for every PR opened in #20–#70.

### The prompt-writing pattern (Claude.ai → Claude Code)

When Eli wants Claude Code to do something complex:
1. Eli describes intent in Claude.ai
2. Claude.ai drafts a Claude Code prompt — framed as a question Claude Code should ask back, with relevant context
3. Eli reviews + tweaks
4. Eli pastes into Claude Code — self-contained briefing

Why: Claude.ai is better at scoping; Claude Code is better at executing. Splitting the job gives a higher-quality prompt than typing freeform.

### Installed Claude Code skills + MCPs

| Plugin | Source | What it gives you |
|---|---|---|
| **superpowers** | `obra/superpowers-marketplace` | Multi-agent dev workflow — TDD, code review, subagent execution, planning, brainstorming |
| **document-skills** | `anthropics/skills` | docx / pdf / pptx / xlsx authoring, frontend-design, webapp-testing, skill-creator |
| **ui-ux-pro-max** | `nextlevelbuilder/ui-ux-pro-max-skill` | 50+ UI styles, 161 color palettes, 57 font pairings, 99 UX guidelines |
| **marketing-skills** | `coreyhaines31/marketingskills` | 32 marketing skills: copywriting, page-cro, email-sequence, seo-audit |
| **Context7 MCP** | `https://mcp.context7.com/mcp` | Latest docs for React / Tailwind / shadcn / Supabase / Deno / Langfuse |

See `docs/strategy/installation-checklist.md` for the full roadmap.

---

## Keeping this file alive

**Every non-trivial PR updates this file.** Adding a new edge function? Add a row. Shipping a feature? Update the recent-work table at the top. Refactor changes a key file path? Update Key Files. New convention? Add a section or update CLAUDE.md and cross-reference here.

The PR template (`.github/pull_request_template.md`) has a checkbox for this — added in PR #36. If you read this file and something feels stale, that's the signal — fix it in your next PR.

When the file gets too long (target: <800 lines), split. The split rule: anything with its own evolution rhythm (lessons, research, sprint plan) lives in its own file and is cross-referenced from here.
