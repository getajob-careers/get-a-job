# Design lane - resume point

**After any context clear, read THIS + tasks/lessons.md first. Never reconstruct from scratch.**
Overwrite this file each breakpoint (PR held / merged / ruling) and before ending a session. Resume point, not a log.

## Standing protocols (verbatim)

- **Canary:** begin every reply to Eli with "Eli, ...". It is a context canary - when the name stops appearing, Eli says **"canary"**, and on that word: overwrite THIS file with a fresh resume point and tell him to `/clear`. (Full protocol text also in the root `CLAUDE.md`, both lanes.)
- **Statusline:** `~/.claude/settings.json` runs `~/.claude/statusline-command.sh`, showing context-usage % first (green `<60`, yellow `60-79`, bold red `>=80`), then model / branch / dir. Derived from the `context_window.used_percentage` stdin field. Proactively offer a handoff at ~80%.
- **Ledger reports:** end every report with a compact ledger (PR, SHA, state, claims to verify, evidence pointers, open questions) - no narrative recap.
- **Token tiering (HANDOFF-ONLY, per Eli):** for preview scaffolds + variant iteration, drop a model tier via `/model`; step back up for token-level implementation commits and craft-critical work. `/model` is Eli-driven (the model cannot self-switch). Do NOT mirror this into CLAUDE.md - handoff only.
- **Delegate:** searches -> `explorer`, gate runs -> `gatekeeper`, sweeps/counts -> `sweeper` (haiku subagents, now MERGED to main in `.claude/agents/`). NOTE: freshly-added agents are not invocable mid-session (registry is fixed at session start); they load in a fresh session - smoke them first (see fresh-session tasks).

## Identity

- The DESIGN lane, one terminal, persists across context clears. There is NO other design terminal - all redesign / canvas / CV-surface / token / onboarding-V2-surface work is this lane's, even if authored in an earlier session.
- The "hub" (Eli) verifies claims, applies migrations, and rules on merges. One writer per path.

## Owned paths

- CV Studio: `src/components/cv-studio/*` (CVStudioView, CVStudioLive); `src/lib/{writeProfileEntity,serializedWriteThrough,revertCvDataField,cvDataAdapter,useSeededCvModel}`; `supabase/functions/_shared/write-mediation.ts` (client+edge shared write layer).
- Redesign surface: `src/components/redesign/*` (home: ThreeTabHome, CvMatchedRolesRail, useTopMatches; shell: CanvasShell/Sidebar/CoachDock; ground: DepthField/GrainGround); `src/pages/_preview/*` canvas previews.
- Tokens/palette: `src/index.css` (`--rd-*` vars), `tailwind.config.js` (`rd-*` utilities), the `design-craft` skill doc.
- Home is this lane's - owns the `?welcome=1` arrival moment.

## Current arc: canvas Phase 2 (Slice 1 DONE)

- **Slice 1 ground = DONE + MERGED.** #678 squash-merged to main (merge SHA **14f0c06**, certified head 6269b15). The ground is the **directional wash**: token `--rd-ground-wash` + `.rd-ground`; `GrainGround.jsx` renders it, `DepthField` blobs removed, cream + wash only. Certified by Eli on the real route `/Home?next=1`. Hub verifies prod deploy goes READY before anything else proceeds.
- **Subagents = MERGED.** #681 squash-merged to main (merge SHA **6fa5d9d**): `explorer` / `gatekeeper` / `sweeper` in `.claude/agents/` + CLAUDE.md delegation + canary sections.
- Prior: #659 CV RED Ph1 (6b00d72), #675 onboarding V2 (68c229e), #677 token rename (1697063), #676 lessons (1339ef9) - all merged/live.

## Standing rulings / constraints (verbatim)

- FLAG-OFF BYTE-IDENTITY: every flag-on change gated on isNextDesign()/rightRail; flag-off output byte-identical. Preserve EXACT Tailwind class strings (no class-sorter; token order matters).
- ONE WRITER PER PATH.
- Real flag param is `?next=1` (index.html bootstrap reads URLSearchParams.get("next"); "nextDesign" is the localStorage KEY, not a URL param). Flag-on reveal: `/Home?next=1`; `?next=0` clears. Flag-off editor: `/CVAgent`.
- NO whole-model persists in the CV write layer - per-field mediated writes only (undo included).
- TOKEN: the primary renders #60617d (slate/indigo) and is the KEEPER - no re-tint. #D6421F is RETIRED. `rd-coral*` renamed -> `rd-primary*` (zero value change). `trackColor` is EXCEPTED from the rd-coral sweep (JS prop, not the token).
- Canvas palette (live): `--rd-bg-card #FFFCF4`, `--rd-bg-page #F4EBDA` (ground), `--rd-primary #60617d`.
- GROUND: **directional wash** (shipped). Cream + wash only. **ALL particulate texture retired at the category level** (dots + baked grain both = dirty screen; banding equally disqualifying, no dither). Wash is normal-composite (no blend mode). The `soft-light` mean-preserving finding carries forward to any tonal work. Canonical: `docs/design/canvas-tokens.md` + `phase2-canvas-arrival-plan.md`.

## Post-clear queue (certified-session findings, in order)

- **(a) CV Studio quick-fix PR.** The "Generate a job-specific version" CTA becomes a real button (`rd-primary` treatment); fix the header text collision at the top of the CV. First CODE slice after the rename micro-PR.
- **(b) Coach panel fixes (one PR).** The expand arrow must ACTUALLY expand the panel; long input must not hide the top of the user's message. Functional fixes, not polish.
- **(c) Tab-consistency slice.** Now includes moving the CV / Browse Jobs / Tracker tabs UP to fill the empty space that leaves the page feeling half-empty. Eli's ruling STANDS unless you nominate a competing use for that space before building.
- **(d) CV-generation ring/theater.** Confirmed in plan, queued behind (a)-(c).
- **(e) Slice 2 (arrival moment).** Keeps its place in the phase-2 queue. Sequencing of (a)-(d) against it happens at fresh-session start WITH THE HUB.

## Fresh-session first tasks (in order)

1. **Runtime smoke the three subagents** (now on main): invoke `explorer`, `gatekeeper`, `sweeper` once each with a real task; confirm they run and return the intended tight output. (Could not be done in the authoring session - registry was fixed at start.)
2. **`GrainGround` -> `GroundWash` naming-only micro-PR** (rename the file/component + re-exports; zero behaviour change; the "grain"/"dot" names are now stale since it renders the wash).
3. **Queue item (a)** - the CV Studio quick-fix PR.

Then sequence (b)-(e) with the hub.

## Open questions for the hub

- Slice 2 vs (a)-(d) ordering (decide at fresh-session start).
- Any competing use for the space freed by moving the tabs up in (c)? (else Eli's ruling stands.)
