import React, { useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import PracticumHeader from "@/components/practicum/PracticumHeader";
import InternshipProfileStrip from "@/components/practicum/InternshipProfileStrip";
import FindCompaniesCard from "@/components/practicum/FindCompaniesCard";
import CompanyTargetsKanban from "@/components/practicum/CompanyTargetsKanban";
import CompanyTargetDrawer from "@/components/practicum/CompanyTargetDrawer";
import {
  NoPracticumPath,
  NoInternshipProfile,
  FacultyPlacementPending,
} from "@/components/practicum/EmptyStates";

// Practicum — Wk 4 Internship Finder page.
//
// Branches on profiles.practicum_path:
//   - null               → "set your path" empty state
//   - self_sourced       → full finder UX (profile strip + find button + kanban)
//   - faculty_assigned   → kanban only (faculty placements), no finder
//
// The generate-internship-profile edge function lands Tue (Eli). Until
// then, the "Generate profile" CTA is disabled — students can still
// view + manage faculty/manually-added targets in the kanban.
const GENERATE_PROFILE_AVAILABLE = false;

export default function Practicum() {
  const { user } = useAuth();
  const [openTarget, setOpenTarget] = useState(null);

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

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      <PracticumHeader
        practicumPath={practicumPath}
        practicumStatus={profileRow?.practicum_status}
        practicumCohort={profileRow?.practicum_cohort}
      />

      {!practicumPath && <NoPracticumPath />}

      {practicumPath === "self_sourced" && (
        <>
          {!internshipProfileLoading && !internshipProfile ? (
            <NoInternshipProfile
              generateDisabled={!GENERATE_PROFILE_AVAILABLE}
              onGenerate={() => {/* wired when generate-internship-profile lands */}}
            />
          ) : (
            <>
              <InternshipProfileStrip
                profile={internshipProfile}
                onRefresh={() => {/* wired when generate-internship-profile lands */}}
                refreshDisabled={!GENERATE_PROFILE_AVAILABLE}
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
