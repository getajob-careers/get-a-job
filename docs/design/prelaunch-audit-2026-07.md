# Pre-launch motion / perf / a11y audit - flag-on surfaces (2026-07)

**Scope:** static, read-only audit of the Launch-1 flag-on surfaces to shorten the
design lane's final pass. **No code was changed.** Surfaces: onboarding V2
(`OnboardingV2` + `components/onboarding/*`), Home dashboard + canvas shell chrome
(`redesign/shell/*`), the jobs feed / Browse+Tracker (`components/jobs/*`, which
renders in **Career** via `UnifiedJobsFeed -> JobsSearchTab`, not Home), and the CV
studio (`components/cv-studio/*`) + Career.

Findings are ranked BLOCKER (fix before launch) / SHOULD (fix or accept as a
launch decision) / NICE (polish). File:line evidence is cited so the design lane
can go straight to each. The design lane owns these surfaces; this is findings only.

---

## BLOCKER

### B1. Resume-upload dropzone is keyboard-inaccessible (the first action of new-signup V2)

`src/components/onboarding/StepResumeUpload.jsx:571-594` - the dropzone is a plain
`<div className="... cursor-pointer">` with `onClick={() => inputRef.current?.click()}`
that triggers a **hidden** `<input type="file" className="hidden">` (line 606-612).
It has **no `role`, no `tabIndex`, no `onKeyDown`**, so a keyboard or screen-reader
user cannot open the file picker at all. This is the primary, load-bearing action
of the new signup flow the flip turns on. WCAG 2.1.1 (Keyboard). Fix: make the
trigger a real `<button>` (or wrap the input in a `<label>`), keep the drag-drop on
the div. Verify a keyboard-only path to the same upload exists (there is a
text-paste `emptyTextMode`, but the file upload itself must be reachable).

---

## SHOULD

### S1. Dialogs have no focus management (trap / initial focus / return); two have no Escape

`JobDetailModal.jsx:146-157`, `CanvasMobileRail.jsx:61-91` (coach sheet),
`JobsSearchTab.jsx:494-546` (mobile filter drawer). All set
`role="dialog" aria-modal="true"` but none (a) move focus into the dialog on open,
(b) trap Tab, or (c) return focus to the trigger on close - keyboard/SR users Tab
into the page behind the open dialog and lose their place on close. `JobDetailModal`
is best (has Escape + body-scroll-lock, lines 100-108); the **mobile coach sheet and
the filter drawer have no Escape handler** (scrim-click is the only dismiss).
`AgentDrawer.jsx` (shell-mounted) shares the same gap. The Escape+dialog pattern
already exists in the codebase, so trap/return is the missing piece. WCAG 2.4.3 / 2.1.2.

### S2. Job card `role="button"` nests real interactive controls

`JobGridCard.jsx:258` - the card is `<div role="button" tabIndex={0} onClick onKeyDown>`
and contains `<button>`/`<a>` action controls (Generate CV / Apply / Track, lines
386-441) plus the interactive `ScoreRing`. Interactive content nested inside a button
role is invalid and produces confusing SR output ("button, button..."). The card's own
Enter/Space handling is correct; the nesting is the issue. WCAG 4.1.2. Fix: card as a
non-button container with a stretched-link title, controls as siblings.

### S3. CV-studio inline-edit fields lack an accessible name/role

`src/components/cv-studio/CVStudioView.jsx:214-224` - the reusable inline editor is a
bare `contentEditable` with `suppressContentEditableWarning` and a CSS `data-ph`
placeholder, but **no `role="textbox"`, no `aria-label`, no `aria-multiline`**. It is
keyboard-editable (operable), but a screen reader announces a generic editable region
with no name - the user can't tell it's the title vs company vs a bullet. WCAG 4.1.2.
Fix: add `role="textbox"` + an `aria-label` derived from the field (title/company/bullet).

### S4. Whole-corpus synchronous scoring on the main thread

`JobsSearchTab.jsx:174-181` - the flag-on feed fetches the entire active-IL corpus
(~4,200 rows, `CORPUS_SELECT`) and runs `scoreJobFit` over every row in a `useMemo`.
It is correctly memoized (deps: corpus/profile/experiences/educations, not facets),
but progressive loading runs it **twice** (at the 1,000-row first page, then full
corpus), each an O(n) synchronous JS pass - a realistic multi-hundred-ms main-thread
block on first paint / profile change. Not a correctness bug; the biggest jank risk in
scope. Verify the pass time on a mid-tier device; a chunked / idle-time score removes it.

### S5. `--rd-text-tertiary` is knowingly sub-AA and used for live text

