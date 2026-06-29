---
title: CV Template Rendering — Execution Spec
status: spec
owner: shared
last_reviewed: 2026-06-29
code_paths:
  - supabase/functions/_shared/cv-templates/build-pdf.ts
  - supabase/functions/_shared/cv-templates/arimo-fonts.ts
  - supabase/functions/render-cv/index.ts
  - supabase/functions/generate-tailored-cv/index.ts
  - supabase/functions/refine-cv/index.ts
  - src/components/cv-studio/CVStudioLive.jsx
  - src/components/cv-studio/CVStudioView.jsx
---

# CV Template Rendering — Execution Spec

**Status:** Ready to execute. No code written yet. Decisions below are locked (approved 2026-06-28).

## Goal

The CV studio offers **five** templates. The downloaded PDF must **visually match the on-screen thumbnail/preview** of the selected template. Today it does not: template selection is ephemeral UI state, never sent to the renderer; `build-pdf.ts` produces ONE fixed dark-banner design that ignores template id, the `style` flag, the accent color, and the font. This spec closes that gap.

The five kept templates: **Modern Sans, Editorial, Sharp, Executive, Refined.** (Classic Serif, Minimal, Technical, Warm are dropped.)

## The pivotal architectural fact

The five templates are **not five layouts** — they are **one layout with four varying tokens**: `font`, `accent`, `labelCase`, `rule`. Source of truth: `CV_TEMPLATES` in `src/components/cv-studio/CVStudioView.jsx` + the `.cv-*` CSS in the same file (`CvStudioStyles`). The studio CSS applies them uniformly:

- `accent` colors **section labels + the rule line + bullet dots**.
- `labelCase` cases the section labels (UPPERCASE or Capitalize).
- `rule` toggles the accent-tinted horizontal underline next to each section label.
- `font` sets the whole document.
- Fixed across all five (NOT template-driven): name `#1A1A1A`, body `#33312E`, dates/headline muted `#8A8782`.

**But that shared layout is the studio's clean white page — which `build-pdf.ts` does not currently render** (it renders a dark slate banner, Arimo-only, slate labels, 2-column skills grid). So the work shape is: **re-implement the studio's clean layout in pdf-lib ONCE, parameterized by the four tokens** → all five templates then fall out of the same renderer with five config rows. This is one renderer rebuild + five small configs, not five designs.

## 1. Spec table (the on-screen CSS IS the spec)

| Template        | id          | Font (CSS spec)             | Accent (labels/rule/dots) | Label case     | Rule line |
| --------------- | ----------- | --------------------------- | ------------------------- | -------------- | --------- |
| **Modern Sans** | `modern`    | Inter, sans                 | `#C2603F` terracotta      | UPPERCASE      | off       |
| **Editorial**   | `editorial` | Georgia, serif              | `#1F3A5F` navy            | UPPERCASE      | **on**    |
| **Sharp**       | `sharp`     | Arial/Helvetica, sans       | `#0F766E` teal            | UPPERCASE      | off       |
| **Executive**   | `executive` | Times New Roman, serif      | `#6D213C` burgundy        | UPPERCASE      | **on**    |
| **Refined**     | `refined`   | Garamond/EB Garamond, serif | `#14532D` green           | **Capitalize** | **on**    |

**Shared layout the PDF must reproduce** (from the studio document, all five identical):
white page; name 28px bold (`#1A1A1A`); headline 14px muted; mid-dot contact row; sections = accent label (cased) + optional accent-tinted rule line; entries = bold _title · org_ left, muted dates right-aligned; bullets with accent dots; **skills as a single mid-dot (`·`) line** (the preview's form — NOT the current PDF's 2-column grid); languages as a mid-dot line.

**Token-path coverage:** Modern Sans + Sharp are `rule:off` + UPPERCASE. The **rule-line** path is first exercised by Editorial/Executive; the **Capitalize** path is first exercised by Refined. Both paths must be implemented in infra but get their first visual proof on those templates.

