import React, { useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Sparkles, Copy, Check, AlertCircle, MessageCircle, RefreshCw } from "lucide-react";

// CommentCoach — paste a LinkedIn post → 3 substantive comment options
// grounded in the user's real profile + Story Bank.
//
// Per Eli's PR #34 architecture:
//   - Input: post text + author name + author headline (option 2C)
//   - Output: 3 options, user picks/edits/copies (option 3A)
//   - State: ephemeral, no persistence (option 7A)
//
// Anti-fab: when user has nothing genuinely relevant, the edge function
// returns options=[] + no_fit_reason. UI surfaces this as a friendly
// "skip this post" message rather than fabricating comments.

const POST_TEXT_PLACEHOLDER = `Paste the LinkedIn post here. The AI uses the post text + your real experience to generate 3 substantive comment options you can pick from and edit.

Tip: also paste the author's name and headline below — references like "as Sarah pointed out..." land better than generic "great post!" framing.`;

export default function CommentCoach() {
  const [postText, setPostText] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [authorHeadline, setAuthorHeadline] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null); // { options[], no_fit_reason? }

  const handleGenerate = async () => {
    if (generating) return;
    setError(null);
    if (postText.trim().length < 30) {
      setError("Paste a longer post — the AI needs at least 30 characters to ground the comments in something specific.");
      return;
    }
    if (!authorName.trim()) {
      setError("Author name is required so the comment can reference them by name.");
      return;
    }
    setGenerating(true);
    setResult(null);
    try {
      const { data, error: invokeErr } = await supabase.functions.invoke("generate-linkedin-comment", {
        body: {
          post_text: postText.trim(),
          author_name: authorName.trim(),
          author_headline: authorHeadline.trim() || undefined,
        },
      });
      if (invokeErr) {
        const status = invokeErr?.context?.status;
        if (status === 429) throw new Error("Rate limit reached (60/hour). Try again in a bit.");
        if (status === 404) throw new Error("Profile incomplete. Complete onboarding first.");
        throw new Error(invokeErr.message || "Generation failed. Please try again.");
      }
      if (!data || (!Array.isArray(data.options) && !data.no_fit_reason)) {
        throw new Error("AI returned an unexpected response.");
      }
      setResult(data);
    } catch (e) {
      setError(e.message || "Couldn't generate comments.");
      toast.error(e.message || "Generation failed.");
    } finally {
      setGenerating(false);
    }
  };

  const handleClear = () => {
    setPostText("");
    setAuthorName("");
    setAuthorHeadline("");
    setResult(null);
    setError(null);
  };

  return (
    <div className="bg-white border border-[#DDDDDB] rounded-xl p-5">
      <div className="flex items-center gap-2 mb-1">
        <MessageCircle className="w-4 h-4 text-[#0E1014]" />
        <h2 className="text-base font-semibold text-[#0E1014]">Comment Coach</h2>
      </div>
      <p className="text-xs text-[#52545A] mb-4 leading-snug">
        Paste a post you want to comment on. The AI generates 3 substantive comment options grounded in your real experience — no "great post!" filler.
      </p>

      <div className="space-y-3">
        <div>
          <label className="text-[11px] uppercase tracking-wider text-[#9C9DA1] font-medium block mb-1">
            The post text <span className="text-red-500">*</span>
          </label>
          <textarea
            value={postText}
            onChange={(e) => setPostText(e.target.value.slice(0, 4000))}
            placeholder={POST_TEXT_PLACEHOLDER}
            rows={6}
            className="w-full text-sm border border-[#DDDDDB] rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
          />
          <p className="text-[10px] text-[#9C9DA1] mt-1 text-right">{postText.length}/4000</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] uppercase tracking-wider text-[#9C9DA1] font-medium block mb-1">
              Author's name <span className="text-red-500">*</span>
            </label>
            <Input
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="e.g. Sarah Chen"
            />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-[#9C9DA1] font-medium block mb-1">
              Author's headline <span className="text-[#9C9DA1] normal-case font-normal">(optional)</span>
            </label>
            <Input
              value={authorHeadline}
              onChange={(e) => setAuthorHeadline(e.target.value)}
              placeholder="e.g. VP Customer Success at Verbit"
            />
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="flex justify-end gap-2">
          {(postText || authorName || result) && (
            <button
              type="button"
              onClick={handleClear}
              disabled={generating}
              className="text-xs px-3 py-1.5 text-[#52545A] hover:text-[#0E1014] disabled:opacity-60"
            >
              Clear
            </button>
          )}
          <Button
            onClick={handleGenerate}
            disabled={generating || !postText.trim() || !authorName.trim()}
            className="bg-[#0E1014] hover:bg-[#F87060] text-sm"
          >
            {generating ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating…</>
            ) : result ? (
              <><RefreshCw className="w-4 h-4 mr-2" />Regenerate</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" />Generate 3 options</>
            )}
          </Button>
        </div>
      </div>

      {result && <CommentOptions result={result} />}
    </div>
  );
}

function CommentOptions({ result }) {
  if (result.options?.length === 0 && result.no_fit_reason) {
    return (
      <div className="mt-4 li-banner li-banner-warning p-4">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-[#B8841C] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-[#6B4E0F] mb-1">No genuine relevance to comment on</p>
            <p className="text-xs text-[#6B4E0F] leading-snug">{result.no_fit_reason}</p>
            <p className="text-[11px] text-[#B8841C] italic mt-2 leading-snug">
              Better to skip a post than fabricate a comment. Look for posts where your real experience genuinely connects — those are the comments that build your reputation.
            </p>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="mt-4 space-y-3">
      <p className="text-[11px] uppercase tracking-wider text-[#9C9DA1] font-medium">
        Pick one, edit if you want, copy + paste into LinkedIn
      </p>
      {result.options.map((opt, i) => (
        <CommentOption key={i} option={opt} index={i} />
      ))}
    </div>
  );
}

function CommentOption({ option, index }) {
  const [text, setText] = useState(option.text);
  const [copied, setCopied] = useState(false);
  const wordCount = text.split(/\s+/).filter((w) => w.length > 0).length;
  const wordClass = wordCount < 15 ? "text-[#B8841C]" : wordCount > 200 ? "text-[#B8841C]" : "text-[#9C9DA1]";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy. Select the text manually.");
    }
  };

  return (
    <div className="bg-[#F4F4F2] border border-[#DDDDDB] rounded-lg p-3">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-wider text-[#9C9DA1] font-medium">
            Option {index + 1}
          </p>
          {option.angle && (
            <p className="text-[11px] text-[#52545A] italic mt-0.5 leading-snug">{option.angle}</p>
          )}
        </div>
        <span className={`text-[11px] flex-shrink-0 ${wordClass}`}>
          {wordCount} {wordCount === 1 ? "word" : "words"}
        </span>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={Math.min(8, Math.max(3, Math.ceil(text.length / 80)))}
        className="w-full text-sm bg-white border border-[#DDDDDB] rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#0A0A0A] resize-none"
      />
      <div className="flex justify-end mt-2">
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
  );
}
