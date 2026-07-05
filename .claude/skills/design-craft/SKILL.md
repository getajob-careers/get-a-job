---
name: design-craft
description: getajob design bar. Auto-use on ANY edit touching .jsx, .css, or Tailwind classes. Enforces token-only styling, type/spacing discipline, component reuse, complete interaction + empty/loading/error states, subtle motion, WCAG-AA accessibility, and honest UI. Stops the platform looking vibe-coded.
---

# design-craft (the getajob design bar)

Apply on every edit that touches `.jsx`, `.css`, or Tailwind classes. Nine rules, all mandatory. When an edit violates a rule, fix it or flag it explicitly. Do not ship the violation silently.

## v1 tokens (de-facto, extracted 2026-07-05 from src/index.css + tailwind.config.js)

REPLACE these VALUES at Arc 2 Step 1 when the visual direction is chosen. The RULES below outlive any value change; that same extraction feeds Arc 2 Step 1.

- Color (source of truth = 23 `--rd-*` CSS vars, used via `bg-rd-*` / `text-rd-*` / `border-rd-*`):
  - surfaces: `--rd-bg-page #FAF6F0`, `--rd-bg-card #FFFFFF`, `--rd-bg-sidebar #EFE7DB`, `--rd-bg-soft #F3ECE0`
  - border: `--rd-border #F0E7D8`, `--rd-border-subtle #EDE7DD`, `--rd-border-hover #E0D6C4`
  - text: `--rd-text #211D18`, `--rd-text-secondary #6E675B`, `--rd-text-tertiary #5E584E`, `--rd-text-eyebrow #766445` (AA-tuned, #478)
  - coral (primary): `--rd-coral #D6421F`, `--rd-coral-dark #B23A17`, `--rd-coral-tint #FCE6DF`
  - teal: `--rd-teal #54B5A2`, `--rd-teal-dark #2A6E5E`, `--rd-teal-tint #DBEEE8`
  - golden: `--rd-golden #EFB23E`, `--rd-golden-dark #7A5408`, `--rd-golden-tint #FBEBC9`; peach: `--rd-peach #E79B7D`
- Radius: `--radius: 0.5rem` gives `rounded-lg/md/sm`. KNOWN DRIFT: `rounded-[10px]/[14px]/[18px]` are scattered inline; treat as debt to fold into the scale.
- Shadow: `--rd-shadow` gives `shadow-rd` (the only elevation token today).
- Type: display = Rokkitt slab serif (headings); body = system stack. THERE IS NO DEFINED TYPE SCALE YET: `text-[11.5px]/[10px]/[13.5px]` are rampant. A real scale (with paired line-height + tracking) is Arc 2 Step 1; until then, flag ad-hoc `text-[Npx]` and prefer the nearest Tailwind step.
- Motion: no tokens defined. Approved set = 150ms and 200ms with ease-out, via `transition-colors` / `transition` only.

## The nine rules

1. TOKENS ONLY. Colors, spacing, radii, shadows come from the scale (`rd-*`, `rounded-*`, `shadow-rd`). No one-off hex, no arbitrary px, no Tailwind arbitrary-value brackets, UNLESS the token genuinely does not exist, in which case PROPOSE adding the token rather than inlining a value.
2. TYPOGRAPHY DISCIPLINE. Use the type scale; no ad-hoc `text-[17px]`. Line-height and letter-spacing come with the step, not improvised.
3. SPACING RHYTHM. One spacing scale; consistent vertical rhythm between sections; no eyeballed margins.
4. REUSE BEFORE CREATE. Check for an existing button/card/badge variant before writing a new one. A genuinely new variant goes into the SHARED component, never inlined.
5. INTERACTION STATES ARE MANDATORY. Every control has hover, focus-visible, active, and disabled. Missing any of the four is incomplete.
6. MOTION IS SUBTLE AND PURPOSEFUL. Transitions from the approved set (durations + easings above). No gratuitous animation on the core loop.
7. EMPTY, LOADING, AND ERROR STATES ARE DESIGNED, not defaulted. Every data surface has all three.
8. ACCESSIBILITY FLOOR. WCAG AA contrast via the tokens, visible focus, touch targets 44px minimum. Carried from #478.
9. HONEST UI. No fabricated progress stages, no fake precision. Carried from #482 (truthful Studio stage) and #483 (honest ~80s refresh).
