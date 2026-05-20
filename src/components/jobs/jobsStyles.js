// Direction 3 tokens scoped to .jobs. Same vocabulary as .roadmap / .onb /
// .home / .login / .lp. Inlined once at the top of Jobs.jsx and cascades
// to JobCard. Tier accent variables (--jb-tier-accent / -tint / -border)
// are set per-card via the .jb-tier-{green|gray|amber} modifier classes.

export const JOBS_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500&family=Geist:wght@400;500;600;700&display=swap');

.jobs {
  --jb-bg: #F4F4F2;
  --jb-bg-tinted: #E8E8E5;
  --jb-ink: #0E1014;
  --jb-ink-soft: #52545A;
  --jb-ink-faded: #9C9DA1;
  --jb-accent: #F87060;
  --jb-accent-deep: #C84F40;
  --jb-accent-tint: #FDE7E3;
  --jb-card: #FFFFFF;
  --jb-line: #DDDDDB;
  --jb-line-soft: #E8E8E5;
  --jb-success: #1D7556;
  --jb-success-tint: #DBEEE5;
  --jb-warning: #B8841C;
  --jb-warning-tint: #F5E8C9;
  --jb-info: #2B5DC4;
  --jb-info-tint: #DEE6F7;
  --jb-radius-sm: 8px;
  --jb-radius: 14px;
  --jb-radius-lg: 20px;
  --jb-font: 'Geist', system-ui, sans-serif;
  --jb-font-mono: 'Geist Mono', ui-monospace, monospace;
  font-family: var(--jb-font);
  color: var(--jb-ink);
  background: var(--jb-bg);
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
}
.jobs *, .jobs *::before, .jobs *::after { box-sizing: border-box; }

/* Typography */
.jb-h1 { font-family: var(--jb-font); font-size: 30px; font-weight: 700; letter-spacing: -0.025em; line-height: 1.1; color: var(--jb-ink); margin: 0; }
.jb-sub { font-size: 14.5px; line-height: 1.55; color: var(--jb-ink-soft); margin: 6px 0 0; }
.jb-eyebrow { font-family: var(--jb-font-mono); font-size: 11px; font-weight: 500; color: var(--jb-ink-faded); letter-spacing: 0.08em; text-transform: uppercase; }

/* Card */
.jb-card { background: var(--jb-card); border: 1px solid var(--jb-line); border-radius: var(--jb-radius); padding: 20px; }

/* Buttons — pill, dark-ink primary that hovers coral */
.jb-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 9px 16px; border-radius: 100px; font-size: 13px; font-weight: 600; font-family: var(--jb-font); cursor: pointer; text-decoration: none; border: none; transition: transform 0.15s ease, background 0.15s ease, color 0.15s ease, border-color 0.15s ease; white-space: nowrap; }
.jb-btn:hover:not(:disabled) { transform: translateY(-1px); }
.jb-btn:active:not(:disabled) { transform: scale(0.98); }
.jb-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
.jb-btn-primary { background: var(--jb-ink); color: var(--jb-bg); box-shadow: 0 4px 14px rgba(14, 16, 20, 0.12); }
.jb-btn-primary:hover:not(:disabled) { background: var(--jb-accent); color: white; }
.jb-btn-outline { background: transparent; color: var(--jb-ink); border: 1px solid var(--jb-line); }
.jb-btn-outline:hover:not(:disabled) { background: var(--jb-bg-tinted); border-color: var(--jb-ink-soft); }
.jb-btn-success { background: var(--jb-success); color: white; }
.jb-btn-sm { padding: 6px 12px; font-size: 12px; }

