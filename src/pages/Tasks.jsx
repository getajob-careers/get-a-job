import React, { useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Brain, CheckCircle2, Circle, AlertCircle, Trash2, Calendar as CalendarIcon, X, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import GeneratingBanner from "@/components/ui/GeneratingBanner";
import { resolveDueDate, validateDueDate } from "@/lib/taskDueDate";
import { ACT_CSS } from "../components/activity/activityStyles";

const TASK_MESSAGES = [
  "Searching LinkedIn & Glassdoor for real active job postings…",
  "Finding companies currently hiring for your target roles…",
  "Mapping your skill gaps to actionable tasks…",
  "Generating specific course & project recommendations…",
  "Prioritising tasks by impact on Track 1 applications…",
  "Almost ready — wrapping up your task list…",
];

const CATEGORY_LABELS = {
  skill:       { label: "Skill gap",   tint: "var(--act-info-tint)",    fg: "#1E4A9E" },
  project:     { label: "Project",     tint: "var(--act-accent-tint)",  fg: "var(--act-accent-deep)" },
  networking:  { label: "Networking",  tint: "var(--act-warning-tint)", fg: "#6B4E0F" },
  cv:          { label: "CV",          tint: "var(--act-bg-tinted)",    fg: "var(--act-ink-soft)" },
  application: { label: "Application", tint: "var(--act-success-tint)", fg: "var(--act-success)" },
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

  const { data: profiles = [], isError: profileError } = useQuery({
    queryKey: ["userProfile", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

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

  const profile = profiles?.[0];

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
      <>
        <style>{ACT_CSS}</style>
        <div className="act min-h-screen flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-[#52545A]" />
        </div>
      </>
    );
  }

  if (tasksError || profileError) {
    return (
      <>
        <style>{ACT_CSS}</style>
        <div className="act min-h-screen flex items-center justify-center px-6">
          <div className="act-banner act-banner-error flex items-center gap-2 max-w-md">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            Failed to load tasks. Refresh the page to try again.
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{ACT_CSS}</style>
      <div className="act">
        <div className="max-w-3xl mx-auto px-6 py-10">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-7 flex-wrap">
            <div>
              <p className="act-eyebrow">Tasks</p>
              <h1 className="act-h1 mt-1.5">Your next moves.</h1>
              <p className="act-sub">Generated from your skill gaps and role requirements. Not invented by you.</p>
              {tasks.length > 0 && (
                <p className="act-eyebrow mt-2.5" style={{ textTransform: "none", letterSpacing: 0 }}>
                  {completedCount} of {tasks.length} completed
                </p>
              )}
            </div>
            {profile && (
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="act-btn act-btn-primary flex-shrink-0"
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
            <div className="act-banner act-banner-error mb-6 flex items-center justify-between gap-3 flex-wrap">
              <span>{generateError}</span>
              <button onClick={handleGenerate} className="act-btn act-btn-sm act-btn-primary">
                <RefreshCw className="w-3 h-3" />Try again
              </button>
            </div>
          )}

          {/* Category filters */}
          {tasks.length > 0 && (
            <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
              {["all", "skill", "project", "networking", "cv", "application"].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setFilter(cat)}
                  className="act-pill act-pill-sm"
                  data-selected={filter === cat}
                >
                  {cat === "all" ? "All" : CATEGORY_LABELS[cat]?.label || cat}
                </button>
              ))}
            </div>
          )}

          {tasks.length === 0 && (
            <div className="act-card act-card-lg text-center">
              <Brain className="w-10 h-10 text-[#F87060] mx-auto mb-3" />
              <p className="text-base font-semibold text-[#0E1014]">No tasks assigned yet.</p>
              <p className="act-sub max-w-md mx-auto">
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
                  className="act-card flex items-start gap-4"
                  style={task.is_complete ? { opacity: 0.55 } : undefined}
                >
                  <button
                    onClick={() => toggleComplete(task)}
                    className="mt-0.5 flex-shrink-0"
                    aria-label={task.is_complete ? "Mark incomplete" : "Mark complete"}
                  >
                    {task.is_complete ? (
                      <CheckCircle2 className="w-5 h-5 text-[#1D7556]" />
                    ) : (
                      <Circle className="w-5 h-5 text-[#9C9DA1] hover:text-[#52545A] transition-colors" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <p
                        className="text-sm font-semibold text-[#0E1014]"
                        style={task.is_complete ? { textDecoration: "line-through", color: "#9C9DA1" } : undefined}
                      >
                        {task.title}
                      </p>
                      <span
                        className="text-[10.5px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                        style={{ background: cat.tint, color: cat.fg, letterSpacing: "0.04em" }}
                      >
                        {cat.label}
                      </span>
                      {task.priority === "high" && (
                        <span
                          className="text-[10.5px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                          style={{ background: "var(--act-accent-tint)", color: "var(--act-accent-deep)", letterSpacing: "0.04em" }}
                        >
                          High priority
                        </span>
                      )}
                      {due && (
                        <span className="act-due-chip" data-state={due.state}>
                          <CalendarIcon className="w-3 h-3" />{due.label}
                        </span>
                      )}
                    </div>
                    {task.description && (
                      <p className="text-xs text-[#52545A] leading-relaxed">{task.description}</p>
                    )}
                    {(task.role_title || task.skill_gap) && (
                      <p className="text-[11px] text-[#9C9DA1] mt-1">
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
                          className="act-input"
                          style={{ maxWidth: 180, padding: "6px 10px", fontSize: 13 }}
                          autoFocus
                        />
                        {task.due_date && (
                          <button
                            onClick={() => setDueDate(task, null)}
                            className="act-btn act-btn-ghost act-btn-sm"
                          >
                            Clear
                          </button>
                        )}
                        <button
                          onClick={() => setEditingDateFor(null)}
                          className="act-btn act-btn-ghost act-btn-sm"
                          aria-label="Close date picker"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditingDateFor(task.id)}
                        className="act-btn act-btn-ghost act-btn-sm mt-2"
                        style={{ paddingLeft: 0 }}
                      >
                        <CalendarIcon className="w-3 h-3" />
                        {task.due_date ? "Change due date" : "Add due date"}
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => deleteTask(task.id)}
                    disabled={deletingIds.has(task.id)}
                    className="flex-shrink-0 text-[#9C9DA1] hover:text-[#F87060] transition-colors disabled:opacity-50 mt-0.5"
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
      </div>
    </>
  );
}
