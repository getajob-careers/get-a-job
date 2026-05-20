// Direction 3 tokens scoped to .li. Same vocabulary as .tracker / .roadmap
// / .jobs / .act / .onb / .login / .home / .lp. Inlined once at the top of
// Linkedin.jsx and cascades to ProfileTab, PostsTab, NetworkingTab, and
// all of their sub-components.
//
// Note: the LinkedIn lucide-react icon is generic shape only — the .li
// brand here is Get A Job's Direction 3 palette, not LinkedIn's. Avoid
// LinkedIn brand colors (#0A66C2 etc.) — coral ink is our accent.

export const LI_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500&family=Geist:wght@400;500;600;700&display=swap');

.li {
  --li-bg: #F4F4F2;
  --li-bg-tinted: #E8E8E5;
  --li-ink: #0E1014;
  --li-ink-soft: #52545A;
  --li-ink-faded: #9C9DA1;
  --li-accent: #F87060;
  --li-accent-deep: #C84F40;
  --li-accent-tint: #FDE7E3;
  --li-card: #FFFFFF;
  --li-line: #DDDDDB;
  --li-line-soft: #E8E8E5;
  --li-success: #1D7556;
  --li-success-tint: #DBEEE5;
  --li-warning: #B8841C;
  --li-warning-tint: #F5E8C9;
  --li-warning-deep: #6B4E0F;
  --li-info: #2B5DC4;
  --li-info-tint: #DEE6F7;
  --li-radius-sm: 8px;
  --li-radius: 14px;
  --li-radius-lg: 20px;
  --li-font: 'Geist', system-ui, sans-serif;
  --li-font-mono: 'Geist Mono', ui-monospace, monospace;
  font-family: var(--li-font);
  color: var(--li-ink);
  background: var(--li-bg);
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
}
.li *, .li *::before, .li *::after { box-sizing: border-box; }

/* Typography */
.li-h1 { font-family: var(--li-font); font-size: 30px; font-weight: 700; letter-spacing: -0.025em; line-height: 1.1; color: var(--li-ink); margin: 0; }
.li-sub { font-size: 14.5px; line-height: 1.55; color: var(--li-ink-soft); margin: 6px 0 0; }
.li-eyebrow { font-family: var(--li-font-mono); font-size: 11px; font-weight: 500; color: var(--li-ink-faded); letter-spacing: 0.08em; text-transform: uppercase; }

/* Cards */
.li-card { background: var(--li-card); border: 1px solid var(--li-line); border-radius: var(--li-radius); padding: 20px; }
.li-card-lg { padding: 24px; border-radius: var(--li-radius-lg); }

/* Buttons */
.li-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 9px 16px; border-radius: 100px; font-size: 13px; font-weight: 600; font-family: var(--li-font); cursor: pointer; text-decoration: none; border: none; transition: transform 0.15s ease, background 0.15s ease, color 0.15s ease, border-color 0.15s ease; white-space: nowrap; }
.li-btn:hover:not(:disabled) { transform: translateY(-1px); }
.li-btn:active:not(:disabled) { transform: scale(0.98); }
.li-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
.li-btn-primary { background: var(--li-ink); color: var(--li-bg); box-shadow: 0 4px 14px rgba(14, 16, 20, 0.12); }
.li-btn-primary:hover:not(:disabled) { background: var(--li-accent); color: white; }
.li-btn-outline { background: transparent; color: var(--li-ink); border: 1px solid var(--li-line); }
.li-btn-outline:hover:not(:disabled) { background: var(--li-bg-tinted); border-color: var(--li-ink-soft); }
.li-btn-ghost { background: transparent; color: var(--li-ink-soft); padding: 6px 10px; }
.li-btn-ghost:hover:not(:disabled) { color: var(--li-ink); background: var(--li-bg-tinted); }
.li-btn-sm { padding: 6px 12px; font-size: 12px; }

/* Tab pill bar — matches the Roadmap/Activity pattern */
.li-tabs { display: inline-flex; background: var(--li-bg-tinted); border-radius: 100px; padding: 4px; gap: 2px; max-width: 100%; flex-wrap: wrap; }
.li-tab { appearance: none; border: 0; background: transparent; font-family: var(--li-font); font-size: 13px; font-weight: 500; color: var(--li-ink-soft); padding: 7px 16px; border-radius: 100px; cursor: pointer; transition: background 0.15s ease, color 0.15s ease; display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }
.li-tab[aria-selected="true"] { background: var(--li-card); color: var(--li-ink); font-weight: 600; box-shadow: 0 1px 3px rgba(14, 16, 20, 0.06); }
.li-tab:hover:not([aria-selected="true"]) { color: var(--li-ink); }

/* Banners — all amber callouts on this page route through .li-banner-warning */
.li-banner { padding: 12px 16px; border-radius: var(--li-radius); font-size: 13.5px; line-height: 1.5; }
.li-banner-warning { background: var(--li-warning-tint); color: var(--li-warning-deep); border: 1px solid #E0B850; }
.li-banner-info    { background: var(--li-info-tint);    color: #1E4A9E; border: 1px solid #A8BFEA; }
.li-banner-error   { background: var(--li-accent-tint);  color: var(--li-accent-deep); border: 1px solid var(--li-accent); }
.li-banner-success { background: var(--li-success-tint); color: var(--li-success); border: 1px solid #8FBDA8; }

/* Inputs (raw — used for textareas inside compose forms etc.) */
.li-input { width: 100%; padding: 10px 14px; border-radius: var(--li-radius); border: 1px solid var(--li-line); background: var(--li-card); color: var(--li-ink); font-family: var(--li-font); font-size: 14px; transition: border-color 0.15s ease, box-shadow 0.15s ease; }
.li-input::placeholder { color: var(--li-ink-faded); }
.li-input:focus { outline: none; border-color: var(--li-ink); box-shadow: 0 0 0 3px rgba(14, 16, 20, 0.08); }

/* Status badges (outreach conversation states) */
.li-status { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 100px; font-family: var(--li-font-mono); font-size: 10.5px; font-weight: 500; letter-spacing: 0.05em; text-transform: uppercase; white-space: nowrap; }
.li-status-active    { background: var(--li-success-tint); color: var(--li-success); }
.li-status-complete  { background: var(--li-info-tint); color: #1E4A9E; }
.li-status-archived  { background: var(--li-bg-tinted); color: var(--li-ink-soft); }
.li-status-warming   { background: var(--li-warning-tint); color: var(--li-warning-deep); }
`;
