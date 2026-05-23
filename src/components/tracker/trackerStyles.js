// Direction 3 tokens scoped to .tracker. Same vocabulary as .roadmap /
// .jobs / .onb / .act / .login / .home / .lp. Inlined once at the top of
// Tracker.jsx and cascades to ApplicationRow + all 7 tab sub-components
// (ApplicationChecklist / CVManagement / SkillsRequired / ProjectsProof /
// NetworkingReferrals / InterviewPrep / FollowUp).

export const TRACKER_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500&family=Geist:wght@400;500;600;700&display=swap');

.tracker {
  --tk-bg: #F4F4F2;
  --tk-bg-tinted: #E8E8E5;
  --tk-ink: #0E1014;
  --tk-ink-soft: #52545A;
  --tk-ink-faded: #9C9DA1;
  --tk-accent: #F87060;
  --tk-accent-deep: #C84F40;
  --tk-accent-tint: #FDE7E3;
  --tk-card: #FFFFFF;
  --tk-line: #DDDDDB;
  --tk-line-soft: #E8E8E5;
  --tk-success: #1D7556;
  --tk-success-tint: #DBEEE5;
  --tk-warning: #B8841C;
  --tk-warning-tint: #F5E8C9;
  --tk-info: #2B5DC4;
  --tk-info-tint: #DEE6F7;
  --tk-violet: #6B4FBF;
  --tk-violet-tint: #E7E0F5;
  --tk-radius-sm: 8px;
  --tk-radius: 14px;
  --tk-radius-lg: 20px;
  --tk-font: 'Geist', system-ui, sans-serif;
  --tk-font-mono: 'Geist Mono', ui-monospace, monospace;
  font-family: var(--tk-font);
  color: var(--tk-ink);
  background: var(--tk-bg);
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
}
.tracker *, .tracker *::before, .tracker *::after { box-sizing: border-box; }

/* Typography */
.tk-h1 { font-family: var(--tk-font); font-size: 30px; font-weight: 700; letter-spacing: -0.025em; line-height: 1.1; color: var(--tk-ink); margin: 0; }
.tk-sub { font-size: 14.5px; line-height: 1.55; color: var(--tk-ink-soft); margin: 6px 0 0; }
.tk-eyebrow { font-family: var(--tk-font-mono); font-size: 11px; font-weight: 500; color: var(--tk-ink-faded); letter-spacing: 0.08em; text-transform: uppercase; }

/* Cards */
.tk-card { background: var(--tk-card); border: 1px solid var(--tk-line); border-radius: var(--tk-radius); }
.tk-card-pad { padding: 20px; }
.tk-card-inset { background: var(--tk-bg-tinted); border: 1px solid var(--tk-line-soft); border-radius: var(--tk-radius); padding: 14px; }

/* Buttons */
.tk-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 9px 16px; border-radius: 100px; font-size: 13px; font-weight: 600; font-family: var(--tk-font); cursor: pointer; text-decoration: none; border: none; transition: transform 0.15s ease, background 0.15s ease, color 0.15s ease, border-color 0.15s ease; white-space: nowrap; }
.tk-btn:hover:not(:disabled) { transform: translateY(-1px); }
.tk-btn:active:not(:disabled) { transform: scale(0.98); }
.tk-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
.tk-btn-primary { background: var(--tk-ink); color: var(--tk-bg); box-shadow: 0 4px 14px rgba(14, 16, 20, 0.12); }
.tk-btn-primary:hover:not(:disabled) { background: var(--tk-accent); color: white; }
.tk-btn-outline { background: transparent; color: var(--tk-ink); border: 1px solid var(--tk-line); }
.tk-btn-outline:hover:not(:disabled) { background: var(--tk-bg-tinted); border-color: var(--tk-ink-soft); }
.tk-btn-ghost { background: transparent; color: var(--tk-ink-soft); padding: 6px 10px; }
.tk-btn-ghost:hover:not(:disabled) { color: var(--tk-ink); background: var(--tk-bg-tinted); }
.tk-btn-sm { padding: 6px 12px; font-size: 12px; }

