# Agents Overhaul + Executable Tasks — Implementation Plan

_Status: draft for review (Isaac + Eli). Created 2026-06-28._

## 0. What this covers

Two connected overhauls, discussed and locked in design:

- **Part 2 — Agents become workspaces, not chatbots.** Each specialist agent
  gets a purpose-built layout around its *artifact* (editable CV, skill tree,
  interview transcript, roadmap), with chat demoted to a side assistant.
- **Part 1 — Home-page tasks become executable.** The tick on a task stops
  meaning "I did this manually" and starts meaning "do this for me": clicking a
  "Generate CV for <job>" task runs the work, then a toast + a persistent
  notification center deep-link you into the agent workspace that owns the result.

**The loop that ties them together:** task executes → produces an artifact →
notification deep-links into the agent workspace where that artifact lives and is
edited. That is why **agents come first** — they are the *destinations* the
executable-task loop links into.

---

## 1. Foundations that already exist (we build ON these, not from scratch)

This overhaul is much smaller than it sounds because the hard parts are already
in the repo:

| Capability | Where | State |
|---|---|---|
| **Structured, editable CV data** | `application_cvs` table — `cv_data jsonb`, `version`, `is_master`, full own-row RLS ([20260617](../supabase/migrations/20260617_application_cvs.sql), [20260618](../supabase/migrations/20260618_application_cvs_is_master.sql)) | Live. Migration comment literally says "foundation for conversational CV editing." |
| **CV generation** | `supabase/functions/generate-tailored-cv` | Live. Builds structured `cv_data` + renders PDF + persists `application_cvs` + applications pointer. |
| **CV edit engine** | `supabase/functions/refine-cv` | **Built but UNWIRED.** Master-reservoir select/reword/summary ops → assembled CV → PDF. "No call-site wiring yet — that's a later step." This is our conversational-edit engine. |
| **Reusable CV handler** | `src/lib/coachActionHandlers.js` → `generateTailoredCV({ proposal, queryClient, messageId })` | Live. `messageId` is optional → **callable from a task button**, not just chat. Returns `{ cv_url, fit_analysis, application_id, ... }`. |
| **Chat, with a side-panel mode** | `src/components/chat/ChatInterface.jsx` | Live. Supports `variant="drawer"` (narrow 390–520px mount), `pageContext`, action-card pattern, conversation persistence. |
| **Toasts** | `sonner` (`import { toast } from "sonner"`) | Live, used throughout `ChatInterface`. Part 1's toast surface already exists. |
| **Chat persistence** | `conversations` + `chat_messages` tables | Live. |
| **Skill graph data** | skill library (599 skills), `04_role_skill_mapping`, `unified_entity_skills` table, `generate-learning-paths` fn | Live. Backs the skill-tree artifact. |

**Gaps we must build:**

- No `task_runs` / notifications table (the spine of Part 1).
- No `action_type` on the `tasks` table (no way to mark a task executable).
  > Note: the `tasks` create-table migration is **not** in `supabase/migrations/`
  > (base schema / dashboard-created). Confirm current columns before the
  > migration. Observed columns from `Home.jsx`/`Tasks.jsx`: `id, user_id, title,
  > description, category, role_title, due_date, is_complete, source_table`.
- **No Supabase Realtime usage anywhere** (`.channel(` → 0 hits in `src`). Live
  cross-device notification updates are net-new infra.
- All four agents are identical thin wrappers over `ChatInterface` — no
  per-agent layout yet.

---

## 2. Architecture decisions (locked)

1. **Notifications = toast + persistent center (option "A and B").** One
   `task_runs` table is the single source of truth; it drives three surfaces:
   the task-row state, the completion toast, and a browsable bell/inbox.
2. **Executable tasks are a subset**, flagged by `action_type`. Tasks without an
   `action_type` keep the existing dumb checkbox (`toggleTask` in `Home.jsx`).
3. **Agents first, then executable tasks** (dependency order — see §0).
4. **Reuse the chat *component*, don't rebuild it.** Agents that include chat
   drop in the existing `ChatInterface` (`variant="drawer"` + `pageContext`)
   rather than reimplementing it — but the layout is bespoke per agent (see §3),
   and chat placement is each agent's own call. No second chat engine.

---

## 3. Each agent is its own bespoke layout

