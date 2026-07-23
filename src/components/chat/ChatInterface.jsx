import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { isAuthError, recoverFromAuthError } from "@/lib/authRecovery";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useProfileQuery } from "@/lib/queries/useProfile";
import { useExperiencesQuery } from "@/lib/queries/useExperiences";
import { useEducationQuery } from "@/lib/queries/useEducation";
import { track, EVENTS } from "@/lib/analytics";
import { Send, Loader2, Plus, ListTodo, CheckCircle2, ArrowRight, Route, Briefcase, ChevronDown, Trash2, MessageSquare, FileText, Download, RefreshCw } from "lucide-react";
import { triggerBlobDownload, cvFilename } from "@/lib/downloadFile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";
import {
  applyTaskSuggestion,
  applyRoadmapChanges as sharedApplyRoadmapChanges,
  applyApplicationActions as sharedApplyApplicationActions,
  applyCompanyTargetActions as sharedApplyCompanyTargetActions,
  generateTailoredCVLinked as sharedGenerateTailoredCVLinked,
  extractBullets as sharedExtractBullets,
  appendBullets as sharedAppendBullets,
  restoreBullets as sharedRestoreBullets,
  applyAddSkillToExperience as sharedApplyAddSkillToExperience,
} from "@/lib/coachActionHandlers";
import MessageBubble from "./MessageBubble";
import BulletSaveCard from "./BulletSaveCard";
import AddSkillCard from "./AddSkillCard";
import { CHAT_MODEL } from "@/lib/chatModel";


const TRACK_LABELS = {
  track_1: "Track 1 - Your Move",
  track_2: "Track 2 - Plan B",
  track_3: "Track 3 - Work Toward",
};

