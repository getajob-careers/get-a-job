# Get A Job — mascot character sheet: artist brief

**Status:** commissioned-sheet brief (drafted 2026-07-23). The in-house Round 1
redraw was ruled a MISS (motion/props/seating did not read; character appeal
missed). Per the ruled fallback, we are commissioning an external character
sheet. The A-frame concept STAYS and must be executed properly. This brief is the
handoff packet for the illustrator.

**One-line ask:** design and deliver a single, appealing, riggable brand mascot —
a young job-seeker seated at a desk that reads as the letter **A** — plus a pose
sheet and turnaround, built so we can cut it into separable parts and animate it
in the browser.

---

## 1. Who this is for (context the artist needs)

Get A Job is a career product for **business students entering the Israeli tech
market** — smart, early-career, a little nervous, aspirational. The mascot is the
product's face: he appears on the sign-up screen, in onboarding, on the marketing
landing page, and as an honest "working" indicator while the app does real work.
He should feel like **that user's slightly-more-confident friend** — warm,
capable, a touch bookish. Not a corporate blob, not a cartoon animal, not a
gradient-heavy 3D render. A flat, illustrated character with real charm.

The tone target: mid-century corporate-illustration warmth (think the reference
board), rendered in our own muted, earthy palette.

---

## 2. The visual language (reference board)

Four reference images ship alongside this brief in
`docs/design/mascot-reference/`. They are **DIRECTION, not the character** — we
want the _craft_, not the specific characters shown. Please study them:

- `01-character-quartet.webp` — **the core recipe.** Farmer / thief / doctor /
  old-man. Solid filled masses, big rounded heads, a **signature rounded rosy
  nose on every character**, minimal faces (dot/line eyes + heavy brows), chunky
  bodies with **small limbs**, personality carried by **posture + props**, a soft
  grain tooth inside the fills, a soft oval ground shadow, muted earthy palette.
- `02-monster-bicycle.webp` — the proportion + texture extreme: huge torso, tiny
  limbs, heavy chalk grain inside the mass, closed-happy eyes, a bead of sweat for
  character. Reference for exaggeration and material.
- `03-flat-face.webp` — the clean-flat pole: minimal features, subtle gradient on
  the skin, a studious young man in glasses. Reference for a clean face read when
  grain is dialled down.
- `04-diverse-lineup.webp` — mid-century corporate-flat businesspeople: this is
  **the audience**. Big noses, simple dot eyes, flat garment blocks, soft.

### The recipe — non-negotiable craft rules

1. **Big simple shapes.** The figure reads as a silhouette of solid masses, not an
   assembly of thin strokes. (This was the in-house attempt's core failure — it
   was a stroke skeleton and read lifeless.)
2. **Exaggerated proportions:** oversized head + chunky torso, **small limbs.**
3. **Personality via posture + props, not facial detail.** The mood is told by how
   he sits and what he holds, not by a rendered expression.
4. **Signature rounded rosy nose** — the charm anchor. Always present, on every
   pose.
5. **Minimal expressive face:** brows + dot eyes + a simple mouth, nothing more.
   **Glasses are on-brand** (our audience is studious) and are part of his
   identity — keep them on every pose.
6. **Soft grain tooth INSIDE the figure** — a subtle chalk texture on the masses,
   low-opacity, NOT TV static. This is the figure's own material. (We apply it in
   code as noise clipped to the fills; deliver clean flat fills PLUS a note of
   where grain should sit, or a separate grain layer — see §7.)
7. **Soft grounded shadow** — a soft oval under him; nobody floats.

### Silhouette + appeal test

- The figure must read as an **unmistakable silhouette** with all fills flattened
  to black — if the black shape is generic, the pose is too weak. Props (mug,
  laptop, held page) should break the silhouette on purpose.
- **One clear line of action** — a dominant curve from the base through the spine
  to the head. Calm poses keep it near-vertical; active poses (celebrate, present)
  exaggerate it.
- **Never mirror-symmetric.** One arm busy, one at rest; head off the body's
  centre axis; weight on one side. Symmetry kills the life.

---

## 3. THE A-FRAME REQUIREMENT (the brand equity — do not lose this)

Our logotype's "A" in **Get A Job** is a person hunched at a desk: the two legs of
the desk + the seated figure form the letter **A**. This is the single most
important brand constraint.

**The hero mascot must be the person seated at a desk that genuinely reads as the
letter A** — the desk/figure/legs composing an unmistakable capital A when you
step back. Not a person who happens to be near a desk; the desk **is** the letter.
The canonical mark to match is
`src/components/redesign/shell/CanvasLogo.jsx` (`MarkFullChair`) — we will supply a
PNG/SVG export of it with the brief. The hero figure and that 30px header mark must
read as **the same entity at two scales**.

- He is **seated** at the A-frame desk, working on a **laptop** (the laptop must
  read clearly as a laptop — a screen + a base, at a believable size and angle for
  someone typing).
