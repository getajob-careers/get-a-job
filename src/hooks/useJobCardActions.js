import { useCallback, useContext, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/api/supabaseClient";
import { AuthContext } from "@/lib/AuthContext";
import { addJobToTracker } from "@/components/jobs/JobCard";
import { applicationCvsQueryKey } from "@/lib/queries/useApplicationCvs";

// Per-card Track / Generate-CV actions for the flag-on job card (Batch C) - the
// same idempotent flow the CV-tab matched-roles rail already uses (#635),
// extracted so the card and the rail share ONE implementation.
//
//   Track ("+")   -> addJobToTracker, idempotent (no duplicate). "tracked" reads
//                    the ["applications"] cache reconciled on the (ats_source,
//                    external_id) composite (role_title fallback) - the single
//                    source of truth, same join key as HomeTrackerTab.
//   Generate CV   -> auto-add (idempotent) -> generate-tailored-cv linked to the
//                    application row -> deep-link ?tab=cv&application_id so the CV
//                    tab opens the freshly generated copy.

function matchesJob(app, job) {
  if (app.ats_source && app.external_id && job.ats_source && job.external_id)
    return (
      app.ats_source === job.ats_source && app.external_id === job.external_id
    );
  if (!job.external_id)
    return (
      (app.role_title || "").trim().toLowerCase() ===
      (job.title || "").trim().toLowerCase()
    );
  return false;
}

export function useJobCardActions(job, scoreResult, { enabled = true } = {}) {
  // Read the context directly (not useAuth, which throws without a provider) so
  // JobGridCard stays mountable in provider-light tests / the flag-off path -
  // user is null there, which disables the query and no-ops the actions.
  const auth = useContext(AuthContext);
  const user = auth?.user ?? null;
  const queryClient = useQueryClient();
  const [, setSearchParams] = useSearchParams();

  // `enabled` is the flag-on gate: flag-off callers pass false so no applications
  // fetch happens on the flag-off /Jobs surface (which never renders the actions).
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
    enabled: !!user?.id && enabled,
  });

  const tracked = useMemo(
    () => applications.some((a) => matchesJob(a, job)),
    [applications, job],
  );
  const [tracking, setTracking] = useState(false);
  const [tailoring, setTailoring] = useState(false);

  const resolveApplicationId = useCallback(async () => {
    const cached =
      /** @type {any[]} */ (
        queryClient.getQueryData(["applications", user.id])
      ) || [];
    const m = cached.find(
      (a) => matchesJob(a, job) && !String(a.id).startsWith("pending-"),
    );
    if (m?.id) return m.id;
    let q = supabase
      .from("applications")
      .select("id")
      .eq("user_id", user.id)
      .limit(1);
    if (job.ats_source && job.external_id)
      q = q.eq("ats_source", job.ats_source).eq("external_id", job.external_id);
    else q = q.ilike("role_title", job.title);
    const { data } = await q;
    return data?.[0]?.id || null;
  }, [queryClient, user, job]);

  const onTrack = useCallback(async () => {
    if (tracking || tracked || !user?.id) return;
    setTracking(true);
    const res = await addJobToTracker({ user, queryClient, job, scoreResult });
    setTracking(false);
    if (res?.error) {
      toast.error("Couldn't add to your tracker - try again.");
      return;
    }
    toast.success(
      res?.duplicate ? "Already in your tracker." : "Added to your tracker.",
    );
  }, [tracking, tracked, user, queryClient, job, scoreResult]);

  const onGenerateCv = useCallback(async () => {
    if (tailoring || !user?.id) return;
    setTailoring(true);
    try {
      const alreadyTracked = tracked;
      const res = await addJobToTracker({
        user,
        queryClient,
        job,
        scoreResult,
      });
      if (res?.error) {
        toast.error("Couldn't start generating - try again.");
        return;
      }
      const applicationId = await resolveApplicationId();
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
        toast.error("Couldn't generate the CV - try again.");
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({
        queryKey: applicationCvsQueryKey(user.id),
      });
      toast.success(
        alreadyTracked
          ? "Your CV is ready."
          : "Added to your tracker - CV ready.",
      );
      // Open the CV tab on the freshly generated copy (ThreeTabHome syncs ?tab;
      // CVStudioLive's ?application_id selection effect loads it).
      setSearchParams(
        (prev) => {
          const n = new URLSearchParams(prev);
          n.set("tab", "cv");
          n.set("application_id", data.application_id || applicationId);
          n.delete("cv");
          return n;
        },
        { replace: true },
      );
    } finally {
      setTailoring(false);
    }
  }, [
    tailoring,
    tracked,
    user,
    queryClient,
    job,
    scoreResult,
    resolveApplicationId,
    setSearchParams,
  ]);

  return { tracked, tracking, tailoring, onTrack, onGenerateCv };
}

export default useJobCardActions;