## 2. Font reality + bundling mechanism

**Mechanism:** font bytes are base64-baked into a `<family>-fonts.ts` module under `supabase/functions/_shared/cv-templates/` and embedded via fontkit. Reference: `arimo-fonts.ts` (≈0.4 MB base64 for 4 weights), imported by `build-pdf.ts` and embedded with `pdfDoc.embedFont(BYTES, { subset: true })` after `pdfDoc.registerFontkit(fontkit)`. Each family needs **4 weights**: regular, bold, italic, bold-italic.

| Template    | Spec font              | License            | Action                                                  | Bundle  |
| ----------- | ---------------------- | ------------------ | ------------------------------------------------------- | ------- |
| Sharp       | Arial/Helvetica        | proprietary        | **already bundled** — Arimo (Apache, Helvetica-metric)  | $0      |
| Modern Sans | Inter                  | OFL (free)         | embed Inter (real font)                                 | ~0.4 MB |
| Editorial   | Georgia                | proprietary        | **substitute Gelasio** (OFL, metric-compatible Georgia) | ~0.4 MB |
| Executive   | Times New Roman        | proprietary        | **substitute Tinos** (Apache, metric-compatible Times)  | ~0.4 MB |
| Refined     | Garamond / EB Garamond | EB Garamond is OFL | embed **EB Garamond** (already CSS fallback)            | ~0.4 MB |

**Substitutions are APPROVED:** Georgia→Gelasio, Times→Tinos, Arial→Arimo. Inter and EB Garamond are the real named fonts (no substitution).

**Bundle impact:** +~1.6 MB for the four new families (Sharp reuses Arimo). Tolerable for an edge bundle. If it grows uncomfortable later, the alternative is fetching TTFs from Supabase Storage at cold start (smaller bundle, +latency); for v1 use base64-bundle to match the existing pattern.

## 3. Cross-consumer decision (LOCKED)

`buildCvPdf` (in `build-pdf.ts`) is shared by **render-cv, generate-tailored-cv, and refine-cv** (also `generate-tailored-cv/reconcile.ts`). Changing its layout changes the auto-rendered `cv_url` those produce.

**Decision (approved):** **retire the dark-banner design entirely.** Default `generate-tailored-cv` and `refine-cv` to **Modern Sans** so there is one design language everywhere. Understood and accepted that this restyles ALL auto-rendered CVs. The 68 existing `application_cvs.cv_url`s are dark-banner and will re-render to Modern Sans on the next download (render-cv re-renders `cv_data` on demand).

## 4. Staged build plan

### 4a. Infrastructure (front-loaded; the bulk of the effort)

1. **Template-id plumbing:** `CVStudioLive.onDownload` adds `template: templateId` to the render-cv body. Today `templateId` is ephemeral `useState("modern")` (CVStudioLive ~line 50), passed only to `CVStudioView` for the on-screen render — never sent, never persisted. → `render-cv/index.ts` reads `template` from the body → maps id to a config → passes to `buildCvPdf`.
2. **Renderer rebuild:** re-implement the studio's clean-white layout in `build-pdf.ts`, parameterized by the four tokens: select the embedded font family per template; use `accent` for section labels + rule + bullet dots (today the accent is computed at `build-pdf.ts:843` then never used to draw); honor `labelCase` (UPPERCASE/Capitalize) and `rule` (on/off); render skills as the preview's inline mid-dot line. Retire the dark banner.
3. **Font registry:** a map `templateId → { fontFamily weights, accentHex, labelCase, rule }`; add the new `inter-fonts.ts`, `gelasio-fonts.ts`, `tinos-fonts.ts`, `ebgaramond-fonts.ts` modules (Arimo already present for Sharp).
4. **Default auto-render path:** set generate-tailored-cv / refine-cv to pass the Modern Sans config to `buildCvPdf`.
5. **Verification harness (built HERE, in infra — see §6).** It is a deliverable of infra, not an afterthought.

