# Design-lane handoff (canvas redesign)

Snapshot for reopening the design lane fresh. Companion docs:
`docs/design/canvas-tokens.md` (the enforced token layer + scoped exceptions),
`docs/design/port-plan-input.md` (canvas↔production map), `docs/design/component-audit.md`,
`docs/design/feasibility-audit.md` (per-surface backend reality + port work-list).

## STANDING RULE - feasibility-first

Before designing ANY surface or capability, **read the real implementation**
(component, data shape, backend endpoint/table) and state in one line what exists
vs what the design assumes. Every proposal to Eli carries a **backend reality**
line: **SUPPORTED AS-IS** / **NEEDS BACKEND WORK** (named) / **FICTION** (flagged).
**Fixtures mirror real data shapes, never invented ones.** Restyle the real thing;
never reinterpret a surface from its name (the roadmap-round lesson, generalized).
Full per-surface audit: `docs/design/feasibility-audit.md`.

## Working context

- **Worktree:** `/Users/elienglard/getajob-design`, branch **`eli/product-design-canvas`**.
- **Dev server:** `:5174`. **Preview:** `/_preview/home-3tab` (fixture-backed, `CANVAS_FIXTURES`).
- **PR:** #596 (DRAFT / held, base `yishai/homepage-3tab-demo`). Each step is one held commit, pushed.
- **Guardrail:** `node scripts/check-scale.mjs` (type/radius scale) — keep green.
- Discipline: one held step per change, scale+lint green, push, before/afters where capturable. Desktop-only surfaces (sidebar toolkit rail, logo header) → Eli is the eyeball.

## LOCKED decisions ledger

- **Palette:** **Clay** — warm putty surface + terracotta primary + teal accent (`palette.js`, applied to documentElement). **RE-OPENED (round 5, 2026-07-17)** — Clay remains the incumbent + default and is still adopted, but a challenger field is live behind `?palette=` (Yishai / Heather / Moss / Pewter) pending Eli's flip session; see PENDING #1. **"Single palette" still holds** — the round crowns exactly one winner, it does not licence a second. Dusk tokens kept in `_graveyard.js`.
  - **AA is enforced, not asserted:** `scripts/audit-palettes.mjs` gates every candidate (24 tokens; band `-dark` ≥4.5:1 on card AND own tint; text ≥4.5:1 on card AND page). It caught a real bug in the ADOPTED palette — Clay's eyebrow was 4.45:1 on page, now #7A6845.
