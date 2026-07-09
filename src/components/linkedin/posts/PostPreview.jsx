import React, { useEffect, useRef, useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Copy, Check, Loader2, Sparkles, ArrowLeft, AlertCircle,
  Image as ImageIcon, Layers, ThumbsUp, MessageCircle, Repeat, Send, MoreHorizontal, Globe,
} from "lucide-react";
import PostImageUpload from "./PostImageUpload";

// PR 3J-B — restyled to match getajob_linkedin_posts_feed_preview.html.
// Restyle-only on behavior:
//   - P5 refinement-updates-same-row preserved (post_id + prior_post +
//     instruction → generate-linkedin-post overwrites generated_data on
//     the same row; new post_id returned, threaded to parent via
//     onRefineSuccess).
//   - P6 debounced edited_text auto-save preserved (500ms,
//     linkedin_posts.UPDATE({ edited_text }).eq("id", postId), error
//     console-logged only — no optimistic/rollback by design).
//   - Hashtags inside the body render in LinkedIn-blue #0A66C2 (Q7
//     brand cue inside the simulacrum surface only).
//
// Mockup-fidelity numbers:
//   - Feed-card radius 12px, border #E2DED5
//   - Avatar 46px peach (#F0A98E), white serif initial
//   - Name slab 13.5px 700
//   - Headline 11.5px #5A5A5A truncated
//   - Body 13.5px line-height 1.6
//   - Engagement row text 12px #5A5A5A, divider #ECEAE4

const SAVE_DEBOUNCE_MS = 500;

function initialsFor(name) {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join("") || "?";
}