Per the brief, every agent gets a **unique** layout built around its own
artifact — **no shared "workspace shell," no enforced common chrome.** The CV
agent looks nothing like the skill agent looks nothing like the interview coach.

The **only** thing reused across agents is the existing chat *component*: where an
agent includes chat (the CV agent definitely does — "editable CV with a chat
feature"), drop in `ChatInterface` (it already supports `variant="drawer"` +
`pageContext`) rather than reimplementing chat four times. That is reusing code
that already exists — **not** standardizing layouts. Each agent decides whether
chat appears at all, and where.

---

## 4. Per-agent build order (Part 2)

### Phase 1 — CV Agent ⭐ (flagship: data + engine already exist)

Inspired by `machar.ai/studio/ready` (captured 2026-06-28) but **adapted to us** —
a three-column CV "studio" mounted **inside the real app shell** (`Layout`
sidebar). Preview built at `/_preview/cv-agent`. Anatomy:

- **Top bar (ours, not machar's):** a **CV / job selector dropdown** — the Master
  CV + per-application tailored copies + "Tailor for a new job…" — an autosave
  pill, and **Download** (= `render-cv` PDF). (Dropped machar's completeness /
  "I'm looking for" / EN-HE / score bar.)
- **① Left — Templates rail:** a gallery of CV templates (mini-document
  thumbnails) that **live-switch the document's look** (font + accent). Maps to
  the existing `_shared/cv-templates` (`build-pdf.ts`) + sector themes.
  **The score panel was cut** per Isaac — so the net-new `score-cv` rubric is
  **no longer needed**.
- **② Center — the CV document (dominant):** `application_cvs.cv_data` rendered
  as an inline **click-to-edit** doc with **autosave**. Sections: Summary,
  Experience (4 buckets), Education, Skills, Languages. Structured controls:
  month/year date dropdowns, "Present" checkbox, drag-to-reorder handles
  (`@hello-pangea/dnd`, already a dep), "+ bullet"; editable header.
- **③ Right — CV Agent (chat):** the existing `ChatInterface` (drawer variant),
  scoped to CV — narrative critique + quick-action chips ("Rewrite my summary",
  "Tighten bullets", "Add keywords", "Tailor to a job") + ask box. **No model
  label.** This is where **`refine-cv`** (built, unwired) becomes the edit engine.

**Editing model:** native `contentEditable` + native `<select>`s (the same
primitive machar uses — confirmed by fingerprinting: no ProseMirror/Slate/Lexical).
Inline edits mutate `cv_data` in the browser (instant) → own-row `UPDATE` to
`application_cvs` (autosave). Chat edits route through `refine-cv` ops (existing
anti-fab gates). PDF on demand via a new thin `render-cv` edge function.

**Tailored copies auto-populate the dropdown:** generating a tailored CV for a
job is an `application_cvs` INSERT (non-master); the dropdown is the list of the
user's `application_cvs`, so a freshly generated copy appears automatically (and
selects). Demonstrated in the preview mock.

- **Net-new for the real build:** (1) wire `refine-cv` as the chat edit engine;
  (2) the thin **`render-cv`** PDF function (`cv_data` + theme → PDF, no LLM).
  Everything else maps onto existing data/functions. (Score rubric dropped.)
- **Build sequence:** preview mock (done, in real shell, fixture data) → iterate
  on look/feel (in progress) → sign-off → real wiring.
- **Risk:** bidirectional structured-data ↔ PDF fidelity. Mitigated: the
  server-side anti-fabrication / coverage gates already exist in `refine-cv`.

### Phase 2 — Skill Advisor (skill tree + courses)
- **Artifact:** a skill tree/graph (have vs. missing per target role) from the
  skill library + `04_role_skill_mapping` + `unified_entity_skills`; a courses
  section populated by `generate-learning-paths`.
- **Chat side panel** drives "analyse my gaps / build a 3-month plan."
- **Work items:** skill-graph visualization; course/project list surface; wire
  `generate-learning-paths`. (Skill-graph *data shape* changes, if any, need
  cross-review per CLAUDE.md.)

### Phase 3 — Interview Coach (voice + transcript) — biggest unknown
- **Artifact:** a live mock-interview surface — mic capture, running transcript,
  spoken questions, and per-answer feedback.
- **OPEN DECISION:** speech stack — browser **Web Speech API** (free, no
  backend, uneven quality/support) vs. hosted **Whisper / Realtime API** (better,
  costs money, more infra). This drives the whole phase.
