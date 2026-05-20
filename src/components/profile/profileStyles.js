// Direction 3 tokens scoped to .profile. Same vocabulary as every other
// surface (.tracker / .roadmap / .jobs / .act / .onb / .li / .chat).
// Used by Profile.jsx, EducationTab, and StoryBank pages (the storyBank
// folder reuses these tokens via the .profile class on the page wrapper).

export const PROFILE_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500&family=Geist:wght@400;500;600;700&display=swap');

.profile {
  --p-bg: #F4F4F2;
  --p-bg-tinted: #E8E8E5;
  --p-ink: #0E1014;
  --p-ink-soft: #52545A;
  --p-ink-faded: #9C9DA1;
  --p-accent: #F87060;
  --p-accent-deep: #C84F40;
  --p-accent-tint: #FDE7E3;
  --p-card: #FFFFFF;
  --p-line: #DDDDDB;
  --p-line-soft: #E8E8E5;
  --p-success: #1D7556;
  --p-success-tint: #DBEEE5;
  --p-warning: #B8841C;
  --p-warning-tint: #F5E8C9;
  --p-info: #2B5DC4;
  --p-info-tint: #DEE6F7;
  --p-violet: #6B4FBF;
  --p-violet-tint: #E7E0F5;
  --p-violet-deep: #4E36A0;
  --p-radius-sm: 8px;
  --p-radius: 14px;
  --p-radius-lg: 20px;
  --p-font: 'Geist', system-ui, sans-serif;
  --p-font-mono: 'Geist Mono', ui-monospace, monospace;
  font-family: var(--p-font);
  color: var(--p-ink);
  background: var(--p-bg);
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
}
.profile *, .profile *::before, .profile *::after { box-sizing: border-box; }

/* Typography */
.p-h1 { font-family: var(--p-font); font-size: 30px; font-weight: 700; letter-spacing: -0.025em; line-height: 1.1; color: var(--p-ink); margin: 0; }
.p-sub { font-size: 14.5px; line-height: 1.55; color: var(--p-ink-soft); margin: 6px 0 0; }
.p-eyebrow { font-family: var(--p-font-mono); font-size: 11px; font-weight: 500; color: var(--p-ink-faded); letter-spacing: 0.08em; text-transform: uppercase; }
.p-label { display: block; font-family: var(--p-font-mono); font-size: 10.5px; font-weight: 500; color: var(--p-ink-faded); letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 6px; }

/* Cards */
.p-card { background: var(--p-card); border: 1px solid var(--p-line); border-radius: var(--p-radius); padding: 20px; }
.p-card-lg { padding: 24px; border-radius: var(--p-radius-lg); }
.p-card-inset { background: var(--p-bg-tinted); border: 1px solid var(--p-line-soft); border-radius: var(--p-radius); padding: 12px 14px; }

/* Buttons */
.p-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 9px 16px; border-radius: 100px; font-size: 13px; font-weight: 600; font-family: var(--p-font); cursor: pointer; text-decoration: none; border: none; transition: transform 0.15s ease, background 0.15s ease, color 0.15s ease, border-color 0.15s ease; white-space: nowrap; }
.p-btn:hover:not(:disabled) { transform: translateY(-1px); }
.p-btn:active:not(:disabled) { transform: scale(0.98); }
.p-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
.p-btn-primary { background: var(--p-ink); color: var(--p-bg); box-shadow: 0 4px 14px rgba(14, 16, 20, 0.12); }
.p-btn-primary:hover:not(:disabled) { background: var(--p-accent); color: white; }
.p-btn-outline { background: transparent; color: var(--p-ink); border: 1px solid var(--p-line); }
.p-btn-outline:hover:not(:disabled) { background: var(--p-bg-tinted); border-color: var(--p-ink-soft); }
.p-btn-ghost { background: transparent; color: var(--p-ink-soft); padding: 6px 10px; }
.p-btn-ghost:hover:not(:disabled) { color: var(--p-ink); background: var(--p-bg-tinted); }
.p-btn-sm { padding: 6px 12px; font-size: 12px; }
.p-btn-danger { background: var(--p-accent); color: white; }
.p-btn-danger:hover:not(:disabled) { background: var(--p-accent-deep); }

/* Inputs */
.p-input { width: 100%; padding: 10px 14px; border-radius: var(--p-radius); border: 1px solid var(--p-line); background: var(--p-card); color: var(--p-ink); font-family: var(--p-font); font-size: 14px; transition: border-color 0.15s ease, box-shadow 0.15s ease; }
.p-input::placeholder { color: var(--p-ink-faded); }
.p-input:focus { outline: none; border-color: var(--p-ink); box-shadow: 0 0 0 3px rgba(14, 16, 20, 0.08); }

/* Tab pill bar (same pattern as Roadmap/Jobs/Activity) */
.p-tabs { display: flex; gap: 4px; background: var(--p-bg-tinted); border-radius: 100px; padding: 4px; flex-wrap: wrap; max-width: 100%; overflow-x: auto; }
.p-tab { appearance: none; border: 0; background: transparent; font-family: var(--p-font); font-size: 13px; font-weight: 500; color: var(--p-ink-soft); padding: 7px 14px; border-radius: 100px; cursor: pointer; transition: background 0.15s ease, color 0.15s ease; white-space: nowrap; }
.p-tab[aria-selected="true"] { background: var(--p-card); color: var(--p-ink); font-weight: 600; box-shadow: 0 1px 3px rgba(14, 16, 20, 0.06); }
.p-tab:hover:not([aria-selected="true"]) { color: var(--p-ink); }

