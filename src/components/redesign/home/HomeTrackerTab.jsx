import React, { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { X, Plus, Briefcase, Star } from "lucide-react";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useProfileQuery } from "@/lib/queries/useProfile";
import { funnelCountsFromApplications } from "@/lib/funnelBuckets";
import RdCard from "@/components/redesign/RdCard";
import RdFunnelTile from "@/components/redesign/RdFunnelTile";
import ApplicationsKanban from "@/components/tracker/ApplicationsKanban";
import ApplicationDetailDrawer from "@/components/tracker/ApplicationDetailDrawer";
import AddApplicationDialog from "@/components/tracker/AddApplicationDialog";

// The Tracker tab of the 3-tab home - the REAL pipeline block (lifted from
// Career.jsx / the canvas preview's live branch; single source, imported by both
// the production home and the /_preview/home-3tab preview). Reads the canonical
// ["applications", uid] query + cache key that Career / the old Tracker share, so
// it round-trips the exact same data. Renders the real ApplicationsKanban +
// ApplicationDetailDrawer + AddApplicationDialog.

const GUIDE_DISMISS_KEY = (uid) => `home3tabPipelineGuideDismissed:${uid}`;

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

function PipelineGuideTile({
  tint,
  accent,
  head,
  body,
  highlight = false,
  index = 0,
}) {
  return (
    <div
      className="cx-reveal rd-r-md px-3.5 py-3"
      style={{ background: tint, animationDelay: `${index * 40}ms` }}
    >
      <p
        className="font-display font-bold rd-t-body-s leading-tight inline-flex items-center gap-1.5"
        style={{ color: accent }}
      >
        {highlight && <Star className="w-3 h-3" aria-hidden="true" />}
        {head}
      </p>
      <p
        className="rd-t-body-s leading-[1.45] mt-1.5"
        style={{ color: accent }}
      >
        {body}
      </p>
    </div>
  );
}

export default function HomeTrackerTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: profile } = useProfileQuery(user?.id);
  const [showAdd, setShowAdd] = useState(false);
  const [drawerAppId, setDrawerAppId] = useState(null);

  const guideDismissKey = user?.id ? GUIDE_DISMISS_KEY(user.id) : null;
  const [guideDismissed, setGuideDismissed] = useState(() => {
    if (!guideDismissKey) return false;
    try {
      return localStorage.getItem(guideDismissKey) === "1";
    } catch {
      return false;
    }
  });
  const dismissGuide = () => {
    setGuideDismissed(true);
    try {
      if (guideDismissKey) localStorage.setItem(guideDismissKey, "1");
    } catch {
      /* localStorage unavailable */
    }
  };

  // Same canonical wide query + key Career/Home/old-Tracker all share.
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

  const funnelCounts = useMemo(
    () => funnelCountsFromApplications(applications),
    [applications],
  );

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
          console.warn("[home-3tab] inactive cross-ref failed:", error.message);
          continue;
        }
        for (const j of data || []) inactive.add(`${ats}|${j.external_id}`);
      }
      return inactive;
    },
    enabled: !!user?.id && atsLinkedKeys.length > 0,
    staleTime: 5 * 60 * 1000,
  });

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

  return (
    <section aria-label="Pipeline board">
      <div className="flex gap-1.5 mb-4">
        <RdFunnelTile
          label="saved"
          value={funnelCounts.saved}
          tone="neutral"
          animate
        />
        <RdFunnelTile
          label="applied"
          value={funnelCounts.applied}
          tone="neutral"
          animate
        />
        <RdFunnelTile
          label="interview"
          value={funnelCounts.interview}
          tone="teal"
          animate
        />
        <RdFunnelTile
          label="offer"
          value={funnelCounts.offer}
          tone="neutral"
          animate
        />
      </div>

      {!guideDismissed && (
        <RdCard className="p-5" data-pipeline-guide>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="rd-t-micro uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow font-mono">
                How to use this pipeline
              </p>
              <p className="rd-t-body-m text-rd-text-secondary leading-[1.55] mt-1.5">
                Every application has a{" "}
                <strong className="text-rd-text font-display font-bold">
                  7-step process
                </strong>
                . Open any application and go to the{" "}
                <strong className="text-rd-text font-display font-bold">
                  Steps
                </strong>{" "}
                tab. Work through each step before submitting - candidates who
                skip steps are the ones who get ignored.
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
              index={0}
              tint="var(--rd-primary-tint)"
              accent="var(--rd-primary-dark)"
              head="Steps 1-2"
              body="Qualify yourself. Dissect the job description. Know the role before applying."
            />
            <PipelineGuideTile
              index={1}
              tint="var(--rd-teal-tint)"
              accent="var(--rd-teal-dark)"
              head="Steps 3-5"
              body="Tailor your CV, map skill evidence, and find a referral contact at the company."
            />
            <PipelineGuideTile
              index={2}
              tint="var(--rd-primary-tint)"
              accent="var(--rd-primary-dark)"
              head="Steps 6-7"
              body="Submit your application, then prep for the interview with STAR-format answers."
            />
            <PipelineGuideTile
              index={3}
              tint="var(--rd-primary-tint)"
              accent="var(--rd-primary-dark)"
              head="Referral = your biggest edge"
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
          <h2 className="font-display font-bold rd-t-display-s text-rd-text">
            Pipeline board
          </h2>
          <p className="rd-t-body-s text-rd-text-secondary mt-0.5">
            Drag a card between columns to update its status. Click any card to
            open the steps checklist.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="flex-shrink-0 inline-flex items-center gap-1.5 font-display font-bold rd-t-body-s text-white bg-rd-teal hover:bg-rd-teal-dark rounded-full px-3.5 py-2 rd-press rd-btn-sheen"
        >
          <Plus className="w-3.5 h-3.5" />
          Add manually
        </button>
      </div>

      <div className="mt-3">
        {applications.length === 0 ? (
          <RdCard className="px-6 py-10 text-center">
            <Briefcase className="w-10 h-10 text-rd-teal mx-auto mb-3" />
            <p className="rd-t-body-m text-rd-text-secondary leading-[1.55] max-w-md mx-auto">
              No applications yet. Track one from the Browse Jobs tab - the
              Track button on any role card prepends it here.
            </p>
          </RdCard>
        ) : (
          <ApplicationsKanban
            applications={applications}
            statuses={APPLICATION_STATUSES}
            statusLabels={APPLICATION_STATUS_LABELS}
            inactiveExternalIds={inactiveExternalIds}
            onCardClick={(app) => setDrawerAppId(app.id)}
          />
        )}
      </div>

      <ApplicationDetailDrawer
        app={drawerApp}
        profile={profile}
        listingInactive={drawerListingInactive}
        open={!!drawerApp}
        onClose={() => setDrawerAppId(null)}
        onUpdate={() =>
          queryClient.invalidateQueries({ queryKey: ["applications"] })
        }
      />

      <AddApplicationDialog open={showAdd} onOpenChange={setShowAdd} />
    </section>
  );
}