### 4b. First template: Modern Sans → prove WYSIWYG end to end

Build the clean-white layout to match the **Modern Sans** thumbnail exactly (Inter, terracotta `#C2603F`, UPPERCASE, rule off). **Modern Sans does not count as done until the verification harness confirms PDF == preview** (see §5). This proves the whole pipeline: plumbing + renderer + font embed + harness.

**Why Modern Sans first:** it is the studio default (`useState("modern")`), one of the five, and uses the cleanly-licensable Inter. (Note: "classic" is NOT among the five and is being dropped; the studio default is `modern`; all existing PDFs are the retired dark-banner, so there is no classic-rendered artifact to preserve.)

### 4c. The remaining four (config-row additions)

The renderer is shared, so each addition is **font module (if new) + one config row + a harness pass** — no new layout code, except the two token-paths first proven here.

| Template      | Work                                                                                                         | Cost                       |
| ------------- | ------------------------------------------------------------------------------------------------------------ | -------------------------- |
| **Sharp**     | font already bundled (Arimo); config (teal, UPPERCASE, rule off); harness pass                               | smallest — config + verify |
| **Editorial** | add `gelasio-fonts.ts`; config (navy, UPPERCASE, **rule on**); **first rule-line proof**; harness pass       | small + rule-path proof    |
| **Executive** | add `tinos-fonts.ts`; config (burgundy, UPPERCASE, rule on); harness pass                                    | small                      |
| **Refined**   | add `ebgaramond-fonts.ts`; config (green, **Capitalize**, rule on); **first Capitalize proof**; harness pass | small + casing proof       |

## 5. The "for real" bar

A template is **real / done** only when the verification harness confirms the downloaded PDF page-1 **visually matches the on-screen studio preview** for the same `cv_data`: same font character, same accent on section labels/rule/bullet dots, correct label casing, rule present/absent correctly, same clean-white single-column layout (incl. inline skills line). **No template counts as done until the harness confirms PDF == preview — Modern Sans included.**

## 6. Verification-harness design (infra deliverable)

Build as part of 4a (extend `scripts/test-pdf-poc.mjs` / `scripts/validate-cv-deploy.ts`; an `render-cv-eyeball` script was already started). Per template, for one fixed sample `cv_data`:

1. **Preview capture:** Playwright-screenshot the studio `.cv-doc` preview at A4 width.
2. **PDF render:** render via `render-cv` (or `buildCvPdf` directly) for the same `cv_data` + template; rasterize page 1 (`pdftoppm` or pdf.js).
3. **Compare:** side-by-side output for human eyeball **plus** automated gates:
   - sample the accent pixel at a known section-label location → equals the template's accent hex;
   - detect the rule line's presence/absence → matches `rule`;
   - assert label casing → matches `labelCase`;
   - confirm serif/sans font character.
     Gate each template on these checks.

## Deployment notes

- `render-cv`, `generate-tailored-cv`, `refine-cv` are deployed edge functions — each needs a **manual** `supabase functions deploy <slug> --project-ref ilmqmodklutztuybsvwd` after merge. They do NOT auto-deploy. All three change here (shared `build-pdf.ts` + new font modules + the Modern Sans default).
- No DB/migration changes. Auth and the rate-limit RPC are untouched.
- New font modules live under `supabase/functions/_shared/cv-templates/` so they bundle into every consumer at deploy.

## Open confirmations resolved (2026-06-28)

- Retire dark-banner, default auto-render to Modern Sans: **approved.**
- Font substitutions (Georgia→Gelasio, Times→Tinos, Arial→Arimo; Inter + EB Garamond real): **approved.**
- Verification harness built in infra and gates Modern Sans as done: **required (this spec).**

## Premium typography upgrade (2026-06-29)

