// Shared brand tokens + form primitives for the onboarding flow.
// Scoped to `.onb` so they can't leak outside the onboarding surface.
// Matches Direction 3 tokens from Landing/Home/Login (locked 2026-05-20):
// warm slate background, dark ink text, electric coral accent, Geist sans.
//
// Used by Onboarding.jsx (the parent), which wraps every render branch
// (loaders + shell + tutorial) in a single .onb-rooted div. Steps and
// inner components consume the .onb-* class names defined below.

export const ONB_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500&family=Geist:wght@400;500;600;700&display=swap');

.onb {
  --onb-bg: #F4F4F2;
  --onb-bg-tinted: #E8E8E5;
  --onb-ink: #0E1014;
  --onb-ink-soft: #52545A;
  --onb-ink-faded: #9C9DA1;
  --onb-accent: #F87060;
  --onb-accent-deep: #C84F40;
  --onb-accent-tint: #FDE7E3;
  --onb-card: #FFFFFF;
  --onb-line: #DDDDDB;
  --onb-line-soft: #E8E8E5;
  --onb-success: #1D7556;
  --onb-success-tint: #DBEEE5;
  --onb-warning: #B8841C;
  --onb-warning-tint: #F5E8C9;
  --onb-info: #2B5DC4;
  --onb-info-tint: #DEE6F7;
  --onb-radius-sm: 8px;
  --onb-radius: 14px;
  --onb-radius-lg: 20px;
  --onb-font: 'Geist', system-ui, sans-serif;
  --onb-font-mono: 'Geist Mono', ui-monospace, monospace;
  font-family: var(--onb-font);
  color: var(--onb-ink);
  background: var(--onb-bg);
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
}
.onb *, .onb *::before, .onb *::after { box-sizing: border-box; }

/* ── Typography ──────────────────────────────────────────────── */
.onb-h1 { font-family: var(--onb-font); font-size: 32px; font-weight: 700; letter-spacing: -0.03em; line-height: 1.08; color: var(--onb-ink); margin: 0; }
.onb-sub { font-size: 15.5px; line-height: 1.55; color: var(--onb-ink-soft); margin: 8px 0 0; }
.onb-eyebrow { font-family: var(--onb-font-mono); font-size: 11px; font-weight: 500; color: var(--onb-ink-faded); letter-spacing: 0.08em; text-transform: uppercase; }
.onb-label { display: block; font-size: 13px; font-weight: 500; color: var(--onb-ink); margin-bottom: 6px; letter-spacing: -0.005em; }
.onb-label .req { color: var(--onb-accent); margin-left: 2px; }
.onb-help { font-size: 12px; color: var(--onb-ink-faded); margin-top: 4px; line-height: 1.45; }

/* ── Card surfaces ───────────────────────────────────────────── */
.onb-card { background: var(--onb-card); border: 1px solid var(--onb-line); border-radius: var(--onb-radius); padding: 24px; }
.onb-card-lg { padding: 28px; border-radius: var(--onb-radius-lg); }
.onb-card-flush { background: transparent; border: none; padding: 0; }

/* ── Buttons (primary/outline/ghost; pill-shaped) ────────────── */
.onb-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 11px 22px; border-radius: 100px; font-size: 14px; font-weight: 600; font-family: var(--onb-font); cursor: pointer; text-decoration: none; border: none; transition: transform 0.15s ease, background 0.15s ease, color 0.15s ease; }
.onb-btn:hover:not(:disabled) { transform: translateY(-1px); }
.onb-btn:active:not(:disabled) { transform: scale(0.98); }
.onb-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
.onb-btn-primary { background: var(--onb-ink); color: var(--onb-bg); box-shadow: 0 4px 16px rgba(14, 16, 20, 0.12); }
.onb-btn-primary:hover:not(:disabled) { background: var(--onb-accent); color: white; }
.onb-btn-outline { background: transparent; color: var(--onb-ink); border: 1px solid var(--onb-line); }
.onb-btn-outline:hover:not(:disabled) { background: var(--onb-bg-tinted); }
.onb-btn-ghost { background: transparent; color: var(--onb-ink-soft); padding: 8px 14px; }
.onb-btn-ghost:hover:not(:disabled) { color: var(--onb-ink); background: var(--onb-bg-tinted); }
.onb-btn-lg { padding: 14px 28px; font-size: 15px; }

/* ── Inputs (raw, brand-styled — used where shadcn would feel off) ── */
.onb-input { width: 100%; padding: 11px 14px; border-radius: var(--onb-radius); border: 1px solid var(--onb-line); background: var(--onb-card); color: var(--onb-ink); font-family: var(--onb-font); font-size: 14px; transition: border-color 0.15s ease, box-shadow 0.15s ease; }
.onb-input::placeholder { color: var(--onb-ink-faded); }
.onb-input:focus { outline: none; border-color: var(--onb-ink); box-shadow: 0 0 0 3px rgba(14, 16, 20, 0.08); }

