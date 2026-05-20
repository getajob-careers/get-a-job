import React, { useState, useMemo, useEffect, useRef } from "react";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { Loader2, Copy, Check, Linkedin, RefreshCw, AlertCircle, Upload, FileArchive, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// ProfileTab — the original LinkedinOptimizer page content, now hosted as
// the "Profile" tab inside the LinkedIn command center hub (PR #31).
//
// Generates LinkedIn content for 6 sections from the user's profile +
// Story Bank. Single LLM call returns structured JSON; each section
// renders as a card with the generated text + character count vs
// LinkedIn's actual limit + Copy button. User pastes section-by-section
// into LinkedIn manually. Per-section refinement (PR #19) lets the user
// regenerate one section at a time with optional natural-language
// guidance. Archive import (PR #17) lets the user provide their current
// LinkedIn baseline so the LLM can compare-and-improve.
//
// State persists to linkedin_optimizations (PR #17 schema) so generated
// content survives navigation between hub tabs and page reloads.

const LIMITS = {
  headline: 220,
  about: 2600,
  experience_desc: 2000,
  volunteering_desc: 2000,
  military_desc: 2000,
  honor_desc: 200,
};

function CharCount({ value, max }) {
  const len = value?.length || 0;
  const pct = (len / max) * 100;
  const color = pct > 100 ? "text-red-600" : pct > 90 ? "text-[#B8841C]" : "text-[#9C9DA1]";
  return <span className={`text-[11px] ${color}`}>{len} / {max}</span>;
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handle = async () => {
    try {
      await navigator.clipboard.writeText(text || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy. Select the text manually.");
    }
  };
  return (
    <button
      onClick={handle}
      className="text-[11px] font-medium text-[#52545A] hover:text-[#0E1014] inline-flex items-center gap-1"
    >
      {copied ? (
        <><Check className="w-3 h-3 text-emerald-600" /> Copied</>
      ) : (
        <><Copy className="w-3 h-3" /> Copy</>
      )}
    </button>
  );
}

function SectionCard({ title, text, max, footer, children }) {
  return (
    <div className="bg-white rounded-xl border border-[#DDDDDB] p-5 mb-4">
      <div className="flex items-center justify-between mb-2 gap-3">
        <h3 className="text-sm font-semibold text-[#0E1014]">{title}</h3>
        <div className="flex items-center gap-3 flex-shrink-0">
          {max != null && <CharCount value={text} max={max} />}
          {text && <CopyButton text={text} />}
        </div>
      </div>
      {children}
      {footer && <p className="text-[11px] text-[#9C9DA1] mt-2">{footer}</p>}
    </div>
  );
}

function TextBlock({ text, placeholder }) {
  if (!text) return <p className="text-xs text-[#9C9DA1] italic">{placeholder}</p>;
  return <pre className="text-sm text-[#0E1014] whitespace-pre-wrap font-sans leading-relaxed">{text}</pre>;
}

// Compare-card variant: when baseline is present, show Baseline | Generated
// tabs so the user can flip between their CURRENT LinkedIn text and the
// improved version. Char count and Copy button always reflect the visible tab.
// Per-section refinement form. Inline textarea + Refine/Cancel buttons. The
// LLM gets the prior text + user's instruction (or "different angle" if
// empty) and returns just this section. Empty instruction is allowed —
// "regen with a different angle" is a valid use case per the design.
function RefineForm({ onSubmit, onCancel, refining }) {
  const [text, setText] = useState("");
  const taRef = useRef(null);
  useEffect(() => { taRef.current?.focus(); }, []);
  return (
    <div className="mt-3 p-3 bg-[#F9FAFB] border border-[#DDDDDB] rounded-lg">
      <textarea
        ref={taRef}
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, 600))}
        disabled={refining}
        placeholder="Optional: how to improve this section. e.g. 'focus more on product management', 'mention my military leadership', 'make it shorter'. Leave blank to regenerate with a different angle."
        className="w-full text-sm border border-[#DDDDDB] rounded-md px-3 py-2 bg-white resize-none focus:outline-none focus:ring-1 focus:ring-[#0A0A0A] focus:border-[#0E1014] disabled:opacity-60"
        rows={3}
      />
      <div className="flex items-center justify-between mt-2 gap-3">
        <span className="text-[11px] text-[#9C9DA1]">{text.length}/600</span>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            disabled={refining}
            className="text-xs px-3 py-1.5 text-[#52545A] hover:text-[#0E1014] disabled:opacity-60"
          >Cancel</button>
          <Button
            onClick={() => onSubmit(text.trim())}
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
    </div>
  );
}

