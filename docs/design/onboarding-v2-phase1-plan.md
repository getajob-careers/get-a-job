# Onboarding V2 — Phase 1 restyle plan (PLAN ONLY)

Design lane, 2026-07-23. **No builds until Eli approves.** Contract = the
onboarding restyle brief (`docs/handoffs/onboarding-restyle-brief.md`, on main);
respect its DO-NOT-ALTER list + behavior invariants exactly. CV lane
cross-reviews any PR touching a persist path.

Phase 1 = **canvas restyle of screens 0-3 + springboard + tutorial rendering**
(visual/spatial only — no UX composition rework; that's Phase 2). Align to the
one-voice canvas palette (the live #696 landing).

---

## 0 · The headline question — which palette does the flow actually render?

**Finding (grounded read):** the V2 flow already uses `rd-*` tokens pervasively
(317 hits) but **stamps no `data-next-design`**. Those tokens resolve to the
FLAG-OFF (legacy) values unless the root carries the flag — so on the real route
the flow currently renders in the **legacy coral/teal/golden** palette, NOT the
canvas slate/mauve/brown one-voice palette. That is the single biggest lever for
"feels like V1 not V2" (brief Phase-2 #4) and for one-voice with #696.

**This must be resolved before any per-screen work, because it changes every
color on every screen.** Options:

- **Option 0A (recommended) — stamp `data-next-design` on the V2 route.** One
  effect on the OnboardingV2 shell (the same pattern the canvas previews use)
  makes every existing `rd-*` token resolve to the canvas palette instantly —
  slate primary, mauve, warm brown, cream. Lowest-touch, largest visual payoff,
  and it's literally the mechanism the rest of the canvas surface uses.
  Verify-at-build: confirm #696's landing renders under the same values (grep
  Landing for `data-next-design` / literal palette) so the two truly match, and
  smoke that no onboarding token was relying on a legacy value for contrast.
- **Option 0B — leave unstamped, align to whatever #696 hard-set on the flag-off
  landing.** Only correct if #696 recolored the flag-off landing via literal
  values rather than the flag. More work (per-token audit), and it forks the
  flow's palette from the rest of the canvas. Pick only if 0A can't be used
  because onboarding must stay legacy-palette for some flag-off reason.

**Ask for Eli:** confirm 0A (stamp the flag) as the palette basis, or tell me
#696 fixed the landing a different way and we mirror that. Everything below
assumes the canvas palette is the target.

---

## Per-screen restyle plan

Grounding: all screens are already token-clean (RdButton / RdSkillTagInput in
use, minimal ad-hoc hex; some `rounded-[10/14/18px]` + `text-[13.5/10.5px]`
one-offs = the known scale-debt to fold in). So Phase 1 is **spatial rhythm,
hierarchy, and one-voice chrome**, not a token migration.

### Screen 0 · CV upload (`OnboardingV2` shell + `StepResumeUpload` chromeless)

- Unify the shell chrome to the canvas: header logo + step counter + the 4-dot
  progress bar restyled to canvas weights (slate fill, `rd-border` track).
- Situation-card grid (5-col): tighten to the canvas card spec (consistent radius
  from the scale, `rd-border` + hover/selected states matching CanvasToolTile).
- Dropzone: canvas card treatment; keep the `chromeless` prop contract
  byte-identical for V1 (brief).
- **Option pair — dropzone emphasis:**
  - **0-i (recommended)** calm single card, dashed hairline border, mascot slot
    to the side. Reads confident, not busy.
  - **0-ii** a larger "hero dropzone" with the mascot reading-slot centered above.
    More inviting, more vertical space — trades density for warmth.
- **Mascot slot (ADDITIVE, works empty):** a reserved reading-figure beat beside
  the dropzone; empty = a small illustrative placeholder or nothing. Fills with
  the upload-read pose post-character (motion registers doc §3).

### Screen 1 · Review (`ReviewScreenV2` → `StepReview`) — the Phase-2 headline

- Phase 1 scope is visual only: strengthen the "what we found" hierarchy (section
  headers, the count-up stats block), tighten card rhythm, reduce apparent length
  via consistent vertical spacing. (The collapse-by-default + length CUT is
  Phase-2 UX — flag, don't do it here.)
- `StepReview` is **shared with V1** — every change is UNCONDITIONAL; keep it
  behavior-identical and drive V1 too (brief). Call this out in the PR.
- **Mascot slot:** pen-check beat near the section headers; empty-safe.

### Screen 2 · Direction (`DirectionScreenV2`)

- Goal-role picker, location, work-arrangement cards, practicum — restyle to
  canvas card/imput spec; unify the selected-state ring to the canvas primary.
- Keep goal-required gating + the `five_year_goal_role_id` + `five_year_role`
  double-write (invariant R2) — visual only.
- **Option pair — work-arrangement selector:**
  - **2-i (recommended)** keep the 4-card multi-select, restyled (icon circle in
    `rd-bg-soft`, canvas selected ring). Familiar, minimal risk.
  - **2-ii** condense to a segmented control. Tighter, but loses the icon warmth
    and is a bigger change — defer to Phase 2 if judged worth it.
- **Mascot slot:** horizon-gaze beat beside the 5-yr goal field; empty-safe.

### Screen 3 · Springboard (`SpringboardScreenV2`)

- Single centered launch card → canvas card treatment; the rocket-in-circle to
  canvas primary-tint; keep the `onbv2-rise` entrance (or promote it to the
  approved anime.js arrival — see PR split).
- **Mascot slot:** the celebration beat — the payoff; empty-safe (static card
  works alone).

### Tutorial (`OnboardingTutorial`, shared with V1)

- Rendering-under-canvas only: the FullScreenShell peach frame + inner card to
  canvas tone; slide chrome + progress bar to canvas weights. Keep ALL skip
  machinery load-bearing (brief invariant 7); shared with V1 → UNCONDITIONAL,
  drive V1.
- **Mascot slot:** the guide (points at the slide highlight); empty-safe.

---

## PR-split proposal (small, reviewable, invariant-safe)

1. **PR-1 · palette basis + shell chrome.** Resolve §0 (stamp the flag per 0A) +
   restyle the OnboardingV2 shell chrome (header, progress bar, situation grid).
   No persist-path touch → no CV-lane review needed. Ships the biggest visual win
   first and de-risks everything after (every later screen inherits the palette).
2. **PR-2 · screens 0 + 2** (upload dropzone + direction). Visual only; no shared
   V1 components. Independent.
3. **PR-3 · screen 1 review + `StepReview`.** UNCONDITIONAL (shared with V1) →
   CV-lane cross-review + `onboardingPersist.test.js` green + one live persist
   drive. Kept separate BECAUSE it's the shared-component / invariant-heavy one.
4. **PR-4 · springboard + tutorial.** Tutorial is shared-with-V1 UNCONDITIONAL →
   drive V1. Springboard arrival motion decision rides here.

Mascot slots ship EMPTY in these PRs (reserved beats); the character fills them
in a later additive PR post-Round-1 sign-off — never a blocker.

---

## Design-resource citations (which choices they informed)

From `docs/design/design-resources.md` (the curated list):

- **Motion discipline ruling (same doc)** — springboard/entrance arrival =
  anime.js (timeline/arrival), simple state changes = CSS. Informs PR-4's arrival
  decision and the reduced-motion static rule on every mascot slot.
- **supahero.io / godly.website** (hero + inspiration galleries) — the "calm
  single card vs hero dropzone" option pair on screen 0.
- **reactbits / motion-primitives** — reference for the count-up + reveal on the
  review success block (screen 1) without over-animating the core loop
  (design-craft rule 6).
- **The board + `character-craft` skill** — every mascot slot's pose + the
  empty-safe additive-slot rule.

---

## Invariants this plan keeps (from the brief — non-negotiable)

Persist call-graph + ordering; event schema (`flow:"v2"`, step_index 0-3, the
`situations` array on the inferred event); the precedence invariant; situation
XOR-multi logic; goal-required gating + the double-write; completed-user mount
guard; tutorial skip contract; **flag-off byte-identity** for V1 (shared
components `StepReview` / `StepResumeUpload` / `OnboardingTutorial` are
UNCONDITIONAL — call out + drive V1); gate green (lint/typecheck/build/test) +
cold-load browser smoke on the real route.
