# Design-lane handoff (canvas redesign)

Snapshot for reopening the design lane fresh. Companion docs:
`docs/design/canvas-tokens.md` (the enforced token layer + scoped exceptions),
`docs/design/port-plan-input.md` (canvas↔production map), `docs/design/component-audit.md`.

## Working context

- **Worktree:** `/Users/elienglard/getajob-design`, branch **`eli/product-design-canvas`**.
- **Dev server:** `:5174`. **Preview:** `/_preview/home-3tab` (fixture-backed, `CANVAS_FIXTURES`).
- **PR:** #596 (DRAFT / held, base `yishai/homepage-3tab-demo`). Each step is one held commit, pushed.
- **Guardrail:** `node scripts/check-scale.mjs` (type/radius scale) — keep green.
- Discipline: one held step per change, scale+lint green, push, before/afters where capturable. Desktop-only surfaces (sidebar toolkit rail, logo header) → Eli is the eyeball.

## LOCKED decisions ledger

- **Palette:** **Clay** — warm putty surface + terracotta primary + teal accent (`palette.js`, applied to documentElement). Single palette; hue/field/palette explorations all rejected. Dusk tokens kept in `_graveyard.js`.
- **Constraints (token layer, non-negotiable):** ring low-fill floor (`ring.js`); fit-badge AA floor (every band `-dark` ≥4.5:1 on card AND its tint).
- **Type + radius scales:** `scale.css` (`rd-t-*` 7 steps, `rd-r-*` 4 steps + full) — the ONLY legal sizes/radii; `check-scale.mjs` enforces.
- **Elevation:** paper-lift house language (`elevation.css`: `rd-lift`, `rd-well`, `rd-press`); borders reserved for insets.
- **Score ring:** **sheen arc** (variant A) — one gradient arc + ghost track + number; 3-axis breakdown in the hover legend. Coin/beaded variants + switcher ripped.
- **Job card:** locked, loved (paper-lift, spotlight glow JOB-CARDS-ONLY, sheen ring, hover-action slide).
- **Toolkit rail:** the sidebar rail = the TOOLKIT (Interview coach, Skill hub, Profile, LinkedIn, CV bank, Story bank, Tasks) — dropped Browse/Tracker/CV (tabs own those). Tiles are distinct colored soft-3D OBJECTS (not cards), per-tool tints (`toolColors.js`) + LinkedIn brand blue — a scoped exception (canvas-tokens.md). **Layout = CAROUSEL** (grid variant + switcher ripped): wheel/trackpad scroll, `overscroll-behavior-x: contain` (no page-swipe), edge chevrons + peek, portaled descriptor tooltips.
- **Story bank icon:** **rosette** (award/medal + ribbon + star; star pops on hover). Book/starred-stack/quote/brain/jar explorations dropped.
- **Top third:** **A** — utility bar (logo left, search/settings/avatar right) + segmented-pill tabs, no greeting. B/`?top` removed.
- **Coach ergonomics:** shipped + approved — stream-aware scroll (pin-while-streaming, stop on scroll-up, "↓ latest"), auto-grow textarea, `body-m` bubbles, expand-to-wide overlay.
- **Logo colorway:** **Clay** confirmed (terracotta/ink). Blue is reference only (`?logo=blue`).
- **Polish tier:** done — animated tab indicator (superseded by the segmented pill), button press states, lifted coach bubbles, funnel ring bump.

## PENDING Eli decisions (open)

1. **Logo mark A/B** — full desk-person: **A (no chair, sharpened)** vs **B (chair)**, at `?logo=lab` (Browse tab). My lean: A (cleaner; chair back-post competes with the A-legs). Header already uses the simplified A (size split: simple ≤40px, full mark for large). Once picked, set the default full mark + rip `CanvasLogoLab` + `?logo=lab`.
2. **Roadmap placement** — mock at `?roadmap=lab`. Three options in the report: (1) Tracker right rail [my rec], (2) CV tab headlining Top Matches, (3) owned by Skill hub. **Also needs a clarification:** does "Your matched roles" mean the Top-Matches (jobs) panel on the CV tab, or a distinct career-roles panel? That decides beside-vs-absorb. Once decided → build as a held step; rip `CanvasRoadmapMock` + `?roadmap=lab`.

## PARKED: page-port round (do not start until rounds above are approved)

Move the remaining pages onto the new system (Clay tokens, scales, elevation, buttons, chips, card language): **Profile, Story bank, CV bank, LinkedIn tools, Settings, …**. Approach: propose the **page order + per-page approach first**, then **one held step per page**, same discipline. See `port-plan-input.md` for the canvas↔prod map + suggested global port order (tokens in `index.css` first → constraints → components → toolkit/IA).

## Active exploration labs still mounted (rip when their decision lands)

- `?logo=lab` (logo A/B + size split) · `?logo=blue` (colorway ref)
- `?roadmap=lab` (roadmap placement mock)
  All other `?param` labs/switchers (ring, hue, field, palette, story, top, layout) are already removed.