function CompareCard({ title, baseline, generated, max, footer, sectionKey, onRefine }) {
  const hasBoth = baseline && generated;
  const [tab, setTab] = useState(generated ? "generated" : "baseline");
  const [refineOpen, setRefineOpen] = useState(false);
  const [refining, setRefining] = useState(false);
  const [refineError, setRefineError] = useState(null);
  // If a regen lands while the user has Baseline open, default them back to
  // Generated (they're here to see the improved version, not their old one).
  useEffect(() => { if (generated) setTab("generated"); }, [generated]);
  // Auto-close the refine form when a refinement lands (generated changes).
  useEffect(() => {
    if (refining) {
      setRefineOpen(false);
      setRefining(false);
      setRefineError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generated]);
  const visible = tab === "baseline" ? baseline : generated;

  const canRefine = sectionKey && onRefine && generated;
  const handleSubmit = async (instruction) => {
    setRefining(true);
    setRefineError(null);
    try {
      await onRefine(sectionKey, instruction);
      // Success: parent will update `generated`, and the effect above will
      // close the form. Don't toggle refining=false here — let the effect
      // do it on the next render after generated changes.
    } catch (e) {
      setRefining(false);
      setRefineError(e?.message || "Refinement failed. Please try again.");
    }
  };

  return (
    <div className="bg-white rounded-xl border border-[#DDDDDB] p-5 mb-4">
      <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
        <h3 className="text-sm font-semibold text-[#0E1014]">{title}</h3>
        <div className="flex items-center gap-3 flex-shrink-0">
          {hasBoth && (
            <div className="flex bg-[#E8E8E5] rounded-md p-0.5 text-[11px]">
              <button
                onClick={() => setTab("baseline")}
                className={`px-2 py-0.5 rounded ${tab === "baseline" ? "bg-white text-[#0E1014] shadow-sm font-medium" : "text-[#9C9DA1]"}`}
              >Baseline</button>
              <button
                onClick={() => setTab("generated")}
                className={`px-2 py-0.5 rounded ${tab === "generated" ? "bg-white text-[#0E1014] shadow-sm font-medium" : "text-[#9C9DA1]"}`}
              >Generated</button>
            </div>
          )}
          {max != null && <CharCount value={visible} max={max} />}
          {visible && <CopyButton text={visible} />}
          {canRefine && !refineOpen && (
            <button
              onClick={() => { setRefineOpen(true); setRefineError(null); }}
              className="text-[11px] font-medium text-[#52545A] hover:text-[#0E1014] inline-flex items-center gap-1"
              title="Regenerate just this section with optional guidance"
            >
              <Sparkles className="w-3 h-3" /> Refine
            </button>
          )}
        </div>
      </div>
      <TextBlock
        text={visible}
        placeholder={tab === "baseline" ? "No baseline available for this section." : "No generation yet."}
      />
      {refineOpen && (
        <RefineForm
          onSubmit={handleSubmit}
          onCancel={() => { setRefineOpen(false); setRefineError(null); }}
          refining={refining}
        />
      )}
      {refineError && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-[11px] text-red-800 flex items-start gap-1.5">
          <AlertCircle className="w-3 h-3 text-red-600 flex-shrink-0 mt-0.5" />
          <span>{refineError}</span>
        </div>
      )}
      {footer && <p className="text-[11px] text-[#9C9DA1] mt-2">{footer}</p>}
    </div>
  );
}

