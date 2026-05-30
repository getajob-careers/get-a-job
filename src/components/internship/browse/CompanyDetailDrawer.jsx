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
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { createPageUrl } from "@/utils";
import { ORIGIN_FILTERS } from "./filterConfig";
import { bandForLlmScore, BAND_LABELS } from "./scoreHelpers";
import PitchSection from "../PitchSection";

// Browse-side detail drawer. Sections:
//   1. Header (name · sector · stage · location · external link)
//   2. Combined match band (PR5: band label only, no number)
//   3. PitchSection (shared with kanban drawer): Role / Your angle /
//      Who to contact / Closes these gaps
//   4. Add-to-pipeline button
//   5. Draft outreach button (route Linkedin per PR #80 rename)

const ORIGIN_LABEL_BY_ID = new Map(ORIGIN_FILTERS.map((o) => [o.id, o.label]));

function formatLocation(city, country) {
  if (city && country) return `${city}, ${country}`;
  return city || country || null;
}

export default function CompanyDetailDrawer({ company, open, onClose }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [adding, setAdding] = useState(false);

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

  useEffect(() => {
    setRefreshing(false);
    setAdding(false);
  }, [company?.id]);

  if (!company) return null;

  const originLabel = ORIGIN_LABEL_BY_ID.get(company.origin);
  const location = formatLocation(company.hq_city, company.hq_country);
  const sectorOrIndustry = company.sector || company.industry;
  const pitch = pitchQuery.data;
  const score = pitch?.match_score ?? null;
  const band = bandForLlmScore(score);

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
        ...(Array.isArray(pitch?.who_to_contact) && pitch.who_to_contact.length > 0
          ? { who_to_contact: pitch.who_to_contact }
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

  // PR13: deep-link to the Outreach Coach's propose_internship goal,
  // picker skipped. Function = pitched_role minus " internship"
  // suffix; contact = the function leader from the pitch.
  const pitchedFunction = (pitch?.pitched_role || "").replace(/\s+internship\s*$/i, "").trim();
  const pitchContact = Array.isArray(pitch?.who_to_contact) ? pitch.who_to_contact[0] : null;
  const outreachUrl =
    createPageUrl("Linkedin") +
    `?tab=networking&goal=propose_internship${
      company.name ? `&prefillCompany=${encodeURIComponent(company.name)}` : ""
    }${
      pitchedFunction ? `&prefillFunction=${encodeURIComponent(pitchedFunction)}` : ""
    }${
      pitchContact ? `&prefillContact=${encodeURIComponent(pitchContact)}` : ""
    }`;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <div className="space-y-6 pt-2">
          <div>
            {originLabel && (
              <p className="text-[10px] uppercase tracking-wider text-[#9C9DA1] font-medium mb-1">
                {originLabel}
              </p>
            )}
            <SheetTitle asChild>
              <h2 className="text-lg font-semibold text-[#0E1014] mb-1">{company.name}</h2>
            </SheetTitle>
            <SheetDescription asChild>
              <p className="text-sm text-[#52545A]">
                {[sectorOrIndustry, company.stage, company.employee_count_range, location]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </SheetDescription>
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

          <Section title="Match">
            <BandTile band={band} loading={pitchQuery.isLoading} />
            {pitch?.match_rationale && (
              <p className="text-xs text-[#52545A] leading-relaxed mt-2">{pitch.match_rationale}</p>
            )}
          </Section>

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
            <PitchSection
              pitch={pitch}
              loading={pitchQuery.isLoading}
              error={pitchQuery.error}
            />
          </Section>

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

// Band tile — High / Med / Low only, no number. Coral for High, slate
// for Med, faded for Low; dashed-border placeholder while loading or
// when the pitch hasn't generated yet.
function BandTile({ band, loading }) {
  if (loading) {
    return (
      <div className="bg-[#F4F4F2] rounded-md p-3 border border-[#DDDDDB]">
        <Skeleton className="h-7 w-24" />
      </div>
    );
  }
  const label = BAND_LABELS[band];
  const color =
    band === "high" ? "#F87060" :
    band === "med"  ? "#0E1014" :
                      "#9C9DA1";
  return (
    <div className="bg-[#F4F4F2] rounded-md p-3 border border-[#DDDDDB]">
      <p className="text-[10px] uppercase tracking-wider text-[#9C9DA1] font-medium mb-1">Match</p>
      <span className="text-2xl font-semibold" style={{ color }}>{label}</span>
    </div>
  );
}
