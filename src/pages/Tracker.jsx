import React, { useState, useMemo } from "react";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, X, Briefcase, Star } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { track, EVENTS } from "@/lib/analytics";
import ApplicationRow from "../components/tracker/ApplicationRow";
import { scoreApplication } from "@/lib/scoreApplication";
import { stripHtml } from "../../scripts/lib/normalize.ts";
import { TRACKER_CSS } from "../components/tracker/trackerStyles";
import { useProfileQuery } from "@/lib/queries/useProfile";

// PR 3E — Tracker restyled on rd tokens. Restyle-only on behavior; every
// write path, schema enum, and audit contract is preserved verbatim (see
// P1–P17 in tasks/redesign.md). Track pills migrate to TRACK_CONFIG.rdColor
// (coral/teal/golden) — Tracker is the last surface still on the legacy
// `color` field; this completes the rd-palette migration.
//
// Carry-forward (cleanup follow-up): TRACKER_CSS is injected ONCE here at
// the page-root so the per-tab subcomponents (CVManagement, SkillsRequired,
// ProjectsProof, NetworkingReferrals, InterviewPrep, FollowUp) that still
// consume `.tk-*` classes inside their bodies keep rendering. The Tracker
// page chrome itself uses Tailwind + rd tokens directly. Deleting
// trackerStyles.js + restyling those 6 inner components is a follow-up PR.

const STATUS_FILTERS = ["all", "interested", "preparing", "applied", "interviewing", "offer", "accepted", "rejected"];

const STATUS_PILL_LABELS = {
  all:          "All",
  interested:   "Interested",
  preparing:    "Preparing",
  applied:      "Applied",
  interviewing: "Interviewing",
  offer:        "Offer",
  accepted:     "Accepted",
  rejected:     "Rejected",
};

