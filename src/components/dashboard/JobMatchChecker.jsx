import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { trackFromScores } from "@/lib/scoreApplication";
import { scoreJobFit } from "@/lib/scoreJobFit";
import { totalYearsOfExperience } from "@/lib/experienceLevel";
import { track, EVENTS } from "@/lib/analytics";

import { Sparkles, Loader2, CheckCircle2, XCircle, ChevronDown, ChevronUp, Plus, FileText, Link } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const LOADING_MESSAGES = [
  "Parsing job requirements...",
  "Matching your skills...",
  "Evaluating your experience...",
  "Calculating fit score...",
  "Building your assessment...",
];

export default function JobMatchChecker() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState("text"); // "url" or "text"
  const [url, setUrl] = useState("");
  const [jobText, setJobText] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [addingToTracker, setAddingToTracker] = useState(false);
  const [addedToTracker, setAddedToTracker] = useState(false);
  const msgInterval = useRef(null);

  // Profile context for the deterministic text-mode path (PR-D). Same
  // fields scoreJobFit consumes on the Jobs page so the two surfaces
  // produce the same number for the same JD.
  const { data: profile } = useQuery({
    queryKey: ["userProfile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase.from("profiles").select("skills_canonical, qualification_level, primary_domain, five_year_role").eq("id", user.id).maybeSingle();
      return data || null;
    },
    enabled: !!user?.id,
    staleTime: 30 * 60 * 1000,
  });
  const { data: experiences = [] } = useQuery({
    queryKey: ["experiences", user?.id],
    queryFn: async () => (await supabase.from("experiences").select("type, start_date, end_date, is_current, title, company, responsibilities").eq("user_id", user.id)).data || [],
    enabled: !!user?.id,
    staleTime: 30 * 60 * 1000,
  });
  const { data: educations = [] } = useQuery({
    queryKey: ["education", user?.id],
    queryFn: async () => (await supabase.from("education").select("degree_level").eq("user_id", user.id)).data || [],
    enabled: !!user?.id,
    staleTime: 30 * 60 * 1000,
  });

  useEffect(() => {
    if (loading) {
      let i = 0;
      msgInterval.current = setInterval(() => {
        i = (i + 1) % LOADING_MESSAGES.length;
        setLoadingMsg(LOADING_MESSAGES[i]);
      }, 2500);
    } else {
      clearInterval(msgInterval.current);
    }
    return () => clearInterval(msgInterval.current);
  }, [loading]);

  const handleCheck = async () => {
    const hasInput = mode === "url" ? url.trim() : jobText.trim();
    if (!hasInput) return;

    if (mode === "url") {
      try {
        const parsed = new URL(url.trim());
        if (parsed.protocol !== "https:") {
          setError("Only HTTPS URLs are accepted.");
          return;
        }
      } catch {
        setError("Please enter a valid URL (e.g. https://...).");
        return;
      }
    }

    setLoading(true);
    setLoadingMsg(LOADING_MESSAGES[0]);
    setError("");
    setResult(null);
    setAddedToTracker(false);

    try {
      let data;
      // PR-D: text mode runs the same extract-then-score pipeline the
      // Jobs page uses, so a pasted JD gets the same number it would
      // get if the same JD were already in the jobs cache. URL mode
      // still goes through analyze-job-match for now because the
      // extractor doesn't fetch URLs (analyze-job-match does).
      if (mode === "text") {
        if (!profile) {
          setError("Profile is still loading. Try again in a moment.");
          setLoading(false);
          return;
        }
        const { data: extractResp, error: exErr } = await supabase.functions.invoke("extract-job-requirements", {
          body: { jd_text: jobText.trim() },
        });
        if (exErr) throw exErr;
        if (!extractResp?.extraction) {
          throw new Error(extractResp?.reason === "jd_too_short" ? "Paste a longer job description (200+ chars)." : "Couldn't extract requirements from that text.");
        }
        const ex = extractResp.extraction;
        const syntheticJob = {
          id: "match-checker",
          title: "Pasted JD",
          ...ex,
        };
        const r = scoreJobFit({ profile, experiences, educations }, syntheticJob);
        data = {
          job_title: "Job Match Analysis",
          company: "",
          job_description: jobText.trim(),
          match_score: Math.round(r.fit_score * 100),
          goal_alignment_score: r.goal_alignment_score == null ? null : Math.round(r.goal_alignment_score * 100),
          required_seniority: ex.req_seniority || null,
          req_years_min: typeof ex.req_years_min === "number" ? ex.req_years_min : null,
          user_stage: r.signals.user_stage,
          verdict: r.reasoning.strengths[0] || "Analysis complete.",
          matched_requirements: (r.signals.matched_skills || []).map((s) => ({ requirement: s, reason: "Matches your canonical skills" })),
          missing_requirements: (r.signals.missing_core_skills || []).map((s) => ({ requirement: s, gap: "Not in your profile yet" })),
          recommendation: [...r.reasoning.strengths, ...r.reasoning.gaps].join(" · "),
          source_url: null,
          _deterministic: true,
        };
      } else {
        // URL mode — legacy LLM path. Keep for now; PR-D scope is text.
        const { data: llmData, error: llmErr } = await supabase.functions.invoke("analyze-job-match", {
          body: { job_url: url.trim(), mode },
        });
        if (llmErr) throw llmErr;
        data = {
          job_title: llmData.job_title || "Job Match Analysis",
          company: llmData.company || "",
          job_description: llmData.job_description || "",
          match_score: llmData.match_score || 0,
          goal_alignment_score: llmData.goal_alignment_score ?? null,
          required_seniority: llmData.required_seniority || null,
          req_years_min: typeof llmData.req_years_min === "number" ? llmData.req_years_min : null,
          user_stage: llmData.user_stage || null,
          verdict: llmData.verdict || "Analysis complete.",
          matched_requirements: llmData.matched_requirements || [],
          missing_requirements: llmData.missing_requirements || [],
          recommendation: llmData.recommendation || "",
          source_url: llmData.source_url || url,
          _deterministic: false,
        };
      }

      setResult(data);
      // Bucket the score the same way the score colour bar does (>=70
      // strong, >=45 moderate, otherwise weak) so funnel charts can group
      // without re-bucketing the raw number client-side.
      const score = data.match_score || 0;
      const band = score >= 70 ? "strong" : score >= 45 ? "moderate" : "weak";
      track(EVENTS.JOB_MATCH_CHECKED, { matched_score_band: band });
      setExpanded(true);
    } catch (err) {
      console.error("Job match error:", err);
      setError(err.message || "Failed to analyze job match.");
    }
    setLoading(false);
  };

  const handleAddToTracker = async () => {
    if (!result || !user?.id) return;
    setAddingToTracker(true);
    // All scoring signals were computed synchronously above, so derive the
    // track inline using the same goal-aware helper scoreApplication uses —
    // no async backfill needed and no track shift visible to the user.
    const fit = (result.match_score || 0) / 100;
    const alignment = result.goal_alignment_score == null
      ? null
      : (result.goal_alignment_score || 0) / 100;
    const { error } = await supabase.from("applications").insert({
      user_id: user.id,
      role_title: result.job_title || "Unknown Role",
      company: result.company || "",
      status: "interested",
      track: trackFromScores(fit, alignment, {
        userStage: result.user_stage,
        roleSeniority: result.required_seniority,
        // PR-H.2: years cap. result.req_years_min comes from the
        // extractor (text mode) or the LLM (URL mode).
        userYears: totalYearsOfExperience(experiences),
        reqYearsMin: typeof result.req_years_min === "number" ? result.req_years_min : null,
      }),
      job_description: result.job_description || "",
      qualification_score: fit,
      goal_alignment_score: alignment,
      required_seniority: result.required_seniority,
      notes: result.source_url ? `Source: ${result.source_url}` : "",
      score_source: result._deterministic ? "deterministic" : "llm",
    });
    setAddingToTracker(false);
    if (error) {
      console.error("Failed to add to tracker:", error);
      setError("Failed to add to tracker. Please try again.");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["applications"] });
    setAddedToTracker(true);
  };

  const scoreColor = result
    ? result.match_score >= 70 ? "text-emerald-600" : result.match_score >= 45 ? "text-amber-600" : "text-red-500"
    : "";
  const barColor = result
    ? result.match_score >= 70 ? "bg-emerald-500" : result.match_score >= 45 ? "bg-amber-400" : "bg-red-400"
    : "";

  const canSubmit = mode === "url" ? url.trim() : jobText.trim();

  return (
    <div className="bg-white rounded-xl border border-[#E5E5E5] p-5 mb-5">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="w-4 h-4 text-[#0A0A0A]" />
        <p className="text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium">Job Match Checker</p>
      </div>
      <p className="text-xs text-[#525252] mb-3">See exactly how well you match a job — and what's holding you back.</p>

      {/* Mode toggle */}
      <div className="flex gap-1 mb-3 bg-[#F5F5F5] rounded-lg p-1 w-fit">
        <button
          onClick={() => { setMode("text"); setError(""); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${mode === "text" ? "bg-white text-[#0A0A0A] shadow-sm" : "text-[#525252] hover:text-[#0A0A0A]"}`}
        >
          <FileText className="w-3 h-3" /> Paste Text
        </button>
        <button
          onClick={() => { setMode("url"); setError(""); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${mode === "url" ? "bg-white text-[#0A0A0A] shadow-sm" : "text-[#525252] hover:text-[#0A0A0A]"}`}
        >
          <Link className="w-3 h-3" /> URL
        </button>
      </div>

      {mode === "text" ? (
        <div className="mb-2">
          <textarea
            value={jobText}
            onChange={(e) => setJobText(e.target.value)}
            onKeyDown={(e) => {
              // Enter submits, Shift+Enter inserts a newline. Pasting a
              // multi-line JD doesn't fire Enter, so the common flow (paste +
              // Analyse) works either way.
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleCheck();
              }
            }}
            placeholder="Paste the full job description here... (Enter to analyse, Shift+Enter for newline)"
            className="w-full text-sm border border-[#E5E5E5] rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-[#0A0A0A] min-h-[100px] text-[#0A0A0A] placeholder:text-[#A3A3A3]"
            rows={4}
          />
          <p className="text-[11px] text-[#A3A3A3] mt-1">Tip: Copy the entire job posting from LinkedIn/Glassdoor and paste it here for the most accurate results.</p>
        </div>
      ) : (
        <div className="mb-2">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste job posting URL..."
            className="text-sm"
            onKeyDown={(e) => e.key === "Enter" && handleCheck()}
          />
          <p className="text-[11px] text-amber-600 mt-1">⚠️ URLs may not work if the job board requires login. Use "Paste Text" for best results.</p>
        </div>
      )}

      <Button
        onClick={handleCheck}
        disabled={loading || !canSubmit}
        className="bg-[#0A0A0A] hover:bg-[#262626] w-full"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
        Analyse Match
      </Button>

      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}

      {loading && (
        <div className="mt-3 flex items-center gap-3 py-3 px-3 bg-[#F5F5F5] rounded-lg">
          <Loader2 className="w-4 h-4 animate-spin text-[#525252] flex-shrink-0" />
          <p className="text-xs text-[#525252]">{loadingMsg}</p>
        </div>
      )}

      {result && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex-1 min-w-0 pr-3">
              <p className="text-sm font-semibold text-[#0A0A0A]">{result.job_title}{result.company ? ` · ${result.company}` : ""}</p>
              <p className="text-xs text-[#525252] mt-0.5">{result.verdict}</p>
            </div>
            <span className={`text-2xl font-bold flex-shrink-0 ${scoreColor}`}>{result.match_score}%</span>
          </div>
          <div className="h-2 bg-[#F0F0F0] rounded-full overflow-hidden mb-3">
            <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${result.match_score}%` }} />
          </div>

          {/* Add to Tracker */}
          <div className="mb-3">
            {addedToTracker ? (
              <div>
                <p className="text-xs text-emerald-600 flex items-center gap-1 mb-1"><CheckCircle2 className="w-3.5 h-3.5" /> Added to Application Tracker</p>
                {(!result.company || result.company.toLowerCase().includes("confidential")) && (
                  <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1">⚠️ The company may be listed as "Confidential" — open the Tracker to update it with the real company name.</p>
                )}
              </div>
            ) : (
              <Button
                onClick={handleAddToTracker}
                disabled={addingToTracker}
                size="sm"
                className="bg-[#0A0A0A] hover:bg-[#262626] text-white text-xs h-8 px-3"
              >
                {addingToTracker ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Plus className="w-3 h-3 mr-1" />}
                Add to Tracker
              </Button>
            )}
          </div>

          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-[#525252] hover:text-[#0A0A0A] font-medium mb-3"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {expanded ? "Hide breakdown" : "Show full breakdown"}
          </button>

          {expanded && (
            <div className="space-y-4">
              {result.matched_requirements?.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-emerald-600 font-semibold mb-2">What you bring ✓</p>
                  <div className="space-y-1.5">
                    {result.matched_requirements.map((m, i) => (
                      <div key={i} className="flex gap-2 text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <span><span className="font-medium text-[#0A0A0A]">{m.requirement}</span> — <span className="text-[#525252]">{m.reason}</span></span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {result.missing_requirements?.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-red-500 font-semibold mb-2">What's missing ✗</p>
                  <div className="space-y-1.5">
                    {result.missing_requirements.map((m, i) => (
                      <div key={i} className="flex gap-2 text-xs">
                        <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                        <span><span className="font-medium text-[#0A0A0A]">{m.requirement}</span> — <span className="text-[#525252]">{m.gap}</span></span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {result.recommendation && (
                <div className="bg-[#F5F5F5] rounded-lg p-3">
                  <p className="text-[10px] uppercase tracking-wider text-[#A3A3A3] font-semibold mb-1">Recommendation</p>
                  <p className="text-xs text-[#525252] leading-relaxed">{result.recommendation}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}