// Split the post body into renderable segments: plain text + hashtags
// (anything matching the #word pattern) — hashtags get the LinkedIn-blue
// inline color per Q7 brand fidelity.
function renderPostBody(text) {
  if (!text) return null;
  const parts = text.split(/(\s+|#\w+)/g);
  return parts.map((part, i) => {
    if (/^#\w+/.test(part)) {
      return <span key={i} className="text-[#0A66C2] font-semibold">{part}</span>;
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

export default function PostPreview({
  post,
  postId,
  inputs,
  postType,
  storyId,
  onRefineSuccess,
  onBack,
}) {
  const { user } = useAuth();

  // Live profile fields for the feed-card identity (name + headline).
  // The headline comes from the latest linkedin_optimizations.generated_data
  // (if generated) — falls back to a friendly default. Loads once per
  // session per user. (Same pattern as the live; cached 30 minutes.)
  const { data: identity } = useQuery({
    queryKey: ["linkedinPreviewIdentity", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const [{ data: profile }, { data: opt }] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
        supabase.from("linkedin_optimizations").select("generated_data").eq("user_id", user.id).maybeSingle(),
      ]);
      return {
        full_name: profile?.full_name || null,
        headline: opt?.generated_data?.headline || null,
      };
    },
    enabled: !!user?.id,
    staleTime: 30 * 60 * 1000,
  });

  const [editedText, setEditedText] = useState(post.post_text);
  const [savingEdit, setSavingEdit] = useState(false);
  const [savedJustNow, setSavedJustNow] = useState(false);
  const [copied, setCopied] = useState(false);
  const [imageUrl, setImageUrl] = useState(null);

  // Fetch the persisted image_url for this post. Refetch on post change
  // (refinement returns a new post_id).
  useEffect(() => {
    if (!postId) { setImageUrl(null); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("linkedin_posts")
        .select("image_url")
        .eq("id", postId)
        .maybeSingle();
      if (!cancelled) setImageUrl(data?.image_url || null);
    })();
    return () => { cancelled = true; };
  }, [postId]);

  // Refine UX state
  const [refineOpen, setRefineOpen] = useState(false);
  const [refineInstruction, setRefineInstruction] = useState("");
  const [refining, setRefining] = useState(false);
  const [refineError, setRefineError] = useState(null);

  useEffect(() => {
    setEditedText(post.post_text);
    setRefineOpen(false);
    setRefineInstruction("");
    setRefineError(null);
  }, [post.post_text]);

  // P6 debounced auto-save of edited_text. Only saves when the textarea
  // diverges from the LLM-generated post_text — preserves NULL for
  // unedited posts (signal to the prompt-quality pipeline). No
  // optimistic/rollback by design.
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

  // P5 refinement-updates-same-row. Body shape exactly per the live
  // contract: { post_type, post_id, inputs, story_id, prior_post,
  // instruction }. Edge fn overwrites generated_data on `post_id` —
  // does NOT create a new row.
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
  const charClass = charCount > 3000 ? "text-rd-coral-dark" : charCount > 2500 ? "text-rd-golden-dark" : "text-rd-text-tertiary";

  const previewName = identity?.full_name || "Your name";
  const previewHeadline = identity?.headline || "Add a headline in the Profile tab";
  const previewInitials = initialsFor(identity?.full_name);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-[12px] text-rd-text-secondary hover:text-rd-text">
          <ArrowLeft className="w-3 h-3" />
          Back to compose
        </button>
        <div className="flex items-center gap-2">
          {savingEdit && <span className="text-[11px] text-rd-text-tertiary">Saving…</span>}
          {savedJustNow && !savingEdit && <span className="text-[11px] text-rd-teal-dark">Saved</span>}
        </div>
      </div>

      {/* "Preview" eyebrow + "how it lands in your feed" hint per mockup */}
      <div className="flex items-baseline gap-2">
        <span className="font-display font-bold text-[16px] text-rd-text">Preview</span>
        <span className="text-[11.5px] text-rd-text-tertiary">how it lands in your feed</span>
      </div>

      {/* Feed-card simulacrum — mockup-faithful */}
      <div className="bg-white border border-[#E2DED5] rounded-[12px] max-w-[640px] mx-auto w-full overflow-hidden">
        {/* Head: avatar + identity + dots */}
        <div className="px-4 pt-4 pb-2.5 flex items-start gap-2.5">
          <div className="w-[46px] h-[46px] rounded-full bg-[#F0A98E] flex items-center justify-center flex-shrink-0">
            <span className="font-display text-[19px] font-bold text-white">{previewInitials}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-display text-[13.5px] font-bold text-[#1A1A1A] leading-[1.25]">{previewName}</p>
            <p className="text-[11.5px] text-[#5A5A5A] truncate leading-[1.4]">{previewHeadline}</p>
            <div className="flex items-center gap-1 text-[11px] text-[#6A6A6A] mt-[1px]">
              Now · <Globe className="w-3 h-3" aria-hidden="true" />
            </div>
          </div>
          <MoreHorizontal className="w-[18px] h-[18px] text-[#6A6A6A] flex-shrink-0" aria-hidden="true" />
          <span className={`text-[11px] ${charClass}`}>{charCount}/3000</span>
        </div>

        {/* Body — editable textarea visually styled as feed-card body.
            Hashtags get the LinkedIn-blue color in the read-only preview
            row below (so they show with brand styling without losing
            edit fidelity inside the textarea itself). */}
        <div className="px-4 pb-3">
          <textarea
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            rows={Math.min(20, Math.max(6, editedText.split("\n").length + 1))}
            data-post-body-editor
            className="w-full bg-transparent border-0 p-0 focus:outline-none resize-none whitespace-pre-wrap text-[13.5px] text-[#1A1A1A] leading-[1.6] font-sans"
            aria-label="Post body (editable)"
          />
          {/[#]\w+/.test(editedText) && (
            <div className="mt-2 pt-2 border-t border-dashed border-[#ECEAE4] text-[12px] text-rd-text-secondary leading-relaxed whitespace-pre-wrap">
              <span className="text-[10.5px] uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow font-mono mr-2">Hashtags preview</span>
              {renderPostBody(editedText)}
            </div>
          )}
        </div>

        {imageUrl && (
          <img src={imageUrl} alt="Attached" className="w-full max-h-[380px] object-cover block bg-rd-bg-soft" />
        )}

        {/* Engagement row — 4 disabled buttons */}
        <div className="border-t border-[#ECEAE4] flex items-center justify-around py-2 px-1">
          <FeedEngBtn Icon={ThumbsUp} label="Like" />
          <FeedEngBtn Icon={MessageCircle} label="Comment" />
          <FeedEngBtn Icon={Repeat} label="Repost" />
          <FeedEngBtn Icon={Send} label="Send" />
        </div>
      </div>

      <p className="text-[11px] text-rd-text-tertiary text-center -mt-2">
        Generic feed layout for spatial reference - not affiliated with any social platform.
      </p>

      {/* Action row: image upload + Copy + Refine. Per mockup: footer
          pills with Regenerate / Edit on the left, Copy on the right. */}
      <div className="max-w-[640px] mx-auto w-full flex items-center gap-3 flex-wrap">
        <PostImageUpload
          postId={postId}
          imageUrl={imageUrl}
          onChange={setImageUrl}
        />
        {!refineOpen && (
          <button
            type="button"
            onClick={() => setRefineOpen(true)}
            data-action="refine-open"
            className="inline-flex items-center gap-1.5 font-display font-semibold text-[12.5px] rounded-full px-3 py-[7px] bg-rd-bg-soft text-rd-text-secondary hover:bg-rd-border hover:text-rd-text transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />Regenerate
          </button>
        )}
        <div className="flex-1" />
        <button
          type="button"
          onClick={handleCopy}
          data-action="copy-post"
          className={[
            "inline-flex items-center gap-1.5 font-display font-bold text-[12.5px] rounded-full px-3.5 py-[7px] transition-colors text-white",
            copied ? "bg-rd-teal-dark hover:bg-rd-teal-dark" : "bg-rd-coral hover:bg-rd-coral-dark",
          ].join(" ")}
        >
          {copied ? (
            <><Check className="w-3.5 h-3.5" />Copied</>
          ) : (
            <><Copy className="w-3.5 h-3.5" />Copy to LinkedIn</>
          )}
        </button>
      </div>

      {/* Refine form — opens inline below the action row */}
      {refineOpen && (
        <div className="max-w-[640px] mx-auto w-full bg-rd-bg-soft border border-rd-border rounded-[14px] p-3">
          <textarea
            value={refineInstruction}
            onChange={(e) => setRefineInstruction(e.target.value.slice(0, 600))}
            disabled={refining}
            placeholder="Optional: how to improve the post. e.g. 'make it shorter and punchier', 'lead with the metric not the context', 'less corporate-sounding'. Leave blank to regenerate with a different angle."
            className="w-full text-[13px] border border-rd-border rounded-[10px] px-3 py-2 bg-rd-bg-card text-rd-text placeholder:text-rd-text-tertiary resize-none focus:outline-none focus:border-rd-coral focus:shadow-[0_0_0_3px_var(--rd-coral-tint)] disabled:opacity-60"
            rows={3}
            autoFocus
          />
          <div className="flex items-center justify-between mt-2 gap-3">
            <span className="text-[11px] text-rd-text-tertiary">{refineInstruction.length}/600</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setRefineOpen(false); setRefineError(null); setRefineInstruction(""); }}
                disabled={refining}
                className="text-[12px] px-3 py-1.5 text-rd-text-secondary hover:text-rd-text disabled:opacity-60 rounded-full"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRefine}
                disabled={refining}
                className="inline-flex items-center gap-1.5 font-display font-bold text-[12px] text-white bg-rd-coral hover:bg-rd-coral-dark disabled:opacity-50 disabled:cursor-not-allowed rounded-full px-3 py-1.5 transition-colors"
              >
                {refining ? (
                  <><Loader2 className="w-3 h-3 animate-spin" />Refining…</>
                ) : (
                  <><Sparkles className="w-3 h-3" />Refine</>
                )}
              </button>
            </div>
          </div>
          {refineError && (
            <div className="mt-2 px-3 py-2 rounded-[10px] bg-rd-coral-tint border border-rd-coral/30 text-[11.5px] text-rd-coral-dark flex items-start gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-[1px]" />
              <span>{refineError}</span>
            </div>
          )}
        </div>
      )}

      {/* Hook preview (mobile-truncation) */}
      <p className="text-[11px] text-rd-text-tertiary max-w-[640px] mx-auto -mt-1">
        Hook (mobile-truncation): &quot;{post.hook_preview.slice(0, 80)}{post.hook_preview.length > 80 ? '…' : ''}&quot;
      </p>

      {/* Meta cards — hashtags / format rec / saveable / warnings */}
      <div className="max-w-[640px] mx-auto w-full flex flex-col gap-2.5">
        {post.hashtag_suggestions?.length > 0 && (
          <MetaCard title="Hashtag suggestions">
            <div className="flex flex-wrap gap-1.5">
              {post.hashtag_suggestions.map((h) => (
                <span key={h} className="text-[11px] bg-rd-bg-soft text-rd-text-secondary px-2 py-0.5 rounded-[6px]">
                  {h}
                </span>
              ))}
            </div>
          </MetaCard>
        )}

        <MetaCard
          title="Format recommendation"
          icon={post.format_recommendation === "carousel" ? <Layers className="w-3.5 h-3.5 text-rd-text-secondary" /> : <ImageIcon className="w-3.5 h-3.5 text-rd-text-secondary" />}
        >
          <p className="text-[12.5px] font-display font-bold text-rd-text mb-0.5 capitalize">
            {post.format_recommendation.replace("_", " + ")}
          </p>
          <p className="text-[11.5px] text-rd-text-secondary leading-snug">{post.format_reason}</p>
          {post.format_recommendation === "carousel" && (
            <div className="mt-2 rounded-[10px] px-3 py-2 bg-rd-golden-tint border border-rd-golden/40 text-[11.5px] text-rd-golden-dark leading-snug">
              <strong className="font-display font-bold">Better at 20K+ followers.</strong> For accounts under 5K (most early-career profiles), image + text typically outperforms carousels - the algorithm rewards lower-friction formats that drive quick reactions. Consider switching to image + text unless this carousel really fits the content.
            </div>
          )}
        </MetaCard>

        <MetaCard title="Saveable score">
          <div className="flex items-center gap-2">
            <span className={`font-display text-[16px] font-bold ${
              post.saveable_score >= 8 ? "text-rd-teal-dark"
              : post.saveable_score >= 5 ? "text-rd-text"
              : "text-rd-golden-dark"
            }`}>
              {post.saveable_score}/10
            </span>
            <span className="text-[11.5px] text-rd-text-secondary leading-snug">
              {post.saveable_score >= 8
                ? "Strong saveable structure - readers likely to bookmark."
                : post.saveable_score >= 5
                ? "Decent - could lift with more concrete takeaways or a numbered framework."
                : "Liked, not saved - primarily narrative. That's fine for some post types (e.g. milestones)."}
            </span>
          </div>
        </MetaCard>

        {post.warnings?.length > 0 && (
          <div className="rounded-[14px] px-3 py-2.5 bg-rd-golden-tint border border-rd-golden/40 text-rd-golden-dark">
            {post.warnings.map((w, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-[2px]" />
                <p className="text-[11.5px] leading-snug">{w}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MetaCard({ title, icon, children }) {
  return (
    <div className="bg-white border border-rd-border rounded-[14px] p-3 shadow-rd">
      <div className="flex items-center gap-1.5 mb-1.5">
        {icon}
        <span className="text-[10.5px] uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow font-mono">{title}</span>
      </div>
      {children}
    </div>
  );
}

function FeedEngBtn({ Icon, label }) {
  return (
    <button
      type="button"
      disabled
      aria-label={`${label} (preview only)`}
      className="appearance-none border-0 bg-transparent cursor-not-allowed px-2.5 py-2 rounded-[8px] inline-flex items-center gap-1.5 font-display text-[12px] text-[#5A5A5A] font-semibold hover:bg-rd-bg-soft transition-colors"
    >
      <Icon className="w-[18px] h-[18px]" />
      {label}
    </button>
  );
}