- His seated posture + the desk legs form the A. The crossbar of the A is the desk
  surface / his forearms.
- This "rest-in-A" pose is his home state. Every other pose in the vocabulary is a
  **departure from and return to** this A (see the motion note in §5).

---

## 4. Character description (the single character)

One young man, our audience's peer:

- **Build:** oversized rounded head, chunky torso, small limbs (per the recipe).
  Seated for the hero/rest pose.
- **Face:** minimal — dot/short-line eyes, heavy simple brows, a small simple
  mouth, and the **signature rounded rosy ball nose**. **Glasses** (rounded,
  studious). A small, warm, capable read — not goofy, not blank.
- **Hair:** simple solid mass (warm brown), a single loose tuft is welcome as a
  follow-through part when we animate.
- **Wardrobe:** a crewneck sweater (slate) over a collar (mauve) — smart-casual,
  business-student. Flat garment blocks, no rendered folds beyond one or two big
  shapes.
- **Signature props:** a **laptop** (hero/working), a **coffee mug** (the sip is a
  requested idle beat — the mug has steam), and a **held page/CV** (reading pose).
- **Skin:** warm mid-tone (see palette §6).

He should look like he could stand up, and like he's mid-thought. Bookish,
warm, on the edge of confident.

---

## 5. Required pose vocabulary

Deliver the character in **six poses**, all the SAME character (shared silhouette,
proportions, palette, wardrobe, glasses, nose) — only posture, arms, and the held
prop change. These map to real product moments, so each must read as a specific,
honest action:

| Pose                 | Product moment                        | What it shows                                                                                            |
| -------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **rest-in-A** (home) | Sign-up, hero at rest                 | Seated at the A-frame desk, laptop open, calm. THE canonical pose; the desk reads as the letter A.       |
| **working**          | Loader / honest "in-flight" indicator | Same seat, hands on the laptop, leaning in, actively typing. A small energy lift vs rest.                |
| **drinking**         | Sign-up idle beat                     | Lifts the coffee **mug** toward the mouth (mug has steam). One arm busy with the mug, the other resting. |
| **reading**          | CV upload / extraction wait           | Holds a **page/CV** up, head angled down scanning it line-by-line. Plays only while a real parse runs.   |
| **celebrating**      | Springboard / completion payoff       | Stands, **arms up** / mid small-hop, open and joyful. The exaggerated line-of-action pose.               |
| **horizon**          | Direction / 5-year-goal screen        | Stands (or sits up tall), **looks up and out** along a path — aspirational, upright, confident.          |

Design each pose to **depart from and return to the rest-in-A home** cleanly — on
the landing page he literally **rises out of the A** on first scroll and walks the
page through these poses (rest → working → reading → practice → horizon →
celebrate), so consecutive poses should interpolate believably (consistent pivot
points, consistent part sizes). Keep the seated poses sharing the desk; the
standing poses (celebrate/horizon) separate from it while the desk remains as the
mark.

**Micro-life note (for our animation, informs your rigging):** underneath every
pose the character will always breathe, blink, shift weight, and (where a prop
earns it) sip / drift steam. You don't animate this — but build the parts so we
can (eyes as a separable part for blinks, torso separable for breathing, mug/steam
separable, etc. — see §7).

---

## 6. Palette — token mapping (use these exact values)

Our canvas palette. Please build in **these hex values** (they are design tokens on
our side; we list the token name so we can wire it up):

| Element                    | Token                           | Hex                    |
| -------------------------- | ------------------------------- | ---------------------- |
| Sweater (primary garment)  | `--rd-primary`                  | `#60617D` (slate-blue) |
| Sweater shadow             | `--rd-primary-dark`             | `#4B4C66`              |
| Collar / mug (accent)      | `--rd-teal` (mauve role)        | `#9B7D8A`              |
| Desk / laptop / hair       | `--rd-golden` (warm-brown role) | `#60483E`              |
| Ink / darkest detail       | `--rd-text`                     | `#211D18`              |
| Screen glow / warm light   | `--rd-golden-tint`              | `#FBEBC9`              |
| Skin (base)                | `--rd-mascot-skin`              | `#E8B48F`              |
| Skin highlight             | `--rd-mascot-skin-hi`           | `#F0C39F`              |
| Skin shadow                | `--rd-mascot-skin-sh`           | `#D0996F`              |
| Nose                       | `--rd-mascot-nose`              | `#DD875F`              |
| Blush                      | `--rd-mascot-blush`             | `#E0967A`              |
| Page surfaces / paper      | `--rd-bg-card`                  | `#FFFFFF`              |
| Background (behind figure) | `--rd-bg-page`                  | `#FAF6F0` (warm cream) |

Muted and earthy, matching the reference board's temperature but in our slate +
mauve + warm-brown family on cream. **No pure-saturated colors, no gradients
beyond the subtle skin shading, no one-off colors outside this set** (grain and
the ground shadow may use a low-opacity dark of the ink).