- **Constraints (token layer, non-negotiable):** ring low-fill floor (`ring.js`); fit-badge AA floor (every band `-dark` ≥4.5:1 on card AND its tint).
- **Type + radius scales:** `scale.css` (`rd-t-*` 7 steps, `rd-r-*` 4 steps + full) — the ONLY legal sizes/radii; `check-scale.mjs` enforces.
- **Elevation:** paper-lift house language (`elevation.css`: `rd-lift`, `rd-well`, `rd-press`); borders reserved for insets.
- **Score ring:** **sheen arc** (variant A) — one gradient arc + ghost track + number; 3-axis breakdown in the hover legend. Coin/beaded variants + switcher ripped.
- **Job card:** locked, loved (paper-lift, spotlight glow JOB-CARDS-ONLY, sheen ring, hover-action slide).
- **Toolkit rail:** the sidebar rail = the TOOLKIT (Interview coach, Skill hub, Profile, LinkedIn, CV bank, Story bank, Tasks) — dropped Browse/Tracker/CV (tabs own those). Tiles are distinct colored soft-3D OBJECTS (not cards), per-tool tints (`toolColors.js`) + LinkedIn brand blue — a scoped exception (canvas-tokens.md). **Layout = CAROUSEL** (grid variant + switcher ripped): wheel/trackpad scroll, `overscroll-behavior-x: contain` (no page-swipe), edge chevrons + peek, portaled descriptor tooltips.
- **Story bank icon:** **rosette** (award/medal + ribbon + star; star pops on hover). Book/starred-stack/quote/brain/jar explorations dropped.
- **Top third:** **A** — utility bar (logo left, search/settings/avatar right) + segmented-pill tabs, no greeting. B/`?top` removed.
- **Coach ergonomics:** shipped + approved — stream-aware scroll (pin-while-streaming, stop on scroll-up, "↓ latest"), auto-grow textarea, `body-m` bubbles, expand-to-wide overlay.
- **Logo:** **LOCKED.** One official mark at every size (no size split): the full desk-person + chair ("B") in the **toolkit-object material** (top-lit glaze + warm weight-shadow), header included. Clay colorway (terracotta/ink); blue is reference only (`?logo=blue`). Recorded in `canvas-tokens.md`; `?logo=lab` ripped. Simplified-A / no-chair / detailed-chair explorations rejected.
- **Logotype:** **LOCKED.** Mark + **Archivo 700** words + **asymmetric optical
  spacing** (`0.05em` left, **`-0.05em`** right - the mark's sloping right leg and
  Archivo's cap-J upper-left void compound into a hole that equal margins read as
  a gap). Tuned by eye at 28px in the real header. Archivo is the **logotype face
  only**, loaded at weight 700 only in `index.html`; nothing else may set it.
  Rokkitt 800 / Rokkitt 500-tracked were the free alternatives, rejected; the +1
  font family is the accepted cost. Full record in `canvas-tokens.md`; single
  source = `LOGOTYPE` in `CanvasLogo.jsx`; `?wordmark=lab` ripped.
  **CAVEAT: the TYPEFACE + spacing are locked; the mark's COLORWAY is not.** The
  palette round (PENDING #1) can re-open the material — a cool-primary winner
  turns the mark blue. The glaze highlight is now the `--rd-logo-hi` token, so the
  mark re-tints with whichever palette wins; Archivo 700 and the optical spacing
  survive any palette outcome. Re-tune the spacing only if the MARK or SIZE moves.
- **Chat history:** **DECIDED (option B)** - history lives in the **EXPANDED coach
  only**, dock stays as locked; restyle the REAL `ChatInterface` picker into Clay,
  render only when `conversations.length > 1`. Must **scale gracefully** if thread
  counts grow (Eli: today's max-2 may be a symptom of the buried UI, not of
  demand - so no search/grouping now, but don't paint into a corner).
  `deleteConversation` is **named port-round work**. See
  `docs/design/chat-history-proposal.md`.
- **Chat tool:** **LOCKED.** 8th toolkit tile (2nd slot): two-bubble dialogue object in heather violet (`toolColors.js`), typing-dots beat. Opens the SAME coach conversation expanded (the dock is the general coach; Interview coach is the separate prep tool). Mobile coach surface deferred to the port round.
- **Polish tier:** done — animated tab indicator (superseded by the segmented pill), button press states, lifted coach bubbles, funnel ring bump.

## PENDING Eli decisions (open)

1. **PALETTE FLIP SESSION — the whole field, one switcher** (`?palette=`, pinned
   bottom-centre). Field: **Clay** (incumbent) / **Yishai** / Heather / Moss /
   Pewter. Clay stays adopted until a challenger is crowned. Nothing ships from
   this round, and **`LandingV2Preview` (LIVE at `/`) is untouched** — the lab only
   sets CSS vars on `documentElement` from the fixture-gated preview route.

   **How to run it:** flip on the **Browse** tab (job cards + rings + bands are the
   densest read), then **CV** (long-form ink on page), then the **toolkit rail**
   (wide viewport — the tool objects are where a family either coheres or falls
   apart). Judge in that order; the header logo re-tints live with each flip.

   **What crowning Yishai costs (the deliberate price, not a surprise):**
   - **The logotype re-opens.** Blue primary ⇒ the just-locked coral mark goes
     blue. Now visible: `--rd-logo-hi` makes the mark follow the palette.
   - **Tasks' tile loses its slate** — it collides with the blue primary, so Tasks
     is displaced to the mock's brown (same price Pewter pays).
   - **Chat's LOCKED heather violet is a watchpoint** — it sits near the blue
     primary. Deliberately NOT moved: surrendering a locked decision is Eli's call,
     not a silent absorption. **This needs your eye at the rail.**
   - **The stretch band is invented** (`#9C7A46`). It is not in Yishai's mock and
     never appeared in it, because a landing page never shows three bands at once.
     If Yishai wins, that ochre is a real brand decision you have not yet made.
   - The mock is a **landing** artifact being judged as a **product** palette: it
     was composed for one hero screen, not for a dense kanban, 9 job cards, and 8
     tool objects. That is exactly what the flip session is for.

   **Guardrail:** `node scripts/audit-palettes.mjs` — 24 tokens per candidate,
   every band `-dark` ≥4.5:1 on card AND own tint, every text token ≥4.5:1 on card
   AND page. All five pass. It self-checks against Clay's recorded 5.48:1 worst
   band, so a broken contrast function fails loudly instead of silently passing.

2. **COLOUR AMPLITUDE — pick the rung** (`?amp=subtle|medium|bold`, Yishai-only,
   the switcher's Colour row). The round-5 flip failed because a palette swap moved
   only ~3% of pixels (`--rd-bg-card` was white in every candidate, no dark
   surface). Amplitude fixes WHERE colour lives. **SUBTLE is the floor** (a bare
   `?palette=yishai` loads at subtle). Built + measured; full write-up
   `docs/design/color-amplitude-proposal.md`.
   - **How to judge:** Browse first as always — but **medium vs subtle only shows
     on Tracker + the coach** (medium's distinct levers are the kanban column
     washes + the coach owning a tint; on CV/Browse they're off-surface). Bold is a
     different register (the dark CV-header block), visible everywhere.
   - **Rung feedback landed (2026-07-17), Yishai iterated:** (1) the BOLD dark CV
     header slab was killed — replaced by a bled-to-edge **mauve tint band** (light
     masthead, ink text). (2) **Mauve-forward pass (STEP 1, no AA relaxation):**
     vivid `#9B7D8A` now appears AS ITSELF — filled mauve kanban headers (white
     large-bold labels riding the 3:1 floor via a 20px bump), mauve column-body
     washes, mauve deco. All non-text/large-bold; the 4.5 text floor is untouched
     (`audit-amplitude.mjs` gates it). STEP 2 (scoped relaxation) was NOT needed.
     (3) **Real company logos** on job cards (ported `CompanyLogo`: logo.dev →
     DuckDuckGo favicon → letter fallback; fixtures carry real domains). Chip
     containment = white tile + border, palette-independent (`canvas-tokens.md`).
   - **Then:** pick a rung → re-derive it for the whole palette field → **re-flip
     the field at that amplitude** (PENDING #1 resumes at the chosen rung).
   - **Gates:** `scripts/audit-amplitude.mjs` (AA on tinted cards + coach + the new
     light-on-ink CV-header check + the elevation invariant `L(card)>L(page)`),
     `scripts/profile-amplitude.py` (chroma coverage per rung). Elevation retune is
     recorded in `canvas-tokens.md`.
3. **Roadmap = the real "Your matched roles" panel** (`Career.jsx` / TopMatchesPanel): roles list, per-role tier badge, two-axis bars, skill chips, expand. LOCKED that this IS the roadmap surface, on the Browse right rail. Elevated (craft-pass) restyle is built at `?roadmap=lab` and shown; **pending Eli's eye**, then integrate into the Browse right rail (two-column) + rip `CanvasRoadmapMock` + `?roadmap=lab`.

## PARKED: page-port round (do not start until rounds above are approved)

Move the remaining pages onto the new system (Clay tokens, scales, elevation, buttons, chips, card language): **Profile, Story bank, CV bank, LinkedIn tools, Settings, …**. Approach: propose the **page order + per-page approach first**, then **one held step per page**, same discipline. See `port-plan-input.md` for the canvas↔prod map + suggested global port order (tokens in `index.css` first → constraints → components → toolkit/IA).

**Sidebar IA orphans (decided, for this round):** **Internship = trash**, **Today = trash**, **Chat = a toolkit tool** (built + locked). **Mobile coach surface** is in scope here: the Chat tile expands the coach dock on desktop, but the mobile bottom-rail Chat has no dock to open - design the mobile coach surface as part of the port.

## Active exploration labs still mounted (rip when their decision lands)

- `?palette=` (**round-5 challenger field** + pinned switcher: clay / yishai / heather / moss / pewter; rip the losers when a winner is crowned)
- `?amp=subtle|medium|bold` (**colour-amplitude ladder**, Yishai-only; the switcher's Colour row. Rip the losing rungs when Eli picks one, then re-derive the chosen rung for the whole palette field)
- `?logo=blue` (colorway ref only; the `?logo=lab` A/B lab is removed - logo locked)
- `?roadmap=lab` (elevated matched-roles panel; rip on integration)
  All other `?param` labs/switchers (ring, hue, field, palette, story, top, layout) are already removed.
