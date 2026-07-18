# Canvas design tokens (fixture Home)

The token layer for the fixture-Home redesign. These are **enforced**, not
suggestions: `scripts/check-scale.mjs` fails on any off-scale size/radius in the
canvas tree.

## THE REVEAL FLAG - NEXT_DESIGN (standing architecture, Eli 2026-07-18)

The redesign ships to users as **ONE reveal**, not phase by phase. Every
user-visible redesign change is gated by a single flag. **Flag OFF (default) =
current app, byte-identical for all real users. Flag ON = the redesign as far as
it is built.** Each phase still **merges to `main`** as it is verified (no
long-lived branch, no rot, per-PR CI stays real); the flag, not the branch, holds
the reveal.

**`src/lib/nextDesign.js` (`isNextDesign()`) is the ONLY legal guard.** No phase
may invent its own check. Shell, components, and pages all gate on either:

- **JS:** `isNextDesign()` from `src/lib/nextDesign.js`, or
- **CSS:** the `:root[data-next-design]` selector (for token overrides).

Both read the SAME signal: a `data-next-design` attribute on `<html>`, set once
**before first paint** by the bootstrap in `index.html`. Resolving it pre-paint
(not via an async profile fetch) is what avoids a flash on the CSS-variable swap.

**Precedence:** `?next=` query param > `localStorage 'nextDesign'` >
`VITE_NEXT_DESIGN` build default.

- Turn ON: append **`?next=1`** to any URL (persists in this browser).
- Turn OFF: **`?next=0`**.
- At a glance: flag-ON non-reveal shows a small **`NEXT`** badge, bottom-right
  (suppressed once `VITE_NEXT_DESIGN=1`, i.e. reveal day).

**Token gating:** `src/index.css` keeps the v1 production values in `:root`
(byte-identical to old `main`) and puts the Yishai values under
`:root[data-next-design]` (specificity `(0,1,1)` beats `(0,0,1)`). **Ground
gating:** `Layout` mounts DepthField + GrainGround and drops the `<main>` bg only
when `isNextDesign()`; flag-off keeps the opaque `<main>` (no ground to occlude).
`scripts/check-ground.mjs` understands the flag-off-gated bg.

**Reveal day** = flip the default (`VITE_NEXT_DESIGN=1`), then a cleanup phase
**deletes the whole mechanism**: this bootstrap, `nextDesign.js`, every guard, and
the `:root[data-next-design]` selector (promote its values into `:root`).

## THE PALETTE (canonical source = the handoff mockup - Eli, 2026-07-18)

**The mockup file is the canonical colour source.** Every `--rd-*` value in
`:root[data-next-design]` (`src/index.css`) is sampled VERBATIM from
`docs/design/reference/app-handoff-mockup.html` (the file's own `:root` CSS vars),
not by eye and not from `palette.js`. This **supersedes the greige decision**
(greige + its rationale are in the graveyard note under THE GROUND).

**Token map (mockup var -> our slot):**

| slot                               | mockup var                        | value                                 |
| ---------------------------------- | --------------------------------- | ------------------------------------- |
| `bg-page`                          | `--bg`                            | `#F4EBDA`                             |
| `bg-card` / `bg-sidebar`           | `--card`                          | `#FFFCF4`                             |
| `bg-soft`                          | `--bg-warm`                       | `#ECE0C9`                             |
| `border` / `border-subtle`         | `--line` / `--line-soft`          | `#E0D2B9` / `#E9DEC8`                 |
| `text`                             | `--ink`                           | `#4A372D`                             |
| `text-secondary`                   | `--ink-soft` (AA min-fix)         | `#7B675C`                             |
| `text-tertiary`                    | `--ink-faint` (EXACT, faint tier) | `#A6957F`                             |
| `eyebrow` / `coral` (primary=blue) | `--accent`                        | `#60617D`                             |
| `coral-dark` / `-tint`             | `--accent-deep` / `--accent-tint` | `#4B4C66` / `#E3E3EC`                 |
| `teal` (secondary=mauve)           | `--mauve`                         | `#9B7D8A`                             |
| `teal-dark` (AA min-fix) / `-tint` | `--mauve-deep` / `--mauve-tint`   | `#7B606D` / `#EFE3E9`                 |
| `golden` (stretch)                 | `--brown` family (DERIVED)        | `#60483E` / `#4A362E` / `#E9DECF`     |
| `shadow`                           | `--shadow`                        | `0 14px 40px -22px rgba(96,72,62,.4)` |
| `logo-hi`                          | `--accent-soft`                   | `#8B8CA3`                             |

**DERIVED slots (the mockup does not define these - flagged, not invented):**

- `golden*` = the mockup's **brown** family (no ochre in the file; Eli chose
  option A - map to his neighbours, no invented hue).