---

## 7. Separable-parts / rigging requirement (critical for delivery)

We rig and animate the figure in the browser (SVG + anime.js). The sheet is only
useful if it's **cut into individually-addressable parts**. Please deliver the
hero figure (and ideally each pose) as **layered vector art** where these are
separate, named groups on their own pivot:

Minimum separable parts (names we'll map to `data-part`):

- `figure` (the whole character group)
- `torso` (breathing — scales on Y about a low pivot)
- `head` (weight-shift tilt — rotates about the neck)
- `eyes` (blinks — scale on Y; keep as their own shapes, not merged into the face)
- `hair` tuft (optional follow-through part)
- the **working arm / forearm** (typing + point/reach — rotates about the elbow/
  shoulder)
- the **mug arm** + `mug` (the sip — rotates about the shoulder; mug is its own
  shape)
- `steam` (drifts above the mug — its own wisp shapes)
- held `page`/CV (reading — its own shape)
- `screenGlow` (the laptop screen's light — its own shape we can pulse)
- `shadow` (the ground oval — separate so it can stay put while the figure moves)

Requirements:

- **Vector, not raster.** SVG strongly preferred (or layered AI/Figma we can
  export to clean SVG). Flat fills using the palette tokens above; each fill as a
  solid shape (no baked-in gradients except the subtle skin shading, which should
  be its own overlay shape).
- **Real pivots.** Each moving part should have a sensible rotation origin (elbow,
  shoulder, neck) — build joints where a limb would actually hinge, so rotation
  reads as an arc, not a slide.
- **Grain as a separate layer**, or clean fills + a note — we clip a subtle chalk
  noise to the masses in code; do not bake heavy grain into the exported fills or
  we can't control it.
- **Consistent part identity across poses** — the head, torso, mug, glasses etc.
  should be the same shapes reused across poses, so we can interpolate between
  poses. Name layers consistently pose-to-pose.
- **Reduced-motion end-state:** every pose must be complete and appealing when
  frozen (we resolve animations to a static pose for `prefers-reduced-motion`).

---

## 8. Deliverables spec

1. **Turnaround / model sheet** of the single character in the **rest-in-A** home
   pose: front (primary), plus a 3/4 view, with a callout of the face detail
   (nose, eyes, brows, glasses) and the wardrobe color callouts. This locks the
   character.
2. **Pose sheet** — the **six poses** from §5, same character, on one sheet, each
   labelled, each a clean full figure.
3. **Layered source** for the hero figure and each pose — **SVG preferred**
   (clean, named layers per §7), plus the editable source (Figma / AI).
4. **Silhouette proof** — each pose flattened to a black silhouette on one sheet,
   to prove readability (per §2).
5. **Palette swatch** confirming the tokens in §6 as used.
6. **A short parts/pivot note** (can be annotations on the layered file) telling us
   where each joint pivot sits.

**Formats:** SVG (primary, layered + named) + source file + PNG previews at 2×.
**Canvas/scale:** design the hero figure to read cleanly from ~30px (header mark
parity) up to hero scale (~480px tall); it must not fall apart small.

**Turnaround (proposed):** rough character pass (1–2 concept directions of the
rest-in-A hero) for our sign-off → on approval, the full pose sheet + layered
source. We review at the concept stage before the full sheet, so please keep the
first pass loose and cheap.

---

## 9. Hard don'ts

- Don't lose the **A** — a figure merely near a desk fails the brand test.
- Don't render 3D / heavy gradients / glossy material — this is a flat illustrated
  character.
- Don't add colors outside §6.
- Don't make him goofy or a caricature — warm and capable, our user's peer.
- Don't deliver a single flattened image — we need the **layered, named,
  pivot-aware** parts or we can't rig it.
- Don't bake heavy grain or the ground shadow into the figure fills — separate
  layers.

---

## 10. Reference index (ships with this brief)

- `docs/design/mascot-reference/01-character-quartet.webp` — core recipe
- `docs/design/mascot-reference/02-monster-bicycle.webp` — proportion + texture
- `docs/design/mascot-reference/03-flat-face.webp` — clean face read
- `docs/design/mascot-reference/04-diverse-lineup.webp` — the audience
- `docs/design/mascot-reference/notes.md` — the shared-language recipe writeup
- `docs/design/mascot-motion-registers.md` — how we'll animate it (context, not a
  deliverable ask)
- Logo mark to match: `src/components/redesign/shell/CanvasLogo.jsx` (`MarkFullChair`)
  — we supply a PNG/SVG export.

_Internal note (not for the artist): once the sheet lands and is rigged, it drops
into the already-built sign-up idle, the queued onboarding/tutorial slots, the
landing scroll-journey, and the CV-gen theater (which ships mascot-less first and
takes the character as a later upgrade). Governed by the `character-craft` skill._
