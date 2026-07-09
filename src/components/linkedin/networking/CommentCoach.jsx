import React, { useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Sparkles, Copy, Check, AlertCircle, MessageCircle, RefreshCw } from "lucide-react";

// PR 3J-C — restyled on rd-* tokens. Restyle-only on behavior: P9
// generate-linkedin-comment invocation + the anti-fabrication
// no_fit_reason branch (options=[] + no_fit_reason → friendly
// "skip this post" banner instead of fabricating comments) preserved
// byte-for-byte.
//
// Eli's PR #34 architecture preserved:
//   - Input: post text + author name + author headline (option 2C)
//   - Output: 3 options, user picks/edits/copies (option 3A)
//   - State: ephemeral, no persistence (option 7A)

const RD_INPUT_CLS = "border-rd-border rounded-[10px] bg-rd-bg-card text-rd-text text-[13.5px] placeholder:text-rd-text-tertiary focus-visible:border-rd-coral focus-visible:ring-0 focus-visible:shadow-[0_0_0_3px_var(--rd-coral-tint)]";

const POST_TEXT_PLACEHOLDER = `Paste the LinkedIn post here. The AI uses the post text + your real experience to generate 3 substantive comment options you can pick from and edit.

Tip: also paste the author's name and headline below - references like "as Sarah pointed out..." land better than generic "great post!" framing.`;

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
      setError("Paste a longer post - the AI needs at least 30 characters to ground the comments in something specific.");
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
    <div className="bg-white border border-rd-border rounded-[18px] p-5 sm:p-6 shadow-rd">
      <div className="flex items-center gap-2 mb-1">
        <MessageCircle className="w-4 h-4 text-rd-coral" />
        <h2 className="font-display font-bold text-[15px] text-rd-text">Comment Coach</h2>
      </div>
      <p className="text-[12.5px] text-rd-text-secondary mb-4 leading-snug">
        Paste a post you want to comment on. The AI generates 3 substantive comment options grounded in your real experience - no &quot;great post!&quot; filler.
      </p>

      <div className="space-y-3">
        <div>
          <label className="block text-[11px] font-display font-semibold text-rd-text mb-1">
            The post text <span className="text-rd-coral">*</span>
          </label>
          <textarea
            value={postText}
            onChange={(e) => setPostText(e.target.value.slice(0, 4000))}
            placeholder={POST_TEXT_PLACEHOLDER}
            rows={6}
            className="w-full text-[13.5px] border border-rd-border rounded-[10px] px-3 py-2 bg-rd-bg-card text-rd-text placeholder:text-rd-text-tertiary focus:outline-none focus:border-rd-coral focus:shadow-[0_0_0_3px_var(--rd-coral-tint)]"
          />
          <p className="text-[10px] text-rd-text-tertiary mt-1 text-right">{postText.length}/4000</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-display font-semibold text-rd-text mb-1">
              Author&apos;s name <span className="text-rd-coral">*</span>
            </label>
            <Input
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="e.g. Sarah Chen"
              className={RD_INPUT_CLS}
            />
          </div>
          <div>
            <label className="block text-[11px] font-display font-semibold text-rd-text mb-1">
              Author&apos;s headline{" "}
              <span className="text-rd-text-tertiary font-normal normal-case tracking-normal">(optional)</span>
            </label>
            <Input
              value={authorHeadline}
              onChange={(e) => setAuthorHeadline(e.target.value)}
              placeholder="e.g. VP Customer Success at Verbit"
              className={RD_INPUT_CLS}
            />
          </div>
        </div>

        {error && (
          <div className="px-3 py-2.5 rounded-[10px] bg-rd-coral-tint border border-rd-coral/30 text-[12.5px] text-rd-coral-dark flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <div className="flex justify-end gap-2 items-center flex-wrap">
          {(postText || authorName || result) && (
            <button
              type="button"
              onClick={handleClear}
              disabled={generating}
              className="text-[12px] px-3 py-1.5 text-rd-text-secondary hover:text-rd-text disabled:opacity-60 rounded-full"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating || !postText.trim() || !authorName.trim()}
            data-action="generate-comments"
            className="inline-flex items-center justify-center gap-1.5 font-display font-bold text-[13px] text-white bg-rd-coral hover:bg-rd-coral-dark disabled:opacity-50 disabled:cursor-not-allowed rounded-full px-4 py-2.5 transition-colors"
          >
            {generating ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Generating…</>
            ) : result ? (
              <><RefreshCw className="w-4 h-4" />Regenerate</>
            ) : (
              <><Sparkles className="w-4 h-4" />Generate 3 options</>
            )}
          </button>
        </div>
      </div>

      {result && <CommentOptions result={result} />}
    </div>
  );
}

function CommentOptions({ result }) {
  // P9 anti-fabrication branch: options[] + no_fit_reason → render the
  // "no genuine relevance" banner instead of fabricated options.
  if (result.options?.length === 0 && result.no_fit_reason) {
    return (
      <div className="mt-4 rounded-[14px] px-4 py-3 bg-rd-golden-tint border border-rd-golden/40 text-rd-golden-dark">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-display font-bold text-[13px] mb-1">No genuine relevance to comment on</p>
            <p className="text-[12px] leading-snug">{result.no_fit_reason}</p>
            <p className="text-[11px] italic mt-2 leading-snug">
              Better to skip a post than fabricate a comment. Look for posts where your real experience genuinely connects - those are the comments that build your reputation.
            </p>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="mt-4 space-y-3">
      <p className="text-[10.5px] uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow font-mono">
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
  const wordClass = wordCount < 15 ? "text-rd-golden-dark" : wordCount > 200 ? "text-rd-golden-dark" : "text-rd-text-tertiary";

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
    <div className="bg-rd-bg-soft border border-rd-border rounded-[14px] p-3">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <p className="text-[10.5px] uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow font-mono">
            Option {index + 1}
          </p>
          {option.angle && (
            <p className="text-[11px] text-rd-text-secondary italic mt-0.5 leading-snug">{option.angle}</p>
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
        className="w-full text-[13px] bg-white border border-rd-border rounded-[10px] px-3 py-2 text-rd-text focus:outline-none focus:border-rd-coral focus:shadow-[0_0_0_3px_var(--rd-coral-tint)] resize-none"
      />
      <div className="flex justify-end mt-2">
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 text-[12px] font-display font-semibold text-rd-text-secondary hover:text-rd-text"
        >
          {copied ? (
            <><Check className="w-3 h-3 text-rd-teal-dark" />Copied</>
          ) : (
            <><Copy className="w-3 h-3" />Copy</>
          )}
        </button>
      </div>
    </div>
  );
}
