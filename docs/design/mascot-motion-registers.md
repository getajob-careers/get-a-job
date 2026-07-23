# Mascot motion registers

One character, four energy registers. Micro-life (blinks + breathing + weight
shifts, per the `character-craft` skill) is ALWAYS on underneath; the register
changes the ENERGY, not the character. Honest throughout (motion illustrates real
state, never fakes progress); reduced-motion → static; canvas-only.

Status: **Register 1 (sign-up) is BUILT** (Round 1, `MascotPreview.jsx`
`useSignupIdle`). Registers 2–4 are storyboards here — built later, each gated on
Eli's Round-1 character sign-off.

---

## 1 · Sign-up ambient — BUILT

Calm, decorative-but-honest brand presence beside the sign-up form. Claims no
progress. Composed of the micro-life layer + one prop motion:

- breathing (figure bob + torso scaleY, ~3.6s continuous)
- blinks (random 2.6–6.4s, occasional double)
- weight shifts (head tilt/settle, random 7–15s)
- **periodic coffee sip** (mugArm lifts the mug toward the mouth, holds, lowers;
  random 16–30s) — Eli-requested
- steam drift on the mug (continuous, subtle)

Each on its own randomized self-rescheduling timer → nothing metronomes.

---

## 2 · Landing scroll-journey — STORYBOARD (flagship)

**Quality bar:** the anime.js homepage — study how its scroll-built object feels
alive and _translate the techniques, not the aesthetic_: scroll-scrubbed
assembly, parts that lead/lag, a single object that carries the whole page.

**Eli's spine (2026-07-23):** the mascot IS the "A" in the "Get A Job" hero
logotype at rest. **On first scroll he rises out of the A** and then walks the
page down with the user — the scroll _is_ his journey. This earns the brand
equity (the A-frame desk literally is the logo mark) and makes the journey feel
causal rather than decorative.

Beats (scroll-scrubbed between key poses; his separable parts — arm angle,
posture, held prop — interpolate along scroll):

1. **Hero / rest.** He's seated at the A-frame desk, forming the logotype's "A".
   Micro-life idles. Copy + CTA above.
2. **Rise (first scroll).** Anticipation dip, then he stands out of the "A" — the
   desk stays as the mark; he separates from it and turns to walk down-page.
   Posture is hunched/uncertain here (starting out).
3. **Working the tools.** Passing the product's feature beats, he mirrors them:
   reading a CV (upload-read pose), tools in hand. Posture beginning to open.
4. **Practice / interview beat** (the gap round-0 flagged). He rehearses — a
   speech/practice gesture, maybe facing a second small shape or a mirror-card.
   This is the confidence pivot; posture straightens noticeably here.
5. **Progressing.** Horizon-gaze pose — looking up the path (the 5-yr goal
   framing), upright and confident.
6. **Celebration at the final CTA.** Springboard pose — arms up / a small hop —
   landing the role. The final CTA sits in his celebration.

Plus the **CV-drop reading loader**: when a CV is dropped on the landing
dropzone, he reads it (head ticks line-by-line, page glow) ONLY while the real
parse is in-flight; sets the page down when done. Honest.

**Technique translation (anime.js homepage → us):**

- Drive with a scroll observer that maps `scrollProgress` → a master timeline
  `seek()` (scrubbed), NOT time-based autoplay — the user's scroll is the clock.
- Between beats, interpolate the separable parts (posture curve, arm rotation,
  prop swap) so motion reads continuous, not slideshow.
- Leading/lagging: torso leads a step, trailing props (bag, page) lag and settle.
- Perf budget: one figure, transform-only animation (no layout), parts capped;
  `content-visibility` on off-screen beats; reduced-motion → the figure holds a
  single confident pose beside static copy (journey collapses to one frame).

**Own deliverable when built:** a section-by-section scroll storyboard + perf
budget + the scrub-rig, gated on the Round-1 character + the #696 landing recolor.

---

## 3 · Onboarding state-acting — STORYBOARD

He ACTS the real state of each onboarding screen (this is the honest-UI test:
each pose maps to a true system state, and mascot moments are ADDITIVE SLOTS that
work empty until the character lands). See the onboarding plan for slot placement.

- **CV upload / extraction (screen 0→1):** reads the CV — head ticks line by
  line, page glow — **only while extraction is genuinely in-flight**; looks up
  when done. This is also the upload-wait loading treatment (Phase-2 backlog #2).
- **Review (screen 1):** pen-checks a document — a check-mark gesture as sections
  are confirmed. Punctuates confirmation, doesn't block it.
- **Direction / goal (screen 2):** horizon-gaze — looks up the path while the
  user sets a 5-year goal.
- **Springboard (screen 3):** celebrates — arms up / small hop — the payoff.
- **Thin-profile nudge:** holds an empty page, open-hand "let's add more" — the
  empty-roadmap nudge for skip-path users.

Constraint: NOT on dense work screens; punctuate transitions/waits/milestones,
never steady-state work.

---

## 4 · Tutorial guide — STORYBOARD

The "guide" energy across the post-springboard tutorial slides.

- **Entrance:** a small hop onto the slide (anticipation dip → hop → settle).
- **Per slide:** points at that slide's highlighted feature (present/point pose,
  per-slide variation), then idles (micro-life) while the user reads.
- **Exit:** waves off / walks toward the workspace as the tutorial ends.

Constraint: he guides attention, never obscures the slide content; honest (points
at real highlights only).

---

## Build order (each gated on Eli)

Sign-up (done) → onboarding acting slots (lands with onboarding Phase 2, additive)
→ tutorial guide → landing scroll-journey (largest; its own deliverable). The
landing loader + sign-up ambient are the two "always-on" roles already queued.
