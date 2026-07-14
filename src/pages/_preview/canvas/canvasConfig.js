// The single CANVAS_FIXTURES switch for the /_preview/home-3tab design canvas.
//
// ON (default): all three tabs render from src/pages/_preview/fixtures/
// canvasHome.js and every interaction (kanban drag, Track, coach send) mutates
// LOCAL React state only — no Supabase reads, no writes, impossible to mutate
// prod. Flip to false to point the shell back at the live components/queries.
//
// Kept in its own module (not inside the shell) purely to avoid a circular
// import between Home3TabPreview.jsx and Home3TabCvTab.jsx, which both read it.
export const CANVAS_FIXTURES = true;
