# Design lane - resume point

**After any context clear, read THIS + tasks/lessons.md first. Never reconstruct from scratch.**
Overwrite this file each breakpoint (PR held / merged / ruling) and before ending a session. Resume point, not a log.

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
- #677 token rename rd-coral*->rd-primary* - OPEN, HELD, being merged NOW. Hub-verified on-branch (zero residual rd-coral except trackColor, hexes preserved, plan doc landed). Must re-sweep after #675 to catch the 19 refs in DirectionScreenV2 + OnboardingV2.

## Standing rulings / constraints (verbatim)

- FLAG-OFF BYTE-IDENTITY: every flag-on change gated on isNextDesign()/rightRail; flag-off output byte-identical. Preserve EXACT Tailwind class strings (no class-sorter; token order matters).
- ONE WRITER PER PATH.
- Real flag param is `?next=1` (index.html bootstrap reads URLSearchParams.get("next"); "nextDesign" is the localStorage KEY, not a URL param). Flag-on reveal: `/Home?next=1`; `?next=0` clears. Flag-off editor: `/CVAgent`.
- NO whole-model persists in the CV write layer - per-field mediated writes only (undo included).
- TOKEN: the primary renders #60617d (slate/indigo) and is the KEEPER - no re-tint. #D6421F is RETIRED. Renamed rd-coral* -> rd-primary* (role-named). ZERO value changes. `trackColor` is EXCEPTED from the rd-coral sweep (it is a JS prop, not the token).
- Canvas palette (live): `--rd-bg-card #FFFCF4`, `--rd-bg-page #F4EBDA` (ground), `--rd-primary #60617d`.
- GROUND (Slice 1): dot-grain texture, token-level, flag-on only, dialed so the white cards lift. NO feTurbulence - use CSS dot-grain.

## Next actions

1. [IN PROGRESS] #677: bring current main into the branch (force-push blocked by policy -> merge-forward, not rebase; squash-merge collapses it), re-sweep DirectionScreenV2 + OnboardingV2 (19 rd-coral refs), verify zero rd-coral repo-wide (trackColor excepted), gates green, squash-merge, confirm merged, delete branch, report post-rebase sweep count.
2. Slice 1: 2-3 dialed dot-grain ground variants on a `/_preview` route -> nominate for Eli's eye.
3. [LATER, held] arrival moment: Home plays a populated first-landing entrance on `?welcome=1`, no-ops gracefully when absent / flag-off (cross-lane contract with onboarding V2 completion + the onboarding_cv_ready signal).

## Open questions for the hub

- Ground variant selection (pending eye-cert).
- Arrival-moment slice timing + remaining Phase 2/3 order.
