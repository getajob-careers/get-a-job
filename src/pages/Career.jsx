/*
 * Career.jsx — the primary career surface: matched roles + a live jobs
 * feed + the application pipeline, in one place.
 *
 * PR2 (/career ← unified-feed integration) retired the track-card model.
 * The page no longer owns a forked, track-scoped live-jobs query: the live
 * feed is now the SAME <UnifiedJobsFeed> /jobs renders (one implementation,
 * no drift), self-fetching profile / experiences / career_roles through the
 * canonical query hooks. Career keeps three things of its own:
 *   1. "Your matched roles" — a flat, track-agnostic list of career_roles
 *      ordered by fit-quality tier (sweet spot → growth → detour) then
 *      match_score, each row carrying its own track band styling;
 *   2. the inline application pipeline (strip + kanban + drawers);
 *   3. the header-level "how tracks work" explainer.
 *
 * Data contracts: career_roles via the canonical useCareerRolesQuery hook
 * (shared key with the feed — the #336/#178 same-key/different-shape fix);
 * applications via the wide ["applications", uid] cache Home + Tracker share.
 * The old /Roadmap and /Jobs routes stay alive (deep links + roadmap
 * generation live there) until PR3.
 *
 * Seniority pre-filtering + per-track live-jobs scoring moved INTO
 * <UnifiedJobsFeed> with the feed; Career no longer derives a seniority
 * allow-list or scores jobs itself.
 */

import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useProfileQuery } from "@/lib/queries/useProfile";
import { Link, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  HelpCircle,
  Plus,
  ChevronRight,
  Loader2,
  X,
  Star,
  AlertCircle,
  Briefcase,
} from "lucide-react";
import RdCard from "@/components/redesign/RdCard";
import RdFunnelTile from "@/components/redesign/RdFunnelTile";
import MatchedRolesPanel, {
  sortMatchedRoles,
  resolveActiveRoleId,
} from "@/components/career/MatchedRolesPanel";
import { isAuthError, recoverFromAuthError } from "@/lib/authRecovery";
import UnifiedJobsFeed from "@/components/jobs/UnifiedJobsFeed";
import { useCareerRolesQuery } from "@/lib/queries/useCareerRoles";
import { FUNNEL_BUCKETS } from "@/lib/funnelBuckets";
import { useAgentDrawer } from "@/lib/AgentDrawerContext";
import { buildCareerPageContext } from "@/lib/buildCareerPageContext";
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

