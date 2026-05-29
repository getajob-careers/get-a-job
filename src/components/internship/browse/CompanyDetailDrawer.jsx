import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ExternalLink,
  MessageSquare,
  Plus,
  Check,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { createPageUrl } from "@/utils";
import { ORIGIN_FILTERS } from "./filterConfig";
import { combinedScore, scoreTier } from "./scoreHelpers";

// Browse-side detail drawer (PR4). Click a card on /Internship → this
// opens. Sections, top-to-bottom:
//   1. Header (name · sector · stage · location · external link)
//   2. Combined match score (simple average of fit + career_compound)
//      — known deferral: card chip shows rule_score, drawer shows LLM
//      combined; reconcile when the rule_score "scores don't
//      differentiate" bug gets fixed.
//   3. Pitch section (Role · Your angle · Who to contact · gaps chips)
//      with skeleton while the edge function generates.
//   4. Outreach Coach button (prefilled with company + pitched_role).
//   5. Add-to-pipeline button (INSERT company_targets, toast on
//      success, button flips to "Already in your pipeline").
//
// NEW companies (not yet in user's pipeline): NO status/notes/timeline.
// Those are kanban concerns and live in CompanyTargetDrawer.

const ORIGIN_LABEL_BY_ID = new Map(ORIGIN_FILTERS.map((o) => [o.id, o.label]));

function formatLocation(city, country) {
  if (city && country) return `${city}, ${country}`;
  return city || country || null;
}

// combinedScore + scoreTier moved to ./scoreHelpers — see import above.
// Tests live in scoreHelpers.test.js so they don't transitively
// import this file (and thus supabaseClient).

