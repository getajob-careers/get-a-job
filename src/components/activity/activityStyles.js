// Direction 3 tokens scoped to .act. Same vocabulary as .roadmap / .jobs /
// .onb / .home / .login / .lp. Inlined once at the top of each Activity
// page (Calendar / Tasks / Internship) and cascades to their sub-components.
// Tracker is on its own redesign cadence (PR-B) and doesn't use .act yet.

export const ACT_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500&family=Geist:wght@400;500;600;700&display=swap');

.act {
  --act-bg: #F4F4F2;
  --act-bg-tinted: #E8E8E5;
  --act-ink: #0E1014;
  --act-ink-soft: #52545A;
  --act-ink-faded: #9C9DA1;
  --act-accent: #F87060;
  --act-accent-deep: #C84F40;
  --act-accent-tint: #FDE7E3;
  --act-card: #FFFFFF;
  --act-line: #DDDDDB;
  --act-line-soft: #E8E8E5;
  --act-success: #1D7556;
  --act-success-tint: #DBEEE5;
  --act-warning: #B8841C;
  --act-warning-tint: #F5E8C9;
  --act-info: #2B5DC4;
  --act-info-tint: #DEE6F7;
  --act-radius-sm: 8px;
  --act-radius: 14px;
  --act-radius-lg: 20px;
  --act-font: 'Geist', system-ui, sans-serif;
  --act-font-mono: 'Geist Mono', ui-monospace, monospace;
  font-family: var(--act-font);
  color: var(--act-ink);
  background: var(--act-bg);
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
}
.act *, .act *::before, .act *::after { box-sizing: border-box; }

/* Typography */
.act-h1 { font-family: var(--act-font); font-size: 30px; font-weight: 700; letter-spacing: -0.025em; line-height: 1.1; color: var(--act-ink); margin: 0; }
.act-sub { font-size: 14.5px; line-height: 1.55; color: var(--act-ink-soft); margin: 6px 0 0; }
.act-eyebrow { font-family: var(--act-font-mono); font-size: 11px; font-weight: 500; color: var(--act-ink-faded); letter-spacing: 0.08em; text-transform: uppercase; }
.act-label { display: block; font-size: 13px; font-weight: 500; color: var(--act-ink); margin-bottom: 6px; }

/* Card */
.act-card { background: var(--act-card); border: 1px solid var(--act-line); border-radius: var(--act-radius); padding: 20px; }
.act-card-lg { padding: 24px; border-radius: var(--act-radius-lg); }

/* Buttons */
.act-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 9px 16px; border-radius: 100px; font-size: 13px; font-weight: 600; font-family: var(--act-font); cursor: pointer; text-decoration: none; border: none; transition: transform 0.15s ease, background 0.15s ease, color 0.15s ease, border-color 0.15s ease; white-space: nowrap; }
.act-btn:hover:not(:disabled) { transform: translateY(-1px); }
.act-btn:active:not(:disabled) { transform: scale(0.98); }
.act-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
.act-btn-primary { background: var(--act-ink); color: var(--act-bg); box-shadow: 0 4px 14px rgba(14, 16, 20, 0.12); }
.act-btn-primary:hover:not(:disabled) { background: var(--act-accent); color: white; }
.act-btn-outline { background: transparent; color: var(--act-ink); border: 1px solid var(--act-line); }
.act-btn-outline:hover:not(:disabled) { background: var(--act-bg-tinted); border-color: var(--act-ink-soft); }
.act-btn-ghost { background: transparent; color: var(--act-ink-soft); padding: 6px 10px; }
.act-btn-ghost:hover:not(:disabled) { color: var(--act-ink); background: var(--act-bg-tinted); }
.act-btn-sm { padding: 6px 12px; font-size: 12px; }

/* Inputs */
.act-input { width: 100%; padding: 10px 14px; border-radius: var(--act-radius); border: 1px solid var(--act-line); background: var(--act-card); color: var(--act-ink); font-family: var(--act-font); font-size: 14px; transition: border-color 0.15s ease, box-shadow 0.15s ease; }
.act-input::placeholder { color: var(--act-ink-faded); }
.act-input:focus { outline: none; border-color: var(--act-ink); box-shadow: 0 0 0 3px rgba(14, 16, 20, 0.08); }

