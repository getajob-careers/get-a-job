// Direction 3 tokens scoped to .roadmap. Same vocabulary as .onb / .home /
// .login / .lp — warm slate bg, dark ink, coral accent, Geist. Inlined once
// at the top of Roadmap.jsx and cascades to RoleCard + TrackQuadrantGrid.

export const ROADMAP_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500&family=Geist:wght@400;500;600;700&display=swap');

.roadmap {
  --rm-bg: #F4F4F2;
  --rm-bg-tinted: #E8E8E5;
  --rm-ink: #0E1014;
  --rm-ink-soft: #52545A;
  --rm-ink-faded: #9C9DA1;
  --rm-accent: #F87060;
  --rm-accent-deep: #C84F40;
  --rm-accent-tint: #FDE7E3;
  --rm-card: #FFFFFF;
  --rm-line: #DDDDDB;
  --rm-line-soft: #E8E8E5;
  --rm-success: #1D7556;
  --rm-success-tint: #DBEEE5;
  --rm-warning: #B8841C;
  --rm-warning-tint: #F5E8C9;
  --rm-info: #2B5DC4;
  --rm-info-tint: #DEE6F7;
  --rm-radius-sm: 8px;
  --rm-radius: 14px;
  --rm-radius-lg: 20px;
  --rm-font: 'Geist', system-ui, sans-serif;
  --rm-font-mono: 'Geist Mono', ui-monospace, monospace;
  font-family: var(--rm-font);
  color: var(--rm-ink);
  background: var(--rm-bg);
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
}
.roadmap *, .roadmap *::before, .roadmap *::after { box-sizing: border-box; }

/* Typography */
.rm-h1 { font-family: var(--rm-font); font-size: 30px; font-weight: 700; letter-spacing: -0.025em; line-height: 1.1; color: var(--rm-ink); margin: 0; }
.rm-sub { font-size: 14.5px; line-height: 1.55; color: var(--rm-ink-soft); margin: 6px 0 0; }
.rm-eyebrow { font-family: var(--rm-font-mono); font-size: 11px; font-weight: 500; color: var(--rm-ink-faded); letter-spacing: 0.08em; text-transform: uppercase; }
.rm-stamp { font-family: var(--rm-font-mono); font-size: 11px; color: var(--rm-ink-faded); letter-spacing: 0.02em; margin-top: 4px; }

/* Card surfaces */
.rm-card { background: var(--rm-card); border: 1px solid var(--rm-line); border-radius: var(--rm-radius); padding: 20px; }
.rm-card-lg { padding: 24px; border-radius: var(--rm-radius-lg); }

/* Buttons — pill, coral primary */
.rm-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 10px 18px; border-radius: 100px; font-size: 13.5px; font-weight: 600; font-family: var(--rm-font); cursor: pointer; text-decoration: none; border: none; transition: transform 0.15s ease, background 0.15s ease, color 0.15s ease; }
.rm-btn:hover:not(:disabled) { transform: translateY(-1px); }
.rm-btn:active:not(:disabled) { transform: scale(0.98); }
.rm-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
.rm-btn-primary { background: var(--rm-ink); color: var(--rm-bg); box-shadow: 0 4px 14px rgba(14, 16, 20, 0.12); }
.rm-btn-primary:hover:not(:disabled) { background: var(--rm-accent); color: white; }
.rm-btn-outline { background: transparent; color: var(--rm-ink); border: 1px solid var(--rm-line); }
.rm-btn-outline:hover:not(:disabled) { background: var(--rm-bg-tinted); }
.rm-btn-sm { padding: 7px 14px; font-size: 12.5px; }