function ArchiveUploader({ baseline, onImported }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const handleFile = async (file) => {
    if (!file) return;
    if (!/\.zip$/i.test(file.name)) {
      setError("Please upload a .zip file (your LinkedIn data archive).");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError("File too large. Max 50MB.");
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data, error: invokeErr } = await supabase.functions.invoke("import-linkedin-archive", {
        body: fd,
      });
      if (invokeErr) {
        const status = invokeErr?.context?.status;
        if (status === 429) setError("Rate limit reached. Try again in an hour.");
        else if (status === 413) setError("File too large. Max 50MB.");
        else if (status === 400) setError("Couldn't parse the archive. Make sure it's a LinkedIn data export ZIP.");
        else setError(invokeErr.message || "Import failed. Please try again.");
        return;
      }
      onImported(data);
      toast.success("LinkedIn baseline imported.");
    } catch (e) {
      console.error("Archive import error:", e);
      setError("Couldn't reach the import service. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const counts = baseline?._meta?.counts;
  const importedAt = baseline?._meta?.imported_at;

  return (
    <div className="bg-white rounded-xl border border-[#DDDDDB] p-5 mb-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <FileArchive className="w-4 h-4 text-[#52545A]" />
            <h3 className="text-sm font-semibold text-[#0E1014]">LinkedIn baseline</h3>
            {baseline && (
              <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded">
                Imported
              </span>
            )}
          </div>
          {baseline ? (
            <p className="text-xs text-[#52545A]">
              {counts && (
                <>{counts.positions || 0} positions · {counts.skills || 0} skills · {counts.education || 0} education · {counts.honors || 0} honors · {counts.volunteering || 0} volunteering</>
              )}
              {importedAt && (
                <span className="text-[#9C9DA1]"> · imported {new Date(importedAt).toLocaleDateString()}</span>
              )}
            </p>
          ) : (
            <p className="text-xs text-[#52545A]">
              Optional. Upload your LinkedIn data archive (ZIP) and the AI will compare-and-improve your current profile rather than writing from scratch.
            </p>
          )}
          <p className="text-[11px] text-[#9C9DA1] mt-1.5 inline-flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            Your zip is parsed in-memory and never stored. Connections, messages, and ad data are skipped.
          </p>
        </div>
        <div className="flex-shrink-0">
          <input
            ref={inputRef}
            type="file"
            accept=".zip,application/zip"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <Button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            variant={baseline ? "outline" : "default"}
            className={baseline ? "text-sm" : "bg-[#0E1014] hover:bg-[#F87060] text-white text-sm"}
          >
            {uploading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Parsing…</>
            ) : (
              <><Upload className="w-4 h-4 mr-2" />{baseline ? "Replace baseline" : "Import LinkedIn archive"}</>
            )}
          </Button>
        </div>
      </div>
      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-800">{error}</p>
        </div>
      )}
      {!baseline && (
        <p className="text-[11px] text-[#9C9DA1] mt-3">
          To get your archive: LinkedIn → Settings → Data Privacy → Get a copy of your data → "Want something in particular?" → Profile, Positions, Skills, Education (24h wait).
        </p>
      )}
    </div>
  );
}

