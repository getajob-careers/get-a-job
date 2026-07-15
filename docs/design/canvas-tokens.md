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

The house elevation language is **paper-lift**: floating surfaces read as lifted
paper — soft shadow + a 1px top highlight, borders reserved for _insets_
(chips, wells, dividers), not floating cards. (Implemented in step 2.)

**Scoping ruling (do not drift):**

- **Spotlight cursor-glow is JOB CARDS ONLY.** A restrained warm radial that
  follows the cursor on the job card, and _nowhere else_. It is not a house
  style. Reference: ReactBits _Spotlight Card_, dialed down per the design
  brief's "don't overuse glows."
- **Everything else gets paper-lift WITHOUT the glow** — tiles, kanban cards,
  chips, panels, the coach dock. Consistent elevation, no cursor light.

If a future wave wants the glow on another surface, that's a new decision to
raise explicitly — the default answer is no.

## Guardrail

`node scripts/check-scale.mjs` — flags any raw `text-[Npx]` / `rounded-[Npx]` /
`rounded-{sm,md,lg,xl}` in `src/pages/_preview/{canvas/*.jsx,Home3Tab*.jsx}`.
Wire into lint/CI when the canvas graduates toward prod.

## References (browse, hand-build to Clay tokens)

ReactBits (reactbits.dev), Godly (godly.website), 21st.dev. Cite the concrete
pattern in the commit/PR; never pull component code — hand-build on these tokens.
(Magic MCP is intentionally not installed.)
