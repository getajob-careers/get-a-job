import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, BookText, Plus, X } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import StorySaveCard from "@/components/chat/StorySaveCard";
import StoryCard from "@/components/storyBank/StoryCard";
import StoryEditor from "@/components/storyBank/StoryEditor";
import { PROFILE_CSS } from "@/components/profile/profileStyles";

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

export default function StoryBank() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [storyModal, setStoryModal] = useState(null);   // { source } | null — create modal
  const [editingStory, setEditingStory] = useState(null); // story object | null — edit modal
  const [quickAddExperienceId, setQuickAddExperienceId] = useState("");
  const [dailyActionCtx, setDailyActionCtx] = useState(null);

  // Filter: all | linked | general OR experience_id=<uuid>
  const filterParam = searchParams.get("filter") || "all";
  const filterExperienceId = (() => {
    if (filterParam.startsWith("experience_id=")) return filterParam.slice("experience_id=".length);
    return null;
  })();
  const filterMode = filterExperienceId
    ? "by_experience"
    : (filterParam === "linked" || filterParam === "general" ? filterParam : "all");

  const setFilter = (next) => {
    const params = new URLSearchParams(searchParams);
    if (next === "all") params.delete("filter");
    else params.set("filter", next);
    setSearchParams(params, { replace: true });
  };

  // ── Data ────────────────────────────────────────────────────────────
  const { data: stories = [], isLoading: storiesLoading } = useQuery({
    queryKey: ["stories", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("stories")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const { data: experiences = [] } = useQuery({
    queryKey: ["experiences", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("experiences")
        .select("id, title, company")
        .eq("user_id", user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

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
    if (filterMode === "linked")    return stories.filter((s) => s.experience_id);
    if (filterMode === "general")   return stories.filter((s) => !s.experience_id);
    if (filterMode === "by_experience") return stories.filter((s) => s.experience_id === filterExperienceId);
    return stories;
  }, [stories, filterMode, filterExperienceId]);

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
    navigate(location.pathname + location.search, { replace: true, state: null });

  }, [location.state?.dailyAction?.id]);

  // ── Story extraction + save (create flow) ─────────────────────────
  const handleExtractStory = async (text) => {
    try {
      const { data, error } = await supabase.functions.invoke("extract-story-from-text", {
        body: { text, source: storyModal?.source || "manual_form" },
      });
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
        skills_demonstrated: Array.isArray(story.skills_demonstrated) ? story.skills_demonstrated : [],
        tools_used: Array.isArray(story.tools_used) ? story.tools_used : [],
        relevance_tags: Array.isArray(story.relevance_tags) ? story.relevance_tags : [],
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
          queryClient.invalidateQueries({ queryKey: ["daily_action", user.id] });
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
    ? (experienceLabelById.get(filterExperienceId) || "this experience")
    : null;

  return (
    <>
      <style>{PROFILE_CSS}</style>
      <div className="profile">
        <div className="max-w-4xl mx-auto px-6 py-10">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-7 flex-wrap">
            <div>
              <p className="p-eyebrow">Story Bank</p>
              <h1 className="p-h1 mt-1.5">Your career stories.</h1>
              <p className="p-sub">
                STAR-format moments that feed every CV, LinkedIn post, and interview answer. Capture once, reuse everywhere.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setQuickAddExperienceId(filterExperienceId || experiences?.[0]?.id || "");
                setStoryModal({ source: "manual_quick_add" });
              }}
              className="p-btn p-btn-primary flex-shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />Add story
            </button>
          </div>

          {/* Filter chips — show only when there's at least one story */}
          {stories.length > 0 && !filterExperienceId && (
            <div className="flex gap-2 mb-6 flex-wrap">
              {["all", "linked", "general"].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setFilter(mode)}
                  className="p-tile"
                  data-selected={filterMode === mode}
                >
                  {FILTER_LABELS[mode]} ({counts[mode]})
                </button>
              ))}
            </div>
          )}

          {/* Filtered-by-experience pill */}
          {filterExperienceId && (
            <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
              <p className="text-sm text-[#52545A]">
                Showing stories for <strong className="text-[#0E1014]">{filterExperienceLabel}</strong>
              </p>
              <button
                type="button"
                onClick={() => setFilter("all")}
                className="p-btn p-btn-ghost p-btn-sm"
              >
                <X className="w-3.5 h-3.5" />Show all stories
              </button>
            </div>
          )}

          {/* Empty state */}
          {storiesLoading ? (
            <div className="p-card text-center">
              <Loader2 className="w-5 h-5 animate-spin text-[#52545A] mx-auto" />
            </div>
          ) : stories.length === 0 ? (
            <div className="p-card-lg p-card text-center">
              <BookText className="w-10 h-10 text-[#F87060] mx-auto mb-3" />
              <p className="text-base font-semibold text-[#0E1014]">No stories captured yet.</p>
              <p className="p-sub max-w-md mx-auto">
                Stories are the raw material every other surface uses: CV bullets, LinkedIn posts, interview answers. Capture one moment from a recent experience — it gets reused everywhere.
              </p>
              {experiences.length > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuickAddExperienceId(experiences[0]?.id || "");
                    setStoryModal({ source: "manual_quick_add" });
                  }}
                  className="p-btn p-btn-primary mt-5"
                >
                  <Plus className="w-3.5 h-3.5" />Capture your first story
                </button>
              ) : (
                <p className="text-xs text-[#9C9DA1] mt-5">
                  Add an experience on your <a href="/Profile?tab=experience" className="underline">Profile</a> first, then capture stories tied to it.
                </p>
              )}
            </div>
          ) : filteredStories.length === 0 ? (
            <div className="p-card text-center">
              <p className="text-sm text-[#52545A]">No stories match this filter.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filteredStories.map((story) => (
                <StoryCard
                  key={story.id}
                  story={story}
                  experienceLabel={story.experience_id ? experienceLabelById.get(story.experience_id) : null}
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
                setQuickAddExperienceId(filterExperienceId || experiences?.[0]?.id || "");
                setStoryModal({ source: "manual_quick_add" });
              }}
              className="p-quick-add"
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
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-white border-[#DDDDDB]">
              <DialogHeader>
                <DialogTitle className="text-base font-semibold flex items-center gap-2">
                  <BookText className="w-4 h-4 text-[#6B4FBF]" />
                  Add a story
                </DialogTitle>
              </DialogHeader>
              <div className="pt-2">
                {experiences.length === 0 ? (
                  <p className="p-banner p-banner-info">
                    Add at least one experience on your Profile first, then come back to capture stories tied to it.
                  </p>
                ) : (
                  <>
                    <div className="mb-3">
                      <label className="p-label">Which experience?</label>
                      <Select value={quickAddExperienceId} onValueChange={setQuickAddExperienceId}>
                        <SelectTrigger className="border-[#DDDDDB]"><SelectValue placeholder="Pick an experience" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__general__">— No experience (general) —</SelectItem>
                          {experiences.map((e) => (
                            <SelectItem key={e.id} value={e.id}>
                              {e.title}{e.company ? ` at ${e.company}` : ""}
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
                          experience_id: quickAddExperienceId === "__general__" ? null : quickAddExperienceId,
                          framing: dailyActionCtx?.prompt || "Capture a moment from your work history.",
                        }}
                        experienceLabel={(() => {
                          if (quickAddExperienceId === "__general__") return null;
                          return experienceLabelById.get(quickAddExperienceId) || null;
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
            experienceLabel={editingStory?.experience_id ? experienceLabelById.get(editingStory.experience_id) : null}
            onClose={() => setEditingStory(null)}
            onSave={handleEditSave}
          />
        </div>
      </div>
    </>
  );
}
