# Feasibility audit - canvas vs the real system (2026-07-17)

One-time audit of everything the fixture Home canvas (`src/pages/_preview/canvas/*`,
`Home3TabPreview.jsx`) already contains, checked against the REAL getajob
implementation: real component, real data shape, real backend endpoint/table.
DB claims are **live-verified** against Supabase ref `ilmqmodklutztuybsvwd`
(migrations + `information_schema` / live row checks), not assumed from names.

This is the port round's honest work-list. It also sets the bar for the
feasibility-first standing rule (see `canvas-tokens.md` + the design-lane
handoff): every future surface gets a **backend reality** line before it is
designed.

## Verdict at a glance

| Surface                                       | Backend reality                       | Port class                  |
| --------------------------------------------- | ------------------------------------- | --------------------------- |
| Job card                                      | **SUPPORTED AS-IS**                   | restyle only                |
| Job card "direction tag"                      | **FICTION** (absent in real + canvas) | net-new UI, data-gated      |
| CV-gen stage labels                           | **SUPPORTED AS-IS**                   | restyle only                |
| CV-gen percentage ring                        | **FICTION**                           | drop, or NEEDS BACKEND WORK |
| Coach expand + shared conversation            | **SUPPORTED AS-IS**                   | restyle only                |
| Coach auto-grow textarea                      | trivial frontend                      | restyle only                |
| Coach token streaming + pin-scroll + "latest" | **FICTION**                           | NEEDS BACKEND WORK          |
| Chat history / threads                        | **SUPPORTED AS-IS**                   | wire to provider            |
| Toolkit rail routes (all 8)                   | **SUPPORTED AS-IS**                   | wire only                   |
| Roadmap "matched roles" fields                | **SUPPORTED AS-IS**                   | restyle only                |
| Kanban board                                  | **SUPPORTED AS-IS**                   | restyle only                |
| Funnel tiles                                  | **SUPPORTED AS-IS**                   | restyle only                |

