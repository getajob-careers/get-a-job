// CvMatchedRolesRail - the CV tab's right rail: the user's matched roles, each
// card with Track + Tailor CV. Promoted from the Home3TabCvTab preview's
// TopMatchesPanel, with the two deferred items now real:
//   1. Tracked state reads the ["applications"] cache (single source of truth),
//      reconciled on the (ats_source, external_id) composite - fixes the old
//      local-Set-keyed-on-job.id divergence.
//   2. Tailor CV auto-adds the role to the tracker (earliest stage) and links a
//      freshly generated tailored CV to that application row, then loads it in
//      the studio. Idempotent: an already-tracked role is never duplicated.
//
// Rendered only in the flag-on CV tab (passed to CVStudioLive as `rightRail` by
// ThreeTabHome); the flag-off /CVAgent surface keeps the CV Agent panel.

import React, { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, AlertCircle, Check, Plus, Wand2 } from "lucide-react";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import JobGridCard from "@/components/jobs/JobGridCard";
import JobDetailModal from "@/components/jobs/JobDetailModal";
import { addJobToTracker } from "@/components/jobs/JobCard";
import { applicationCvsQueryKey } from "@/lib/queries/useApplicationCvs";
import { TRACK_CONFIG } from "@/lib/trackConfig";
import { useTopMatches } from "./useTopMatches";

// Tracked lookup from the pipeline cache. Reconcile on the (ats_source,
// external_id) composite (the join key addJobToTracker + HomeTrackerTab use),
// falling back to a case-insensitive role-title match for manual rows with no
// external id. NOT job.id, and NOT a job_id FK (removed in PR #134).
function keyFor(atsSource, externalId) {
  return `${atsSource}|${externalId}`;
}

export default function CvMatchedRolesRail() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [, setSearchParams] = useSearchParams();
  const { picks, stretch, scoredById, isLoading, isError, noRoles } =
    useTopMatches();

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

  const isTracked = useMemo(() => {
    const byComposite = new Set();
    const byTitle = new Set();
    for (const a of applications) {
      if (a.ats_source && a.external_id)
        byComposite.add(keyFor(a.ats_source, a.external_id));
      if (a.role_title) byTitle.add(a.role_title.trim().toLowerCase());
    }
    return (job) => {
      if (
        job.ats_source &&
        job.external_id &&
        byComposite.has(keyFor(job.ats_source, job.external_id))
      )
        return true;
      const t = (job.title || "").trim().toLowerCase();
      return t ? byTitle.has(t) : false;
    };
  }, [applications]);

  const [openJob, setOpenJob] = useState(null);
  const [trackingId, setTrackingId] = useState(null);
  const [tailoringId, setTailoringId] = useState(null);

  // Resolve the application_id for a job from the pipeline cache (addJobToTracker
  // updates it in place before it resolves), with a direct-query fallback so the
  // CV always links to a real row even on a cold cache.
  const resolveApplicationId = useCallback(
    async (job) => {
      const cached =
        /** @type {any[]} */ (
          queryClient.getQueryData(["applications", user.id])
        ) || [];
      const match = cached.find(
        (a) =>
          (a.ats_source &&
            a.external_id &&
            a.ats_source === job.ats_source &&
            a.external_id === job.external_id) ||
          (!job.external_id &&
            (a.role_title || "").trim().toLowerCase() ===
              (job.title || "").trim().toLowerCase()),
      );
      if (match?.id && !String(match.id).startsWith("pending-"))
        return match.id;
      let q = supabase
        .from("applications")
        .select("id")
        .eq("user_id", user.id)
        .limit(1);
      if (job.ats_source && job.external_id)
        q = q
          .eq("ats_source", job.ats_source)
          .eq("external_id", job.external_id);
      else q = q.ilike("role_title", job.title);
      const { data } = await q;
      return data?.[0]?.id || null;
    },
    [queryClient, user],
  );

  const handleTrack = useCallback(
    async (job, scoreResult) => {
      if (trackingId || isTracked(job)) return;
      setTrackingId(job.id);
      const res = await addJobToTracker({
        user,
        queryClient,
        job,
        scoreResult,
      });
      setTrackingId(null);
      if (res?.error) {
        toast.error("Couldn't add to your tracker - try again.");
        return;
      }
      toast.success(
        res?.duplicate ? "Already in your tracker." : "Added to your tracker.",
      );
    },
    [trackingId, isTracked, user, queryClient],
  );

  // Tailor CV: auto-add (idempotent) -> generate a tailored CV linked to the
  // application row -> load it in the studio. The generate call regenerates the
  // whole document server-side (tens of seconds); the card shows an in-progress
  // state so it never looks frozen.
  const handleTailor = useCallback(
    async (job, scoreResult) => {
      if (tailoringId) return;
      setTailoringId(job.id);
      try {
        const alreadyTracked = isTracked(job);
        const res = await addJobToTracker({
          user,
          queryClient,
          job,
          scoreResult,
        });
        if (res?.error) {
          toast.error("Couldn't start tailoring - try again.");
          return;
        }
        const applicationId = await resolveApplicationId(job);
        if (!applicationId) {
          toast.error("Couldn't link the CV to your tracker - try again.");
          return;
        }
        const { data, error } = await supabase.functions.invoke(
          "generate-tailored-cv",
          {
            body: {
              target_role: job.title,
              application_id: applicationId,
              cv_model: "sonnet",
            },
          },
        );
        if (error || !data || data.error) {
          toast.error("Couldn't generate the tailored CV - try again.");
          return;
        }
        queryClient.invalidateQueries({ queryKey: ["applications"] });
        queryClient.invalidateQueries({
          queryKey: applicationCvsQueryKey(user.id),
        });
        toast.success(
          alreadyTracked
            ? "Tailored CV ready."
            : "Added to your tracker - tailored CV ready.",
        );
        // Deep-link the new CV; CVStudioLive's ?application_id selection effect
        // resolves it and loads the copy in the editor.
        setSearchParams(
          (prev) => {
            const n = new URLSearchParams(prev);
            n.set("application_id", data.application_id || applicationId);
            n.delete("cv");
            return n;
          },
          { replace: true },
        );
      } finally {
        setTailoringId(null);
      }
    },
    [
      tailoringId,
      isTracked,
      user,
      queryClient,
      resolveApplicationId,
      setSearchParams,
    ],
  );

  return (
    <div className="flex flex-col gap-3 h-full overflow-y-auto cv-scroll px-4 py-4">
      <h2 className="font-display font-bold rd-t-body-m text-rd-text px-0.5">
        Your matched roles
      </h2>

      {isLoading ? (
        <div className="rd-r-md border border-rd-border bg-rd-bg-card px-4 py-8 text-center">
          <Loader2 className="w-5 h-5 animate-spin text-rd-text-secondary mx-auto mb-2" />
          <p className="rd-t-body-s text-rd-text-secondary">
            Finding your matches…
          </p>
        </div>
      ) : isError ? (
        <div className="flex items-center gap-2 rd-r-md border border-rd-coral/40 bg-rd-coral-tint px-3.5 py-3 rd-t-body-s text-rd-coral-dark">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>Couldn't load matches - try again.</span>
        </div>
      ) : noRoles ? (
        <div className="rd-r-md border border-rd-border bg-rd-bg-card px-4 py-6 text-center">
          <p className="rd-t-body-s text-rd-text-secondary leading-[1.5]">
            Run your Career Roadmap to generate matched roles, then your matches
            show up here.
          </p>
        </div>
      ) : picks.length === 0 && stretch.length === 0 ? (
        <div className="rd-r-md border border-rd-border bg-rd-bg-card px-4 py-6 text-center">
          <p className="rd-t-body-s text-rd-text-secondary leading-[1.5]">
            No matches right now - check the Browse Jobs tab for the full
            search.
          </p>
        </div>
      ) : (
        <>
          {picks.length > 0 && (
            <MatchSection
              title="Our picks for you"
              jobs={picks}
              scoredById={scoredById}
              isTracked={isTracked}
              trackingId={trackingId}
              tailoringId={tailoringId}
              onOpen={setOpenJob}
              onTrack={handleTrack}
              onTailor={handleTailor}
            />
          )}
          {stretch.length > 0 && (
            <MatchSection
              title="Worth a stretch"
              jobs={stretch}
              scoredById={scoredById}
              isTracked={isTracked}
              trackingId={trackingId}
              tailoringId={tailoringId}
              onOpen={setOpenJob}
              onTrack={handleTrack}
              onTailor={handleTailor}
            />
          )}
        </>
      )}

      {openJob && (
        <JobDetailModal
          job={openJob.job}
          scoreResult={openJob.scoreResult}
          trackColor={openJob.trackColor}
          unified
          onClose={() => setOpenJob(null)}
        />
      )}
    </div>
  );
}

