import React, { useEffect, useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { BookMarked, Loader2, X, Check } from "lucide-react";

// StoryBankSidebar — optional Story Bank picker shown alongside the compose
// form (Eli's call PR #32: "B (sidebar)"). User can attach a story mid-flow
// without it blocking the form. When attached, the edge function gets the
// story's STAR record as ground truth and binds metrics + tools verbatim.
//
// If user has no stories, show an empty state with a link to the floating
// quick-add on AddInformation (where stories are created).
export default function StoryBankSidebar({ attachedStoryId, onAttach, onDetach }) {
  const { user } = useAuth();
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase
          .from("stories")
          .select("id, title, action, result, metrics, skills_demonstrated")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50);
        if (!cancelled) setStories(data || []);
      } catch (e) {
        console.error("Story Bank fetch:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const attached = stories.find((s) => s.id === attachedStoryId);

  return (
    <div className="bg-white border border-[#DDDDDB] rounded-xl p-4 sticky top-4">
      <div className="flex items-center gap-2 mb-3">
        <BookMarked className="w-4 h-4 text-[#52545A]" />
        <h3 className="text-sm font-semibold text-[#0E1014]">Attach a story</h3>
        <span className="text-[11px] text-[#9C9DA1] ml-auto">(optional)</span>
      </div>
      <p className="text-[11px] text-[#52545A] leading-snug mb-3">
        Stories ground the post in real metrics and tools. The AI uses verbatim numbers from attached stories — no fabrication.
      </p>

      {attached && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 mb-3">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex items-center gap-1.5">
              <Check className="w-3 h-3 text-emerald-700" />
              <span className="text-[11px] font-semibold text-emerald-800">Attached</span>
            </div>
            <button
              type="button"
              onClick={onDetach}
              className="text-emerald-700 hover:text-emerald-900"
              title="Detach this story"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <p className="text-xs text-[#0E1014] font-medium">{attached.title}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-[#9C9DA1]">
          <Loader2 className="w-3 h-3 animate-spin" />
          Loading stories…
        </div>
      ) : stories.length === 0 ? (
        <p className="text-[11px] text-[#9C9DA1] italic">
          No stories yet. Add one from the chat or via Profile → Quick add.
        </p>
      ) : (
        <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
          {stories.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onAttach(s.id)}
              disabled={s.id === attachedStoryId}
              className={`w-full text-left px-2.5 py-2 rounded-md border text-xs transition-colors ${
                s.id === attachedStoryId
                  ? "border-emerald-300 bg-emerald-50 cursor-default"
                  : "border-[#DDDDDB] bg-white hover:border-[#A3A3A3] hover:bg-[#F4F4F2]"
              }`}
            >
              <p className="font-medium text-[#0E1014] truncate">{s.title}</p>
              {Array.isArray(s.metrics) && s.metrics.length > 0 && (
                <p className="text-[10px] text-[#9C9DA1] truncate mt-0.5">
                  Metrics: {s.metrics.slice(0, 2).join(" · ")}
                </p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
