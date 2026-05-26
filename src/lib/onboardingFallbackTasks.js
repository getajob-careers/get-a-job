// onboardingFallbackTasks.js — single source of truth for the two
// generic tasks we insert when generate-tasks fails during onboarding's
// fire-and-forget background generation (PR C, post-#156 perf series).
//
// These titles are the marker. Tasks.jsx detects "all my non-complete
// tasks have one of these exact titles + my onboarding is complete" and
// surfaces a "Generate personalized tasks" banner that calls the
// existing handleGenerate, which deletes the placeholders and writes
// real LLM-generated tasks.
//
// Don't translate or paraphrase these strings without updating the
// detection logic in src/pages/Tasks.jsx (FALLBACK_TITLES check).

export const ONBOARDING_FALLBACK_TASKS = [
  {
    title: "Update your CV for target roles",
    description: "Tailor your CV based on skill gaps.",
    category: "cv",
    priority: "high",
  },
  {
    title: "Research target companies",
    description: "Find active job postings.",
    category: "application",
    priority: "high",
  },
];

export const ONBOARDING_FALLBACK_TITLES = new Set(
  ONBOARDING_FALLBACK_TASKS.map((t) => t.title),
);

/** True iff every task in `tasks` (non-empty) has a title that came from the fallback set. */
export function allTasksAreOnboardingFallback(tasks) {
  if (!Array.isArray(tasks) || tasks.length === 0) return false;
  return tasks.every((t) => ONBOARDING_FALLBACK_TITLES.has(t?.title));
}
