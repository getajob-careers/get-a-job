import React, { useEffect, useRef, useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Copy, Check, Loader2, Sparkles, ArrowLeft, AlertCircle, Image as ImageIcon, Layers, ThumbsUp, MessageCircle, Repeat, Send } from "lucide-react";
import PostImageUpload from "./PostImageUpload";

// PostPreview — generic feed-card mockup of the generated post. Renders
// like a modern social-feed item (avatar, name, headline, timestamp, body,
// optional image, engagement row) using Direction 3 tokens only — no
// LinkedIn brand chrome.
//
// Editable: the post body is a textarea that visually doubles as the
// feed-card body. Edits auto-save (debounced 500ms) to
// linkedin_posts.edited_text.
//
// Image: optional upload, persists as image_url on the linkedin_posts row.
// Rendered inside the feed card when present.
//
// Metadata below the card stays — hashtags, format recommendation,
// saveable score, warnings. Refine button retained (PR #19 pattern).

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
// (anything matching the #word pattern), so hashtags can pick up the coral
// accent class inside the feed-card body.
function renderPostBody(text) {
  if (!text) return null;
  const parts = text.split(/(\s+|#\w+)/g);
  return parts.map((part, i) => {
    if (/^#\w+/.test(part)) {
      return <span key={i} className="li-feed-hashtag">{part}</span>;
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

  // Live profile fields for the feed-card identity (name + headline). The
  // headline comes from the latest linkedin_optimizations.generated_data
  // (if generated) — falls back to a friendly default. Loads once per
  // session per user.
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

  // Fetch the persisted image_url for this post (if any). When the post
  // changes (refinement returns a new post_id), refetch.
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

  // Debounced auto-save of edited_text. Only saves when the textarea
  // diverges from the LLM-generated post_text — preserves NULL for
  // unedited posts.
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

  const previewName = identity?.full_name || "Your name";
  const previewHeadline = identity?.headline || "Add a headline in the Profile tab";
  const previewInitials = initialsFor(identity?.full_name);

  return (
    <div className="flex flex-col gap-4">
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

      {/* Feed-card preview — generic social-feed layout (no LinkedIn brand) */}
      <div className="li-feed-card">
        <div className="li-feed-head">
          <div className="li-feed-avatar"><span>{previewInitials}</span></div>
          <div className="li-feed-identity">
            <p className="li-feed-name">{previewName}</p>
            <p className="li-feed-headline">{previewHeadline}</p>
            <p className="li-feed-time">Just now · 🌐</p>
          </div>
          <span className={`text-[11px] ${charClass}`}>{charCount}/3000</span>
        </div>

        {/* Body — textarea visually styled as feed body. Edits auto-save. */}
        <div className="li-feed-body">
          <textarea
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            rows={Math.min(20, Math.max(6, editedText.split("\n").length + 1))}
            className="w-full bg-transparent border-0 p-0 focus:outline-none resize-none whitespace-pre-wrap text-[13.5px] text-[#0E1014] leading-[1.55] font-sans"
            aria-label="Post body (editable)"
          />
          {/* Read-only rendered version with hashtag styling — sits below
              the textarea as a hint. Only shown when text contains a hashtag. */}
          {/[#]\w+/.test(editedText) && (
            <div className="mt-2 pt-2 border-t border-dashed border-[#E8E8E5] text-[12px] text-[#52545A] leading-relaxed whitespace-pre-wrap">
              <span className="li-eyebrow mr-2">Hashtags preview</span>
              {renderPostBody(editedText)}
            </div>
          )}
        </div>

        {imageUrl && (
          <img src={imageUrl} alt="Attached" className="li-feed-image" />
        )}

        <div className="li-feed-engagement">
          <button type="button" className="li-feed-eng-btn" disabled aria-label="Like (preview only)">
            <ThumbsUp className="w-3.5 h-3.5" />Like
          </button>
          <button type="button" className="li-feed-eng-btn" disabled aria-label="Comment (preview only)">
            <MessageCircle className="w-3.5 h-3.5" />Comment
          </button>
          <button type="button" className="li-feed-eng-btn" disabled aria-label="Repost (preview only)">
            <Repeat className="w-3.5 h-3.5" />Repost
          </button>
          <button type="button" className="li-feed-eng-btn" disabled aria-label="Send (preview only)">
            <Send className="w-3.5 h-3.5" />Send
          </button>
        </div>
      </div>

      <p className="text-[11px] text-[#9C9DA1] text-center -mt-2">
        Generic feed layout for spatial reference — not affiliated with any social platform.
      </p>

      {/* Image upload + Copy row */}
      <div className="max-w-[640px] mx-auto w-full flex items-center justify-between gap-3 flex-wrap">
        <PostImageUpload
          postId={postId}
          imageUrl={imageUrl}
          onChange={setImageUrl}
        />
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 text-xs font-medium text-[#52545A] hover:text-[#0E1014]"
        >
          {copied ? (
            <><Check className="w-3 h-3 text-emerald-600" />Copied</>
          ) : (
            <><Copy className="w-3 h-3" />Copy post text</>
          )}
        </button>
      </div>

      {/* Hook preview (mobile-truncation) */}
      <p className="text-[11px] text-[#9C9DA1] max-w-[640px] mx-auto -mt-2">
        Hook (mobile-truncation): &quot;{post.hook_preview.slice(0, 80)}{post.hook_preview.length > 80 ? '…' : ''}&quot;
      </p>

      {/* Inline metadata — stacked below the feed card */}
      <div className="max-w-[640px] mx-auto w-full flex flex-col gap-2.5">
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

        <MetaCard
          title="Format recommendation"
          icon={post.format_recommendation === "carousel" ? <Layers className="w-3.5 h-3.5" /> : <ImageIcon className="w-3.5 h-3.5" />}
        >
          <p className="text-xs text-[#0E1014] font-medium mb-0.5 capitalize">
            {post.format_recommendation.replace("_", " + ")}
          </p>
          <p className="text-[11px] text-[#52545A] leading-snug">{post.format_reason}</p>
          {post.format_recommendation === "carousel" && (
            <div className="mt-2 px-2 py-1.5 li-banner li-banner-warning text-[11px] leading-snug">
              <strong>Better at 20K+ followers.</strong> For accounts under 5K (most early-career profiles), image + text typically outperforms carousels — the algorithm rewards lower-friction formats that drive quick reactions. Consider switching to image + text unless this carousel really fits the content.
            </div>
          )}
        </MetaCard>

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

      {/* Refine action */}
      <div className="max-w-[640px] mx-auto w-full">
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
          <div className="bg-[#F4F4F2] border border-[#DDDDDB] rounded-lg p-3">
            <textarea
              value={refineInstruction}
              onChange={(e) => setRefineInstruction(e.target.value.slice(0, 600))}
              disabled={refining}
              placeholder="Optional: how to improve the post. e.g. 'make it shorter and punchier', 'lead with the metric not the context', 'less corporate-sounding'. Leave blank to regenerate with a different angle."
              className="w-full text-sm border border-[#DDDDDB] rounded-md px-3 py-2 bg-white resize-none focus:outline-none focus:ring-1 focus:ring-[#0E1014] disabled:opacity-60"
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
