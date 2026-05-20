// Direction 3 tokens scoped to .chat. Same vocabulary as .li / .tracker /
// .roadmap / .jobs / .act / .onb / .login / .home / .lp. Inlined once at
// the top of ChatInterface.jsx — propagates to MessageBubble, AgentIntro,
// StorySaveCard, and every inline action card (Task, Roadmap, Application,
// CompanyTarget, CVGeneration, AgentRedirect).

export const CHAT_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500&family=Geist:wght@400;500;600;700&display=swap');

.chat {
  --c-bg: #F4F4F2;
  --c-bg-tinted: #E8E8E5;
  --c-ink: #0E1014;
  --c-ink-soft: #52545A;
  --c-ink-faded: #9C9DA1;
  --c-accent: #F87060;
  --c-accent-deep: #C84F40;
  --c-accent-tint: #FDE7E3;
  --c-card: #FFFFFF;
  --c-line: #DDDDDB;
  --c-line-soft: #E8E8E5;
  --c-success: #1D7556;
  --c-success-tint: #DBEEE5;
  --c-warning: #B8841C;
  --c-warning-tint: #F5E8C9;
  --c-warning-deep: #6B4E0F;
  --c-info: #2B5DC4;
  --c-info-tint: #DEE6F7;
  --c-info-deep: #1E4A9E;
  --c-violet: #6B4FBF;
  --c-violet-tint: #E7E0F5;
  --c-violet-deep: #4E36A0;
  --c-radius-sm: 8px;
  --c-radius: 14px;
  --c-radius-lg: 20px;
  --c-font: 'Geist', system-ui, sans-serif;
  --c-font-mono: 'Geist Mono', ui-monospace, monospace;
  font-family: var(--c-font);
  color: var(--c-ink);
  background: var(--c-bg);
  -webkit-font-smoothing: antialiased;
}
.chat *, .chat *::before, .chat *::after { box-sizing: border-box; }

/* Typography */
.c-eyebrow { font-family: var(--c-font-mono); font-size: 11px; font-weight: 500; color: var(--c-ink-faded); letter-spacing: 0.08em; text-transform: uppercase; }

/* Header strip */
.c-header { padding: 14px 24px; border-bottom: 1px solid var(--c-line); background: var(--c-card); display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.c-header-title { font-family: var(--c-font); font-size: 14.5px; font-weight: 600; color: var(--c-ink); line-height: 1.3; }
.c-header-sub { font-size: 12px; color: var(--c-ink-faded); line-height: 1.4; margin-top: 2px; max-width: 540px; }

/* Bubble — user dark ink, assistant white card */
.c-bubble { border-radius: 18px; padding: 10px 14px; max-width: 85%; word-break: break-word; }
.c-bubble-user { background: var(--c-ink); color: var(--c-bg); }
.c-bubble-user p { color: inherit; font-size: 13.5px; line-height: 1.55; margin: 0; }
.c-bubble-assistant { background: var(--c-card); border: 1px solid var(--c-line); color: var(--c-ink); }
.c-avatar { width: 28px; height: 28px; border-radius: 8px; background: var(--c-ink); display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px; }
.c-avatar-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--c-accent); }

/* Composer */
.c-composer { padding: 14px 24px 18px; border-top: 1px solid var(--c-line); background: var(--c-card); }
.c-composer-input { width: 100%; padding: 10px 14px; border-radius: var(--c-radius); border: 1px solid var(--c-line); background: var(--c-card); color: var(--c-ink); font-family: var(--c-font); font-size: 14px; min-height: 42px; max-height: 120px; resize: none; transition: border-color 0.15s ease, box-shadow 0.15s ease; }
.c-composer-input::placeholder { color: var(--c-ink-faded); }
.c-composer-input:focus { outline: none; border-color: var(--c-ink); box-shadow: 0 0 0 3px rgba(14, 16, 20, 0.08); }
.c-composer-send { width: 42px; height: 42px; border-radius: 50%; background: var(--c-ink); color: var(--c-bg); border: 0; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; transition: background 0.15s ease, transform 0.15s ease; }
.c-composer-send:hover:not(:disabled) { background: var(--c-accent); }
.c-composer-send:active:not(:disabled) { transform: scale(0.97); }
.c-composer-send:disabled { opacity: 0.4; cursor: not-allowed; }

/* Buttons */
.c-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 7px 14px; border-radius: 100px; font-size: 12.5px; font-weight: 500; font-family: var(--c-font); cursor: pointer; text-decoration: none; border: none; transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease, transform 0.15s ease; white-space: nowrap; }
.c-btn:hover:not(:disabled) { transform: translateY(-1px); }
.c-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
.c-btn-outline { background: transparent; color: var(--c-ink); border: 1px solid var(--c-line); }
.c-btn-outline:hover:not(:disabled) { background: var(--c-bg-tinted); border-color: var(--c-ink-soft); }
.c-btn-ghost { background: transparent; color: var(--c-ink-soft); padding: 6px 10px; }
.c-btn-ghost:hover:not(:disabled) { color: var(--c-ink); background: var(--c-bg-tinted); }

