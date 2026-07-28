# Palette market scan — career platforms + trust/warmth products (2026-07)

Research for the Home-canvas palette direction (round 3 rev 2). Method: hexes
marked **[live]** were pulled from the product's own computed CSS in-browser;
**[official]** = brand guideline page; **[ref]** = third-party brand-color DB
(lower confidence); **[flag]** = unverified/approximate.

## 1. Career / job-platform palettes

| Product       | Primary                                             | Accent(s)                                                               | Surface                         | Register                                       |
| ------------- | --------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------- | ---------------------------------------------- |
| LinkedIn      | Blue `#0A66C2` [official]                           | olive `#83941F`, amber `#E7A33E`, coral `#F5987E` [official, secondary] | stark white                     | corporate, institutional, cold                 |
| Indeed        | `#003A9B` [official]                                | Ink `#00123C` [official]                                                | white                           | utilitarian, clinical                          |
| Glassdoor     | Field Green `#0CAA41` / `#00A86B` [ref]             | greens + ink                                                            | near-white                      | transparency, growth                           |
| Teal (tealhq) | deep teal `#005149` [live]                          | **gold CTA `#F5B501`** [live], periwinkle `#5A6FEC` [live]              | off-white `#F7F7F7` [live]      | calm-competent; gold softens the clinical teal |
| Simplify      | cyan `#12A1C0` [live] (_rebranded from pink/peach_) | mint `#5EEAD4` [live]                                                   | white + slate-50 [live]         | fresh, techy, cool                             |
| Otta → WTTJ   | **yellow `#FFCD00`** [live]                         | pastel blue/green, pale yellow [live]                                   | **warm cream `#F6F3EF`** [live] | warm, joyful, human — the warm outlier         |
| Huntr         | violet `#6A4FEB` [live]                             | sky/mint/coral/cream [live]                                             | lavender-white [live]           | playful, friendly                              |

Cool-blue center = LinkedIn / Indeed / Simplify. Breaks from it = Glassdoor
(green), Teal (teal+gold), Huntr (violet), **WTTJ (yellow on warm cream)**.

## 2. Adjacent trust + warmth products

| Product   | Primary                                            | Surface                          | Lever                                       |
| --------- | -------------------------------------------------- | -------------------------------- | ------------------------------------------- |
| Notion    | black/white [official]; brown `#9F6B53` [official] | white                            | brand recedes; the user's work is the color |
| Linear    | indigo ≈ `#5E6AD2` [flag]                          | `#F4F5F8` / `#222326` [official] | precision, restraint                        |
| Headspace | orange ≈ `#F58B44` [ref]                           | warm off-white                   | **warmth to reduce anxiety** (see below)    |
| Duolingo  | Feather Green `#58CC02` [official]                 | white                            | play, momentum                              |

**Headspace's anxiety lever:** deliberately leads with a _warm_ hue (orange), not
clinical blue — warm reads as human presence / reassurance, cool-blue reads as
institutional/detached. The 2024 rebrand widened the palette to represent a
_range_ of emotions rather than forced cheer.

## 3. White-space analysis

- **Over-indexed:** corporate cool-blue (`#0A66C2` register) + stark white
  surfaces. Reads "professional software" but also cold/transactional — the
  opposite of what a scared student needs.
- **Unowned:** warm + calm + capable _simultaneously_. Warmth exists but pulls
  playful (WTTJ/Headspace); calm-competent exists but reads cool/clinical
  (Teal/Linear). Almost nobody sits at warm + low-arousal + quietly confident.
  A **warm-tinted surface** is itself a differentiator against the wall of white.
- **Open ground (dodging corporate-blue, Claude cream+coral-orange,
  Glassdoor/Greenhouse mint):** warm neutral surface (sand / putty / oat, pushed
  greyer than butter-cream) + one grounded earthen primary (clay/ochre or deep
  muted green) + a single low-saturation cool accent for interactive elements.

## 4. Emotional requirements for a stressed job seeker

_Direction well-supported (Valdez & Mehrabian 1994; Wilms & Oberfeld 2018);
exact magnitudes softer._

1. **Low saturation.** Saturation drives arousal more than hue does — build on
   dusty/muted versions of every color; reserve high chroma for tiny CTA/success
   moments only. _(high confidence)_
2. **Warm for reassurance, cool for focus.** "Calm = cool blue" is a trap; warm
   signals human presence and lowers threat. Warm surface + warm-leaning primary
   reads "someone is helping me." _(med-high)_
3. **Reserve red (and hot-orange) for genuine errors only.** A job search is
   already full of rejection; the UI must add no ambient alarm. Muted amber for
   "attention," true red only for validation/destructive. _(high)_
4. **Calm must not become murk — protect AA.** Muted+warm palettes tend to fail
   contrast; low legibility itself raises cognitive load. Warm-dark ink for text,
   softness lives in surfaces/accents not text. _(high — a11y)_
5. **Color signals capability, not decoration.** One trusted accent that always
   means "you, moving forward / done" builds control; rainbow multi-accent
   (Huntr) increases decision load. Restraint communicates "under control."
   _(med — UX consensus)_

## Applied to the candidates (hues.js)

- **Clay** — warm putty surface + grounded terracotta primary + one deep-teal
  cool accent. The most direct hit on the vacant warm-calm-capable ground.
- **Harbor** — Teal-hq's deep-teal + warm-gold, warmed onto an oat surface
  (calm-competent without the clinical white).
- **Slate** — desaturated warm periwinkle on warm greige (the "clear head" cool
  accent that is deliberately _not_ corporate blue).
- **Dusk** (incumbent) — berry-plum on warm greige, batch-1 winner.

All bands hold WCAG AA (>=4.5:1) on both card and their own tint (hard constraint
b); rings have a low-fill floor (hard constraint a, ring.js).

## Flagged / unverified

Linear indigo `#5E6AD2`, Headspace current orange, Glassdoor greens, legacy Otta
palette, Duolingo secondary hexes — all [ref]/[flag], not pulled from live CSS.
