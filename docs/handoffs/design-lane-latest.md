# Design lane - resume point

**After any context clear, read THIS + tasks/lessons.md first. Never reconstruct from scratch.**
Overwrite this file each breakpoint (PR held / merged / ruling) and before ending a session. Resume point, not a log.

## Standing protocols (2026-07-22, effective immediately)

- **Canary:** begin every reply to Eli with "Eli, ...". It is a context canary - when the name stops appearing, Eli says **"canary"**, and on that word: overwrite THIS file with a fresh resume point and tell him to `/clear`. (Full protocol text lives in the root `CLAUDE.md`, added for both lanes.)
- **Statusline:** `~/.claude/settings.json` runs `~/.claude/statusline-command.sh`, showing context-usage % first (green `<60`, yellow `60-79`, bold red `>=80`), then model / branch / dir. Derived from the `context_window.used_percentage` stdin field.
- **Handoff at ~80% context:** proactively offer a handoff when the statusline crosses ~80%.
- **Token tiering:** for preview scaffolds and variant iteration, drop a model tier (via `/model`); step back up for token-level implementation commits and anything craft-critical. (Session-level `/model` is Eli-driven; the model cannot self-switch - this is a run-the-lane rule.)
- **Report format:** end reports with a compact ledger (PR, SHA, state, claims to verify, evidence pointers, open questions) - no narrative recap.
- **Delegate** searches -> `explorer`, gate runs -> `gatekeeper`, sweeps/counts -> `sweeper` (haiku subagents in `.claude/agents/`, landing via their own PR).

## Queue awareness (after the .claude/agents/ PR lands)

Two piloted tools queue to this lane; the hub briefs each when reached. Nothing to do now: (1) Graphify knowledge-graph skill, then (2) a Ponytail trial.

## Identity

- The DESIGN lane, one terminal, persists across context clears. There is NO other design terminal - all redesign / canvas / CV-surface / token / onboarding-V2-surface work is this lane's, even if authored in an earlier session.
- The "hub" (Eli) verifies claims, applies migrations, and rules on merges. One writer per path.

## Owned paths

- CV Studio: `src/components/cv-studio/*` (CVStudioView, CVStudioLive); `src/lib/{writeProfileEntity,serializedWriteThrough,revertCvDataField,cvDataAdapter,useSeededCvModel}`; `supabase/functions/_shared/write-mediation.ts` (client+edge shared write layer).
- Redesign surface: `src/components/redesign/*` (home: ThreeTabHome, CvMatchedRolesRail, useTopMatches; shell: CanvasShell/Sidebar/CoachDock); `src/pages/_preview/*` canvas previews.
- Tokens/palette: `src/index.css` (`--rd-*` vars), `tailwind.config.js` (`rd-*` utilities), the `design-craft` skill doc.
- Home is this lane's - owns the `?welcome=1` arrival moment.

## Current arc: CV RED -> canvas Phase 2

- #659 CV RED Phase 1 - MERGED (6b00d72), LIVE prod. Write-layer fixes (priorOverride baseline, per-entity serialization, single-field mediated undo via revertCvDataField, no-op skip - UNCONDITIONAL, both flags) + three self-framed lanes (white card #FFFCF4, matched-roles, coach) + rail depth + trash fix, flag-on gated.
- #676 lessons - MERGED (1339ef9).
- #675 onboarding V2 direction screen - MERGED (68c229e), hub migration applied. Adds DirectionScreenV2.jsx + OnboardingV2.jsx (19 rd-coral refs).
- #677 token rename rd-coral*->rd-primary* - MERGED (1697063). Re-swept after #675 (DirectionScreenV2 + OnboardingV2). Zero rd-coral in code; docs keep retirement records.

## Standing rulings / constraints (verbatim)

- FLAG-OFF BYTE-IDENTITY: every flag-on change gated on isNextDesign()/rightRail; flag-off output byte-identical. Preserve EXACT Tailwind class strings (no class-sorter; token order matters).
- ONE WRITER PER PATH.
- Real flag param is `?next=1` (index.html bootstrap reads URLSearchParams.get("next"); "nextDesign" is the localStorage KEY, not a URL param). Flag-on reveal: `/Home?next=1`; `?next=0` clears. Flag-off editor: `/CVAgent`.
- NO whole-model persists in the CV write layer - per-field mediated writes only (undo included).
- TOKEN: the primary renders #60617d (slate/indigo) and is the KEEPER - no re-tint. #D6421F is RETIRED. Renamed rd-coral* -> rd-primary* (role-named). ZERO value changes. `trackColor` is EXCEPTED from the rd-coral sweep (it is a JS prop, not the token).
- Canvas palette (live): `--rd-bg-card #FFFCF4`, `--rd-bg-page #F4EBDA` (ground), `--rd-primary #60617d`.
- GROUND (Slice 1): **ALL particulate texture retired at the category level** (2026-07-22) - dots (round 1) AND baked grain (round 2) both rejected: Eli's eye reads any high-frequency speckle as a dirty screen. No dots, no grain, no speckle, no particulate ground texture, ever. Banding is speckle's cousin and equally disqualifying (no dither). Round 3 = SMOOTH low-frequency tonal only, or flat (a live candidate). The `mix-blend-mode: soft-light` mean-preserving finding carries forward to anything tonal. Canonical log: `docs/design/phase2-canvas-arrival-plan.md`.

## Next actions

1. [DONE] #677 token rename - MERGED (1697063). Merge-forwarded main, re-swept 28 rd-coral occurrences in DirectionScreenV2 (18) + OnboardingV2 (10); zero rd-coral in code repo-wide (docs keep retirement records; trackColor N/A).
2. [HELD for Eli's eye] Slice 1 ground bake-off ROUND 3 (smooth tonal) - PR #678, branch eli/canvas-ground-bakeoff, deployed SHA **ca592c4**. `/_preview/canvas-ground` (forces data-next-design for the real canvas palette): **Flat** (now a LIVE candidate - "nothing" may win) + three SMOOTH variants (Warm mottle = DepthField blobs static / Edge wash = radial vignette / Directional wash). Variants compete against flat, not each other. Verified live on the branch preview; Eli to judge banding on a real display. Winner (or flat) becomes the token-level ground, replacing the retired `GrainGround` dot grid. Rounds 1 (dots) + 2 (grain) both rejected as particulate.
3. [LATER, held] arrival moment: Home plays a populated first-landing entrance on `?welcome=1`, no-ops gracefully when absent / flag-off (cross-lane contract with onboarding V2 completion + the onboarding_cv_ready signal).

## Open questions for the hub

- Ground variant selection (pending eye-cert).
- Arrival-moment slice timing + remaining Phase 2/3 order.
