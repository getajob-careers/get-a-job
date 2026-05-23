import React, { useState, useEffect } from "react";
import { supabase } from "@/api/supabaseClient";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { scoreApplication } from "@/lib/scoreApplication";
import { ChevronDown, ChevronUp, Loader2, Lock, MessageSquare, RotateCw, Trash2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { TRACK_CONFIG } from "@/lib/trackConfig";
import CVManagement from "./CVManagement";
import SkillsRequired from "./SkillsRequired";
import ProjectsProof from "./ProjectsProof";
import NetworkingReferrals from "./NetworkingReferrals";
import InterviewPrep from "./InterviewPrep";
import FollowUp from "./FollowUp";
import ApplicationChecklist from "./ApplicationChecklist";

// Status badges use the new tk-status-* token classes (defined in
// trackerStyles.js). Each maps to a Direction 3 tint family — gray /
// info-blue / violet / warning-amber / success-green / red.
const STATUS_LABELS = {
  interested:   { label: "Interested",   cls: "tk-status-interested" },
  preparing:    { label: "Preparing",    cls: "tk-status-preparing" },
  applied:      { label: "Applied",      cls: "tk-status-applied" },
  interviewing: { label: "Interviewing", cls: "tk-status-interviewing" },
  offer:        { label: "Offer",        cls: "tk-status-offer" },
  accepted:     { label: "Accepted",     cls: "tk-status-accepted" },
  rejected:     { label: "Rejected",     cls: "tk-status-rejected" },
};

export default function ApplicationRow({ app, onUpdate, listingInactive = false }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);

  const handleOpenCVAgent = () => {
    navigate("/CVAgent");
  };
  const [activeTab, setActiveTab] = useState("target");
  const [jdText, setJdText] = useState(app.job_description || "");
  const [appliedDate, setAppliedDate] = useState(app.applied_date || "");
  const [cvVersionUsed, setCvVersionUsed] = useState(app.cv_version_used || "");
  const [referralAttached, setReferralAttached] = useState(app.referral_attached || false);

  const hasUnsavedChanges =
    jdText !== (app.job_description || "") ||
    appliedDate !== (app.applied_date || "") ||
    cvVersionUsed !== (app.cv_version_used || "") ||
    referralAttached !== (app.referral_attached || false);

  const status = STATUS_LABELS[app.status] || STATUS_LABELS.interested;
  const trackMeta = TRACK_CONFIG[app.track]; // null when unclassified

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [retryingScore, setRetryingScore] = useState(false);

  const scoringFailed = !!app.track_scoring_failed_at;
  const hasJd = !!(app.job_description && app.job_description.trim());

  const handleRetryScore = async (e) => {
    e?.stopPropagation();
    if (retryingScore || !hasJd) return;
    setRetryingScore(true);
    try {
      await scoreApplication(supabase, queryClient, app.id, app.job_description, app.user_id);
    } finally {
      setRetryingScore(false);
    }
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    const { error } = await supabase.from("applications").delete().eq("id", app.id);
    if (error) {
      console.error("Failed to delete application:", error);
      toast.error("Failed to delete application: " + error.message);
      setConfirmingDelete(false);
      return;
    }
    toast.success("Application deleted");
    onUpdate();
  };

  const handleStatusChange = async (newStatus) => {
    const { error } = await supabase.from("applications").update({ status: newStatus }).eq("id", app.id);
    if (error) {
      console.error("Failed to update status:", error);
      toast.error("Failed to update status. Please try again.");
      return;
    }
    onUpdate();
  };

  const handleSaveJobDescription = async () => {
    const { error } = await supabase.from("applications").update({ job_description: jdText }).eq("id", app.id);
    if (error) {
      console.error("Failed to save job description:", error);
      toast.error("Failed to save job description. Please try again.");
      return;
    }
    onUpdate();
    if (jdText && jdText.trim()) {
      scoreApplication(supabase, queryClient, app.id, jdText, app.user_id);
    }
  };

  const handleSaveApplicationDetails = async () => {
    const { error } = await supabase.from("applications").update({
      applied_date: appliedDate,
      cv_version_used: cvVersionUsed,
      referral_attached: referralAttached,
    }).eq("id", app.id);
    if (error) {
      console.error("Failed to save application details:", error);
      toast.error("Failed to save application details. Please try again.");
      return;
    }
    onUpdate();
  };

  const [checklist, setChecklist] = useState(app.checklist || {});

  useEffect(() => {
    if (!expanded || !hasUnsavedChanges) {
      setJdText(app.job_description || "");
      setAppliedDate(app.applied_date || "");
      setCvVersionUsed(app.cv_version_used || "");
      setReferralAttached(app.referral_attached || false);
      setChecklist(app.checklist || {});
    }

  }, [expanded, app]);

  const handleChecklistChange = async (updated) => {
    const previous = checklist;
    setChecklist(updated);
    const { error } = await supabase.from("applications").update({ checklist: updated }).eq("id", app.id);
    if (error) {
      console.error("Failed to save checklist:", error);
      setChecklist(previous);
      toast.error("Failed to save checklist. Please try again.");
      return;
    }
    onUpdate();
  };

  const INTERVIEW_UNLOCK_STATUSES = new Set(["interviewing", "offer", "accepted", "rejected"]);
  const FOLLOWUP_UNLOCK_STATUSES = new Set(["offer", "accepted", "rejected"]);
  const interviewLocked = !INTERVIEW_UNLOCK_STATUSES.has(app.status);
  const followupLocked = !FOLLOWUP_UNLOCK_STATUSES.has(app.status);

  const tabs = [
    { id: "checklist",   label: "📋 Steps" },
    { id: "target",      label: "Target role" },
    { id: "cv",          label: "CV" },
    { id: "skills",      label: "Skills" },
    { id: "projects",    label: "Projects" },
    { id: "networking",  label: "Networking" },
    { id: "application", label: "Application" },
    { id: "interview",   label: "Interview", locked: interviewLocked, unlockHint: "Move this application to 'Interviewing' to unlock interview prep." },
    { id: "followup",    label: "Follow-up", locked: followupLocked, unlockHint: "Unlocks once the application reaches Offer, Accepted, or Rejected." },
  ];

  // Qualification score: green when strong, gray when weak. No red.
  const qScore = app.qualification_score;
  const qPct = qScore != null ? Math.round(qScore * 100) : null;
  const qClass = qPct == null ? null : (qPct >= 45 ? "tk-score-strong" : "tk-score-soft");

  return (
    <div className="tk-row">
      <button
        onClick={() => {
          if (expanded && hasUnsavedChanges) {
            if (!window.confirm("You have unsaved changes. Collapse anyway?")) return;
          }
          setExpanded(!expanded);
        }}
        aria-label={expanded ? "Collapse application" : "Expand application"}
        className="tk-row-header"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className={`tk-status ${status.cls} flex-shrink-0`}>{status.label}</span>
          <div className="min-w-0">
            <p className="tk-row-title truncate">{app.role_title}</p>
            <p className="tk-row-company">{app.company || "No company"}</p>
            {listingInactive && (
              <p className="text-[10.5px] text-[#6B4E0F] mt-1">
                This listing may no longer be active
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {trackMeta ? (
            <span className={`tk-track-pill tk-track-${trackMeta.color}`}>
              <span className="tk-track-badge">{trackMeta.number}</span>
              Track {trackMeta.number}
            </span>
          ) : scoringFailed && hasJd ? (
            <button
              type="button"
              onClick={handleRetryScore}
              disabled={retryingScore}
              className="tk-meta-retry"
              title="Background scoring failed. Click to retry."
            >
              {retryingScore
                ? <><Loader2 className="w-3 h-3 animate-spin" />Retrying…</>
                : <><RotateCw className="w-3 h-3" />Retry scoring</>}
            </button>
          ) : hasJd ? (
            <span className="tk-meta-italic">Calculating track…</span>
          ) : null}
          {qPct != null ? (
            <span className={qClass}>{qPct}%</span>
          ) : !scoringFailed && hasJd ? (
            <span className="tk-meta-italic">Calculating fit…</span>
          ) : null}
          {confirmingDelete ? (
            <>
              <button
                onClick={handleDelete}
                className="text-xs text-[#C84F40] font-semibold hover:text-[#F87060]"
                title="Confirm delete"
              >
                Delete?
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setConfirmingDelete(false); }}
                className="text-xs text-[#9C9DA1] hover:text-[#52545A]"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={handleDelete}
              className="text-[#9C9DA1] hover:text-[#F87060] transition-colors"
              title="Delete application"
              aria-label="Delete application"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          {expanded
            ? <ChevronUp className="w-4 h-4 text-[#9C9DA1]" />
            : <ChevronDown className="w-4 h-4 text-[#9C9DA1]" />}
        </div>
      </button>

      {expanded && (
        <div className="tk-row-body">
          <div className="tk-status-bar">
            <span className="tk-eyebrow">Status</span>
            <Select value={app.status} onValueChange={handleStatusChange}>
              <SelectTrigger className="h-8 w-[180px] text-xs border-[#DDDDDB]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_LABELS).map(([value, { label }]) => (
                  <SelectItem key={value} value={value} className="text-xs">{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="tk-tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                title={tab.locked ? tab.unlockHint : undefined}
                className="tk-tab"
                data-active={activeTab === tab.id}
                data-locked={!!tab.locked}
              >
                {tab.locked && <Lock className="w-3 h-3" />}
                {tab.label}
              </button>
            ))}
          </div>

          <div className="tk-tab-panel">
            {activeTab === "checklist" && (
              <ApplicationChecklist checklist={checklist} onChange={handleChecklistChange} />
            )}

            {activeTab === "target" && (
              <div className="flex flex-col gap-4">
                <p className="tk-eyebrow">Target role information</p>
                <div className="tk-card-inset">
                  <div className="tk-tab-panel-row">
                    <span className="tk-tab-panel-key">Role</span>
                    <span className="tk-tab-panel-val">{app.role_title}</span>
                  </div>
                  <div className="tk-tab-panel-row">
                    <span className="tk-tab-panel-key">Company</span>
                    <span className="tk-tab-panel-val">{app.company || "—"}</span>
                  </div>
                  <div className="tk-tab-panel-row">
                    <span className="tk-tab-panel-key">Track</span>
                    {trackMeta ? (
                      <span className="tk-tab-panel-val">Track {trackMeta.number} · {trackMeta.name}</span>
                    ) : scoringFailed && hasJd ? (
                      <button
                        type="button"
                        onClick={handleRetryScore}
                        disabled={retryingScore}
                        className="tk-meta-retry"
                        title="Background scoring failed. Click to retry."
                      >
                        {retryingScore
                          ? <><Loader2 className="w-3 h-3 animate-spin" />Retrying…</>
                          : <><RotateCw className="w-3 h-3" />Retry scoring</>}
                      </button>
                    ) : hasJd ? (
                      <span className="tk-meta-italic">Calculating track…</span>
                    ) : (
                      <span className="tk-tab-panel-val">Unclassified</span>
                    )}
                  </div>
                  {qPct != null ? (
                    <div className="tk-tab-panel-row">
                      <span className="tk-tab-panel-key">AI confidence</span>
                      <span className={qClass}>{qPct}%</span>
                    </div>
                  ) : !scoringFailed && hasJd ? (
                    <div className="tk-tab-panel-row">
                      <span className="tk-tab-panel-key">AI confidence</span>
                      <span className="tk-meta-italic">Calculating fit…</span>
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-col gap-2">
                  <label className="tk-eyebrow">Job description</label>
                  <Textarea
                    value={jdText}
                    onChange={(e) => setJdText(e.target.value)}
                    placeholder="Paste the job description here..."
                    rows={6}
                    className="text-sm border-[#DDDDDB]"
                  />
                  <button
                    onClick={handleSaveJobDescription}
                    className="text-xs text-[#0E1014] underline underline-offset-2 self-start hover:text-[#F87060]"
                  >
                    Save job description
                  </button>
                </div>
              </div>
            )}

            {activeTab === "cv" && (
              <div className="flex flex-col gap-4">
                <CVManagement app={app} onUpdate={onUpdate} />
                <div className="border-t border-[#E8E8E5] pt-4">
                  <button
                    onClick={handleOpenCVAgent}
                    className="flex items-center gap-2 text-xs font-semibold text-[#0E1014] hover:text-[#F87060] transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    Chat with CV Agent for this role
                  </button>
                  <p className="text-[11px] text-[#9C9DA1] mt-1">
                    Opens a conversation pre-loaded with this application&apos;s context.
                  </p>
                </div>
              </div>
            )}
            {activeTab === "skills"      && <SkillsRequired app={app} onUpdate={onUpdate} />}
            {activeTab === "projects"    && <ProjectsProof app={app} onUpdate={onUpdate} />}
            {activeTab === "networking"  && <NetworkingReferrals app={app} onUpdate={onUpdate} />}

            {activeTab === "application" && (
              <div className="flex flex-col gap-4">
                <p className="tk-eyebrow">Application details</p>
                <div>
                  <label className="text-xs text-[#52545A] mb-1.5 block">Date applied</label>
                  <input
                    type="date"
                    value={appliedDate}
                    onChange={(e) => setAppliedDate(e.target.value)}
                    className="tk-input"
                    style={{ maxWidth: 220 }}
                  />
                </div>
                <div>
                  <label className="text-xs text-[#52545A] mb-1.5 block">CV version used</label>
                  <input
                    value={cvVersionUsed}
                    onChange={(e) => setCvVersionUsed(e.target.value)}
                    placeholder="e.g. Customer Success CV — Monday"
                    className="tk-input"
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-[#52545A]">
                  <Checkbox
                    checked={referralAttached}
                    onCheckedChange={setReferralAttached}
                    className="accent-[#F87060]"
                  />
                  Referral attached
                </label>
                <button
                  onClick={handleSaveApplicationDetails}
                  className="text-xs text-[#0E1014] underline underline-offset-2 self-start hover:text-[#F87060]"
                >
                  Save application details
                </button>
              </div>
            )}

            {activeTab === "interview" && (
              interviewLocked ? (
                <div className="tk-locked-notice">
                  <Lock className="w-4 h-4 text-[#9C9DA1] flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-[#52545A] leading-relaxed">
                    Move this application to <strong>Interviewing</strong> to unlock interview prep. Jumping ahead before you have an interview scheduled just adds noise.
                  </p>
                </div>
              ) : (
                <InterviewPrep app={app} onUpdate={onUpdate} />
              )
            )}
            {activeTab === "followup" && (
              followupLocked ? (
                <div className="tk-locked-notice">
                  <Lock className="w-4 h-4 text-[#9C9DA1] flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-[#52545A] leading-relaxed">
                    Follow-up unlocks once the application reaches <strong>Offer</strong>, <strong>Accepted</strong>, or <strong>Rejected</strong>. There&apos;s nothing to follow up on yet.
                  </p>
                </div>
              ) : (
                <FollowUp app={app} onUpdate={onUpdate} />
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
