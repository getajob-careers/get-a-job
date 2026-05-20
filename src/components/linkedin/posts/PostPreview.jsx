import React, { useEffect, useRef, useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Copy, Check, Loader2, Sparkles, ArrowLeft, AlertCircle, Image as ImageIcon, Layers } from "lucide-react";

// PostPreview — shows the generated post in a clean card with editable
// textarea + inline metadata (hashtags, format, warnings, saveable score).
//
// UX decisions PR #32:
//   - Subtle LinkedIn-ish styling (option C) — clean white card, max-width
//     ~640px, no fake LinkedIn UI scaffolding (that's the eventual mirror)
//   - Edited text auto-saves debounced 500ms (option A) — invisible to
//     user, no risk of losing edits, no Save button
//   - Refine button matches PR #19 per-section pattern — inline textarea
//     + Cancel/Refine, identical UX users already know
//   - Hashtags + format + warnings + saveable score stack inline below
//     the post (option A)

const SAVE_DEBOUNCE_MS = 500;

export default function PostPreview({
  post,            // GeneratedPost from edge function
  postId,          // linkedin_posts row id (for edit saves + refine targeting)
  inputs,          // form data — needed for refine to send back
  postType,
  storyId,
  onRefineSuccess, // callback (newPost, postId) when refinement returns
  onBack,          // back to compose form
}) {
  // Local edit state. editedText starts as post.post_text; if user types,
  // diverges, and the debounced save fires the diff to linkedin_posts.edited_text.
  // When post changes (refinement landed), reset editedText to the new text.
  const [editedText, setEditedText] = useState(post.post_text);
  const [savingEdit, setSavingEdit] = useState(false);
  const [savedJustNow, setSavedJustNow] = useState(false);
  const [copied, setCopied] = useState(false);

  // Refine UX state (matches PR #19 per-section refinement pattern)
  const [refineOpen, setRefineOpen] = useState(false);
  const [refineInstruction, setRefineInstruction] = useState("");
  const [refining, setRefining] = useState(false);
  const [refineError, setRefineError] = useState(null);

  // Reset local editor state whenever a new generated post arrives
  // (initial render, or refinement landed).
  useEffect(() => {
    setEditedText(post.post_text);
    setRefineOpen(false);
    setRefineInstruction("");
    setRefineError(null);
  }, [post.post_text]);

  // Debounced auto-save of edited_text. Only saves when the textarea
  // diverges from the LLM-generated post_text — preserves NULL for
  // unedited posts so the prompt-quality analysis can distinguish.
  const saveTimerRef = useRef(null);
  useEffect(() => {
    if (!postId) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    const isDiff = editedText !== post.post_text;
    saveTimerRef.current = setTimeout(async () => {
      try {
        setSavingEdit(true);
        const { error } = await supabase
          .from("linkedin_posts")
          .update({ edited_text: isDiff ? editedText : null })
          .eq("id", postId);
        if (error) throw error;
        setSavedJustNow(true);
        setTimeout(() => setSavedJustNow(false), 1200);
      } catch (e) {
        console.error("save edited_text:", e);
      } finally {
        setSavingEdit(false);
      }
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [editedText, post.post_text, postId]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(editedText || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy. Select the text manually.");
    }
  };

  const handleRefine = async () => {
    if (refining) return;
    setRefining(true);
    setRefineError(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-linkedin-post", {
        body: {
          post_type: postType,
          post_id: postId,
          inputs,
          story_id: storyId || null,
          prior_post: editedText || post.post_text,
          instruction: refineInstruction || "",
        },
      });
      if (error) {
        const status = error?.context?.status;
        if (status === 429) throw new Error("Rate limit reached (60/hour). Try again in a bit.");
        throw new Error(error.message || "Refinement failed. Please try again.");
      }
      if (!data?.post_text) throw new Error("AI returned an unexpected response.");
      onRefineSuccess(data, data.post_id || postId);
      toast.success("Post refined.");
    } catch (e) {
      setRefineError(e?.message || "Refinement failed.");
    } finally {
      setRefining(false);
    }
  };

  const charCount = editedText.length;
  const charClass = charCount > 2500 ? "text-[#B8841C]" : charCount > 3000 ? "text-red-600" : "text-[#9C9DA1]";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-xs text-[#52545A] hover:text-[#0E1014]">
          <ArrowLeft className="w-3 h-3" />
          Back to compose
        </button>
        <div className="flex items-center gap-2">
          {savingEdit && <span className="text-[11px] text-[#9C9DA1]">Saving…</span>}
          {savedJustNow && !savingEdit && <span className="text-[11px] text-emerald-700">Saved</span>}
        </div>
      </div>

      {/* Post card — subtle LinkedIn-ish styling without faking the full
          mirror. Max-width approximates a feed item. */}
      <div className="bg-white border border-[#DDDDDB] rounded-xl shadow-sm max-w-[640px] mx-auto">
        <div className="px-5 pt-5 pb-2">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] uppercase tracking-wider text-[#9C9DA1] font-medium">Your post</span>
            <span className={`text-[11px] ${charClass}`}>{charCount}/3000 chars</span>
          </div>
          <textarea
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            rows={Math.min(20, Math.max(8, editedText.split("\n").length + 2))}
            className="w-full text-sm text-[#0E1014] leading-relaxed bg-transparent border-0 p-0 focus:outline-none resize-none whitespace-pre-wrap font-sans"
          />
        </div>
        <div className="px-5 py-3 border-t border-[#E8E8E5] bg-[#F4F4F2] rounded-b-xl flex items-center justify-between">
          <span className="text-[11px] text-[#9C9DA1]">
            Hook (mobile-truncation preview): "{post.hook_preview.slice(0, 80)}{post.hook_preview.length > 80 ? '…' : ''}"
          </span>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1 text-xs font-medium text-[#52545A] hover:text-[#0E1014]"
          >
            {copied ? (
              <><Check className="w-3 h-3 text-emerald-600" />Copied</>
            ) : (
              <><Copy className="w-3 h-3" />Copy</>
            )}
          </button>
        </div>
      </div>

      {/* Inline metadata — stacked below the post per UX call PR #32 (option A) */}
      <div className="max-w-[640px] mx-auto space-y-2.5">
        {/* Hashtags */}
        {post.hashtag_suggestions?.length > 0 && (
          <MetaCard title="Hashtag suggestions">
            <div className="flex flex-wrap gap-1.5">
              {post.hashtag_suggestions.map((h) => (
                <span key={h} className="text-[11px] bg-[#E8E8E5] text-[#52545A] px-2 py-0.5 rounded">
                  {h}
                </span>
              ))}
            </div>
          </MetaCard>
        )}

        {/* Format recommendation */}
        <MetaCard
          title="Format recommendation"
          icon={post.format_recommendation === "carousel" ? <Layers className="w-3.5 h-3.5" /> : <ImageIcon className="w-3.5 h-3.5" />}
        >
          <p className="text-xs text-[#0E1014] font-medium mb-0.5 capitalize">
            {post.format_recommendation.replace("_", " + ")}
          </p>
          <p className="text-[11px] text-[#52545A] leading-snug">{post.format_reason}</p>
          {post.format_recommendation === "carousel" && (
            // Per Eli's call PR #33 (option B): inform, don't block. Carousels
            // underperform under 5K followers per AuthoredUp 2026 (the
            // strongest empirical finding in our LinkedIn research doc). The
            // user makes the final call but is told why image+text is
            // typically better at their follower count.
            <div className="mt-2 px-2 py-1.5 li-banner li-banner-warning text-[11px] leading-snug">
              <strong>Better at 20K+ followers.</strong> For accounts under 5K (most early-career profiles), image + text typically outperforms carousels — the algorithm rewards lower-friction formats that drive quick reactions. Consider switching to image + text unless this carousel really fits the content.
            </div>
          )}
        </MetaCard>

        {/* Saveable score */}
        <MetaCard title="Saveable score">
          <div className="flex items-center gap-2">
            <span className={`text-base font-bold ${
              post.saveable_score >= 8 ? "text-emerald-700"
              : post.saveable_score >= 5 ? "text-[#0E1014]"
              : "text-[#B8841C]"
            }`}>
              {post.saveable_score}/10
            </span>
            <span className="text-[11px] text-[#52545A] leading-snug">
              {post.saveable_score >= 8
                ? "Strong saveable structure — readers likely to bookmark."
                : post.saveable_score >= 5
                ? "Decent — could lift with more concrete takeaways or a numbered framework."
                : "Liked, not saved — primarily narrative. That's fine for some post types (e.g. milestones)."}
            </span>
          </div>
        </MetaCard>

        {/* Warnings */}
        {post.warnings?.length > 0 && (
          <div className="li-banner li-banner-warning p-3">
            {post.warnings.map((w, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-[#B8841C] flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-[#6B4E0F] leading-snug">{w}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Refine action — matches PR #19 per-section pattern */}
      <div className="max-w-[640px] mx-auto">
        {!refineOpen ? (
          <button
            type="button"
            onClick={() => setRefineOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#52545A] hover:text-[#0E1014]"
          >
            <Sparkles className="w-3 h-3" />
            Refine this post
          </button>
        ) : (
          <div className="bg-[#F9FAFB] border border-[#DDDDDB] rounded-lg p-3">
            <textarea
              value={refineInstruction}
              onChange={(e) => setRefineInstruction(e.target.value.slice(0, 600))}
              disabled={refining}
              placeholder="Optional: how to improve the post. e.g. 'make it shorter and punchier', 'lead with the metric not the context', 'less corporate-sounding'. Leave blank to regenerate with a different angle."
              className="w-full text-sm border border-[#DDDDDB] rounded-md px-3 py-2 bg-white resize-none focus:outline-none focus:ring-1 focus:ring-[#0A0A0A] disabled:opacity-60"
              rows={3}
              autoFocus
            />
            <div className="flex items-center justify-between mt-2 gap-3">
              <span className="text-[11px] text-[#9C9DA1]">{refineInstruction.length}/600</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setRefineOpen(false); setRefineError(null); setRefineInstruction(""); }}
                  disabled={refining}
                  className="text-xs px-3 py-1.5 text-[#52545A] hover:text-[#0E1014] disabled:opacity-60"
                >
                  Cancel
                </button>
                <Button
                  onClick={handleRefine}
                  disabled={refining}
                  className="bg-[#0E1014] hover:bg-[#F87060] text-xs h-8 px-3"
                >
                  {refining ? (
                    <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" />Refining…</>
                  ) : (
                    <><Sparkles className="w-3 h-3 mr-1.5" />Refine</>
                  )}
                </Button>
              </div>
            </div>
            {refineError && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-[11px] text-red-800 flex items-start gap-1.5">
                <AlertCircle className="w-3 h-3 text-red-600 flex-shrink-0 mt-0.5" />
                <span>{refineError}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MetaCard({ title, icon, children }) {
  return (
    <div className="bg-white border border-[#DDDDDB] rounded-lg p-3">
      <div className="flex items-center gap-1.5 mb-1.5">
        {icon}
        <span className="text-[10px] uppercase tracking-wider text-[#9C9DA1] font-medium">{title}</span>
      </div>
      {children}
    </div>
  );
}
