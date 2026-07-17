# Colour amplitude — proposal (2026-07-17)

**Status: PROPOSAL. Nothing built yet; awaiting Eli's scope pick.**
Trigger: the round-5 flip session **failed** — all five candidates read nearly
identical and the product felt plain. Eli's diagnosis: the palettes only differ on
a sliver of pixels, so no palette _can_ feel different, and the fix is not a sixth
candidate but expanding **where colour lives**.

## The diagnosis is confirmed, and understated

Measured on the real fixture canvas (CV tab, identical view, 1041×1148 =
1.195M px), Clay vs Yishai:

| Measure                            | Result   |
| ---------------------------------- | -------- |
| Pixels with ANY visible change     | 22.1%    |
| Pixels with a STRONG change (Δ>60) | **3.0%** |
| Pixels with a real chroma shift    | **2.0%** |

Chroma profile of the screen itself:

| Band                | Clay      | Yishai   |
| ------------------- | --------- | -------- |
| neutral (chroma <8) | **75.0%** | 71.6%    |
| faint (8–25)        | 22.6%     | 23.5%    |
| real colour (25–60) | 0.7%      | 4.8%     |
| saturated (>60)     | 1.6%      | **0.0%** |

**~97.6% of the screen is neutral or near-neutral.** Eli estimated ~10% of pixels
carry the palette; it is **2–3%**. Yishai has _zero_ saturated pixels. Swapping
every accent, the primary, the ink and the page moves 3% of the screen. The flip
session could not have succeeded.

## The mechanical root cause (not a taste problem)

1. **`--rd-bg-card: #FFFFFF` is byte-identical in all five candidates**
   (`palette.js:37,83,117,153,206`). Cards are the dominant surface of every
   screen, and they are palette-**invariant by construction**. No palette can
   express itself on the biggest thing on screen.
2. **There is no dark-surface token at all** — zero `bg-ink`/`bg-dark`. This is
   exactly the gap against Eli's reference: Yishai's mock felt colourful because
   its **dark DropSection + colour blocks** gave the palette large surfaces to
   live on. Ours gives it chips, a ring, and a button.

Amplitude ≈ **area × chroma**. Today the palette is spent almost entirely on
small-area elements. That is the whole bug.

## Where colour CAN live — levers ranked by area × chroma

| #   | Lever                                | Area   | Δ chroma | Risk                                            |
| --- | ------------------------------------ | ------ | -------- | ----------------------------------------------- |
| L1  | **Card surface** — tint per palette  | huge   | high     | **AA on every card text**; elevation contrast   |
| L2  | **A dark surface** (DropSection kin) | large  | highest  | **inverts AA** (light-on-dark); new audit check |
| L3  | **Kanban column bodies**             | large  | med-high | band legibility; 7 columns at once = loud       |
| L4  | **Coach panel owns a hue**           | medium | high     | it is a reading surface; long-text AA           |
| L5  | **Band presence on job cards**       | medium | med      | must not outshout the score ring                |
| L6  | **Panel / section headers**          | medium | med      | cheap, low risk                                 |
| L7  | **Funnel + roadmap bar fills**       | small  | med      | honest-UI: fills must stay data-true            |
| L8  | **Page background**                  | huge   | low      | already tinted; little headroom without murk    |

**L1 and L2 are the whole game.** L5–L7 are where the current design already
spends colour, and is why the flip failed: they are ~3% of pixels.

## The amplitude ladder (what I'd build)

One ensemble — **Yishai** — at three levels behind `?amp=subtle|medium|bold`, so
Eli picks **how colourful the product is**, not which hue. Clay-at-amplitude is a
fast follow once a level is chosen (the levers are token-level, not per-palette).

- **SUBTLE** — L6 + L5 + a faint card tint. Cards stop being pure white; section
  headers and card band-strips carry the family. Target real-chroma **8–12%**.
- **MEDIUM** — + L1 at full tint, L4 (coach panel owns a hue), L3 (kanban columns
  carry real band colour), L7 richer fills. Target **15–20%**.
- **BOLD** — + **L2: a genuine dark ink surface** (the DropSection analogue — the
  candidates are the coach panel or the CV header block), stronger CTAs, bands at
  full strength. Target **25–30%**.

Each level is **measured, not vibed**: the same chroma profiler above reports each
level's real-chroma %, so "bold" is a number we agreed on, not an argument.

## What stays locked (non-negotiable)

- **AA floors.** `scripts/audit-palettes.mjs` already reads `--rd-bg-card`, so
  tinting cards is covered automatically — every band `-dark` and text token gets
  re-checked against the new surface. **L2 needs a NEW check the audit does not
  have**: light-text-on-ink (the inverse direction). I would add it before
  building bold, not after.
- **Hierarchy rules**, the ring low-fill floor, the type/radius scale, the
  paper-lift elevation language, honest UI (L7 fills stay data-true).
- **The logotype** (Archivo 700 + optical spacing) survives all of it; only its
  colourway tracks the palette.

## Known costs, stated before building

- **Tinting cards narrows card-vs-page contrast**, which is exactly what the
  paper-lift elevation language leans on. Elevation may need re-tuning at MEDIUM+.
  This is a real, foreseeable cost, not a surprise.
- **Port risk (feasibility-first):** `--rd-bg-card` is consumed across the REAL
  product via `index.css`, not just the canvas. The canvas overrides it on
  `documentElement`, so this round stays fixture-gated and ships nothing — but if
  an amplitude level is adopted, real components that assume a white card become
  the port's problem. Naming it now.
- **AA gets harder, not easier**, as amplitude rises. Some current band `-dark`
  values will need re-derivation against a tinted card. Expect token churn.

## Open questions for Eli

1. **Ladder scope** — build all three levels, or SUBTLE+BOLD only (the two ends
   read the difference fastest; MEDIUM is interpolation)?
2. **Where does the dark block go at BOLD?** The **coach panel** (it is a distinct
   surface and Eli already floated it owning a hue) or the **CV header block** (a
   closer analogue to Yishai's DropSection — a hero-ish band at the top)?
3. **Does the ensemble stay Yishai only**, or should SUBTLE/MEDIUM/BOLD also
   render under Clay, so the amplitude decision is not silently a palette decision
   too? (Recommend: Yishai only first, then re-flip the field at the chosen
   amplitude — otherwise it is a 15-cell matrix and no one can hold it.)
