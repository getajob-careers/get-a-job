import React, { useState, useEffect } from "react";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useProfileQuery } from "@/lib/queries/useProfile";
import {
  Loader2, Linkedin, RefreshCw, AlertCircle, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import ProfilePreview, { buildOptimizedProfileBlob } from "./ProfilePreview";

// PR 3J-A — ProfileTab restyled on rd-* tokens. The page-level editor
// surface is now the ProfilePreview component (Q1 hybrid pane): a single
// profile-card preview with per-section refinement reachable inline. The
// previous list-of-CompareCards editor is removed. (The LinkedIn-archive
// import mechanism and its Current/Optimized comparison were retired.)
//
// Write paths preserved byte-for-byte:
// - P1 handleGenerate — `generate-linkedin-content` with empty body →
//   merged_data into local `content` state. No DB write from frontend.
// - P2 handleRefine   — `generate-linkedin-content` with
//   { section: sectionKey, instruction: <=600 chars } → merged_content
//   into local state. Throws on failure so ProfilePreview can show the
//   inline error banner.
// - RLS via policy (P15) — implicit `(SELECT auth.uid()) = user_id` on
//   every read.
//
// Q3 — `Copy optimized profile` runs the client-only `buildOptimizedProfileBlob`
// helper exported from ProfilePreview. No edge-fn / schema change.

const RD_BTN_PRIMARY = "inline-flex items-center justify-center gap-1.5 font-display font-bold text-[13px] text-white bg-rd-primary hover:bg-rd-primary-dark disabled:opacity-50 disabled:cursor-not-allowed rounded-full px-4 py-2.5 transition-colors";
const RD_BTN_OUTLINE = "inline-flex items-center justify-center gap-1.5 font-display font-semibold text-[13px] text-rd-text bg-rd-bg-card border border-rd-border hover:border-rd-border-hover rounded-full px-3.5 py-2 transition-colors";

export default function ProfileTab() {
  const { user } = useAuth();
  const [content, setContent] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  // Profile name + location for the simulacrum identity row.
  const { data: profileFullName } = useProfileQuery(
    user?.id,
    (p) => p?.full_name || null,
  );
  const { data: profileLocation } = useProfileQuery(
    user?.id,
    (p) => p?.location || null,
  );

  // Hydrate last-generated content from linkedin_optimizations.
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase
          .from("linkedin_optimizations")
          .select("generated_data")
          .eq("user_id", user.id)
          .maybeSingle();
        if (cancelled) return;
        if (data?.generated_data?.headline) setContent(data.generated_data);
      } catch (e) {
        console.error("hydrate linkedin_optimizations:", e);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const handleGenerate = async () => {
    if (generating || !user?.id) return;
    setError(null);
    setGenerating(true);
    try {
      const { data, error: invokeErr } = await supabase.functions.invoke("generate-linkedin-content", {
        body: {},
      });
      if (invokeErr) {
        const status = invokeErr?.context?.status;
        if (status === 429) {
          setError("Rate limit reached (30 generations/hour). Try again in a bit.");
        } else if (status === 404) {
          setError("No profile found. Complete onboarding first.");
        } else {
          setError(invokeErr.message || "Generation failed. Please try again.");
        }
        return;
      }
      if (!data?.headline) {
        setError("AI returned an unexpected response. Please try again.");
        return;
      }
      setContent(data);
    } catch (err) {
      console.error("LinkedIn generation error:", err);
      setError("Couldn't reach the AI service. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  // P2 byte-equivalent — section keys + ≤600-char instruction unchanged.
  const handleRefine = async (sectionKey, instruction) => {
    if (!user?.id) throw new Error("Not signed in.");
    const { data, error: invokeErr } = await supabase.functions.invoke("generate-linkedin-content", {
      body: { section: sectionKey, instruction: instruction || "" },
    });
    if (invokeErr) {
      const status = invokeErr?.context?.status;
      if (status === 429) throw new Error("Rate limit reached (30/hour). Try again in a bit.");
      if (status === 409) throw new Error("Run a full Generate first before refining individual sections.");
      if (status === 404) throw new Error("Section not found. Try refreshing the page.");
      throw new Error(invokeErr.message || "Refinement failed. Please try again.");
    }
    if (!data?.merged_content) throw new Error("AI returned an unexpected response.");
    setContent(data.merged_content);
    toast.success("Section refined.");
  };

  // Q3 — Copy optimized profile to clipboard. Client-only concat helper.
  const handleCopyAll = async () => {
    if (!content) return false;
    const blob = buildOptimizedProfileBlob(content);
    if (!blob) {
      toast.error("Nothing to copy yet.");
      return false;
    }
    try {
      await navigator.clipboard.writeText(blob);
      toast.success("Copied optimized profile to clipboard.");
      return true;
    } catch {
      toast.error("Couldn't access clipboard. Select the preview manually.");
      return false;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Tab-level intro + Generate / Regenerate */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <p className="text-[12.5px] text-rd-text-secondary max-w-2xl leading-[1.55]">
          Generates LinkedIn-formatted content for 6 sections from your profile + Story Bank.
          Each section becomes copy-paste-ready for LinkedIn.
        </p>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating}
          data-action="generate"
          className={`${RD_BTN_PRIMARY} flex-shrink-0`}
        >
          {generating ? (
            <><Loader2 className="w-4 h-4 animate-spin" />Generating…</>
          ) : content ? (
            <><RefreshCw className="w-4 h-4" />Regenerate</>
          ) : (
            <>Generate</>
          )}
        </button>
      </div>

      {/* Provenance note — generated from the user's own profile + Story Bank. */}
      {content && (
        <div className="mb-4 px-3.5 py-2.5 rounded-[14px] bg-rd-bg-soft border border-rd-border text-[12px] text-rd-text-secondary flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-rd-text-secondary flex-shrink-0" />
          <p>Generated from your profile + Story Bank.</p>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="mb-4 px-4 py-3 rounded-[14px] bg-rd-primary-tint border border-rd-primary/30 text-[13px] text-rd-primary-dark flex items-start gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {/* Empty / generating / preview states */}
      {!content && !generating && !error && (
        <div className="rounded-[18px] border border-rd-border bg-rd-bg-card p-7 sm:p-8 shadow-rd text-center">
          <Linkedin className="w-8 h-8 text-rd-primary mx-auto mb-3" />
          <p className="text-[13.5px] text-rd-text leading-[1.5]">
            Click <strong className="font-display font-bold">Generate</strong> to create LinkedIn content from your profile + Story Bank.
          </p>
          <p className="text-[11.5px] text-rd-text-tertiary mt-2 leading-snug">
            6 sections: Headline, About, Experience descriptions, Volunteering descriptions, Skills priority,
            and Honors &amp; Awards descriptions.
          </p>
          <p className="text-[11px] text-rd-text-tertiary mt-3 italic">
            Generation takes ~20–30s. Story Bank entries supply real metrics; nothing is fabricated.
          </p>
        </div>
      )}

      {generating && (
        <div className="rounded-[18px] border border-rd-border bg-rd-bg-card p-7 sm:p-8 shadow-rd text-center">
          <Loader2 className="w-6 h-6 text-rd-text-secondary mx-auto mb-3 animate-spin" />
          <p className="text-[13.5px] text-rd-text">Generating 6 sections - this takes 20-30 seconds.</p>
          <p className="text-[11px] text-rd-text-tertiary mt-2">
            Reading your profile, experiences, and stories…
          </p>
        </div>
      )}

      {content && (
        <ProfilePreview
          content={content}
          fullName={profileFullName}
          location={profileLocation}
          onRefine={handleRefine}
          onCopyAll={handleCopyAll}
        />
      )}
    </div>
  );
}