/* ── OptionCard (one wide selectable row, used by Practicum) ───── */
.onb-option-card { display: flex; align-items: flex-start; gap: 14px; width: 100%; padding: 16px 18px; background: var(--onb-card); border: 1px solid var(--onb-line); border-radius: var(--onb-radius); cursor: pointer; transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease; text-align: left; font-family: var(--onb-font); }
.onb-option-card:hover { border-color: var(--onb-ink-soft); }
.onb-option-card[data-selected="true"] { border-color: var(--onb-accent); box-shadow: 0 0 0 3px var(--onb-accent-tint); }
.onb-option-card-icon { flex-shrink: 0; width: 40px; height: 40px; border-radius: 10px; background: var(--onb-bg-tinted); display: flex; align-items: center; justify-content: center; color: var(--onb-ink-soft); }
.onb-option-card[data-selected="true"] .onb-option-card-icon { background: var(--onb-accent); color: white; }
.onb-option-card-title { font-size: 14px; font-weight: 600; color: var(--onb-ink); }
.onb-option-card-desc { font-size: 12.5px; color: var(--onb-ink-soft); line-height: 1.45; margin-top: 2px; }

/* ── Grid card (compact visual selection, e.g. education level) ── */
.onb-grid-cards { display: grid; gap: 10px; }
.onb-grid-cards-5 { grid-template-columns: repeat(5, 1fr); }
.onb-grid-cards-4 { grid-template-columns: repeat(4, 1fr); }
.onb-grid-cards-3 { grid-template-columns: repeat(3, 1fr); }
@media (max-width: 720px) {
  .onb-grid-cards-5 { grid-template-columns: repeat(2, 1fr); }
  .onb-grid-cards-4 { grid-template-columns: repeat(2, 1fr); }
  .onb-grid-cards-3 { grid-template-columns: 1fr; }
}
.onb-grid-card { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: 16px 12px; background: var(--onb-card); border: 1px solid var(--onb-line); border-radius: var(--onb-radius); cursor: pointer; transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease; text-align: center; font-family: var(--onb-font); }
.onb-grid-card:hover { border-color: var(--onb-ink-soft); }
.onb-grid-card[data-selected="true"] { border-color: var(--onb-accent); box-shadow: 0 0 0 3px var(--onb-accent-tint); }
.onb-grid-card-icon { width: 32px; height: 32px; border-radius: 8px; background: var(--onb-bg-tinted); display: flex; align-items: center; justify-content: center; color: var(--onb-ink-soft); transition: background 0.15s ease, color 0.15s ease; }
.onb-grid-card[data-selected="true"] .onb-grid-card-icon { background: var(--onb-accent); color: white; }
.onb-grid-card-label { font-size: 13px; font-weight: 500; color: var(--onb-ink); }

/* ── Banner ────────────────────────────────────────────────── */
.onb-banner { padding: 12px 16px; border-radius: var(--onb-radius); font-size: 13.5px; line-height: 1.5; }
.onb-banner-info { background: var(--onb-info-tint); color: #1E4A9E; border: 1px solid #A8BFEA; }
.onb-banner-warning { background: var(--onb-warning-tint); color: #6B4E0F; border: 1px solid #E0B850; }
.onb-banner-success { background: var(--onb-success-tint); color: var(--onb-success); border: 1px solid #8FBDA8; }
.onb-banner-error { background: var(--onb-accent-tint); color: var(--onb-accent-deep); border: 1px solid var(--onb-accent); }

/* ── Drop zone (CV upload) ──────────────────────────────────── */
.onb-dropzone { background: var(--onb-card); border: 2px dashed var(--onb-line); border-radius: var(--onb-radius-lg); padding: 48px 24px; text-align: center; cursor: pointer; transition: border-color 0.15s ease, background 0.15s ease; }
.onb-dropzone:hover, .onb-dropzone[data-dragover="true"] { border-color: var(--onb-accent); background: var(--onb-accent-tint); }

/* ── Tutorial slide ──────────────────────────────────────────── */
.onb-slide { background: var(--onb-card); border: 1px solid var(--onb-line); border-radius: var(--onb-radius-lg); padding: 44px 36px; min-height: 280px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
.onb-slide-icon { width: 64px; height: 64px; border-radius: 50%; background: var(--onb-accent-tint); color: var(--onb-accent); display: flex; align-items: center; justify-content: center; margin-bottom: 20px; }
.onb-slide-title { font-family: var(--onb-font); font-size: 24px; font-weight: 700; letter-spacing: -0.02em; color: var(--onb-ink); }
.onb-slide-desc { font-size: 14.5px; line-height: 1.55; color: var(--onb-ink-soft); margin-top: 10px; max-width: 460px; }
.onb-slide-tiers { text-align: left; margin: 14px auto 0; max-width: 420px; display: flex; flex-direction: column; gap: 8px; font-size: 13.5px; color: var(--onb-ink-soft); line-height: 1.5; }
.onb-slide-tiers strong { font-weight: 600; }

/* ── Progress bar / step indicator ───────────────────────────── */
.onb-progress-track { background: var(--onb-bg-tinted); border-radius: 100px; overflow: hidden; height: 6px; }
.onb-progress-fill { height: 100%; background: var(--onb-accent); transition: width 0.5s ease-out; border-radius: 100px; }

/* ── Brand mark (reused across shell + tutorial top bar) ─────── */
.onb-brand { display: inline-flex; align-items: baseline; gap: 6px; }
.onb-brand-mark { font-family: var(--onb-font); font-size: 18px; font-weight: 700; letter-spacing: -0.02em; color: var(--onb-ink); }
.onb-brand-dot { width: 6px; height: 6px; background: var(--onb-accent); border-radius: 50%; display: inline-block; transform: translateY(-1px); }
`;
