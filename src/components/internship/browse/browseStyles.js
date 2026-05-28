// Browse-tab scoped CSS — extends the .act Direction 3 tokens already
// inlined by the parent Internship page. NO new font imports, no new
// color tokens — just the layout / chip / card-hover rules specific to
// browse. Keep this file small; if a rule could live on .act it should.

export const BROWSE_CSS = `
/* Filter bar */
.brz-filter-bar { display: flex; flex-direction: column; gap: 14px; margin-top: 18px; margin-bottom: 22px; }
.brz-filter-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.brz-filter-row-label { font-family: var(--act-font-mono); font-size: 11px; font-weight: 500; color: var(--act-ink-faded); letter-spacing: 0.08em; text-transform: uppercase; min-width: 78px; }
.brz-search-row { display: flex; gap: 10px; align-items: center; }
.brz-search { flex: 1; max-width: 480px; }
.brz-clear { font-family: var(--act-font-mono); font-size: 11px; font-weight: 500; color: var(--act-accent-deep); letter-spacing: 0.06em; text-transform: uppercase; background: none; border: none; cursor: pointer; padding: 4px 0; }
.brz-clear:hover { color: var(--act-accent); }
.brz-count { font-family: var(--act-font-mono); font-size: 11px; color: var(--act-ink-faded); margin-left: 6px; opacity: 0.8; }

/* Nudge banner — non-blocking, sits above grid when no internship_profile */
.brz-nudge { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 13px 18px; background: var(--act-bg-tinted); border: 1px solid var(--act-line); border-radius: var(--act-radius); margin-bottom: 18px; }
.brz-nudge-text { font-size: 13.5px; line-height: 1.5; color: var(--act-ink-soft); }
.brz-nudge-text strong { color: var(--act-ink); font-weight: 600; }

/* Result count + grid */
.brz-result-count { font-family: var(--act-font-mono); font-size: 11.5px; color: var(--act-ink-faded); letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 12px; }
.brz-grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
@media (min-width: 760px) { .brz-grid { grid-template-columns: repeat(2, 1fr); } }
@media (min-width: 1100px) { .brz-grid { grid-template-columns: repeat(3, 1fr); gap: 14px; } }

/* Browse card */
.brz-card { background: var(--act-card); border: 1px solid var(--act-line); border-radius: var(--act-radius); padding: 18px; display: flex; flex-direction: column; gap: 10px; transition: border-color 0.15s ease; min-height: 220px; }
.brz-card:hover { border-color: var(--act-accent); }
.brz-card-eyebrow { display: flex; align-items: center; gap: 8px; min-height: 16px; }
.brz-card-origin { font-family: var(--act-font-mono); font-size: 10.5px; color: var(--act-ink-faded); letter-spacing: 0.08em; text-transform: uppercase; }
.brz-card-live { font-family: var(--act-font-mono); font-size: 10px; font-weight: 600; color: var(--act-accent-deep); letter-spacing: 0.08em; text-transform: uppercase; padding: 2px 8px; background: var(--act-accent-tint); border-radius: 100px; }
.brz-card-name { font-family: var(--act-font); font-size: 17px; font-weight: 600; letter-spacing: -0.01em; color: var(--act-ink); margin: 0; line-height: 1.25; }
.brz-card-meta { font-size: 12.5px; color: var(--act-ink-soft); line-height: 1.4; }
.brz-card-meta span + span::before { content: " · "; color: var(--act-ink-faded); }
.brz-card-desc { font-size: 13px; line-height: 1.5; color: var(--act-ink-soft); margin: 2px 0 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; min-height: 39px; }
.brz-card-desc-empty { font-style: italic; color: var(--act-ink-faded); opacity: 0.8; }
.brz-card-footer { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: auto; padding-top: 10px; border-top: 1px solid var(--act-line-soft); }

/* Score chip */
.brz-score { display: inline-flex; align-items: center; gap: 5px; padding: 4px 11px; border-radius: 100px; font-family: var(--act-font-mono); font-size: 11px; font-weight: 600; letter-spacing: 0.04em; }
.brz-score-label { font-family: var(--act-font-mono); font-size: 9.5px; font-weight: 500; letter-spacing: 0.06em; text-transform: uppercase; opacity: 0.75; }
.brz-score-strong { background: var(--act-accent); color: white; }
.brz-score-strong .brz-score-label { opacity: 0.85; }
.brz-score-soft { background: transparent; color: var(--act-ink); border: 1px solid var(--act-line); }
.brz-score-weak { background: transparent; color: var(--act-ink-faded); }
.brz-score-none { background: transparent; color: var(--act-ink-faded); border: 1px dashed var(--act-line); }

/* Suggested role chip — neutral outline */
.brz-role { display: inline-flex; align-items: center; padding: 4px 11px; border-radius: 100px; border: 1px solid var(--act-line); background: transparent; font-size: 11.5px; color: var(--act-ink-soft); max-width: 60%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* Load more */
.brz-load-more { display: flex; justify-content: center; margin: 24px 0 8px; }

/* Empty result state */
.brz-empty { text-align: center; padding: 56px 24px; color: var(--act-ink-soft); }
.brz-empty-title { font-family: var(--act-font); font-size: 16px; font-weight: 600; color: var(--act-ink); margin: 0 0 6px; }
.brz-empty-sub { font-size: 13.5px; color: var(--act-ink-soft); margin: 0; }
`;
