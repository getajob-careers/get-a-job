# Design lane - resume point

**After any context clear, read THIS + tasks/lessons.md first. Never reconstruct from scratch.**
Overwrite this file each breakpoint (PR held / merged / ruling) and before ending a session. Resume point, not a log.

## Standing protocols (verbatim)

- **Canary:** begin every reply to Eli with "Eli, ...". It is a context canary - when the name stops appearing, Eli says **"canary"**, and on that word: overwrite THIS file with a fresh resume point and tell him to `/clear`. (Full protocol text also in the root `CLAUDE.md`, both lanes.)
- **Statusline:** `~/.claude/settings.json` runs `~/.claude/statusline-command.sh`, showing context-usage % first. Proactively offer a handoff at ~80%.
- **Ledger reports:** end every report with a compact ledger (PR, SHA, state, claims to verify, evidence pointers, open questions).
- **Delegate:** searches -> `explorer`, gate runs -> `gatekeeper`, sweeps/counts -> `sweeper` (haiku subagents in `.claude/agents/`). Newly-added/edited agents need a full quit+relaunch to load (`/clear` does NOT re-scan).
- **Reporting discipline (memory [[report-gated-means-flag-off-unreachable]]):** "gated" means EVERY changed line is unreachable flag-off. Shared components (render in both flag states) get an explicit UNCONDITIONAL-with-reason call-out. PR bodies for coach/canvas work lead with a FLAG SCOPE block.
- **Token tiering (HANDOFF-ONLY):** for preview scaffolds + variant iteration, drop a model tier via `/model`; step back up for token-level commits + craft-critical work. `/model` is Eli-driven.

## Identity

- The DESIGN lane, one terminal, persists across context clears. ALL redesign / canvas / CV-surface / token / onboarding-V2-surface work is this lane's. **NEW (hub 2026-07-23): design lane now OWNS V2 onboarding Phase 1 + Phase 2 (see arc below). CV lane keeps sequence/persistence correctness + cross-reviews any of our PRs touching persist paths.**
- The "hub" (Eli) verifies claims, applies migrations, rules on merges. One writer per path. Merge ritual = CI-green -> squash -> delete branch after merged:true -> verify prod READY + serving SHA == squash SHA -> state edge-fn touch (none, for all frontend work).

## Owned paths