The five templates now share a **premium typography variant**, gated per-template via
`TemplateRender.premium` in `template-config.ts` (every premium branch in `build-pdf.ts`
falls back to the prior values when `premium` is false, so a non-premium template would
render byte-identical). All five set `premium: true`. What premium adds:

- **Header:** name 30pt, headline 12.5pt muted, contact 9.5pt muted, plus a full-width
  0.75pt hairline rule under the contact row.
- **Section headings:** monochrome near-black (`#1A1A1A`), heavier tracking, each followed
  by a **full-width 0.75pt rule, margin-to-margin** (the dominant "designed" signal).
- **Role hierarchy:** bold role title on its own line (date right-aligned on that line),
  company/org on its own line in italic muted. Date-only (cv_data has no per-entry
  location).
- **Rhythm:** ~1.25 body line-height, 16pt between entries.
- **Accent** is used ONLY as the bullet dot (the quiet per-template signature).

**Distinctness (4 fonts, 5 templates):** Classic (id `modern`, renamed from "Modern Sans")
= Gelasio + UPPERCASE + coral. Editorial = Gelasio + **Title-Case** + navy (the Title-Case
is the one trait separating it from Classic). Sharp = Arimo sans + UPPERCASE + teal.
Executive = Tinos + UPPERCASE + burgundy. Refined = Cardo + Title-Case + green.

**Punctuation fallback:** the Latin font subsets omit some general-punctuation glyphs
(`U+2013` en dash, smart quotes, ellipsis). The sanitizer now degrades these to ASCII
(en/em dash → `-`) instead of dropping them, which previously swallowed date-range
connectors ("2023 – Present" → "2023 Present"). Only a fallback: if a future re-subset
includes the real glyph it is kept.

## Uniform scale-to-fit (2026-06-29)

The renderer **always fits the whole CV on one page and never cuts content.** (This
replaced first a "shrink-to-floor then drop trailing content" approach — which cut a real
education entry — and then a two-tier comfortable/dense experiment whose hand-tightened
dense gaps collided with the unscaled fonts and produced overlap. Both discarded.)

There is **ONE layout** (the airy `COMFORTABLE` premium preset) and **one fit variable: a
single uniform scale.** To fit a longer CV, `buildCvPdf` multiplies the _entire_ layout —
header sizes/gaps AND every section/entry/bullet size, leading, and gap — by one
`ctx.scale` (`s(ctx, x) = x * scale`). Because everything shrinks by the same factor, all
spacing relationships are preserved and lines/sections **can never overlap**; the page just
gets smaller. There is no second set of spacing values to collide.

The fit finds the largest scale ≤ 1 where `header + sections ≤ page content area`, via a
short fixed-point (measured wrap depends on scale, so we measure at the scale we'll draw).
**No floor**: an unusually long CV simply renders at a smaller scale — a smaller-but-complete
CV always beats a cut one. **No cutting, ever**; no "trimmed"/"dropped" path; no "too long"
error.

`buildCvPdf` returns `{ bytes, fit }` with `fit = { scale, dense, lowestY }`. `dense`
(scale < `DENSE_HINT` 0.72) only lets the studio offer an OPTIONAL, calm, dismissible hint
("This CV is dense — you can trim items if you'd like more breathing room") — never an
error, never implying anything was dropped; default no notice.
`scripts/cv-harness/fit-gate.mjs` asserts every fixture (light, heavy, monster) fits one
page, is complete (probe tokens all present), never clips, and exposes no cut/trim fields.

**Skills by group + education order.** Skills render **by their stored groups** (the data
is already `{ domain, technical, tools }`) as compact labeled lines — `Core Competencies:`
(domain), `Technical:`, `Tools:` — skipping empty groups; the raw keys never show. The
groups pack densely (body line-height, small inter-group gap) since it's reference info.
Education renders **reverse-chronologically** (most-recent first, "Present" ranks highest)
so a university sits above earlier schooling regardless of stored order.
