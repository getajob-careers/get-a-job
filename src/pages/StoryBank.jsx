import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, BookText, Plus, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import StorySaveCard from "@/components/chat/StorySaveCard";
import StoryCard from "@/components/storyBank/StoryCard";
import StoryEditor from "@/components/storyBank/StoryEditor";
import { useStoriesQuery } from "@/lib/queries/useStories";
import { useExperiencesQuery } from "@/lib/queries/useExperiences";

// PR 3G — StoryBank restyled on rd-* tokens. Restyle-only on behavior;
// every CRUD path, the extract-story-from-text edge function call, the
// daily_actions.status='done' mark-done handoff, and the RLS
// `.eq("user_id", user.id)` guards are preserved byte-for-byte.
//
// profileStyles.js / PROFILE_CSS teardown happens in this PR — see the
// grep audit at PR open. StoryBank dropped its .p-* classes; Profile
// dropped its (already-unused) injection; Internship's stray p-tabs
// (no-op since /Internship never injected PROFILE_CSS) removed.
//
// StoryBank — dedicated home for the user's STAR stories (extracted from
// the Profile Experience tab in PR #98). Lists every story, filters by
// experience-linked vs general (no experience_id), supports create + edit
// + delete. Daily Action "Reflect" handoff moved here from Profile via the
// same location.state.dailyAction pattern.
//
// Three deep-link entrypoints supported:
//   ?filter=general               — pre-filter to chat-captured stories
//   ?filter=experience_id=<uuid>  — pre-filter to stories on one experience
//   state.dailyAction = { id, prompt } — opens quick-add with framing

const FILTER_LABELS = {
  all: "All",
  linked: "Linked to experience",
  general: "General",
};

const RD_BTN_PRIMARY =
  "inline-flex items-center justify-center gap-1.5 font-display font-bold text-[13px] text-white bg-rd-coral hover:bg-rd-coral-dark disabled:opacity-50 disabled:cursor-not-allowed rounded-full px-4 py-2.5 transition-colors";
const RD_BTN_GHOST =
  "inline-flex items-center gap-1.5 text-[12px] text-rd-text-secondary hover:text-rd-text hover:bg-rd-bg-soft rounded-full px-3 py-1.5 transition-colors";
const RD_LABEL =
  "block text-[11px] font-display font-semibold text-rd-text mb-1.5";