- CV Studio: `src/components/cv-studio/*`; `src/lib/{writeProfileEntity,serializedWriteThrough,revertCvDataField,cvDataAdapter,useSeededCvModel}`; `supabase/functions/_shared/write-mediation.ts`.
- Coach/agents: `src/components/agent/*` (CoachDock, AgentDrawer, CoachInput, CoachThread, **AgentComposer**, **coachPrompts.js**); `src/lib/{CoachConversationContext,AgentDrawerContext}`; `src/components/chat/*` (ChatInterface, MessageBubble).
- Redesign surface: `src/components/redesign/*` (shell: CanvasShell/CanvasSidebar/CanvasToolTile/CanvasToolIcon/CanvasCommandItem/**CanvasLogo**; ground: DepthField/GroundWash; home: ThreeTabHome); `src/pages/_preview/*` canvas previews (incl. `canvas/CanvasCoachDock.jsx` = AgentComposer reference).
- **NEW - Onboarding V2:** `src/pages/Onboarding*.jsx` / `OnboardingV2*` + screens 0-3 + SpringboardScreenV2 + ReviewScreenV2 + OnboardingTutorial + `src/lib/onboardingPersist` (persist paths = CV-lane cross-review). READ `docs/handoffs/onboarding-restyle-brief.md` (merged to main via #693, `d7b2b6a`) BEFORE any onboarding work - **now UNBLOCKED on that axis; onboarding Phase 1 still waits on Eli's mascot-variant pick per the queue.**
- Tokens/palette: `src/index.css` (`--rd-*` vars + keyframes), `tailwind.config.js` (`rd-*`), the `design-craft` skill doc.

## Flag + smoke facts (verbatim)

- Real flag param is `?next=1` (index.html bootstrap reads `URLSearchParams.get("next")`; "nextDesign" is the localStorage KEY, NOT a URL param). Flag-on reveal: `/Home?next=1`; `?next=0` clears. Flag-off editor: `/CVAgent`. CSS gate = `:root[data-next-design]`.
- `CanvasShell` (Layout.jsx `if (isNextDesign()) return <CanvasShell>`) is FLAG-ON only in prod; flag-off returns legacy Layout. So CanvasToolIcon/CanvasSidebar/CanvasLogo render flag-on + dev `_preview` only. **PROD DEFAULT IS FLAG-OFF (legacy Layout) - most real users never see canvas work until the flip.**
- FLAG-OFF BYTE-IDENTITY: edit shared components via python text-surgery (bypasses the PostToolUse formatter, which reflows whole files + strips just-added imports). Add imports WITH usage in the SAME edit, then grep to confirm survival; for lucide/JSX-component imports do a render check (build+lint pass a stripped one). **Python-surgery structurally eliminates the import-strip risk (formatter never runs) - grep+lint then suffice.**
- **Playwright is NOT installed** (`@playwright/test` absent). Use Vitest render tests for flag-on verification; browser smoke via claude-in-chrome needs a dev server + (for the real app) auth. `/_preview/shell/:state` renders the LEGACY Layout (not canvas). Real CanvasSidebar mounts flag-on only.
- Typecheck baseline drifts; MEASURE the real delta. Baseline this session ~521-524 (main). Landing-link PR = clean (no new TS errors).

## Current arc: canvas Phase 2 + NEW onboarding V2 ownership

### JUST MERGED + LIVE this session (2026-07-23)

- **#690** `eli/canvas-quickfix-tile-paper` squash `5fd3378` - chat tile duotone back-bubble + CV Studio white paper + CTA-A. LIVE.
- **#692** `eli/agent-composer-phase1` squash `f82b99d` - shared `<AgentComposer>` adopted in CoachInput. LIVE.
- **#694** `eli/canvas-landing-link` squash `b56fe1b` - flag-ON "About Get A Job" -> `/Landing` eyebrow in the CanvasSidebar footer (Option C). Eli-certified; branch deleted; **prod serving `b56fe1b` via `dpl_HNiizxYzxzPpz7oMFmC9ZizzpP3V` (READY).**
- #691 (CV self-heal) + #693 (onboarding brief, docs-only) also merged this window. Zero edge fns in any of the design-lane merges.
- **origin/main HEAD is now `bc221d0`** (#696 landing recolor to canvas palette, merged by CV lane). **GOTCHA:** LOCAL `main` in this worktree is a STALE ref (`f0d4454`, missing #694 + the canvas shell) — the shared-worktree hazard; base everything on `origin/main`, never local `main`. `CanvasSidebar.jsx` exists on origin/main identical to `b56fe1b`.

### PUSHED THIS SESSION (2026-07-23) — both HELD for Eli

- **PR #695** `eli/mascot-prototype` @ `72ea12d` (mascot Round 1, see below). HELD for Eli's eye — verdict comes on the Vercel preview `/_preview/mascot`. Based on `b56fe1b` (1 behind origin/main = #696, no file overlap).
- **PR #698** `eli/canvas-visit-homepage` @ `b82576e` (Visit homepage, ruled). Based on true `origin/main`. READY TO MERGE (Eli's gate). UNCONDITIONAL both flag states.

### MASCOT ROUND 1 — DONE this session (2026-07-23), on `eli/mascot-prototype`, for Eli's eye

The pause LIFTED (Eli's 4-image reference board landed). Round 1 delivered:

- **Board committed:** `docs/design/mascot-reference/` (4 webp + `notes.md` = the shared-language recipe).
- **`character-craft` skill authored** (`.claude/skills/character-craft/SKILL.md`): board recipe + appeal fundamentals + animation principles as rules + the standing MICRO-LIFE requirement. Registered (shows in the skills list).
- **Character REDRAWN** (`MascotFigure.jsx`, full rewrite): round 0's thin-stroke skeleton → solid board-style MASSES (oversized head + chunky torso + small limbs, signature rosy nose, minimal face + glasses, in-figure grain [Eli-blessed exception], grounded shadow). Brand equity kept (person at the A-frame desk = the logotype's "A"). Canvas palette via tokens; new `--rd-mascot-*` skin tokens added to index.css `[data-next-design]`. Iterated in a scratchpad harness (screenshot → self-critique → revise ×3): hair-hole fix, grain from invisible→static→right chalk tooth (opacity 0.26), bigger seated laptop, integrated arms, crew-neck.
- **SIGN-UP AMBIENT IDLE built** (`MascotPreview.jsx` `useSignupIdle`): breathing + random blinks + weight shifts + periodic COFFEE SIP + steam, each on its OWN randomized self-rescheduling timer (anti-metronome). reduced-motion → static. Preview now STAMPS `data-next-design` (round 0's silent bug: it rendered coral without the flag). Verified in-app on `/_preview/mascot`: renders canvas palette, no anime.js errors, breathing transform applied (live loop needs a visible tab; bg-tab rAF froze the sample — Eli to eyeball live motion).
- **3 registers STORYBOARDED** (`docs/design/mascot-motion-registers.md`): landing scroll-journey (**incl. Eli's 2026-07-23 idea: mascot IS the "A" in the hero logotype, RISES out on first scroll + walks the page down with the user**; anime.js-homepage technique translation; practice/interview beat; CV-drop loader), onboarding state-acting, tutorial guide. Sign-up = built; other three built later, each gated on Eli's Round-1 sign-off.
- **Ruled fallback:** Round 2 only on Eli's notes; if Round 2 misses → commissioned character sheet (flag, don't spiral).

**#695 → this is its continuation** (same branch). Commits `797ffd7`+`1e15cb6` (old packet) + Round-1 commit(s). Open the held PR for Eli's Vercel-preview eye-pass on `/_preview/mascot`.

- **KNOCK-ON now UNBLOCKED:** onboarding mascot moments = ADDITIVE SLOTS (work empty), landing loader + scroll-journey are storyboarded, all gated on Round-1 sign-off.

**Rollback target (prod):** origin/main advanced to `bc221d0` (#696 landing recolor) this window — prod deploy ID for it NOT captured this session (verify via Vercel before any rollback). Prior known-good = `dpl_HNiizxYzxzPpz7oMFmC9ZizzpP3V` (main `b56fe1b`, #694).

### "Visit homepage" — SHIPPED as PR #698 (Option A, ruled)

Eli ruled Option A + copy "Visit homepage". Built in BOTH flag states (11px lucide
`House` glyph + `text-rd-text-eyebrow` + hover underline-offset): `CanvasSidebar.jsx`
(flag-on) + `SidebarFooter.jsx` (flag-off). UNCONDITIONAL, cross-flip parity.
Render-checked on `/_preview/shell`. Other "About Get A Job" strings (OnboardingShell/
Tutorial, Settings) intentionally left — out of this ruling's scope. Awaiting merge.

## Rulings locked (do not re-litigate)

- **CTA = Option A** ("Tailor to a job", filled rd-primary + leading Sparkles). Landed #690.
- **Landing-link = Option C** (logo stays ->/Home; separate "About Get A Job" ->/Landing link). Built flag-on this session; flag-off already had it.
- **Mascot arc** (memory [[mascot-logo-animation-arc]]) - **ROUND 1 DELIVERED + HELD 2026-07-23 (PR #695); pause LIFTED.** Character redrawn against Eli's board (solid masses); sign-up idle built; `character-craft` skill governs all character work now (`.claude/skills/character-craft/SKILL.md`) — invoke it for any mascot draw/pose/animate. Round 2 ONLY on Eli's notes; miss → commissioned sheet. canonical logo = `CanvasLogo.jsx` MarkFullChair (untouched, size-split held). Size-split = hero-only refine (keep 30px header pictogram; refined figure at hero/loader). Motion = **anime.js v4, per-submodule imports** (INSTALLED v4.5.0 in the mascot packet; ~16.4KB gz adoption cost). Motion-discipline note is committed to `docs/design/design-resources.md` - **TWO systems (Eli 2026-07-23): CSS = simple loops/transitions; anime.js = timelines + multi-part orchestration** (framer-motion dropped - being pruned). anime.js is the DEFAULT orchestration tool for all upcoming motion (mascot, onboarding, CV-gen theater, marquee, arrival). Asset runtimes (Rive/Lottie/Spline) pre-approved the moment a moment earns one. Prototype = 2-3 anime.js-timeline motion variants on a SHOW_PREVIEW_ROUTES-gated `_preview` route, no auth, reduced-motion->static. Build is its OWN later PR AFTER Eli approves the refined-SVG + prototype. reduced-motion->static + canvas-only gate + honest UI (never fakes progress) bind all mascot work.
- **Mascot x onboarding/tutorial (hub 2026-07-23, CREATIVE LICENSE granted):** once the refined mascot exists, Eli wants it as a RECURRING CHARACTER across tutorial + onboarding, illustrating REAL state per screen. Propose poses/scenes as concept OPTIONS for Eli's pick (concepts before builds). See "Mascot-as-character concept menu" below. Ties into the already-queued loader + sign-up-ambient roles. Same constraints bind (layered SVG + anime.js timelines + reduced-motion static + honest + canvas-only).
- **Dependency audit done** (report-only): `framer-motion`/`three`/`canvas-confetti` installed but imported in 0 src files (dead weight; cleanup-PR question LOGGED not built). anime.js is the one genuinely-gated lib (install ruled).

## Queue (CONFIRMED by Eli 2026-07-23)

1. **Visit-homepage PR (#698)** - PUSHED, ready to merge (Eli's gate). UNCONDITIONAL both flag states.
2. **Mascot Round 1 (#695)** - PUSHED, HELD for Eli's eye on the Vercel preview `/_preview/mascot`. **Eli's verdict is pending on the pushed preview.** On approve → adoption PRs (loader, onboarding slots); on notes → Round 2 (only on his notes); miss → commissioned sheet. Governed by the `character-craft` skill.
3. **>> NEXT BUILD SLOT: V2 Onboarding Phase 1** — **PLAN DELIVERED** (`docs/design/onboarding-v2-phase1-plan.md`), awaiting Eli's build go-ahead. Ruled inputs already settled:
   - **Palette basis = 0A RULED (Eli 2026-07-23): stamp `data-next-design` on the V2 shell mount** (V2 currently renders LEGACY coral — no flag stamped). **V1 flag-off byte-identity invariant STANDS** — scope the stamp to the V2 shell mount/unmount, never global/root (would bleed into V1).
   - Plan has per-screen restyle + option pairs + a 4-PR split; PR-3 (review + shared `StepReview`) is UNCONDITIONAL → CV-lane cross-review + `onboardingPersist.test.js` green + one live persist drive.
   - Respect the brief's do-not-alter list + invariants. Mascot moments = ADDITIVE SLOTS (work empty).
   - One-voice = the #696 landing (now LIVE on origin/main `bc221d0`); verify the landing renders the same canvas values the stamp produces.
4. **V2 Onboarding Phase 2** (UX composition: review-screen rework, upload-wait loading, location autocomplete, entrance motion, thin-profile empty-roadmap nudge). Mascot scenes (additive slots) land heaviest here.
5. **AgentComposer Phase 2** (ChatInterface agent pages: CareerAgent/InterviewCoach/SkillDevelopmentAdvisor) -> **Phase 3** (CVStudioView eval adopt-vs-keep-chips). Independent; interleavable.
6. **CV-gen ring/theater** - standing queued (Eli loved it); pairs with mascot Step 3 adoption.
7. **(c) tab-consistency** - move CV/Browse/Tracker tabs UP to fill empty space (nominate approach before building).
8. **FULL DESIGN AUDIT** - every page incl. legacy Profile (hunt silent-reorder-on-edit). After the build queue.
9. **Slice 2 (arrival moment)** - phase-2, sequence with hub.

- **FLIP = LAST**, after onboarding Phase 2 (Eli confirmed).

## Mascot-as-character concept menu (concepts before builds; Eli's pick)

ONE character, small pose vocabulary as variants of the same layered SVG (shared silhouette + palette); anime.js timelines animate neutral<->pose + working micro-motions; reduced-motion = static pose; canvas-only.

- **Upload wait (CV parse):** figure LEANS IN reading a CV page - head ticks line-by-line, page glow. Plays ONLY while extraction genuinely in-flight; sets page down / looks up when done. Honest.
- **Review screen:** figure REVIEWS a document with a pen; check-mark gesture as fields confirm.
- **Tutorial slides:** figure PRESENTS/POINTS at the highlighted feature; per-slide pose variation. The "guide" role.
- **Springboard (completion):** figure CELEBRATES (arms up / small hop). The payoff.
- **Direction/goal screen:** figure LOOKS UP at a horizon/path (5-year goal framing).
- **Thin-profile empty-roadmap nudge:** figure holds an EMPTY page / gestures "let's add more."
- **Loader (queued):** figure TYPING (working tick) as the honest in-flight indicator; pairs with CV-gen ring/theater.
- **Sign-up ambient (queued):** calm posture-bob variant, decorative-but-honest (brand character, claims no progress).
- **Where it would be NOISE (say no):** dense data pages (Career grid, Tracker table, CV Studio editing) - a character competes with the user's own work; anywhere it would imply progress that isn't real; on every screen (overuse kills delight - punctuate transitions/waits/milestones, not steady-state work).

## Deferred / do-not-build-yet (logged)

- CV header composition rework + Generate pop-up/flow -> CV-document design pass (bring mock/options first).
- Dead-dep cleanup (framer-motion/three/canvas-confetti prune) - LOGGED, Eli's call, not built.

## Open questions for the hub

- Eli cert on the landing-link PR (URL `/Home?next=1` -> desktop sidebar footer "About Get A Job").
- Confirm the nominated queue order (esp. mascot Step 2 BEFORE onboarding Phase 1).
- Mascot-as-character: which scenes to build first once a variant is picked.
- Dead-dep cleanup: prune or keep.
