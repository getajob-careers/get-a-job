import React, { useState, useMemo } from "react";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, X } from "lucide-react";
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
import { TRACKER_CSS } from "../components/tracker/trackerStyles";

const STATUS_FILTERS = ["all", "interested", "preparing", "applied", "interviewing", "offer", "accepted", "rejected"];

export default function Tracker() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState("all");
  const [newApp, setNewApp] = useState({ role_title: "", company: "", status: "interested" });

  const [jobDescription, setJobDescription] = useState("");
  const [importError, setImportError] = useState("");
  const [addingApp, setAddingApp] = useState(false);

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

  const handleAdd = async () => {
    if (!newApp.role_title) return;
    setAddingApp(true);
    const jd = jobDescription || newApp.job_description || "";

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

  if (isLoading) {
    return (
      <>
        <style>{TRACKER_CSS}</style>
        <div className="tracker min-h-screen flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-[#52545A]" />
        </div>
      </>
    );
  }

  return (
    <>
      <style>{TRACKER_CSS}</style>
      <div className="tracker">
        <div className="max-w-5xl mx-auto px-6 py-10">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-7 flex-wrap">
            <div>
              <p className="tk-eyebrow">Application tracker</p>
              <h1 className="tk-h1 mt-1.5">Every role, every step, every outcome.</h1>
              <p className="tk-sub">Track every application end-to-end. Don't lose interview prep or follow-ups in the cracks.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              className="tk-btn tk-btn-primary flex-shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />Add application
            </button>
          </div>

          {/* How-to-use card */}
          <div className="tk-howto mb-7">
            <p className="tk-howto-eyebrow">How to use this tracker</p>
            <p className="tk-howto-body">
              Every application has a <strong>7-step process</strong>. Open any application and go to the <strong>📋 Steps</strong> tab. Work through each step before submitting — candidates who skip steps are the ones who get ignored.
            </p>
            <div className="tk-howto-grid">
              <div className="tk-howto-tile">
                <p className="tk-howto-tile-head">Steps 1–2</p>
                <p className="tk-howto-tile-body">Qualify yourself. Dissect the job description. Know the role before applying.</p>
              </div>
              <div className="tk-howto-tile">
                <p className="tk-howto-tile-head">Steps 3–5</p>
                <p className="tk-howto-tile-body">Tailor your CV, map skill evidence, and find a referral contact at the company.</p>
              </div>
              <div className="tk-howto-tile">
                <p className="tk-howto-tile-head">Steps 6–7</p>
                <p className="tk-howto-tile-body">Submit your application, then prep for the interview with STAR-format answers.</p>
              </div>
              <div className="tk-howto-tile tk-howto-tile-accent">
                <p className="tk-howto-tile-head">⭐ Referral = your biggest edge</p>
                <p className="tk-howto-tile-body">Many companies offer referral bonuses to employees when a referred candidate gets hired. They&apos;re incentivised to get you in.</p>
              </div>
            </div>
          </div>

          {/* Status filters */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setFilter(s)}
                className="tk-filter-pill"
                data-selected={filter === s}
              >
                {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          {/* Applications */}
          {filtered.length === 0 ? (
            <div className="tk-empty">
              <p className="text-sm text-[#52545A]">
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
            <DialogContent className="bg-white border-[#DDDDDB]">
              <DialogHeader>
                <DialogTitle className="text-lg font-semibold text-[#0E1014]">
                  Add application
                </DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-4 py-2">
                {importError && (
                  <p className="text-sm text-[#C84F40] bg-[#FDE7E3] border border-[#F87060] rounded-xl px-3 py-2">
                    {importError}
                  </p>
                )}
                <div>
                  <label className="tk-eyebrow">Role title</label>
                  <input
                    value={newApp.role_title}
                    onChange={(e) => setNewApp({ ...newApp, role_title: e.target.value })}
                    className="tk-input mt-1.5"
                    placeholder="e.g. Junior Data Analyst"
                  />
                </div>
                <div>
                  <label className="tk-eyebrow">Company</label>
                  <input
                    value={newApp.company}
                    onChange={(e) => setNewApp({ ...newApp, company: e.target.value })}
                    className="tk-input mt-1.5"
                    placeholder="e.g. Google"
                  />
                </div>
                <div>
                  <label className="tk-eyebrow">
                    Job description{" "}
                    <span className="font-normal normal-case tracking-normal text-[#9C9DA1]">
                      (optional — AI will use this to set the track)
                    </span>
                  </label>
                  <textarea
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Paste the job description here..."
                    rows={5}
                    className="tk-input mt-1.5"
                    style={{ resize: "vertical", minHeight: 110 }}
                  />
                  {!jobDescription && !newApp.job_description && (
                    <p className="text-[11px] text-[#9C9DA1] mt-1.5">
                      Without AI classification, track will be unset. Add the role to your Career Roadmap to get track classification.
                    </p>
                  )}
                </div>
              </div>
              <DialogFooter className="gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="tk-btn tk-btn-outline"
                >
                  <X className="w-3.5 h-3.5" />Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={addingApp || !newApp.role_title}
                  className="tk-btn tk-btn-primary"
                >
                  {addingApp ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" />Analysing…</>
                  ) : "Add"}
                </button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </>
  );
}
