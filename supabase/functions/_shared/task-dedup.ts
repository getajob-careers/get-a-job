// Pure helpers for de-duplicating LLM-generated tasks against the user's
// completed task history, and capping the returned set at MAX_TASKS.
//
// Consumed by generate-tasks (server-side only this PR). NOT wired into
// ai-chat's SUGGESTED_TASKS_JSON path — future reuse only.
//
// Why this exists:
// - generate-tasks regenerates blind today. Two-tab + audit (2026-06-04)
//   showed users hitting the same regenerate produced "Enhance your CV
//   for product roles" twice (both completed) — the user re-saw a task
//   they'd already done, which kills the "fresh weekly action plan"
//   feel.
// - The LLM honors injected "don't repeat" rules inconsistently (same
//   enforcement gap as outreach voice-rules). Soft enforcement (prompt
//   injection) is the first line; this module is the deterministic
//   second line that drops near-duplicates after parse.
//
// Normalization choice (stopword-stripped lowercase+trim) is the
// minimum that catches the realistic noun-phrase variants in live data
// ("Define target roles" ≡ "Define your target roles") without false-
// positive risk. Fuzzy/trigram was considered and rejected as overkill
// for the current scale (81 total tasks at audit time; 2 actual
// regenerate-blind duplicates).

// Explicit stopword list. Kept small and conservative — these are
// English articles + common possessive/preposition words that vary
// noun-phrase surface forms without changing meaning. Adding more
// (e.g. "from", "with", "by") risks collapsing genuinely distinct
// tasks ("apply by Friday" ≠ "apply Friday").
export const TASK_TITLE_STOPWORDS = new Set([
  "a", "an", "the",
  "your", "my",
  "for", "to", "of",
]);

// Normalize a task title for dedup comparison. Lower-case, trim, drop
// stopwords, collapse internal whitespace. Returns a string suitable
// for set-membership / equality checks.
//
// Examples:
//   normalizeTaskTitle("Define target roles")         → "define target roles"
//   normalizeTaskTitle("Define your target roles")    → "define target roles"
//   normalizeTaskTitle("  Update your CV  ")          → "update cv"
//   normalizeTaskTitle("")                            → ""
export function normalizeTaskTitle(title: unknown): string {
  if (typeof title !== "string") return "";
  return title
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0 && !TASK_TITLE_STOPWORDS.has(w))
    .join(" ");
}

// Generic "task-shaped" type — accepts the LLM output shape AND the
// frontend-insertion shape since both go through the same dedup path.
export interface DedupableTask {
  title?: string;
  priority?: string;
  [k: string]: unknown;
}

// Drop generated tasks whose normalized title matches any normalized
// title in `completedTitles`. Stable order preserved for tasks that
// survive. Empty inputs no-op (returns generatedTasks unchanged when
// history is empty — the onboarding first-run path).
export function dedupeAgainstHistory<T extends DedupableTask>(
  generatedTasks: T[],
  completedTitles: string[],
): T[] {
  if (!Array.isArray(generatedTasks) || generatedTasks.length === 0) return [];
  if (!Array.isArray(completedTitles) || completedTitles.length === 0) {
    return generatedTasks;
  }
  const historyNorm = new Set<string>();
  for (const t of completedTitles) {
    const n = normalizeTaskTitle(t);
    if (n) historyNorm.add(n);
  }
  if (historyNorm.size === 0) return generatedTasks;
  return generatedTasks.filter((t) => {
    const n = normalizeTaskTitle(t?.title);
    if (!n) return true; // tasks with empty/non-string titles aren't dedupable; let downstream validators reject them
    return !historyNorm.has(n);
  });
}

// Priority ranks used for the cap's stable sort. Higher rank = kept
// when truncating. Values outside the {low,medium,high} CHECK
// constraint shouldn't reach this helper (the edge function maps
// them upstream via PRIORITY_MAP), but a fallback of 0 keeps unknowns
// at the bottom rather than throwing.
export const PRIORITY_RANK: Record<string, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

export const MAX_TASKS = 8;

// Hard cap: priority-sort (high → medium → low) then slice. Preserves
// all high-priority tasks even when the LLM emits more than MAX_TASKS
// with low-priority items listed first. Stable within each priority
// band (preserves LLM ordering for same-priority tasks).
export function capTasksByPriority<T extends DedupableTask>(
  tasks: T[],
  max = MAX_TASKS,
): T[] {
  if (!Array.isArray(tasks)) return [];
  if (tasks.length <= max) return tasks;
  // Decorate-sort-undecorate for stable sort across runtimes.
  return tasks
    .map((t, i) => ({ t, i, rank: PRIORITY_RANK[String(t?.priority)] ?? 0 }))
    .sort((a, b) => (b.rank - a.rank) || (a.i - b.i))
    .slice(0, max)
    .map((x) => x.t);
}

// Prompt fragment for soft enforcement. Returns the string to inject
// into the system prompt — empty string when there's no history
// (onboarding first run) so the prompt stays clean.
export function buildCompletedHistoryBlock(completedTitles: string[]): string {
  if (!Array.isArray(completedTitles) || completedTitles.length === 0) return "";
  const cleanTitles = completedTitles
    .filter((t) => typeof t === "string" && t.trim().length > 0)
    .slice(0, 50);
  if (cleanTitles.length === 0) return "";
  return `\nTASKS THE USER HAS ALREADY COMPLETED (most recent first, up to ${cleanTitles.length}):\n${cleanTitles.map((t) => `- ${t}`).join("\n")}\n\nCRITICAL: do NOT regenerate any task that is semantically equivalent to one already completed above. The user has already done that work — re-surfacing it makes the platform feel stale. Generate fresh, NEW tasks that build on what they've done.`;
}
