---
owner: eli
last_reviewed: 2026-07-22
code_paths:
  - src/index.css
  - tailwind.config.js
  - src/components/redesign/DepthField.jsx
  - src/components/redesign/GrainGround.jsx
  - src/components/redesign/shell/CanvasShell.jsx
  - src/pages/Home.jsx
  - src/pages/OnboardingV2.jsx
  - docs/design/canvas-tokens.md
---

# Phase 2 — canvas visual layer + the arrival payoff

**Owning terminal:** this arc. Held-PR protocol throughout; nothing builds ahead of
its slice's review. Rulings below are Eli's (2026-07-22), recorded verbatim in intent.

Phase 2 dials the flag-on canvas from "assembled" to "alive" and lands the product's
true payoff — arriving on Home with the master CV built and matches live. It is a
visual/interaction layer on top of the existing flag-on shell; **flag-off stays
byte-identical** and every slice is token-level or additive.

## Slice order (ruled)

0. **Token rename** — `rd-coral*` → `rd-primary*` (mechanical, zero value change). FIRST.
1. **Ground dial** — living dot-grid ground, dialed so white cards lift.
2. **Arrival moment** — the Home first-landing entrance on `?welcome=1`.
3. **CV RED Phase 2** — the next surface slices after #659's Phase 1.
4. **Tab consistency** — Tracker / Jobs brought onto the canvas house language.
5. **Motion polish** + **reveal readiness**.