export default function CompanyDetailDrawer({ company, open, onClose }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [adding, setAdding] = useState(false);

  // Is this company already in the user's pipeline? Used to flip the
  // Add-to-pipeline button (P7).
  const { data: existingTarget } = useQuery({
    queryKey: ["company_target_for_company", user?.id, company?.id],
    queryFn: async () => {
      if (!user?.id || !company?.id) return null;
      const { data } = await supabase
        .from("company_targets")
        .select("id")
        .eq("user_id", user.id)
        .eq("company_id", company.id)
        .maybeSingle();
      return data;
    },
    enabled: open && !!user?.id && !!company?.id,
  });
  const alreadyInPipeline = !!existingTarget;

  // Pitch — on-demand, cached. Skipped until drawer opens.
  const pitchQuery = useQuery({
    queryKey: ["internship_pitch", user?.id, company?.id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        "generate-internship-pitch",
        { body: { company_id: company.id } },
      );
      if (error) {
        const status = error?.context?.status;
        if (status === 400) {
          const message = error?.context?.error || "Pitch profile missing.";
          throw new Error(message);
        }
        if (status === 429) throw new Error("Rate limit reached — try again in a few minutes.");
        throw new Error("Couldn't generate the pitch. Please try again.");
      }
      return data?.pitch ?? null;
    },
    enabled: open && !!user?.id && !!company?.id,
    staleTime: 30 * 60 * 1000,
    retry: false,
  });

  // Reset transient UI state when the drawer swaps companies.
  useEffect(() => {
    setRefreshing(false);
    setAdding(false);
  }, [company?.id]);

  if (!company) return null;

  const originLabel = ORIGIN_LABEL_BY_ID.get(company.origin);
  const location = formatLocation(company.hq_city, company.hq_country);
  const sectorOrIndustry = company.sector || company.industry;
  const pitch = pitchQuery.data;
  const score = combinedScore(pitch);
  const tier = scoreTier(score);

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "generate-internship-pitch",
        { body: { company_id: company.id, force: true } },
      );
      if (error) {
        toast.error("Couldn't refresh the angle. Please try again.");
        return;
      }
      queryClient.setQueryData(
        ["internship_pitch", user?.id, company.id],
        data?.pitch ?? null,
      );
      toast.success("Angle refreshed.");
    } finally {
      setRefreshing(false);
    }
  };

  const handleAddToPipeline = async () => {
    if (adding || alreadyInPipeline) return;
    setAdding(true);
    try {
      const { error } = await supabase.from("company_targets").insert({
        user_id: user.id,
        company_id: company.id,
        source: "self_added",
        status: "exploring",
        ...(pitch?.pitched_role ? { pitched_role: pitch.pitched_role } : {}),
        ...(pitch?.pitch_rationale ? { pitch_rationale: pitch.pitch_rationale } : {}),
        ...(Array.isArray(pitch?.skill_gaps_this_fills) && pitch.skill_gaps_this_fills.length > 0
          ? { skill_gaps_this_fills: pitch.skill_gaps_this_fills }
          : {}),
      });
      if (error) {
        if (error.code === "23505") {
          toast.message("Already in your pipeline.");
          queryClient.invalidateQueries({ queryKey: ["company_target_for_company", user?.id, company.id] });
          return;
        }
        toast.error("Couldn't add to your pipeline. Please try again.");
        return;
      }
      toast.success("Added to your pipeline.");
      queryClient.invalidateQueries({ queryKey: ["company_targets", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["company_target_for_company", user?.id, company.id] });
    } finally {
      setAdding(false);
    }
  };

  const outreachUrl =
    createPageUrl("LinkedinOptimizer") +
    `?tab=networking${
      company.name ? `&prefillCompany=${encodeURIComponent(company.name)}` : ""
    }${
      pitch?.pitched_role ? `&prefillRole=${encodeURIComponent(pitch.pitched_role)}` : ""
    }`;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <div className="space-y-6 pt-2">
          {/* Header */}
          <div>
            {originLabel && (
              <p className="text-[10px] uppercase tracking-wider text-[#9C9DA1] font-medium mb-1">
                {originLabel}
              </p>
            )}
            <h2 className="text-lg font-semibold text-[#0E1014] mb-1">{company.name}</h2>
            <p className="text-sm text-[#52545A]">
              {[sectorOrIndustry, company.stage, company.employee_count_range, location]
                .filter(Boolean)
                .join(" · ")}
            </p>
            {company.domain && (
              <a
                href={`https://${company.domain.replace(/^https?:\/\//, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-[#2B5DC4] hover:underline mt-1.5"
              >
                {company.domain}
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {company.description && (
              <p className="text-sm text-[#52545A] leading-relaxed mt-3">{company.description}</p>
            )}
          </div>

          {/* Combined match score */}
          <Section title="Match">
            <ScoreTile score={score} tier={tier} loading={pitchQuery.isLoading} />
            {pitch?.fit_rationale && (
              <p className="text-xs text-[#52545A] leading-relaxed mt-2">{pitch.fit_rationale}</p>
            )}
          </Section>

          {/* Pitch */}
          <Section
            title="Your pitch"
            action={
              pitch ? (
                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="text-[#9C9DA1] hover:text-[#52545A] disabled:opacity-50"
                  aria-label="Refresh angle"
                  title="Refresh angle"
                >
                  {refreshing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                </button>
              ) : null
            }
          >
            {pitchQuery.isLoading ? (
              <PitchSkeleton />
            ) : pitchQuery.error ? (
              <p className="text-xs text-[#C84F40]">{pitchQuery.error.message}</p>
            ) : !pitch ? (
              <p className="text-xs text-[#9C9DA1]">No pitch available.</p>
            ) : (
              <>
                <SubSection label="Role to pitch">
                  <p className="text-sm font-medium text-[#0E1014]">{pitch.pitched_role}</p>
                </SubSection>
                {pitch.pitch_rationale && (
                  <SubSection label="Your angle">
                    <p className="text-xs text-[#52545A] leading-relaxed">{pitch.pitch_rationale}</p>
                  </SubSection>
                )}
                {Array.isArray(pitch.who_to_contact) && pitch.who_to_contact.length > 0 && (
                  <SubSection label="Who to contact">
                    <p className="text-xs text-[#52545A] leading-relaxed">
                      {pitch.who_to_contact.join(" · ")}
                    </p>
                  </SubSection>
                )}
                {Array.isArray(pitch.skill_gaps_this_fills) && pitch.skill_gaps_this_fills.length > 0 && (
                  <SubSection label="Closes these gaps">
                    <div className="flex flex-wrap gap-1.5">
                      {pitch.skill_gaps_this_fills.map((g, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center px-2 py-0.5 text-xs text-[#52545A] bg-[#F4F4F2] border border-[#DDDDDB] rounded"
                        >
                          {g}
                        </span>
                      ))}
                    </div>
                  </SubSection>
                )}
              </>
            )}
          </Section>

          {/* Actions */}
          <div className="pt-2 border-t border-[#DDDDDB] space-y-2">
            <button
              type="button"
              onClick={handleAddToPipeline}
              disabled={adding || alreadyInPipeline}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md transition-colors disabled:cursor-not-allowed"
              style={{
                background: alreadyInPipeline ? "#F4F4F2" : "#F87060",
                color: alreadyInPipeline ? "#52545A" : "white",
                border: alreadyInPipeline ? "1px solid #DDDDDB" : "none",
              }}
            >
              {adding ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : alreadyInPipeline ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              {alreadyInPipeline ? "Already in your pipeline" : "Add to my pipeline"}
            </button>
            <Link
              to={outreachUrl}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-[#0E1014] bg-white border border-[#DDDDDB] rounded-md hover:bg-[#F4F4F2] transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Draft outreach message
            </Link>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Section({ title, action, children }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] uppercase tracking-wider text-[#9C9DA1] font-medium">{title}</p>
        {action}
      </div>
      {children}
    </div>
  );
}

function SubSection({ label, children }) {
  return (
    <div className="mb-3 last:mb-0">
      <p className="text-[10px] uppercase tracking-wider text-[#9C9DA1] font-medium mb-1">{label}</p>
      {children}
    </div>
  );
}

function ScoreTile({ score, tier, loading }) {
  if (loading) {
    return (
      <div className="bg-[#F4F4F2] rounded-md p-3 border border-[#DDDDDB]">
        <Skeleton className="h-7 w-12" />
      </div>
    );
  }
  const tierLabel =
    tier === "strong" ? "Strong fit" :
    tier === "soft"   ? "Real fit" :
    tier === "weak"   ? "Stretch fit" :
    "—";
  const valueColor =
    tier === "strong" ? "#F87060" :
    tier === "soft"   ? "#0E1014" :
    "#9C9DA1";
  return (
    <div className="bg-[#F4F4F2] rounded-md p-3 border border-[#DDDDDB]">
      <p className="text-[10px] uppercase tracking-wider text-[#9C9DA1] font-medium mb-1">Combined</p>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold" style={{ color: valueColor }}>
          {score ?? "—"}
        </span>
        <span className="text-[11px] font-medium text-[#52545A]">{tierLabel}</span>
      </div>
    </div>
  );
}

function PitchSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-3">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-5/6" />
      <Skeleton className="h-3 w-1/4" />
    </div>
  );
}