/* Inputs */
.tk-input { width: 100%; padding: 10px 14px; border-radius: var(--tk-radius); border: 1px solid var(--tk-line); background: var(--tk-card); color: var(--tk-ink); font-family: var(--tk-font); font-size: 14px; transition: border-color 0.15s ease, box-shadow 0.15s ease; }
.tk-input::placeholder { color: var(--tk-ink-faded); }
.tk-input:focus { outline: none; border-color: var(--tk-ink); box-shadow: 0 0 0 3px rgba(14, 16, 20, 0.08); }

/* Status filter pills */
.tk-filter-pill { display: inline-flex; align-items: center; gap: 5px; padding: 7px 14px; border-radius: 100px; border: 1px solid var(--tk-line); background: var(--tk-card); font-family: var(--tk-font); font-size: 12.5px; font-weight: 500; color: var(--tk-ink-soft); cursor: pointer; transition: all 0.15s ease; white-space: nowrap; }
.tk-filter-pill:hover { border-color: var(--tk-ink-soft); color: var(--tk-ink); }
.tk-filter-pill[data-selected="true"] { background: var(--tk-ink); color: var(--tk-bg); border-color: var(--tk-ink); font-weight: 600; }

/* "How to use" hero card — dark ink with coral accent */
.tk-howto { background: var(--tk-ink); color: white; border-radius: var(--tk-radius); padding: 20px; }
.tk-howto-eyebrow { font-family: var(--tk-font-mono); font-size: 11px; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; color: var(--tk-accent); margin-bottom: 8px; }
.tk-howto-body { font-size: 14px; line-height: 1.55; color: rgba(255,255,255,0.92); margin-bottom: 14px; }
.tk-howto-body strong { color: white; font-weight: 600; }
.tk-howto-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
@media (max-width: 720px) { .tk-howto-grid { grid-template-columns: 1fr 1fr; } }
@media (max-width: 480px) { .tk-howto-grid { grid-template-columns: 1fr; } }
.tk-howto-tile { background: rgba(255,255,255,0.05); border-radius: var(--tk-radius-sm); padding: 12px 14px; }
.tk-howto-tile-head { font-size: 12.5px; font-weight: 600; color: white; margin-bottom: 3px; }
.tk-howto-tile-body { font-size: 11.5px; color: rgba(255,255,255,0.65); line-height: 1.5; }
.tk-howto-tile-accent { background: rgba(248, 112, 96, 0.15); border: 1px solid rgba(248, 112, 96, 0.3); }
.tk-howto-tile-accent .tk-howto-tile-head { color: var(--tk-accent); }
.tk-howto-tile-accent .tk-howto-tile-body { color: rgba(248, 112, 96, 0.82); }

/* Application row (the expandable card) */
.tk-row { background: var(--tk-card); border: 1px solid var(--tk-line); border-radius: var(--tk-radius); overflow: hidden; transition: border-color 0.15s ease; }
.tk-row:hover { border-color: var(--tk-ink-soft); }
.tk-row-header { width: 100%; padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; gap: 12px; background: transparent; border: 0; cursor: pointer; text-align: left; font-family: var(--tk-font); }
.tk-row-title { font-size: 14.5px; font-weight: 600; color: var(--tk-ink); line-height: 1.3; }
.tk-row-company { font-size: 12.5px; color: var(--tk-ink-soft); margin-top: 2px; }
.tk-row-body { border-top: 1px solid var(--tk-line-soft); }

