---
owner: eli
last_reviewed: 2026-07-21
status: PLAN - held for ruling (not yet building)
code_paths:
  - src/components/cv-studio/CVStudioView.jsx
  - src/components/cv-studio/CVStudioLive.jsx
  - src/components/redesign/home/ThreeTabHome.jsx
  - supabase/functions/refine-cv/index.ts
  - supabase/functions/generate-tailored-cv/index.ts
  - supabase/functions/render-cv/index.ts
---

# CV RED - document restyle + generation theater (PLAN)

The flag-on (`NEXT_DESIGN`) restyle of the CV tab's **document surface** and its
**generation experience**. Batch D aligned the CV-tab chrome end to end (rail,
treatment-B header, collapse-to-strip Templates, Generate CV everywhere). CV RED
is the last piece: the editable document itself, its empty-state ladder, the
final chrome cleanup, and honest generation theater.

**This is a plan held for Eli's ruling.** It builds nothing. Its four open
questions are Eli's parked rulings; each has a recommendation and the tradeoff.
Nothing gets built until they are ruled.

---

## Ground truth (from the architecture map, all file:line verified)

- **The document is a paper sheet today.** `CVStudioView.jsx:970`  - 
  `.cv-doc max-w-[720px] mx-auto bg-white rounded-[6px] shadow-rd border px-12 py-11`,
  inside a `<main … bg-rd-bg-page>` scroll column. All visual identity lives in
  ONE `<style>` block (`CvStudioStyles`, `CVStudioView.jsx:1415-1445`: the
  `.cv-*` rules) + the `docStyle` CSS vars (`:638-645`). A restyle is almost
  entirely that block + the sheet wrapper.
- **The on-screen document and the exported PDF are SEPARATE renderers.** There
  is no jsPDF / html2canvas / print in the client. Download posts `cv_data` +
  `templateId` to the **`render-cv` edge function** (`CVStudioLive.jsx:924-963`),
  which renders the PDF server-side. **Restyling the on-screen sheet does not
  change the PDF**, and the sheet is not a literal preview of it. This is the
  crux of OQ1.
- **Writes: uncontrolled contentEditable, onBlur commit.** The `Editable`
  primitive (`CVStudioView.jsx:183-226`) seeds once on mount and commits on
  `onBlur` via `ref.current.innerText` → a per-field handler
  (`onPatchHeader/Summary/Exp/Bullet/Edu/Cert/Project/Skills/Languages`) →
  `update()` + `persist()` (800ms debounced save-pill) + on the master a
  write-through to the source row + an undo entry. The doc re-seeds via a
  `key={selectedCvId:editVersion}` remount (`CVStudioLive.jsx:1472`).
- **The commits are class/markup-independent (SAFE). Five structural couplings
  are the restyle risk** (see the survival section): the `group/*` hover
  wrappers (Revise/remove/delete reveal), `data-entry-id` (drag + auto-focus),
  the `@hello-pangea/dnd` ref/prop spreads + `provided.placeholder`,
  one-contentEditable-node-per-field, and the `editVersion` remount contract.
- **Generation progress today is a `setTimeout` fabrication.** `runTailor`
  (`CVStudioLive.jsx:1154`) calls **`refine-cv` - a single blocking call, no
  streaming, no events**. The "Reading → Reframing → Rendering" banner is
  hardcoded `setTimeout` labels (`startStages`, `:1126-1146`); a code comment
  says so outright (`CVStudioView.jsx:819`). The master-build skeleton
  (`CvGenerationProgress`) is likewise timer-driven.
- **A real `{done,total,stage}` contract exists but nobody reads it.**
  `generate-tailored-cv` emits `cv_generation_progress` rows
  `{user_id, application_id, done, total, stage}` (stages
  `authoring/assembling/rendering/done/error`) - **only when the `cvFanout`
  flag is on**, and **zero `src/` code reads that table**. So the honest
  contract is emitted by an engine the Studio does not call, consumed by no one.
- **Chrome minimize is already done flag-on.** The CV Agent panel is the
  `!rightRail` branch (`CVStudioView.jsx:1308-1409`); flag-on it is replaced by
  `CvMatchedRolesRail` (`ThreeTabHome.jsx:101`). The tailoring entry already
  relocated to the doc-top header ("Generate a job-specific version",
  `:912-925`); Revise relocated per-piece. The panel + its "Tailor to a job"
  chip only render flag-off (`/CVAgent`).

---

## The four open questions (Eli's rulings)