/* Tag chip (used inside TagEditor + skill lists + language pills) */
.p-chip { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; background: var(--p-bg-tinted); border: 1px solid var(--p-line); border-radius: 100px; font-size: 12px; color: var(--p-ink-soft); }
.p-chip button { background: transparent; border: 0; cursor: pointer; padding: 0; color: var(--p-ink-faded); display: inline-flex; align-items: center; }
.p-chip button:hover { color: var(--p-accent); }

/* Multi-select tile (preferences) */
.p-tile { background: var(--p-card); border: 1px solid var(--p-line); color: var(--p-ink-soft); font-family: var(--p-font); font-size: 13px; padding: 7px 13px; border-radius: 100px; cursor: pointer; transition: all 0.15s ease; }
.p-tile:hover { border-color: var(--p-ink-soft); color: var(--p-ink); }
.p-tile[data-selected="true"] { background: var(--p-ink); color: var(--p-bg); border-color: var(--p-ink); font-weight: 500; }

/* Stacked radio (single-select) */
.p-stack-option { display: block; width: 100%; text-align: left; padding: 10px 14px; border-radius: var(--p-radius); border: 1px solid var(--p-line); background: var(--p-card); color: var(--p-ink-soft); font-family: var(--p-font); font-size: 13.5px; cursor: pointer; transition: all 0.15s ease; }
.p-stack-option:hover { border-color: var(--p-ink-soft); color: var(--p-ink); }
.p-stack-option[data-selected="true"] { background: var(--p-ink); color: var(--p-bg); border-color: var(--p-ink); font-weight: 500; }

/* Banners */
.p-banner { padding: 12px 16px; border-radius: var(--p-radius); font-size: 13.5px; line-height: 1.5; }
.p-banner-info { background: var(--p-info-tint); color: #1E4A9E; border: 1px solid #A8BFEA; }
.p-banner-warning { background: var(--p-warning-tint); color: #6B4E0F; border: 1px solid #E0B850; }

/* Experience card + story badge */
.p-exp-card { background: var(--p-card); border: 1px solid var(--p-line); border-radius: var(--p-radius); padding: 14px 18px; display: flex; align-items: center; justify-content: space-between; gap: 12px; transition: border-color 0.15s ease; }
.p-exp-card:hover { border-color: var(--p-ink-soft); }
.p-exp-card-title { font-family: var(--p-font); font-size: 14px; font-weight: 600; color: var(--p-ink); }
.p-exp-card-meta { font-size: 12px; color: var(--p-ink-faded); margin-top: 2px; }
.p-story-pill { display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px; border-radius: 100px; font-family: var(--p-font-mono); font-size: 10.5px; font-weight: 600; letter-spacing: 0.04em; }
.p-story-pill[data-has="true"]  { background: var(--p-accent-tint); color: var(--p-accent-deep); }
.p-story-pill[data-has="false"] { background: var(--p-bg-tinted); color: var(--p-ink-faded); }

/* StoryBank — card-based list */
.p-story-card { background: var(--p-card); border: 1px solid var(--p-line); border-radius: var(--p-radius); transition: border-color 0.15s ease; }
.p-story-card:hover { border-color: var(--p-ink-soft); }
.p-story-card-row { width: 100%; text-align: left; padding: 16px 18px; display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; background: transparent; border: 0; cursor: pointer; font-family: var(--p-font); }
.p-story-card-title { font-size: 15px; font-weight: 600; color: var(--p-ink); line-height: 1.3; }
.p-story-card-summary { font-size: 13px; color: var(--p-ink-soft); margin-top: 4px; line-height: 1.5; }
.p-story-card-meta { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-top: 8px; font-size: 11.5px; color: var(--p-ink-faded); }
.p-story-card-body { padding: 4px 20px 18px; border-top: 1px solid var(--p-line-soft); display: flex; flex-direction: column; gap: 14px; }
.p-story-card-star { display: flex; flex-direction: column; gap: 10px; }
.p-story-card-star-row { display: flex; flex-direction: column; gap: 4px; }
.p-story-card-star-row .label { font-family: var(--p-font-mono); font-size: 10.5px; color: var(--p-ink-faded); letter-spacing: 0.06em; text-transform: uppercase; }
.p-story-card-star-row .value { font-size: 13px; color: var(--p-ink); line-height: 1.55; white-space: pre-wrap; }
.p-story-card-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.p-story-card-tag { display: inline-flex; align-items: center; padding: 3px 9px; border-radius: 100px; font-size: 11px; background: var(--p-bg-tinted); color: var(--p-ink-soft); }
.p-story-card-tag[data-kind="metric"] { background: var(--p-info-tint); color: #1E4A9E; }
.p-story-card-tag[data-kind="skill"]  { background: var(--p-success-tint); color: var(--p-success); }
.p-story-card-tag[data-kind="tool"]   { background: var(--p-violet-tint); color: var(--p-violet-deep); }
.p-story-card-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.p-story-experience-chip { display: inline-flex; align-items: center; gap: 4px; padding: 2px 9px; border-radius: 100px; background: var(--p-violet-tint); color: var(--p-violet-deep); font-family: var(--p-font); font-size: 11px; font-weight: 500; }
.p-story-experience-chip[data-general="true"] { background: var(--p-bg-tinted); color: var(--p-ink-soft); }

/* Floating quick-add button (StoryBank) */
.p-quick-add { position: fixed; bottom: 24px; right: 24px; padding: 12px 18px; border-radius: 100px; background: var(--p-accent); color: white; border: 0; cursor: pointer; font-family: var(--p-font); font-size: 13.5px; font-weight: 600; display: inline-flex; align-items: center; gap: 7px; box-shadow: 0 6px 22px rgba(248,112,96,0.32); transition: background 0.15s ease, transform 0.15s ease; z-index: 40; }
.p-quick-add:hover { background: var(--p-accent-deep); transform: translateY(-1px); }
`;