**Two things cannot ship as drawn** (honest-UI rule #9): the CV-gen **percentage
ring** and coach **token streaming**. Both assert progress the backend never
emits. Drop them or fund the named backend work.

## Per-surface detail

### Job card + direction tag

- **Real:** `src/components/jobs/JobGridCard.jsx` reads the same `deriveJobDisplay`
  (`src/lib/jobCardDisplay.js:66-95`) the canvas card does. The canvas
  (`CanvasJobCard.jsx`) is a strict **subset re-skin** - nothing fabricated. It
  drops the matched-skill chips + the hover "peek" popover the real card has.
- **Direction tag: FICTION.** No direction tag exists on the real job card today
  ("moves you toward" language lives only on Career/Roadmap). The only card-level
  direction datum is `goal_alignment_score` (a coarse in-domain=1.0 / off=0.35
  proxy, `scoreJobFit.js:452-466`); the richer **must-have + direction** model is
  approved-but-unbuilt (scoring-C2, PR #598). A direction tag is net-new UI gated
  on that work.
- **Port:** restyle only for the card; re-add matched chips + peek for parity; a
  direction tag is a separate, data-gated feature.

### CV-generation "theater"

- **Real:** `supabase/functions/generate-tailored-cv/index.ts` is a **single
  blocking call returning one JSON body** - no SSE, no progress channel, no
  percentage. The real wait-state (`src/components/cv-studio/CvGenerationProgress.jsx`)
  was written to deliberately show **no percentage**: skeleton + phase labels +
  "~30-40s".
- **Split verdict:** the canvas **stage labels** name the real pipeline steps
  (extract JD -> match experience -> reword -> anti-fabrication/format) =
  SUPPORTED. The canvas **0->100% ring** (`CvGenContext.jsx:101-115`) is
  **FICTION** - a fabricated completion meter the server can't back.
- **Port:** keep the stage-checklist visuals, **drop the percentage** (drive
  labels on a timed cadence like the real component). An honest ring would need
  per-section streaming from the edge fn (the unbuilt "P7").

### Coach dock: expand, streaming, auto-grow

- **Real:** `src/components/agent/CoachDock.jsx` + `CoachThread.jsx` +
  `CoachInput.jsx` over `src/lib/CoachConversationContext.jsx`; backend
  `supabase/functions/ai-chat/index.ts`.
- **Expand + "one conversation, two views": SUPPORTED.** Real expand opens
  `AgentDrawer` (edge slide-in) rendering the same thread over the shared
  provider. Canvas differs only in chrome (centered modal vs drawer) = restyle.
- **Auto-grow textarea:** real input is fixed `rows=1` + CSS clamp; the canvas JS
  auto-grow is a trivial client add.
- **Token streaming + pin-while-streaming scroll + "down to latest" pill:
  FICTION.** `ai-chat` returns one blocking JSON `{reply, suggested_*}` - no
  `stream:true`, no `text/event-stream`. The canvas word-by-word reveal is a local
  `setInterval`. Faithful streaming = **NEEDS BACKEND WORK**: convert `ai-chat` to
  an SSE/`ReadableStream` response AND move its `SUGGESTED_*_JSON` block parsing +
  truncation-retry (`ai-chat/index.ts:387-505`) to run after the stream closes.

### Chat history / threads (the claim, VERIFIED)

- **SUPPORTED AS-IS.** Live-verified tables: **`public.conversations`**
  (`id, user_id, agent, title, application_id, created_at, updated_at`; RLS
  owner-only) and **`public.chat_messages`** (`id, conversation_id, role,
content, suggested_tasks/roadmap_changes/application_actions/cv_generation/
company_target_actions jsonb, is_error, original_user_message, created_at`; RLS
  via parent). Migrations `20260424_chat_history.sql` (+ increments).
- **How:** persistence is **client-side** via `CoachConversationContext`
  (create conversation -> insert messages -> reload on switch). `ai-chat` is
  **stateless** - it only receives `conversation_history` in the request to build
  the prompt (rolling 20-turn window).
- **UPDATE 2026-07-17 - the port deletes the picker's home.** A thread picker
  already ships (`ChatInterface.jsx:1263-1300`) but is deliberately hidden in the
  dock because "switching belongs on the full-page CareerAgent surface" - and the
  locked canvas IA folds the sidebar Chat section into the Chat toolkit tile with
  **no CareerAgent tile**. Porting as locked therefore makes past threads
  unreachable. Scrubbed reality: max **2** threads for any real user (n=10). Full
  proposal + Eli's open call: `docs/design/chat-history-proposal.md`.
- **Port caveats:** (1) swap fixture/local state for `CoachConversationProvider`
  to get real persistence; (2) the coach dock is scoped to `agent='career_agent'`
  (full-page agents use a separate `ChatInterface`); (3) two live-session card
  types (`suggested_story_capture`, `suggested_add_skill`) have **no columns** so
  they vanish on reload unless columns are added.

### Toolkit rail click-throughs

- **SUPPORTED AS-IS - every tile has a real destination that already ships.**

  | Tile            | Real destination                             | Status                      |
  | --------------- | -------------------------------------------- | --------------------------- |
  | Profile         | `/Profile` (`src/pages/Profile.jsx`)         | real, `href` wired          |
  | LinkedIn        | `/Linkedin`                                  | real, `href` wired          |
  | CV bank         | `/CVAgent`                                   | real, `href` wired          |
  | Story bank      | `/StoryBank`                                 | real, `href` wired          |
  | Interview coach | `/InterviewCoach` (real agent page)          | real, **not wired** (toast) |
  | Skill hub       | `/SkillDevelopmentAdvisor` (real chat agent) | real, **not wired** (toast) |
  | Tasks           | `/Tasks` (real task manager)                 | real, **not wired** (toast) |
  | Chat            | coach dock (no route)                        | real, correctly wired       |

- **Port:** pure wiring - swap the three toasts for `href=createPageUrl(...)`.
  **Copy caveat:** the Skill hub descriptor "find gaps, close them" oversells - the
  real `/SkillDevelopmentAdvisor` is a chat agent, not a gap workspace.

### Roadmap "Your matched roles" panel

- **SUPPORTED AS-IS.** Source = **`public.career_roles`** via
  `useCareerRolesQuery` (`src/lib/queries/useCareerRoles.js`). All seven panel
  fields exist as live columns (`title, track, match_score, readiness_score,
goal_alignment_score, matched_skills, missing_skills`), populated across 570
  live rows.
- **Load-bearing facts to preserve:** scores are **0-1 fractions** (x100 to
  display; a "1%" bug shipped once from missing this); `goal_alignment_score` is
  nullable (~8 rows) and `missing_skills` empty on ~21% - **omit, never render
  0%/empty**. `track` = `track_1/2/3` -> Sweet spot / Detour / Growth.

### Kanban board

- **SUPPORTED AS-IS.** Canvas columns
  (`interested, preparing, applied, interviewing, offer, accepted, rejected`) are
  an **exact 1:1 match** to the live `applications.status` CHECK constraint
  (`chk_applications_status`, `20260424_applications_status_accepted.sql`). Real
  `ApplicationsKanban.jsx` writes status straight to `applications` on drag.
- **Port:** restyle only (status-tinted headers, count chips, drag-portal).

### Funnel tiles

- **SUPPORTED AS-IS.** The canvas literally calls the production mapping
  `src/lib/funnelBuckets.js` (`saved`=interested+preparing, `applied`=applied,
  `interview`=interviewing, `offer`=offer+accepted; `rejected` excluded). Counts
  are client-side derivations from the already-fetched `applications` rows.
- **Port:** restyle only.

## Fixture-shape drifts (violations of "fixtures mirror real shapes")

Fix these so fixtures match real columns:

- **`CANVAS_APPLICATIONS`** (`fixtures/canvasHome.js`): `date_applied` -> real
  `applied_date`; `note` -> real `notes`. Real columns it omits that the real card
  uses: `url` (View listing), `track` (Track badge), `goal_alignment_score`. The
  canvas card invents an "Applied {date}" chip the real card does not show.
- **Roadmap fixture** (`CanvasRoadmapMock.jsx`, current lab): uses 0-100 integers
  and invented field names (`qualified/path/have/build/tier`). Real shape is 0-1
  fractions + `readiness_score`/`match_score`/`goal_alignment_score`/
  `matched_skills`/`missing_skills`/`track`. Align on integration into the Browse
  right rail.

## Port work-list (split)

- **Restyle only (no backend):** job card, CV-gen stage checklist (minus %),
  coach expand/drawer, roadmap panel, kanban, funnel, toolkit tiles (wire hrefs).
- **Wire / small frontend:** toolkit toasts -> real routes; coach auto-grow;
  chat history -> `CoachConversationProvider`; fixture field renames.
- **FICTION - drop or fund:** CV-gen percentage ring (drop, or per-section
  streaming from `generate-tailored-cv`); coach token streaming + pin-scroll +
  "latest" (drop, or SSE conversion of `ai-chat` + suggestion-parse rework).
- **Data-gated net-new:** job-card direction tag (needs the must-have+direction
  scoring-C2 model; PR #598).