/* Suggested-prompt chips — click sends the message immediately */
.c-prompt-chip { display: inline-flex; align-items: center; padding: 7px 14px; border-radius: 100px; background: var(--c-card); border: 1px solid var(--c-line); color: var(--c-ink-soft); font-family: var(--c-font); font-size: 12.5px; font-weight: 500; cursor: pointer; transition: all 0.15s ease; }
.c-prompt-chip:hover:not(:disabled) { background: var(--c-accent-tint); border-color: var(--c-accent); color: var(--c-accent-deep); }
.c-prompt-chip:disabled { opacity: 0.5; cursor: not-allowed; }

/* Empty state */
.c-empty { text-align: center; padding: 48px 16px; display: flex; flex-direction: column; align-items: center; gap: 14px; }
.c-empty-msg { font-size: 14px; color: var(--c-ink-soft); max-width: 480px; margin: 0 auto; line-height: 1.55; }

/* Typing indicator */
.c-typing { display: inline-flex; gap: 4px; align-items: center; padding: 12px 14px; background: var(--c-card); border: 1px solid var(--c-line); border-radius: 18px; }
.c-typing span { width: 5px; height: 5px; border-radius: 50%; background: var(--c-ink-faded); animation: c-bounce 1.4s infinite ease-in-out both; }
.c-typing span:nth-child(2) { animation-delay: 0.15s; }
.c-typing span:nth-child(3) { animation-delay: 0.3s; }
@keyframes c-bounce { 0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; } 40% { transform: scale(1); opacity: 1; } }

/* Inline action cards — consolidated to 4 semantic banners.
   Tasks / Roadmap / Application / CompanyTarget actions → info (blue).
   CVGeneration proposal → accent (coral).
   CVGeneration done / saved → success (green).
   AgentRedirect → warning (amber).
   StorySaveCard keeps its own violet token (story = distinct concept).
*/
.c-action-card { margin-left: 40px; margin-top: 8px; padding: 14px 16px; border-radius: var(--c-radius); max-width: 640px; }
.c-action-card-info    { background: var(--c-info-tint);    color: var(--c-info-deep);    border: 1px solid #A8BFEA; }
.c-action-card-accent  { background: var(--c-accent-tint);  color: var(--c-accent-deep);  border: 1px solid var(--c-accent); }
.c-action-card-success { background: var(--c-success-tint); color: var(--c-success);      border: 1px solid #8FBDA8; }
.c-action-card-warning { background: var(--c-warning-tint); color: var(--c-warning-deep); border: 1px solid #E0B850; }
.c-action-card-story   { background: var(--c-violet-tint);  color: var(--c-violet-deep);  border: 1px solid #C2B0E0; }
.c-action-card h4 { font-size: 13.5px; font-weight: 600; margin: 0 0 6px; }
.c-action-card p { font-size: 12.5px; line-height: 1.5; margin: 0; }
.c-action-card-btn { display: inline-flex; align-items: center; gap: 5px; padding: 6px 12px; border-radius: 100px; font-family: var(--c-font); font-size: 12px; font-weight: 600; cursor: pointer; border: 0; transition: opacity 0.15s ease, transform 0.15s ease; }
.c-action-card-btn:hover:not(:disabled) { transform: translateY(-1px); }
.c-action-card-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
.c-action-card-info    .c-action-card-btn { background: var(--c-info);    color: white; }
.c-action-card-accent  .c-action-card-btn { background: var(--c-accent);  color: white; }
.c-action-card-success .c-action-card-btn { background: var(--c-success); color: white; }
.c-action-card-warning .c-action-card-btn { background: var(--c-warning); color: white; }
.c-action-card-story   .c-action-card-btn { background: var(--c-violet);  color: white; }

/* AgentIntro */
.c-intro { border-bottom: 1px solid var(--c-line); background: var(--c-card); flex-shrink: 0; }
.c-intro-toggle { width: 100%; padding: 11px 24px; display: flex; align-items: center; gap: 8px; background: transparent; border: 0; cursor: pointer; color: var(--c-ink-soft); font-family: var(--c-font); font-size: 12.5px; font-weight: 500; transition: background 0.15s ease; }
.c-intro-toggle:hover { background: var(--c-bg-tinted); color: var(--c-ink); }
.c-intro-body { padding: 0 24px 18px; display: grid; grid-template-columns: 1fr; gap: 14px; }
@media (min-width: 1024px) { .c-intro-body { grid-template-columns: 1.2fr 1fr; } }
.c-intro-cap-label { font-family: var(--c-font-mono); font-size: 10.5px; font-weight: 600; color: var(--c-ink-faded); letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 8px; }
.c-intro-cap-list { display: flex; flex-direction: column; gap: 4px; margin: 0; padding: 0; list-style: none; }
.c-intro-cap-list li { font-size: 12.5px; color: var(--c-ink-soft); line-height: 1.5; }
.c-intro-howto { background: var(--c-info-tint); border: 1px solid #A8BFEA; border-radius: var(--c-radius); padding: 12px 14px; height: fit-content; }
.c-intro-howto-label { font-family: var(--c-font-mono); font-size: 10.5px; font-weight: 600; color: var(--c-info-deep); letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 4px; }
.c-intro-howto-body { font-size: 12.5px; color: var(--c-ink); line-height: 1.55; }
`;
