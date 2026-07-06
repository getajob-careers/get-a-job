---
title: Arc 2 Step 1 — Visual Direction (token proposal)
status: DRAFT — HELD FOR ELI'S REVIEW
owner: eli
last_reviewed: 2026-07-06
consumes: docs/design/ia-interaction-spec.md
artifacts:
  - docs/design/tokens/rd-tokens-step1.css
  - docs/design/visual-direction-step-1-today.html
---

# Arc 2 Step 1 — Visual Direction

> **What this is.** The IA spec settled _structure_ (the AFTER surfaces: Today · Career · CV ·
> Profile + an omnipresent coach dock). Step 1 chooses **values only** — the `--rd-*` token set
> (color, type, spacing, elevation, motion) — and applies them to **one reference surface (Today)**
> in **two base variants** for judgment. **HELD. No per-page rollout until the direction is signed.**
>
> Deliverables: this doc · the token file [`rd-tokens-step1.css`](./tokens/rd-tokens-step1.css) ·
> the Today render [`visual-direction-step-1-today.html`](./visual-direction-step-1-today.html)
> (open it — both variants render stacked).

---

## 1. The direction

**Gold/amber brand on a dark base; cream/off-white content cards against dark chrome.** The dark
chrome is the app frame (sidebar, top bar, coach dock, page background); the user's _content_ —
their fit, their roles, their CV, their pipeline — lives on warm cream cards that sit on top of it,
so the eye goes to the person's material, not the frame. Gold is the single brand accent (primary
CTA, active nav, the brand mark).

This **inverts the v1 theme** (a light cream page with **coral** as the brand primary). Two
consequences, handled deliberately in §3:

- The base flips from light to dark.
- **Coral leaves the brand role.** Coral is a red; under the hard rule (below) red is semantic-only.
  Its hue moves into `--sem-error`; v1 teal (a green) moves into `--sem-success`; the v1 `--rd-golden`
  becomes the brand primary.

## 2. Two base variants (compare in the Today render)

Both variants share the **same cream cards, the same gold ramp, and every semantic token** — only
the **dark chrome + neutral ramp** differ. So this is a base swap, not two designs; whichever wins,
everything above it is identical.

|                   | **Variant A — deep dark navy** _(recommended; Eli leans this)_                                                                                                                                                  | **Variant B — sharper near-black**                                                                           |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| base              | `#0E1526`                                                                                                                                                                                                       | `#0B0B0D`                                                                                                    |
| chrome / dock     | `#141D33` / `#1B2748`                                                                                                                                                                                           | `#141416` / `#1C1C20`                                                                                        |
| neutral ramp      | navy-tinted (cooler greys)                                                                                                                                                                                      | pure neutral grey                                                                                            |
| why it's the lean | gold reads **warmer and richer** on navy; **elevation survives** (a navy-tinted shadow + a lifted surface reads as depth, where pure black flattens); the navy-tinted neutral ramp gives text a subtle cohesion | crisper, higher-contrast, more "developer-tool" neutral; gold pops harder but shadows have less to work with |

**Recommendation: navy (Variant A).** It carries the gold better and keeps the elevation language
(cards floating over chrome) legible — which matters because the whole layout leans on cream cards
casting onto the dark frame. Black is kept as a real, one-token-swap fallback.

## 3. The hard rule — two namespaces, never mixed

> **Brand = gold + neutrals. Red and green are RESERVED for semantic meaning only** (status,
> success/error, gap severity, fit thresholds) — **never decorative.**

Enforced structurally by keeping them in **separate token namespaces** (see the token file):

- **`--rd-*`** — brand + neutral + structure. The only _hue_ here is gold. Surfaces, text, borders,
  radius, elevation, motion. Decorative.
- **`--sem-*`** — semantic. `success` (green), `error` (red), `caution` (orange), `info` (blue).
  Each has an on-cream value and an `-on-dark` value. **Meaning only.**

Two collisions handled on purpose:

1. **Brand gold vs semantic caution/warning.** A warning is usually amber, which would collide with
   the gold brand. Resolved by hue-separation: brand gold is _yellow_ (`#E7B34A`); semantic caution
   is _orange_ (`#EE8A2E` on dark). A caution chip never reads as a brand accent.