/* Banners */
.act-banner { padding: 12px 16px; border-radius: var(--act-radius); font-size: 13.5px; line-height: 1.5; }
.act-banner-warning { background: var(--act-warning-tint); color: #6B4E0F; border: 1px solid #E0B850; }
.act-banner-info { background: var(--act-info-tint); color: #1E4A9E; border: 1px solid #A8BFEA; }
.act-banner-error { background: var(--act-accent-tint); color: var(--act-accent-deep); border: 1px solid var(--act-accent); }

/* Filter pills (Tasks category, Calendar view modes, etc.) */
.act-pill { display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 100px; border: 1px solid var(--act-line); background: var(--act-card); font-family: var(--act-font); font-size: 12.5px; font-weight: 500; color: var(--act-ink-soft); cursor: pointer; transition: all 0.15s ease; white-space: nowrap; }
.act-pill:hover { border-color: var(--act-ink-soft); color: var(--act-ink); }
.act-pill[data-selected="true"] { background: var(--act-ink); color: var(--act-bg); border-color: var(--act-ink); font-weight: 600; }
.act-pill-sm { padding: 6px 11px; font-size: 12px; }

/* Item chips inside calendar grid + selected-date sidebar */
.act-chip { display: inline-flex; align-items: center; gap: 4px; padding: 2px 6px; border-radius: var(--act-radius-sm); font-size: 10.5px; line-height: 1.3; }
.act-chip-apply     { background: var(--act-info-tint); color: #1E4A9E; border: 1px solid rgba(43, 93, 196, 0.2); }
.act-chip-interview { background: var(--act-accent-tint); color: var(--act-accent-deep); border: 1px solid rgba(248, 112, 96, 0.3); }
.act-chip-followup  { background: var(--act-success-tint); color: var(--act-success); border: 1px solid rgba(29, 117, 86, 0.2); }
.act-chip-task      { background: var(--act-warning-tint); color: #6B4E0F; border: 1px solid rgba(184, 132, 28, 0.25); }

/* Day-cell variants follow the same color family */
.act-itemcard {
  width: 100%; text-align: left; padding: 10px 12px; border-radius: var(--act-radius);
  border: 1px solid var(--act-line); background: var(--act-card); cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;
}
.act-itemcard:hover { border-color: var(--act-ink-soft); }
.act-itemcard[data-kind="apply"]:hover     { background: var(--act-info-tint); border-color: var(--act-info); }
.act-itemcard[data-kind="interview"]:hover { background: var(--act-accent-tint); border-color: var(--act-accent); }
.act-itemcard[data-kind="followup"]:hover  { background: var(--act-success-tint); border-color: var(--act-success); }
.act-itemcard[data-kind="task"]:hover      { background: var(--act-warning-tint); border-color: var(--act-warning); }

/* Calendar grid day cell */
.act-day-cell { display: flex; flex-direction: column; gap: 4px; padding: 8px; border-radius: var(--act-radius); text-align: left; background: var(--act-card); color: var(--act-ink); cursor: pointer; transition: background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease; border: 1px solid var(--act-line); min-height: 84px; }
.act-day-cell-compact { min-height: 140px; }
.act-day-cell:hover { background: var(--act-bg-tinted); }
.act-day-cell[data-out-of-month="true"] { color: var(--act-ink-faded); background: var(--act-bg-tinted); }
.act-day-cell[data-selected="true"] { box-shadow: 0 0 0 2px var(--act-ink); }
.act-day-cell[data-today="true"]:not([data-selected="true"]) { border-color: var(--act-accent); box-shadow: 0 0 0 1px var(--act-accent); }
.act-day-cell-num { font-size: 12px; font-weight: 600; }
.act-day-cell[data-today="true"] .act-day-cell-num { color: var(--act-accent); }

/* Status accent variables — Internship kanban column header chips */
.act-status-gray   { --act-status-fg: var(--act-ink-soft); --act-status-bg: var(--act-bg-tinted); }
.act-status-info   { --act-status-fg: #1E4A9E; --act-status-bg: var(--act-info-tint); }
.act-status-warning { --act-status-fg: #6B4E0F; --act-status-bg: var(--act-warning-tint); }
.act-status-success { --act-status-fg: var(--act-success); --act-status-bg: var(--act-success-tint); }
.act-status-error  { --act-status-fg: var(--act-accent-deep); --act-status-bg: var(--act-accent-tint); }
.act-status-badge {
  display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 100px;
  font-family: var(--act-font-mono); font-size: 10.5px; font-weight: 500;
  letter-spacing: 0.04em; text-transform: uppercase;
  color: var(--act-status-fg, var(--act-ink-soft));
  background: var(--act-status-bg, var(--act-bg-tinted));
}

/* Internship kanban — desktop 6-col grid wrapped in horizontal scroll */
.act-kanban-row { display: grid; grid-template-columns: repeat(6, minmax(220px, 1fr)); gap: 12px; min-width: 1100px; }
.act-kanban-col { display: flex; flex-direction: column; gap: 8px; padding: 12px; border-radius: var(--act-radius); background: var(--act-bg-tinted); min-height: 200px; transition: background 0.15s ease; }
.act-kanban-col[data-dragover="true"] { background: var(--act-accent-tint); box-shadow: inset 0 0 0 2px var(--act-accent); }
.act-kanban-col-head { display: flex; align-items: center; justify-content: space-between; padding: 2px 4px; }
.act-kanban-col-count { font-family: var(--act-font-mono); font-size: 11px; color: var(--act-ink-faded); font-variant-numeric: tabular-nums; }
.act-kanban-empty { font-size: 12px; color: var(--act-ink-faded); font-style: italic; padding: 8px 4px; }

/* Internship mobile accordion — replaces drag-drop on <768px */
.act-accordion-section { background: var(--act-card); border: 1px solid var(--act-line); border-radius: var(--act-radius); margin-bottom: 10px; overflow: hidden; }
.act-accordion-head { width: 100%; display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; background: transparent; border: 0; cursor: pointer; font-family: var(--act-font); }
.act-accordion-head:hover { background: var(--act-bg-tinted); }
.act-accordion-body { padding: 0 14px 14px; display: flex; flex-direction: column; gap: 8px; border-top: 1px solid var(--act-line-soft); padding-top: 12px; }

/* Company target card */
.act-target-card { width: 100%; text-align: left; padding: 14px; background: var(--act-card); border: 1px solid var(--act-line); border-radius: var(--act-radius); cursor: pointer; transition: border-color 0.15s ease, box-shadow 0.15s ease; }
.act-target-card:hover { border-color: var(--act-ink-soft); box-shadow: 0 1px 3px rgba(14,16,20,0.06); }
.act-target-card-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
.act-target-card-title { font-size: 14px; font-weight: 600; color: var(--act-ink); line-height: 1.3; }
.act-target-card-sub { font-size: 11.5px; color: var(--act-ink-faded); margin-top: 3px; }
.act-target-card-scores { display: flex; gap: 12px; margin-top: 8px; font-size: 11.5px; }
.act-target-card-pitch { font-size: 11.5px; color: var(--act-ink-soft); margin-top: 8px; font-style: italic; }

/* Due-date chip (Tasks) — calm, neutral. No urgency theatre for non-urgent
   dates. Color shifts only when overdue or due-today, both of which deserve
   the eye. */
.act-due-chip { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 100px; font-family: var(--act-font-mono); font-size: 11px; font-weight: 500; letter-spacing: 0.02em; background: var(--act-bg-tinted); color: var(--act-ink-soft); }
.act-due-chip[data-state="today"]   { background: var(--act-accent-tint); color: var(--act-accent-deep); }
.act-due-chip[data-state="overdue"] { background: var(--act-accent); color: white; }
`;
