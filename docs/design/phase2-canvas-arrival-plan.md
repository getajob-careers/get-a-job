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

## Slice 1 — ground texture (ROUND 3: smooth tonal, or nothing)

> **2026-07-22 ruling — PARTICULATE TEXTURE RETIRED AT THE CATEGORY LEVEL.** Rounds 1
> (dots, #678) and 2 (baked paper grain) were BOTH rejected the same way: Eli's eye reads
> any high-frequency speckle as a dirty screen. Standing rule: **no dots, no grain, no
> speckle, no particulate texture on the ground, EVER.** This supersedes the "Option 1
> dots" ruling at the category level. The round-2 `mix-blend-mode: soft-light` finding
> (mean-preserving, does not grey the cream) **stays valid and carries forward to anything
> tonal**.
>
> **Round-3 direction (this branch):** if the ground earns any treatment it must be SMOOTH
> and low-frequency — tonal, not textural. `/_preview/canvas-ground` reworked to a **flat**
> control that is now a **live candidate** (two rejections mean "nothing" may be the right
> answer; the variants compete against flat, not against each other) plus three smooth
> variants:
>
> - **Warm mottle** — large, heavily-blurred warm colour blobs (the `DepthField` family,
>   static): cloud-like tonal depth, zero particles.
> - **Edge wash** — a soft radial vignette; cream deepens warm toward the edges, centre
>   breathes.
> - **Directional wash** — a gentle diagonal, one corner slightly deeper.
>
> **Bar:** cream stays WARM (deepen toward warm tones, never grey; mean-preserving blends
> where blending at all); white cards lift; the ground is **fixed** so nothing shimmers on
> scroll; and **no visible banding** — dither-free gradients on cream can band, banding is
> speckle's cousin and equally disqualifying, so the washes are kept low-amplitude +
> large-scale and must be checked on a real display. **No dither** (dither is speckle).
> HELD for Eli's eye. The winner — or flat — becomes the token-level ground; the retired
> dot grid (`GrainGround`) comes out when it ships.
>
> **Round 2 (rejected, kept for history):** turbulence noise baked once into a 128px
> grayscale tile, laid `soft-light` (no runtime feTurbulence). Rejected as particulate. Its
> generator (`scripts/gen-canvas-grain.mjs`) + tile were removed when the category was
> retired; the soft-light finding survives.

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

- **2026-07-22 (round 3)** — **Particulate texture retired at the CATEGORY level.** Round 2's
  baked paper grain was rejected too — same failure as dots (reads as a dirty screen). Standing
  rule: no dots, no grain, no speckle, no particulate ground texture, ever. Round 3 = smooth
  low-frequency tonal only (warm mottle / edge wash / directional wash) against a flat control
  that is now a **live candidate**; banding is disqualifying (speckle's cousin), no dither. The
  soft-light mean-preserving finding carries forward to anything tonal. HELD for Eli's eye.
- **2026-07-22 (round 2, SUPERSEDED by round 3)** — Ground **dot direction retired**: the #678 dot-grain bake-off
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