**Out of scope for this terminal (CV lane owns):** onboarding review-screen persistence,
springboard, the new-signups rollout flag flip, and the `primary_domain_source='extracted'`
provenance stamp (already logged as a contract on PR #675). Do not build these here.

---

## Slice 0 — token rename `rd-coral` → `rd-primary` (mechanical)

**Why (Eli's ruling):** a color name can lie; a role name cannot. `--rd-coral` maps to
`#60617D` (slate-blue) in the reveal palette and `#D6421F` (true coral) only in the
retired flag-off default — so "coral" is actively wrong on the canvas. Rename by **role**.

- Target token: `--rd-primary` / `--rd-primary-dark` / `--rd-primary-tint`.
- Utilities: `rd-primary` / `rd-primary-dark` / `rd-primary-tint` (i.e. `bg-rd-primary`, `text-rd-primary`, …).
- **Zero value changes.** Both `:root` blocks keep their exact hexes under the new name.
- Grep-sweep **every** `rd-coral` reference across `src/`, `tailwind.config.js`, and `docs/`.
- `docs/design/canvas-tokens.md`: record **`#60617D` as the canvas primary**; **`#D6421F` retired**.
- One held PR; nothing else builds until it is reviewed.

Mechanically: the literal string `rd-coral` is a clean prefix, so a global `rd-coral → rd-primary`
substitution correctly rewrites `--rd-coral`, `bg-rd-coral`, `rd-coral-dark`, `rd-coral-tint`
in one pass. The only extra edit is the Tailwind config **keys** (`coral:` / `coral-dark:` /
`coral-tint:` → `primary*`), which aren't `rd-`-prefixed.

---

## Slice 1 — ground texture (ROUND 2: baked paper grain)

> **2026-07-22 ruling — supersedes the DOTS portion of "Option 1" below.** Round 1's
> dialed dot-grain variants (#678) were **all rejected** and the **dot direction is
> retired**: dots read as a dirty screen, not paper. New target: the ground should feel
> like the canvas grain did _before_ the feTurbulence retirement — fine organic **paper
> fiber** — reached WITHOUT runtime feTurbulence. This retires "dots crisp / 'grain' =
> the dot-grid texture only." The separate **Living** (blob drift) and **Lift** axes are
> unaffected by this ruling.
>
> **Round-2 approach (this branch):** render turbulence-style fractal noise ONCE into a
> small seamless grayscale tile (`scripts/gen-canvas-grain.mjs` → `canvas-grain.png`,
> 128px, ~15KB) and tile it as a static `background-image`. At runtime the browser only
> blits a bitmap — **no feTurbulence is evaluated** (the 2026-07-18 retirement stands).
> The tile is laid with `mix-blend-mode: soft-light` (mean-preserving), so it modulates
> the cream WITHOUT greying it — the exact defect that retired the old multiply grain.
> The ground is **fixed**, so the tile never moves on scroll (no shimmer).
>
> **Bake-off** at `/_preview/canvas-ground`: three variants — a completely **flat**
> untextured ground (the control: does grain earn its place at all?), grain **faint**
> (soft-light @ 0.5), grain **present** (soft-light @ 0.85). HELD for Eli's eye. The
> winner becomes a token-level ground treatment replacing the `GrainGround` dot grid on
> the flag-on canvas.
>
> **Tradeoffs surfaced:** ~15KB grayscale PNG (co-located Vite asset, not a giant inline
> data-URI); fine grain makes tile repeats invisible without stitching; HiDPI softens the
> tile slightly (fine for grain; the fixed ground removes scroll moire); `mix-blend-mode`
> composites correctly in the preview's own stacking context — the production port into
> the `-z-10` isolate shell must **re-verify the blend** (or bake a normal-composite tile)
> per the graveyard notes in `canvas-tokens.md`.

### Round 1 (SUPERSEDED — dots retired, kept for history)

The flag-on shell already renders two static `-z-10` ground layers: `DepthField` (cream
`--rd-field` base + two large blurred colour blobs) and `GrainGround` (a dot-grid in the
line tone). The bones are right; it reads flat. Eli's original (superseded) ruling named two axes:

- **Living** — the two `DepthField` colour blobs drift slowly (40–60s loops, ~20–30px),
  `prefers-reduced-motion` → **fully static**. **Dots stay crisp** (no motion on the grid).
- **Lift** — deepen `--rd-field` one warm step + nudge dot contrast + strengthen `.rd-lift`'s
  mid-shadow so white (`--rd-bg-card`) cards read as floating paper, not flush panels.

**No `feTurbulence` grain.** The 2026-07-18 retirement (grain greyed the cream) stands;
"grain" here means the dot-grid texture only.

**Build shape:** token-level, flag-on only. **Nominate 2–3 dialed variants on a `/_preview`
route for Eli's eye (bake-off pattern)** — do not ship a single guess. Variants differ only
in the dialed token values (field depth, dot contrast, drift amplitude, lift shadow), so the
winner is a token set, not a rewrite.

---

## Slice 2 — the arrival moment (choreography spec; accepted)

**Contract (cross-lane, Home-owned):** onboarding V2 navigates to `/Home?welcome=1` on
completion (already wired in `OnboardingV2`). Home plays a populated first-landing entrance
when it sees the signal, and **no-ops gracefully** when the handler/flag is absent — `?welcome=1`
is just a query param, so if the entrance code isn't there Home renders normally and ignores it.

**Data-readiness (accepted):** the payoff is "matches live," but career-analysis may still be
computing on first landing (Home already has a 45s self-heal). So:

1. On `?welcome=1` + canvas flag on, Home enters an entrance state.
2. It waits — **bounded** (~8–10s, on the existing profile/roles/matches queries) — for the
   payoff data (master CV present + `liveMatches` resolved), showing a quiet "setting up your
   matches" state, **not** a celebration.
3. If data lands in the window → play the entrance. If it doesn't → **degrade to the normal
   Home** (no celebratory empty screen). Either way the param is stripped.

**Choreography (when ready), staggered; `prefers-reduced-motion` → instant, no motion:**

| t (ms) | beat                                                                                |
| ------ | ----------------------------------------------------------------------------------- |
| 0      | greeting rises in — "You're all set, {name}."                                       |
| ~150   | CV-ready focus card reveals — "Your master CV is ready."                            |
| ~300   | the three stat numbers **count up** (zero-dep `useCountUp`); matches animates to N  |
| ~450   | plan / pipeline cards rise in with a small stagger                                  |
| ~700   | settle: one-time subtle `--rd-primary`-tinted glow on the matches tile, then normal |

Total ≈ 700–900ms. Zero-dep (`useCountUp` + CSS transitions); no new animation library.

**Param strip:** after the entrance fires once, `navigate('/Home', {replace:true})` so a
refresh/back never replays it.

---

## Decision log

- **2026-07-22 (round 2)** — Ground **dot direction retired**: the #678 dot-grain bake-off
  was rejected wholesale (dots read as a dirty screen, not paper). This **supersedes the dots
  portion of the Option 1 ruling below** ("dots crisp / grain = the dot-grid texture only").
  New target: fine organic paper fiber like the pre-retirement grain, reached via a
  turbulence tile baked **once** to a static image (no runtime feTurbulence, which stays
  retired) and laid `soft-light` so it does not grey the cream. Bake-off at
  `/_preview/canvas-ground` — flat control + faint + present — HELD for Eli's eye. Drift/Lift
  axes unaffected.
- **2026-07-22** — ~~Ground fork ruled **Option 1** (ambient drift + dial lift): dots crisp,
  `feTurbulence` retirement stands.~~ **Dots superseded by round-2 above**; the Living
  (blob drift) + Lift halves stand. token-level, flag-on only, 40–60s loops,
  `prefers-reduced-motion` fully static. Present 2–3 dialed variants on a preview before
  wiring the canvas.
- **2026-07-22** — Token rename ruled **first slice**: `rd-coral*` → `rd-primary*`, role-named,
  zero value change. `#60617D` = canvas primary; `#D6421F` retired.
- **2026-07-22** — Arrival-moment plan **accepted as specced**, including the bounded wait that
  degrades to the normal Home rather than a celebratory empty screen.
- **2026-07-22** — Queue correction: onboarding review persistence / springboard / rollout flip
  are **CV-lane** scope, not this terminal's.