/* Banners */
.jb-banner { padding: 12px 16px; border-radius: var(--jb-radius); font-size: 13.5px; line-height: 1.5; }
.jb-banner-warning { background: var(--jb-warning-tint); color: #6B4E0F; border: 1px solid #E0B850; }
.jb-banner-info { background: var(--jb-info-tint); color: #1E4A9E; border: 1px solid #A8BFEA; }
.jb-banner-error { background: var(--jb-accent-tint); color: var(--jb-accent-deep); border: 1px solid var(--jb-accent); }

/* Filter bar */
.jb-filter-bar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.jb-search { position: relative; flex: 1; min-width: 220px; max-width: 360px; }
.jb-search-input { width: 100%; padding: 10px 14px 10px 36px; border-radius: 100px; border: 1px solid var(--jb-line); background: var(--jb-card); color: var(--jb-ink); font-family: var(--jb-font); font-size: 13.5px; transition: border-color 0.15s ease, box-shadow 0.15s ease; }
.jb-search-input::placeholder { color: var(--jb-ink-faded); }
.jb-search-input:focus { outline: none; border-color: var(--jb-ink); box-shadow: 0 0 0 3px rgba(14, 16, 20, 0.08); }
.jb-search-icon { position: absolute; left: 13px; top: 50%; transform: translateY(-50%); pointer-events: none; color: var(--jb-ink-faded); }

/* Tier pill — colored accent ring when selected */
.jb-tier-pill { display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 100px; border: 1px solid var(--jb-line); background: var(--jb-card); font-family: var(--jb-font); font-size: 13px; font-weight: 500; color: var(--jb-ink-soft); cursor: pointer; transition: all 0.15s ease; white-space: nowrap; }
.jb-tier-pill:hover:not([data-dim="true"]) { border-color: var(--jb-ink-soft); color: var(--jb-ink); }
.jb-tier-pill[data-selected="true"] { background: var(--jb-card); color: var(--jb-ink); font-weight: 600; border-color: var(--jb-tier-accent); box-shadow: 0 0 0 2px var(--jb-tier-tint); }
.jb-tier-pill[data-dim="true"] { opacity: 0.45; }
.jb-tier-pill-badge { display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; border-radius: 50%; background: var(--jb-tier-accent); color: white; font-size: 10px; font-weight: 700; }

/* Per-tier accent variables — match Roadmap's .rm-tier-{color} */
.jb-tier-green { --jb-tier-accent: var(--jb-success); --jb-tier-tint: var(--jb-success-tint); }
.jb-tier-gray  { --jb-tier-accent: var(--jb-ink-soft); --jb-tier-tint: var(--jb-bg-tinted); }
.jb-tier-amber { --jb-tier-accent: var(--jb-warning); --jb-tier-tint: var(--jb-warning-tint); }

/* Seniority indicator chip */
.jb-seniority-chip { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 100px; background: var(--jb-bg-tinted); color: var(--jb-ink-soft); font-size: 12px; font-family: var(--jb-font-mono); letter-spacing: 0.02em; }

/* Mode notice (keyword-mode breadcrumb) */
.jb-mode-notice { display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: var(--jb-ink-soft); }
.jb-mode-notice button { font-size: 12.5px; color: var(--jb-accent); border: 0; background: transparent; cursor: pointer; text-decoration: underline; text-underline-offset: 2px; padding: 0; font-family: var(--jb-font); }
.jb-mode-notice button:hover { color: var(--jb-accent-deep); }

/* Job card */
.jb-job-card { background: var(--jb-card); border: 1px solid var(--jb-line); border-radius: var(--jb-radius); display: flex; flex-direction: column; transition: border-color 0.15s ease, box-shadow 0.15s ease; position: relative; overflow: hidden; }
.jb-job-card:hover { border-color: var(--jb-ink-soft); }
.jb-job-card[data-tier-color]::before { content: ""; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: var(--jb-tier-accent); }
.jb-job-card-body { padding: 20px; display: flex; flex-direction: column; gap: 12px; flex: 1; }
.jb-job-card-title { font-family: var(--jb-font); font-size: 15px; font-weight: 600; color: var(--jb-ink); line-height: 1.3; }
.jb-job-card-company { font-size: 13px; color: var(--jb-ink-soft); margin-top: 2px; }
.jb-job-card-meta { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; font-size: 12px; color: var(--jb-ink-faded); }
.jb-job-card-meta-chip { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; background: var(--jb-bg-tinted); color: var(--jb-ink-soft); border-radius: 100px; font-size: 11.5px; }
.jb-job-card-footer { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 12px 20px; border-top: 1px solid var(--jb-line-soft); }

/* Match score badge */
.jb-match-badge { display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 100px; font-size: 12px; font-weight: 600; font-variant-numeric: tabular-nums; white-space: nowrap; }
.jb-match-strong  { background: var(--jb-success-tint); color: var(--jb-success); }
.jb-match-medium  { background: var(--jb-warning-tint); color: #6B4E0F; }
.jb-match-soft    { background: var(--jb-bg-tinted); color: var(--jb-ink-soft); }

/* Skill pills inside score breakdown */
.jb-skill-pill { display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 100px; font-size: 11.5px; font-weight: 500; }
.jb-skill-pill-matched { background: var(--jb-success-tint); color: var(--jb-success); border: 1px solid rgba(29, 117, 86, 0.18); }
.jb-skill-pill-missing { background: var(--jb-warning-tint); color: #6B4E0F; border: 1px solid rgba(184, 132, 28, 0.25); }

/* Apply link */
.jb-apply-link { display: inline-flex; align-items: center; gap: 5px; font-size: 13px; font-weight: 600; color: var(--jb-ink); text-decoration: none; transition: color 0.15s ease; }
.jb-apply-link:hover { color: var(--jb-accent); }
`;
