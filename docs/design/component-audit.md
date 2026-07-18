# Fixture Home — component audit (round 3, components-over-colors)

Clay is locked. The remaining "vibe-coded" feel is in the components, not the
palette. This audit goes element by element, diagnoses _why_ each reads generic,
ranks by contribution, and proposes treatments. Report-before-build.

Evidence pulled from the live source: **9 distinct corner radii** (up to 4 in a
single card), **~19 ad-hoc font sizes** (9px→26px, mostly half-pixel `text-[Npx]`),
**every surface = white + one 1px hairline border**, uniform tight padding,
lucide icons at default weight in mixed sizes.

---

## Root causes (systemic — these infect every component; fix first)

Ranked above any single component because they're _why_ the whole page reads
assembled-not-designed.

**R1 — No type scale.** 19 arbitrary sizes (`text-[12.5px]`, `[13.5px]`,
`[10.5px]`, `[9.5px]`…) with no paired line-height/tracking. This is the single
biggest tell: hierarchy is muddy because nothing steps cleanly. → Establish a
tight scale (~7 steps), snap every size to it.

**R2 — No radius scale.** 9 radii; a job card alone uses `[14px]` (card),
`[8px]` (avatar), `[5px]` (chips), `full` (buttons). Corners that don't agree
read as parts glued together. → 5-step radius scale, snap everything.

**R3 — Border-only elevation.** Every surface is `bg-card` + `border-rd-border`
(1px hairline). Uniform hairline-on-white is _the_ AI-dashboard/bootstrap look;
`shadow-rd` is used on only 7 spots. There's no elevation _language_ — nothing
tells you what floats vs what's inset. → Reserve borders for insets; give
floating surfaces a soft shadow + a 1px top highlight ("lifted paper").

**R4 — Uniform tight density.** `p-3`/`p-2`/`p-2.5` everywhere; no generous
negative space, no breathing rhythm. Everything is equally cramped, so nothing
feels important. → A spacing rhythm where the primary surface breathes (more top
padding, air under the title) and secondary chrome stays tight.

**R5 — Thin, inconsistent icons.** lucide at default `strokeWidth=2`, sizes
`w-3`/`w-4`/`w-5` mixed without rule. Thin uniform line icons read generic. →
One icon size rule per context; slightly heavier stroke (2.25) for primary
glyphs; the duotone treatment already helps — extend it consistently.

---

## Type scale (proposed)

Rokkitt slab for display, system stack for body. Snap the 19 sizes onto:

| Step      | Size / line-height               | Use                         |
| --------- | -------------------------------- | --------------------------- |
| Display-L | 26 / 1.1, tight                  | page/hero title             |
| Display-M | 20 / 1.15                        | section titles ("Home")     |
| Display-S | 17 / 1.2                         | card/panel titles           |
| Body-L    | 15 / 1.5                         | primary body, CV text       |
| Body-M    | 13 / 1.45                        | card titles, secondary body |
| Body-S    | 12 / 1.4                         | meta, chips, controls       |
| Micro     | 10.5 / 1.3, +tracking, mono caps | eyebrows, labels            |

Kill `12.5`, `13.5`, `11.5`, `10`, `9.5` → nearest step. Line-height + tracking
travel _with_ the step, not improvised.

## Radius scale (proposed)

| Token | px  | Use                                |
| ----- | --- | ---------------------------------- |
| xs    | 6   | chips, tags, small wells           |
| sm    | 10  | buttons, avatars, inner controls   |
| md    | 14  | cards, tiles                       |
| lg    | 18  | panels, kanban columns, coach dock |
| full  | —   | pills, round icons, avatars-round  |

Kill `5`, `8`, `11`, `12`, `16`, `20` → snap to the scale.

---

## Component ranking (worst generic-offender first)

### 1. Job card — the hero surface (biggest lever)

