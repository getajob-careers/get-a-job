import React, { useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";

import PracticumHeader from "@/components/practicum/PracticumHeader";
import InternshipProfileStrip from "@/components/practicum/InternshipProfileStrip";
import FindCompaniesCard from "@/components/practicum/FindCompaniesCard";
import CompanyTargetsKanban from "@/components/practicum/CompanyTargetsKanban";
import CompanyTargetDrawer from "@/components/practicum/CompanyTargetDrawer";
import AddOwnCompanyModal from "@/components/practicum/AddOwnCompanyModal";
import { NoInternshipProfile, PracticumStartHere } from "@/components/practicum/EmptyStates";
import { ACT_CSS } from "../components/activity/activityStyles";

// Practicum — Internship pipeline page (unified).
//
// Single page for both practicum paths. The kanban shows every target the
// user owns regardless of source — matched, faculty_assigned, or self_added —
// and each card shows its origin via the source badge.
//
// Self-sourced features (internship profile strip + AI matcher) only render
// when practicum_path === 'self_sourced'. The "Add my own company" button
// is available to everyone with a practicum_path set.

export default function Practicum() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [openTarget, setOpenTarget] = useState(null);
  const [generatingProfile, setGeneratingProfile] = useState(false);
  const [addCompanyOpen, setAddCompanyOpen] = useState(false);

  const { data: profileRow, isLoading: profileLoading } = useQuery({
    queryKey: ["profile_practicum", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("practicum_path, practicum_cohort, practicum_status")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: internshipProfile, isLoading: internshipProfileLoading } = useQuery({
    queryKey: ["internship_profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("internship_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && profileRow?.practicum_path === "self_sourced",
  });

  const { data: latestCareerRolesUpdatedAt } = useQuery({
    queryKey: ["career_roles_max_updated_at", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("career_roles")
        .select("updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data?.updated_at || null;
    },
    enabled: !!user?.id && profileRow?.practicum_path === "self_sourced",
  });

  const handleGenerateProfile = async () => {
    if (generatingProfile) return;
    setGeneratingProfile(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-internship-profile", { body: {} });
      if (error) {
        const status = error?.context?.status;
        if (status === 429) toast.error("Rate limit reached — try again in an hour.");
        else if (status === 400) toast.error(error?.context?.error || "Complete your profile first.");
        else toast.error("Couldn't generate the pitch strategy. Please try again.");
        return;
      }
      if (!data?.internship_profile) {
        toast.error("No profile came back.");
        return;
      }
      toast.success("Pitch strategy generated.");
      queryClient.invalidateQueries({ queryKey: ["internship_profile", user?.id] });
    } catch {
      toast.error("Couldn't generate the pitch strategy. Please try again.");
    } finally {
      setGeneratingProfile(false);
    }
  };

  const { data: targets = [], isLoading: targetsLoading } = useQuery({
    queryKey: ["company_targets", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("company_targets")
        .select(`
          id, status, source, fit_score, career_compound_score,
          fit_rationale, pitched_role, pitch_rationale, skill_gaps_this_fills,
          notes, created_at, updated_at,
          companies (
            id, name, domain, description, industry, sector, stage,
            hq_country, hq_city, employee_count_range
          )
        `)
        .eq("user_id", user.id)
        .order("fit_score", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && !!profileRow?.practicum_path,
  });

  if (profileLoading) {
    return (
      <>
        <style>{ACT_CSS}</style>
        <div className="act min-h-screen flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-[#52545A]" />
        </div>
      </>
    );
  }

  const practicumPath = profileRow?.practicum_path;

  if (!practicumPath) {
    return <Navigate to={createPageUrl("Home")} replace />;
  }

  const showStartHere = targets.length === 0 && !targetsLoading;

  return (
    <>
      <style>{ACT_CSS}</style>
      <div className="act">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-10">
          <PracticumHeader
            practicumPath={practicumPath}
            practicumStatus={profileRow?.practicum_status}
            practicumCohort={profileRow?.practicum_cohort}
          />

          {practicumPath === "self_sourced" && (
            !internshipProfileLoading && !internshipProfile ? (
              <NoInternshipProfile
                generateDisabled={generatingProfile}
                onGenerate={handleGenerateProfile}
              />
            ) : (
              <>
                <InternshipProfileStrip
                  profile={internshipProfile}
                  onRefresh={handleGenerateProfile}
                  refreshDisabled={generatingProfile}
                  refreshLoading={generatingProfile}
                  latestCareerRolesUpdatedAt={latestCareerRolesUpdatedAt}
                />
                <FindCompaniesCard
                  disabled={!internshipProfile}
                  disabledReason={!internshipProfile ? "Generate your internship profile first." : undefined}
                />
              </>
            )
          )}

          {/* Start-here explainer — shown only when the kanban is empty.
              Hides once the user has any target so it doesn't get in the
              way of normal pipeline browsing. */}
          {showStartHere && <PracticumStartHere practicumPath={practicumPath} />}

          {/* Pipeline header — Add button is available on every path so
              faculty-assigned students can also self-source. */}
          <div className="flex items-center justify-between mt-7 mb-3">
            <p className="act-eyebrow">Your pipeline</p>
            <button
              type="button"
              onClick={() => setAddCompanyOpen(true)}
              className="act-btn act-btn-outline act-btn-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Add my own company
            </button>
          </div>

          <KanbanOrEmpty
            targets={targets}
            loading={targetsLoading}
            onCardClick={setOpenTarget}
            practicumPath={practicumPath}
          />

          <CompanyTargetDrawer
            target={openTarget}
            open={!!openTarget}
            onClose={() => setOpenTarget(null)}
          />
          <AddOwnCompanyModal
            open={addCompanyOpen}
            onClose={() => setAddCompanyOpen(false)}
          />
        </div>
      </div>
    </>
  );
}

function KanbanOrEmpty({ targets, loading, onCardClick, practicumPath }) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[#9C9DA1] text-sm py-8">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading…
      </div>
    );
  }
  if (targets.length === 0) {
    // The PracticumStartHere card above already explains the flow. This
    // smaller note just signals the kanban itself isn't broken.
    const note = practicumPath === "self_sourced"
      ? "Add companies above or generate matches to populate your pipeline."
      : "Add a company your faculty assigned or one you've found yourself.";
    return (
      <div className="act-card text-center">
        <p className="text-sm text-[#52545A]">{note}</p>
      </div>
    );
  }
  return <CompanyTargetsKanban targets={targets} onCardClick={onCardClick} />;
}