- `border-hover` `#D4C4A6` (one step darker than `--line`).
- `--rd-peach` **RETIRED** (no peach in the mockup); unported consumers (legacy
  `SidebarFooter`, onboarding) fall back to the `:root` v1 value.
- `field` = `#F4EBDA` (the ground base).
- `amp-kanban-header` / `-body` / `-deco` retain their prior values until PR3 ports
  the mockup's cream-cards-with-dots kanban (it has no mauve-fill header).

**AA exceptions (Eli-ruled - exact fidelity is the default, legibility is his call):**

- **Min-fixed (imperceptible):** text-secondary `#7C685C -> #7B675C`, mauve chip
  `#7E626F -> #7B606D`, hero eyebrow `#C6C7D6 -> #DEDFE7`.
- **Accepted as-is (sub-AA, deliberate faint-meta tier):** `--rd-text-tertiary`
  `#A6957F` (2.46 on `--bg`) and the neutral mono chip `#A6957F` on `#ECE0C9`
  (2.22). These are de-emphasised meta (timestamps, counts); Eli accepted the
  exact mockup hexes.
- **Mauve badge:** keep `#9B7D8A` at large/UI sizes; darken the FILL to ~`#84697A`
  only where SMALL text renders on it (a component rule, applied when the badges
  port in PR3).

## THE GROUND (official spec - mockup-sourced, Eli 2026-07-18)

The ground is the MOCKUP's treatment: a cream base + a decorative blob layer + a
dot-grid texture, a `-z-10` stack on the isolate shell, in this order:
**page `#F4EBDA` (fallback) -> DepthField (cream field `--rd-field #F4EBDA` + two
blurred colour BLOBS) -> DotGrid (the mockup's subtle dot texture)**.

**SINGLE SOURCE OF TRUTH:** the field + texture live in
`src/components/redesign/DepthField.jsx` + `GrainGround.jsx` (the latter now
renders the DOT GRID, not grain - a rename to `DotGround` is a follow-up so
existing imports/re-exports stay valid). The canvas
(`_preview/canvas/CanvasField.jsx` + `CanvasTexture.jsx`) RE-EXPORTS them and the
production shell imports them, so the canvas and the real app render the identical
ground and cannot fork.

- **Dot grid** (`GrainGround.jsx`): `radial-gradient(var(--rd-border) 1.1px,
transparent 1.1px)` on a `26px` grid - the exact texture the mockup paints on
  its content area. Transparent `-z-10` layer over `DepthField`, behind cards, so
  it never touches text AA or card-vs-ground elevation. Token-driven, so it
  re-tints with the palette.
- **Blobs** (`DepthField.jsx`): two large, heavily-blurred circles on the cream
  `--rd-field` base - accent (`--rd-coral`, 420px, blur 130px, opacity .10,
  top-right) and mauve (`--rd-teal`, 340px, blur 120px, opacity .12, lower-left) -
  the mockup's `.blob-a` / `.blob-b`. `-z-10`, behind cards.

**GRAVEYARD (retired 2026-07-18, Eli ruled the mockup canonical):**

- **greige `#EBE8E1` + its rationale.** Greige was chosen when the mock's cream
  `#F4EBDA` was judged to read yellow at full-page scale. Superseded: the mockup's
  exact creams are now canonical.
- **the feTurbulence grain** (`baseFrequency 0.85`, multiply, opacity 0.36) + the
  **greige brand arcs**. The grain was **greying the cream** - a multiply layer
  darkens/desaturates the ground toward greige (visible in the A/B/C texture
  side-by-side that drove this ruling). Replaced by the mockup's dot grid + blobs.
- **`isolate` on the shell is REQUIRED (part of this spec, not incidental).** The
  ground layers are `position:absolute; z-index:-10`. If their nearest positioned
  ancestor is not a **stacking context**, the negative z-index escapes upward and
  the layers paint BEHIND the opaque page/`<main>` background — **silently
  invisible** (exactly the bug that shipped here: the grain AND the whole depth
  field were occluded, and the ground read flat). `position:relative` alone does
  NOT create a stacking context, and neither does `overflow-hidden`. The shell
  carries `isolate` (Tailwind `isolation: isolate`); **the port must reproduce a
  stacking context on whatever element owns these ground layers.**
- **`isolate` is necessary but NOT sufficient in the real app (added 2026-07-17,
  the bug recurred on its first port).** The `-z-10` grain paints on the isolate
  shell's own background, BEHIND the shell's in-flow children. So **no in-flow
  descendant between the shell and the content may carry an opaque background**, or
  it paints over the grain and re-occludes it. In production the culprit was
  `Layout`'s `<main class="legacy-body">`, which forced `bg-rd-bg-page` (opaque
  greige) and covered the grain. The preview never hit this because its content sat
  directly on the isolate shell with no full-bleed `<main>`. **The rule for the
  port: the scroll container / content wrapper under the shell must be TRANSPARENT**
  (the shell already provides the greige ground). A page body that sets its own
  `bg-*` root will occlude the grain in its own area until that page is ported -
  expected, not a bug. Keeping the grain on the h-screen shell (not inside the
  scroll container) is also what makes it a FIXED ground that content scrolls over,
  rather than a texture that scrolls away.
