# Mascot reference board — shared language

Eli's reference board for the Get A Job mascot (4 images, committed 2026-07-23).
These are the visual-target references the character is redrawn against. They are
DIRECTION, not the character — we adapt the _language_ to the canvas palette and
keep our own brand equity (the person at the A-frame desk from the logotype's
"A"; see `src/components/redesign/shell/CanvasLogo.jsx`).

## The four references

- `01-character-quartet.webp` — farmer / thief / doctor / old-man. The core
  recipe: solid filled masses, big rounded heads, **signature rounded rosy
  nose** on every character, minimal faces (dot/line eyes + heavy brows), chunky
  bodies with **small limbs**, personality carried by **posture + props** (basket
  - pitchfork; sack + crowbar; clipboard + stethoscope; cane + newspaper), grain
    inside the fills, soft oval ground shadow, muted earthy palette.
- `02-monster-bicycle.webp` — the exaggeration + material extreme: a huge fuzzy
  torso on a tiny bike, **heavy chalk grain inside the mass**, closed-happy eyes,
  a simple smile, a sweat-drop of character. Proportion + texture reference.
- `03-flat-face.webp` — the cleaner-flat pole: minimal features, subtle gradient
  shading on skin, a studious young man (glasses + airpods). Reference for a
  clean face read when grain is dialled down.
- `04-diverse-lineup.webp` — mid-century corporate-flat business people: the
  audience. Big noses, simple dot eyes, flat garment blocks, soft.

## The recipe (what carries into our character)

1. **Big simple shapes.** The figure reads as a silhouette of solid masses, not
   an assembly of thin strokes. (Round 0's failure: it was a stroke skeleton.)
2. **Exaggerated proportions.** Oversized head + chunky torso; **small limbs.**
3. **Personality via posture + props, not facial detail.** The job — and the
   mood — is told by what he holds and how he sits, not by a rendered face.
4. **Signature rounded nose.** The rosy ball nose is the charm anchor. Keep it.
5. **Minimal expressive face.** Brows + dot eyes + a simple mouth. Nothing more.
   (Glasses are on-brand for our audience — studious job-seeker — and appear on
   2 of 4 board characters.)
6. **Soft grain texture INSIDE the figure.** A chalk _tooth_, not TV static —
   subtle, low-opacity, on the masses. This is the figure's own material and is
   the **design-craft-blessed exception** to the ground particulate-retirement
   (that rule governs the BACKGROUND, not the character).
7. **Soft grounded shadow.** A soft oval (+ a loose scribble) anchors the figure
   to the floor; nobody floats.

## How we adapt it (getajob specifics)

- **Palette:** the board's earthy muted tones map cleanly to the canvas tokens —
  sweater = slate `--rd-primary #60617d`, collar/mug = mauve `--rd-teal #9b7d8a`,
  desk/laptop/hair = warm brown `--rd-golden #60483e` / ink `--rd-text`, skin =
  the new `--rd-mascot-*` tokens, glow = `--rd-golden-tint`, surfaces = cream.
- **Brand equity kept:** he is the person hunched at the A-frame desk with a
  laptop — the logotype's "A" at hero scale — redrawn in the board's mass
  language. We do not adopt the board's _characters_, only its _craft_.
- **Micro-life is ours to add.** The board is still art; our character has to
  breathe, blink, shift weight and sip. See `character-craft` skill + the motion
  registers doc.

Encoded as a reusable procedure in the `character-craft` skill
(`.claude/skills/character-craft/SKILL.md`).