Highest frequency + most looked-at. Hits all five root causes: `[14px]` +
`[8px]` + `[5px]` radii in one card; `bg-card` + 1px hairline (flat); `p-3`
uniform; title `13.5` barely above meta `10.5` (weak hierarchy); avatar is a
plain rounded square initial.
**Treatment:** lifted-paper elevation (drop the hard border → soft shadow + 1px
top highlight; border only on hover); snap radii to md/sm/xs; open up padding
(p-3 → generous top, title gets air); push title to Body-M bold with meta
dropping to Micro-quiet so the hierarchy actually steps; give the company initial
a warmer, softer container (or real logo slot).
**Reference:** ReactBits _Spotlight Card_ — a very subtle warm radial that
follows the cursor (restrained, per the design brief's "no glow overuse"), so the
card feels alive on approach without decoration. Godly job/dashboard cards for
the type-hierarchy + whitespace target.

### 2. Kanban column + card

Columns are `w-[220px]` `[12px]` wells in `bg-page`/`bg-soft`; headers are a tiny
label + a mono count — reads like a Trello clone. Cards are `[10px]`, `p-2.5`,
tight, another hairline border.
**Treatment:** columns → lg radius, a quieter header with a filled count chip
(sm radius) and a hairline divider under it; cards → same lifted-paper language
as the job card (consistency across surfaces is itself de-generic-ing); a subtle
column-tint per status (already have STATUS_TONE) carried into the header, not
just the card avatar.
**Reference:** ReactBits _AnimatedList_ for the settle/insert beat we already
started; Godly pipeline/board layouts for column-header restraint.

### 3. Tile grid (sidebar)

`grid-cols-3` of `aspect-square` `[12px]` bordered tiles = classic dashboard
filler. The duotone icons are the one distinctive touch.
**Treatment:** kill the per-tile border (root cause R3), let the duotone glyph +
label sit on the sidebar tone with a soft hover-lift; unify radius to md; make
the grid breathe (gap up); consider a 2-col layout so labels aren't cramped.
**Reference:** ReactBits _Dock_ magnify (we have cursor-magnet — lean into it
more) or a cleaner _GlassIcons_ treatment.

### 4. Chips / badges

The `[5px]` chip radius is the smallest offender but the most numerous (work-type,
years, posted). They're `bg-soft` + tertiary text — quiet to the point of
invisible, and the odd radius stands out.
**Treatment:** snap to xs; unify to one chip primitive (a real shared component,
per design-craft rule 4 — right now they're inlined); slightly stronger text so
they're scannable. The band/fit badge stays band-tint + band-dark (AA-locked).

### 5. Coach panel

Actually the _least_ generic thing on the page — the grain + warm gradient give
it real character. Weak spots: the thread bubbles (`[12px]`, generic chat), and
the input row.
**Treatment:** mostly leave it; snap bubble radius to md, give the assistant
bubble the lifted-paper treatment so it reads as "surface" not "chat"; tighten
the input affordance (see Wave-2 item below).

### 6. Tabs

Standard underline tabs with a static 2px coral bar. Fine, low priority. Small
win: an animated sliding indicator (shared-layout) so switching feels crafted.
**Reference:** ReactBits/Framer animated-tabs `layoutId` indicator.

### 7. Buttons

Flat `rounded-full` fills (Tailor CV coral, Add-manually teal). Not bad, but
totally flat. Small treatment: a 1px inner top highlight + a firmer press state
so they feel physical, not painted.

### 8. Funnel tiles / 9. Inputs

Low priority. Funnel now readable after the ring floor; snap radius to md.
Inputs are minimal — fold into the coach-input Wave-2 item.

---

## Wave-2 open items, judged by the same standard

- **Tri-ring vs gauge score visual.** Ring won earlier, but under this lens the
  _tri_-ring is over-engineered: three 3px concentric arcs at 44px, outer two at
  0.3/0.55 opacity, read as noise, not three axes — and the axis meaning isn't
  legible without the hover legend. Proposal: **one bold arc + ghost track + the
  number** as the default (cleaner, reads instantly, honors the ring-floor), and
  move the 3-axis breakdown entirely into the hover legend / detail modal where
  it has room. Keeps the ring identity, drops the visual noise.
- **Job-card hover expansion (actions on approach).** Good idea, but the actions
  currently just appear — judged generic. Fold into the card treatment: the
  action row should slide/fade with the lifted-paper hover as one gesture, not a
  separate pop. Tie to the Spotlight-card approach beat.
- **Coach action-search input.** Solid concept (kokonut ActionSearchBar). Weak as
  a _surface_: it's a borderless input in a bordered box. Give it a real inset
  well (xs/sm radius, `bg-soft`, no outer border) so it reads as a search field,
  and keep the staggered dropdown.
- **CV-gen theater.** The honest-stages overlay is good and on-brand. Snap its
  radius/type to scale; otherwise keep.
- **Profile tile dropdown → avatar chip.** IA already fixed (tile navigates, menu
  on the chip). Visual: the chip/menu is generic; give the menu the lifted-paper
  treatment + snap radii; low priority.

---

## Proposed build order (foundational → surface)

1. **Type scale + radius scale as tokens** (R1, R2) — one pass, instantly
   de-generics every component. Highest leverage.
2. **Elevation language** (R3) — lifted-paper card treatment as a shared class;
   reserve borders for insets.
3. **Job card** (#1) — apply 1+2, spacing rhythm, hierarchy, Spotlight approach,
   fold in hover-actions + the simplified single-arc ring.
4. **Kanban** (#2) — same card language, column-header restraint.
5. **Tile grid** (#3), **chips primitive** (#4), then the polish tier (tabs,
   buttons, coach input, funnel).

Nothing here touches the palette or the two locked constraints (ring floor, badge
AA). All preview-worktree.