export default function StoryBank() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [storyModal, setStoryModal] = useState(null); // { source } | null — create modal
  const [editingStory, setEditingStory] = useState(null); // story object | null — edit modal
  const [quickAddExperienceId, setQuickAddExperienceId] = useState("");
  const [dailyActionCtx, setDailyActionCtx] = useState(null);

  // Filter: all | linked | general OR experience_id=<uuid>
  const filterParam = searchParams.get("filter") || "all";
  const filterExperienceId = (() => {
    if (filterParam.startsWith("experience_id="))
      return filterParam.slice("experience_id=".length);
    return null;
  })();
  const filterMode = filterExperienceId
    ? "by_experience"
    : filterParam === "linked" || filterParam === "general"
      ? filterParam
      : "all";

  // True once the user actively picks a filter THIS session. A filter that's
  // only in the URL (deep-link / bookmark / stale ?filter from a prior visit)
  // does NOT count — so a stale filter that hides everything can fall back to
  // "all" instead of stranding the user on an empty page.
  const pickedInSession = useRef(false);

  const setFilter = (next) => {
    pickedInSession.current = true;
    const params = new URLSearchParams(searchParams);
    if (next === "all") params.delete("filter");
    else params.set("filter", next);
    setSearchParams(params, { replace: true });
  };

  // ── Data ────────────────────────────────────────────────────────────
  // Canonical full-shape fetch — the shared ["stories", uid] cache always
  // holds complete rows, so StoryCard binds title/action/result regardless
  // of whether Home/Profile (narrow consumers) mounted first.
  const { data: stories = [], isLoading: storiesLoading } = useStoriesQuery(
    user?.id,
  );

  // Canonical experiences fetch (was a raw narrow select on the shared
  // ["experiences", uid] key — same projection-collision class). Full rows;
  // the label map below only reads id/title/company.
  const { data: experiences = [] } = useExperiencesQuery(user?.id);

  // Map experience_id → "Role at Company" for the StoryCard chips.
  const experienceLabelById = useMemo(() => {
    const m = new Map();
    for (const e of experiences) {
      m.set(e.id, `${e.title || "Role"}${e.company ? ` at ${e.company}` : ""}`);
    }
    return m;
  }, [experiences]);

  // Filtered list — by mode.
  const filteredStories = useMemo(() => {
    if (filterMode === "linked") return stories.filter((s) => s.experience_id);
    if (filterMode === "general")
      return stories.filter((s) => !s.experience_id);
    if (filterMode === "by_experience")
      return stories.filter((s) => s.experience_id === filterExperienceId);
    return stories;
  }, [stories, filterMode, filterExperienceId]);

  // Stale-filter guard: a ?filter carried in from a prior visit / deep-link
  // that hides EVERY story shouldn't strand the user on an empty page. If the
  // filter wasn't picked this session and yields nothing, fall back to "all"
  // and drop the dead param from the URL. (An in-session pick that empties
  // out still shows the honest "N hidden" message + a Show-all escape below.)
  const staleEmptyFilter =
    !pickedInSession.current &&
    !storiesLoading &&
    filterMode !== "all" &&
    stories.length > 0 &&
    filteredStories.length === 0;
  useEffect(() => {
    if (!staleEmptyFilter) return;
    const params = new URLSearchParams(searchParams);
    params.delete("filter");
    setSearchParams(params, { replace: true });
  }, [staleEmptyFilter]);
  // What the list actually renders — falls back to all stories when a stale
  // filter would otherwise show nothing (no empty flash before the effect).
  const shownStories = staleEmptyFilter ? stories : filteredStories;

  // ── Daily Action handoff ──────────────────────────────────────────
  // Reflect daily action navigates here with location.state.dailyAction.
  // Open the quick-add modal with the prompt as framing, then mark the
  // daily action done after the story saves.
  useEffect(() => {
    const incoming = location.state?.dailyAction;
    if (!incoming?.id || !incoming?.prompt) return;
    setDailyActionCtx(incoming);
    setQuickAddExperienceId(experiences?.[0]?.id || "");
    setStoryModal({ source: "manual_quick_add" });
    // Clear so a refresh doesn't re-open.
    navigate(location.pathname + location.search, {
      replace: true,
      state: null,
    });
  }, [location.state?.dailyAction?.id]);

  // ── Story extraction + save (create flow) ─────────────────────────
  const handleExtractStory = async (text) => {
    try {
      const { data, error } = await supabase.functions.invoke(
        "extract-story-from-text",
        {
          body: { text, source: storyModal?.source || "manual_form" },
        },
      );
      if (error) {
        console.error("Story extraction error:", error);
        return null;
      }
      return data || null;
    } catch (err) {
      console.error("Story extraction exception:", err);
      return null;
    }
  };

  const handleSaveStory = async (story, capture) => {
    if (!user?.id) return false;
    try {
      const { error } = await supabase.from("stories").insert({
        user_id: user.id,
        source: storyModal?.source || "manual_form",
        experience_id: capture?.experience_id || null,
        title: story.title,
        situation: story.situation || null,
        task: story.task || null,
        action: story.action || null,
        result: story.result || null,
        metrics: Array.isArray(story.metrics) ? story.metrics : [],
        skills_demonstrated: Array.isArray(story.skills_demonstrated)
          ? story.skills_demonstrated
          : [],
        tools_used: Array.isArray(story.tools_used) ? story.tools_used : [],
        relevance_tags: Array.isArray(story.relevance_tags)
          ? story.relevance_tags
          : [],
      });
      if (error) {
        console.error("Story save error:", error);
        toast.error("Could not save story. Please try again.");
        return false;
      }
      queryClient.invalidateQueries({ queryKey: ["stories"] });
      toast.success("Story saved.");

      // Daily Action handoff — mark the daily_action row done.
      if (dailyActionCtx?.id) {
        const { error: daErr } = await supabase
          .from("daily_actions")
          .update({ status: "done", completed_at: new Date().toISOString() })
          .eq("id", dailyActionCtx.id);
        if (daErr) {
          console.warn("Daily action mark-done failed:", daErr.message);
        } else {
          queryClient.invalidateQueries({
            queryKey: ["daily_action", user.id],
          });
        }
        setDailyActionCtx(null);
      }

      setTimeout(() => setStoryModal(null), 1200);
      return true;
    } catch (err) {
      console.error("Story save exception:", err);
      return false;
    }
  };

  // ── Edit / delete (existing stories) ──────────────────────────────
  const handleEditSave = async (storyId, patch) => {
    const { error } = await supabase
      .from("stories")
      .update(patch)
      .eq("id", storyId)
      .eq("user_id", user.id);
    if (error) {
      console.error("Story update error:", error);
      toast.error("Couldn't update the story.");
      return false;
    }
    queryClient.invalidateQueries({ queryKey: ["stories"] });
    toast.success("Story updated.");
    return true;
  };

  const handleDeleteStory = async (storyId) => {
    const { error } = await supabase
      .from("stories")
      .delete()
      .eq("id", storyId)
      .eq("user_id", user.id);
    if (error) {
      console.error("Story delete error:", error);
      toast.error("Couldn't delete the story.");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["stories"] });
    toast.success("Story deleted.");
  };

  // ── Pre-pick the experience when filtering by_experience ──────────
  useEffect(() => {
    if (filterExperienceId) setQuickAddExperienceId(filterExperienceId);
  }, [filterExperienceId]);

  // ── Render ────────────────────────────────────────────────────────
  const counts = {
    all: stories.length,
    linked: stories.filter((s) => s.experience_id).length,
    general: stories.filter((s) => !s.experience_id).length,
  };

  const filterExperienceLabel = filterExperienceId
    ? experienceLabelById.get(filterExperienceId) || "this experience"
    : null;

  return (
    <div className="max-w-4xl mx-auto px-5 sm:px-8 py-8 sm:py-10">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-7 flex-wrap">
        <div className="min-w-0">
          <p className="text-[10.5px] uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow font-mono">
            Story Bank
          </p>
          <h1 className="font-display font-extrabold text-[32px] sm:text-[36px] leading-[1.08] tracking-tight text-rd-text mt-1">
            Your career stories.
          </h1>
          <p className="text-[13.5px] text-rd-text-secondary leading-[1.55] mt-2 max-w-2xl">
            STAR-format moments that feed every CV, LinkedIn post, and interview
            answer. Capture once, reuse everywhere.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setQuickAddExperienceId(
              filterExperienceId || experiences?.[0]?.id || "",
            );
            setStoryModal({ source: "manual_quick_add" });
          }}
          className={`${RD_BTN_PRIMARY} flex-shrink-0`}
        >
          <Plus className="w-3.5 h-3.5" />
          Add story
        </button>
      </div>

      {/* Filter chips — show only when there's at least one story (and not
          pinned to a single experience, unless a stale experience filter just
          fell back to all). */}
      {stories.length > 0 && (!filterExperienceId || staleEmptyFilter) && (
        <div className="flex gap-2 mb-6 flex-wrap">
          {["all", "linked", "general"].map((mode) => {
            const selected = filterMode === mode;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => setFilter(mode)}
                aria-pressed={selected}
                className={[
                  "inline-flex items-center font-display font-bold text-[12.5px] rounded-full px-3.5 py-1.5 transition-colors duration-150 whitespace-nowrap",
                  selected
                    ? "bg-rd-coral text-white"
                    : "bg-rd-bg-soft text-rd-text-secondary hover:bg-rd-border hover:text-rd-text",
                ].join(" ")}
              >
                {FILTER_LABELS[mode]} ({counts[mode]})
              </button>
            );
          })}
        </div>
      )}

      {/* Filtered-by-experience pill */}
      {filterExperienceId && !staleEmptyFilter && (
        <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
          <p className="text-[13px] text-rd-text-secondary">
            Showing stories for{" "}
            <strong className="text-rd-text font-display font-bold">
              {filterExperienceLabel}
            </strong>
          </p>
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={RD_BTN_GHOST}
          >
            <X className="w-3.5 h-3.5" />
            Show all stories
          </button>
        </div>
      )}

      {/* Empty + loading + filtered-empty states */}
      {storiesLoading ? (
        <div className="rounded-[18px] border border-rd-border bg-rd-bg-card px-6 py-10 shadow-rd text-center">
          <Loader2 className="w-5 h-5 animate-spin text-rd-text-secondary mx-auto" />
        </div>
      ) : stories.length === 0 ? (
        <div className="rounded-[18px] border border-rd-border bg-rd-bg-card px-6 py-12 shadow-rd text-center">
          <BookText className="w-10 h-10 text-rd-coral mx-auto mb-3" />
          <p className="font-display font-bold text-[15px] text-rd-text">
            No stories captured yet.
          </p>
          <p className="text-[13.5px] text-rd-text-secondary leading-[1.55] mt-2 max-w-md mx-auto">
            Stories are the raw material every other surface uses: CV bullets,
            LinkedIn posts, interview answers. Capture one moment from a recent
            experience - it gets reused everywhere.
          </p>
          {experiences.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                setQuickAddExperienceId(experiences[0]?.id || "");
                setStoryModal({ source: "manual_quick_add" });
              }}
              className={`${RD_BTN_PRIMARY} mt-5`}
            >
              <Plus className="w-3.5 h-3.5" />
              Capture your first story
            </button>
          ) : (
            <p className="text-[12px] text-rd-text-tertiary mt-5">
              Add an experience on your{" "}
              <a
                href="/Profile?tab=experience"
                className="underline hover:text-rd-coral-dark"
              >
                Profile
              </a>{" "}
              first, then capture stories tied to it.
            </p>
          )}
        </div>
      ) : shownStories.length === 0 ? (
        // In-session filter that hides everything: never a bare empty — say how
        // many are hidden and offer a one-tap escape. (A stale URL filter never
        // reaches here; staleEmptyFilter falls shownStories back to all.)
        <div className="rounded-[18px] border border-rd-border bg-rd-bg-card px-6 py-10 shadow-rd text-center">
          <BookText className="w-8 h-8 text-rd-text-tertiary mx-auto mb-3" />
          <p className="font-display font-bold text-[14.5px] text-rd-text">
            {stories.length} {stories.length === 1 ? "story is" : "stories are"}{" "}
            hidden by this filter
          </p>
          <p className="text-[13px] text-rd-text-secondary mt-1.5">
            None match the current view.
          </p>
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`${RD_BTN_PRIMARY} mt-5`}
          >
            Show all stories
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {shownStories.map((story) => (
            <StoryCard
              key={story.id}
              story={story}
              experienceLabel={
                story.experience_id
                  ? experienceLabelById.get(story.experience_id)
                  : null
              }
              onEdit={setEditingStory}
              onDelete={handleDeleteStory}
            />
          ))}
        </div>
      )}

      {/* Floating quick-add — only when there's at least one story, so the
          big primary "Add story" button doesn't have a competing affordance
          in the empty state. */}
      {stories.length > 0 && !storyModal && (
        <button
          type="button"
          onClick={() => {
            setQuickAddExperienceId(
              filterExperienceId || experiences?.[0]?.id || "",
            );
            setStoryModal({ source: "manual_quick_add" });
          }}
          className="fixed bottom-6 right-6 px-4 py-3 rounded-full bg-rd-coral hover:bg-rd-coral-dark text-white font-display font-bold text-[13.5px] inline-flex items-center gap-1.5 shadow-rd hover:shadow-[0_12px_32px_rgba(40,25,10,0.16)] transition-all z-40"
          aria-label="Quick-add a story"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Capture story</span>
        </button>
      )}

      {/* Create modal (paste text → AI extract → review → save) */}
      <Dialog
        open={!!storyModal}
        onOpenChange={(v) => {
          if (!v) {
            setStoryModal(null);
            setDailyActionCtx(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-rd-bg-card border border-rd-border rounded-[18px]">
          <DialogHeader>
            <DialogTitle className="font-display font-extrabold text-[18px] text-rd-text flex items-center gap-2">
              <BookText className="w-4 h-4 text-rd-coral" />
              Add a story
            </DialogTitle>
          </DialogHeader>
          <div className="pt-2">
            {experiences.length === 0 ? (
              <p className="rounded-[14px] px-4 py-3 text-[13px] leading-[1.55] bg-rd-teal-tint border border-rd-teal/30 text-rd-text">
                Add at least one experience on your Profile first, then come
                back to capture stories tied to it.
              </p>
            ) : (
              <>
                <div className="mb-3">
                  <label className={RD_LABEL}>Which experience?</label>
                  <Select
                    value={quickAddExperienceId}
                    onValueChange={setQuickAddExperienceId}
                  >
                    <SelectTrigger className="border-rd-border rounded-[10px] bg-rd-bg-card text-rd-text">
                      <SelectValue placeholder="Pick an experience" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__general__">
                        — No experience (general) —
                      </SelectItem>
                      {experiences.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.title}
                          {e.company ? ` at ${e.company}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {quickAddExperienceId && (
                  <StorySaveCard
                    key={quickAddExperienceId}
                    capture={{
                      text: "",
                      experience_id:
                        quickAddExperienceId === "__general__"
                          ? null
                          : quickAddExperienceId,
                      framing:
                        dailyActionCtx?.prompt ||
                        "Capture a moment from your work history.",
                    }}
                    experienceLabel={(() => {
                      if (quickAddExperienceId === "__general__") return null;
                      return (
                        experienceLabelById.get(quickAddExperienceId) || null
                      );
                    })()}
                    onExtract={handleExtractStory}
                    onSave={handleSaveStory}
                  />
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit modal */}
      <StoryEditor
        story={editingStory}
        open={!!editingStory}
        experienceLabel={
          editingStory?.experience_id
            ? experienceLabelById.get(editingStory.experience_id)
            : null
        }
        onClose={() => setEditingStory(null)}
        onSave={handleEditSave}
      />
    </div>
  );
}