// PR 3K — semantic-banner mapping retired. All action cards land on a
// uniform rd-bg-card surface; the per-card identity comes from its icon
// + slab heading. Applied-confirmation chips use rd-teal-tint
// (success). Behavior unchanged — every handler call signature is
// byte-equivalent (see P16–P19, P21 in the PR body).
function TaskSuggestionCard({ messageId, tasks, addedTaskSets, onAdd }) {
  const addedForMessage = addedTaskSets[messageId] || {};
  return (
    <div className="ml-10 mt-2 bg-rd-bg-card border border-rd-border rounded-[14px] p-4 max-w-xl shadow-rd">
      <div className="flex items-center gap-2 mb-3">
        <ListTodo className="w-3.5 h-3.5 text-rd-primary" />
        <p className="text-[13.5px] font-display font-bold text-rd-text">Suggested tasks</p>
      </div>
      <ul className="space-y-2">
        {tasks.map((task, i) => (
          <li key={i} className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[12.5px] font-display font-semibold text-rd-text leading-snug">{task.title}</p>
              {task.description && (
                <p className="text-[11px] text-rd-text-secondary mt-0.5 leading-snug">{task.description}</p>
              )}
            </div>
            {addedForMessage[i] ? (
              <CheckCircle2 className="w-4 h-4 text-rd-teal-dark shrink-0 mt-0.5" />
            ) : (
              <button
                onClick={() => onAdd(messageId, task, i)}
                className="text-[11px] font-display font-semibold text-white bg-rd-primary hover:bg-rd-primary-dark rounded-full px-3 py-1 shrink-0 transition-colors"
              >
                Add
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function RoadmapChangeCard({ messageId, changes, applied, onApply }) {
  if (applied[messageId]) {
    return (
      <div className="ml-10 mt-2 bg-rd-teal-tint border border-rd-teal/30 rounded-[14px] p-4 max-w-xl">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-rd-teal-dark" />
          <p className="text-xs font-display font-bold text-rd-teal-dark">Roadmap changes applied</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ml-10 mt-2 bg-rd-bg-card border border-rd-border rounded-[14px] p-4 max-w-xl shadow-rd">
      <div className="flex items-center gap-2 mb-3">
        <Route className="w-3.5 h-3.5 text-rd-primary" />
        <p className="text-[13.5px] font-display font-bold text-rd-text">Proposed roadmap changes</p>
      </div>
      <ul className="space-y-2 mb-3">
        {changes.map((change, i) => (
          <li key={i} className="text-xs text-rd-text-secondary leading-relaxed">
            {change.action === "update_track" && (
              <span>Move <strong className="font-display font-semibold text-rd-text">{change.role_title}</strong> → {TRACK_LABELS[change.new_track] || change.new_track}</span>
            )}
            {change.action === "add_role" && (
              <span>Add <strong className="font-display font-semibold text-rd-text">{change.title}</strong> as {TRACK_LABELS[change.track] || change.track}</span>
            )}
            {change.action === "remove_role" && (
              <span>Remove <strong className="font-display font-semibold text-rd-text">{change.role_title}</strong></span>
            )}
            {change.reason && (
              <span className="text-rd-text-secondary"> - {change.reason}</span>
            )}
          </li>
        ))}
      </ul>
      <Button
        size="sm"
        onClick={() => onApply(messageId, changes)}
        className="h-8 text-xs bg-rd-primary hover:bg-rd-primary-dark text-white font-display font-bold rounded-full px-4 gap-1.5"
      >
        Apply changes
      </Button>
    </div>
  );
}

function ApplicationActionsCard({ messageId, actions, applied, onApply }) {
  if (applied[messageId]) {
    return (
      <div className="ml-10 mt-2 bg-rd-teal-tint border border-rd-teal/30 rounded-[14px] p-4 max-w-xl">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-rd-teal-dark" />
          <p className="text-xs font-display font-bold text-rd-teal-dark">Applications updated</p>
        </div>
      </div>
    );
  }
  return (
    <div className="ml-10 mt-2 bg-rd-bg-card border border-rd-border rounded-[14px] p-4 max-w-xl shadow-rd">
      <div className="flex items-center gap-2 mb-3">
        <Briefcase className="w-3.5 h-3.5 text-rd-primary" />
        <p className="text-[13.5px] font-display font-bold text-rd-text">Proposed application changes</p>
      </div>
      <ul className="space-y-2 mb-3">
        {actions.map((a, i) => (
          <li key={i} className="text-xs text-rd-text-secondary leading-relaxed">
            {a.action === "add_application" && (
              <span>Add <strong className="font-display font-semibold text-rd-text">{a.company}</strong> - {a.role_title} ({a.status || "interested"}{a.track ? `, ${a.track}` : ""})</span>
            )}
            {a.action === "update_application" && (
              <span>
                Update <strong className="font-display font-semibold text-rd-text">{a.match_company}</strong> - {a.match_role_title}:
                {a.new_status && <span> status → {a.new_status}</span>}
                {a.new_interview_stage && <span>, stage → {a.new_interview_stage}</span>}
                {a.new_track && <span>, track → {a.new_track}</span>}
                {a.new_notes && <span>, notes updated</span>}
              </span>
            )}
          </li>
        ))}
      </ul>
      <Button
        size="sm"
        onClick={() => onApply(messageId, actions)}
        className="h-8 text-xs bg-rd-primary hover:bg-rd-primary-dark text-white font-display font-bold rounded-full px-4 gap-1.5"
      >
        Apply changes
      </Button>
    </div>
  );
}

// Company target actions card — Wk 4 SUGGESTED_COMPANY_TARGET_JSON.
// Mirrors ApplicationActionsCard's chrome (blue header, list of actions,
// single Apply button). Action shapes: add_company_target,
// update_company_target_status, enrich_company. Same accept-once pattern
// — once applied, the card collapses to a confirmation chip.
const PRACTICUM_STATUS_LABELS = {
  exploring: "Exploring",
  outreach_sent: "Outreach sent",
  interview: "Interview",
  offered: "Offered",
  rejected: "Rejected",
  declined: "Declined",
};
function CompanyTargetActionsCard({ messageId, actions, applied, onApply }) {
  if (applied[messageId]) {
    return (
      <div className="ml-10 mt-2 bg-rd-teal-tint border border-rd-teal/30 rounded-[14px] p-4 max-w-xl">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-rd-teal-dark" />
          <p className="text-xs font-display font-bold text-rd-teal-dark">Internship updated</p>
        </div>
      </div>
    );
  }
  return (
    <div className="ml-10 mt-2 bg-rd-bg-card border border-rd-border rounded-[14px] p-4 max-w-xl shadow-rd">
      <div className="flex items-center gap-2 mb-3">
        <Briefcase className="w-3.5 h-3.5 text-rd-primary" />
        <p className="text-[13.5px] font-display font-bold text-rd-text">Proposed internship changes</p>
      </div>
      <ul className="space-y-2 mb-3">
        {actions.map((a, i) => (
          <li key={i} className="text-xs text-rd-text-secondary leading-relaxed">
            {a.action === "add_company_target" && (
              <span>
                Add <strong className="font-display font-semibold text-rd-text">{a.company_name}</strong> to your internship pipeline
                {a.company_sector ? ` (${a.company_sector})` : ""}
                {a.pitched_role && <span> · pitch: {a.pitched_role}</span>}
              </span>
            )}
            {a.action === "update_company_target_status" && (
              <span>
                Update <strong className="font-display font-semibold text-rd-text">{a.match_company}</strong>: status → {PRACTICUM_STATUS_LABELS[a.new_status] || a.new_status}
                {a.note && <span> · note: &quot;{a.note.slice(0, 80)}{a.note.length > 80 ? "…" : ""}&quot;</span>}
              </span>
            )}
            {a.action === "enrich_company" && (
              <span>
                Enrich <strong className="font-display font-semibold text-rd-text">{a.match_company}</strong> with{" "}
                {[a.description && "description", a.sector && "sector", a.domain && "domain", a.industry && "industry"].filter(Boolean).join(", ")}
              </span>
            )}
          </li>
        ))}
      </ul>
      <Button
        size="sm"
        onClick={() => onApply(messageId, actions)}
        className="h-8 text-xs bg-rd-primary hover:bg-rd-primary-dark text-white font-display font-bold rounded-full px-4 gap-1.5"
      >
        Apply changes
      </Button>
    </div>
  );
}

// Heuristic gate for the story-capture follow-up that fires after CV
// generation. Returns true only when the message text plausibly contains
// a concrete past moment — long enough, has a past-tense first-person
// verb, isn't a generation/ack/question. The gate is intentionally
// strict: false-positive follow-ups (asking the user to save a "story"
// when they only said "generate the CV") are far worse for trust than
// missing the occasional legit story, which the user can still capture
// manually via the floating quick-add button on AddInformation.
//
// The same logic could live server-side in ai-chat, but doing it on the
// frontend means we skip the LLM call entirely when the gate fails —
// faster, cheaper, deterministic. Also lets the rule evolve without
// redeploying the edge function.
const PAST_TENSE_FIRST_PERSON_RE = /\b(I|we)\s+(led|ran|built|shipped|launched|owned|drove|managed|created|wrote|coded|designed|migrated|reduced|increased|improved|grew|hit|delivered|negotiated|coordinated|implemented|deployed|presented|analy[sz]ed|researched|interviewed|surveyed|recruited|trained|mentored|onboarded|automated|fixed|debugged|scaled|optimi[sz]ed|rewrote|refactored)\b/i
const GENERATION_REQUEST_RE = /\b(generate|make|create|build me|tailor|draft|write me|produce)\b.*\b(cv|resume|pdf|docx)\b/i
// "when" and "where" are excluded — they commonly open past-tense
// narratives ("When I was at Atera I owned X", "Where I really shined was…")
// that we DO want to treat as stories. Question starters here are the
// strict interrogatives plus instruction-shaped openers.
const QUESTION_STARTER_RE = /^\s*(how|what|why|who|which|should|can you|could you|would you|do you|are you|is there|please|hey)\b/i

function looksLikeStory(text) {
  const raw = String(text || '').trim();
  if (!raw) return false;
  // Generation request — explicit "generate the CV", "tailor my resume", etc.
  if (GENERATION_REQUEST_RE.test(raw)) return false;
  // Question / instruction-shaped opener.
  if (QUESTION_STARTER_RE.test(raw)) return false;
  // Word count — stories tend to be longer than 20 words. A user
  // describing a real moment with action+detail rarely fits in <20 words.
  const wordCount = raw.split(/\s+/).filter(w => w.length > 0).length;
  if (wordCount < 20) return false;
  // Past-tense first-person verb is the load-bearing positive signal.
  if (!PAST_TENSE_FIRST_PERSON_RE.test(raw)) return false;
  return true;
}

// Renders the CV agent's "generate a tailored CV" proposal. Three visual
// states: ready-to-generate (shows a Generate CV button), generating (loading
// spinner), and done (download link + fit analysis + tracker confirmation).
// The parent owns the state object so it survives re-renders and can be
// persisted to the DB.
function CVGenerationCard({ proposal, state, onGenerate, appLabel, userName }) {
  const navigate = useNavigate();
  const { status, cv_url, fit_analysis, application_id, unsourced_bullets, error } = state || {};

  if (status === "done" && cv_url) {
    const alignment = fit_analysis?.alignment;
    const pct = typeof fit_analysis?.skill_match_percentage === "number"
      ? Math.round(fit_analysis.skill_match_percentage)
      : null;
    const alignClass =
      alignment === "Strong" ? "text-rd-teal-dark"
      : alignment === "Moderate" ? "text-rd-golden-dark"
      : alignment === "Weak" ? "text-rd-primary-dark"
      : alignment === "Not a match" ? "text-rd-primary-dark"
      : "text-rd-text-secondary";
    return (
      <div className="ml-10 mt-2 bg-rd-teal-tint border border-rd-teal/30 rounded-[14px] p-4 max-w-xl">
        <div className="flex items-center gap-2 mb-1">
          <CheckCircle2 className="w-4 h-4 text-rd-teal-dark" />
          <p className="text-[13.5px] font-display font-bold text-rd-teal-dark">CV generated for {proposal.target_role}</p>
        </div>
        {application_id && (
          <p className="text-[11px] text-rd-teal-dark mb-2">✓ Linked to your application tracker</p>
        )}
        {fit_analysis && (
          <div className="mb-3 bg-rd-bg-card border border-rd-border rounded-[10px] px-3 py-2 text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-rd-text-secondary">Fit</span>
              <span className={`font-display font-bold ${alignClass}`}>
                {alignment || "—"}{pct != null ? ` · ${pct}%` : ""}
              </span>
            </div>
            {Array.isArray(fit_analysis.major_gaps) && fit_analysis.major_gaps.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-[0.09em] text-rd-text-eyebrow font-mono font-medium mt-1">Major gaps</p>
                <p className="text-[11px] text-rd-text-secondary">{fit_analysis.major_gaps.join(" · ")}</p>
              </div>
            )}
            {fit_analysis.explanation && (
              <p className="text-[11px] text-rd-text-secondary leading-relaxed pt-1">{fit_analysis.explanation}</p>
            )}
          </div>
        )}
        {Array.isArray(unsourced_bullets) && unsourced_bullets.length > 0 && (
          <div className="mb-3 bg-rd-golden-tint border border-rd-golden/40 rounded-[10px] px-3 py-2 text-xs">
            <p className="text-[10px] uppercase tracking-[0.09em] text-rd-golden-dark font-mono font-medium mb-1">
              Review before sending ({unsourced_bullets.length} {unsourced_bullets.length === 1 ? "bullet" : "bullets"})
            </p>
            <p className="text-[11px] text-rd-golden-dark leading-relaxed">
              Some bullets reference numbers or tools that we couldn&apos;t trace back to your profile data. Open the CV and double-check each one is accurate before sending - the AI sometimes elaborates.
            </p>
          </div>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={async () => {
              try {
                await triggerBlobDownload(cv_url, cvFilename(userName, proposal.target_role));
              } catch (err) {
                toast.error(`Download failed: ${err?.message || "unknown error"}`);
              }
            }}
            className="inline-flex items-center gap-1.5 text-xs font-display font-bold bg-rd-primary hover:bg-rd-primary-dark text-white rounded-full px-3.5 py-2 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Download CV (.pdf)
          </button>
          {application_id && (
            <button
              type="button"
              onClick={() =>
                navigate(
                  createPageUrl("CVAgent") +
                    `?application_id=${encodeURIComponent(application_id)}`,
                )
              }
              className="inline-flex items-center gap-1.5 text-xs font-display font-bold text-rd-primary bg-rd-bg-card border border-rd-primary/40 hover:bg-rd-primary-tint rounded-full px-3.5 py-2 transition-colors"
            >
              Open in Studio
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
          {application_id && (
            <button
              type="button"
              onClick={() =>
                navigate(
                  createPageUrl("Tracker") +
                    `?app=${encodeURIComponent(application_id)}`,
                )
              }
              className="inline-flex items-center gap-1.5 text-xs font-display font-bold text-rd-text-secondary bg-rd-bg-card border border-rd-border hover:bg-rd-bg-page rounded-full px-3.5 py-2 transition-colors"
            >
              <Briefcase className="w-3.5 h-3.5" />
              View in tracker
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="ml-10 mt-2 bg-rd-bg-card border border-rd-border rounded-[14px] p-4 max-w-xl shadow-rd">
      <div className="flex items-center gap-2 mb-2">
        <FileText className="w-3.5 h-3.5 text-rd-primary" />
        <p className="text-[13.5px] font-display font-bold text-rd-text">Generate tailored CV</p>
      </div>
      <ul className="space-y-1 mb-3 text-xs text-rd-text-secondary">
        <li><span className="text-rd-text-secondary">Role:</span> <strong className="font-display font-semibold text-rd-text">{proposal.target_role}</strong></li>
        {appLabel && <li><span className="text-rd-text-secondary">Application:</span> {appLabel}</li>}
        {!appLabel && proposal.application_id && (
          <li><span className="text-rd-text-secondary">Application:</span> <span className="text-rd-text-secondary italic">linked to tracked role</span></li>
        )}
      </ul>
      {error && (
        <p className="text-[11px] text-rd-primary-dark bg-rd-primary-tint border border-rd-primary/30 rounded-[8px] px-2 py-1 mb-2">Couldn&apos;t generate the CV this time. Tap Try again.</p>
      )}
      <Button
        size="sm"
        onClick={() => onGenerate()}
        disabled={status === "generating"}
        className="h-8 text-xs bg-rd-primary hover:bg-rd-primary-dark text-white font-display font-bold rounded-full px-4 gap-1.5"
      >
        {status === "generating" ? (
          <><Loader2 className="w-3 h-3 animate-spin" /> Generating…</>
        ) : error ? (
          <>Try again <ArrowRight className="w-3 h-3" /></>
        ) : (
          <>Generate CV <ArrowRight className="w-3 h-3" /></>
        )}
      </Button>
    </div>
  );
}

function AgentRedirectCard({ suggestion, onSwitch }) {
  return (
    <div className="ml-10 mt-2">
      <Button
        size="sm"
        onClick={() => onSwitch(suggestion.page)}
        className="h-8 text-xs bg-rd-golden hover:bg-rd-golden-dark text-white font-display font-bold rounded-full px-4 gap-1.5"
      >
        Switch to {suggestion.label}
        <ArrowRight className="w-3 h-3" />
      </Button>
    </div>
  );
}

// Layout variants:
//   - "page" (default): full-page chat as mounted by CareerAgent / CVAgent
//     / InterviewCoach / SkillDevelopmentAdvisor. Existing behavior.
//   - "drawer": narrow panel mount (PR-A3 agent drawer). Trims horizontal
//     padding from px-6 → px-4 so 520px-wide / 390px-wide containers
//     don't crop, removes the conversation-switcher dropdown (one rolling
//     conversation per user in the drawer; multi-conversation belongs on
//     the full-page CareerAgent surface), and pads the header for the
//     drawer's close button. No fork of internal logic — same query
//     keys, same conversation persistence, same 401-refresh-retry, same
//     20-turn slice. The internal flex-1 overflow-y-auto messages
//     container stays — the drawer panel uses `flex flex-col` (no own
//     scroll), so there's no double-scroll.
export default function ChatInterface({
  agentName,
  title,
  description,
  applicationId,
  suggestedPrompts,
  introMessage,
  variant = "page",
  initialInput = null,
  // PR-B2: page-context payload. The drawer's AgentDrawer reads this
  // from useAgentDrawer() and passes it through; full-page agent
  // surfaces (CareerAgent / CVAgent / InterviewCoach / SkillAdvisor)
  // leave it null so ai-chat falls back to the legacy assembly path
  // (byte-identical). Shape: {page, application_id?, job_id?, role_id?,
  // track?, company_target_id?} — IDs only, validated server-side.
  pageContext = null,
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isDrawer = variant === "drawer";
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState(initialInput || "");

  // Re-seed input when the drawer reopens with a new seed prompt
  // (AgentDrawer passes the same instance across opens — only initialInput
  // changes). Empty seed leaves whatever the user already typed.
  useEffect(() => {
    if (initialInput) setInput(initialInput);
  }, [initialInput]);
  const [sending, setSending] = useState(false);
  const [addedTaskSets, setAddedTaskSets] = useState({});
  const [appliedRoadmapSets, setAppliedRoadmapSets] = useState({});
  const [appliedAppActionSets, setAppliedAppActionSets] = useState({});
  const [appliedCompanyTargetSets, setAppliedCompanyTargetSets] = useState({});
  // Per-message CV generation state keyed by message id:
  //   { [messageId]: { status: "idle"|"generating"|"done", cv_url?, fit_analysis?, error? } }
  // Initialised from the stored `suggestedCVGeneration.result` when a message
  // is loaded, so a previously generated CV's download link survives reloads.
  const [cvGenStates, setCvGenStates] = useState({});

  // Picker-only projection (id+role+company for the CVGenerationCard
  // lookup). Distinct cache key from the Tracker's wide
  // ["applications", uid] query — narrow + same key would poison the
  // wide cache (Lesson 2026-05-28). The agent-page picker queries
  // already share this "picker" key so the lookup is hot.
  const {
    data: applications = [],
    isError: applicationsError,
    error: applicationsErrorObj,
    refetch: refetchApplications,
  } = useQuery({
    queryKey: ["applications", user?.id, "picker"],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("applications")
        // Keep status in this projection so the picker cache reads the
        // same shape whether CareerAgent / CVAgent / InterviewCoach
        // (which all include status) or ChatInterface populated it.
        .select("id, role_title, company, status")
        .eq("user_id", user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // A degraded read here silently starves the coach's context (it proposes
  // adding applications the user already tracked). We can't render an inline
  // error over the chat, but we CAN self-heal the desynced session so the next
  // fetch sees real rows (flag-gated, one-shot). See src/lib/authRecovery.js.
  useEffect(() => {
    if (applicationsError && isAuthError(applicationsErrorObj)) {
      recoverFromAuthError(applicationsErrorObj).then((recovered) => {
        if (recovered) refetchApplications();
      });
    }
  }, [applicationsError, applicationsErrorObj, refetchApplications]);

  // For BulletSaveCard's experience picker when the agent links a captured
  // story to one of the user's experience rows by UUID. Routes through
  // useExperiencesQuery so this narrow consumer no longer pollutes the
  // shared cache with a 3-column projection — see useExperiences.js
  // header for the Eli incident retro.
  const { data: experiences = [] } = useExperiencesQuery(user?.id);
  const { data: educations = [] } = useEducationQuery(user?.id);
  const experiencesById = React.useMemo(() => {
    const m = {};
    for (const e of experiences) {
      m[e.id] = `${e.title || "(untitled)"}${e.company ? ` at ${e.company}` : ""}`;
    }
    return m;
  }, [experiences]);

  // Profile query — uses the canonical cache. We only read profile.skills
  // here, to validate AI-proposed matched_skills in
  // handleApplyRoadmapChanges (anti-fabrication guard).
  const { data: profile = null } = useProfileQuery(user?.id);
  const applicationsById = React.useMemo(() => {
    const m = {};
    for (const a of applications) {
      m[a.id] = `${a.role_title}${a.company ? ` at ${a.company}` : ""}`;
    }
    return m;
  }, [applications]);

  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const bottomRef = useRef(null);
  // Skip the load-messages effect the one time we set activeConversationId
  // inline from sendMessage — the optimistic + just-inserted user message is
  // authoritative; fetching would race the insert and blank the thread.
  const justCreatedConvoRef = useRef(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load conversations for this user+agent+application on mount. Scoping to
  // applicationId is what prevents AG2 context bleed: without the filter, the
  // mount effect would pick up the most-recent conversation for the agent
  // regardless of which application it was anchored to, then sendMessage
  // would reuse that activeConversationId while passing the new application_id
  // to the edge function — mixing one app's chat history with another app's
  // TARGET APPLICATION block in the LLM prompt.
  useEffect(() => {
    if (!user?.id || !agentName) return;
    (async () => {
      let query = supabase
        .from("conversations")
        .select("id, title, updated_at, application_id")
        .eq("user_id", user.id)
        .eq("agent", agentName)
        .order("updated_at", { ascending: false });
      if (applicationId) {
        query = query.eq("application_id", applicationId);
      } else {
        query = query.is("application_id", null);
      }
      const { data, error } = await query;
      if (error) { console.error("Failed to load conversations:", error); return; }
      setConversations(data || []);
      // Don't auto-resume the most recent conversation on cold mount —
      // every fresh agent open starts a clean chat. Past conversations
      // remain accessible from the picker; users opt in by selecting one.
    })();
     
  }, [user?.id, agentName, applicationId]);

  // Load messages when the active conversation changes.
  useEffect(() => {
    if (!activeConversationId) { setMessages([]); return; }
    if (justCreatedConvoRef.current) {
      justCreatedConvoRef.current = false;
      return;
    }
    setLoadingMessages(true);
    (async () => {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("conversation_id", activeConversationId)
        .order("created_at", { ascending: true });
      if (error) {
        console.error("Failed to load messages:", error);
        setMessages([]);
      } else {
        setMessages((data || []).map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          suggestedTasks: Array.isArray(m.suggested_tasks) && m.suggested_tasks.length > 0 ? m.suggested_tasks : null,
          suggestedRoadmapChanges: Array.isArray(m.suggested_roadmap_changes) && m.suggested_roadmap_changes.length > 0 ? m.suggested_roadmap_changes : null,
          suggestedApplicationActions: Array.isArray(m.suggested_application_actions) && m.suggested_application_actions.length > 0 ? m.suggested_application_actions : null,
          suggestedCompanyTargetActions: Array.isArray(m.suggested_company_target_actions) && m.suggested_company_target_actions.length > 0 ? m.suggested_company_target_actions : null,
          suggestedCVGeneration: m.suggested_cv_generation || null,
          suggestedAgent: m.suggested_agent || null,
          isError: m.is_error || false,
          userMessageText: m.original_user_message || null,
        })));
        // Rehydrate CV generation card states from any stored result so a
        // re-opened conversation still shows its download link + fit analysis.
        const rehydrated = {};
        for (const m of data || []) {
          const g = m.suggested_cv_generation;
          if (g && g.result && g.result.cv_url) {
            rehydrated[m.id] = {
              status: "done",
              cv_url: g.result.cv_url,
              fit_analysis: g.result.fit_analysis,
              application_id: g.result.application_id || null,
              tailoring: g.result.tailoring || null,
              unsourced_bullets: Array.isArray(g.result.unsourced_bullets) ? g.result.unsourced_bullets : [],
            };
          }
        }
        setCvGenStates(rehydrated);
      }
      setLoadingMessages(false);
    })();
  }, [activeConversationId]);

  const startNewConversation = () => {
    // Clear active state; the next send creates the DB row lazily.
    setActiveConversationId(null);
    setMessages([]);
    setAddedTaskSets({});
    setAppliedRoadmapSets({});
    setAppliedAppActionSets({});
    setAppliedCompanyTargetSets({});
    setCvGenStates({});
  };

  const selectConversation = (id) => {
    if (id === activeConversationId) return;
    setActiveConversationId(id);
    setAddedTaskSets({});
    setAppliedRoadmapSets({});
    setAppliedAppActionSets({});
    setAppliedCompanyTargetSets({});
    setCvGenStates({});
  };

  const deleteConversation = async (id) => {
    const { error } = await supabase.from("conversations").delete().eq("id", id);
    if (error) { toast.error("Could not delete conversation."); return; }
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (id === activeConversationId) {
      setActiveConversationId(null);
      setMessages([]);
    }
  };

  // Accepts an optional override text — used by suggested-prompt chips so
  // a single click on a chip sends the message immediately, without having
  // to type or press Enter. Falls back to whatever's in the input field.
  const sendMessage = async (overrideText) => {
    const candidate = (typeof overrideText === "string" && overrideText) || input;
    if (!candidate.trim() || sending || !user?.id) return;
    const text = candidate.trim();
    setInput("");

    // chat_message_sent — agent_name only. We deliberately never capture
    // the message body (PII, large, low analytical value).
    track(EVENTS.CHAT_MESSAGE_SENT, { agent_name: agentName || "career-coach" });

    // 1. Ensure we have a conversation row. Create lazily on first send.
    let convoId = activeConversationId;
    let convoIsNew = false;
    if (!convoId) {
      const title = text.slice(0, 60);
      const { data: newConvo, error: createErr } = await supabase
        .from("conversations")
        .insert({
          user_id: user.id,
          agent: agentName || "career-coach",
          title,
          ...(applicationId && { application_id: applicationId }),
        })
        .select("id, title, updated_at, application_id")
        .single();
      if (createErr || !newConvo) {
        console.error("Could not create conversation:", createErr);
        toast.error("Could not start conversation. Please try again.");
        return;
      }
      convoId = newConvo.id;
      convoIsNew = true;
      justCreatedConvoRef.current = true;
      setActiveConversationId(convoId);
      setConversations((prev) => [newConvo, ...prev]);
    }

    // 2. Optimistic user message + persist
    const userMsgLocalId = crypto.randomUUID();
    const userMsg = { role: "user", content: text, id: userMsgLocalId };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setSending(true);

    const { data: inserted, error: userInsertErr } = await supabase
      .from("chat_messages")
      .insert({ conversation_id: convoId, role: "user", content: text })
      .select("id")
      .single();
    if (userInsertErr) {
      console.error("Failed to persist user message:", userInsertErr);
      // Keep going — the AI call is the primary UX
    } else if (inserted?.id) {
      setMessages((prev) => prev.map((m) => m.id === userMsgLocalId ? { ...m, id: inserted.id } : m));
    }

    // 3. Call AI
    try {
      const invokeBody = {
        message: text,
        agent: agentName || "career-coach",
        conversation_history: updatedMessages.slice(-20).filter((m) => m.role !== "system"),
        chat_model: CHAT_MODEL,
        ...(applicationId && { application_id: applicationId }),
        // PR-B2: forward page_context verbatim when the drawer surface
        // populated it. Server sanitizes + fetches authoritatively, so
        // there's no risk of the client claiming entity content.
        ...(pageContext && { page_context: pageContext }),
      };
      let { data, error } = await supabase.functions.invoke("ai-chat", { body: invokeBody });

      // 401 from the edge function = expired JWT (auth.getUser returned no user).
      // Try one auth.refreshSession + retry before surfacing the error — the
      // root cause is auth, not connectivity, and the supabase-js client
      // automatically uses the refreshed token on the next call. If refresh
      // fails or retry still 401s, fall through to the catch with a flag so
      // the user sees "session expired" instead of misleading "AI unavailable."
      if (error?.context?.status === 401) {
        const { error: refreshErr } = await supabase.auth.refreshSession();
        if (!refreshErr) {
          ({ data, error } = await supabase.functions.invoke("ai-chat", { body: invokeBody }));
        }
      }

      if (error) throw error;
      if (!data?.reply) throw new Error("The AI returned an empty response.");

      const assistantContent = data.reply;
      const assistantPayload = {
        conversation_id: convoId,
        role: "assistant",
        content: assistantContent,
        suggested_tasks: data.suggested_tasks?.length > 0 ? data.suggested_tasks : null,
        suggested_roadmap_changes: data.suggested_roadmap_changes?.length > 0 ? data.suggested_roadmap_changes : null,
        suggested_application_actions: data.suggested_application_actions?.length > 0 ? data.suggested_application_actions : null,
        suggested_company_target_actions: data.suggested_company_target_actions?.length > 0 ? data.suggested_company_target_actions : null,
        suggested_cv_generation: data.suggested_cv_generation || null,
        suggested_agent: data.suggested_agent || null,
      };

      const { data: savedAssistant } = await supabase
        .from("chat_messages")
        .insert(assistantPayload)
        .select("id")
        .single();

      setMessages((prev) => [
        ...prev,
        {
          id: savedAssistant?.id || crypto.randomUUID(),
          role: "assistant",
          content: assistantContent,
          suggestedTasks: assistantPayload.suggested_tasks,
          suggestedRoadmapChanges: assistantPayload.suggested_roadmap_changes,
          suggestedApplicationActions: assistantPayload.suggested_application_actions,
          suggestedCompanyTargetActions: assistantPayload.suggested_company_target_actions,
          suggestedCVGeneration: assistantPayload.suggested_cv_generation,
          suggestedAgent: assistantPayload.suggested_agent,
          // Bullet-capture is in-memory only — not persisted on
          // chat_messages. Reload hides the card; user re-triggers by
          // continuing the conversation.
          suggestedBulletCapture: data.suggested_bullet_capture || null,
          suggestedAddSkill: data.suggested_add_skill || null,
        },
      ]);

      // 4. Touch conversation updated_at + set title if this was the very first send
      const patch = { updated_at: new Date().toISOString() };
      if (convoIsNew) patch.title = text.slice(0, 60);
      await supabase.from("conversations").update(patch).eq("id", convoId);
      setConversations((prev) =>
        prev.map((c) => c.id === convoId ? { ...c, ...patch } : c)
            .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
      );
    } catch (err) {
      console.error("Chat error:", err);
      // Session expired = refresh+retry above already failed. Suppress the
      // Retry button (userMessageText: null) — re-sending with the same
      // expired auth won't help. User must sign in again.
      const sessionExpired = err?.context?.status === 401;
      const errMsg = {
        role: "assistant",
        content: sessionExpired
          ? "Your session expired. Please sign out and sign in again to continue."
          : "I couldn't reach the AI service. This is usually temporary - tap Retry to try again.",
        id: crypto.randomUUID(),
        isError: true,
        userMessageText: sessionExpired ? null : text,
      };
      setMessages((prev) => [...prev, errMsg]);
      await supabase.from("chat_messages").insert({
        conversation_id: convoId,
        role: "assistant",
        content: errMsg.content,
        is_error: true,
        original_user_message: text,
      });
    }
    setSending(false);
  };

  // Re-invoke ai-chat with the same user text after a failure. Mirrors the
  // call+persist+render block at the bottom of sendMessage; intentionally
  // duplicated rather than abstracted into a helper, since refactoring the
  // happy path of sendMessage carries higher regression risk than the
  // duplication does.
  const retryLastSend = async (errorMessageId, userText) => {
    if (sending || !user?.id || !activeConversationId || !userText) return;
    setMessages((prev) => prev.filter((m) => m.id !== errorMessageId));
    setSending(true);
    try {
      const historyForCall = messages
        .filter((m) => m.id !== errorMessageId && m.role !== "system")
        .slice(-20);
      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: {
          message: userText,
          agent: agentName || "career-coach",
          conversation_history: historyForCall,
          chat_model: CHAT_MODEL,
          ...(applicationId && { application_id: applicationId }),
          ...(pageContext && { page_context: pageContext }),
        },
      });
      if (error) throw error;
      if (!data?.reply) throw new Error("The AI returned an empty response.");

      const assistantPayload = {
        conversation_id: activeConversationId,
        role: "assistant",
        content: data.reply,
        suggested_tasks: data.suggested_tasks?.length > 0 ? data.suggested_tasks : null,
        suggested_roadmap_changes: data.suggested_roadmap_changes?.length > 0 ? data.suggested_roadmap_changes : null,
        suggested_application_actions: data.suggested_application_actions?.length > 0 ? data.suggested_application_actions : null,
        suggested_company_target_actions: data.suggested_company_target_actions?.length > 0 ? data.suggested_company_target_actions : null,
        suggested_cv_generation: data.suggested_cv_generation || null,
        suggested_agent: data.suggested_agent || null,
      };
      const { data: savedAssistant } = await supabase
        .from("chat_messages")
        .insert(assistantPayload)
        .select("id")
        .single();

      setMessages((prev) => [...prev, {
        id: savedAssistant?.id || crypto.randomUUID(),
        role: "assistant",
        content: data.reply,
        suggestedTasks: assistantPayload.suggested_tasks,
        suggestedRoadmapChanges: assistantPayload.suggested_roadmap_changes,
        suggestedApplicationActions: assistantPayload.suggested_application_actions,
        suggestedCompanyTargetActions: assistantPayload.suggested_company_target_actions,
        suggestedCVGeneration: assistantPayload.suggested_cv_generation,
        suggestedAgent: assistantPayload.suggested_agent,
        suggestedBulletCapture: data.suggested_bullet_capture || null,
        suggestedAddSkill: data.suggested_add_skill || null,
      }]);
    } catch (err) {
      console.error("Chat retry error:", err);
      const errMsg = {
        role: "assistant",
        content: "Still couldn't reach the AI. Please check your connection and try again.",
        id: crypto.randomUUID(),
        isError: true,
        userMessageText: userText,
      };
      setMessages((prev) => [...prev, errMsg]);
      await supabase.from("chat_messages").insert({
        conversation_id: activeConversationId,
        role: "assistant",
        content: errMsg.content,
        is_error: true,
        original_user_message: userText,
      });
    }
    setSending(false);
  };

  const handleAddTasks = async (messageId, task, taskIndex) => {
    if (!user?.id || addedTaskSets[messageId]?.[taskIndex]) return;
    const res = await applyTaskSuggestion({ user, task });
    if (res.error) {
      toast.error("Could not add task. Please try again.");
      return;
    }
    setAddedTaskSets((prev) => ({
      ...prev,
      [messageId]: { ...(prev[messageId] || {}), [taskIndex]: true },
    }));
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
    toast.success("Task added");
  };

  const handleApplyRoadmapChanges = async (messageId, changes) => {
    if (!user?.id || appliedRoadmapSets[messageId]) return;
    const userSkills = (profile?.skills || []).filter((s) => typeof s === "string");
    const res = await sharedApplyRoadmapChanges({ user, changes, userSkills });
    const pathCRoles = res.pathCRoles || [];
    if (pathCRoles.length > 0) {
      toast.info(`Added ${pathCRoles.join(", ")} to your roadmap. Click "Refresh Analysis" on Career Roadmap to compute the skill breakdown.`);
    }
    if (res.error) {
      toast.error("Some changes could not be applied. Please try again.");
      return;
    }
    setAppliedRoadmapSets((prev) => ({ ...prev, [messageId]: true }));
    queryClient.invalidateQueries({ queryKey: ["careerRoles"] });
    if (pathCRoles.length === 0) toast.success("Roadmap updated");
  };

  const handleApplyApplicationActions = async (messageId, actions) => {
    if (!user?.id || appliedAppActionSets[messageId]) return;
    const res = await sharedApplyApplicationActions({ user, queryClient, actions });
    if (res.error) {
      toast.error("Some applications could not be updated. Please try again.");
      return;
    }
    setAppliedAppActionSets((prev) => ({ ...prev, [messageId]: true }));
    queryClient.invalidateQueries({ queryKey: ["applications"] });
    toast.success("Applications updated");
  };

  // Apply handler for SUGGESTED_COMPANY_TARGET_JSON. Three action paths:
  //
  //   add_company_target
  //     1. Case-insensitive lookup of company by name in `companies`.
  //     2. If missing, INSERT with source='manual' + whatever metadata the
  //        agent passed (sector, domain). RLS allows authenticated users
  //        to INSERT companies only when source='manual'.
  //     3. INSERT company_targets with source='self_added', status
  //        'exploring', plus optional pitch fields the agent provided.
  //        Unique (user, company) conflict → toast "already in pipeline".
  //
  //   update_company_target_status
  //     1. ilike lookup on companies.name → join company_targets.
  //     2. UPDATE status — trigger writes audit row.
  //     3. If note provided, patch the just-inserted audit row's note column.
  //        (Same two-phase pattern as the Drawer's status-change form.)
  //
  //   enrich_company
  //     1. ilike lookup. UPDATE description/sector/domain/industry on the
  //        matched companies row. RLS allows UPDATE only when source='manual'.
  const handleApplyCompanyTargetActions = async (messageId, actions) => {
    if (!user?.id || appliedCompanyTargetSets[messageId]) return;
    const res = await sharedApplyCompanyTargetActions({ user, actions });
    if (res.error) {
      toast.error("Some internship changes could not be applied. Please try again.");
      return;
    }
    setAppliedCompanyTargetSets((prev) => ({ ...prev, [messageId]: true }));
    queryClient.invalidateQueries({ queryKey: ["company_targets", user.id] });
    if (res.skippedDuplicate > 0) {
      toast.message(`Already in your pipeline - skipped ${res.skippedDuplicate}.`);
    } else {
      toast.success("Internship updated");
    }
  };

  const handleGenerateCV = async (messageId, proposal, appActions) => {
    if (!user?.id || !proposal?.target_role) return;
    if (cvGenStates[messageId]?.status === "generating" || cvGenStates[messageId]?.status === "done") return;

    setCvGenStates((prev) => ({ ...prev, [messageId]: { status: "generating" } }));
    // F1/orphan: if this turn also proposes a NEW tracked app, the linked helper
    // creates it FIRST (with the coach's JD) so the CV is born linked, never an
    // orphan. On success we mark the app-action card applied to prevent a
    // double-create if the user also clicks its Apply button.
    const res = await sharedGenerateTailoredCVLinked({ user, queryClient, proposal, appActions, messageId });
    if (res.linkedNewApp) {
      setAppliedAppActionSets((prev) => ({ ...prev, [messageId]: true }));
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    }
    if (res.error) {
      setCvGenStates((prev) => ({ ...prev, [messageId]: { status: "idle", error: res.error } }));
      toast.error(res.error);
      return;
    }
    setCvGenStates((prev) => ({ ...prev, [messageId]: res.result }));
    // Auto-scroll to the finished CV card so the user cannot miss where it
    // landed (the messages effect does not fire on a cvGenStates-only change).
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 60);
    if (res.unknownCompany) {
      // ⑤ (QA2): never silently file an app with no company. Say so, and invite
      // the correction, instead of leaving a mystery "Unknown" in the tracker.
      toast.success("CV generated and added to your tracker - I didn't catch the company name, so tell me anytime and I'll fill it in.");
    } else if (res.result.application_id) {
      toast.success("CV linked to your application tracker!");
    } else {
      toast.success("CV generated");
    }

    // Path B follow-up: give the agent a clean second turn to check
      // whether the user's previous message contained a story-worthy moment
      // that wasn't captured. Path A's same-turn cross-emission was unreliable
      // (1/3 hit rate on mixed messages + false-positive CV emissions on
      // pure-story messages). The follow-up turn drops competing markers
      // entirely so the agent can focus on one job.
      //
      // Frontend gate (added 2026-05-05): even with the narrowed prompt the
      // follow-up was emitting story-capture proposals after generation
      // requests like "Generate a CV for Junior PM" — the model was finding
      // SOMETHING to extract because it had been primed to look hard. Gate
      // here on a deterministic story-shape check of the last user message
      // before paying for the LLM call. False-positives are far worse for
      // trust than missing the occasional legit story (user can still
      // capture manually).
      //
      // Non-blocking — if the follow-up errors we still keep the CV-gen
      // success state. The synthetic user message ("[CV ready]") is sent in
      // the API call only; it's NOT added to local messages state so it
      // never renders in chat. Future turns also won't see it in history.
      try {
        const conversationId = activeConversationId;
        // Find the last REAL user message (the one before the user clicked
        // Generate on the CV card). We don't look at "[CV ready]" — that's
        // the synthetic marker we're about to send.
        const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
        if (!lastUserMessage || !looksLikeStory(lastUserMessage.content)) {
          // Skip follow-up entirely when the last user message wasn't
          // story-shaped. Saves an LLM call and prevents false-positives.
          return;
        }
        if (conversationId) {
          const historyForFollowUp = messages
            .filter((m) => m.role !== "system")
            .slice(-20);
          const { data: followData, error: followError } = await supabase.functions.invoke("ai-chat", {
            body: {
              message: "[CV ready]",
              agent: agentName || "career-coach",
              conversation_history: historyForFollowUp,
              chat_model: CHAT_MODEL,
              follow_up_after: "cv_generation",
              ...(applicationId && { application_id: applicationId }),
            },
          });
          if (!followError && followData?.reply) {
            const followPayload = {
              conversation_id: conversationId,
              role: "assistant",
              content: followData.reply,
            };
            const { data: savedFollow } = await supabase
              .from("chat_messages")
              .insert(followPayload)
              .select("id")
              .single();
            setMessages((prev) => [...prev, {
              id: savedFollow?.id || crypto.randomUUID(),
              role: "assistant",
              content: followData.reply,
              suggestedBulletCapture: followData.suggested_bullet_capture || null,
              suggestedAddSkill: followData.suggested_add_skill || null,
            }]);
          }
        }
    } catch (followUpErr) {
      // Don't surface to the user — CV gen already succeeded; missed
      // story-capture is acceptable degradation, not a failure.
      console.warn("Story-capture follow-up failed (non-blocking):", followUpErr);
    }
  };

  // QA2 P0: CV generation is CLICK-GATED — no fire-on-mount. The coach card
  // renders a Generate button (see CVGenerationCard.onGenerate); generation runs
  // only on the user's click, never on the mere emission of a proposal block.
  // handleGenerateCV is idempotent (skips already-generated / in-flight).

  const handleSwitchAgent = (page) => {
    navigate(createPageUrl(page));
  };

  // BulletSaveCard handlers. extract -> propose bullets; save -> append to
  // experiences.bullets (snapshotting prior for undo); undo -> restore the
  // snapshot. Routed through coachActionHandlers so the dock (CoachThread)
  // shares the exact same path. Phase 4 (PR #377/#378): experiences.bullets now
  // feeds CV generation, so a successful save fires a post-save follow-up turn
  // (follow_up_after: "bullet_capture") letting the agent acknowledge the save
  // verbally (the bullet is available for future CV generations; no card).
  const bulletsCacheKey = (targetType) =>
    targetType === "education" ? "education" : "experiences";

  const handleExtractBullets = (text, targetType, targetId) =>
    sharedExtractBullets({ text, targetType, targetId });

  // Post-save acknowledgement follow-up. Non-blocking: the bullet save already
  // succeeded, so a failed follow-up is acceptable degradation, not a save
  // failure. The synthetic "[bullet saved]" message is sent in the API call
  // only; it is NOT added to local messages state so it never renders in chat.
  const fireBulletCaptureRegenFollowUp = async () => {
    try {
      const conversationId = activeConversationId;
      if (!conversationId) return;
      const historyForFollowUp = messages
        .filter((m) => m.role !== "system")
        .slice(-20);
      const { data: followData, error: followError } = await supabase.functions.invoke("ai-chat", {
        body: {
          message: "[bullet saved]",
          agent: agentName || "career-coach",
          conversation_history: historyForFollowUp,
          chat_model: CHAT_MODEL,
          follow_up_after: "bullet_capture",
          ...(applicationId && { application_id: applicationId }),
        },
      });
      if (followError || !followData?.reply) return;
      const followPayload = {
        conversation_id: conversationId,
        role: "assistant",
        content: followData.reply,
      };
      const { data: savedFollow } = await supabase
        .from("chat_messages")
        .insert(followPayload)
        .select("id")
        .single();
      setMessages((prev) => [
        ...prev,
        {
          id: savedFollow?.id || crypto.randomUUID(),
          role: "assistant",
          content: followData.reply,
          suggestedCVGeneration: followData.suggested_cv_generation || null,
        },
      ]);
    } catch (followUpErr) {
      console.warn("Bullet-capture regen follow-up failed (non-blocking):", followUpErr);
    }
  };

  const handleSaveBullets = async ({ bullets, skills, targetType, targetId }) => {
    if (!user?.id) return { error: "Not signed in." };
    const res = await sharedAppendBullets({
      user,
      targetType,
      targetId,
      bullets,
      skills,
    });
    if (res.error) {
      toast.error(res.error);
      return { error: res.error };
    }
    queryClient.invalidateQueries({ queryKey: [bulletsCacheKey(targetType)] });
    // Phase 4: post-save turn so the agent verbally acknowledges the save.
    void fireBulletCaptureRegenFollowUp();
    return { ok: true, snapshot: res.snapshot };
  };

  const handleUndoBullets = async ({ snapshot, targetType, targetId }) => {
    if (!user?.id) return false;
    const res = await sharedRestoreBullets({
      user,
      targetType,
      targetId,
      snapshot,
    });
    if (res.error) {
      toast.error(res.error);
      return false;
    }
    queryClient.invalidateQueries({ queryKey: [bulletsCacheKey(targetType)] });
    return true;
  };

  // Add-skill — appends a user-stated skill to a specific experience via
  // the centralized handler. Returns the handler result so AddSkillCard
  // can flip to its saved/already-present state; a failure surfaces a
  // toast AND the card's inline error (loud, never silent).
  const handleAddSkill = async ({ skill, experienceId }) => {
    if (!user?.id) return { error: "Not signed in." };
    const res = await sharedApplyAddSkillToExperience({
      user,
      queryClient,
      skill,
      experienceId,
    });
    if (res.error) {
      toast.error(res.error);
      return res;
    }
    toast.success(res.alreadyPresent ? "Already on that experience" : "Skill added");
    return res;
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div
      className={`flex flex-col h-full ${isDrawer ? "bg-rd-bg-card" : "bg-rd-bg-page"} font-body text-rd-text`}
      data-chat-variant={variant}
    >
      {/* Header */}
      <div
        className={`${isDrawer ? "px-4 pr-12 py-3" : "px-6 py-3.5"} border-b border-rd-border bg-rd-bg-card flex items-center justify-between gap-3`}
      >
        <div className="min-w-0">
          <h2 className="font-display font-bold text-[14.5px] text-rd-text leading-tight">{title}</h2>
          {description && !isDrawer && (
            <p className="text-[12px] text-rd-text-secondary leading-snug mt-0.5 max-w-[540px] truncate">{description}</p>
          )}
        </div>
        {/* Conversation switcher hidden in drawer mode — one rolling
            conversation per user; multi-conversation switching belongs
            on the full-page CareerAgent surface. */}
        {!isDrawer && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Conversation switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="text-xs max-w-[220px] border-rd-border text-rd-text hover:bg-rd-bg-soft">
                <MessageSquare className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
                <span className="truncate">
                  {conversations.find((c) => c.id === activeConversationId)?.title || "New conversation"}
                </span>
                <ChevronDown className="w-3.5 h-3.5 ml-1.5 flex-shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[320px]">
              <DropdownMenuItem onClick={startNewConversation} className="text-sm">
                <Plus className="w-3.5 h-3.5 mr-2" />
                New conversation
              </DropdownMenuItem>
              {conversations.length > 0 && <DropdownMenuSeparator />}
              {conversations.map((c) => (
                <DropdownMenuItem
                  key={c.id}
                  onClick={() => selectConversation(c.id)}
                  className="text-sm flex items-center justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate">{c.title || "Untitled"}</p>
                    <p className="text-[10px] text-rd-text-tertiary">{new Date(c.updated_at).toLocaleDateString()}</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); deleteConversation(c.id); }}
                    className="p-1 rounded hover:bg-rd-primary-tint text-rd-text-tertiary hover:text-rd-primary-dark flex-shrink-0"
                    aria-label="Delete conversation"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        )}
      </div>

      {/* Messages */}
      <div className={`flex-1 overflow-y-auto ${isDrawer ? "px-4 py-4" : "px-6 py-6"} space-y-4`}>
        {loadingMessages && (
          <div className="flex items-center justify-center py-8 text-xs text-rd-text-tertiary">
            <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Loading conversation…
          </div>
        )}
        {!loadingMessages && messages.length === 0 && (
          <div className="text-center py-12 space-y-4">
            {introMessage ? (
              <p className="text-sm text-rd-text-secondary max-w-md mx-auto leading-relaxed whitespace-pre-line">
                {introMessage}
              </p>
            ) : (
              <p className="text-sm text-rd-text-secondary">
                Start a conversation. Ask a question about your career path.
              </p>
            )}
            {suggestedPrompts?.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center">
                {suggestedPrompts.map((prompt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => sendMessage(prompt)}
                    disabled={sending}
                    className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-rd-bg-card border border-rd-border text-rd-text-secondary font-body text-[12.5px] font-medium hover:bg-rd-primary-tint hover:border-rd-primary hover:text-rd-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {messages
          .filter((m) => m.role !== "system")
          .map((msg, i) => (
            <React.Fragment key={msg.id || i}>
              <MessageBubble message={msg} />
              {msg.suggestedTasks && (
                <TaskSuggestionCard
                  messageId={msg.id}
                  tasks={msg.suggestedTasks}
                  addedTaskSets={addedTaskSets}
                  onAdd={handleAddTasks}
                />
              )}
              {msg.suggestedRoadmapChanges && (
                <RoadmapChangeCard
                  messageId={msg.id}
                  changes={msg.suggestedRoadmapChanges}
                  applied={appliedRoadmapSets}
                  onApply={handleApplyRoadmapChanges}
                />
              )}
              {msg.suggestedApplicationActions && (
                <ApplicationActionsCard
                  messageId={msg.id}
                  actions={msg.suggestedApplicationActions}
                  applied={appliedAppActionSets}
                  onApply={handleApplyApplicationActions}
                />
              )}
              {msg.suggestedCompanyTargetActions && (
                <CompanyTargetActionsCard
                  messageId={msg.id}
                  actions={msg.suggestedCompanyTargetActions}
                  applied={appliedCompanyTargetSets}
                  onApply={handleApplyCompanyTargetActions}
                />
              )}
              {msg.suggestedCVGeneration && msg.suggestedCVGeneration.target_role && (
                <CVGenerationCard
                  proposal={msg.suggestedCVGeneration}
                  state={cvGenStates[msg.id]}
                  onGenerate={() => handleGenerateCV(msg.id, msg.suggestedCVGeneration, msg.suggestedApplicationActions)}
                  appLabel={applicationsById[msg.suggestedCVGeneration.application_id] || null}
                  userName={profile?.full_name}
                />
              )}
              {msg.suggestedBulletCapture && msg.suggestedBulletCapture.text && (
                <BulletSaveCard
                  capture={msg.suggestedBulletCapture}
                  experiences={experiences}
                  educations={educations}
                  onExtract={handleExtractBullets}
                  onSave={handleSaveBullets}
                  onUndo={handleUndoBullets}
                />
              )}
              {msg.suggestedAddSkill && msg.suggestedAddSkill.skill && (
                <AddSkillCard
                  skill={msg.suggestedAddSkill.skill}
                  experienceLabel={experiencesById[msg.suggestedAddSkill.experience_id] || null}
                  onConfirm={() =>
                    handleAddSkill({
                      skill: msg.suggestedAddSkill.skill,
                      experienceId: msg.suggestedAddSkill.experience_id,
                    })
                  }
                />
              )}
              {msg.suggestedAgent && (
                <AgentRedirectCard
                  suggestion={msg.suggestedAgent}
                  onSwitch={handleSwitchAgent}
                />
              )}
              {msg.isError && msg.userMessageText && (
                <div className="ml-10 mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => retryLastSend(msg.id, msg.userMessageText)}
                    disabled={sending}
                    className="text-xs h-7"
                  >
                    <RefreshCw className="w-3 h-3 mr-1.5" /> Retry
                  </Button>
                </div>
              )}
            </React.Fragment>
          ))}

        {/* Typing indicator — coral-tint avatar + warm bubble dots */}
        {sending && (
          <div className="flex gap-3">
            <div className="w-[26px] h-[26px] rounded-full bg-rd-primary-tint flex items-center justify-center flex-shrink-0 mt-[2px]">
              <div className="w-1.5 h-1.5 rounded-full bg-rd-primary" />
            </div>
            <div className="inline-flex gap-1 items-center px-3.5 py-2.5 bg-rd-bg-soft rounded-tl-[14px] rounded-tr-[14px] rounded-br-[14px] rounded-bl-[4px]">
              <span className="w-[5px] h-[5px] rounded-full bg-rd-text-tertiary animate-chat-typing" />
              <span className="w-[5px] h-[5px] rounded-full bg-rd-text-tertiary animate-chat-typing [animation-delay:0.15s]" />
              <span className="w-[5px] h-[5px] rounded-full bg-rd-text-tertiary animate-chat-typing [animation-delay:0.3s]" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className={`${isDrawer ? "px-4 pt-3 pb-4" : "px-6 pt-3.5 pb-[18px]"} border-t border-rd-border bg-rd-bg-card`}>
        {messages.length > 0 && (
          <div className="flex justify-end mb-2">
            <button
              onClick={startNewConversation}
              className="text-xs text-rd-text-secondary hover:text-rd-text flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3 h-3" /> New chat
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message your agent…"
            rows={1}
            className="flex-1 px-3.5 py-2.5 rounded-[14px] border border-rd-border bg-rd-bg-card text-rd-text font-body text-[14px] min-h-[42px] max-h-[120px] resize-none transition-colors placeholder:text-rd-text-tertiary focus:outline-none focus:border-rd-primary focus:shadow-[0_0_0_3px_var(--rd-primary-tint)]"
          />
          <button
            type="button"
            onClick={() => sendMessage()}
            disabled={sending || !input.trim()}
            aria-label="Send message"
            className="w-[42px] h-[42px] rounded-full bg-rd-primary hover:bg-rd-primary-dark text-white border-0 inline-flex items-center justify-center cursor-pointer flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97] transition-all"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
