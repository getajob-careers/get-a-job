---
title: IA + Interaction Spec (Arc 2, Step 0)
status: DRAFT — HELD FOR ELI'S REVIEW
owner: eli
last_reviewed: 2026-07-06
supersedes_structure_in:
  - docs/product/features.md
drives:
  - Arc 2 Step 1 (visual direction)
  - Extension resubmit contract (Arc 1)
code_paths:
  - src/Layout.jsx
  - src/pages
  - supabase/functions/ai-chat
---

# Get A Job — Information Architecture & Interaction Spec

> **What this is.** The structure and interaction model of _every_ feature, derived from
> **product logic** — what a job seeker needs at each stage of the loop — not from current
> usage. Usage is a **sanity check only, never the designer** — but the usage picture is now
> firmer than deep-qa-3's: PR #499's verified PostHog pageviews supersede the report's "we can't
> tell undiscovered from unwanted" caveat for the discoverability claims below. The satellites
> were **reached and declined, not hidden.** Small-n still applies to engagement rates.
>
> **The bar it answers (Eli's brief).** For a first-time user with zero explanation, every
> feature must answer four questions: **What is this? What do I do here? What happens when I
> do it? Where do I go next?** A feature that can't answer all four in its own frame is not
> designed yet.
>
> **Status.** DRAFT, wireframe-level, HELD. This doc drives Step 1 (visual direction — the
> `--rd-*` token values get chosen there; the _rules_ in design-craft outlive them) and
> hands the Chrome extension its contract for free (the extension is just another operator
> on these same features).

---

## 0. How to read this

Three layers, in order:

1. **The loop and the method** (§1–§2) — the five stages a job seeker moves through, and
   the single rule that decides whether a thing is a page, a panel, a card, a coach action,
   or a setting.
2. **Per-feature specs** (§3), grouped by loop stage. Each feature gets the same seven-line
   contract: _one job · loop stage · format (+why) · entry → exit · states · coach mirror ·
   never._ Satellites are included — a parked feature still gets a designed place.
3. **The global spec** (§4) — sitemap before/after, the nav model, what merges/collapses/
   hides/kills, the coach's cross-cutting role, and the minute-0-to-first-CV screenplay.

**Confidence note.** Every _structural_ recommendation here is derived from product logic and
is high-confidence. Usage is a sanity check — and the **pageview-based** discoverability claims
below are now **verified** (PR #499, live PostHog, ~94% real-user coverage), superseding
deep-qa-3's LOW-CONFIDENCE caveat _for those specific claims_. Per-feature engagement rates stay
small-n. Nothing here is a decision — it's a spec for Eli to redline.

---

## 1. The loop (product logic)

The observed loop in the data is short and paid — _onboard → see your fit → generate a CV_
(deep-qa-3 §5). But the **designed** loop is the full job-seeker journey; the short observed
loop is what happens when the tail is reached-but-declined (PR #499) and stage-premature, not
what a job seeker needs. We design for the whole loop and make the paid center (CV) the obvious
one-click payoff.

```
        ┌───────────────────────────────────────────────────────────┐
        │                                                           ▼
   [ 0. BECOME KNOWN ]        [ 1. UNDERSTAND MY FIT ]       [ 2. IMPROVE MY MATERIALS ]
   onboarding + profile  ──▶  fit, tracks, real jobs    ──▶  tailored CV (the paid core)
   "who am I"                 "what am I realistic for,       "make me a CV for THIS role"
                              and what should I aim at"                │
        ▲                                                             ▼
        │                                                     [ 3. APPLY ]
   [ 5. REPEAT ]                                              "I sent it / I'm applying"
   next role, next CV   ◀───  [ 4. TRACK ]  ◀───────────────────────┘
                              "where does each application stand"

   THE COACH is the connective tissue — an operator that can run ANY stage
   conversationally, mirroring the same actions the UI exposes.
```

**Stage → the user's sentence:**

| Stage                    | The user's own words                                  | Where it lives today                            |
| ------------------------ | ----------------------------------------------------- | ----------------------------------------------- |
| 0 · Become known         | "Tell it who I am."                                   | Onboarding, Profile                             |
| 1 · Understand my fit    | "What am I realistic for — and what should I aim at?" | Career, Roadmap, career-analysis, job-match     |
| 2 · Improve my materials | "Make me a CV for this role that's actually mine."    | CV gen, CV Studio, Story Bank, LinkedIn         |
| 3 · Apply                | "I'm applying / I applied."                           | Career job feed → pipeline                      |
| 4 · Track                | "Where does each application stand?"                  | Tracker/Pipeline, Tasks, Calendar, Daily Action |
| 5 · Repeat               | "Next role. Do it again, faster."                     | (emergent — the loop closes back to Stage 1)    |

---

## 2. The format taxonomy (the one rule)

**Format is decided by product logic, expressed as `frequency of use × depth of interaction`.**
Nothing is a page by default.

```
              SHALLOW interaction              DEEP interaction
            ┌──────────────────────────┬──────────────────────────┐
 HIGH freq  │  CARD-IN-FEED /          │  PAGE (workspace)         │
            │  COACH ACTION            │  Career · CV workspace    │
            │  Today's cards, nudges,  │  — the things you return  │
            │  the "make a CV" button  │  to and do real work in   │
            ├──────────────────────────┼──────────────────────────┤
 LOW freq   │  SETTING /               │  PAGE (on-demand)         │
            │  COLLAPSED PANEL         │  Profile edit · Studio    │
            │  Resources, account,     │  deep-dive · Internship   │
            │  LinkedIn (parked)       │  — deep but occasional    │
            └──────────────────────────┴──────────────────────────┘
```

**Rules that fall out of this:**

- **High-frequency + shallow → card or coach action.** If a user touches it often but each
  touch is light (mark done, start a CV, see a stat), it must never cost a navigation. It's
  a card in the feed or an action the coach can fire.
- **High-frequency + deep → page/workspace.** The two things a job seeker does real, repeated
  work in — _see my fit + find jobs_ (Career) and _make/refine a CV_ (CV workspace) — are
  pages. These are the only two workspaces the loop needs.
- **Low-frequency + deep → page reached on demand,** not in the primary nav's muscle-memory
  slot. Profile-deep-edit, CV Studio's fine-editing, Internship.
- **Low-frequency + shallow → setting or collapsed.** Account, Resources, parked satellites.
- **"Needed in the moment, while doing something else" → panel or coach action, never a page.**
  You don't navigate away from a job to capture a bullet or ask "am I ready for this?" — the
  coach dock and contextual panels handle it in place.

**The anti-pattern this kills:** today, the paid core (CV generation) is reached via
`Career → Track a job → open it → Generate`, and the coach is a _group of four pages_
(Career Agent / CV Agent / Interview Coach / Skill Advisor) you navigate _to_. Both invert
the rule: a high-frequency thing buried behind navigation, and a connective operator turned
into a set of destinations.

---

## 3. Per-feature specs

Template for every feature:

- **One job** (in the user's words) · **Loop stage**
- **Format** (+ the frequency×depth reason)
- **Entry** (how it's discovered in-flow) **→ Exit** (where it hands the user next)
- **States**: empty / loading / error / done (design-craft rule 7 — all four designed)
- **Coach mirror** (the operator equivalent — same action, same #490 resolution paths)
- **Never** (what it must not do: fabricate, dead-end, or duplicate another surface's job)

---

### STAGE 0 — BECOME KNOWN

#### 3.0.1 Onboarding

- **One job:** "Tell it who I am, once, without typing my whole life." · Stage 0.
- **Format:** Full-screen **flow** (not in the dashboard chrome — Layout already hides the
  sidebar until `onboarding_complete`). Frequency = once; depth = high → a dedicated linear
  flow, correctly _not_ a persistent page.
- **Entry:** Signup / first login auto-routes here; any route bounces here until complete.
  **Exit:** On finish → **Stage 1 payoff** (fit + first roadmap), _not_ a generic Home. This
  is the pivot the whole product hinges on: onboarding must hand the user their fit, warm.
- **States:**
  - _Empty:_ the first step (CV drop or "start from scratch") — one clear primary action.
  - _Loading:_ CV parse + career-analysis run behind an **honest** progress surface (design-craft
    rule 9; the ~80s career-analysis wait is real — name it, don't fake stages).
  - _Error:_ parse fails → "we couldn't read that file, add it by hand or try another" — never a
    dead stop; the flow continues on manual entry.
  - _Done:_ lands on the fit payoff with a single next action ("Make your first CV").
- **Coach mirror:** The coach runs the onboarding _reality-check_ conversation (it already
  does — deep-qa-3 §2). Post-onboarding, the coach can re-open any captured field ("I got a
  new internship" → updates Profile via the same handlers).
- **Never:** never invent experience/skills the user didn't give (anti-fab); never dead-end on
  a failed parse; never dump the user on an empty Home after finishing.

#### 3.0.2 Profile (the master record)

- **One job:** "The one true copy of my experience, skills, and education that everything else
  reads from." · Stage 0 (data source for all stages).
- **Format:** **Page**, low-frequency + deep → on-demand, not a daily destination. It is the
  _source of truth_ (deep-qa-3 KEEP, 1,383 LOC), but a job seeker edits it rarely.
- **Entry:** Sidebar (kept), plus **contextual deep-links** — every place that reads a profile
  field ("add a skill", "fix this experience") links straight to the relevant Profile section,
  not the top of the page. **Exit:** back to whatever sent you (a CV, the coach), with the edit
  reflected.
- **States:** _Empty:_ pre-onboarding shouldn't be reachable (Layout gates it). Post-onboarding
  sparse sections show "add your first project/cert" affordances. _Loading:_ section skeletons.
  _Error:_ save failure is explicit + retryable (never silent — carries the cache-pollution
  lesson: writes must not partially land). _Done:_ saved, with the canonical `skills_canonical`
  recomputed correctly.
- **Coach mirror:** `suggested_bullet_capture`, `suggested_add_skill` write to `experiences`/
  profile via `coachActionHandlers.js` — the coach edits the same record the page does.
- **Never:** never let a narrow cache read shrink the canonical skill set (deep-qa-3 / lessons
  2026-05-28); never be two sources of truth with any other surface.

---

### STAGE 1 — UNDERSTAND MY FIT

#### 3.1.1 Career (fit + real jobs + pipeline) — **CORE workspace**

- **One job:** "Show me what I'm realistic for and real openings I can act on." · Stage 1
  (+ hand-off to 3/4).
- **Format:** **Page/workspace** — the healthiest real demand (35 users, 23 chose to refresh
  fit). High-frequency + deep → a page. Two tabs already shipped (isaac/jobs-grid-redesign):
  **Job search** (matched roles + why-panel + live 2-up job grid) and **Pipeline** (the board).
- **Entry:** Primary nav; onboarding hands off here; the coach can deep-link a specific role/
  job. **Exit:** a job card → **CV workspace** in _one click_ ("Make a CV for this") — this is
  the deep-qa-3 §5 move: the paid center is one step from "here's your fit," not three.
- **States:**
  - _Empty:_ no matched roles yet → "run your career analysis" CTA (should be rare — onboarding
    seeds it). No jobs matched → honest "no live openings match this filter today" + widen.
  - _Loading:_ progressive first-page render (already: ~350ms vs full-corpus wait); matched-roles
    panel skeleton.
  - _Error:_ job feed fetch fails → cached last-good + "couldn't refresh" chip, never a blank grid.
  - _Done:_ tracking a job moves it to Pipeline with a visible confirmation + the pipeline count
    ticks.
- **Coach mirror:** `suggested_roadmap_changes` (add/remove target roles, update track),
  `suggested_application_actions` (add/update tracked application). The coach can do everything
  the Career page's buttons do.
- **Never:** never show a fit number that disagrees with the same job's number elsewhere
  (the track-drift bug — Arc 0 PR#3 fixes it); never present a matched role without the _why_
  (qualification + goal-alignment bars, matched/missing skills); never render 0–1 scores as
  1% (lessons 2026-06-11 — fixture-unit contract).

#### 3.1.2 Fit-of-a-specific-job (analyze-job-match) — **RESTRUCTURE (inline panel)**

- **One job:** "For _this_ posting, am I a fit — and where are the gaps?" · Stage 1.
- **Format:** **Panel** inside the Career job-detail view (in-the-moment, shallow-to-medium →
  never its own page) — the panel structure is correct by the format rule. Not "fix-discovery":
  PR #499 shows **17 real users reached /Jobs with ~0 job-match engagement**, so **discovery is
  not established as the blocker.** The open question is post-redesign _engagement_ (is the read
  wanted, once it's inline and grounded?) — that's what to measure, not findability.
- **Entry:** Opening any job card's detail shows fit inline (lazy). The extension is the _other_
  entry — it computes this on a live posting (Arc 1 must make it use the same governed path).
  **Exit:** "Make a CV for this" (Stage 2) or "Track it" (Stage 3).
- **States:** _Empty:_ JD not yet parsed → "reading this posting…". _Loading:_ fit skeleton.
  _Error:_ parse fail → "couldn't read this posting" + manual-paste fallback. _Done:_ fit bars
  - matched/missing skills + the two exits.
- **Coach mirror:** ask the coach "am I a fit for this?" → it runs the same analysis and returns
  the same structured read (NOT a fabricated "92% readiness" — see Arc 1; the number must come
  from the scorer, not the model's prose).
- **Never:** never fabricate a readiness percentage; never invent a missing-skill gap that the
  profile doesn't support (the false "Zendesk-gap" read — Arc 1).

#### 3.1.3 Roadmap / target roles + skill gaps

- **One job:** "What should I aim at next, and what do I need to get there?" · Stage 1.
- **Format:** **Folded into Career's Job-search tab** as the matched-roles + why panel; the
  standalone `/Roadmap` page collapses. Medium frequency, medium depth — it belongs _beside_ the
  jobs it explains, not on its own route.
- **Entry:** Career page (the matched-roles column). **Exit:** a target role → its live jobs →
  CV. **States:** as Career §3.1.1. **Coach mirror:** `suggested_roadmap_changes`.
- **Never:** never be a second place fit is computed with different thresholds than Career/CV.

#### 3.1.4 Skill Advisor / Learning paths — **PARK → coach mode now; graduates to a Skills workspace**

- **One job:** "I have a skill gap — how do I close it?" · Stage 1→2 bridge.
- **Format:** **Coach action + a contextual card**, not a nav destination _today_. Reached but
  unwanted (PR #499: ~3 real users opened /SkillDevelopmentAdvisor, 0 learning-path engagement) —
  premature for a pre-application student base. When Career surfaces a _missing skill_ on a role
  the user targets, a "close this gap" card can offer learning paths inline.
- **Graduation (planned):** it dissolves into a coach mode NOW, but is planned to **graduate to a
  dedicated on-demand Skills workspace** when its built-out version ships — **concept stage only
  here; do not encode a specific layout or numbers** (from any mockup). Two **binding constraints**
  on that future workspace: **(a)** any readiness/fit numbers it displays are **read from the same
  scorer and thresholds as Career** (§3.1.1) — never computed independently (this is the
  track-drift class, §4.4); **(b)** learning links come from **validated sources** (the existing
  Coursera link set + URL validation) — never invented. Grounding for the advice itself: see the
  retrieval-layer note in §3.5.1.
- **Entry:** the missing-skill chip on a role/job → "how do I get this?" (coach). **Exit:** back
  to the role with a saved plan or task. **States:** _Empty/Done_ handled as a coach card;
  _Loading/Error_ inherit the coach's. **Coach mirror:** this _is_ a coach capability (skill-
  advice intent) until it graduates.
- **Never:** never **in the primary nav** (it has no independent pull at this stage); never invent
  courses/URLs that don't resolve (URL-validation already exists).

---

### STAGE 2 — IMPROVE MY MATERIALS

#### 3.2.1 CV workspace (generate → refine → render → edit) — **THE PAID CORE**

- **One job:** "Make me a CV for this specific role that's polished _and_ actually mine." ·
  Stage 2. This is the one thing users pay for (~80% of real cost; 23–25 users).
- **Format:** **Page/workspace** — high-frequency-for-active-users + deep. Today it is
  fractured: `generate-tailored-cv` (chat/tracker/checklist) **and** a second engine in CV
  Studio (`refine-cv`+`render-cv`+`edit-cv`), with the invoke body copy-pasted in 3 places
  (deep-qa-3 §3 structural move #1). The spec's structural call: **one workspace, one engine,
  one renderer** — generate, then refine/edit, then the _same_ document you download is the one
  you previewed.
- **Consolidation arc — required FIRST step (do not skip):** before scoping the one-engine merge,
  **investigate which of the two engines/renderers is the healthier canonical base** — code
  health, preview==download fidelity, and where the live title-mislabeling bug actually lives.
  The merge then ships **behind an opt-in flag** so its blast radius is observable before fan-out
  (PR #156 lesson). This investigation is **not done yet** and is the first task of the CV
  consolidation arc — the merge does not begin until it lands. (§3.2.2 is the other half of the
  same merge.)
- **Entry (this is the headline IA change):** **one click from fit.** A job/role card's "Make a
  CV for this" opens the workspace with the JD + target role pre-loaded. Also enterable from the
  coach ("make me a CV for this") and directly (nav "CV"). **Exit:** download + "Track this
  application" (Stage 3) — the finished-CV card's "View in tracker" CTA (#491) is the model.
- **States:**
  - _Empty:_ no CV yet for this role → one primary "Generate" (click-gated, single-fire per #489).
  - _Loading:_ the **honest** staged progress (#482 truthful Studio stage; no fabricated steps).
  - _Error:_ generation 500 (rate-limit) → "the writer's busy, retrying" with a real retry, not a
    dead 500 (lessons 2026-05-26 concurrent-OpenAI); JD missing → resolve it, don't 400 on
    `application_id: null` (the known coach P0).
  - _Done:_ preview == download; enforcement gate ran **once**; anti-fab gate passed; CTA to track.
- **Coach mirror:** `suggested_cv_generation` → `generateTailoredCV` / `generateTailoredCVLinked`
  (+ `ensureApplicationHasJd`). The coach's "Generate CV" card and the workspace's button are the
  same action, provider-owned + click-gated + single-fire (#489/#490). Both resolve which
  application via the same #490 paths.
- **Never:** never let the previewed doc diverge from the downloaded doc (found diverging — must
  be one renderer); never fabricate metrics/tools/numbers (anti-fab, the central rule here);
  never run the enforcement gate twice; never fire generation without an explicit click.

#### 3.2.2 CV Studio (fine editing) — **COMBINE into the CV workspace**

- **One job:** "Tweak the CV I just generated — reword a bullet, fix a section." · Stage 2.
- **Format:** the **edit mode of the CV workspace**, not a separate `/CVAgent` surface. Low
  standalone use; it's the after-generate step, so it belongs _inside_ the same workspace as a
  mode, sharing the one engine + renderer.
- **Entry:** from the generated CV ("edit"). **Exit:** back to the finished CV → track.
  **States:** inline edit affordances; _Loading_ per-edit; _Error_ per-edit retry; _Done_ the
  edit is reflected in the single canonical document. **Coach mirror:** `edit-cv` targeted edits
  ("make the summary punchier") run the same path.
- **Never:** never be a second CV engine/renderer producing a different document than 3.2.1.

#### 3.2.3 Story Bank / bullet capture — **PARK (keep code; surface contextually)**

- **One job:** "Capture something I did once, reuse it everywhere." · Stage 2 raw material.
- **Format:** **Coach action + contextual save-card**, no nav entry. **Reached but unwanted**
  (PR #499: ~5 real users opened /StoryBank, 0 saved a story) — so the remedy is _not_ to surface
  it harder; it's to make capture happen in-the-moment where the value is. It still feeds CV
  bullets, so the _code_ stays. The right home: while chatting or reviewing a CV, "save this as a story."
- **Entry:** coach `suggested_bullet_capture` / story-capture card after CV gen (Path B sequential
  follow-up already built); a "save to my stories" affordance on any achievement the coach
  surfaces. **Exit:** the story is available as CV raw material (STORY BANK PRECEDENCE in
  generate-tailored-cv). **States:** save-card 5-phase state machine (exists); _Empty_ = no
  stories yet, offered contextually not as an empty page; _Done_ = captured + dedup-checked.
- **Coach mirror:** it _is_ a coach action (`extract-story-from-text`, `extract-bullets`).
- **Never:** never a nav destination competing with Profile for "where my experience lives";
  never duplicate a bullet without the add-anyway/replace/skip path (bullet-dedup follow-up).

#### 3.2.4 LinkedIn suite — **PARK (biggest satellite tax; keep code, hide entry)**

- **One job:** "Improve my LinkedIn presence and outreach." · Stage 2 (adjacent).
- **Format:** **Collapsed / out of primary nav.** 6 deployed edge fns for near-zero engagement
  (4 optimize / 3 content / 0 posts / 0 outreach) — **reached but unwanted** (PR #499: ~5 real
  users opened /Linkedin, ~0 engaged), so it's the biggest maintenance tax for a feature users
  find and skip. Not killed (distinct value, real research behind it); parked behind a "More
  tools" collapse or removed from nav with deep-links kept.
- **Entry:** none in primary nav; reachable via a collapsed "More" or a coach suggestion when
  relevant. **Exit:** back to the loop. **States:** unchanged where reached; not a launch-surface.
- **Coach mirror:** the coach can draft a post/comment/outreach message on request (existing fns),
  which is the _right_ discovery path — pull, not a parked page.
- **Promote-back criteria (staged, not a permanent demotion):** LinkedIn returns to a first-class
  surface when **both** hold — **(a)** the outreach-quality bug is diagnosed and fixed, and **(b)**
  coach-driven LinkedIn requests show real pull post-redesign. Until then it stays parked.
- **Never:** never sit in the primary nav taking a muscle-memory slot the loop needs; never emit
  the anti-pattern outreach openers ("I hope you're doing well") without the warning chips.

---

### STAGE 3 — APPLY

#### 3.3.1 Apply / "I'm applying" (Career job feed → pipeline)

- **One job:** "I'm applying to this — start tracking it." · Stage 3 (the hinge from make→track).
- **Format:** **Action on a job card + a coach action**, not a page. Applying is a single
  moment; the destination is the pipeline (Stage 4). Today only 4 applications exist across 2
  users — the tail is **stage-premature** (most of the 35 aren't applying yet; not a discovery
  problem), so the design goal is: when a user _is_ ready, applying is frictionless and obvious.
- **Entry:** "Track / I applied" on a job card; "Make a CV" implicitly creates the application
  (#490 Generate-implies-application). The extension is the _in-the-wild_ apply entry (on a
  posting anywhere) — must add-application through the same path (Arc 1: today it has no
  add-application path — the dead-end). **Exit:** the Pipeline board (Stage 4), the new card
  visible in "Saved/Applied".
- **States:** _Empty_ handled by the source card; _Loading_ optimistic add + reconcile; _Error_
  add-failure is explicit + retryable; _Done_ card appears in pipeline with correct `source`/
  `found_via_*`. **Coach mirror:** `suggested_application_actions` (`add_application`,
  `update_application`) — the coach adds/moves applications exactly as the UI does.
- **Never:** never dead-end (the extension's current failure); never create a duplicate
  application for the same job; never lose the JD (`ensureApplicationHasJd`).

---

### STAGE 4 — TRACK

#### 3.4.1 Pipeline / Tracker (applications board) — **KEEP simple; it's the loop's home base**

- **One job:** "See where every application stands and move it forward." · Stage 4.
- **Format:** **Career's Pipeline tab** (already shipped) — not a separate `/Tracker` product.
  Standalone `Tracker.jsx` is redirect-only and slated for KILL (Arc 0). Kept deliberately
  _lightweight_ (a board, not a Kanban product): all 7 stages visible, no horizontal scroll,
  drag between columns.
- **Entry:** Career → Pipeline tab; `?pipeline=open` deep-link; the finished-CV "View in tracker"
  CTA (#491); Today's pipeline snapshot card. **Exit:** a card → application detail → next-step
  (or back to Stage 1 for the next role — closing the loop).
- **States:** _Empty:_ "nothing here yet — track a job from Job search" with the one action that
  fills it (never a blank board). _Loading:_ column skeletons. _Error:_ board fetch fail →
  last-good + retry chip. _Done:_ status change persists + `status_changes` audit row.
- **Coach mirror:** `suggested_application_actions` (`update_application` moves stages).
- **Never:** never grow into a heavyweight PM tool; never be a second place applications live.

#### 3.4.2 Tasks — **PARK (auto-gen off; keep manual/coach next-steps)**

- **One job:** "Concrete next steps so 'I should do something' becomes a finishable list." ·
  Stage 4.
- **Format:** **Card rows on Today + coach-generated**, not a standalone `/Tasks` page. 103
  auto-generated, 5 completed by 3 users — auto-generation masquerading as demand. The value
  (a real next step) survives; the _auto-fire volume_ does not.
- **Entry:** Today's "plan for today" rows; the coach proposes a task when it's genuinely the
  next step (`suggested_tasks`). **Exit:** done → momentum reflected on Today. **States:**
  _Empty:_ honest "no tasks — here's the one thing that matters" (tie to the next real action),
  not a manufactured list. _Done:_ checkable, count ticks.
- **Coach mirror:** `suggested_tasks` / `applyAllTaskSuggestions`.
- **Never:** never auto-generate a list nobody asked for and call it a plan; never show a task
  that doesn't map to a real loop action.

#### 3.4.3 Calendar — **PARK (fold dates into Track/Today)**

- **One job:** "When are my deadlines and interviews?" · Stage 4.
- **Format:** **Not a page.** `calendar_events` is 0 rows; the date info that matters
  (application deadlines, interview dates) belongs _on the application card_ and as a Today
  strip, not a separate calendar surface. Code kept, entry hidden.
- **Entry:** none primary; dates surface on pipeline cards + Today. **Exit:** the application.
  **States:** n/a as a standalone; date chips on cards. **Coach mirror:** the coach can state
  "you have X due" from pipeline data. **Never:** never a standalone calendar with no events.

#### 3.4.4 Daily Action — **KILL AS BUILT (degrade to honest empty)**

- **One job (as pitched):** "The single most important thing to do today." · Stage 4/5 nudge.
- **Format:** **Removed as an auto-generated surface.** 723 rows, 50 users, **0 completions** —
  100% auto noise + nightly cron LLM spend (Arc 0 PR#2 turns the cron OFF). The _idea_ (one
  clear next action) is kept — but honest: Today's hero becomes "resume where you left off /
  your one next step," derived from real loop state (an unfinished CV, an untracked match), **not
  a fabricated daily task**.
- **Entry:** Today's hero card. **Exit:** into the real action it points at. **States:**
  _Empty:_ the graceful degrade — "You're all caught up" or the single genuine next step; never
  a manufactured task. _Done:_ reflects real progress.
- **Coach mirror:** the coach answering "what should I do now?" reads the same real state.
- **Never (the whole reason it's killed-as-built):** never generate a daily task with no
  completion path and no genuine trigger; never let cron throughput read as engagement (design-
  craft rule 9 — honest UI; QA-audit discipline — cron ≠ chosen usage).

---

### STAGE 5 — REPEAT / CONNECTIVE

#### 3.5.1 The Coach (ai-chat) — **CORE connective operator**

- **One job:** "A coach who's read everything about me and can just _do_ the thing." · every
  stage. Connective tissue: onboarding reality-check + the CV-gen trigger; 38 users touch it.
- **Format:** **Omnipresent dock** (CoachDock, already in the sidebar) + drawer/sheet — **one
  coach, one renderer.** Today there are _two_ client engines (`ChatInterface.jsx` 1,452 LOC +
  the CoachThread/CoachDock stack) both streaming/rendering/retrying the same backend, and the
  nav exposes it as _four pages_ (Career Agent / CV Agent / Interview Coach / Skill Advisor).
  The spec collapses both: **one coach client**, and the four "agents" become **intents/modes**
  of the one coach, not destinations.
- **Entry:** always present (dock desktop, chip mobile). Contextual: every feature can open the
  coach pre-loaded with that feature's context ("ask about this job", "help with this CV").
  **Exit:** the coach _hands off into the feature_ — its actions land in the real surfaces
  (a CV in the workspace, an application in the pipeline), then points there ("View in tracker").
- **States:** _Empty:_ a first-run coach shows what it can _do_ (3–4 real starter actions tied to
  the user's actual state), not a blank prompt. _Loading:_ streaming with the placeholder-replace
  fix (lessons 2026-05-26 stale-closure). _Error:_ stream error surfaces once, no duplicate
  bubble; auth-slow surfaces as "retrying," not infinite skeleton. _Done:_ the action's result
  card (CV, task, application) with its in-app destination.
- **Coach mirror:** the coach _is_ the mirror layer — every `suggested_*` block maps 1:1 to a UI
  action and resolves targets via the #490 paths. **This is the spec's core invariant: for every
  feature above, the coach-action and the UI-action are the same operation.**
- **Graduation (planned):** the four "agents" are coach modes now, but **Interview Coach** is
  planned to **graduate to a dedicated voiced interview-session page** (an on-demand session
  surface) when its built-out version ships — **concept stage only here; no layout or numbers
  encoded.** (Skill Advisor's graduation to a Skills workspace is §3.1.4.) **Grounding constraint
  for both graduated surfaces and for coach advice modes generally:** they are expected to be
  grounded by a **curated retrieval layer** (a knowledge base + pgvector retrieval in `ai-chat`)
  rather than the model's general knowledge; scoping that layer is its own future arc and is **out
  of this spec's scope.**
- **Never:** never fabricate context it doesn't have (parrot its own prompt examples — lessons
  2026-06-11); never be built twice (one client); never take a nav slot as four separate agents.

#### 3.5.2 Today / Home (the hub) — **CORE momentum surface**

- **One job:** "What should I do right now?" the moment I open the app. · Stage 5 (re-entry hub).
- **Format:** **Page** (the landing hub) — but a _composition of cards_, each card a shallow entry
  into a deep surface. High-frequency, shallow-per-card → the card grid is exactly right.
- **Entry:** default landing after onboarding + every session start. **Exit:** each card hands off
  into its loop stage (hero → next action; matches → Career; pipeline snapshot → Track; make-a-CV
  → CV workspace). **States:** _Empty_ (brand-new, just onboarded): a warm "here's your fit, make
  your first CV" — the screenplay's landing. _Loading:_ card skeletons. _Error:_ per-card
  degrade, never a blank Today. _Done:_ reflects real progress (honest stats: live matches,
  applications in motion, CVs made — NOT fabricated daily-action counts).
- **Coach mirror:** the dock sits beside Today; "what now?" is answerable in either place with the
  same state.
- **Never:** never lead with a fabricated daily task (see 3.4.4); never show a stat that counts
  auto-generated volume as if it were user action.

#### 3.5.3 Internship / Practicum — **PARK UNTIL PILOT (conditional, unchanged)**

- **One job:** "Win an internship through outreach, not just listings." · a Stage-1→3 variant for
  practicum users.
- **Format:** **Conditional page** (renders only when `practicum_path` set — 7 users). Correct as
  gated; the pilot is Aug–Nov 2026. Deep + low-frequency + audience-gated → an on-demand page for
  exactly the users it serves.
- **Entry:** conditional nav section (fix the latent bug: it currently searches for a removed
  `pipeline` section id and appends at the end — should insert deliberately). **Exit:** company
  target → pitch → outreach (coach). **States:** designed for the 7, revisited at pilot.
  **Coach mirror:** `suggested_company_target_actions`.
- **Never:** never show to non-practicum users; never block the main loop's nav for the gated few.

---

### CROSS-CUTTING (not loop stages — placed for completeness)

- **Settings** — _setting._ Account, delete-account (GDPR). Reached from SidebarFooter. Low-freq,
  shallow. States: standard form; delete is a guarded, confirmed, irreversible action.
- **Resources** — _setting-tier / collapsed._ Evergreen guides; no AI. Reached from a "More" or
  footer, not primary nav. Low-freq, shallow.
- **Admin / AdminLaunch** — _internal, out of the user IA entirely._ RLS-gated ops dashboards;
  they don't appear in the user-facing sitemap and aren't subject to the four-question test.
- **Feedback widget** — _panel._ Always-available, shallow. 0 rows so far — keep it, make it one
  obvious tap; a cheap qualitative signal channel alongside the PostHog instrumentation that is
  already live (PR #412, verified in PR #499).

---

## 4. The global spec

### 4.1 Sitemap — BEFORE (ground-truthed from `src/Layout.jsx` + routes, 2026-07-06)

```
Sidebar (authenticated)
├── Today            → Home
├── Career           → Career  (Job search / Pipeline tabs — isaac branch)
├── Chat  ▼          (collapsible group of FOUR agent pages)
│   ├── Career Agent → CareerAgent
│   ├── CV Agent     → CVAgent   (thin stub → CVStudioLive, the 2nd CV engine)
│   ├── Interview Coach → InterviewCoach
│   └── Skill Advisor   → SkillDevelopmentAdvisor
├── Profile          → Profile
└── [Internship]     → Internship   (conditional on practicum_path; currently appends at end
                                     due to a stale `pipeline` id lookup — latent bug)
+ CoachDock          (docked chat in the sidebar — the coach ALSO lives here, so the coach is
                      simultaneously a 4-page nav group AND a dock: the duplication in the flesh)
+ SidebarFooter → Settings

Routable-but-delisted (deep-links only): Roadmap, Jobs, Tracker(redirect), Calendar, Tasks,
  StoryBank, Linkedin, Subagents(orphan), Resources, Admin, AdminLaunch
Public: Landing v2, Landing(legacy), login, reset-password, privacy, terms, auth/callback
```

**What's wrong with BEFORE, in one breath:** the coach exists twice (four pages _and_ the dock);
the paid core (CV) is a thin stub buried under "Chat → CV Agent" that opens a _second_ CV engine;
fit lives in three places (Career, Roadmap, job-match) that can disagree; and half the nav's
conceptual weight (the four agents) is a connective operator wearing a destination's clothes.

### 4.2 Sitemap — AFTER (proposed)

```
Sidebar (authenticated) — the nav IS the loop
├── Today            → hub of cards (honest momentum; no fabricated daily task)
├── Career           → Stage 1: fit + real jobs + Pipeline tab   [Roadmap + job-match folded in]
├── CV               → Stage 2: the ONE CV workspace (generate→refine→render→edit, one engine)
├── Profile          → Stage 0: master record (on-demand, contextual deep-links)
└── [Internship]     → conditional, unchanged (fix the insert bug)

Coach → OMNIPRESENT dock + drawer (NOT a nav group). The four "agents" become intents/modes.
        Every feature can open it pre-loaded with context.

More ▸ (collapsed / footer)  →  Resources, LinkedIn tools (parked), Settings
Killed / dropped from IA     →  standalone Tracker page, Calendar page, Tasks page,
                                 Daily-Action-as-built, Subagents orphan, Story Bank as a page
                                 (Story Bank capture survives as a coach action)
Internal (out of user IA)    →  Admin, AdminLaunch
```

**Before → After nav count:** 4 primary + 4 chat sub-items + conditional → **4 primary
(Today · Career · CV · Profile) + omnipresent coach + conditional Internship.** The chat group
disappears (folded into the dock); CV _rises_ from a buried stub to a first-class workspace;
fit consolidates into Career.

### 4.3 The nav model

- **Primary sidebar = the loop, four slots max:** Today (re-enter), Career (fit+jobs+track),
  CV (materials), Profile (who I am). This honors the 4–7 item rule _and_ maps 1:1 to loop
  stages a first-timer can reason about.
- **The coach is not in the nav — it's everywhere.** Dock on desktop, chip on mobile, and a
  context-open from inside any feature. One client, one renderer (kills the ChatInterface vs
  CoachThread duplication).
- **Track is a tab of Career, not a nav slot** — applying and tracking are the same workspace's
  right-hand life, reached in one tab, deep-linkable (`?pipeline=open`).
- **Everything parked lives under a single "More" collapse** (or footer) — discoverable, not
  muscle-memory. Nothing that a launch job seeker needs is more than one click from Today.
- **Contextual entry beats nav archaeology:** the design rule for every satellite is _pull, not
  a parked page_ — the coach or a contextual card surfaces it exactly when it's relevant
  (a skill gap → learning path; an achievement → save a story; a good posting → draft an
  outreach message).

### 4.4 What merges / collapses / hides / kills

| Move                | Surfaces                                                                                                                                                                                                    | Rationale (product logic; usage = sanity check)                                                                                                                                                                                                                          |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **MERGE**           | Roadmap + job-match **→** Career; CV Studio **→** CV workspace; the two chat clients **→** one coach                                                                                                        | Fit must be one number in one place; the CV must be one document from one engine; every coach feature currently built twice.                                                                                                                                             |
| **RISE**            | CV: buried stub **→** first-class workspace, one click from fit                                                                                                                                             | The one paid thing (~80% of real cost) should be the obvious center.                                                                                                                                                                                                     |
| **COLLAPSE**        | LinkedIn suite, Resources, Skill-advisor **→** "More" / coach pull                                                                                                                                          | Real (or evergreen) value, **reached but unwanted** (PR #499: near-zero engagement despite being reached) — keep code, stop taking nav slots, and don't reinvest in discovery.                                                                                           |
| **HIDE / PARK**     | Story Bank page, Calendar page, Tasks page                                                                                                                                                                  | The _jobs_ survive as coach actions / card rows / on-card dates; the standalone pages don't earn a route.                                                                                                                                                                |
| **KILL (as built)** | Daily Action + its nightly cron                                                                                                                                                                             | 0 completions / 723 auto rows; degrade to honest empty. (Arc 0 PR#2)                                                                                                                                                                                                     |
| **KILL (dead)**     | standalone Tracker.jsx, Subagents orphan, 3 legacy edge fns, send-reengagement, send-waitlist, orphan tables (`campaign_sends`, `waitlist_signups`, `job_suggestions`, `cv_templates`, the rollback backup) | Zero callers — verified by the kill-manifest (Arc 0 PR#1). **NB:** `calendar_events` is NOT dropped — it has a live read+write (the Calendar add-event feature); "0 rows" just means no event added yet. `cv_templates` needs an FK/column drop on `applications` first. |
| **KEEP, unchanged** | Onboarding, Profile, Internship (gated), Admin (internal)                                                                                                                                                   | Each earns its place as-is.                                                                                                                                                                                                                                              |

### 4.5 The coach's role (the invariant that ties it all together)

The coach is an **operator ON these features**, not a feature beside them. The governing rule:

> **For every feature in §3, its coach-action mirrors its UI-action — the same operation, the
> same #490 resolution paths, the same governed prompt + full profile context.**

| Feature (UI action)                          | Coach action (same operation)                                   |
| -------------------------------------------- | --------------------------------------------------------------- |
| Career: add/remove target role, change track | `suggested_roadmap_changes`                                     |
| Career/job: track / update an application    | `suggested_application_actions`                                 |
| CV workspace: generate a tailored CV         | `suggested_cv_generation` (click-gated, single-fire, #489/#490) |
| CV workspace: targeted edit                  | `edit-cv` intent                                                |
| Profile: capture a bullet / add a skill      | `suggested_bullet_capture` / `suggested_add_skill`              |
| Story Bank: save an accomplishment           | `extract-story-from-text` / story-capture card                  |
| Internship: manage a company target          | `suggested_company_target_actions`                              |
| Skill gap: close it                          | skill-advice intent (folds in learning paths)                   |

Consequences this locks in:

- **The extension inherits this contract for free** (Arc 1): it's just another operator, so its
  fix is body-and-wiring only — not a bespoke second protocol. The investigation (Arc 1 report)
  sharpened the fabrication mechanism: the extension does **not** self-inject a prompt and its
  profile context is **not** empty — both hypotheses were wrong. It ships only
  `{message, agent, conversation_history, application_id?}`; the prompt and profile are 100%
  server-assembled. The real gap is **missing per-job grounding**: it never sends `page_context`
  and usually no `application_id`, so the _pasted job is never a scored entity_. The coach still
  holds the real roadmap's `Readiness: NN%` block, and `gpt-4o-mini` parrots that format onto the
  ungrounded posting — inventing the "92% readiness" and the false gap. The fix is therefore
  exactly this contract: attach `application_id` (resolve/create the app up front) so the server
  renders the real `TARGET APPLICATION` JD+scores block instead of the model hallucinating fit —
  same operation as the web, empty manifest permission-diff.
- **One resolution path, everywhere:** the coach P0 (`Generate CV` 400 on `application_id: null`)
  is a _contract_ fix — Generate-implies-application (#490) + `ensureApplicationHasJd` — applied
  once, honored by web dock, web page, and extension alike.

### 4.6 The minute-0-to-first-CV screenplay

_A brand-new user, no explanation, from signup to a downloaded CV. This is the walkthrough the
whole IA is optimized for — if it doesn't read effortlessly here, the structure is wrong._

> **0:00 — Signup.** Google OAuth or email. No dashboard yet — the sidebar stays hidden
> (Layout gates on `onboarding_complete`). One screen, one job: _begin._
>
> **0:10 — "Drop your CV."** A single dropzone (or "start from scratch"). She drops a PDF. The
> screen says, honestly, _"Reading your CV…"_ — not a fake multi-step bar. Parse populates
> experience, education, skills. (If it fails: _"We couldn't read that — add it by hand,"_ and
> the flow continues. Never a dead stop.)
>
> **0:40 — A few questions about direction.** Target role, goal, stage. Short. Each answer visibly
> shapes what comes next (no dead form fields).
>
> **1:00 — "Building your picture."** Career-analysis runs (~80s, named honestly, design-craft
> rule 9). The coach may ask one reality-check question while it works. She is _never_ staring at
> a spinner with no story.
>
> **2:20 — The payoff: her fit, warm.** Onboarding hands her — _not_ a generic Home — a screen
> that says _"Here's what you're realistic for,"_ with 2–3 matched roles (the _why_ shown as
> qualification and goal-alignment bars, plus matched/missing skills), and beside a real matched
> role, **one primary button: "Make a CV for this."** This is the whole product's hinge: fit → CV
> in one click.
>
> **2:25 — She clicks it.** The **CV workspace** opens with that role's JD + target pre-loaded.
> One click-gated _Generate_. Honest staged progress. The CV is written from her _real_ captured
> experience (anti-fab; Story Bank precedence if she has stories).
>
> **2:50 — Her CV.** Preview == download. She downloads it. The finished-CV card offers _"View in
> tracker"_ — and because Generate-implies-application (#490), the application already exists in
> her pipeline. She has, in under three minutes and with zero explanation, gone _who am I → what
> fit → a real CV for a real role → tracked._
>
> **Next.** Today now greets her with honest momentum ("1 CV made · 1 application saved · 12 live
> matches"), and the coach dock — always there — can run the next lap: _"Want a CV for the next
> role?"_ The loop is closed and she never had to learn the app to run it.

---

## 5. What this drives next

- **Arc 2 Step 1 (visual direction):** this spec fixes _structure_; Step 1 chooses the _values_
  (the `--rd-*` token set, a real type scale, motion) against these surfaces. The design-craft
  nine rules already govern both. The four primary surfaces (Today, Career, CV, Profile) + the
  coach dock are the canvas Step 1 paints.
- **Arc 1 (extension resubmit):** §4.5 is the extension's target contract. Its proposal should
  consume this doc: "operator on the same features, governed prompt, full context, #490
  resolution, empty permission-diff."
- **Arc 0 (cleanup, in flight):** this spec _depends on_ Arc 0 landing — the KILL/PARK column in
  §4.4 is the same set Arc 0 PRs #1–#2 remove, and the one-shared-alignment-gate (PR#3) is what
  lets §3.1.1's "never disagree with itself" hold.
- **Docs reconciliation:** when this lands, `docs/product/features.md`'s _structure_ (Tracker as
  separate; Tasks & Calendar as pages; Chat as four agents) is updated to match §4.2 in the same
  PR (docs-are-part-of-done).

---

_Deliverable for Arc 2 Step 0. Wireframe-level, structural. HELD for Eli's review before it
drives Step 1. Nothing here is a decision — it's a spec to redline._