/* Status badge — pill with semantic tint */
.tk-status { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 100px; font-family: var(--tk-font-mono); font-size: 10.5px; font-weight: 500; letter-spacing: 0.05em; text-transform: uppercase; white-space: nowrap; }
.tk-status-interested  { background: var(--tk-bg-tinted);   color: var(--tk-ink-soft); }
.tk-status-preparing   { background: var(--tk-info-tint);   color: #1E4A9E; }
.tk-status-applied     { background: var(--tk-violet-tint); color: var(--tk-violet); }
.tk-status-interviewing { background: var(--tk-warning-tint); color: #6B4E0F; }
.tk-status-offer       { background: var(--tk-success-tint); color: var(--tk-success); }
.tk-status-accepted    { background: var(--tk-success);     color: white; }
.tk-status-rejected    { background: #F4D4D4; color: #8B2C2C; }

/* Track badge — uses shared TRACK_CONFIG colors via inline class. */
.tk-track-pill { display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; border-radius: 100px; font-family: var(--tk-font); font-size: 12px; font-weight: 600; line-height: 1; }
.tk-track-badge { display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; border-radius: 50%; font-size: 10px; font-weight: 700; color: white; }
.tk-track-green .tk-track-badge { background: var(--tk-success); }
.tk-track-gray  .tk-track-badge { background: var(--tk-ink-soft); }
.tk-track-amber .tk-track-badge { background: var(--tk-warning); }
.tk-track-green { background: var(--tk-success-tint); color: var(--tk-success); }
.tk-track-gray  { background: var(--tk-bg-tinted);    color: var(--tk-ink-soft); }
.tk-track-amber { background: var(--tk-warning-tint); color: #6B4E0F; }

/* Status select inside the expanded row */
.tk-status-bar { padding: 12px 20px; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid var(--tk-line-soft); }

/* Tab strip — underline tabs, coral on active. 9 tabs justify underline
   over pill style at this density. */
.tk-tabs { display: flex; border-bottom: 1px solid var(--tk-line-soft); overflow-x: auto; }
.tk-tab { padding: 10px 16px; font-family: var(--tk-font); font-size: 12.5px; font-weight: 500; color: var(--tk-ink-faded); background: transparent; border: 0; border-bottom: 2px solid transparent; cursor: pointer; white-space: nowrap; transition: color 0.15s ease, border-color 0.15s ease; display: inline-flex; align-items: center; gap: 5px; }
.tk-tab:hover:not([data-locked="true"]) { color: var(--tk-ink-soft); }
.tk-tab[data-active="true"] { color: var(--tk-ink); border-bottom-color: var(--tk-accent); font-weight: 600; }
.tk-tab[data-locked="true"] { color: rgba(156, 157, 161, 0.5); cursor: help; }

/* Tab content panel */
.tk-tab-panel { padding: 20px; }
.tk-tab-panel-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 8px 0; }
.tk-tab-panel-row + .tk-tab-panel-row { border-top: 1px solid var(--tk-line-soft); }
.tk-tab-panel-key { font-size: 12.5px; color: var(--tk-ink-soft); }
.tk-tab-panel-val { font-size: 12.5px; color: var(--tk-ink); font-weight: 500; }

/* Locked-tab notice */
.tk-locked-notice { display: flex; align-items: flex-start; gap: 10px; padding: 16px; background: var(--tk-bg-tinted); border-radius: var(--tk-radius); }

/* Inline retry / calculating affordances */
.tk-meta-retry { font-family: var(--tk-font-mono); font-size: 10.5px; color: #6B4E0F; display: inline-flex; align-items: center; gap: 4px; background: transparent; border: 0; cursor: pointer; padding: 0; }
.tk-meta-retry:hover:not(:disabled) { color: var(--tk-warning); }
.tk-meta-italic { font-size: 10.5px; color: var(--tk-ink-faded); font-style: italic; }

/* Qualification score — green when strong, gray when weak. No red (red is
   punitive on a 35% fit signal that's still a candidate's reality). */
.tk-score-strong { font-size: 12px; font-weight: 600; color: var(--tk-success); font-variant-numeric: tabular-nums; }
.tk-score-soft   { font-size: 12px; font-weight: 600; color: var(--tk-ink-soft); font-variant-numeric: tabular-nums; }

/* Empty state */
.tk-empty { background: var(--tk-card); border: 1px solid var(--tk-line); border-radius: var(--tk-radius); padding: 40px 20px; text-align: center; }
`;