### OQ1 - Document surface: paper sheet vs borderless canvas

The honesty problem first: the sheet is **not** a WYSIWYG preview of the PDF  - 
they are different renderers. Whatever we choose must not over-promise.

- **A. Paper sheet (refined).** Keep the white page; make it feel like a real
  document. Pro: familiar, "this is my CV," strong craft ceiling. Con: it
  implies WYSIWYG the decoupled `render-cv` does not honor (fonts/spacing/line
  breaks differ). To be honest it needs a "preview - download for the final PDF"
  cue, OR we invest in tuning the sheet to match `render-cv` closely (larger
  scope, ongoing drift risk).
- **B. Borderless canvas.** The document content floats on the canvas surface,
  no page frame. Pro: reads as an **editor**, not a document - honest about the
  screen being a working surface, download for the artifact. Fits the canvas
  language of the rest of the redesign. Con: loses the reassuring "this is a
  real CV" moment; the empty document reads as less finished.
- **Recommendation: B (borderless canvas) with a small "download for the final
  PDF" affordance**, OR A explicitly labelled as a preview. Given `render-cv`
  decoupling, a pixel-proud paper sheet is a design-craft rule-9 honesty risk
  (fake WYSIWYG). B sidesteps it and matches the canvas. **Ruling needed:** A or
  B, and if A, do we accept "close preview" or commit to matching `render-cv`.

### OQ2 - Empty-state ladder: canvas treatment

Four full-surface gates (`CVStudioLive.jsx:1408-1454`): (1) signed-out, (2)
list-loading spinner, (3) no-master - sub-states **building** (the CV-shaped
skeleton) and **idle** ("No master CV yet" + "Build my master CV"), (4)
row-loading spinner. Plus in-document contextual states (tailoring banner,
outcome card, no-JD overlay, per-field placeholders).

- Today these are centered-text/spinner gates on `bg-rd-bg-page`. On the new
  surface they should read as **the same canvas**, not a different screen: the
  empty/loading states occupy the document region with canvas-consistent
  treatment (the paper sheet or the borderless canvas from OQ1), so moving from
  "no master" → building → editing is one continuous surface, not three
  different-looking screens.
- **Recommendation:** a single canvas-consistent empty/loading treatment that
  inherits OQ1's decision (skeleton and idle states sit in the same doc frame
  the editor uses). **Ruling needed:** confirm the ladder rides OQ1's surface
  (vs. a distinct empty-state visual language).

### OQ3 - Chrome minimize: execution

**Flag-on this is essentially done**: the CV Agent panel is already replaced by
the rail, tailoring relocated to the doc-top "Generate a job-specific version"
header, Revise relocated per-piece. The panel + its "Tailor to a job" chip only
render flag-off (`/CVAgent`).

- **Recommendation:** treat OQ3 as _confirm + guard_, not new build: (a) verify
  no flag-on tailoring/edit doorway is orphaned (the rail's Generate CV + the
  doc-top header are the two doorways; PieceRevise is the edit doorway); (b)
  leave the flag-off `/CVAgent` panel byte-identical (it is the current live
  product). **Ruling needed:** do we also retire the panel flag-OFF (a live
  `/CVAgent` change, out of the flag), or keep flag-off as-is and let the
  flag-on standard be the target? Recommend keep flag-off as-is.

### OQ4 - Generation theater: staged checklist + real-progress ring

The load-bearing #546-class decision, because a "real-progress ring" with no
real events is exactly the dishonest-UI failure (design-craft rule 9).

Per the earlier ring-contract ruling: the ring fills **only on real backend
events** (`{done, total, stage}`, stages
`starting/authoring/assembling/rendering/done/error`), with an **honest staged
checklist fallback** when events are absent, and **the CV lane owns the
emission** - I design against the contract, I do not build backend emission.

The reality that forces the ruling: **the tailoring path (`refine-cv`) emits
nothing; the only live emitter is `generate-tailored-cv` (fanout-flagged,
unread).** So the ring needs a live source wired before it can be honest. Three
ways to get one, in ascending backend cost:

- **(a) Point the ring at the existing contract.** Make the tailoring path use
  `generate-tailored-cv` + `cvFanout` (it already writes `cv_generation_progress`
  by `user_id`) and add a client **poller** that fills the ring on the real rows.
  Stages already match. Cost: routing tailoring through the fan-out engine (CV
  lane) + a poller (design lane). Cleanest honest ring; depends on the CV lane
  turning fanout on for tailoring.
