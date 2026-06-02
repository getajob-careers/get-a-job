import React, { useEffect, useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { BookMarked, Loader2, X, Check } from "lucide-react";

// PR 3J-B — restyled on rd-* tokens. Restyle-only on behavior; the
// supabase reads (stories table, RLS-scoped by user_id via implicit
// policy), onAttach/onDetach contract, and 50-row limit are unchanged.
//
// Optional Story Bank picker shown alongside the compose form (Eli's
// call PR #32: "B (sidebar)"). User can attach a story mid-flow without
// it blocking the form. When attached, the edge function gets the
// story's STAR record as ground truth and binds metrics + tools verbatim.
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
    <div className="bg-white border border-rd-border rounded-[18px] p-4 shadow-rd sticky top-4">
      <div className="flex items-center gap-2 mb-3">
        <BookMarked className="w-4 h-4 text-rd-coral" />
        <h3 className="font-display font-bold text-[13.5px] text-rd-text">Attach a story</h3>
        <span className="text-[11px] text-rd-text-tertiary ml-auto">(optional)</span>
      </div>
      <p className="text-[11.5px] text-rd-text-secondary leading-snug mb-3">
        Stories ground the post in real metrics and tools. The AI uses verbatim numbers from attached stories — no fabrication.
      </p>

      {attached && (
        <div className="bg-rd-teal-tint border border-rd-teal/30 rounded-[10px] p-2.5 mb-3">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex items-center gap-1.5">
              <Check className="w-3 h-3 text-rd-teal-dark" />
              <span className="text-[11px] font-display font-bold text-rd-teal-dark">Attached</span>
            </div>
            <button
              type="button"
              onClick={onDetach}
              className="text-rd-teal-dark hover:text-rd-text"
              title="Detach this story"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <p className="text-[12px] text-rd-text font-display font-semibold">{attached.title}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-[11.5px] text-rd-text-tertiary">
          <Loader2 className="w-3 h-3 animate-spin" />
          Loading stories…
        </div>
      ) : stories.length === 0 ? (
        <p className="text-[11.5px] text-rd-text-tertiary italic">
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
              className={[
                "w-full text-left px-2.5 py-2 rounded-[10px] border text-[12px] transition-colors",
                s.id === attachedStoryId
                  ? "border-rd-teal/30 bg-rd-teal-tint cursor-default"
                  : "border-rd-border bg-white hover:border-rd-border-hover hover:bg-rd-bg-soft",
              ].join(" ")}
            >
              <p className="font-display font-semibold text-rd-text truncate">{s.title}</p>
              {Array.isArray(s.metrics) && s.metrics.length > 0 && (
                <p className="text-[10px] text-rd-text-tertiary truncate mt-0.5">
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