2. **Fit % / gap severity vs brand.** Fit bars use the semantic **red → caution → green** ramp
   (`--sem-fit-low/mid/high`). **Brand gold is deliberately absent from that ramp** so a strong fit
   never reads as "the brand color." Track badges are neutral/gold, **not** green — a track is a
   category ("hire-now" vs "work-toward"), not a grade, so it must not borrow success-green.

## 4. The token set (summary — full values in the CSS file)

- **Color** — per §2/§3. Brand gold ramp (`--rd-gold` / `-bright` / `-deep` / `-ink` / `-tint` /
  `-glow`); dark chrome (`--rd-bg-base/chrome/elevated/inset`); cream cards (`--rd-card` / `-2` /
  `-ink` 3 levels / `-border`); dark text (`--rd-text` 3 levels + `--rd-eyebrow`); semantic `--sem-*`.
- **Type** — display = **Rokkitt** slab serif (`--rd-display` 28 / `--rd-h1` 22 / `--rd-h2` 18),
  body = system (`--rd-body-lg` 15 / `--rd-body` 13.5 / `--rd-body-sm` 12), eyebrow 11px uppercase.
  **Every step ships its line-height AND tracking** (design-craft rule 2) — this closes the "no type
  scale, `text-[Npx]` everywhere" debt the skill flagged.
- **Spacing** — one 4px-based scale (`--rd-space-1..16`), folds the eyeballed margins into rhythm.
- **Radius** — `sm 8 / md 12 / lg 16 / xl 20 / pill`, folding the drifted `10/14/18` inline values.
- **Elevation** — depth on dark is a **lifted surface color + soft shadow + a faint top-highlight
  inset** (`--rd-elev-1/2`), plus a real drop shadow for cream cards casting on the chrome
  (`--rd-elev-card`) and a **gold glow** for the primary CTA (`--rd-elev-cta`). This is why navy is
  the lean — pure black gives the shadow less to read against.
- **Motion** — the approved set only: `--rd-motion-fast` 150ms / `--rd-motion` 200ms, ease-out.

## 5. How the Today render honors the nine rules

The reference render is wireframe-level but every design-craft rule is exercised, since Step 1's job
is to prove the tokens hold up on a real surface:

- **Rule 1 (tokens only)** — every color/space/radius/shadow in the render is a `var(--rd-*)` /
  `var(--sem-*)`; no one-off hex in the layout (the inline copy of the tokens is the same file).
- **Rule 8 (a11y)** — cream-card ink on cream meets AA; dark text on chrome meets AA; the focus ring
  is `--rd-ring` (gold); CTA is 44px tall. _This is also where SW6-contrast from the deep-qa-2 triage
  gets solved for free — the token set is AA by construction._
- **Rule 9 (honest UI)** — **every stat is captioned with its real source** (Live matches =
  `count_active_jobs_by_role_titles`; Application-in-motion = `applications`; CV made =
  `application_cvs`; Fit refreshed = `career_roles.updated_at`). The hero is the **one genuine next
  move** derived from real state — **not** a fabricated daily task (the killed Daily Action,
  IA §3.4.4). Fit bars are real percentages on the semantic ramp.
- Rules 5/6/7 (states, motion, empty/loading/error) are represented at wireframe fidelity (hover on
  CTA/nav; the pipeline's honest empty line); full per-component states come with per-page rollout.

## 6. Open gaps / what I need from you

- **⚠️ "Yishai's dark-hive theme" is not in this repo.** No branch (no Yishai-authored or `hive`/
  `theme` branch on origin), no design file, no `GetAJob Design System/` bundle on disk. I designed
  from your verbal palette direction. **To actually inventory + absorb it, point me at it** — a
  branch name, a Figma link, or the path to the design bundle — and I'll reconcile what it defines,
  what's usable, and what conflicts with this token set.
- **The values are yours to tune.** These are a coherent starting proposal, not final hex. Likely
  first adjustments: exact gold (warmth/saturation), the navy depth, and the cream warmth.

## 7. What this drives (after sign-off — NOT now)

Once you sign the direction: replace the v1 `--rd-*` values in `src/index.css` with the chosen
variant's tokens, add the `--sem-*` namespace + type/space/elevation/motion tokens, then roll out
per-page (Today → Career → CV → Profile + the coach dock), each page its own held PR, each honoring
the nine rules. The coral→semantic migration is part of that first rollout PR. **No rollout until the
direction is signed.**

---

_Arc 2 Step 1 deliverable. HELD for Eli's review. Nothing here is a decision — it's a proposal to
redline, and a base-variant choice (navy vs black) to make._
