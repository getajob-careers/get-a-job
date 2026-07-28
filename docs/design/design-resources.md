---
owner: Eli
last_reviewed: 2026-07-21
purpose: Eli's curated design-research list — reach for these on any design work
---

# Design resources

Eli's curated research list for **any** design work in this repo (motion treatments, component design, visual direction, inspiration). When a design task needs a motion pattern, a component reference, an icon set, or visual direction, pull from here first before improvising. Grouped for scanning; every entry is verbatim from Eli's list.

Standing constraints that override anything found here: the **design-craft** skill's perf + palette rules apply, and any **new library must justify its bundle cost against what's already shipped** (rAF/CSS + `src/hooks/useCountUp.js`). Prefer CSS/rAF and the existing hook; add a dependency only when the effect genuinely can't be done with what's here.

## Motion discipline (ruled 2026-07-23)

Two systems, no more:

- **CSS** — simple loops and transitions: hovers, fades, single-property state changes, keyframe loops on one element. This is the default; reach for it first. Approved durations/easings live in the `design-craft` skill (150/200ms ease-out for UI transitions).
- **anime.js (v4, per-submodule imports)** — timelines and multi-part orchestration: anything sequencing several elements, staggers, synced parts (e.g. the mascot's forearm ticking in time with the screen glow), or a scripted arrival. Import from the submodule (`animejs/animation`, `animejs/timeline`, `animejs/utils`) not the root, to stay tree-shakeable (~16KB gz for the animate+timeline+stagger surface vs ~43KB for the whole lib). It is the **default orchestration tool** for upcoming motion work (mascot, onboarding sequences, CV-gen theater, marquee, arrival) — not a mascot one-off.

`prefers-reduced-motion: reduce` always resolves to a static end-state. Motion must be honest (design-craft rule 9): it illustrates real state, never fakes progress.

Retired from the note: **framer-motion** (being pruned in the audit-phase hygiene PR — CSS + anime.js cover its cases). **react-spring / GSAP / motion-primitives** stay out only because those two systems cover them; if a concrete case genuinely beats them, nominate it with the case (no standing ban). **Asset runtimes (Rive / Lottie / Spline)** are pre-approved the moment a concrete moment earns one (e.g. the mascot outgrowing SVG timelines) — install and state the case in the PR body.

## Motion / animation libraries (code)

- **motion.dev** — Motion (the successor to Framer Motion); declarative React motion + a smaller vanilla core.
- **gsap.com** — GSAP; timeline-based, imperative, framework-agnostic.
- **animejs.com** — anime.js; lightweight vanilla timeline/stagger engine.
- **react-spring.dev** — react-spring; spring-physics animation for React.
- **motion-primitives.com** — motion-primitives; copy-paste animated React components built on Motion.

## Component galleries

- **kokonut.ui / bklit ui (component galleries)**
- **reactbits.dev** — animated React component snippets (text/backgrounds/interactions).
- **supahero.io** — hero-section design references.

## Icon systems

- **iconsax**
- **flaticon-class icon systems**

## Animation & 3D tooling (no-code / asset)

- **jitter.video** — motion-design tool (After-Effects-style, web-native).
- **rive.app** — interactive, state-machine-driven animations; small runtime.
- **lottielab.com** — Lottie editor.
- **lottiefiles.com** — Lottie animation library + tooling.
- **spline.design** — 3D scenes for the web.

## Inspiration galleries & studios

- **godly.website** — curated web-design inspiration.
- **dribbble.com** — design shots.
- **opensesh.github.io** — design resource collection.
- **designspell**
- **manus.im**
- **selected**
- **javii**
- **faces.app**
- **kaikei**
- **kitti**
- **seostudios**
- **flectofy**
- **content core**
- **logo system**

## Typography, color & texture

- **freefaces.gallery** — free / open-license typefaces.
- **grainient.supply** — grainy gradient generator (exports).
