/*
 * Career.jsx — Roadmap + Jobs condensed into one surface, per the
 * seamless-ia design handoff (screen 2 / prototype variation A):
 * selectable track band → live-jobs pane (left) + "Your matched roles"
 * why-panel (right). Selecting a track re-filters both panes.
 *
 * Data contracts reused from Jobs.jsx / Roadmap.jsx — same canonical
 * query keys (careerRoles, experiences, education), the same
 * search_jobs_by_role_titles RPC + column select, scoreJobFit with the
 * same { profile, experiences, educations } input, and the idempotent
 * addJobToTracker from JobCard. The old /Roadmap and /Jobs routes stay
 * alive (deep links + roadmap generation live there); this page is the
 * new nav destination.
 *
 * Seniority pre-filter restored — the v1 deviation that skipped it has
 * been undone. `inferExperienceLevel(experiences, educations)` +
 * `allowedSenioritiesForLevel()` derive the seniority allow-list, and
 * the search_jobs_by_role_titles RPC's `p_max_seniority` consumes it.
 * Track 3 bypasses the filter (`ALL_SENIORITIES`) per the 2026-05-20
 * live-data lesson (Senior PM: 66 listings → 0 visible without bypass);
 * Track 1 and Track 2 enforce it so the apply-now / doable-detour feeds
 * stop leading with roles outside the user's career stage. Low-fit dimming
 * inside the allowed range still happens via scoreJobFit + the pct < 50
 * gate — both mechanisms run, but the seniority filter prunes upstream
 * of the score so the long dimmed tail no longer dominates the page.
 */

