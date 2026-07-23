---
name: character-craft
description: The getajob character-illustration + animation bar. Use for ANY work on the mascot / brand character — drawing it, posing it, or animating it (SVG figure, anime.js timelines, micro-life). Encodes the reference-board recipe, appeal fundamentals, animation principles as implementable rules, and the standing MICRO-LIFE requirement. Complements design-craft (which governs UI); this governs the CHARACTER.
---

# character-craft (the getajob character bar)

Apply on any edit that draws, poses, or animates the mascot. design-craft still
governs the surrounding UI (tokens, states, a11y, honest UI); this governs the
CHARACTER itself. When an edit violates a rule, fix it or flag it — never ship
the violation silently. Round 0 failed the eye because it broke rules (a) and
(f); do not repeat that.

Canonical files: `src/components/redesign/mascot/MascotFigure.jsx` (the figure),
`src/pages/_preview/MascotPreview.jsx` (the living idle), reference board
`docs/design/mascot-reference/` + its `notes.md`, motion plan
`docs/design/mascot-motion-registers.md`.

## (a) The board recipe — the visual target

The mascot is built from the reference board's language (see the board's
`notes.md` for the full read). Non-negotiables:

1. **Solid filled MASSES, not strokes.** The figure is a silhouette of big solid
   shapes. A thin-stroke "skeleton" reads lifeless (round 0's core miss).
2. **Exaggerated proportions:** oversized head + chunky torso, **small limbs.**
3. **Personality via posture + props, not facial detail.**
4. **Signature rounded rosy nose** — the charm anchor. Always present.
5. **Minimal face:** brows + dot eyes + a simple mouth. Glasses are on-brand.
6. **Soft grain tooth INSIDE the figure** — subtle chalk (low-opacity fractal
   noise clipped to the masses), NOT static. Figure-only; the background
   particulate-retirement does not apply here (Eli-blessed exception).
7. **Soft grounded shadow.** Nobody floats.
8. **Canvas palette only** (tokens): sweater `--rd-primary`, collar/mug
   `--rd-teal` (mauve), desk/laptop/hair `--rd-golden`/`--rd-text`, skin
   `--rd-mascot-*`, glow `--rd-golden-tint`. No one-off hex except inside the
   figure's own material (shadows/grain), and prefer a token even there.
9. **Keep the brand equity:** he is the person at the A-frame desk with a laptop
   (the logotype's "A"). Redraw the equity in the mass language; don't discard it.

## (b) Appeal fundamentals

- **Silhouette readability.** The figure must read as an unmistakable shape with
  fills flattened to black. Test it: if the black silhouette is generic, the pose
  is weak. Props break the silhouette on purpose (mug, laptop, held page).
- **Line of action.** One dominant curve from base through spine to head drives
  the pose. Calm registers keep it near-vertical; active registers (celebrate,
  present) exaggerate it. A figure with no line of action reads as a sack.
- **Asymmetry.** Never mirror-symmetric. One arm busy, one at rest; head off the
  body's centre axis; weight on one side. Symmetry kills life.
- **Big-to-small shape flow.** Read order head → torso → limbs → props; keep
  fewer, bigger shapes over many small ones.

## (c) Animation principles — as implementable rules

Two systems (per the motion-discipline ruling): **CSS** for simple single-element
loops/transitions; **anime.js v4 (per-submodule imports)** for timelines +
multi-part orchestration. Build each principle as:

- **Anticipation.** Any deliberate action gets a small counter-move first (dip
  before a hop, wind-up before a point). Encode as the first keyframe going the
  "wrong" way: `translateY: [0, +3, -18, 0]`.
- **Follow-through / overlapping action.** Loose parts (mug, held page, hair tuft,
  steam) lag the body and settle after it stops. Give trailing parts a longer
  duration + later start (a small stagger) than the driver.
- **Eased, asymmetric timing.** Never linear, never symmetric ease. Ease-out on
  arrivals, ease-in on departures; different up-duration vs down-duration. Use
  `inOut(2..3)`/`inOutSine`; avoid `linear`.
- **Squash & stretch — sparing.** A few % only (`scaleY: [1, 1.02, 1]` for breath;
  up to ~1.06 on a landing). This is a stylised flat figure, not rubber.
- **Arcs.** Limbs/props move on arcs, not straight lines — drive rotation about a
  pivot (transform-box: fill-box + a real joint origin), not raw x/y translation.
- **Staging.** One clear action at a time per register; don't animate everything
  at once or the read muddies.

## (d) The MICRO-LIFE LAYER — a STANDING REQUIREMENT

**Every pose, in every register, always carries micro-life. Its absence is why
round 0 felt dead.** Under any displayed pose, these run underneath whatever the
register is doing:

- **Blinks** — quick (~150ms), on a randomized 2.6–6.4s cadence, occasional
  doubles. Eyes as a `data-part` scaled on Y.
- **Breathing** — continuous subtle body bob + torso scaleY (~3.5–4s), the base
  sign of life.
- **Weight shifts** — slow head tilt/settle on a long randomized cadence (7–15s).
- **(where a prop earns it) idle prop motion** — steam drift, a periodic sip.

**Anti-metronome rule:** each sub-motion runs on its OWN self-rescheduling random
timer (`setTimeout(fn, rand(min,max))` that reschedules itself), NEVER a single
shared synced loop. If two motions share a period, it reads mechanical.

Reference implementation: `useSignupIdle` in MascotPreview.jsx.

## (e) Honest + accessible (inherited, non-negotiable)

- **Honest UI.** Motion illustrates REAL state; it never fakes progress. A
  "reading/working" animation plays only while the real work is in-flight and
  stops when it's done. (design-craft rule 9.)
- **prefers-reduced-motion → static.** Every animation checks reduced-motion and
  resolves to the static end-state; the figure must be complete and appealing
  frozen. Timelines simply never start.
- **Separable parts.** Build the figure from individually-addressable `data-part`
  groups (figure/torso/head/eyes/mugArm/screenGlow/steam…) so one part animates
  without touching the rest, and instances scope queries to a container ref (no
  id collisions).
- **Canvas-only + size split.** Character work is flag-on / `_preview` only; the
  30px header pictogram (CanvasLogo) is untouched — refine only the hero figure.
- **Tokens resolve under the flag.** The slate primary + `--rd-mascot-*` skin
  live under `[data-next-design]`; a preview route MUST stamp the flag or the
  figure renders in flag-off coral (round 0's silent bug). Provide inline var()
  fallbacks as belt-and-suspenders.

## Ruled fallback

Round 1 goes to Eli's eye; round 2 only on his notes. If round 2 still misses,
the ruled fallback is a **commissioned character sheet** — flag it, don't spiral
into a third+ self-directed redraw.
