import React, { useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";

import PracticumHeader from "@/components/practicum/PracticumHeader";
import InternshipProfileStrip from "@/components/practicum/InternshipProfileStrip";
import FindCompaniesCard from "@/components/practicum/FindCompaniesCard";
import CompanyTargetsKanban from "@/components/practicum/CompanyTargetsKanban";
import CompanyTargetDrawer from "@/components/practicum/CompanyTargetDrawer";
import {
  NoInternshipProfile,
  FacultyPlacementPending,
} from "@/components/practicum/EmptyStates";

// Practicum — Wk 4 Internship Finder page.
//
// Branches on profiles.practicum_path:
//   - null               → "set your path" empty state
//   - self_sourced       → full finder UX (profile strip + find button + kanban)
//   - faculty_assigned   → kanban only (faculty placements), no finder

export default function Practicum() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [openTarget, setOpenTarget] = useState(null);
  const [generatingProfile, setGeneratingProfile] = useState(false);

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

  // Latest career_roles.updated_at — drives the InternshipProfileStrip
  // staleness banner. Compared against internship_profile.generated_from_career_roles_at;
  // if the career roles updated after the profile was generated, we surface
  // a "refresh" nudge.
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
      // Server returns sorted by fit_score DESC NULLS LAST via the
      // existing idx_company_targets_user_score index when we order
      // explicitly — kanban then groups by status.
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
      <div className="p-6 lg:p-8">
        <Loader2 className="w-5 h-5 text-[#A3A3A3] animate-spin" />
      </div>
    );
  }

  const practicumPath = profileRow?.practicum_path;

  // Users who answered "No" to the practicum question in onboarding shouldn't
  // see this page at all — the nav link is also hidden in Layout.jsx.
  if (!practicumPath) {
    return <Navigate to={createPageUrl("Home")} replace />;
  }

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      <PracticumHeader
        practicumPath={practicumPath}
        practicumStatus={profileRow?.practicum_status}
        practicumCohort={profileRow?.practicum_cohort}
      />

      {practicumPath === "self_sourced" && (
        <>
          {!internshipProfileLoading && !internshipProfile ? (
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
          )}
          <KanbanOrEmpty
            targets={targets}
            loading={targetsLoading}
            onCardClick={setOpenTarget}
            emptyMessage="No companies in your pipeline yet. Click 'Find companies' above to score the pool against your strategy."
          />
        </>
      )}

      {practicumPath === "faculty_assigned" && (
        <>
          {!targetsLoading && targets.length === 0 ? (
            <FacultyPlacementPending />
          ) : (
            <KanbanOrEmpty
              targets={targets}
              loading={targetsLoading}
              onCardClick={setOpenTarget}
              emptyMessage="Your faculty mentor hasn't logged a placement yet."
            />
          )}
        </>
      )}

      <CompanyTargetDrawer
        target={openTarget}
        open={!!openTarget}
        onClose={() => setOpenTarget(null)}
      />
    </div>
  );
}

function KanbanOrEmpty({ targets, loading, onCardClick, emptyMessage }) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[#A3A3A3] text-sm py-8">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading…
      </div>
    );
  }
  if (targets.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-[#E5E5E5] p-6">
        <p className="text-sm text-[#525252]">{emptyMessage}</p>
      </div>
    );
  }
  return <CompanyTargetsKanban targets={targets} onCardClick={onCardClick} />;
}
