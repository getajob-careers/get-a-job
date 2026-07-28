# Canvas vs. Production — port-planning input

Input for the page-port planning conversation. The canvas at `/_preview/home-3tab`
is fully fixture-backed (`CANVAS_FIXTURES`), mutation-safe, runs inside the real
`Layout`. Every `Canvas*` file is a **clone** in `src/pages/_preview/canvas/` —
production components were never touched (sandbox rule). Draft PR **#596** is the
full held diff.

## Design layer (the foundation to port — mostly new tokens/CSS)

| Canvas has                                                                             | Production has                              | Port note                                                               |
| -------------------------------------------------------------------------------------- | ------------------------------------------- | ----------------------------------------------------------------------- |
| **Clay palette** (`palette.js`, applied to `documentElement`)                          | old cream+coral `--rd-*` in `src/index.css` | swap the 23 `--rd-*` values in `index.css` = near-instant global reskin |
| **Type + radius scales** (`scale.css`: `rd-t-*` / `rd-r-*`)                            | ~19 ad-hoc `text-[Npx]`, 9 radii            | adopt scale classes app-wide; `scripts/check-scale.mjs` guards it       |
| **Elevation** (`elevation.css`: `rd-lift`, `rd-well`, `rd-press`)                      | 1px hairline borders everywhere             | swap borders → paper-lift on cards/panels                               |
| **Constraints**: ring low-fill floor (`ring.js`), badge AA floor                       | neither                                     | port `ring.js`; re-verify band AA against prod tokens                   |
| **Toolkit soft-3D** (`toolkit.css`, `toolColors.js`) + **Depth field** (`CanvasField`) | none                                        | scoped exception — per-tool tints + LinkedIn brand blue, this rail only |

## Component map (canvas clone → prod original, key change)

| Canvas                                | Prod original                         | What changed                                                                |
| ------------------------------------- | ------------------------------------- | --------------------------------------------------------------------------- |
| `CanvasJobCard`                       | `JobGridCard`                         | paper-lift, generous padding, hierarchy, spotlight glow, hover-action slide |
| `CanvasScoreRing`                     | (badge in JobGridCard)                | single **sheen arc** + number; breakdown in the hover legend                |
| `CanvasKanban`                        | `ApplicationsKanban`                  | status-tint headers + count chip, paper-lift cards                          |
| `CanvasCoachDock`                     | `CoachDock`                           | grain panel, inset-well input, lifted bubbles                               |
| `CanvasSidebar`                       | (feature tiles)                       | **toolkit carousel** of soft-3D objects + chevrons                          |
| `CanvasFunnelTile` / `CanvasChip`     | `RdFunnelTile` / inlined chips        | ring-motif tile / shared chip primitive                                     |
| `CanvasJobsFeed` / `CanvasTopMatches` | `UnifiedJobsFeed` / `TopMatchesPanel` | segmented toggle, edge-fade scroll, app-shell                               |
| shell (`Home3TabPreview`)             | `/Career` page                        | 3-tab + persistent sidebar, fixed-viewport per-column scroll, animated tabs |

## Not in the canvas (prod-only, to reconcile when porting)

- **Real data + write paths** (Track → DB, drag → Supabase, CV-gen LLM, coach LLM) — all stubbed to fixtures/toasts here.
- **IA change**: the canvas rail dropped Browse / Tracker / CV as tools (they're tabs). Prod nav must reconcile.
- **Interview coach / Skill hub / Tasks** — new tools, currently fixture no-ops (no routes yet).
- Mobile: the canvas uses a content-first bottom rail; prod mobile is separate.

## Suggested port order

1. **Tokens first** (`index.css` Clay + scale + elevation) — low-risk global lift; everything downstream inherits.
2. **Constraints** (`ring.js`, badge AA) — cheap, high-value.
3. **Components** in audit order (job card → kanban → coach → toolkit), each swapping the prod original onto the new tokens.
4. **Toolkit rail + IA** — biggest structural change; needs the nav decision + routes for the 3 new tools.

Companion docs: `docs/design/component-audit.md`, `docs/design/canvas-tokens.md`,
`docs/research/palette-market-scan-2026-07.md`.
