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

/* ───── Social-profile mockup (Profile tab) ───────────────────────── */
/* Generic feed/profile preview — Direction 3 tokens only, no external
   brand colors or fonts. Gives users the spatial sense of how their
   optimised profile would look on any modern social platform without
   replicating LinkedIn's specific UI. */
.li-profile-mockup { background: var(--li-card); border: 1px solid var(--li-line); border-radius: var(--li-radius-lg); overflow: hidden; }
.li-profile-cover { height: 96px; background: linear-gradient(135deg, var(--li-ink) 0%, var(--li-accent-deep) 100%); position: relative; }
.li-profile-avatar { position: absolute; left: 24px; bottom: -34px; width: 80px; height: 80px; border-radius: 50%; background: var(--li-card); border: 4px solid var(--li-card); display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(14,16,20,0.12); }
.li-profile-avatar span { font-family: var(--li-font); font-size: 26px; font-weight: 700; color: var(--li-ink); letter-spacing: -0.02em; }
.li-profile-identity { padding: 46px 24px 18px; border-bottom: 1px solid var(--li-line-soft); }
.li-profile-name { font-family: var(--li-font); font-size: 20px; font-weight: 700; color: var(--li-ink); letter-spacing: -0.015em; }
.li-profile-headline { font-size: 13.5px; color: var(--li-ink-soft); line-height: 1.45; margin-top: 4px; }
.li-profile-section { padding: 18px 24px; border-bottom: 1px solid var(--li-line-soft); position: relative; }
.li-profile-section:last-child { border-bottom: 0; }
.li-profile-section-head { font-family: var(--li-font-mono); font-size: 10.5px; font-weight: 600; color: var(--li-ink-faded); letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 10px; }
.li-profile-section-body { font-size: 13.5px; color: var(--li-ink); line-height: 1.55; white-space: pre-wrap; }
.li-profile-section[data-changed="true"] { border-left: 3px solid var(--li-accent); padding-left: 21px; background: linear-gradient(90deg, rgba(248,112,96,0.04) 0%, transparent 60%); }
.li-profile-section[data-changed="true"]::after { content: "Optimised"; position: absolute; right: 16px; top: 18px; font-family: var(--li-font-mono); font-size: 9.5px; font-weight: 600; color: var(--li-accent); letter-spacing: 0.08em; text-transform: uppercase; padding: 2px 8px; background: var(--li-accent-tint); border-radius: 100px; }
.li-profile-exp-item { padding: 10px 0; border-top: 1px solid var(--li-line-soft); }
.li-profile-exp-item:first-child { border-top: 0; padding-top: 0; }
.li-profile-exp-title { font-size: 13.5px; font-weight: 600; color: var(--li-ink); }
.li-profile-exp-meta { font-size: 12px; color: var(--li-ink-faded); margin-top: 1px; }
.li-profile-exp-desc { font-size: 12.5px; color: var(--li-ink-soft); line-height: 1.5; margin-top: 6px; white-space: pre-wrap; }

/* Toggle (Current ↔ Optimised) — pill segment matching tab style */
.li-mockup-toggle { display: inline-flex; background: var(--li-bg-tinted); border-radius: 100px; padding: 3px; gap: 2px; }
.li-mockup-toggle button { appearance: none; border: 0; background: transparent; font-family: var(--li-font); font-size: 12px; font-weight: 500; color: var(--li-ink-soft); padding: 6px 14px; border-radius: 100px; cursor: pointer; transition: background 0.15s ease, color 0.15s ease; }
.li-mockup-toggle button[aria-pressed="true"] { background: var(--li-card); color: var(--li-ink); font-weight: 600; box-shadow: 0 1px 3px rgba(14,16,20,0.06); }

/* ───── Feed-card preview (Posts tab) ───────────────────────────── */
/* Generic feed-post layout — avatar, name, headline, timestamp, body,
   optional image, engagement row. No external brand styling. */
.li-feed-card { background: var(--li-card); border: 1px solid var(--li-line); border-radius: var(--li-radius-lg); overflow: hidden; max-width: 640px; margin: 0 auto; }
.li-feed-head { padding: 14px 16px 10px; display: flex; align-items: flex-start; gap: 12px; }
.li-feed-avatar { width: 44px; height: 44px; border-radius: 50%; background: var(--li-bg-tinted); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.li-feed-avatar span { font-family: var(--li-font); font-size: 15px; font-weight: 700; color: var(--li-ink); }
.li-feed-identity { min-width: 0; flex: 1; }
.li-feed-name { font-family: var(--li-font); font-size: 14px; font-weight: 600; color: var(--li-ink); line-height: 1.25; }
.li-feed-headline { font-size: 11.5px; color: var(--li-ink-soft); line-height: 1.4; margin-top: 1px; }
.li-feed-time { font-size: 11px; color: var(--li-ink-faded); margin-top: 2px; }
.li-feed-body { padding: 0 16px 12px; font-size: 13.5px; color: var(--li-ink); line-height: 1.55; white-space: pre-wrap; }
.li-feed-body .li-feed-hashtag { color: var(--li-accent); font-weight: 500; }
.li-feed-image { width: 100%; max-height: 380px; object-fit: cover; display: block; background: var(--li-bg-tinted); }
.li-feed-engagement { display: flex; align-items: center; justify-content: space-around; padding: 8px 4px; border-top: 1px solid var(--li-line-soft); }
.li-feed-eng-btn { appearance: none; border: 0; background: transparent; cursor: not-allowed; padding: 8px 10px; border-radius: var(--li-radius-sm); display: inline-flex; align-items: center; gap: 5px; font-family: var(--li-font); font-size: 12.5px; color: var(--li-ink-soft); font-weight: 500; }
.li-feed-eng-btn:hover { background: var(--li-bg-tinted); color: var(--li-ink); }

/* Image upload affordance */
.li-image-upload { display: inline-flex; align-items: center; gap: 6px; padding: 8px 12px; border-radius: 100px; border: 1px dashed var(--li-line); background: transparent; color: var(--li-ink-soft); font-family: var(--li-font); font-size: 12.5px; font-weight: 500; cursor: pointer; transition: border-color 0.15s ease, color 0.15s ease, background 0.15s ease; }
.li-image-upload:hover:not(:disabled) { border-color: var(--li-accent); color: var(--li-accent); background: var(--li-accent-tint); }
.li-image-upload:disabled { opacity: 0.5; cursor: not-allowed; }
.li-image-thumb { position: relative; width: 100%; max-width: 200px; border-radius: var(--li-radius); overflow: hidden; border: 1px solid var(--li-line); }
.li-image-thumb img { width: 100%; height: auto; display: block; }
.li-image-thumb-remove { position: absolute; top: 6px; right: 6px; background: rgba(14,16,20,0.7); color: white; border: 0; border-radius: 50%; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; cursor: pointer; }
.li-image-thumb-remove:hover { background: var(--li-accent); }
`;