export default function Tracker() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState("all");
  const [newApp, setNewApp] = useState({ role_title: "", company: "", status: "interested" });

  const [jobDescription, setJobDescription] = useState("");
  const [importError, setImportError] = useState("");
  const [addingApp, setAddingApp] = useState(false);

  // Profile (skills_canonical) feeds the Skills tab's live matched/missing
  // derivation — see SkillsRequired.jsx + computeSkillMatch. Loaded here at
  // the page root and threaded through ApplicationRow so every row re-derives
  // against the user's CURRENT skills without each row firing its own query.
  const { data: profile } = useProfileQuery(user?.id);

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ["applications", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("applications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Cross-reference jobs cache for tracked rows that came from Browse Jobs
  // (those have ats_source + external_id populated). When the matching row
  // in public.jobs has is_active=false, surface a "may no longer be active"
  // badge on that ApplicationRow.
  const atsLinkedKeys = useMemo(() => {
    return applications
      .filter((a) => a.ats_source && a.external_id)
      .map((a) => ({ ats: a.ats_source, ext: a.external_id }));
  }, [applications]);

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
          console.warn("[tracker] inactive cross-ref failed:", error.message);
          continue;
        }
        for (const j of data || []) inactive.add(`${ats}|${j.external_id}`);
      }
      return inactive;
    },
    enabled: !!user?.id && atsLinkedKeys.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  // P1: handleAdd preserved byte-equivalent — insert payload, stripHtml on
  // the paste-boundary JD, analytics event, cache invalidation, and the
  // scoreApplication chain when JD is non-empty all carry over.
  const handleAdd = async () => {
    if (!newApp.role_title) return;
    setAddingApp(true);
    const jd = stripHtml(jobDescription || newApp.job_description || "") || "";

    const { data: inserted, error } = await supabase.from("applications").insert({
      user_id: user.id,
      role_title: newApp.role_title,
      company: newApp.company,
      status: newApp.status,
      source: "manual",
      ...(jd && { job_description: jd }),
    }).select("id").single();
    if (error) {
      console.error("Error adding application:", error);
      setImportError(`Could not add application: ${error.message}`);
      setAddingApp(false);
      return;
    }

    track(EVENTS.APPLICATION_TRACKED, { source: "manual", has_jd: !!jd });

    setNewApp({ role_title: "", company: "", status: "interested" });
    setJobDescription("");
    setShowAdd(false);
    setAddingApp(false);
    queryClient.invalidateQueries({ queryKey: ["applications"] });
    if (inserted?.id && jd) scoreApplication(supabase, queryClient, inserted.id, jd, user.id);
  };

  const filtered =
    filter === "all"
      ? applications
      : applications.filter((a) => a.status === filter);

  return (
    <>
      {/* Single page-root injection so the per-tab subcomponents
          (CVManagement, SkillsRequired, etc) that still reference
          `.tk-*` classes keep rendering. Tracker page chrome itself
          uses Tailwind + rd tokens directly. */}
      <style>{TRACKER_CSS}</style>

      <div className="max-w-5xl mx-auto px-5 sm:px-8 py-8 sm:py-10">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <p className="text-[10.5px] uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow font-mono">
              Tracker
            </p>
            <h1 className="font-display font-extrabold text-[32px] sm:text-[36px] leading-[1.08] tracking-tight text-rd-text mt-1">
              Every role, every step, every outcome.
            </h1>
            <p className="text-[13.5px] text-rd-text-secondary leading-[1.55] mt-2 max-w-2xl">
              Track every application end-to-end. Don&apos;t lose interview prep or follow-ups in the cracks.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="flex-shrink-0 inline-flex items-center gap-1.5 font-display font-bold text-[13px] text-white bg-rd-coral hover:bg-rd-coral-dark rounded-full px-4 py-2.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add application
          </button>
        </div>

        {/* How to use card — grouped 7-step framing tiles per the
            mockup's three-phase color treatment. */}
        <div className="mt-7 rounded-[18px] border border-rd-border bg-rd-bg-card p-5 shadow-rd">
          <p className="text-[10.5px] uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow font-mono">
            How to use this tracker
          </p>
          <p className="text-[13.5px] text-rd-text-secondary leading-[1.55] mt-1.5">
            Every application has a <strong className="text-rd-text font-display font-bold">7-step process</strong>. Open any application and go to the <strong className="text-rd-text font-display font-bold">📋 Steps</strong> tab. Work through each step before submitting — candidates who skip steps are the ones who get ignored.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mt-4">
            <HowToTile
              tint="var(--rd-golden-tint)"
              accent="var(--rd-golden-dark)"
              head="Steps 1–2"
              body="Qualify yourself. Dissect the job description. Know the role before applying."
            />
            <HowToTile
              tint="var(--rd-teal-tint)"
              accent="var(--rd-teal-dark)"
              head="Steps 3–5"
              body="Tailor your CV, map skill evidence, and find a referral contact at the company."
            />
            <HowToTile
              tint="var(--rd-coral-tint)"
              accent="var(--rd-coral-dark)"
              head="Steps 6–7"
              body="Submit your application, then prep for the interview with STAR-format answers."
            />
            <HowToTile
              tint="var(--rd-golden-tint)"
              accent="var(--rd-golden-dark)"
              head="⭐ Referral = your biggest edge"
              body="Many companies offer referral bonuses to employees when a referred candidate gets hired. They're incentivised to get you in."
              highlight
            />
          </div>
        </div>

        {/* Status filters */}
        <div className="flex gap-2 mt-7 mb-5 overflow-x-auto pb-1">
          {STATUS_FILTERS.map((s) => {
            const selected = filter === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setFilter(s)}
                aria-pressed={selected}
                className={[
                  "inline-flex items-center font-display font-bold text-[12.5px] rounded-full px-3.5 py-1.5 transition-colors duration-150 whitespace-nowrap",
                  selected
                    ? "bg-rd-text text-white"
                    : "bg-rd-bg-card text-rd-text-secondary border border-rd-border hover:border-rd-border-hover hover:text-rd-text",
                ].join(" ")}
              >
                {STATUS_PILL_LABELS[s]}
              </button>
            );
          })}
        </div>

        {/* Applications */}
        {isLoading ? (
          <TrackerRowSkeleton />
        ) : filtered.length === 0 ? (
          <div className="rounded-[18px] border border-rd-border bg-rd-bg-card px-6 py-10 shadow-rd text-center">
            <Briefcase className="w-10 h-10 text-rd-coral mx-auto mb-3" />
            <p className="text-[13.5px] text-rd-text-secondary leading-[1.55] max-w-md mx-auto">
              {applications.length === 0
                ? "No applications yet. Add one manually or use the Career Roadmap to auto-create tracked roles."
                : "No applications match this filter."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((app) => (
              <ApplicationRow
                key={app.id}
                app={app}
                profile={profile}
                listingInactive={
                  Boolean(app.ats_source && app.external_id &&
                    inactiveExternalIds.has(`${app.ats_source}|${app.external_id}`))
                }
                onUpdate={() =>
                  queryClient.invalidateQueries({ queryKey: ["applications"] })
                }
              />
            ))}
          </div>
        )}

        {/* Add dialog */}
        <Dialog open={showAdd} onOpenChange={(open) => { setShowAdd(open); if (!open) setImportError(""); }}>
          <DialogContent className="bg-rd-bg-card border border-rd-border rounded-[18px]">
            <DialogHeader>
              <DialogTitle className="font-display font-extrabold text-[20px] text-rd-text">
                Add application
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-2">
              {importError && (
                <div className="flex items-center gap-2 rounded-[14px] border border-[#FECACA] bg-[#FEF2F2] px-3.5 py-2.5 text-[12.5px] text-[#991B1B]">
                  {importError}
                </div>
              )}
              <div>
                <label className="block text-[12px] font-display font-semibold text-rd-text mb-1.5">
                  Role title
                </label>
                <input
                  value={newApp.role_title}
                  onChange={(e) => setNewApp({ ...newApp, role_title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-[10px] border border-rd-border bg-rd-bg-card text-rd-text text-[13.5px] placeholder:text-rd-text-secondary/70 outline-none transition-[border-color,box-shadow] duration-150 focus:border-rd-coral focus:shadow-[0_0_0_3px_var(--rd-coral-tint)]"
                  placeholder="e.g. Junior Data Analyst"
                />
              </div>
              <div>
                <label className="block text-[12px] font-display font-semibold text-rd-text mb-1.5">
                  Company
                </label>
                <input
                  value={newApp.company}
                  onChange={(e) => setNewApp({ ...newApp, company: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-[10px] border border-rd-border bg-rd-bg-card text-rd-text text-[13.5px] placeholder:text-rd-text-secondary/70 outline-none transition-[border-color,box-shadow] duration-150 focus:border-rd-coral focus:shadow-[0_0_0_3px_var(--rd-coral-tint)]"
                  placeholder="e.g. Google"
                />
              </div>
              <div>
                <label className="block text-[12px] font-display font-semibold text-rd-text mb-1.5">
                  Job description{" "}
                  <span className="text-rd-text-tertiary font-normal">
                    (optional — AI will use this to set the track)
                  </span>
                </label>
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste the job description here..."
                  rows={5}
                  className="w-full px-3.5 py-2.5 rounded-[10px] border border-rd-border bg-rd-bg-card text-rd-text text-[13.5px] placeholder:text-rd-text-secondary/70 outline-none transition-[border-color,box-shadow] duration-150 focus:border-rd-coral focus:shadow-[0_0_0_3px_var(--rd-coral-tint)] resize-y min-h-[110px]"
                />
                {!jobDescription && !newApp.job_description && (
                  <p className="text-[11px] text-rd-text-secondary mt-1.5 leading-snug">
                    Without AI classification, track will be unset. Add the role to your Career Roadmap to get track classification.
                  </p>
                )}
              </div>
            </div>
            <DialogFooter className="gap-2">
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="inline-flex items-center gap-1.5 font-display font-semibold text-[13px] text-rd-text bg-rd-bg-card border border-rd-border hover:border-rd-border-hover rounded-full px-4 py-2 transition-colors"
              >
                <X className="w-3.5 h-3.5" />Cancel
              </button>
              <button
                type="button"
                onClick={handleAdd}
                disabled={addingApp || !newApp.role_title}
                className="inline-flex items-center gap-1.5 font-display font-bold text-[13px] text-white bg-rd-coral hover:bg-rd-coral-dark disabled:opacity-50 disabled:cursor-not-allowed rounded-full px-4 py-2 transition-colors"
              >
                {addingApp ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" />Analysing…</>
                ) : "Add"}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}

// Phase-grouping tile inside the "How to use" card. Inline-styled tints
// so we don't have to thread Tailwind arbitrary-value backgrounds for
// each tone — and so the card surface uses the same warm-tint vocabulary
// the grouped 7-step checklist will use inside each row.
function HowToTile({ tint, accent, head, body, highlight = false }) {
  return (
    <div
      className="rounded-[14px] px-3.5 py-3"
      style={{ background: tint }}
    >
      <p
        className="font-display font-bold text-[12.5px] leading-tight inline-flex items-center gap-1.5"
        style={{ color: accent }}
      >
        {highlight && <Star className="w-3 h-3" aria-hidden="true" />}
        {head}
      </p>
      <p className="text-[11.5px] leading-[1.45] mt-1.5" style={{ color: accent }}>
        {body}
      </p>
    </div>
  );
}

// Row-list skeleton — replaces the applications list while the
// applications query is loading. Renders 5 placeholder rows.
function TrackerRowSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="bg-rd-bg-card rounded-[18px] border border-rd-border px-5 py-4 flex items-center gap-3 shadow-rd"
        >
          <Skeleton className="h-9 w-9 rounded-md flex-shrink-0" />
          <div className="flex-1 min-w-0 space-y-2">
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full flex-shrink-0" />
        </div>
      ))}
    </div>
  );
}