`src/index.css:110` - `--rd-text-tertiary: #a6957f`, self-documented "sub-AA":
~2.5:1 on the card (`#fffcf4`), worse on `--rd-bg-soft` (`#ece0c9`) - below AA (4.5)
and AA-large (3.0). It renders real content: card meta chips
(`JobGridCard.jsx:359` - seniority/salary/posted date), `ScoreBreakdown` axis numbers
(`ScoreRing.jsx:55`), quick-tile meta. Confirm this is an accepted-risk tier, not an
oversight. (`--rd-text-secondary` `#7b675c` is the AA-min-fixed token and is used for
the company/location line - that pairing is fine.)

### S6. Interactive ScoreRing breakdown is mouse-only (mitigated)

`ScoreRing.jsx:116-127` - the `interactive` ring opens the Skills/Experience/Seniority
legend via `onMouseEnter`/`onClick` on a bare `<span>` (no `tabIndex`/`role`/key
handler), so keyboard users can't open it. **Mitigated** because `JobDetailModal`
(lines 259-266) shows the same `ScoreBreakdown` by default, so the data isn't
unreachable. SHOULD, not BLOCKER.

---

## NICE

### N1. Home progress-ring transition ignores reduced-motion

`Home.jsx:619` - inline `style={{ transition: "stroke-dasharray .35s ease-out" }}`
on the "today's moves" ring animates on every data change regardless of
`prefers-reduced-motion`. The one motion in scope that ignores the preference.

### N2. Reduced-motion is per-class, with no global fallback

`src/index.css` gates motion in three targeted `@media (prefers-reduced-motion: reduce)`
blocks (`rd-lift-hover` 352, `rd-press` 387, `cx-reveal`/`cx-*` 426+) plus per-component
guards. There is **no global `* { animation/transition: none }` reset**, so any future
animated element that doesn't use one of the gated classes silently ignores the
preference (N1 is exactly this). Consider a global reduced-motion fallback so new
motion is safe-by-default.

---

## Strengths (verified clean - no action)

- **Onboarding V2 motion is exemplary:** `SpringboardScreenV2` promotes the arrival to
  an **anime.js timeline that is code-split (dynamic import on mount)** and **fully
  static under reduced-motion** (the CSS keyframe self-disables, the JS timeline is
  skipped) with a graceful fallback if anime is slow/fails (`SpringboardScreenV2.jsx:12-45`).
  The launch button has a focus-visible ring + 44px min target (line 123).
- **CV studio a11y hygiene is good:** icon-only buttons are labeled throughout (Revise
  with AI, Drag to reorder, Delete experience/bullet/CV, template expand/collapse, Send
  message - `CVStudioView.jsx`), and `CvGenerationProgress` announces status via
  `aria-live="polite"` + `aria-label` (61-62). Drag-reorder uses a DnD library with
  keyboard support (verify the keyboard reorder path in a manual pass).
- **Motion gating elsewhere is thorough:** `useCountUp` (27) and `ScoreRing` draw-in
  (82, 161) short-circuit to the final value under reduced-motion; `JobDetailModal`
  enter/exit is gated (58); all `cx-*` shell animations have explicit resets
  (`index.css` 426/481/508, `toolkit.css` 84); tab/sort pills use `motion-reduce:transition-none`.
  Hover-reveal actions also fire on `:focus-within` and are always-on for touch (not hover-only).
- **Perf beyond S4:** the jobs list is **windowed** (24 cards + Load more,
  `JobsSearchTab.jsx:255-260`), facet filter/sort/section are memoized
  (`UnifiedJobsFeed.jsx:143-208`), Home's ~10 queries are TanStack-keyed/deduped with
  every derived list memoized (`Home.jsx:359-403`), and the card spotlight `onMouseMove`
  is rAF-throttled per-card. No re-render storms found.
- **Contrast tokens are AA-tuned** where it counts: `--rd-text-secondary` (#7b675c),
  `--rd-teal-dark` (#7b606d, carries an explicit "AA min-fix 4.36->4.51" comment),
  `--rd-primary`/`--rd-text-eyebrow` (#60617d, ~4.6:1). The error box and scrims are fine.

---

## Launch-decision checklist for the design lane

- **B1** resume dropzone keyboard access - fix before launch.
- **S1** dialog focus-trap/return + Escape on the two mobile dialogs (+AgentDrawer).
- **S3** contentEditable name/role.
- **S4** measure corpus-scoring pass time on a mid device; decide chunk-vs-accept.
- **S5** + **S2** + **S6** confirm accept-vs-fix.
- **N1/N2** motion polish.

**Method note:** this is a static source audit. A live Lighthouse/axe pass on the
running flag-on build (`?onboarding_v2=1`) is still worth one run for LCP/CLS/TBT and
automated axe coverage this pass can't produce (e.g. runtime contrast on real content,
actual tab order). No files were modified.