export default function Career() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [whyOpen, setWhyOpen] = useState(false);

  // ── PR-A2: inline expandable pipeline board ─────────────────────────
  // Board open state is URL-driven via ?pipeline=open so deep links from
  // Home / Calendar / the redirected /Tracker route can land on it
  // open. Strip toggling syncs the param via history.replaceState (no
  // nav, no scroll jump). Collapse state persists for the session only —
  // a fresh visit without ?pipeline=open shows the board collapsed.
  const boardOpen = searchParams.get("pipeline") === "open";
  // The fixed shell (only-the-job-list-scrolls) applies only while the pipeline
  // board is COLLAPSED. When the board expands it's a tall flex child that would
  // otherwise crush the flex-1 jobs row to zero height under the root's
  // overflow-hidden (jobs vanish, nothing scrolls) — so with the board open we
  // revert to normal page scroll. The wheel-forwarder self-disables to match
  // (it checks whether the jobs column is actually a scroll container).
  const fixedShell = !boardOpen;
  // Top-level Career tabs. "Pipeline" is the same ?pipeline=open URL state the
  // deep links use (Home / Calendar / the redirected /Tracker), so they land on
  // the pipeline tab; everything else defaults to the job-search tab.
  const activeTab = boardOpen ? "pipeline" : "search";
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
  const [expandedRoleId, setExpandedRoleId] = useState(null);

  const { data: profile } = useProfileQuery(user?.id);

  // Wide applications query — same canonical key + select Home + Tracker
  // already use, so this surface joins the shared cache rather than
  // narrowing it (PR #178 / lesson 2026-05-28). The funnel strip below
  // reads counts off this cache; JobCard's optimistic Apply path prepends
  // into the same key in the same frame the button toggles to Tracked.
  const {
    data: applications = [],
    isLoading: applicationsLoading,
    isError: applicationsError,
    error: applicationsErrorObj,
    refetch: refetchApplications,
  } = useQuery({
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

  // A degraded read (stale/desynced JWT → 401, or session dropped → 200 with 0
  // rows) must NEVER masquerade as "you have 0 applications". On an auth error,
  // optionally self-heal the session (flag-gated, one-shot, no loops); the board
  // renders an explicit error state below rather than the empty state.
  useEffect(() => {
    if (applicationsError && isAuthError(applicationsErrorObj)) {
      recoverFromAuthError(applicationsErrorObj).then((recovered) => {
        if (recovered) refetchApplications();
      });
    }
  }, [applicationsError, applicationsErrorObj, refetchApplications]);

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

  // Canonical career_roles read (PR2): same hook + key <UnifiedJobsFeed>
  // uses, so Career's Matched Roles and the feed share one cache entry and
  // one analysis-pending poll instead of two reads on the same key with
  // different projections (the #336/#178 same-key/different-shape poison).
  const { data: roles = [], isLoading: loadingRoles } = useCareerRolesQuery(
    user?.id,
    { profile },
  );

  // Flat, track-agnostic Matched Roles list (PR2). Ordered by fit-quality
  // TIER first — sweet spot (track_1), then growth (track_3), then detour
  // (track_2) — and by match_score DESC within a tier. Tier-before-score is
  // deliberate: on live data a 0.92 detour would outrank a 0.847 sweet-spot
  // role under a flat match_score sort, burying the role the user should act
  // on first. Unknown tracks sort last.
  const sortedRoles = useMemo(() => sortMatchedRoles(roles), [roles]);

  const goalName = profile?.five_year_role || "your 5-year goal";

  // First matched role opens by default; falls back to the top role once
  // the user collapses the open one (the closed-<id> sentinel never matches).
  const effectiveExpandedId = resolveActiveRoleId(sortedRoles, expandedRoleId);

  // B3 visible-list ids — the exact ORDER rendered in the Matched Roles rail
  // (tier then match_score). The live-jobs list now lives inside
  // <UnifiedJobsFeed>, which owns its own scoring + order, so Career no longer
  // surfaces visible JOB ids here — only the roles it renders.
  const visibleRoleIds = useMemo(
    () => sortedRoles.map((r) => r.id),
    [sortedRoles],
  );

  // The live jobs list lives inside <UnifiedJobsFeed>; it reports its on-screen
  // ids + the open detail-modal id up here so the page context can carry them.
  // Keep the array identity stable while the ids are unchanged so the
  // page-context effect below doesn't thrash.
  const [feedVisibleJobIds, setFeedVisibleJobIds] = useState([]);
  const [feedOpenJobId, setFeedOpenJobId] = useState(null);
  const handleFeedContext = useCallback(({ visibleJobIds, openJobId }) => {
    setFeedVisibleJobIds((prev) =>
      prev.length === visibleJobIds.length &&
      prev.every((id, i) => id === visibleJobIds[i])
        ? prev
        : visibleJobIds,
    );
    setFeedOpenJobId(openJobId ?? null);
  }, []);

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
  // Depend on the STABLE setPageContext (a useCallback), not the whole
  // agentDrawer object, which changes identity every time isOpen/pageContext
  // updates. With agentDrawer in the deps the effect ping-pongs: its cleanup
  // fires setPageContext(null) then the body sets the ctx back, each a real
  // state change that mints a new agentDrawer and re-triggers the effect, so
  // React caps it at "Maximum update depth exceeded". setPageContext keeps a
  // fixed identity, so the effect now re-runs only when the page-context
  // inputs actually change. Same fix Home.jsx already carries.
  const { setPageContext } = agentDrawer;
  useEffect(() => {
    setPageContext(
      buildCareerPageContext({
        // No selected track anymore (track-card model retired). The live jobs
        // list lives inside <UnifiedJobsFeed>, which now reports its on-screen
        // ids + the open detail-modal id up via onPageContextChange - the helper
        // omits falsy entities.
        selectedTrack: null,
        roleId: effectiveExpandedId,
        applicationId: drawerAppId,
        jobId: feedOpenJobId,
        visibleJobIds: feedVisibleJobIds,
        visibleRoleIds,
      }),
    );
    return () => setPageContext(null);
  }, [
    effectiveExpandedId,
    drawerAppId,
    feedOpenJobId,
    feedVisibleJobIds,
    visibleRoleIds,
    setPageContext,
  ]);

  // Fixed shell (md+): the page itself doesn't scroll, so wheeling over the
  // empty margins beside the centered content, the header/pipeline, or the
  // matched-roles panel would otherwise do nothing. Attach to <main> (it spans
  // the full width, margins included) and forward the wheel to the job list —
  // UNLESS it lands on something that can absorb the scroll itself (the job
  // list, the matched-roles panel when its list overflows, any inner scroller),
  // which we let scroll natively. Mobile keeps native page scroll.
  const jobsColRef = useRef(null);
  const mainWheelCleanup = useRef(null);
  const rootRef = useCallback((node) => {
    if (mainWheelCleanup.current) {
      mainWheelCleanup.current();
      mainWheelCleanup.current = null;
    }
    if (!node) return;
    const main = node.closest("main") || node.parentElement;
    if (!main) return;
    const absorbs = (target, dy) => {
      let el = target;
      while (el && el !== main) {
        const oy = getComputedStyle(el).overflowY;
        if (oy === "auto" || oy === "scroll") {
          if (dy > 0 && el.scrollTop + el.clientHeight < el.scrollHeight - 1)
            return true;
          if (dy < 0 && el.scrollTop > 0) return true;
        }
        el = el.parentElement;
      }
      return false;
    };
    const onWheel = (e) => {
      if (!window.matchMedia("(min-width: 768px)").matches) return; // mobile: native scroll
      const jobs = jobsColRef.current;
      if (!jobs || e.deltaY === 0) return;
      const joy = getComputedStyle(jobs).overflowY;
      if (joy !== "auto" && joy !== "scroll") return; // fixed shell off (board open) → native scroll
      if (absorbs(e.target, e.deltaY)) return; // a real scroller handles it
      jobs.scrollTop += e.deltaY;
      e.preventDefault();
    };
    main.addEventListener("wheel", onWheel, { passive: false });
    mainWheelCleanup.current = () => main.removeEventListener("wheel", onWheel);
  }, []);

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
              <Loader2 className="w-5 h-5 animate-spin text-rd-primary mx-auto" />
              <p className="font-display font-bold text-[18px] text-rd-text mt-4">
                Building your matches…
              </p>
              <p className="text-[12.5px] text-rd-text-secondary mt-2 max-w-md mx-auto">
                We’re analyzing your background to find your matched roles and
                live jobs. This usually takes under a minute and updates here
                automatically.
              </p>
            </>
          ) : (
            <>
              <p className="font-display font-bold text-[18px] text-rd-text">
                Generate your roadmap first
              </p>
              <p className="text-[12.5px] text-rd-text-secondary mt-2 max-w-md mx-auto">
                Your matched roles and live jobs all come from your career
                analysis.
              </p>
              <Link
                to={createPageUrl("Roadmap")}
                className="inline-flex items-center gap-1.5 mt-5 bg-rd-primary text-white font-display font-semibold text-[13px] rounded-full px-5 py-2.5"
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
    // md+: fill the scroll container (<main>) and become a fixed shell — the
    // header, explainer, pipeline and the matched-roles panel stay put while
    // ONLY the job list scrolls (see the two-column row + jobs column below).
    // On mobile the page scrolls normally.
    <div
      ref={rootRef}
      className={`max-w-[1080px] mx-auto px-5 sm:px-8 py-8 sm:py-10 ${fixedShell ? "md:h-full md:flex md:flex-col md:overflow-hidden" : ""}`}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display font-extrabold text-[26px] leading-[1.1] tracking-tight text-rd-text">
            Career
          </h1>
          <p className="text-[12.5px] text-rd-text-secondary mt-1">
            The roles you match, a live job feed tuned to them, and your
            application pipeline - one place.
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
          Every role is placed by two things - how{" "}
          <b className="text-rd-text">qualified</b> you are now, and whether it
          moves you toward <b className="text-rd-text">{goalName}</b>. Track 1
          is the sweet spot; Track 2 is a doable detour; Track 3 is what you
          grow into.
        </div>
      )}

      {/* Top-level Career tabs: browse jobs vs the application pipeline. The
          Pipeline tab is the ?pipeline=open URL state (preserved for the deep
          links from Home / Calendar / the redirected /Tracker). */}
      <div
        className="flex items-center gap-1 mt-4 border-b border-rd-border"
        role="tablist"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "search"}
          onClick={() => setBoardOpen(false)}
          className={`relative px-3.5 py-2.5 font-display font-bold text-[13.5px] transition-colors ${
            activeTab === "search"
              ? "text-rd-text"
              : "text-rd-text-secondary hover:text-rd-text"
          }`}
        >
          Job search
          {activeTab === "search" && (
            <span className="absolute left-2 right-2 -bottom-px h-[2px] bg-rd-primary rounded-full" />
          )}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "pipeline"}
          onClick={() => setBoardOpen(true)}
          className={`relative px-3.5 py-2.5 font-display font-bold text-[13.5px] transition-colors ${
            activeTab === "pipeline"
              ? "text-rd-text"
              : "text-rd-text-secondary hover:text-rd-text"
          }`}
        >
          Pipeline
          {activeTab === "pipeline" && (
            <span className="absolute left-2 right-2 -bottom-px h-[2px] bg-rd-primary rounded-full" />
          )}
        </button>
      </div>

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

          {/* Compact funnel overview (saved → applied → interview → offer). */}
          <div className="flex gap-1.5 mb-4">
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
                    tab. Work through each step before submitting - candidates
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
                  tint="var(--rd-primary-tint)"
                  accent="var(--rd-primary-dark)"
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
              className="flex-shrink-0 inline-flex items-center gap-1.5 font-display font-bold text-[12.5px] text-white bg-rd-primary hover:bg-rd-primary-dark rounded-full px-3.5 py-2 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add manually
            </button>
          </div>

          <div className="mt-3">
            {applicationsError ? (
              <RdCard className="px-6 py-10 text-center">
                <AlertCircle className="w-10 h-10 text-rd-primary mx-auto mb-3" />
                <p className="text-[13.5px] text-rd-text-secondary leading-[1.55] max-w-md mx-auto">
                  We couldn't load your applications.{" "}
                  {isAuthError(applicationsErrorObj)
                    ? "Your session may have expired - try refreshing the page or signing in again."
                    : "This is a loading problem, not an empty tracker - your applications are safe."}
                </p>
                <button
                  type="button"
                  onClick={() => refetchApplications()}
                  className="mt-4 text-[12.5px] font-medium text-rd-primary-dark underline underline-offset-2"
                >
                  Retry
                </button>
              </RdCard>
            ) : applicationsLoading ? (
              <div
                className="flex gap-3 overflow-x-auto pb-2"
                aria-hidden="true"
              >
                {APPLICATION_STATUSES.map((s) => (
                  <div key={s} className="flex-1 min-w-[200px]">
                    <div className="h-3.5 w-20 rounded bg-rd-bg-soft animate-pulse mb-3" />
                    <div className="flex flex-col gap-2">
                      <div className="h-16 rounded-[14px] bg-rd-bg-soft animate-pulse" />
                      <div className="h-16 rounded-[14px] bg-rd-bg-soft animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : applications.length === 0 ? (
              <RdCard className="px-6 py-10 text-center">
                <Briefcase className="w-10 h-10 text-rd-primary mx-auto mb-3" />
                <p className="text-[13.5px] text-rd-text-secondary leading-[1.55] max-w-md mx-auto">
                  No applications yet. Track one from the live-jobs list below -
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

      {/* Kept mounted (just hidden) on the Pipeline tab so returning to Job
          search doesn't remount the feed — preserves its fetched jobs, reveal
          count, and scroll position instead of re-rendering from scratch. */}
      <div
        className={`flex flex-col md:flex-row gap-4 mt-4 items-start ${boardOpen ? "hidden" : ""} ${fixedShell ? "md:flex-1 md:min-h-0" : ""}`}
      >
        {/* Left — the shared unified two-tab jobs feed. Career renders the
            SAME <UnifiedJobsFeed> as /jobs (one implementation, no forked
            track-scoped feed). It self-fetches profile / experiences / roles
            via the canonical hooks and owns its own scoring, search + tabs. */}
        <div
          ref={jobsColRef}
          className={`w-full md:flex-[1.55] min-w-0 ${fixedShell ? "md:h-full md:overflow-y-auto md:pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" : ""}`}
        >
          <UnifiedJobsFeed
            singleColumn
            onPageContextChange={handleFeedContext}
          />
        </div>

        {/* Right - matched roles why-panel. Extracted to a shared component
            (src/components/career/MatchedRolesPanel) so the Browse Jobs tab
            renders the SAME panel beside its feed. size="compact" +
            scrollSelf={fixedShell} + this width className reproduce Career's
            original inline layout; keep it byte-identical here. */}
        <MatchedRolesPanel
          roles={sortedRoles}
          goalName={goalName}
          expandedId={effectiveExpandedId}
          onToggle={setExpandedRoleId}
          scrollSelf={fixedShell}
          className="w-full md:flex-1 min-w-0"
        />
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
