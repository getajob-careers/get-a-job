// Browse-tab scoped CSS — PR 3L: migrated off the retired `.act`
// Direction-3 scaffold to the global rd-* design tokens (defined at
// `:root` in src/index.css). Variables consumed here resolve against
// the globally available --rd-* set; no parent scope required.
//
// Token map (Direction-3 → rd):
//   --act-font          → system body stack (rd uses Tailwind's font-body)
//   --act-font-mono     → ui-monospace stack
//   --act-card          → --rd-bg-card
//   --act-bg-tinted     → --rd-bg-soft
//   --act-ink           → --rd-text
//   --act-ink-soft      → --rd-text-secondary
//   --act-ink-faded     → --rd-text-tertiary
//   --act-line          → --rd-border
//   --act-line-soft     → --rd-border-subtle
//   --act-accent        → --rd-primary
//   --act-accent-deep   → --rd-primary-dark
//   --act-accent-tint   → --rd-primary-tint
//   --act-radius        → 14px (matches Tailwind rounded-[14px] used elsewhere)
//
// Kept this as a CSS module rather than migrating .brz-* to Tailwind
// because the rules are layout-heavy + nested + responsive — moving
// them inline would explode the JSX surface area of the browse panel.
// The rd variables make the styles self-consistent on rd without
// requiring a parent --act-* scope.

const MONO_STACK = "ui-monospace, 'Geist Mono', SFMono-Regular, Menlo, Consolas, monospace";

export const BROWSE_CSS = `
/* Filter bar */
.brz-filter-bar { display: flex; flex-direction: column; gap: 14px; margin-top: 18px; margin-bottom: 22px; }
.brz-filter-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.brz-filter-row-label { font-family: ${MONO_STACK}; font-size: 11px; font-weight: 500; color: var(--rd-text-tertiary); letter-spacing: 0.08em; text-transform: uppercase; min-width: 78px; }
.brz-search-row { display: flex; gap: 10px; align-items: center; }
.brz-search { flex: 1; max-width: 480px; }
.brz-clear { font-family: ${MONO_STACK}; font-size: 11px; font-weight: 500; color: var(--rd-primary-dark); letter-spacing: 0.06em; text-transform: uppercase; background: none; border: none; cursor: pointer; padding: 4px 0; }
.brz-clear:hover { color: var(--rd-primary); }
.brz-count { font-family: ${MONO_STACK}; font-size: 11px; color: var(--rd-text-tertiary); margin-left: 6px; opacity: 0.8; }

/* Nudge banner — non-blocking, sits above grid when no internship_profile */
.brz-nudge { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 13px 18px; background: var(--rd-bg-soft); border: 1px solid var(--rd-border); border-radius: 14px; margin-bottom: 18px; }
.brz-nudge-text { font-size: 13.5px; line-height: 1.5; color: var(--rd-text-secondary); }
.brz-nudge-text strong { color: var(--rd-text); font-weight: 600; }

/* Result count + grid */
.brz-result-count { font-family: ${MONO_STACK}; font-size: 11.5px; color: var(--rd-text-tertiary); letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 12px; }
.brz-grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
@media (min-width: 760px) { .brz-grid { grid-template-columns: repeat(2, 1fr); } }
@media (min-width: 1100px) { .brz-grid { grid-template-columns: repeat(3, 1fr); gap: 14px; } }

/* Browse card. Rendered as a <button> on the browse panel so the whole
   card is one click target — reset button defaults (no system styling,
   left-aligned, inherit color, pointer cursor, text-align left). */
.brz-card { background: var(--rd-bg-card); border: 1px solid var(--rd-border); border-radius: 14px; padding: 18px; display: flex; flex-direction: column; gap: 10px; transition: border-color 0.15s ease, transform 0.15s ease; min-height: 220px; text-align: left; color: inherit; font: inherit; width: 100%; }
.brz-card:hover { border-color: var(--rd-primary); }
.brz-card-clickable { cursor: pointer; }
.brz-card-clickable:focus-visible { outline: 2px solid var(--rd-primary); outline-offset: 2px; }
.brz-card-clickable:active { transform: scale(0.998); }
.brz-card-eyebrow { display: flex; align-items: center; gap: 8px; min-height: 16px; }
.brz-card-origin { font-family: ${MONO_STACK}; font-size: 10.5px; color: var(--rd-text-tertiary); letter-spacing: 0.08em; text-transform: uppercase; }
.brz-card-live { font-family: ${MONO_STACK}; font-size: 10px; font-weight: 600; color: var(--rd-primary-dark); letter-spacing: 0.08em; text-transform: uppercase; padding: 2px 8px; background: var(--rd-primary-tint); border-radius: 100px; }
.brz-card-name { font-family: var(--rd-font-display); font-size: 17px; font-weight: 700; letter-spacing: -0.01em; color: var(--rd-text); margin: 0; line-height: 1.25; }
.brz-card-meta { font-size: 12.5px; color: var(--rd-text-secondary); line-height: 1.4; }
.brz-card-meta span + span::before { content: " · "; color: var(--rd-text-tertiary); }
.brz-card-desc { font-size: 13px; line-height: 1.5; color: var(--rd-text-secondary); margin: 2px 0 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; min-height: 39px; }
.brz-card-desc-empty { font-style: italic; color: var(--rd-text-tertiary); opacity: 0.8; }
.brz-card-footer { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: auto; padding-top: 10px; border-top: 1px solid var(--rd-border-subtle); }

/* Score chip */
.brz-score { display: inline-flex; align-items: center; gap: 5px; padding: 4px 11px; border-radius: 100px; font-family: ${MONO_STACK}; font-size: 11px; font-weight: 600; letter-spacing: 0.04em; }
.brz-score-label { font-family: ${MONO_STACK}; font-size: 9.5px; font-weight: 500; letter-spacing: 0.06em; text-transform: uppercase; opacity: 0.75; }
.brz-score-strong { background: var(--rd-primary); color: white; }
.brz-score-strong .brz-score-label { opacity: 0.85; }
.brz-score-soft { background: transparent; color: var(--rd-text); border: 1px solid var(--rd-border); }
.brz-score-weak { background: transparent; color: var(--rd-text-tertiary); }
.brz-score-none { background: transparent; color: var(--rd-text-tertiary); border: 1px dashed var(--rd-border); }

/* Suggested role chip — neutral outline */
.brz-role { display: inline-flex; align-items: center; padding: 4px 11px; border-radius: 100px; border: 1px solid var(--rd-border); background: transparent; font-size: 11.5px; color: var(--rd-text-secondary); max-width: 60%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* Load more */
.brz-load-more { display: flex; justify-content: center; margin: 24px 0 8px; }

/* Empty result state */
.brz-empty { text-align: center; padding: 56px 24px; color: var(--rd-text-secondary); }
.brz-empty-title { font-family: var(--rd-font-display); font-size: 16px; font-weight: 700; color: var(--rd-text); margin: 0 0 6px; }
.brz-empty-sub { font-size: 13.5px; color: var(--rd-text-secondary); margin: 0; }
`;