- **ENFORCED by `scripts/check-ground.mjs`** (wired into CI + `npm run check:ground`,
  added 2026-07-18 after the class recurred three times). It fails the build if a
  ground-filling wrapper (`flex-1` / `overflow-*-auto` / `h-full` / `h-screen`) in
  the layout/shell files carries an opaque bg class, unless that element is the
  isolate ground provider itself (`isolate`). Scoped to layout files so it never
  fires on cards. Prose alone did not stop the recurrence; this does.
- **Verify by pixel-diff, never by computed style.** A `-z-10` layer can exist in
  the DOM with the correct computed style and still paint nothing. To confirm the
  ground renders: screenshot with vs without and diff the pixels (a real change is
  ~15–20% of the ground area; ~0% outside the control = broken, not subtle). Fast
  disambiguator: force the layer **bright red at full opacity** — if it doesn't
  show, it's occluded (stacking context / z-index / an opaque ancestor), not faint.

## Feasibility-first (STANDING RULE)

Before designing ANY surface or capability, **read the real implementation** -
the component, the data shape, the backend endpoint/table - and state in one line
what exists vs what the design assumes. Every proposal to Eli carries a
**backend reality** line, one of: **SUPPORTED AS-IS** / **NEEDS BACKEND WORK**
(name the endpoint/table/work) / **FICTION** (flag it plainly). **Fixtures mirror
real data shapes, never invented ones.** Restyle the real thing; never
reinterpret a surface from its name - that is the roadmap-round lesson
(reinterpreted "matched roles" from the name, threw away the real bars / chips /
expand) generalized to everything. The honest per-surface work-list lives in
`docs/design/feasibility-audit.md`.

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

