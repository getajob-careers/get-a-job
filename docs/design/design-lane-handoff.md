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

- **Palette:** **YISHAI — CROWNED (2026-07-17), THE system.** Brown ink + **greige ground** `#EBE8E1` + blue primary + mauve secondary, with the always-on **MEDIUM** treatment (tinted card, mauve-forward kanban, coach tint). Clay/Heather/Moss/Pewter retired to `_graveyard.js`; the switcher is deleted; no palette/amp param — the canvas is the crowned look by default. Full record in `canvas-tokens.md`. Open refinement: the **ground texture** toggle (`?texture=grain|gradient|dots`) awaits Eli's pick.
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

1. **GROUND TEXTURE — pick one** (`?texture=grain|gradient|dots`, the pinned
   Texture toggle). The crowned greige ground reads a touch flat at full-page
   scale; the toggle adds subtle, port-safe (CSS-only, no image asset) texture:
   **grain** (SVG feTurbulence paper noise, low opacity), **gradient** (a
   barely-there tonal wash, brighter high-centre), **dots** (a micro ink-dot grid).
   All are static, painted BEHIND cards on the `-z-10` field layer (so they can't
   touch text AA or card-vs-ground elevation). Each has an **intensity control**
   (1× / 3× / 6×, `?tex_x=`) to find the "felt not seen" ceiling. **PENDING Eli's
   pick**, then rip the toggle + keep the winner as the default ground treatment.
   - **BUG FIXED (2026-07-17):** the texture (and the whole CanvasField depth
     field) were INVISIBLE — the shell was `position:relative` but not a stacking
     context, so the `-z-10` layers escaped upward and painted behind the opaque
     Layout `<main>` bg. `overflow-hidden` does NOT create a stacking context
     (contrary to CanvasField's original note). Fix: `isolate` on the shell. This
     also restored the depth field, which is part of why the ground read flat.
   - The palette/amplitude arc that led here is DONE and recorded in
     `canvas-tokens.md` (YISHAI crowned; medium + greige locked; losers +
     switcher ripped). History: `color-amplitude-proposal.md`.
2. **Roadmap = the real "Your matched roles" panel** (`Career.jsx` / TopMatchesPanel): roles list, per-role tier badge, two-axis bars, skill chips, expand. LOCKED that this IS the roadmap surface, on the Browse right rail. Elevated (craft-pass) restyle is built at `?roadmap=lab` and shown; **pending Eli's eye**, then integrate into the Browse right rail (two-column) + rip `CanvasRoadmapMock` + `?roadmap=lab`.

## PARKED: page-port round (do not start until rounds above are approved)

Move the remaining pages onto the new system (Clay tokens, scales, elevation, buttons, chips, card language): **Profile, Story bank, CV bank, LinkedIn tools, Settings, …**. Approach: propose the **page order + per-page approach first**, then **one held step per page**, same discipline. See `port-plan-input.md` for the canvas↔prod map + suggested global port order (tokens in `index.css` first → constraints → components → toolkit/IA).

**Sidebar IA orphans (decided, for this round):** **Internship = trash**, **Today = trash**, **Chat = a toolkit tool** (built + locked). **Mobile coach surface** is in scope here: the Chat tile expands the coach dock on desktop, but the mobile bottom-rail Chat has no dock to open - design the mobile coach surface as part of the port.

## Active exploration labs still mounted (rip when their decision lands)

- `?texture=grain|gradient|dots` (**ground-texture toggle**, pinned; rip on Eli's pick, keep the winner as the default ground)
- `?logo=blue` (colorway ref only; the `?logo=lab` A/B lab is removed - logo locked)
- (RIPPED: `?palette=` + the switcher, and `?amp=` — Yishai crowned, medium + greige locked as the default)
- `?roadmap=lab` (elevated matched-roles panel; rip on integration)
  All other `?param` labs/switchers (ring, hue, field, palette, story, top, layout) are already removed.