function MatchSection({
  title,
  jobs,
  scoredById,
  isTracked,
  trackingId,
  tailoringId,
  onOpen,
  onTrack,
  onTailor,
}) {
  return (
    <div>
      <p className="rd-t-micro uppercase tracking-[0.08em] font-medium text-rd-text-eyebrow font-mono mb-1.5 px-0.5">
        {title}
      </p>
      <div className="flex flex-col gap-2">
        {jobs.map((job) => {
          const scoreResult = scoredById[job.id];
          const perJobTrack = scoreResult?.track;
          const trackColor = perJobTrack
            ? TRACK_CONFIG[perJobTrack]?.rdColor
            : null;
          const tracked = isTracked(job);
          const tracking = trackingId === job.id;
          const tailoring = tailoringId === job.id;
          // While ANY card is tailoring, disable Tailor on the others - the
          // generate call is heavy and single-flight keeps it honest.
          const tailorLocked = tailoringId && !tailoring;
          return (
            <div key={job.id} className="flex flex-col gap-1.5">
              <JobGridCard
                job={job}
                scoreResult={scoreResult}
                trackColor={trackColor}
                unified
                onOpen={(j, s) =>
                  onOpen({ job: j, scoreResult: s, trackColor })
                }
              />
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => onTrack(job, scoreResult)}
                  disabled={tracked || tracking || tailoring}
                  className="flex-1 inline-flex items-center justify-center gap-1 font-display font-semibold rd-t-micro rounded-full px-2.5 py-1.5 transition-colors disabled:cursor-not-allowed"
                  style={
                    tracked
                      ? {
                          background: "var(--rd-teal-tint)",
                          color: "var(--rd-teal-dark)",
                        }
                      : {
                          background: "var(--rd-bg-soft)",
                          color: "var(--rd-text)",
                        }
                  }
                >
                  {tracking ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : tracked ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <Plus className="w-3 h-3" />
                  )}
                  {tracked ? "Tracked" : "Track"}
                </button>
                <button
                  type="button"
                  onClick={() => onTailor(job, scoreResult)}
                  disabled={tailoring || tailorLocked}
                  className="flex-1 inline-flex items-center justify-center gap-1 font-display font-semibold rd-t-micro rounded-full px-2.5 py-1.5 bg-rd-coral text-white hover:bg-rd-coral-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title={
                    tracked
                      ? "Generate a tailored CV for this role"
                      : "Generate a tailored CV - adds this role to your tracker"
                  }
                >
                  {tailoring ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Tailoring…
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-3 h-3" />
                      Tailor CV
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
