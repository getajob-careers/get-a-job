# Canvas design tokens (fixture Home)

The token layer for the fixture-Home redesign. These are **enforced**, not
suggestions: `scripts/check-scale.mjs` fails on any off-scale size/radius in the
canvas tree. Palette = Clay (`src/pages/_preview/canvas/palette.js`).

## Type scale — the only legal text sizes

Defined in `canvas/scale.css`. Font family/weight stay on `font-display` /
`font-body` / `font-bold`; these classes own size + line-height (+ tracking on
display steps only).

| Class            | size / line-height | Use                         |
| ---------------- | ------------------ | --------------------------- |
| `rd-t-display-l` | 26 / 1.08, tight   | page/hero title             |
| `rd-t-display-m` | 20 / 1.15          | section titles ("Home")     |
| `rd-t-display-s` | 17 / 1.2           | card/panel titles           |
| `rd-t-body-l`    | 15 / 1.5           | primary body, CV text       |
| `rd-t-body-m`    | 13 / 1.4           | card titles, secondary body |
| `rd-t-body-s`    | 12 / 1.35          | meta, chips, controls       |
| `rd-t-micro`     | 10.5 / 1.3         | eyebrows, labels            |

Raw `text-[Npx]` is banned in the canvas.

## Radius scale — the only legal corner radii

| Class          | radius | Use                                |
| -------------- | ------ | ---------------------------------- |
| `rd-r-xs`      | 6px    | chips, tags, small wells           |
| `rd-r-sm`      | 10px   | buttons, avatars, inner controls   |
| `rd-r-md`      | 14px   | cards, tiles                       |
| `rd-r-lg`      | 18px   | panels, kanban columns, coach dock |
| `rounded-full` | —      | pills, round icons/avatars         |

Raw `rounded-[Npx]` and `rounded-{sm,md,lg,xl}` are banned in the canvas.

## Elevation language + effect scoping (SURVIVES FUTURE WAVES)

The house elevation language is **paper-lift** (`canvas/elevation.css`, shipped
step 2): floating surfaces read as lifted paper — a soft, **warm-tinted** shadow
(layered contact + wide soft, warm brown rgba so it never goes gray/muddy on the
putty field) + a 1px top highlight, **no border**. Classes: `.rd-lift` (bg +
shadow), `.rd-lift-shadow` (shadow only — for surfaces that own their bg, e.g.
the coach gradient), `.rd-lift-hover` (hover intensify + 2px rise). Borders live
on **insets**: `.rd-well` (recessed bg-soft + inset shadow) for inputs/wells —
e.g. the coach action-search field. Never a border on a lifted surface.

**Scoping ruling (do not drift):**

- **Spotlight cursor-glow is JOB CARDS ONLY.** A restrained warm radial that
  follows the cursor on the job card, and _nowhere else_. It is not a house
  style. Reference: ReactBits _Spotlight Card_, dialed down per the design
  brief's "don't overuse glows."
- **Everything else gets paper-lift WITHOUT the glow** — tiles, kanban cards,
  chips, panels, the coach dock. Consistent elevation, no cursor light.

If a future wave wants the glow on another surface, that's a new decision to
raise explicitly — the default answer is no.

- **The TOOLKIT RAIL is a scoped exception — this rail ONLY.** The sidebar tools
  (`CanvasToolTile` + `CanvasToolIcon` + `toolkit.css` + `toolColors.js`) are
  distinct colored OBJECTS in a space, not icons in cards. Three things live here
  and nowhere else:
  1. **Extra dimensionality (soft-3D):** each tool is its own silhouette with a
     top-lit gradient glaze + a soft warm ground shadow + a cursor parallax-tilt
     and one icon morph on hover. The only surface that earns depth beyond the
     flat paper-lift house language.
  2. **Varied per-tool tints:** every tool has its OWN colour (`toolColors.js`) —
     muted earthy siblings over one shared material, NOT a uniform tone and NOT a
     candy-box rainbow. Sage (Story bank) is kept warm/olive so it separates from
     Skill hub's teal.
  3. **LinkedIn brand blue** `#0A66C2` — the one true-brand colour on the canvas,
     the intentional pop against the earthy set.
     Everywhere else stays flat paper-lift, single palette, no brand colours. Stays
     in Clay (warm, premium, not toy-like); reduced motion flattens it. Extending
     any of these beyond the toolkit rail is a new explicit decision — default no.

## Score ring (locked)

The score visual is the **sheen arc** (`CanvasScoreRing`): one confident arc with
a soft luminosity gradient + round cap over a faint band-tint backing, the score
number centered in the band `-dark`. Premium, quiet, legible at ~46px. Chosen
over the score-coin and beaded-arc explorations (both removed, along with the
`?ring` lab route and the on-page switcher). Non-negotiables baked in: the ring
low-fill floor (`ring.js`) and the badge AA floor (number + arc use the band
`-dark`, AA on the card), plus the reduced-motion path (no draw-in). The 3-axis
breakdown lives in the hover/tap legend, never the ring face.

## Guardrail

`node scripts/check-scale.mjs` — flags any raw `text-[Npx]` / `rounded-[Npx]` /
`rounded-{sm,md,lg,xl}` in `src/pages/_preview/{canvas/*.jsx,Home3Tab*.jsx}`.
Wire into lint/CI when the canvas graduates toward prod.

## References (browse, hand-build to Clay tokens)

ReactBits (reactbits.dev), Godly (godly.website), 21st.dev. Cite the concrete
pattern in the commit/PR; never pull component code — hand-build on these tokens.
(Magic MCP is intentionally not installed.)