**Elevation ↔ amplitude retune (2026-07-17).** Paper-lift leans on TWO cues: the
card being brighter than the page (a luminance lift) AND the shadow. The colour-
amplitude layer (`amplitude.js`) tints the card, which lowers its luminance and
shrinks the luminance-lift. This is retuned rather than left to weaken silently
(Eli's instruction): at **medium** the card still clears the page and the shadow
is deepened to carry more of the lift; at **bold** the page is darkened a step
(`--rd-bg-page`) AND the shadow deepened, so the card stays lifted even at the
deepest tint. `scripts/audit-amplitude.mjs` gates the invariant `L(card) >
L(page)` per level (it holds: subtle Δ0.054, medium Δ0.014, bold Δ0.056). Medium's
thin Δ is deliberate — there the deepened shadow, not luminance, carries the lift.
This retune is amplitude-scoped: the flat palettes (no amplitude) are unchanged.

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
  4. **Layout: CAROUSEL (locked)** — a compact horizontal band (the grid variant
     - switcher were removed once picked). Native wheel/trackpad scroll (deltaY →
       scrollLeft) + quiet edge chevrons (click-to-advance + the "there's more"
       hint) + a right-edge peek fade. The descriptor is a tooltip portaled to
       `body` so it escapes the band's scroll-clip; the single row keeps the coach
       dock at max presence — the coach is the priority the rail yields to.

## Score ring (locked)

The score visual is the **sheen arc** (`CanvasScoreRing`): one confident arc with
a soft luminosity gradient + round cap over a faint band-tint backing, the score
number centered in the band `-dark`. Premium, quiet, legible at ~46px. Chosen
over the score-coin and beaded-arc explorations (both removed, along with the
`?ring` lab route and the on-page switcher). Non-negotiables baked in: the ring
low-fill floor (`ring.js`) and the badge AA floor (number + arc use the band
`-dark`, AA on the card), plus the reduced-motion path (no draw-in). The 3-axis
breakdown lives in the hover/tap legend, never the ring face.

## Brand mark / logo (locked)

**One official mark, every size - no size split.** The logo (`CanvasLogo` ->
`MarkFullChair`) is the full desk-person figure at an A-frame desk with a chair
(the "B" mark), rendered in the **toolkit-object material**: a top-lit glaze
(highlight -> `--rd-coral` -> `--rd-coral-dark`, `userSpaceOnUse` so the whole
mark reads from one light source) plus a warm weight-shadow (in-SVG
`feDropShadow` in viewBox units, so it scales with the mark). It reads as a warm
dimensional object that pops off the page, not a flat vector. Blue (`?logo=blue`)
is a flat reference only. The earlier simplified-A + size-split and the
no-chair / detailed-chair explorations were rejected; the `?logo=lab` route is
removed. At header scale it reads as a warm dimensional mark rather than a
legible scene - that is the intent (one logo, everywhere). This is a second
scoped instance of the object material beyond the toolkit rail; both are
recorded here, and applying the material anywhere else is a new explicit
decision - default no.

## The official logotype (LOCKED - Eli, 2026-07-17)

The full lockup is **mark + words + optical spacing**. All three are locked
together; changing any one re-opens the lockup. Single source of truth:
`LOGOTYPE` in `CanvasLogo.jsx` - the header renders through it, so nothing can
drift from what was approved.

| Part               | Value                                    |
| ------------------ | ---------------------------------------- |
| Mark               | `MarkFullChair`, object material (above) |
| Words              | **Archivo 700** ("Get" / "Job")          |
| Letter-spacing     | `-0.02em`                                |
| Gap: "Get" -> mark | `margin-left: 0.05em`                    |
| Gap: mark -> "Job" | `margin-right: -0.05em`                  |

**Archivo is the LOGOTYPE face only.** It is loaded in `index.html` at **weight
700 only** (one weight, to hold the payload down) and nothing else in the product
may set Archivo - the display face is still Rokkitt, body is still the system
stack. Rokkitt 800 (incumbent) and Rokkitt 500 tracked-open were the free
alternatives; Archivo won on the merits and the +1 font family is the accepted
cost. The `?wordmark=lab` A/B/C lab is removed.

**The spacing is ASYMMETRIC ON PURPOSE - it is optical, not metric.** Equal
margins read _wrong_ here, because the shapes flanking the mark are not equal:

- **Right (mark -> "J") needs the SMALLER gap** - it is _negative_. The mark's
  right leg slopes away as it rises, and Archivo's cap `J` is a stem on the right
  with its upper-left empty. Those two voids compound into one hole, so a
  metrically-equal gap reads as a conspicuous hole. The negative value is also
  absorbing the ~0.08em of padding the mark's own viewBox carries per side.
- **Left ("t" -> mark) needs the LARGER gap** - "t" is a full-height vertical
  stroke and the mark's left leg splays toward it at the baseline, so the two
  nearly collide low down.

Tuned by eye at **28px in the real header**, which is the only place it may be
judged. If the mark, the face, or the size changes, **re-tune by eye** - do not
carry these numbers over and do not "fix" them back to symmetry.

## Company logo chip (containment for uncontrollable colour)

Job cards show the REAL company logo (ported from production `CompanyLogo.jsx`:
logo.dev → DuckDuckGo favicon → letter-avatar fallback). Real logos are arbitrary
brand colours we don't control, so the containment is a **quiet neutral frame**,
not a themed one: a **white tile + hairline `--rd-border` + `object-contain` with
~10% padding**, radius from the scale (`rd-r-sm` = 10px at the 36px card size).
The white tile is deliberate and does NOT track the palette or amplitude — it
isolates any logo (pink, orange, purple) from the surface so it never fights the
Clay/Yishai/etc. palette. The letter-avatar fallback keeps the same geometry so a
failed image never reflows the card. This treatment is palette-independent by
design; it is the one place a white surface is correct under a tinted card.

## Guardrail

`node scripts/check-scale.mjs` — flags any raw `text-[Npx]` / `rounded-[Npx]` /
`rounded-{sm,md,lg,xl}` in `src/pages/_preview/{canvas/*.jsx,Home3Tab*.jsx}`.
Wire into lint/CI when the canvas graduates toward prod.

## References (browse, hand-build to Clay tokens)

ReactBits (reactbits.dev), Godly (godly.website), 21st.dev. Cite the concrete
pattern in the commit/PR; never pull component code — hand-build on these tokens.
(Magic MCP is intentionally not installed.)