import React, { useState, useMemo, useEffect, useRef } from "react";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import {
  useQuery,
  useInfiniteQuery,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { useProfileQuery } from "@/lib/queries/useProfile";
import { useExperiencesQuery } from "@/lib/queries/useExperiences";
import { useEducationQuery } from "@/lib/queries/useEducation";
import { Link, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Rocket,
  Headphones,
  TrendingUp,
  Search,
  HelpCircle,
  Check,
  Plus,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Loader2,
  X,
  Star,
  Briefcase,
} from "lucide-react";
import RdCard from "@/components/redesign/RdCard";
import RdFunnelTile from "@/components/redesign/RdFunnelTile";
import { TRACK_CONFIG } from "@/lib/trackConfig";
import { scoreJobFit } from "@/lib/scoreJobFit";
import { humanizeSkillId } from "@/lib/humanizeSkillId";
import JobCard from "@/components/jobs/JobCard";
import {
  inferExperienceLevel,
  allowedSenioritiesForLevel,
} from "@/lib/experienceLevel";
import { FUNNEL_BUCKETS } from "@/lib/funnelBuckets";
import { useAgentDrawer } from "@/lib/AgentDrawerContext";
import { buildCareerPageContext } from "@/lib/buildCareerPageContext";
import {
  careerJobsQueryKey,
  careerJobsEnabled,
  dedupeJobsById,
} from "@/lib/careerJobsQuery";
import { isAnalysisPending } from "@/lib/analysisStatus";
import ApplicationsKanban from "@/components/tracker/ApplicationsKanban";
import ApplicationDetailDrawer from "@/components/tracker/ApplicationDetailDrawer";
import AddApplicationDialog from "@/components/tracker/AddApplicationDialog";
import { TRACKER_CSS } from "@/components/tracker/trackerStyles";

// Application status set — canonical order matches the live
// applications.status enum and mirrors Tracker.jsx:37. The kanban renders
// columns in this exact order; ApplicationDetailDrawer treats this same
// list as the status palette.
const APPLICATION_STATUSES = [
  "interested",
  "preparing",
  "applied",
  "interviewing",
  "offer",
  "accepted",
  "rejected",
];
const APPLICATION_STATUS_LABELS = {
  interested: "Interested",
  preparing: "Preparing",
  applied: "Applied",
  interviewing: "Interviewing",
  offer: "Offer",
  accepted: "Accepted",
  rejected: "Rejected",
};

// First-time guide dismissal: per-user localStorage flag, same precedent
// as Home's hero-done key (Home.jsx:365).
const PIPELINE_GUIDE_DISMISS_KEY = (uid) => `pipelineGuideDismissed:${uid}`;

const TRACK_SIMILARITY_THRESHOLD = 0.3;
const MAX_TRACK_ROLES = 8;
const JOBS_PAGE_SIZE = 20;

// All-scope search: corpus-wide title ilike, mirroring Jobs.jsx's
// keyword-mode REST query (Jobs.jsx:256-268). The page size here is
// smaller than Jobs.jsx's BROWSE_PAGE_SIZE = 40 because Career's
// list-card layout is denser and a 40-item all-scope result floods the
// pane below the matched-roles rail.
const SEARCH_PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

// All six values of jobs.seniority (entry / mid / senior / lead / director /
// executive), used to bypass the level-based pre-filter on Track 3. Mirrors
// Jobs.jsx:46 — kept in sync. Track 3 is the growth-path track by
// definition; the 2026-05-20 live-data check (Jobs.jsx:43-50) showed the
// strict filter hid 100% of "Senior Product Manager" jobs (66 → 0) and
// "Senior Software Engineer" (112 → 0) for early-career users on Track 3,
// defeating the discovery intent. Strict filter still applies on Track 1
// and Track 2 (apply-now feed + doable-detour) where job-vs-qualification
// reality matters.
const ALL_SENIORITIES = [
  "entry",
  "mid",
  "senior",
  "lead",
  "director",
  "executive",
];

// Display normalization for the 0-1 score contract.
//
// career_roles.match_score, readiness_score, and goal_alignment_score are
// stored as 0-1 fractions (verified against live DB 2026-06-11; max across
// all 426 production rows is 1.0). This page renders percent strings, so
// every consumer here multiplies by 100. Same conversion JobCard.jsx
// already applies for fit_score (Math.round(score * 100), and that
// RoleCard.jsx applies for readiness_score + goal_alignment_score
// (Math.round(Number(rawScore) * 100)). This page was the outlier; the
// rail forgot the conversion and shipped showing "1%" badges for two
// weeks of production.
//
// Contract:
//   - Caller MUST gate on null/undefined upstream (see qualifiedAvailable
//     and pathAvailable in the rail; typeof === "number" for the badge).
//   - This helper coerces null/undefined to 0 defensively but the rendered
//     element should already be omitted in the null case.
//   - Clamped to [0, 100] so a future stored value > 1 (or a 0-100 row
//     left over before this hotfix) renders as 100 rather than something
//     absurd like "8800%".
const toPct = (v) => Math.max(0, Math.min(100, Math.round((v ?? 0) * 100)));

// JobCard's `trackColor` prop accepts the rdColor strings TRACK_CONFIG
// already publishes (coral / teal / golden). Mirrors RD_TRACK_STYLES in
// JobCard.jsx; using TRACK_CONFIG[selectedTrack].rdColor keeps a single
// source of truth.

// Band styling per track — canonical rdColor mapping (T1 coral · T2 teal ·
// T3 golden) from TRACK_CONFIG, expressed as static Tailwind classes so
// the JIT compiler sees them.
const TRACK_BAND = [
  {
    key: "track_1",
    icon: Rocket,
    circle: "bg-rd-coral",
    tintBg: "bg-rd-coral-tint",
    ink: "text-rd-coral-dark",
    activeBorder: "border-rd-coral",
    dot: "bg-rd-coral",
    barFill: "bg-rd-coral",
    barTrack: "bg-rd-coral-tint",
  },
  {
    key: "track_2",
    icon: Headphones,
    circle: "bg-rd-teal",
    tintBg: "bg-rd-teal-tint",
    ink: "text-rd-teal-dark",
    activeBorder: "border-rd-teal",
    dot: "bg-rd-teal",
    barFill: "bg-rd-teal",
    barTrack: "bg-rd-teal-tint",
  },
  {
    key: "track_3",
    icon: TrendingUp,
    circle: "bg-rd-golden",
    tintBg: "bg-rd-golden-tint",
    ink: "text-rd-golden-dark",
    activeBorder: "border-rd-golden",
    dot: "bg-rd-golden",
    barFill: "bg-rd-golden",
    barTrack: "bg-rd-golden-tint",
  },
];

const FIT_LABELS = {
  track_1: "strong fit",
  track_2: "doable detour",
  track_3: "stretch",
};

export default function Career() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedTrack, setSelectedTrack] = useState("track_1");
  const [whyOpen, setWhyOpen] = useState(false);
  const [search, setSearch] = useState("");

  // ── PR-A2: inline expandable pipeline board ─────────────────────────
  // Board open state is URL-driven via ?pipeline=open so deep links from
  // Home / Calendar / the redirected /Tracker route can land on it
  // open. Strip toggling syncs the param via history.replaceState (no
  // nav, no scroll jump). Collapse state persists for the session only —
  // a fresh visit without ?pipeline=open shows the board collapsed.
  const boardOpen = searchParams.get("pipeline") === "open";
  // Detail drawer is also URL-driven: &app=<id> opens that application's
  // drawer if it exists in the cache. Closing the drawer drops the param
  // but keeps pipeline=open.
  const drawerAppId = searchParams.get("app");

  const setBoardOpen = (open) => {
    const next = new URLSearchParams(searchParams);
    if (open) {
      next.set("pipeline", "open");
    } else {
      next.delete("pipeline");
      next.delete("app");
    }
    setSearchParams(next, { replace: true });
  };

  const closeDrawer = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("app");
    setSearchParams(next, { replace: true });
  };

  const boardSectionRef = useRef(null);
  // On expand, scroll the board into view. The effect also fires on the
  // initial render if pipeline=open is present, so deep-links from Home
  // / Calendar land already scrolled to the right place.
  useEffect(() => {
    if (boardOpen && boardSectionRef.current) {
      // requestAnimationFrame so the board's reveal completes before the
      // scroll measures its position.
      const id = requestAnimationFrame(() => {
        boardSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
      return () => cancelAnimationFrame(id);
    }
  }, [boardOpen]);

  // Manual "Add application" path — reuses the same dialog component
  // mounted by Tracker.jsx (extracted to src/components/tracker/
  // AddApplicationDialog.jsx in PR-A2 so both surfaces share one call
  // site). Pilot students who type a role into the dialog land in the
  // same applications cache the strip + kanban read; no second code
  // path to maintain.
  const [showAdd, setShowAdd] = useState(false);

  // First-time guide card — dismissible, persisted per-user in
  // localStorage. The 4-tile 7-step framing copy is preserved from
  // Tracker.jsx with "tracker" → "pipeline" where it reads naturally.
  const guideDismissKey = user?.id ? PIPELINE_GUIDE_DISMISS_KEY(user.id) : null;
  const [guideDismissed, setGuideDismissed] = useState(false);
  useEffect(() => {
    if (!guideDismissKey) return;
    try {
      setGuideDismissed(localStorage.getItem(guideDismissKey) === "1");
    } catch {
      /* localStorage unavailable */
    }
  }, [guideDismissKey]);
  const dismissGuide = () => {
    setGuideDismissed(true);
    try {
      if (guideDismissKey) localStorage.setItem(guideDismissKey, "1");
    } catch {
      /* localStorage unavailable */
    }
  };
  // Scope toggle for the live-jobs pane:
  //   - "track" (default): client-side filter over the active track's
  //     pre-fetched live jobs. Cheap, no extra query.
  //   - "all":   corpus-wide search via the same REST pattern Jobs.jsx
  //     uses in keyword mode (.from("jobs").select(...).ilike("title",
  //     ...)). Hits a separate, scoped queryKey ("career_jobs_search")
  //     so the canonical career_jobs cache stays clean.
  const [searchScope, setSearchScope] = useState("track");
  // 300ms debounce on the input → query trigger so the user can type
  // freely without firing a Supabase REST call per keystroke. State
  // updates via useEffect rather than useDebounce hook to keep the
  // single-consumer code inline.
  const [debouncedQuery, setDebouncedQuery] = useState("");
  useEffect(() => {
    const id = setTimeout(
      () => setDebouncedQuery(search.trim()),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(id);
  }, [search]);
  const [expandedRoleId, setExpandedRoleId] = useState(null);

  // isSuccess flags gate the career_jobs fetch (below): seniorityFilter and
  // p_work_types derive from these three async queries, so firing jobs before
  // they settle produces a transient WRONG list cached under the early_career
  // key (see "disappearing Track 1 jobs" fix).
  const { data: profile, isSuccess: profileReady } = useProfileQuery(user?.id);
  const { data: experiences = [], isSuccess: expReady } = useExperiencesQuery(
    user?.id,
  );
  const { data: educations = [], isSuccess: eduReady } = useEducationQuery(
    user?.id,
  );
  const jobsInputsReady = profileReady && expReady && eduReady;

  // Wide applications query — same canonical key + select Home + Tracker
  // already use, so this surface joins the shared cache rather than
  // narrowing it (PR #178 / lesson 2026-05-28). The funnel strip below
  // reads counts off this cache; JobCard's optimistic Apply path prepends
  // into the same key in the same frame the button toggles to Tracked.
  const { data: applications = [] } = useQuery({
    queryKey: ["applications", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select("*")
        .eq("user_id", user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const funnelCounts = useMemo(() => {
    const counts = {};
    for (const bucket of FUNNEL_BUCKETS) {
      counts[bucket.key] = applications.filter((a) =>
        bucket.statuses.includes(a.status),
      ).length;
    }
    return counts;
  }, [applications]);

  // Cross-reference jobs cache for tracked rows that came from Browse
  // (ats_source + external_id populated). When the matching jobs row is
  // is_active=false, ApplicationsKanban surfaces a "may no longer be
  // active" badge. Same query as Tracker.jsx:98-124 — keyed by the
  // count rather than the row contents so a status update on a card
  // doesn't kick a refetch.
  const atsLinkedKeys = useMemo(
    () =>
      applications
        .filter((a) => a.ats_source && a.external_id)
        .map((a) => ({ ats: a.ats_source, ext: a.external_id })),
    [applications],
  );
  const { data: inactiveExternalIds = new Set() } = useQuery({
    queryKey: ["trackedJobsActiveStatus", user?.id, atsLinkedKeys.length],
    queryFn: async () => {
      if (atsLinkedKeys.length === 0) return new Set();
      const inactive = new Set();
      const byAts = atsLinkedKeys.reduce((acc, k) => {
        (acc[k.ats] = acc[k.ats] || []).push(k.ext);
        return acc;
      }, {});
      for (const [ats, ids] of Object.entries(byAts)) {
        const { data, error } = await supabase
          .from("jobs")
          .select("external_id")
          .eq("ats_source", ats)
          .in("external_id", ids)
          .eq("is_active", false);
        if (error) {
          console.warn(
            "[career-board] inactive cross-ref failed:",
            error.message,
          );
          continue;
        }
        for (const j of data || []) inactive.add(`${ats}|${j.external_id}`);
      }
      return inactive;
    },
    enabled: !!user?.id && boardOpen && atsLinkedKeys.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  // Drawer subject lookup — resolves the URL ?app= id against the wide
  // ["applications", uid] cache.
  const drawerApp = useMemo(
    () => (drawerAppId ? applications.find((a) => a.id === drawerAppId) : null),
    [drawerAppId, applications],
  );
  const drawerListingInactive =
    drawerApp && drawerApp.ats_source && drawerApp.external_id
      ? inactiveExternalIds.has(
          `${drawerApp.ats_source}|${drawerApp.external_id}`,
        )
      : false;

  // Mirrors Jobs.jsx:86-93 — derive the user's career-stage from
  // experiences + educations, then map to a seniority allow-list. This is
  // the parity fix the seamless-IA cut deferred ("v1 deviation, on
  // purpose" — see the original file-header comment that this PR
  // partially rewrites). Without it, Track 1 + Track 2 lists for an
  // early-career user surface mid / senior / lead rows that the scorer
  // pushes to the bottom of the page but can't hide. Restoring the
  // pre-filter eliminates the long dimmed tail upstream of the score.
  const experienceLevel = useMemo(
    () => inferExperienceLevel(experiences, educations),
    [experiences, educations],
  );
  const allowedSeniorities = useMemo(
    () => allowedSenioritiesForLevel(experienceLevel),
    [experienceLevel],
  );
  // Track-3 bypass — inline because there's only one consumer; matches the
  // shape of seniorityFilterFor() in Jobs.jsx but skips the extraction.
  const seniorityFilter = useMemo(
    () => (selectedTrack === "track_3" ? ALL_SENIORITIES : allowedSeniorities),
    [selectedTrack, allowedSeniorities],
  );
  // profile.work_type as a clean array, shared by the honest count + the
  // list so both apply the identical work_type filter.
  const workTypes = useMemo(
    () => (Array.isArray(profile?.work_type) ? profile.work_type : []),
    [profile?.work_type],
  );

  const { data: roles = [], isLoading: loadingRoles } = useQuery({
    queryKey: ["careerRoles", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("career_roles")
        .select("*")
        .eq("user_id", user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    // Poll while the analysis is still generating (just-signed-up window):
    // career_roles is empty but isAnalysisPending, so refetch until the rows
    // land, then stop. Lets the "building your matches" cold-start state
    // auto-resolve without a manual refresh.
    refetchInterval: (query) =>
      (query.state.data?.length ?? 0) === 0 && isAnalysisPending(profile)
        ? 4000
        : false,
  });

  const rolesByTrack = useMemo(() => {
    const out = { track_1: [], track_2: [], track_3: [] };
    for (const r of roles) {
      if (out[r.track]) out[r.track].push(r);
    }
    for (const k of Object.keys(out)) {
      out[k].sort((a, b) => (b.match_score ?? 0) - (a.match_score ?? 0));
    }
    return out;
  }, [roles]);

  const trackTitles = useMemo(() => {
    const out = {};
    for (const k of Object.keys(rolesByTrack)) {
      out[k] = rolesByTrack[k]
        .slice(0, MAX_TRACK_ROLES)
        .map((r) => r.title)
        .filter(Boolean);
    }
    return out;
  }, [rolesByTrack]);

  // Per-track HONEST live counts for the band meta + header — the count RPC
  // now takes the SAME seniority + work_type filters the list applies, so the
  // header number is the post-filter universe ("N live roles — showing top
  // 20"), not the unfiltered ceiling that contradicted the rendered list.
  // Each track uses its own seniority allow-list (track_3 bypasses to ALL);
  // work_type is profile-wide. Filters folded into the key so a level /
  // work_type change refetches.
  const liveCounts =
    useQuery({
      queryKey: [
        "career_track_counts",
        user?.id,
        trackTitles.track_1?.join("|"),
        trackTitles.track_2?.join("|"),
        trackTitles.track_3?.join("|"),
        allowedSeniorities.join(","),
        [...workTypes].sort().join(","),
      ],
      queryFn: async () => {
        const counts = {};
        for (const k of ["track_1", "track_2", "track_3"]) {
          const titles = trackTitles[k];
          if (!titles || titles.length === 0) {
            counts[k] = null;
            continue;
          }
          const { data, error } = await /** @type {any} */ (supabase).rpc(
            "count_active_jobs_by_role_titles",
            {
              p_role_titles: titles,
              p_similarity_threshold: TRACK_SIMILARITY_THRESHOLD,
              p_max_seniority:
                k === "track_3" ? ALL_SENIORITIES : allowedSeniorities,
              p_work_types: workTypes.length > 0 ? workTypes : null,
            },
          );
          if (error) {
            counts[k] = null;
            continue;
          }
          const n = Array.isArray(data) ? data[0] : data;
          counts[k] = typeof n === "number" ? n : null;
        }
        return counts;
      },
      enabled: !!user?.id && roles.length > 0,
      staleTime: 5 * 60 * 1000,
    }).data || {};

  // Paginated so the rendered list can actually reach the honest header
  // count instead of a frozen first page of 20 (the "174 but I see ~15" P0).
  // seniorityFilter + work_type fold into the queryKey (via careerJobsQueryKey)
  // so a Track 1↔3 switch or a profile.work_type change refetches rather than
  // serving a stale filtered list. Pages append at p_offset; the RPC ordering
  // is deterministic (20260612_jobs_search_deterministic_order) so pages don't
  // overlap, and dedupeJobsById is the belt. keepPreviousData smooths the
  // track-switch flash.
  const {
    data: jobsPages,
    isLoading: loadingJobs,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: careerJobsQueryKey({
      userId: user?.id,
      selectedTrack,
      titles: trackTitles[selectedTrack] || [],
      seniorityFilter,
      workType: profile?.work_type,
    }),
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const titles = trackTitles[selectedTrack] || [];
      if (titles.length === 0) return [];
      const { data, error } = await supabase
        .rpc("search_jobs_by_role_titles", {
          p_role_titles: titles,
          p_limit: JOBS_PAGE_SIZE,
          p_offset: pageParam,
          p_similarity_threshold: TRACK_SIMILARITY_THRESHOLD,
          p_max_seniority: seniorityFilter,
          p_work_types: workTypes.length > 0 ? workTypes : null,
        })
        .select(
          "id, ats_source, external_id, title, company_name, company_slug, location_city, location_raw, is_remote, seniority, years_experience_min, years_experience_max, date_posted, apply_url, description, industry, req_skills_core, req_skills_nice, req_years_min, req_years_max, req_education_levels, req_education_strict, req_seniority, function_family, extraction_confidence",
        );
      if (error) throw error;
      return data || [];
    },
    // A short page (< page size) means no more rows; otherwise the next
    // offset is the total fetched so far.
    getNextPageParam: (lastPage, allPages) =>
      Array.isArray(lastPage) && lastPage.length === JOBS_PAGE_SIZE
        ? allPages.reduce((n, p) => n + (p?.length || 0), 0)
        : undefined,
    enabled: careerJobsEnabled({
      userId: user?.id,
      rolesLength: roles.length,
      jobsInputsReady,
    }),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
  });
  const jobs = useMemo(
    () => dedupeJobsById((jobsPages?.pages ?? []).flat()),
    [jobsPages],
  );

  // All-scope corpus search. Mirrors Jobs.jsx:256-268's keyword-mode
  // REST query verbatim — same .from("jobs"), same column select, same
  // .ilike("title", "%kw%"), same .in("seniority", ...) gate. NO
  // Track-3 bypass here: all-scope is by definition track-less, so
  // allowedSeniorities applies as-is (Jobs.jsx's seniorityFilterFor
  // returns plain allowedSeniorities outside track mode — Jobs.jsx:52).
  // The query is gated on scope === "all" AND a non-empty debounced
  // query, so the in-track default never fires this and the cache key
  // never collides with career_jobs (PR #178 cache-pollution discipline).
  const searchActive = searchScope === "all" && debouncedQuery.length > 0;
  const { data: searchJobs = [], isLoading: loadingSearch } = useQuery({
    queryKey: [
      "career_jobs_search",
      user?.id,
      debouncedQuery,
      allowedSeniorities.join(","),
    ],
    queryFn: async () => {
      const safe = debouncedQuery.replace(/[%,]/g, " ").trim();
      let q = supabase
        .from("jobs")
        .select(
          "id, ats_source, external_id, title, company_name, company_slug, location_city, location_raw, is_remote, seniority, years_experience_min, years_experience_max, date_posted, apply_url, description, industry, req_skills_core, req_skills_nice, req_years_min, req_years_max, req_education_levels, req_education_strict, req_seniority, function_family, extraction_confidence",
        )
        .eq("is_il", true)
        .eq("is_active", true)
        .in("seniority", allowedSeniorities)
        .order("date_posted", { ascending: false, nullsFirst: false })
        .range(0, SEARCH_PAGE_SIZE - 1);
      if (safe) q = q.ilike("title", `%${safe}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && searchActive,
    staleTime: 5 * 60 * 1000,
  });

  const scoredJobs = useMemo(() => {
    const input = { profile, experiences, educations };
    // In search-active mode, score the corpus-wide search results. Otherwise,
    // score the active track's pre-fetched live jobs.
    const source = searchActive ? searchJobs : jobs;
    const list = source.map((j) => {
      const result = scoreJobFit(input, j);
      const pct = Math.round((result.fit_score ?? 0) * 100);
      return { job: j, result, pct, low: pct < 50 };
    });
    list.sort((a, b) => b.pct - a.pct);
    return list;
  }, [jobs, searchJobs, searchActive, profile, experiences, educations]);

  // Client-side substring filter applies only in track scope. In
  // all-scope the server already filtered via .ilike, so showing every
  // returned row is the honest behavior.
  const visibleJobs = useMemo(() => {
    if (searchScope === "all") return scoredJobs;
    const q = search.trim().toLowerCase();
    if (!q) return scoredJobs;
    return scoredJobs.filter(
      ({ job }) =>
        (job.title || "").toLowerCase().includes(q) ||
        (job.company_name || "").toLowerCase().includes(q),
    );
  }, [scoredJobs, search, searchScope]);

  // The career_jobs query is gated until profile/experiences/educations settle
  // (jobsInputsReady). While gated, isLoading is false (disabled query), so the
  // pane must still read as LOADING — never "no jobs" — until the first real
  // fetch can run. Track scope only; all-scope uses its own loadingSearch.
  const jobsLoading = loadingJobs || (!searchActive && !jobsInputsReady);

  const band = TRACK_BAND.find((t) => t.key === selectedTrack);
  const trackRoles = rolesByTrack[selectedTrack] || [];
  const goalName = profile?.five_year_role || "your 5-year goal";
  const trackNumber = TRACK_CONFIG[selectedTrack]?.number ?? 1;
  // JobCard's trackColor prop expects an rdColor string (coral / teal /
  // golden). In all-scope mode there's no active track — leave trackColor
  // null so JobCard renders the neutral-fallback styling (matches the
  // "keyword mode without scoreJobFit result" branch in JobCard.jsx:199).
  const jobCardTrackColor =
    searchScope === "all"
      ? null
      : (TRACK_CONFIG[selectedTrack]?.rdColor ?? null);

  // First matched role opens by default whenever the track changes.
  const effectiveExpandedId =
    expandedRoleId && trackRoles.some((r) => r.id === expandedRoleId)
      ? expandedRoleId
      : (trackRoles[0]?.id ?? null);

  // B3 visible-list ids — the exact ORDER rendered: jobs by fit_score desc,
  // roles by match_score desc within the selected track. Memoized so the
  // producer's stable-key cache (buildCareerPageContext) holds a stable
  // visible_items reference and setPageContext's shallow guard doesn't thrash.
  const visibleJobIds = useMemo(
    () => visibleJobs.map(({ job }) => job.id),
    [visibleJobs],
  );
  const visibleRoleIds = useMemo(
    () => trackRoles.map((r) => r.id),
    [trackRoles],
  );

  // PR-B2 agent page-context: surface what Career has cheaply available
  // (the selected track + the matched-role currently expanded on the
  // rail + the application open in the detail drawer, if any) to the
  // agent drawer so the server can fetch each entity authoritatively
  // and inject TARGET ROLE / CURRENT TRACK / TARGET APPLICATION blocks.
  // IDs only — never titles. B3 adds visible_items (jobs + roles on screen).
  // Cleared on unmount so navigating to a different page doesn't leave
  // stale context behind.
  //
  // Shape builder kept inline + exported for the
  // src/test/career-page-context.test.js unit suite — proves the wiring
  // emits the right IDs without rendering the full page tree.
  const agentDrawer = useAgentDrawer();
  useEffect(() => {
    agentDrawer.setPageContext(
      buildCareerPageContext({
        selectedTrack,
        roleId: effectiveExpandedId,
        applicationId: drawerAppId,
        visibleJobIds,
        visibleRoleIds,
      }),
    );
    return () => agentDrawer.setPageContext(null);
  }, [
    selectedTrack,
    effectiveExpandedId,
    drawerAppId,
    visibleJobIds,
    visibleRoleIds,
    agentDrawer,
  ]);

  // Career's own optimistic tracked-id set + handleTrack are gone;
  // JobCard owns that state internally now (see JobCard.jsx:175-216),
  // so we just hand off the props and let JobCard's Adding / Tracked
  // button states fire from there.

  if (loadingRoles) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-rd-text-secondary" />
      </div>
    );
  }

  if (roles.length === 0) {
    // Cold-start sibling of the count P0: a just-signed-up user has
    // career_roles=0 WHILE onboarding's analysis is still generating. Show a
    // "building your matches" state (the roles query polls until it lands) —
    // never the "Generate your roadmap first" dead-end, which wrongly tells
    // them to start something already in flight. isAnalysisPending mirrors
    // Home's self-heal trigger so the two surfaces agree.
    const building = isAnalysisPending(profile);
    return (
      <div className="max-w-[1080px] mx-auto px-5 sm:px-8 py-8 sm:py-10">
        <h1 className="font-display font-extrabold text-[26px] tracking-tight text-rd-text">
          Career
        </h1>
        <RdCard className="mt-6 p-8 text-center">
          {building ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin text-rd-coral mx-auto" />
              <p className="font-display font-bold text-[18px] text-rd-text mt-4">
                Building your matches…
              </p>
              <p className="text-[12.5px] text-rd-text-secondary mt-2 max-w-md mx-auto">
                We’re analyzing your background to find your tracks, matched
                roles, and live jobs. This usually takes under a minute and
                updates here automatically.
              </p>
            </>
          ) : (
            <>
              <p className="font-display font-bold text-[18px] text-rd-text">
                Generate your roadmap first
              </p>
              <p className="text-[12.5px] text-rd-text-secondary mt-2 max-w-md mx-auto">
                Your tracks, matched roles, and live jobs all come from your
                career analysis.
              </p>
              <Link
                to={createPageUrl("Roadmap")}
                className="inline-flex items-center gap-1.5 mt-5 bg-rd-coral text-white font-display font-semibold text-[13px] rounded-full px-5 py-2.5"
              >
                Generate roadmap <ChevronRight className="w-4 h-4" />
              </Link>
            </>
          )}
        </RdCard>
      </div>
    );
  }

  return (
    <div className="max-w-[1080px] mx-auto px-5 sm:px-8 py-8 sm:py-10">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display font-extrabold text-[26px] leading-[1.1] tracking-tight text-rd-text">
            Career
          </h1>
          <p className="text-[12.5px] text-rd-text-secondary mt-1">
            Your tracks, the roles you match, and the live jobs on them — one
            place.
          </p>
        </div>
        <button
          onClick={() => setWhyOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 bg-rd-bg-soft rounded-full px-3.5 py-2 font-display font-semibold text-[12px] text-rd-text-secondary hover:text-rd-text transition-colors"
        >
          <HelpCircle className="w-3.5 h-3.5" /> How tracks work
        </button>
      </div>

      {whyOpen && (
        <div className="bg-rd-bg-soft rounded-[14px] mt-3 px-4 py-3 text-[12px] leading-[1.55] text-rd-text-tertiary">
          Every role is placed by two things — how{" "}
          <b className="text-rd-text">qualified</b> you are now, and whether it
          moves you toward <b className="text-rd-text">{goalName}</b>. Track 1
          is the sweet spot: apply there first. Track 2 is a doable detour;
          Track 3 is what you grow into.
        </div>
      )}

      {/* Track band — the roadmap, condensed */}
      <div
        className="grid grid-cols-3 gap-2.5 mt-4"
        data-strip-anchor="track-band"
      >
        {TRACK_BAND.map((t) => {
          const cfg = TRACK_CONFIG[t.key];
          const TIcon = t.icon;
          const active = t.key === selectedTrack;
          const count = liveCounts[t.key];
          return (
            <button
              key={t.key}
              onClick={() => setSelectedTrack(t.key)}
              className={[
                "min-w-0 text-left rounded-[14px] px-3 py-2.5 border-[1.5px] transition-colors",
                active
                  ? `${t.tintBg} ${t.activeBorder}`
                  : "bg-rd-bg-card border-rd-border hover:border-rd-border-hover",
              ].join(" ")}
            >
              <span className="flex items-center gap-2">
                <span
                  className={`w-[26px] h-[26px] rounded-full ${t.circle} flex items-center justify-center flex-shrink-0`}
                >
                  <TIcon className="w-3.5 h-3.5 text-white" />
                </span>
                <span className="min-w-0">
                  <span
                    className={`block font-display font-bold text-[13px] truncate ${active ? t.ink : "text-rd-text"}`}
                  >
                    {cfg.name}
                  </span>
                  <span
                    className={`block text-[10.5px] truncate ${active ? t.ink : "text-rd-text-secondary"}`}
                  >
                    T{cfg.number} · {FIT_LABELS[t.key]} ·{" "}
                    {(rolesByTrack[t.key] || []).length}{" "}
                    {(rolesByTrack[t.key] || []).length === 1
                      ? "role"
                      : "roles"}
                    {typeof count === "number" ? ` · ${count} live` : ""}
                  </span>
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Pipeline strip — clickable. PR-A2 makes the whole strip a
          single button that toggles the inline board below. URL syncs
          to ?pipeline=open via history.replaceState so deep links from
          Home / Calendar / the redirected /Tracker land on it open. */}
      <button
        type="button"
        onClick={() => setBoardOpen(!boardOpen)}
        aria-expanded={boardOpen}
        aria-controls="career-pipeline-board"
        className="w-full text-left mt-3 group"
        data-pipeline-strip
      >
        <RdCard className="p-3 group-hover:border-rd-border-hover group-hover:shadow-rd transition-[border-color,box-shadow] duration-150">
          <div className="flex items-center justify-between mb-1.5 px-1">
            <span className="text-[11px] font-medium text-rd-text-eyebrow uppercase tracking-[0.09em]">
              Your pipeline
            </span>
            <span className="inline-flex items-center gap-1.5 text-[10.5px] text-rd-text-secondary">
              {applications.length > 0 && (
                <>
                  {applications.length}{" "}
                  {applications.length === 1 ? "role" : "roles"} tracked ·{" "}
                </>
              )}
              {boardOpen ? (
                <>
                  Hide board <ChevronUp className="w-3 h-3" />
                </>
              ) : (
                <>
                  Open board <ChevronDown className="w-3 h-3" />
                </>
              )}
            </span>
          </div>
          <div className="flex gap-1.5">
            <RdFunnelTile
              label="saved"
              value={funnelCounts.saved}
              tone="neutral"
            />
            <RdFunnelTile
              label="applied"
              value={funnelCounts.applied}
              tone="coral"
            />
            <RdFunnelTile
              label="interview"
              value={funnelCounts.interview}
              tone="teal"
            />
            <RdFunnelTile
              label="offer"
              value={funnelCounts.offer}
              tone="neutral"
            />
          </div>
        </RdCard>
      </button>

      {/* Inline expandable board — final Tracker-absorption surface
          (PR-A2). Reuses ApplicationsKanban + ApplicationDetailDrawer
          exactly as Tracker.jsx mounts them. The TRACKER_CSS injection
          carries forward so the per-tab subcomponents inside the drawer
          (CVManagement, SkillsRequired, ProjectsProof, NetworkingReferrals,
          InterviewPrep, FollowUp) that still consume `.tk-*` classes keep
          rendering — same single-injection pattern as Tracker.jsx:165. */}
      {boardOpen && (
        <section
          id="career-pipeline-board"
          ref={boardSectionRef}
          className="mt-4"
          aria-label="Pipeline board"
        >
          <style>{TRACKER_CSS}</style>

          {!guideDismissed && (
            <RdCard className="p-5" data-pipeline-guide>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10.5px] uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow font-mono">
                    How to use this pipeline
                  </p>
                  <p className="text-[13.5px] text-rd-text-secondary leading-[1.55] mt-1.5">
                    Every application has a{" "}
                    <strong className="text-rd-text font-display font-bold">
                      7-step process
                    </strong>
                    . Open any application and go to the{" "}
                    <strong className="text-rd-text font-display font-bold">
                      📋 Steps
                    </strong>{" "}
                    tab. Work through each step before submitting — candidates
                    who skip steps are the ones who get ignored.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={dismissGuide}
                  aria-label="Dismiss the pipeline guide"
                  className="flex-shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full text-rd-text-tertiary hover:text-rd-text hover:bg-rd-bg-soft transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mt-4">
                <PipelineGuideTile
                  tint="var(--rd-golden-tint)"
                  accent="var(--rd-golden-dark)"
                  head="Steps 1–2"
                  body="Qualify yourself. Dissect the job description. Know the role before applying."
                />
                <PipelineGuideTile
                  tint="var(--rd-teal-tint)"
                  accent="var(--rd-teal-dark)"
                  head="Steps 3–5"
                  body="Tailor your CV, map skill evidence, and find a referral contact at the company."
                />
                <PipelineGuideTile
                  tint="var(--rd-coral-tint)"
                  accent="var(--rd-coral-dark)"
                  head="Steps 6–7"
                  body="Submit your application, then prep for the interview with STAR-format answers."
                />
                <PipelineGuideTile
                  tint="var(--rd-golden-tint)"
                  accent="var(--rd-golden-dark)"
                  head="⭐ Referral = your biggest edge"
                  body="Many companies offer referral bonuses to employees when a referred candidate gets hired. They're incentivised to get you in."
                  highlight
                />
              </div>
            </RdCard>
          )}

          <div
            className={`flex items-start justify-between gap-3 flex-wrap ${!guideDismissed ? "mt-4" : ""}`}
          >
            <div className="min-w-0">
              <h2 className="font-display font-bold text-[17px] text-rd-text">
                Pipeline board
              </h2>
              <p className="text-[11.5px] text-rd-text-secondary mt-0.5">
                Drag a card between columns to update its status. Click any card
                to open the steps checklist.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              className="flex-shrink-0 inline-flex items-center gap-1.5 font-display font-bold text-[12.5px] text-white bg-rd-coral hover:bg-rd-coral-dark rounded-full px-3.5 py-2 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add manually
            </button>
          </div>

          <div className="mt-3">
            {applications.length === 0 ? (
              <RdCard className="px-6 py-10 text-center">
                <Briefcase className="w-10 h-10 text-rd-coral mx-auto mb-3" />
                <p className="text-[13.5px] text-rd-text-secondary leading-[1.55] max-w-md mx-auto">
                  No applications yet. Track one from the live-jobs list below —
                  the Track button on any role card prepends it here.
                </p>
              </RdCard>
            ) : (
              <ApplicationsKanban
                applications={applications}
                statuses={APPLICATION_STATUSES}
                statusLabels={APPLICATION_STATUS_LABELS}
                inactiveExternalIds={inactiveExternalIds}
                onCardClick={(app) => {
                  const next = new URLSearchParams(searchParams);
                  next.set("pipeline", "open");
                  next.set("app", app.id);
                  setSearchParams(next, { replace: true });
                }}
              />
            )}
          </div>

          <ApplicationDetailDrawer
            app={drawerApp}
            profile={profile}
            listingInactive={drawerListingInactive}
            open={!!drawerApp}
            onClose={closeDrawer}
            onUpdate={() =>
              queryClient.invalidateQueries({ queryKey: ["applications"] })
            }
          />

          {/* Same AddApplicationDialog instance Tracker.jsx mounts — the
              extraction in this PR lets both surfaces share one call
              site. Manual add of an application that came from a channel
              other than Browse Jobs (e.g. WhatsApp tip, email referral)
              lands here. */}
          <AddApplicationDialog open={showAdd} onOpenChange={setShowAdd} />
        </section>
      )}

      <div className="flex flex-col md:flex-row gap-4 mt-4 items-start">
        {/* Left — live jobs */}
        <div className="w-full md:flex-[1.55] min-w-0">
          <div className="relative">
            <Search className="w-4 h-4 text-rd-text-secondary absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                searchScope === "all"
                  ? "Search all jobs by title…"
                  : `Search ${TRACK_CONFIG[selectedTrack].name} roles…`
              }
              className="w-full bg-rd-bg-card border border-rd-border rounded-[10px] pl-10 pr-4 py-2.5 text-[13px] text-rd-text placeholder:text-rd-text-secondary focus:outline-none focus:border-rd-coral focus:ring-[3px] focus:ring-rd-coral-tint"
            />
          </div>
          {/* Scope toggle — segmented buttons. "This track" is the cheap
              client-filter over pre-fetched live jobs; "All jobs" hits the
              corpus-wide search query. Rendered whenever the search input
              renders (PR-A1 discoverability rider) — gating it on input
              made "All jobs" effectively invisible. "This track" is the
              default so the band cue stays meaningful pre-typing. */}
          <div
            className="inline-flex gap-1 mt-2.5 bg-rd-bg-soft rounded-full p-1"
            role="group"
            aria-label="Search scope"
          >
            <button
              type="button"
              onClick={() => setSearchScope("track")}
              className={[
                "px-3 py-1 rounded-full text-[11px] font-display font-semibold transition-colors",
                searchScope === "track"
                  ? "bg-rd-bg-card text-rd-text shadow-rd"
                  : "text-rd-text-secondary hover:text-rd-text",
              ].join(" ")}
            >
              This track
            </button>
            <button
              type="button"
              onClick={() => setSearchScope("all")}
              className={[
                "px-3 py-1 rounded-full text-[11px] font-display font-semibold transition-colors",
                searchScope === "all"
                  ? "bg-rd-bg-card text-rd-text shadow-rd"
                  : "text-rd-text-secondary hover:text-rd-text",
              ].join(" ")}
            >
              All jobs
            </button>
          </div>
          <div className="flex items-center justify-between mt-3">
            <span className="font-display font-bold text-[13.5px] text-rd-text">
              {searchScope === "all" && debouncedQuery.length > 0
                ? // All-scope: don't fabricate a total ("N live roles…" doesn't
                  // describe a search result set). Show the literal echo of
                  // what the user typed so the result list reads honestly.
                  `Results for “${debouncedQuery}”`
                : typeof liveCounts[selectedTrack] === "number"
                  ? `${liveCounts[selectedTrack]} live roles on Track ${trackNumber}`
                  : `Live roles on Track ${trackNumber}`}
            </span>
            {searchScope !== "all" && (
              <span className="text-[10.5px] text-rd-text-secondary">
                refreshed nightly
              </span>
            )}
          </div>
          <div className="flex flex-col gap-2.5 mt-2.5">
            {(jobsLoading || (searchActive && loadingSearch)) && (
              <RdCard className="p-6 text-center text-[12.5px] text-rd-text-secondary">
                <Loader2 className="w-4 h-4 animate-spin inline-block mr-2 align-[-2px]" />
                {searchActive ? "Searching jobs…" : "Matching live jobs…"}
              </RdCard>
            )}
            {!jobsLoading &&
              !(searchActive && loadingSearch) &&
              visibleJobs.length === 0 && (
                <RdCard className="p-6 text-center text-[12.5px] text-rd-text-secondary">
                  {searchScope === "all"
                    ? "No jobs match that search."
                    : search
                      ? "No live roles match that search."
                      : "No live matches on this track right now — check back tomorrow."}
                </RdCard>
              )}
            {visibleJobs.map(({ job, result }) => (
              <JobCard
                key={job.id}
                job={job}
                scoreResult={result}
                trackColor={jobCardTrackColor}
              />
            ))}
            {/* Load more — makes the honest header count reachable instead of
                a frozen first page. Track scope only, and not while a
                substring filter is narrowing the loaded set. */}
            {searchScope !== "all" &&
              !search &&
              hasNextPage &&
              visibleJobs.length > 0 && (
                <button
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="self-center inline-flex items-center gap-1.5 bg-rd-bg-soft rounded-full px-5 py-2.5 font-display font-semibold text-[12.5px] text-rd-text-secondary hover:text-rd-text transition-colors disabled:opacity-60"
                >
                  {isFetchingNextPage ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
                    </>
                  ) : typeof liveCounts[selectedTrack] === "number" ? (
                    `Show more · showing ${visibleJobs.length} of ${liveCounts[selectedTrack]}`
                  ) : (
                    "Show more"
                  )}
                </button>
              )}
          </div>
        </div>

        {/* Right — matched roles why-panel */}
        <div className="w-full md:flex-1 min-w-0 bg-rd-bg-page border border-rd-border-subtle rounded-[16px] p-3.5">
          <div className="flex items-center justify-between mb-2">
            <span className="font-display font-bold text-[14px] text-rd-text">
              Your matched roles
            </span>
            <span className="text-[10.5px] text-rd-text-secondary">
              Track {trackNumber}
            </span>
          </div>
          <p className="text-[10.5px] leading-[1.5] text-rd-text-tertiary mb-2.5">
            Why you&apos;re matched: every role is scored on two axes — how{" "}
            <b className="text-rd-text">qualified</b> you are now, and how well
            it <b className="text-rd-text">moves you toward {goalName}</b>.
          </p>
          <div className="flex flex-col gap-2">
            {trackRoles.length === 0 && (
              <p className="text-[12px] text-rd-text-secondary px-1 py-2">
                No roles on this track yet.
              </p>
            )}
            {trackRoles.map((r) => {
              const expanded = r.id === effectiveExpandedId;
              // RULINGS.md (e): null score columns NEVER render as 0%.
              // Compute "available" from the raw nulls (not from the
              // coalesced fallback) so a genuinely-missing column omits
              // its bar entirely. readiness_score is allowed to fall
              // back to match_score for display — both being null is
              // the only case that omits the qualified bar.
              const qualifiedRaw = r.readiness_score ?? r.match_score;
              const qualifiedAvailable =
                qualifiedRaw !== null && qualifiedRaw !== undefined;
              const pathAvailable =
                r.goal_alignment_score !== null &&
                r.goal_alignment_score !== undefined;
              const qualified = toPct(qualifiedRaw);
              const path = toPct(r.goal_alignment_score);
              const matched = (r.matched_skills || []).slice(0, 4);
              const gaps = (r.missing_skills || []).slice(0, 3);
              return (
                <div
                  key={r.id}
                  className="bg-rd-bg-card border border-rd-border rounded-[12px] overflow-hidden"
                >
                  <button
                    onClick={() =>
                      setExpandedRoleId(expanded ? `closed-${r.id}` : r.id)
                    }
                    className="w-full text-left px-3 py-2.5 flex items-center gap-2"
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${band.dot} flex-shrink-0`}
                    />
                    <span className="flex-1 min-w-0 font-display font-bold text-[12.5px] leading-[1.25] text-rd-text">
                      {r.title}
                    </span>
                    {typeof r.match_score === "number" && (
                      <span
                        className={`font-display font-extrabold text-[11px] rounded-full px-2 py-0.5 ${band.tintBg} ${band.ink}`}
                      >
                        {toPct(r.match_score)}%
                      </span>
                    )}
                    {expanded ? (
                      <ChevronUp className="w-3.5 h-3.5 text-rd-text-secondary flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-rd-text-secondary flex-shrink-0" />
                    )}
                  </button>
                  {expanded && (
                    <div className="px-3 pb-3">
                      {(qualifiedAvailable || pathAvailable) && (
                        <div className="flex flex-col gap-1.5">
                          {qualifiedAvailable && (
                            <AxisBar
                              label="Qualified now"
                              value={qualified}
                              fill={band.barFill}
                              track={band.barTrack}
                            />
                          )}
                          {pathAvailable && (
                            <AxisBar
                              label={`Moves you to ${goalName}`}
                              value={path}
                              fill={band.barFill}
                              track={band.barTrack}
                            />
                          )}
                        </div>
                      )}
                      {(matched.length > 0 || gaps.length > 0) && (
                        <div className="flex flex-wrap gap-1.5 mt-2.5">
                          {matched.map((s) => (
                            <span
                              key={s}
                              className="inline-flex items-center gap-1 text-[10px] bg-rd-teal-tint text-rd-teal-dark rounded-[6px] px-2 py-0.5"
                            >
                              <Check className="w-2.5 h-2.5" />{" "}
                              {humanizeSkillId(s)}
                            </span>
                          ))}
                          {gaps.map((s) => (
                            <span
                              key={s}
                              className="inline-flex items-center gap-1 text-[10px] bg-rd-golden-tint text-rd-golden-dark rounded-[6px] px-2 py-0.5"
                            >
                              <Plus className="w-2.5 h-2.5" />{" "}
                              {humanizeSkillId(s)}
                            </span>
                          ))}
                        </div>
                      )}
                      <Link
                        to={createPageUrl("Roadmap")}
                        className="inline-flex items-center gap-1 mt-2.5 text-[11px] font-medium text-rd-coral-dark hover:text-rd-text transition-colors"
                      >
                        Full role detail <ChevronRight className="w-3 h-3" />
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// Phase-grouping tile inside the dismissible "How to use this pipeline"
// card. Inline-styled tints so we don't have to thread Tailwind
// arbitrary-value backgrounds for each tone. Preserved verbatim from
// Tracker.jsx's HowToTile (renamed because this lives on a different
// surface now).
function PipelineGuideTile({ tint, accent, head, body, highlight = false }) {
  return (
    <div className="rounded-[14px] px-3.5 py-3" style={{ background: tint }}>
      <p
        className="font-display font-bold text-[12.5px] leading-tight inline-flex items-center gap-1.5"
        style={{ color: accent }}
      >
        {highlight && <Star className="w-3 h-3" aria-hidden="true" />}
        {head}
      </p>
      <p
        className="text-[11.5px] leading-[1.45] mt-1.5"
        style={{ color: accent }}
      >
        {body}
      </p>
    </div>
  );
}

function AxisBar({ label, value, fill, track }) {
  // RULINGS.md (b): explanatory axes render as bars with NO numerals.
  // The bar fill is the sole carrier of magnitude; the label names the
  // axis. Removing the trailing percent span here is the load-bearing
  // edit — keep it that way.
  const v = Math.max(0, Math.min(100, value || 0));
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-rd-text-secondary w-[104px] flex-shrink-0">
        {label}
      </span>
      <span className={`flex-1 h-1.5 rounded-full ${track} overflow-hidden`}>
        <span
          className={`block h-full rounded-full ${fill}`}
          style={{ width: `${v}%` }}
        />
      </span>
    </div>
  );
}
