import React, { useState, useEffect } from "react";
import { supabase } from "@/api/supabaseClient";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { scoreApplication } from "@/lib/scoreApplication";
import { stripHtml } from "../../../scripts/lib/normalize.ts";
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  Lock,
  MessageSquare,
  RotateCw,
  Trash2,
  AlertCircle,
} from "lucide-react";
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

// Status label + warm-tint badge style. Each entry maps to a foreground
// (text) + background (tint) pair. PR 3E restyle keeps the same 7 status
// keys (applications.status enum — P14) and reuses the rd palette tints
// already in use across Home / Roadmap / Jobs.
const STATUS_LABELS = {
  interested: {
    label: "Interested",
    bg:    "var(--rd-bg-soft)",
    fg:    "var(--rd-text-secondary)",
  },
  preparing: {
    label: "Preparing",
    bg:    "var(--rd-bg-soft)",
    fg:    "var(--rd-text)",
  },
  applied: {
    label: "Applied",
    bg:    "var(--rd-golden-tint)",
    fg:    "var(--rd-golden-dark)",
  },
  interviewing: {
    label: "Interviewing",
    bg:    "var(--rd-teal-tint)",
    fg:    "var(--rd-teal-dark)",
  },
  offer: {
    label: "Offer",
    bg:    "var(--rd-coral-tint)",
    fg:    "var(--rd-coral-dark)",
  },
  accepted: {
    label: "Accepted",
    bg:    "var(--rd-teal-tint)",
    fg:    "var(--rd-teal-dark)",
  },
  rejected: {
    label: "Rejected",
    bg:    "#FEE2E2",
    fg:    "#991B1B",
  },
};

// Track-color tint palette indexed by rdColor (coral/teal/golden). PR 3E
// completes the rd palette migration — Tracker was the last surface still
// reading TRACK_CONFIG.color (legacy green/gray/amber).
const RD_TRACK_STYLES = {
  coral:  { tint: "var(--rd-coral-tint)",  badgeBg: "var(--rd-coral)",  accent: "var(--rd-coral-dark)"  },
  teal:   { tint: "var(--rd-teal-tint)",   badgeBg: "var(--rd-teal)",   accent: "var(--rd-teal-dark)"   },
  golden: { tint: "var(--rd-golden-tint)", badgeBg: "var(--rd-golden)", accent: "var(--rd-golden-dark)" },
};