- **(b) Add a progress contract to `refine-cv`.** Emit `cv_generation_progress`
  (or SSE) from `refine-cv` so the current tailoring path reports honestly. Cost:
  backend work in `refine-cv` (CV lane).
- **(c) Ship the honest fallback now, ring later.** A **staged checklist** with
  only the signals we truly have (request sent → response received → done - 3
  honest ticks, no fake per-section granularity), and the count-up ring wired to
  the `{done,total,stage}` contract but **dormant until (a)/(b) lands**, at which
  point it fills for real. No fabricated stages in the meantime.
- **Recommendation: design the ring + checklist against the contract now (c),
  and light the ring up via (a)** when the CV lane enables fanout for tailoring  - 
  the contract + stages already exist. The plan's deliverable is the honest UI
  (checklist fallback + contract-driven ring), NOT backend emission. **Ruling
  needed:** confirm (c-then-a); and whether the design lane may add the _poller_
  (read-only, consumes the CV lane's rows) or that too is CV-lane-owned.

---

## Write-wiring survival (#546-class) - how each path survives the restyle

The commits are class/markup-independent; the restyle must preserve five
couplings. Per path:

| Write path                        | Commit mechanism                                       | Survives the restyle if…                                                                                                                                                          |
| --------------------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| contentEditable text              | `Editable` onBlur → `ref.innerText` → patch handler    | each field stays a **single contentEditable node** (do NOT wrap the editable text in styled child spans); restyle via `.cv-*` classes only                                        |
| save-pill                         | pure `saveState` prop (800ms debounced `persist`)      | no change needed - prop-driven, DOM-independent                                                                                                                                   |
| Undo                              | `undoStackRef` + `editVersion` remount                 | keep Editable **uncontrolled + seeded on mount**; keep the `key={cv:editVersion}` remount contract - do not controlled-ify the fields                                             |
| Revise / PieceRevise              | `onRevisePiece` → merges via the normal patch handlers | preserve the `group/piece` (summary) + `group/bullet` (bullet) hover wrappers and the flex sibling order (dot · Editable · Revise · remove); the reveal is `group-hover/*`-driven |
| drag-reorder                      | `@hello-pangea/dnd` `onDragEnd` → `reorderExperiences` | preserve `data-entry-id` on entry wrappers, the `Draggable`/`Droppable` ref + prop spreads, and `provided.placeholder`                                                            |
| add / remove bullet, delete entry | `onAddBullet`/`onRemoveBullet`/`onDelete*`             | preserve `group/bullet` · `group/entry` · `group/edu` for the hover-revealed X/trash; commits are class-independent                                                               |

Also preserve: the auto-focus effect queries `[data-entry-id] [contenteditable="true"]`
(`CVStudioLive.jsx:201`) - keep both attributes on the restyled markup.

**Design rule for CV RED: restyle by editing the `.cv-*` `<style>` block +
`docStyle` + the sheet wrapper; do not restructure the editable field markup,
the `group/*` wrappers, the dnd spreads, or `data-entry-id`.** Visual change,
structural stasis.

---

## Verification (cold-load on the real route - my own, before Eli sees it)

Per the #546 lesson, unit tests + typecheck are not enough for
which-effect-writes-what changes. Before any CV RED PR reaches Eli:

1. **Cold-load `/Home?tab=cv` flag-on with a warm react-query cache + a real
   master CV** (the exact #546 failure mode) and drive every write path on the
   restyled document: edit a bullet (blur → save-pill "saving"→"saved" →
   master write-through), Undo it, Revise a piece, drag-reorder a role,
   add + remove a bullet, add + delete an entry. Each must commit and persist.
2. **Flag-off byte-identity**: `/CVAgent` and `?next=0` unchanged.
3. **Generation**: trigger a tailor; confirm the checklist shows only honest
   signals (and, once the contract is live, the ring fills on real
   `cv_generation_progress` rows) - never a fabricated stage.

---

## Phasing (each a held PR, standing gates, preview + guide)

- **Phase 0 - this plan.** Held for the four rulings.
- **Phase 1 - document restyle** (OQ1 surface): visual only, all five couplings
  preserved, cold-load-verified. No write-path change.
- **Phase 2 - empty-state ladder** (OQ2): canvas-consistent gates + contextual
  states.
- **Phase 3 - generation theater** (OQ4): honest staged checklist + the
  contract-driven ring (dormant → live when the CV lane enables fanout for
  tailoring); OQ3 chrome confirm folds in here or Phase 1.

Nothing starts until OQ1–OQ4 are ruled.