export default function ProfileTab() {
  const { user } = useAuth();
  const [content, setContent] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [baseline, setBaseline] = useState(null);
  const [baselineLoading, setBaselineLoading] = useState(true);

  // Hydrate the baseline + last-generated content from linkedin_optimizations
  // so the user lands on a populated page after import or after returning to
  // the tab. Both are best-effort — a failure here just means the user sees
  // the empty/upload state.
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase
          .from("linkedin_optimizations")
          .select("baseline_data, generated_data")
          .eq("user_id", user.id)
          .maybeSingle();
        if (cancelled) return;
        if (data?.baseline_data) setBaseline(data.baseline_data);
        if (data?.generated_data?.headline) setContent(data.generated_data);
      } catch (e) {
        console.error("hydrate linkedin_optimizations:", e);
      } finally {
        if (!cancelled) setBaselineLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  // Helpers to look up the baseline counterpart of a generated section.
  // Match positions/volunteering by company+title since baseline rows have no
  // experience_id (they're parsed from the archive, not our experiences table).
  const baselineByExpId = useMemo(() => {
    const map = new Map();
    if (!baseline || !content?.experience_labels) return map;
    const labelToId = new Map(Object.entries(content.experience_labels).map(([id, label]) => [label.toLowerCase(), id]));
    for (const p of (baseline.positions || [])) {
      const label = `${p.title || ""}${p.company ? ` at ${p.company}` : ""}`.trim().toLowerCase();
      const id = labelToId.get(label);
      if (id) map.set(id, p.description || "");
    }
    for (const v of (baseline.volunteering || [])) {
      const label = `${v.role || ""}${v.organization ? ` at ${v.organization}` : ""}`.trim().toLowerCase();
      const id = labelToId.get(label);
      if (id) map.set(id, v.description || "");
    }
    return map;
  }, [baseline, content?.experience_labels]);

  const handleImported = async (importResp) => {
    // After successful import, re-fetch baseline_data from the row (the
    // import response only sends summary metadata; the parsed baseline lives
    // in linkedin_optimizations.baseline_data).
    setBaselineLoading(true);
    try {
      const { data } = await supabase
        .from("linkedin_optimizations")
        .select("baseline_data")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data?.baseline_data) setBaseline(data.baseline_data);
    } finally {
      setBaselineLoading(false);
    }
  };

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

  // Per-section refinement: invoke generate-linkedin-content with {section,
  // instruction}, the function returns merged_content with just the target
  // section updated. Throws on failure so the CompareCard can show inline
  // error; rate limit / not-found errors get human-readable messages.
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

  const expLabels = content?.experience_labels || {};

  // Compute total chars across all sections for the header summary
  const totalChars = useMemo(() => {
    if (!content) return 0;
    let n = (content.headline?.length || 0) + (content.about?.length || 0);
    for (const e of (content.experiences || [])) n += e.description?.length || 0;
    for (const v of (content.volunteering || [])) n += v.description?.length || 0;
    for (const m of (content.military || [])) n += m.description?.length || 0;
    for (const h of (content.honors || [])) n += h.description?.length || 0;
    return n;
  }, [content]);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Tab-level header — page-level title moved to the hub. We keep
          a brief tab description + the Generate button so the action is
          visible immediately on tab switch. */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <p className="text-sm text-[#52545A] max-w-2xl">
          Generates LinkedIn-formatted content for 6 sections from your profile + Story Bank.
          Each section becomes copy-paste-ready for LinkedIn.
        </p>
        <Button
          onClick={handleGenerate}
          disabled={generating}
          className="bg-[#0E1014] hover:bg-[#F87060] text-sm flex-shrink-0"
        >
          {generating ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating…</>
          ) : content ? (
            <><RefreshCw className="w-4 h-4 mr-2" />Regenerate</>
          ) : (
            <>Generate</>
          )}
        </Button>
      </div>

      {!baselineLoading && (
        <ArchiveUploader baseline={baseline} onImported={handleImported} />
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {!content && !generating && !error && (
        <div className="bg-white rounded-xl border border-[#DDDDDB] p-8 text-center">
          <Linkedin className="w-8 h-8 text-[#9C9DA1] mx-auto mb-3" />
          <p className="text-sm text-[#52545A] mb-1">
            Click <strong>Generate</strong> to create LinkedIn content from your profile + Story Bank
            {baseline ? <>, comparing against your imported LinkedIn baseline</> : null}.
          </p>
          <p className="text-xs text-[#9C9DA1]">
            6 sections: Headline, About, Experience descriptions, Volunteering descriptions, Skills priority,
            and Honors & Awards descriptions.
          </p>
          {!baseline && (
            <p className="text-xs text-[#52545A] mt-4 max-w-md mx-auto bg-[#F4F4F2] border border-[#DDDDDB] rounded-lg p-3 text-left">
              <Sparkles className="inline w-3.5 h-3.5 text-[#F87060] mr-1.5 -mt-0.5" />
              <strong>Tip:</strong> Upload your LinkedIn archive above first to unlock <strong>compare-and-improve mode</strong> — the AI rewrites your actual current profile rather than writing from scratch.
            </p>
          )}
          <p className="text-[11px] text-[#9C9DA1] mt-3 italic">
            Generation takes ~20–30s. Story Bank entries supply real metrics; nothing is fabricated.
          </p>
        </div>
      )}

      {generating && (
        <div className="bg-white rounded-xl border border-[#DDDDDB] p-8 text-center">
          <Loader2 className="w-6 h-6 text-[#52545A] mx-auto mb-3 animate-spin" />
          <p className="text-sm text-[#52545A]">Generating 6 sections — this takes 20-30 seconds.</p>
          <p className="text-[11px] text-[#9C9DA1] mt-2">
            Reading your profile, experiences, and {/* approximate */}stories…
          </p>
        </div>
      )}

      {content && (
        <>
          {baseline ? (
            <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-emerald-50 border border-emerald-100 rounded-lg">
              <Sparkles className="w-3.5 h-3.5 text-emerald-700 flex-shrink-0" />
              <p className="text-xs text-emerald-900">
                <strong>Compare-and-improve mode</strong> — generated using your imported LinkedIn baseline as reference.
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-[#F4F4F2] border border-[#DDDDDB] rounded-lg">
              <Sparkles className="w-3.5 h-3.5 text-[#52545A] flex-shrink-0" />
              <p className="text-xs text-[#52545A]">
                Generated from your profile + Story Bank. <strong>Upload your LinkedIn archive above</strong> to enable compare-and-improve mode.
              </p>
            </div>
          )}
          <p className="text-[11px] text-[#9C9DA1] mb-4">
            Total: ~{totalChars.toLocaleString()} chars across all sections. Copy each section individually
            and paste into LinkedIn's edit fields.
          </p>

          <CompareCard
            title="Headline"
            baseline={baseline?.profile?.headline}
            generated={content.headline}
            max={LIMITS.headline}
            sectionKey="headline"
            onRefine={handleRefine}
          />

          <CompareCard
            title="About"
            baseline={baseline?.profile?.about}
            generated={content.about}
            max={LIMITS.about}
            footer="Paste into LinkedIn's About section. First paragraph shows above the fold; structure accordingly."
            sectionKey="about"
            onRefine={handleRefine}
          />

          {content.experiences?.length > 0 && (
            <div className="mt-6 mb-2">
              <h2 className="text-xs uppercase tracking-wider text-[#9C9DA1] font-medium">
                Experience descriptions ({content.experiences.length})
              </h2>
            </div>
          )}
          {content.experiences?.map((e) => (
            <CompareCard
              key={e.experience_id}
              title={expLabels[e.experience_id] || "Experience"}
              baseline={baselineByExpId.get(e.experience_id)}
              generated={e.description}
              max={LIMITS.experience_desc}
              sectionKey={`experience:${e.experience_id}`}
              onRefine={handleRefine}
            />
          ))}

          {content.volunteering?.length > 0 && (
            <div className="mt-6 mb-2">
              <h2 className="text-xs uppercase tracking-wider text-[#9C9DA1] font-medium">
                Volunteering descriptions ({content.volunteering.length})
              </h2>
            </div>
          )}
          {content.volunteering?.map((v) => (
            <CompareCard
              key={v.experience_id}
              title={expLabels[v.experience_id] || "Volunteering"}
              baseline={baselineByExpId.get(v.experience_id)}
              generated={v.description}
              max={LIMITS.volunteering_desc}
              sectionKey={`volunteering:${v.experience_id}`}
              onRefine={handleRefine}
            />
          ))}

          {content.military?.length > 0 && (
            <div className="mt-6 mb-2">
              <h2 className="text-xs uppercase tracking-wider text-[#9C9DA1] font-medium">
                Military service ({content.military.length})
                <span className="text-[#9C9DA1] normal-case font-normal ml-1">— civilian-readable framing for recruiters</span>
              </h2>
            </div>
          )}
          {content.military?.map((mil) => (
            <CompareCard
              key={mil.experience_id}
              title={expLabels[mil.experience_id] || "Military service"}
              baseline={baselineByExpId.get(mil.experience_id)}
              generated={mil.description}
              max={LIMITS.military_desc}
              sectionKey={`military:${mil.experience_id}`}
              onRefine={handleRefine}
            />
          ))}

          <SectionCard
            title={`Skills priority (${content.skills_priority?.length || 0} skills, top 3 highlighted)`}
            text={(content.skills_priority || []).map((s) => s.skill).join("\n")}
            max={null}
            footer="LinkedIn's first 3 skills get the 'Top skills' highlight. Reorder your LinkedIn skills section to match this priority."
          >
            {!content.skills_priority?.length ? (
              <p className="text-xs text-[#9C9DA1] italic">No skills generated.</p>
            ) : (
              <ol className="space-y-1.5 text-sm">
                {content.skills_priority.map((s, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className={`text-[11px] font-mono w-6 flex-shrink-0 ${i < 3 ? 'text-[#B8841C] font-semibold' : 'text-[#9C9DA1]'}`}>
                      {i + 1}.
                    </span>
                    <div className="min-w-0">
                      <span className={`${i < 3 ? 'font-semibold text-[#0E1014]' : 'text-[#52545A]'}`}>{s.skill}</span>
                      {s.rationale && (
                        <p className="text-[11px] text-[#9C9DA1] leading-snug">{s.rationale}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </SectionCard>

          {content.honors?.length > 0 && (
            <div className="mt-6 mb-2">
              <h2 className="text-xs uppercase tracking-wider text-[#9C9DA1] font-medium">
                Honors & Awards ({content.honors.length})
              </h2>
            </div>
          )}
          {content.honors?.map((h, i) => (
            <SectionCard
              key={i}
              title={h.name}
              text={h.description}
              max={LIMITS.honor_desc}
              footer={!h.description ? "No source-grounded description available — paste the award title alone, or add your own context (the AI won't invent the awarding committee's reasoning)." : null}
            >
              {h.description
                ? <TextBlock text={h.description} placeholder="No description generated." />
                : <p className="text-sm text-[#9C9DA1] italic">(blank — by design)</p>}
            </SectionCard>
          ))}
        </>
      )}
    </div>
  );
}