export default function ApplicationRow({ app, profile = null, onUpdate, listingInactive = false, defaultExpanded = false }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(defaultExpanded);

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
  const trackStyles = trackMeta?.rdColor ? RD_TRACK_STYLES[trackMeta.rdColor] : null;

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

  // P3 — two-step delete confirm preserved verbatim. ON DELETE CASCADE on
  // status_changes.application_id clears the audit rows automatically.
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

  // P2 — status UPDATE only. trg_log_application_status_change writes the
  // audit row on the server side; client code MUST NOT write to the
  // status_changes table (RLS denies it).
  const handleStatusChange = async (newStatus) => {
    const { error } = await supabase.from("applications").update({ status: newStatus }).eq("id", app.id);
    if (error) {
      console.error("Failed to update status:", error);
      toast.error("Failed to update status. Please try again.");
      return;
    }
    onUpdate();
  };

  // P4 — stripHtml at the paste-boundary, then UPDATE, then chain
  // scoreApplication (analyze-job-match) when the cleaned JD is non-empty.
  const handleSaveJobDescription = async () => {
    const cleanedJd = stripHtml(jdText) || "";
    const { error } = await supabase.from("applications").update({ job_description: cleanedJd }).eq("id", app.id);
    if (error) {
      console.error("Failed to save job description:", error);
      toast.error("Failed to save job description. Please try again.");
      return;
    }
    if (cleanedJd !== jdText) setJdText(cleanedJd);
    onUpdate();
    if (cleanedJd && cleanedJd.trim()) {
      scoreApplication(supabase, queryClient, app.id, cleanedJd, app.user_id);
    }
  };

  // P6 — application details written together (no per-field write).
  // Auto-mark step 6 (application_submitted) complete when applied_date
  // gets populated. The Steps-tab CTA for step 6 ("Apply") opens the
  // company URL; once the user comes back and fills in applied_date,
  // we treat the application as submitted without requiring a second
  // explicit toggle. Single atomic write — keeps the checklist + the
  // details in sync.
  const handleSaveApplicationDetails = async () => {
    const submittedNow = !!(appliedDate || "").trim();
    const nextChecklist = submittedNow && !checklist?.application_submitted
      ? { ...checklist, application_submitted: true }
      : checklist;
    const update = {
      applied_date: appliedDate,
      cv_version_used: cvVersionUsed,
      referral_attached: referralAttached,
      ...(nextChecklist !== checklist && { checklist: nextChecklist }),
    };
    const { error } = await supabase.from("applications").update(update).eq("id", app.id);
    if (error) {
      console.error("Failed to save application details:", error);
      toast.error("Failed to save application details. Please try again.");
      return;
    }
    if (nextChecklist !== checklist) setChecklist(nextChecklist);
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

  // P5 — optimistic checklist update with rollback-on-error preserved.
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

  // P9 — tab lock semantics preserved exactly.
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

  // AI confidence — track-tinted strong / muted soft. No red band.
  const qScore = app.qualification_score;
  const qPct = qScore != null ? Math.round(qScore * 100) : null;
  const qStrong = qPct != null && qPct >= 45;

  return (
    <div className="bg-rd-bg-card border border-rd-border rounded-[18px] overflow-hidden shadow-rd">
      <button
        type="button"
        onClick={() => {
          if (expanded && hasUnsavedChanges) {
            // P11 — unsaved-changes guard.
            if (!window.confirm("You have unsaved changes. Collapse anyway?")) return;
          }
          setExpanded(!expanded);
        }}
        aria-label={expanded ? "Collapse application" : "Expand application"}
        aria-expanded={expanded}
        data-app-id={app.id}
        className="w-full flex items-start justify-between gap-3 px-5 py-4 text-left hover:bg-rd-bg-soft/40 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="inline-flex items-center text-[11px] font-display font-bold rounded-full px-2.5 py-1 flex-shrink-0"
            style={{ background: status.bg, color: status.fg }}
          >
            {status.label}
          </span>
          <div className="min-w-0">
            <p className="font-display font-bold text-[15px] leading-[1.2] text-rd-text truncate">
              {app.role_title}
            </p>
            <p className="text-[12px] text-rd-text-secondary mt-0.5">
              {app.company || "No company"}
            </p>
            {listingInactive && (
              <p className="inline-flex items-center gap-1 text-[10.5px] text-rd-golden-dark mt-1">
                <AlertCircle className="w-3 h-3" />
                This listing may no longer be active
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {trackMeta && trackStyles ? (
            <span
              className="inline-flex items-center gap-1.5 text-[11px] font-display font-bold rounded-full px-2.5 py-1"
              style={{ background: trackStyles.tint, color: trackStyles.accent }}
            >
              <span
                className="w-4 h-4 rounded-full inline-flex items-center justify-center font-display font-extrabold text-[9.5px] leading-none text-white"
                style={{ background: trackStyles.badgeBg }}
              >
                {trackMeta.number}
              </span>
              Track {trackMeta.number}
            </span>
          ) : scoringFailed && hasJd ? (
            <span
              role="button"
              tabIndex={0}
              onClick={handleRetryScore}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleRetryScore(e);
                }
              }}
              aria-disabled={retryingScore}
              className="inline-flex items-center gap-1.5 text-[11px] font-display font-semibold text-rd-text-secondary hover:text-rd-text cursor-pointer"
              title="Background scoring failed. Click to retry."
            >
              {retryingScore ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Retrying…
                </>
              ) : (
                <>
                  <RotateCw className="w-3 h-3" />
                  Retry scoring
                </>
              )}
            </span>
          ) : hasJd ? (
            <span className="text-[11px] italic text-rd-text-tertiary">Calculating track…</span>
          ) : null}
          {qPct != null ? (
            <span
              className="text-[12px] font-display font-bold"
              style={{ color: qStrong ? "var(--rd-teal-dark)" : "var(--rd-text-secondary)" }}
            >
              {qPct}%
            </span>
          ) : !scoringFailed && hasJd ? (
            <span className="text-[11px] italic text-rd-text-tertiary">Calculating fit…</span>
          ) : null}
          {confirmingDelete ? (
            <>
              <span
                role="button"
                tabIndex={0}
                onClick={handleDelete}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleDelete(e);
                  }
                }}
                className="text-[11.5px] font-display font-bold text-rd-coral-dark hover:text-rd-coral cursor-pointer"
                title="Confirm delete"
              >
                Delete?
              </span>
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => { e.stopPropagation(); setConfirmingDelete(false); }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    setConfirmingDelete(false);
                  }
                }}
                className="text-[11.5px] text-rd-text-secondary hover:text-rd-text cursor-pointer"
              >
                Cancel
              </span>
            </>
          ) : (
            <span
              role="button"
              tabIndex={0}
              onClick={handleDelete}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleDelete(e);
                }
              }}
              className="text-rd-text-tertiary hover:text-rd-coral transition-colors cursor-pointer"
              title="Delete application"
              aria-label="Delete application"
            >
              <Trash2 className="w-4 h-4" />
            </span>
          )}
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-rd-text-secondary" />
          ) : (
            <ChevronDown className="w-4 h-4 text-rd-text-secondary" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-rd-border-subtle bg-rd-bg-soft/40">
          {/* Status row */}
          <div className="px-5 py-3 flex items-center gap-3 border-b border-rd-border-subtle">
            <span className="text-[10.5px] uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow font-mono">
              Status
            </span>
            <Select value={app.status} onValueChange={handleStatusChange}>
              <SelectTrigger className="h-8 w-[180px] text-[12px] border-rd-border bg-rd-bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_LABELS).map(([value, { label }]) => (
                  <SelectItem key={value} value={value} className="text-[12px]">{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tab bar */}
          <div className="px-5 pt-3 flex gap-4 overflow-x-auto border-b border-rd-border-subtle">
            {tabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  title={tab.locked ? tab.unlockHint : undefined}
                  aria-selected={active}
                  className={[
                    "pb-2.5 -mb-px font-display font-semibold text-[12.5px] whitespace-nowrap transition-colors duration-150 inline-flex items-center gap-1.5",
                    active
                      ? "text-rd-text border-b-[2.5px] border-rd-coral"
                      : "text-rd-text-tertiary hover:text-rd-text border-b-[2.5px] border-transparent",
                  ].join(" ")}
                >
                  {tab.locked && <Lock className="w-3 h-3" />}
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab panel */}
          <div className="px-5 py-5 bg-rd-bg-card">
            {activeTab === "checklist" && (
              <ApplicationChecklist
                app={app}
                checklist={checklist}
                onChange={handleChecklistChange}
                onNavigateTab={setActiveTab}
              />
            )}

            {activeTab === "target" && (
              <div className="flex flex-col gap-4">
                <p className="text-[10.5px] uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow font-mono">
                  Target role information
                </p>
                <div className="rounded-[14px] border border-rd-border-subtle bg-rd-bg-soft/50 px-4 py-3 flex flex-col gap-2">
                  <TargetRow label="Role" value={app.role_title} />
                  <TargetRow label="Company" value={app.company || "—"} />
                  <div className="flex items-center justify-between gap-3 text-[12.5px] py-0.5">
                    <span className="text-rd-text-secondary">Track</span>
                    {trackMeta ? (
                      <span className="font-display font-semibold text-rd-text">
                        Track {trackMeta.number} · {trackMeta.name}
                      </span>
                    ) : scoringFailed && hasJd ? (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={handleRetryScore}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleRetryScore(e);
                          }
                        }}
                        className="inline-flex items-center gap-1.5 text-[11.5px] font-display font-semibold text-rd-text-secondary hover:text-rd-text cursor-pointer"
                        title="Background scoring failed. Click to retry."
                      >
                        {retryingScore ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Retrying…
                          </>
                        ) : (
                          <>
                            <RotateCw className="w-3 h-3" />
                            Retry scoring
                          </>
                        )}
                      </span>
                    ) : hasJd ? (
                      <span className="text-[11.5px] italic text-rd-text-tertiary">Calculating track…</span>
                    ) : (
                      <span className="font-display font-semibold text-rd-text-tertiary">Unclassified</span>
                    )}
                  </div>
                  {qPct != null ? (
                    <div className="flex items-center justify-between gap-3 text-[12.5px] py-0.5">
                      <span className="text-rd-text-secondary">AI confidence</span>
                      <span
                        className="font-display font-bold"
                        style={{ color: qStrong ? "var(--rd-teal-dark)" : "var(--rd-text-secondary)" }}
                      >
                        {qPct}%
                      </span>
                    </div>
                  ) : !scoringFailed && hasJd ? (
                    <div className="flex items-center justify-between gap-3 text-[12.5px] py-0.5">
                      <span className="text-rd-text-secondary">AI confidence</span>
                      <span className="text-[11.5px] italic text-rd-text-tertiary">Calculating fit…</span>
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10.5px] uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow font-mono">
                    Job description
                  </label>
                  <Textarea
                    value={jdText}
                    onChange={(e) => setJdText(e.target.value)}
                    placeholder="Paste the job description here..."
                    rows={6}
                    className="text-[13px] border-rd-border bg-rd-bg-card focus-visible:ring-rd-coral focus-visible:ring-offset-0"
                  />
                  <button
                    type="button"
                    onClick={handleSaveJobDescription}
                    className="self-start text-[12px] font-display font-semibold text-rd-text hover:text-rd-coral-dark underline underline-offset-2 transition-colors"
                  >
                    Save job description
                  </button>
                </div>
              </div>
            )}

            {activeTab === "cv" && (
              <div className="flex flex-col gap-4">
                <CVManagement app={app} onUpdate={onUpdate} />
                <div className="border-t border-rd-border-subtle pt-4">
                  <button
                    type="button"
                    onClick={handleOpenCVAgent}
                    className="inline-flex items-center gap-1.5 text-[12px] font-display font-semibold text-rd-text hover:text-rd-coral-dark transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    Chat with CV Agent for this role
                  </button>
                  <p className="text-[11px] text-rd-text-secondary mt-1">
                    Opens a conversation pre-loaded with this application&apos;s context.
                  </p>
                </div>
              </div>
            )}

            {activeTab === "skills"      && <SkillsRequired app={app} profile={profile} />}
            {activeTab === "projects"    && <ProjectsProof app={app} onUpdate={onUpdate} />}
            {activeTab === "networking"  && <NetworkingReferrals app={app} onUpdate={onUpdate} />}

            {activeTab === "application" && (
              <div className="flex flex-col gap-4">
                <p className="text-[10.5px] uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow font-mono">
                  Application details
                </p>
                <div>
                  <label className="block text-[12px] text-rd-text-secondary mb-1.5">Date applied</label>
                  <input
                    type="date"
                    value={appliedDate}
                    onChange={(e) => setAppliedDate(e.target.value)}
                    className="w-full max-w-[220px] px-3 py-2 rounded-[10px] border border-rd-border bg-rd-bg-card text-rd-text text-[13px] focus:border-rd-coral focus:shadow-[0_0_0_3px_var(--rd-coral-tint)] outline-none transition-[border-color,box-shadow] duration-150"
                  />
                </div>
                <div>
                  <label className="block text-[12px] text-rd-text-secondary mb-1.5">CV version used</label>
                  <input
                    value={cvVersionUsed}
                    onChange={(e) => setCvVersionUsed(e.target.value)}
                    placeholder="e.g. Customer Success CV — Monday"
                    className="w-full px-3 py-2 rounded-[10px] border border-rd-border bg-rd-bg-card text-rd-text text-[13px] placeholder:text-rd-text-tertiary focus:border-rd-coral focus:shadow-[0_0_0_3px_var(--rd-coral-tint)] outline-none transition-[border-color,box-shadow] duration-150"
                  />
                </div>
                <label className="inline-flex items-center gap-2 text-[13px] text-rd-text-secondary">
                  <Checkbox
                    checked={referralAttached}
                    onCheckedChange={setReferralAttached}
                    className="accent-rd-coral"
                  />
                  Referral attached
                </label>
                <button
                  type="button"
                  onClick={handleSaveApplicationDetails}
                  className="self-start text-[12px] font-display font-semibold text-rd-text hover:text-rd-coral-dark underline underline-offset-2 transition-colors"
                >
                  Save application details
                </button>
              </div>
            )}

            {activeTab === "interview" && (
              interviewLocked ? (
                <LockedNotice>
                  Move this application to <strong className="font-display font-bold text-rd-text">Interviewing</strong> to unlock interview prep. Jumping ahead before you have an interview scheduled just adds noise.
                </LockedNotice>
              ) : (
                <InterviewPrep app={app} onUpdate={onUpdate} />
              )
            )}
            {activeTab === "followup" && (
              followupLocked ? (
                <LockedNotice>
                  Follow-up unlocks once the application reaches <strong className="font-display font-bold text-rd-text">Offer</strong>, <strong className="font-display font-bold text-rd-text">Accepted</strong>, or <strong className="font-display font-bold text-rd-text">Rejected</strong>. There&apos;s nothing to follow up on yet.
                </LockedNotice>
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

function TargetRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 text-[12.5px] py-0.5">
      <span className="text-rd-text-secondary">{label}</span>
      <span className="font-display font-semibold text-rd-text">{value}</span>
    </div>
  );
}

function LockedNotice({ children }) {
  return (
    <div className="flex items-start gap-2.5 rounded-[14px] border border-rd-border bg-rd-bg-soft px-4 py-3">
      <Lock className="w-4 h-4 text-rd-text-tertiary flex-shrink-0 mt-0.5" />
      <p className="text-[12.5px] text-rd-text-secondary leading-[1.55]">
        {children}
      </p>
    </div>
  );
}
