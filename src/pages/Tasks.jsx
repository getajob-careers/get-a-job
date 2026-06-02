import React, { useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useProfileQuery } from "@/lib/queries/useProfile";
import { Loader2, Brain, CheckCircle2, Circle, AlertCircle, Trash2, Calendar as CalendarIcon, X, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import GeneratingBanner from "@/components/ui/GeneratingBanner";
import { resolveDueDate, validateDueDate } from "@/lib/taskDueDate";
import { allTasksAreOnboardingFallback } from "@/lib/onboardingFallbackTasks";

// PR 3H — Tasks restyled on rd-* tokens. Restyle-only on behavior;
// every write path is preserved byte-for-byte:
//   - handleGenerate (fresh-read incomplete IDs → generate-tasks invoke →
//     normalize → INSERT → DELETE cleanup)
//   - toggleComplete (optimistic setQueryData + rollback-on-error)
//   - deleteTask (optimistic + rollback-on-error)
//   - setDueDate (optimistic + validateDueDate guard, today → ~6mo)
//   - RLS user_id scoping (implicit on tasks; explicit in handleGenerate's
//     incomplete-IDs cleanup)
//
// Tasks.jsx no longer imports ACT_CSS — its .act-* class consumption was
// audit-verified zero before this PR landed. activityStyles.js itself
// stays alive: Calendar.jsx + Internship.jsx + 6 internship sub-components
// still consume `.act-*` classes. Full teardown is a later cleanup PR
// after both Calendar (page 7) and Internship (page 10) restyle.

const TASK_MESSAGES = [
  "Searching LinkedIn & Glassdoor for real active job postings…",
  "Finding companies currently hiring for your target roles…",
  "Mapping your skill gaps to actionable tasks…",
  "Generating specific course & project recommendations…",
  "Prioritising tasks by impact on Track 1 applications…",
  "Almost ready — wrapping up your task list…",
];

// Category enum (DB-canonical). Restyle-only — values are kept as-is so
// the categories saved to public.tasks.category and the edge function's
// normalizer remain compatible. Visual tone mapped to rd-* tokens:
//   - skill → teal (gap to close / learning)
//   - project → coral (ship / build)
//   - networking → golden (warm outreach)
//   - cv → neutral
//   - application → teal-dark (ready-to-ship)
const CATEGORY_LABELS = {
  skill:       { label: "Skill gap",   tint: "var(--rd-teal-tint)",   fg: "var(--rd-teal-dark)" },
  project:     { label: "Project",     tint: "var(--rd-coral-tint)",  fg: "var(--rd-coral-dark)" },
  networking:  { label: "Networking",  tint: "var(--rd-golden-tint)", fg: "var(--rd-golden-dark)" },
  cv:          { label: "CV",          tint: "var(--rd-bg-soft)",     fg: "var(--rd-text-secondary)" },
  application: { label: "Application", tint: "var(--rd-teal-tint)",   fg: "var(--rd-teal-dark)" },
};

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

// Today / overdue / future. Returns null when no date set, so the calling
// row can omit the chip entirely (per the "no date = no pressure" rule).
function dueChipFor(isoString) {
  if (!isoString) return null;
  const due = new Date(isoString);
  if (Number.isNaN(due.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueMidnight = new Date(due);
  dueMidnight.setHours(0, 0, 0, 0);
  const dayDiff = Math.round((dueMidnight.getTime() - today.getTime()) / 86400000);
  if (dayDiff < 0) return { label: `Overdue · ${-dayDiff}d`, state: "overdue" };
  if (dayDiff === 0) return { label: "Due today", state: "today" };
  if (dayDiff === 1) return { label: "Due tomorrow", state: "neutral" };
  if (dayDiff < 7) return { label: `Due in ${dayDiff}d`, state: "neutral" };
  return { label: `Due in ${Math.round(dayDiff / 7)}w`, state: "neutral" };
}

// Sort priority for due-date tie-breaking. Earlier = first; nulls last.
function dueSortKey(t) {
  if (!t.due_date) return Number.POSITIVE_INFINITY;
  const d = new Date(t.due_date).getTime();
  return Number.isNaN(d) ? Number.POSITIVE_INFINITY : d;
}

// rd-token class strings — mirror Profile / StoryBank / Tracker page chrome.
const RD_CARD     = "rounded-[18px] border border-rd-border bg-rd-bg-card p-5 shadow-rd";
const RD_CARD_LG  = "rounded-[18px] border border-rd-border bg-rd-bg-card p-6 sm:p-7 shadow-rd";
const RD_BTN_PRIMARY = "inline-flex items-center justify-center gap-1.5 font-display font-bold text-[13px] text-white bg-rd-coral hover:bg-rd-coral-dark disabled:opacity-50 disabled:cursor-not-allowed rounded-full px-4 py-2.5 transition-colors";
const RD_BTN_PRIMARY_SM = "inline-flex items-center justify-center gap-1.5 font-display font-bold text-[12px] text-white bg-rd-coral hover:bg-rd-coral-dark disabled:opacity-50 disabled:cursor-not-allowed rounded-full px-3 py-1.5 transition-colors";
const RD_BTN_GHOST_SM   = "inline-flex items-center gap-1 text-[12px] text-rd-text-secondary hover:text-rd-text hover:bg-rd-bg-soft rounded-full px-2.5 py-1 transition-colors";

export default function Tasks() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [togglingIds, setTogglingIds] = useState(new Set());
  const [deletingIds, setDeletingIds] = useState(new Set());
  const [editingDateFor, setEditingDateFor] = useState(null);

  const { data: tasks = [], isLoading: loadingTasks, isError: tasksError } = useQuery({
    queryKey: ["tasks", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase.from("tasks").select("*").eq("user_id", user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const { data: profile, isError: profileError } = useProfileQuery(user?.id);

  const { data: roles = [] } = useQuery({
    queryKey: ["careerRoles", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase.from("career_roles").select("*").eq("user_id", user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const handleGenerate = async () => {
    if (!profile) return;
    setGenerating(true);
    setGenerateError(null);
    try {
      const { data: freshTasks } = await supabase
        .from("tasks")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_complete", false);
      const incompleteIds = (freshTasks || []).map((t) => t.id);

      const { data, error } = await supabase.functions.invoke("generate-tasks", {
        body: { context: "weekly action plan" },
      });

      if (error) throw error;

      // Safety net: edge function should return only DB-compliant values,
      // but map here too in case an old deploy slips through.
      const PRIORITY_MAP = { urgent_now: "high", this_week: "medium", longer_term: "low", high: "high", medium: "medium", low: "low" };
      const CATEGORY_MAP = { application: "application", cv: "cv", skill: "skill", project: "project", networking: "networking", interview_prep: "application", clarity_positioning: "application" };
      const normPriority = (p) => PRIORITY_MAP[p] || "medium";
      const normCategory = (c) => CATEGORY_MAP[c] || "application";

      const generatedTasks = (data?.tasks || []).map((t) => ({
        title: t.title,
        description: t.description,
        category: normCategory(t.category),
        priority: normPriority(t.priority),
        role_title: t.role_title || null,
        // Only honor LLM-provided dates that validate. resolveDueDate now
        // returns null instead of auto-falling-back to a priority-based
        // default — tasks land with no pressure unless the user sets one.
        due_date: resolveDueDate(t.due_date),
        is_complete: false,
        user_id: user.id,
      }));

      if (generatedTasks.length > 0) {
        const { error: insertError } = await supabase.from("tasks").insert(generatedTasks);
        if (insertError) throw insertError;
      }

      if (incompleteIds.length > 0) {
        const { error: deleteError } = await supabase.from("tasks").delete().in("id", incompleteIds).eq("is_complete", false);
        if (deleteError) {
          console.error("Task cleanup error:", deleteError);
          toast.error("Tasks generated but old tasks could not be removed. Refresh the page.");
        }
      }

      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    } catch (err) {
      console.error("Task generation error:", err);
      // Surface as an inline retry banner — the previous toast-only behavior
      // left the button stuck in "Generating…" forever if the user missed
      // the toast.
      setGenerateError(err.message || "Failed to generate tasks. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const toggleComplete = async (task) => {
    if (togglingIds.has(task.id)) return;
    setTogglingIds((prev) => new Set(prev).add(task.id));
    queryClient.setQueryData(["tasks", user?.id], (prev) =>
      (prev || []).map((t) => t.id === task.id ? { ...t, is_complete: !task.is_complete } : t)
    );
    const { error } = await supabase.from("tasks").update({ is_complete: !task.is_complete }).eq("id", task.id);
    setTogglingIds((prev) => { const next = new Set(prev); next.delete(task.id); return next; });
    if (error) {
      console.error("Failed to update task:", error);
      toast.error("Failed to update task. Please try again.");
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
  };

  const deleteTask = async (taskId) => {
    if (deletingIds.has(taskId)) return;
    setDeletingIds((prev) => new Set(prev).add(taskId));
    queryClient.setQueryData(["tasks", user?.id], (prev) =>
      (prev || []).filter((t) => t.id !== taskId)
    );
    const { error } = await supabase.from("tasks").delete().eq("id", taskId);
    setDeletingIds((prev) => { const next = new Set(prev); next.delete(taskId); return next; });
    if (error) {
      console.error("Failed to delete task:", error);
      toast.error("Failed to delete task. Please try again.");
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    }
  };

  // Set or clear a due date for a task. Pass null to clear. Inline date
  // input writes a YYYY-MM-DD string; validateDueDate rejects out-of-range
  // values (past >1d, future >180d) and we toast on rejection.
  const setDueDate = async (task, dateString) => {
    const next = dateString ? validateDueDate(dateString) : null;
    if (dateString && !next) {
      toast.error("Pick a date between today and ~6 months from now.");
      return;
    }
    queryClient.setQueryData(["tasks", user?.id], (prev) =>
      (prev || []).map((t) => t.id === task.id ? { ...t, due_date: next } : t)
    );
    const { error } = await supabase.from("tasks").update({ due_date: next }).eq("id", task.id);
    if (error) {
      console.error("Failed to set due date:", error);
      toast.error("Couldn't update due date.");
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      return;
    }
    setEditingDateFor(null);
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
  };

  // Sort: completed sinks to bottom, then by priority, then by due_date
  // (earlier first; null due_date treated as far-future so tasks with
  // dates surface above the no-date ones at the same priority).
  const sorted = [...tasks].sort((a, b) => {
    if (a.is_complete !== b.is_complete) return a.is_complete ? 1 : -1;
    const priorityDiff = (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1);
    if (priorityDiff !== 0) return priorityDiff;
    return dueSortKey(a) - dueSortKey(b);
  });

  const filtered = filter === "all" ? sorted : sorted.filter((t) => t.category === filter);
  const completedCount = tasks.filter((t) => t.is_complete).length;

  if (loadingTasks) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-rd-text-secondary" />
      </div>
    );
  }

  if (tasksError || profileError) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="rounded-[14px] px-4 py-3 text-[13px] leading-[1.55] bg-rd-coral-tint border border-rd-coral/30 text-rd-coral-dark flex items-center gap-2 max-w-md">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          Failed to load tasks. Refresh the page to try again.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-5 sm:px-8 py-8 sm:py-10">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-7 flex-wrap">
        <div className="min-w-0">
          <p className="text-[10.5px] uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow font-mono">
            Tasks
          </p>
          <h1 className="font-display font-extrabold text-[32px] sm:text-[36px] leading-[1.08] tracking-tight text-rd-text mt-1">
            Your next moves.
          </h1>
          <p className="text-[13.5px] text-rd-text-secondary leading-[1.55] mt-2 max-w-2xl">
            Generated from your skill gaps and role requirements. Not invented by you.
          </p>
          {tasks.length > 0 && (
            <p className="text-[12px] text-rd-text-tertiary mt-2.5">
              {completedCount} of {tasks.length} completed
            </p>
          )}
        </div>
        {profile && (
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className={`${RD_BTN_PRIMARY} flex-shrink-0`}
          >
            {generating ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Generating…</>
            ) : (
              <><Brain className="w-3.5 h-3.5" />Generate tasks</>
            )}
          </button>
        )}
      </div>

      {generating && (
        <div className="mb-6">
          <GeneratingBanner messages={TASK_MESSAGES} subtitle="Generating your tasks — this takes ~20–40 seconds" />
        </div>
      )}

      {generateError && !generating && (
        <div className="rounded-[14px] px-4 py-3 text-[13px] leading-[1.55] bg-rd-coral-tint border border-rd-coral/30 text-rd-coral-dark mb-6 flex items-center justify-between gap-3 flex-wrap">
          <span>{generateError}</span>
          <button type="button" onClick={handleGenerate} className={RD_BTN_PRIMARY_SM}>
            <RefreshCw className="w-3 h-3" />Try again
          </button>
        </div>
      )}

      {/* Regenerate banner — detects the post-onboarding fallback state.
          When onboarding's background generate-tasks fails (or the user
          closed the tab mid-flight), we either land empty or with two
          generic fallback tasks. This banner offers a one-click upgrade
          to real LLM-generated tasks. handleGenerate's delete-then-insert
          flow handles the replacement atomically. See PR C. */}
      {profile?.onboarding_complete && !generating && allTasksAreOnboardingFallback(tasks) && (
        <div className="rounded-[14px] px-4 py-3 text-[13px] leading-[1.55] bg-rd-golden-tint border border-rd-golden/30 text-rd-text mb-6 flex items-center justify-between gap-3 flex-wrap">
          <span>Your tasks haven&apos;t been personalised yet — these are placeholders.</span>
          <button type="button" onClick={handleGenerate} className={RD_BTN_PRIMARY_SM}>
            <Brain className="w-3.5 h-3.5" />Generate personalised tasks
          </button>
        </div>
      )}

      {/* Category filters */}
      {tasks.length > 0 && (
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {["all", "skill", "project", "networking", "cv", "application"].map((cat) => {
            const selected = filter === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setFilter(cat)}
                aria-pressed={selected}
                className={[
                  "inline-flex items-center font-display font-bold text-[12.5px] rounded-full px-3.5 py-1.5 transition-colors duration-150 whitespace-nowrap",
                  selected
                    ? "bg-rd-coral text-white"
                    : "bg-rd-bg-soft text-rd-text-secondary hover:bg-rd-border hover:text-rd-text",
                ].join(" ")}
              >
                {cat === "all" ? "All" : CATEGORY_LABELS[cat]?.label || cat}
              </button>
            );
          })}
        </div>
      )}

      {tasks.length === 0 && (
        <div className={`${RD_CARD_LG} text-center`}>
          <Brain className="w-10 h-10 text-rd-coral mx-auto mb-3" />
          <p className="font-display font-bold text-[15px] text-rd-text">No tasks assigned yet.</p>
          <p className="text-[13.5px] text-rd-text-secondary leading-[1.55] mt-2 max-w-md mx-auto">
            {!profile
              ? "Complete your profile first."
              : roles.length === 0
              ? "Generate your Career Roadmap first — tasks are derived from your role gaps."
              : "Click \"Generate tasks\" to assign work based on your current skill gaps and Track 1 roles."}
          </p>
        </div>
      )}

      {/* Task rows */}
      <div className="flex flex-col gap-2">
        {filtered.map((task) => {
          const cat = CATEGORY_LABELS[task.category] || CATEGORY_LABELS.skill;
          const due = dueChipFor(task.due_date);
          const isEditing = editingDateFor === task.id;
          const dateInputValue = task.due_date
            ? new Date(task.due_date).toISOString().slice(0, 10)
            : "";
          return (
            <div
              key={task.id}
              data-task-id={task.id}
              className={`${RD_CARD} flex items-start gap-4 hover:border-rd-border-hover transition-colors`}
              style={task.is_complete ? { opacity: 0.55 } : undefined}
            >
              <button
                type="button"
                onClick={() => toggleComplete(task)}
                data-task-toggle={task.id}
                className="mt-0.5 flex-shrink-0"
                aria-label={task.is_complete ? "Mark incomplete" : "Mark complete"}
              >
                {task.is_complete ? (
                  <CheckCircle2 className="w-5 h-5 text-rd-teal-dark" />
                ) : (
                  <Circle className="w-5 h-5 text-rd-text-tertiary hover:text-rd-text-secondary transition-colors" />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  <p
                    className="font-display font-bold text-[14px] text-rd-text"
                    style={task.is_complete ? { textDecoration: "line-through", color: "var(--rd-text-tertiary)" } : undefined}
                  >
                    {task.title}
                  </p>
                  <span
                    className="text-[10.5px] font-mono font-semibold uppercase tracking-[0.06em] px-2 py-0.5 rounded-full"
                    style={{ background: cat.tint, color: cat.fg }}
                  >
                    {cat.label}
                  </span>
                  {task.priority === "high" && (
                    <span
                      className="text-[10.5px] font-mono font-semibold uppercase tracking-[0.06em] px-2 py-0.5 rounded-full"
                      style={{ background: "var(--rd-coral-tint)", color: "var(--rd-coral-dark)" }}
                    >
                      High priority
                    </span>
                  )}
                  {due && (
                    <DueChip due={due} />
                  )}
                </div>
                {task.description && (
                  <p className="text-[12.5px] text-rd-text-secondary leading-relaxed">{task.description}</p>
                )}
                {(task.role_title || task.skill_gap) && (
                  <p className="text-[11px] text-rd-text-tertiary mt-1">
                    {task.role_title && `For: ${task.role_title}`}
                    {task.role_title && task.skill_gap && " · "}
                    {task.skill_gap && `Gap: ${task.skill_gap}`}
                  </p>
                )}
                {/* Due-date controls. Inline input toggles open via the
                    small button; clearing the date returns the row to
                    "no pressure" state. */}
                {isEditing ? (
                  <div className="flex items-center gap-2 mt-2.5">
                    <input
                      type="date"
                      value={dateInputValue}
                      onChange={(e) => setDueDate(task, e.target.value || null)}
                      className="px-3 py-1.5 rounded-[10px] border border-rd-border bg-rd-bg-card text-rd-text text-[13px] outline-none transition-[border-color,box-shadow] duration-150 focus:border-rd-coral focus:shadow-[0_0_0_3px_var(--rd-coral-tint)]"
                      style={{ maxWidth: 180 }}
                      autoFocus
                    />
                    {task.due_date && (
                      <button
                        type="button"
                        onClick={() => setDueDate(task, null)}
                        className={RD_BTN_GHOST_SM}
                      >
                        Clear
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setEditingDateFor(null)}
                      className={RD_BTN_GHOST_SM}
                      aria-label="Close date picker"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    data-task-edit-date={task.id}
                    onClick={() => setEditingDateFor(task.id)}
                    className="inline-flex items-center gap-1 text-[12px] text-rd-text-secondary hover:text-rd-text transition-colors mt-2"
                  >
                    <CalendarIcon className="w-3 h-3" />
                    {task.due_date ? "Change due date" : "Add due date"}
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => deleteTask(task.id)}
                disabled={deletingIds.has(task.id)}
                className="flex-shrink-0 text-rd-text-tertiary hover:text-rd-coral-dark transition-colors disabled:opacity-50 mt-0.5"
                aria-label="Delete task"
              >
                {deletingIds.has(task.id)
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Trash2 className="w-4 h-4" />}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Due-date chip — three states: overdue (coral), today (golden),
// neutral (soft). Each in rd-* tokens; no inline hex.
function DueChip({ due }) {
  const tone =
    due.state === "overdue"
      ? "bg-rd-coral-tint text-rd-coral-dark"
      : due.state === "today"
      ? "bg-rd-golden-tint text-rd-golden-dark"
      : "bg-rd-bg-soft text-rd-text-secondary";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-mono font-semibold uppercase tracking-[0.06em] ${tone}`}>
      <CalendarIcon className="w-3 h-3" />{due.label}
    </span>
  );
}
