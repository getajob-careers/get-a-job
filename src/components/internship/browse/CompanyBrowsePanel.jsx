import React, { useState, useMemo, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useProfileQuery } from "@/lib/queries/useProfile";
import { Skeleton } from "@/components/ui/skeleton";
import { createPageUrl } from "@/utils";
import { ruleScore } from "@/lib/internshipRuleScore";
import { applyFilters } from "./applyFilters";
import CompanyBrowseFilters from "./CompanyBrowseFilters";
import CompanyBrowseGrid from "./CompanyBrowseGrid";
import CompanyDetailDrawer from "./CompanyDetailDrawer";

const PAGE_SIZE = 50;

function emptyFilterState() {
  return {
    industry: new Set(),
    stage: new Set(),
    size: new Set(),
    location: new Set(),
    origin: new Set(),
  };
}

// Browse panel — the new default tab on /Internship per the redesign.
// Loads all 819 catalog rows once, filters/sorts/scores client-side,
// degrades gracefully when the student hasn't generated an
// internship_profile yet (banner + alphabetical, score chips show "—").

export default function CompanyBrowsePanel() {
  const { user } = useAuth();

  // 819 rows; only the fields cards + filters + scorer need. Dedicated
  // queryKey 'companies_browse' so this can't collide with any narrow
  // projection on a generic 'companies' key (see PR #178 cache-pollution
  // lesson).
  const { data: companies = [], isLoading: companiesLoading } = useQuery({
    queryKey: ["companies_browse"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select(
          "id, name, domain, industry, sector, stage, hq_city, hq_country, employee_count_range, description, origin, ats, verified",
        );
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!user?.id,
  });

  // Per-observer narrow projection from the canonical profile cache —
  // doesn't pollute the userProfile queryKey (PR #178 pattern).
  const { data: profileBits } = useProfileQuery(user?.id, (p) =>
    p ? { practicum_path: p.practicum_path || null } : null,
  );

  const { data: internshipProfile, isLoading: ipLoading } = useQuery({
    queryKey: ["internship_profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("internship_profiles")
        .select("realistic_company_stages, realistic_sectors, realistic_signal_filters")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Score every company with the shared ruleScore. Null when no
  // internship_profile exists → cards render "—" chip + we sort
  // alphabetically per D2.
  const scoresById = useMemo(() => {
    const map = new Map();
    if (!internshipProfile) return map;
    for (const c of companies) {
      map.set(c.id, ruleScore(c, internshipProfile));
    }
    return map;
  }, [companies, internshipProfile]);

  // PR5: suggestedRole removed — was target_job_titles[0], identical
  // on every browse card and added no per-company signal. The drawer's
  // pitched_role (per-company, from generate-internship-pitch) carries
  // the real signal.

  const [filters, setFilters] = useState(emptyFilterState);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Drawer state — URL-driven so back button closes the drawer, links
  // are shareable, deep-links auto-open the drawer on page load.
  const [searchParams, setSearchParams] = useSearchParams();
  const openCompanyId = searchParams.get("company");
  const openCompany = openCompanyId ? companies.find((c) => c.id === openCompanyId) ?? null : null;

  const openDrawer = (c) => {
    setSearchParams((sp) => {
      const next = new URLSearchParams(sp);
      next.set("company", c.id);
      return next;
    });
  };
  const closeDrawer = () => {
    setSearchParams((sp) => {
      const next = new URLSearchParams(sp);
      next.delete("company");
      return next;
    });
  };

  // Reset pagination whenever filters / search change so the user
  // doesn't end up scrolled past the new shorter result set.
  useEffect(() => {
    setPage(1);
  }, [filters, search]);

  const filtered = useMemo(
    () => applyFilters(companies, filters, search, scoresById),
    [companies, filters, search, scoresById],
  );

  const showNudge = !ipLoading && !internshipProfile && companies.length > 0;
  const canGenerate = profileBits?.practicum_path === "self_sourced";

  if (companiesLoading) {
    return <BrowseLoadingSkeleton />;
  }

  return (
    <>
      {showNudge && (
        <div className="brz-nudge">
          <p className="brz-nudge-text">
            <strong>Browse the full catalog.</strong>{" "}
            {canGenerate
              ? "Generate your pitch profile to see personalized fit scores ranked by your goals."
              : "Personalized fit scores are available for self-sourced students who generate a pitch profile."}
          </p>
          {canGenerate && (
            <Link
              to={createPageUrl("Internship") + "?tab=pipeline"}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-display font-semibold bg-rd-bg-card text-rd-text border border-rd-border hover:bg-rd-bg-soft hover:border-rd-border-hover transition-colors"
            >
              Generate profile
            </Link>
          )}
        </div>
      )}

      <CompanyBrowseFilters
        filters={filters}
        setFilters={setFilters}
        search={search}
        setSearch={setSearch}
        companies={companies}
        scoresById={scoresById}
        onClear={() => {
          setFilters(emptyFilterState());
          setSearch("");
        }}
      />

      <CompanyBrowseGrid
        companies={filtered}
        scoresById={scoresById}
        page={page}
        pageSize={PAGE_SIZE}
        onLoadMore={() => setPage((p) => p + 1)}
        onCardClick={openDrawer}
      />

      <CompanyDetailDrawer
        company={openCompany}
        open={!!openCompany}
        onClose={closeDrawer}
      />
    </>
  );
}

function BrowseLoadingSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="brz-filter-bar">
        <Skeleton className="h-10 w-1/2 max-w-md" />
        {[0, 1, 2, 3, 4].map((row) => (
          <div key={row} className="brz-filter-row">
            <Skeleton className="h-3 w-16" />
            {[0, 1, 2, 3, 4, 5].map((p) => (
              <Skeleton key={p} className="h-6 w-20 rounded-full" />
            ))}
          </div>
        ))}
      </div>
      <div className="brz-grid">
        {[0, 1, 2, 3, 4, 5].map((card) => (
          <div key={card} className="brz-card">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-2.5 w-1/2" />
            <Skeleton className="h-8 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