- **Work items:** transcript view, mic capture, TTS playback, answer scoring.
  Largest net-new surface; schedule last.

### Phase 4 — Career Agent (the hub)
- **OPEN DECISION:** does it get its own artifact (a **roadmap/track canvas** —
  likely reusing `Roadmap.jsx` components) or stay the conversational "hub" that
  routes into the other three? Lightest phase either way; decide after Phases 1–3.

---

## 5. Executable tasks + run/notification system (Part 1)

Built after there's at least one real destination + handler (i.e. ≥ Phase 1).
The `task_runs` spine can be scaffolded **alongside Phase 1**, since
`generate_cv` is the natural first action and both its handler and its
destination exist by then.

- **`task_runs` table (the spine).** Columns: `id, user_id, action_type, status
  (queued|running|succeeded|failed), task_id, application_id, result_ref (deep
  link target), payload jsonb, error text, read_at, created_at, updated_at`.
  Own-row RLS, mirroring `application_cvs`' 4-policy pattern. Verify RLS live.
- **`tasks.action_type`** (+ optional `action_payload`) via migration; tasks are
  tagged executable at generation time (`generate-tasks`) or by mapping
  `category`.
- **Action registry** (client): `action_type → { handler, buildDeepLink }`.
  First entry: `generate_cv → { generateTailoredCV, () => /CVAgent?... }`.
- **Run lifecycle (one row → three surfaces):** click → insert `task_runs`
  (`running`) + task-row spinner → call handler → update row
  (`succeeded`/`failed`, set `result_ref`) → **toast** (sonner) with "View →" →
  **bell inbox** lists `task_runs`, unread via `read_at`.
- **Realtime (net-new):** a Supabase Realtime subscription on `task_runs` for
  live badge/cross-device updates. MVP can skip it — the triggering client knows
  when its own `await` resolves (optimistic update); Realtime is the upgrade for
  the persistent bell to update live/in the background.

---

## 6. Sequencing & dependencies

| Phase | Deliverable | Depends on |
|---|---|---|
| 1 | **CV Agent** (bespoke layout: editable CV + wired `refine-cv`) | — |
| 1b | `task_runs` spine + `generate_cv` executable task + toast + bell (Part 1) | 1 |
| 2 | Skill Advisor (bespoke layout: skill tree + courses) | — |
| 3 | Interview Coach (bespoke layout: voice + transcript) | speech decision |
| 4 | Career Agent (roadmap canvas or hub) | 1–3 |
| 5 | Remaining executable actions (`generate_learning_path`, …) + Realtime | 1b, 2 |

Each phase is its own PR (or small PR stack). Keep `npm test`, `npm run build`,
`npm run lint`, `npm run typecheck` green. Update `docs/` + add a ROADMAP
"Up Next" entry when work starts.

---

## 7. Risks & cross-cutting concerns

- **Realtime is net-new infra** — first use in the app; isolate it.
- **Interview voice** is the biggest cost/quality unknown (see §4 Phase 3).
- **LLM fan-out / cost** — `refine-cv` + `generate-learning-paths` concurrency;
  re-read `tasks/lessons.md` before raising parallel OpenAI calls.
- **RLS on every new table** (`task_runs`) — verify against the live system
  (`pg_class`/`pg_indexes`) per CLAUDE.md's P0 rule.
- **Domain-library edits** (skill graph shape) need cross-review per CLAUDE.md.
- **Mobile/responsive** for each agent's new bespoke layout.
- **`pages.config.js` is hand-maintained** — register any new routes by hand. We
  plan to modify the four agent pages *in place* (routes unchanged) unless we
  split workspace vs. chat into separate routes.

---

## 8. Open decisions to confirm

1. **Interview speech stack** — Web Speech API vs. hosted Whisper/Realtime.
2. **Career Agent** — own roadmap-canvas artifact, or stay the hub-chat?
3. **Build `task_runs` with Phase 1** (recommended) or as a later standalone phase?
4. **Chat placement** — collapsible side rail in every agent, or some agents
   chat-primary?
5. **Routes** — modify the four agent pages in place, or add new
   `/<agent>/workspace` routes and keep the old chat route?

---

## 9. Verification per phase

Local dev preview at the agent route; lint/build/test/typecheck green; live RLS
check on any new table; manual walk of the artifact + chat + (for Part 1) the
task → run → toast → inbox → deep-link loop.