/* Tabs — pill-shaped tablist with coral active state */
.rm-tabs { display: inline-flex; background: var(--rm-bg-tinted); border-radius: 100px; padding: 4px; gap: 2px; max-width: 100%; flex-wrap: wrap; }
.rm-tab { appearance: none; border: 0; background: transparent; font-family: var(--rm-font); font-size: 13px; font-weight: 500; color: var(--rm-ink-soft); padding: 7px 16px; border-radius: 100px; cursor: pointer; transition: background 0.15s ease, color 0.15s ease; white-space: nowrap; }
.rm-tab[aria-selected="true"] { background: var(--rm-card); color: var(--rm-ink); font-weight: 600; box-shadow: 0 1px 3px rgba(14, 16, 20, 0.06); }
.rm-tab:hover:not([aria-selected="true"]) { color: var(--rm-ink); }

/* Banners */
.rm-banner { padding: 12px 16px; border-radius: var(--rm-radius); font-size: 13.5px; line-height: 1.5; }
.rm-banner-warning { background: var(--rm-warning-tint); color: #6B4E0F; border: 1px solid #E0B850; }
.rm-banner-info { background: var(--rm-info-tint); color: #1E4A9E; border: 1px solid #A8BFEA; }
.rm-banner-error { background: var(--rm-accent-tint); color: var(--rm-accent-deep); border: 1px solid var(--rm-accent); }

/* Per-track accent variables — used by RoleCard, TrackQuadrantGrid, badges */
.rm-track-green { --rm-track-accent: var(--rm-success); --rm-track-tint: var(--rm-success-tint); --rm-track-border: rgba(29,117,86,0.3); }
.rm-track-gray  { --rm-track-accent: var(--rm-ink-soft); --rm-track-tint: var(--rm-bg-tinted); --rm-track-border: rgba(82,84,90,0.25); }
.rm-track-amber { --rm-track-accent: var(--rm-warning); --rm-track-tint: var(--rm-warning-tint); --rm-track-border: rgba(184,132,28,0.3); }

/* Track badge — number circle in track color */
.rm-track-badge { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 50%; font-family: var(--rm-font); font-size: 11.5px; font-weight: 700; color: white; background: var(--rm-track-accent, var(--rm-ink-soft)); }
.rm-track-pill { display: inline-flex; align-items: center; gap: 7px; padding: 4px 10px 4px 6px; border-radius: 100px; background: var(--rm-track-tint, var(--rm-bg-tinted)); color: var(--rm-track-accent, var(--rm-ink-soft)); font-size: 12px; font-weight: 600; line-height: 1; }

/* Role card */
.rm-role-card { background: var(--rm-card); border: 1px solid var(--rm-line); border-radius: var(--rm-radius); overflow: hidden; transition: border-color 0.15s ease, box-shadow 0.15s ease; position: relative; }
.rm-role-card::before { content: ""; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: var(--rm-track-accent, var(--rm-ink-soft)); }
.rm-role-card:hover { border-color: var(--rm-ink-soft); }
.rm-role-card-header { width: 100%; padding: 18px 20px 16px; display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; background: transparent; border: 0; cursor: pointer; text-align: left; font-family: var(--rm-font); }
.rm-role-card-title { font-family: var(--rm-font); font-size: 15px; font-weight: 600; color: var(--rm-ink); line-height: 1.3; }
.rm-role-card-meta { display: flex; align-items: center; gap: 10px; margin-top: 6px; flex-wrap: wrap; font-size: 12px; color: var(--rm-ink-faded); }
.rm-role-card-body { padding: 16px 20px 20px; border-top: 1px solid var(--rm-line-soft); display: flex; flex-direction: column; gap: 18px; }

/* Track breakdown bars — coral fill on the weak axis to draw the eye */
.rm-bar-row { display: flex; flex-direction: column; gap: 4px; }
.rm-bar-row-head { display: flex; justify-content: space-between; align-items: baseline; font-size: 12.5px; }
.rm-bar-row-head .label { color: var(--rm-ink-soft); }
.rm-bar-row-head .value { color: var(--rm-ink); font-weight: 600; font-variant-numeric: tabular-nums; }
.rm-bar-track { height: 6px; background: var(--rm-bg-tinted); border-radius: 100px; overflow: hidden; }
.rm-bar-fill { height: 100%; background: var(--rm-ink); border-radius: 100px; transition: width 0.3s ease; }
.rm-bar-fill[data-weak="true"] { background: var(--rm-accent); }

/* Skill pills inside the card */
.rm-skill-pill { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 100px; font-size: 12px; font-weight: 500; line-height: 1; }
.rm-skill-pill-matched { background: var(--rm-success-tint); color: var(--rm-success); border: 1px solid rgba(29, 117, 86, 0.18); }
.rm-skill-pill-missing { background: var(--rm-warning-tint); color: #6B4E0F; border: 1px solid rgba(184, 132, 28, 0.25); }

/* Action items */
.rm-action-item { display: flex; align-items: flex-start; gap: 8px; font-size: 13px; color: var(--rm-ink-soft); line-height: 1.5; }
.rm-action-item svg { flex-shrink: 0; margin-top: 4px; color: var(--rm-accent); }

/* Live matches list */
.rm-job-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 12px 14px; border-radius: var(--rm-radius); border: 1px solid transparent; transition: background 0.15s ease, border-color 0.15s ease; text-decoration: none; color: inherit; }
.rm-job-row:hover { background: var(--rm-accent-tint); border-color: var(--rm-accent); }
.rm-job-row-title { font-size: 13.5px; font-weight: 500; color: var(--rm-ink); line-height: 1.3; }
.rm-job-row-meta { display: flex; align-items: center; gap: 10px; margin-top: 3px; font-size: 12px; color: var(--rm-ink-faded); flex-wrap: wrap; }

/* Quadrant grid restyle */
.rm-quadrant { display: grid; grid-template-columns: auto 1fr; gap: 8px; max-width: 340px; margin: 0 auto; }
.rm-quadrant-yaxis { writing-mode: vertical-rl; transform: rotate(180deg); display: flex; align-items: center; justify-content: center; font-family: var(--rm-font-mono); font-size: 10px; font-weight: 500; color: var(--rm-ink-soft); letter-spacing: 0.05em; text-transform: uppercase; white-space: nowrap; }
.rm-quadrant-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.rm-quadrant-cell { border-radius: var(--rm-radius-sm); padding: 12px; text-align: left; }
.rm-quadrant-cell[data-track="green"] { background: var(--rm-success-tint); border: 2px solid var(--rm-success); }
.rm-quadrant-cell[data-track="gray"]  { background: var(--rm-bg-tinted);   border: 1px solid var(--rm-line); }
.rm-quadrant-cell[data-track="amber"] { background: var(--rm-warning-tint); border: 1px solid rgba(184,132,28,0.4); }
.rm-quadrant-cell[data-track="empty"] { background: var(--rm-card); border: 1px dashed var(--rm-line); }
.rm-quadrant-tag { font-family: var(--rm-font-mono); font-size: 10px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }
.rm-quadrant-cell[data-track="green"] .rm-quadrant-tag { color: var(--rm-success); }
.rm-quadrant-cell[data-track="amber"] .rm-quadrant-tag { color: var(--rm-warning); }
.rm-quadrant-cell[data-track="gray"]  .rm-quadrant-tag { color: var(--rm-ink-soft); }
.rm-quadrant-cell[data-track="empty"] .rm-quadrant-tag { color: var(--rm-ink-faded); }
.rm-quadrant-label { font-size: 11px; margin-top: 2px; }
.rm-quadrant-cell[data-track="green"] .rm-quadrant-label { color: #0F4E36; }
.rm-quadrant-cell[data-track="amber"] .rm-quadrant-label { color: #6B4E0F; }
.rm-quadrant-cell[data-track="gray"]  .rm-quadrant-label { color: var(--rm-ink-soft); }
.rm-quadrant-cell[data-track="empty"] .rm-quadrant-label { color: var(--rm-ink-faded); font-style: italic; }
.rm-quadrant-xaxis { font-family: var(--rm-font-mono); font-size: 10px; font-weight: 500; color: var(--rm-ink-soft); letter-spacing: 0.05em; text-transform: uppercase; text-align: center; margin-top: 6px; }
`;
