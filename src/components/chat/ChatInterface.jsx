import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Send, Loader2, Plus, ListTodo, CheckCircle2, ArrowRight, Route, Briefcase, ChevronDown, Trash2, MessageSquare, FileText, Download, RefreshCw } from "lucide-react";
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
import { resolveDueDate } from "@/lib/taskDueDate";
import { scoreApplication } from "@/lib/scoreApplication";
import {
  validTier,
  validStatus,
  validInterviewStage,
  validateMatchedSkills,
  sanitizeMissingSkills,
  clampScore,
  sanitizeText,
  sanitizeActionItems,
} from "@/lib/applyHandlerValidation";
import MessageBubble from "./MessageBubble";
import StorySaveCard from "./StorySaveCard";

const TIER_LABELS = {
  tier_1: "Tier 1 — Your Move",
  tier_2: "Tier 2 — Plan B",
  tier_3: "Tier 3 — Work Toward",
};

function TaskSuggestionCard({ messageId, tasks, addedTaskSets, onAdd }) {
  const addedForMessage = addedTaskSets[messageId] || {};
  return (
    <div className="ml-10 mt-2 bg-blue-50 border border-blue-200 rounded-xl p-4 max-w-xl">
      <div className="flex items-center gap-2 mb-3">
        <ListTodo className="w-3.5 h-3.5 text-blue-700" />
        <p className="text-xs font-semibold text-blue-800">Suggested Tasks</p>
      </div>
      <ul className="space-y-2">
        {tasks.map((task, i) => (
          <li key={i} className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-blue-800 leading-snug">{task.title}</p>
              {task.description && (
                <p className="text-[11px] text-blue-600 mt-0.5 leading-snug">{task.description}</p>
              )}
            </div>
            {addedForMessage[i] ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <button
                onClick={() => onAdd(messageId, task, i)}
                className="text-[11px] font-medium text-blue-700 hover:text-blue-900 bg-white border border-blue-300 hover:border-blue-500 rounded px-2 py-0.5 shrink-0 transition-colors"
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
      <div className="ml-10 mt-2 bg-emerald-50 border border-emerald-200 rounded-xl p-4 max-w-xl">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <p className="text-xs font-semibold text-emerald-800">Roadmap changes applied</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ml-10 mt-2 bg-indigo-50 border border-indigo-200 rounded-xl p-4 max-w-xl">
      <div className="flex items-center gap-2 mb-3">
        <Route className="w-3.5 h-3.5 text-indigo-700" />
        <p className="text-xs font-semibold text-indigo-800">Proposed Roadmap Changes</p>
      </div>
      <ul className="space-y-2 mb-3">
        {changes.map((change, i) => (
          <li key={i} className="text-xs text-indigo-700 leading-relaxed">
            {change.action === "update_tier" && (
              <span>Move <strong>{change.role_title}</strong> → {TIER_LABELS[change.new_tier] || change.new_tier}</span>
            )}
            {change.action === "add_role" && (
              <span>Add <strong>{change.title}</strong> as {TIER_LABELS[change.tier] || change.tier}</span>
            )}
            {change.action === "remove_role" && (
              <span>Remove <strong>{change.role_title}</strong></span>
            )}
            {change.reason && (
              <span className="text-indigo-500"> — {change.reason}</span>
            )}
          </li>
        ))}
      </ul>
      <Button
        size="sm"
        onClick={() => onApply(messageId, changes)}
        className="h-7 text-xs bg-indigo-700 hover:bg-indigo-800 gap-1.5"
      >
        Apply Changes
      </Button>
    </div>
  );
}

function ApplicationActionsCard({ messageId, actions, applied, onApply }) {
  if (applied[messageId]) {
    return (
      <div className="ml-10 mt-2 bg-emerald-50 border border-emerald-200 rounded-xl p-4 max-w-xl">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <p className="text-xs font-semibold text-emerald-800">Applications updated</p>
        </div>
      </div>
    );
  }
  return (
    <div className="ml-10 mt-2 bg-blue-50 border border-blue-200 rounded-xl p-4 max-w-xl">
      <div className="flex items-center gap-2 mb-3">
        <Briefcase className="w-3.5 h-3.5 text-blue-700" />
        <p className="text-xs font-semibold text-blue-800">Proposed Application Changes</p>
      </div>
      <ul className="space-y-2 mb-3">
        {actions.map((a, i) => (
          <li key={i} className="text-xs text-blue-900 leading-relaxed">
            {a.action === "add_application" && (
              <span>Add <strong>{a.company}</strong> — {a.role_title} ({a.status || "interested"}{a.tier ? `, ${a.tier}` : ""})</span>
            )}
            {a.action === "update_application" && (
              <span>
                Update <strong>{a.match_company}</strong> — {a.match_role_title}:
                {a.new_status && <span> status → {a.new_status}</span>}
                {a.new_interview_stage && <span>, stage → {a.new_interview_stage}</span>}
                {a.new_tier && <span>, tier → {a.new_tier}</span>}
                {a.new_notes && <span>, notes updated</span>}
              </span>
            )}
          </li>
        ))}
      </ul>
      <Button
        size="sm"
        onClick={() => onApply(messageId, actions)}
        className="h-7 text-xs bg-blue-700 hover:bg-blue-800 gap-1.5"
      >
        Apply Changes
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
      <div className="ml-10 mt-2 bg-emerald-50 border border-emerald-200 rounded-xl p-4 max-w-xl">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <p className="text-xs font-semibold text-emerald-800">Practicum updated</p>
        </div>
      </div>
    );
  }
  return (
    <div className="ml-10 mt-2 bg-blue-50 border border-blue-200 rounded-xl p-4 max-w-xl">
      <div className="flex items-center gap-2 mb-3">
        <Briefcase className="w-3.5 h-3.5 text-blue-700" />
        <p className="text-xs font-semibold text-blue-800">Proposed Practicum Changes</p>
      </div>
      <ul className="space-y-2 mb-3">
        {actions.map((a, i) => (
          <li key={i} className="text-xs text-blue-900 leading-relaxed">
            {a.action === "add_company_target" && (
              <span>
                Add <strong>{a.company_name}</strong> to your practicum
                {a.company_sector ? ` (${a.company_sector})` : ""}
                {a.pitched_role && <span> · pitch: {a.pitched_role}</span>}
              </span>
            )}
            {a.action === "update_company_target_status" && (
              <span>
                Update <strong>{a.match_company}</strong>: status → {PRACTICUM_STATUS_LABELS[a.new_status] || a.new_status}
                {a.note && <span> · note: "{a.note.slice(0, 80)}{a.note.length > 80 ? "…" : ""}"</span>}
              </span>
            )}
            {a.action === "enrich_company" && (
              <span>
                Enrich <strong>{a.match_company}</strong> with{" "}
                {[a.description && "description", a.sector && "sector", a.domain && "domain", a.industry && "industry"].filter(Boolean).join(", ")}
              </span>
            )}
          </li>
        ))}
      </ul>
      <Button
        size="sm"
        onClick={() => onApply(messageId, actions)}
        className="h-7 text-xs bg-blue-700 hover:bg-blue-800 gap-1.5"
      >
        Apply Changes
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
function CVGenerationCard({ proposal, state, onGenerate, appLabel }) {
  const { status, cv_url, fit_analysis, application_id, tailoring, error } = state || {};
  // Template style — local to the card. Default ATS-Optimized matches the
  // tracker default and the safer-for-portals research call. User can flip
  // to Polished before clicking Generate.
  const [templateStyle, setTemplateStyle] = useState("ats-optimized");

  if (status === "done" && cv_url) {
    const alignment = fit_analysis?.alignment;
    const pct = typeof fit_analysis?.skill_match_percentage === "number"
      ? Math.round(fit_analysis.skill_match_percentage)
      : null;
    const alignClass =
      alignment === "Strong" ? "text-emerald-700"
      : alignment === "Moderate" ? "text-amber-700"
      : alignment === "Weak" ? "text-red-700"
      : "text-[#525252]";
    return (
      <div className="ml-10 mt-2 bg-emerald-50 border border-emerald-200 rounded-xl p-4 max-w-xl">
        <div className="flex items-center gap-2 mb-1">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <p className="text-xs font-semibold text-emerald-800">CV generated for {proposal.target_role}</p>
        </div>
        {application_id && (
          <p className="text-[11px] text-emerald-700 mb-2">✓ Linked to your application tracker</p>
        )}
        {fit_analysis && (
          <div className="mb-3 bg-white border border-emerald-100 rounded-lg px-3 py-2 text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[#525252]">Fit</span>
              <span className={`font-semibold ${alignClass}`}>
                {alignment || "—"}{pct != null ? ` · ${pct}%` : ""}
              </span>
            </div>
            {typeof tailoring?.tailoring_score === "number" && (
              <div className="flex items-center justify-between">
                <span className="text-[#525252]">Keyword match</span>
                <span className="font-semibold text-[#525252]">{tailoring.tailoring_score}%</span>
              </div>
            )}
            {Array.isArray(fit_analysis.major_gaps) && fit_analysis.major_gaps.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-[#A3A3A3] font-medium mt-1">Major gaps</p>
                <p className="text-[11px] text-[#525252]">{fit_analysis.major_gaps.join(" · ")}</p>
              </div>
            )}
            {fit_analysis.explanation && (
              <p className="text-[11px] text-[#525252] leading-relaxed pt-1">{fit_analysis.explanation}</p>
            )}
          </div>
        )}
        <a
          href={cv_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-medium bg-emerald-700 hover:bg-emerald-800 text-white rounded px-3 py-1.5 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Download CV (.docx)
        </a>
      </div>
    );
  }

  return (
    <div className="ml-10 mt-2 bg-rose-50 border border-rose-200 rounded-xl p-4 max-w-xl">
      <div className="flex items-center gap-2 mb-2">
        <FileText className="w-3.5 h-3.5 text-rose-700" />
        <p className="text-xs font-semibold text-rose-800">Generate tailored CV</p>
      </div>
      <ul className="space-y-1 mb-3 text-xs text-rose-900">
        <li><span className="text-rose-600">Role:</span> <strong>{proposal.target_role}</strong></li>
        {appLabel && <li><span className="text-rose-600">Application:</span> {appLabel}</li>}
        {!appLabel && proposal.application_id && (
          <li><span className="text-rose-600">Application:</span> <span className="text-rose-500">linked to tracked role</span></li>
        )}
      </ul>
      <div className="mb-3">
        <p className="text-[10px] uppercase tracking-wider text-rose-600 font-medium mb-1.5">Style</p>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setTemplateStyle("ats-optimized")}
            disabled={status === "generating"}
            className={`flex-1 text-left rounded border px-2.5 py-1.5 transition-colors disabled:opacity-60 ${
              templateStyle === "ats-optimized"
                ? "border-rose-700 bg-rose-100"
                : "border-rose-200 bg-white hover:border-rose-400"
            }`}
            title="Best for applying through job portals where your CV is parsed by software first"
          >
            <span className="text-[11px] font-semibold text-rose-900 block">ATS-Optimized</span>
            <span className="text-[10px] text-rose-700 leading-tight block">For job portals · parsed first</span>
          </button>
          <button
            type="button"
            onClick={() => setTemplateStyle("polished")}
            disabled={status === "generating"}
            className={`flex-1 text-left rounded border px-2.5 py-1.5 transition-colors disabled:opacity-60 ${
              templateStyle === "polished"
                ? "border-rose-700 bg-rose-100"
                : "border-rose-200 bg-white hover:border-rose-400"
            }`}
            title="Best for sending directly to a recruiter or networking contact"
          >
            <span className="text-[11px] font-semibold text-rose-900 block">Polished</span>
            <span className="text-[10px] text-rose-700 leading-tight block">For direct/email · human reads</span>
          </button>
        </div>
      </div>
      {error && (
        <p className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1 mb-2">{error}</p>
      )}
      <Button
        size="sm"
        onClick={() => onGenerate(templateStyle)}
        disabled={status === "generating"}
        className="h-7 text-xs bg-rose-700 hover:bg-rose-800 gap-1.5"
      >
        {status === "generating" ? (
          <><Loader2 className="w-3 h-3 animate-spin" /> Generating…</>
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
        className="h-7 text-xs bg-amber-700 hover:bg-amber-800 gap-1.5"
      >
        Switch to {suggestion.label}
        <ArrowRight className="w-3 h-3" />
      </Button>
    </div>
  );
}

export default function ChatInterface({ agentName, title, description, applicationId, suggestedPrompts, introMessage }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
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

  // Cached elsewhere (Tracker, CVAgent page) with the same key — this is just a
  // lookup so CVGenerationCard can show "Role at Company" without re-fetching.
  const { data: applications = [] } = useQuery({
    queryKey: ["applications", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("applications")
        .select("id, role_title, company")
        .eq("user_id", user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // For StorySaveCard's experience chip when the agent links a captured
  // story to one of the user's experience rows by UUID.
  const { data: experiences = [] } = useQuery({
    queryKey: ["experiences", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("experiences")
        .select("id, title, company")
        .eq("user_id", user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });
  const experiencesById = React.useMemo(() => {
    const m = {};
    for (const e of experiences) {
      m[e.id] = `${e.title || "(untitled)"}${e.company ? ` at ${e.company}` : ""}`;
    }
    return m;
  }, [experiences]);

  // Profile query — same key as Home.jsx so the cache is shared. We only
  // read profile.skills here, used to validate AI-proposed matched_skills
  // in handleApplyRoadmapChanges (anti-fabrication guard).
  const { data: profile = null } = useQuery({
    queryKey: ["userProfile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id);
      if (error) throw error;
      return data?.[0] || null;
    },
    enabled: !!user?.id,
  });
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

  const sendMessage = async () => {
    if (!input.trim() || sending || !user?.id) return;
    const text = input.trim();
    setInput("");

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
        ...(applicationId && { application_id: applicationId }),
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
          // Story-capture is in-memory only for now — not persisted on
          // chat_messages. Reload hides the card; user can re-trigger by
          // continuing the conversation. Day 4 doesn't require persistence.
          suggestedStoryCapture: data.suggested_story_capture || null,
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
          : "I couldn't reach the AI service. This is usually temporary — tap Retry to try again.",
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
          ...(applicationId && { application_id: applicationId }),
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
        suggestedStoryCapture: data.suggested_story_capture || null,
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
    const priority = task.priority || "medium";
    const { error } = await supabase.from("tasks").insert({
      title: task.title,
      description: task.description || "",
      category: task.category || "application",
      priority,
      role_title: task.role_title || "",
      due_date: resolveDueDate(task.due_date, priority),
      user_id: user.id,
      is_complete: false,
    });
    if (error) {
      console.error("Failed to add task:", error);
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
    let hasError = false;
    const pathCRoles = [];

    for (const change of changes) {
      if (change.action === "update_tier") {
        const newTier = validTier(change.new_tier);
        if (!newTier) { console.error("Roadmap update_tier: invalid tier", change.new_tier); hasError = true; continue; }
        const { data: matches, error: lookupErr } = await supabase
          .from("career_roles")
          .select("id")
          .eq("user_id", user.id)
          .ilike("title", change.role_title);
        if (lookupErr) { console.error("Roadmap update_tier lookup error:", lookupErr); hasError = true; continue; }
        if (!matches || matches.length === 0) { console.error("Roadmap update_tier: role not found", change.role_title); hasError = true; continue; }
        // Multi-match: update all (the user said "move PM to tier_1" — if they
        // have two PMs, moving both is the natural intent). For remove_role
        // we're stricter because delete is irreversible.
        const ids = matches.map((m) => m.id);
        const { error } = await supabase
          .from("career_roles")
          .update({ tier: newTier })
          .in("id", ids);
        if (error) { console.error("Roadmap update_tier error:", error); hasError = true; }
      } else if (change.action === "add_role") {
        const tier = validTier(change.tier);
        if (!tier) { console.error("Roadmap add_role: invalid tier", change.tier); hasError = true; continue; }

        // Path B: use AI-proposed skills if the agent emitted them (key
        // existence check — distinguishes "agent provided 0 matches" from
        // "agent didn't try"). Validation strips any matched_skills the
        // user doesn't actually have in their profile.
        let matched_skills = [];
        let missing_skills = [];
        let usedAIProposed = false;
        if ("matched_skills_proposed" in change) {
          matched_skills = validateMatchedSkills(change.matched_skills_proposed, userSkills);
          usedAIProposed = true;
        }
        if ("missing_skills_proposed" in change) {
          missing_skills = sanitizeMissingSkills(change.missing_skills_proposed);
          usedAIProposed = true;
        }

        // Match the shape generate-career-analysis writes via
        // replace_career_roles RPC, so AI-added roles render the same
        // expanded card content (reasoning, alignment, action items,
        // % match) as analysis-generated ones. Each field is added only
        // if the AI provided it; missing keys fall through to NULL/empty.
        const insertPayload = {
          user_id: user.id,
          title: change.title,
          tier,
          matched_skills,
          missing_skills,
          // skills_gap mirrors missing_skills (matches the analysis pattern)
          skills_gap: missing_skills,
        };
        if ("readiness_score" in change) {
          const score = clampScore(change.readiness_score);
          if (score !== null) {
            insertPayload.readiness_score = score;
            insertPayload.match_score = score; // legacy column kept in sync
          }
        }
        if ("reasoning" in change) insertPayload.reasoning = sanitizeText(change.reasoning, 500);
        if ("alignment_to_goal" in change) insertPayload.alignment_to_goal = sanitizeText(change.alignment_to_goal, 500);
        if ("action_items" in change) insertPayload.action_items = sanitizeActionItems(change.action_items);

        const { error } = await supabase.from("career_roles").insert(insertPayload);
        if (error) { console.error("Roadmap add_role error:", error); hasError = true; continue; }

        // Path C: if the AI didn't emit either skills array, the row landed
        // with empty arrays. Surface a soft notification pointing the user
        // at Refresh Analysis to compute skills properly. Home's defensive
        // guard handles the empty UI in the meantime.
        if (!usedAIProposed) pathCRoles.push(change.title);
      } else if (change.action === "remove_role") {
        const { data: matches, error: lookupErr } = await supabase
          .from("career_roles")
          .select("id")
          .eq("user_id", user.id)
          .ilike("title", change.role_title);
        if (lookupErr) { console.error("Roadmap remove_role lookup error:", lookupErr); hasError = true; continue; }
        if (!matches || matches.length === 0) { console.error("Roadmap remove_role: role not found", change.role_title); hasError = true; continue; }
        // Strict on multi-match for delete — irreversible, ambiguity should
        // reject rather than wipe multiple rows the user didn't intend.
        if (matches.length > 1) { console.error("Roadmap remove_role: ambiguous match", change.role_title); hasError = true; continue; }
        const { error } = await supabase
          .from("career_roles")
          .delete()
          .eq("id", matches[0].id);
        if (error) { console.error("Roadmap remove_role error:", error); hasError = true; }
      }
    }

    if (pathCRoles.length > 0) {
      toast.info(`Added ${pathCRoles.join(", ")} to your roadmap. Click "Refresh Analysis" on Career Roadmap to compute the skill breakdown.`);
    }
    if (hasError) {
      toast.error("Some changes could not be applied. Please try again.");
      return;
    }
    setAppliedRoadmapSets((prev) => ({ ...prev, [messageId]: true }));
    queryClient.invalidateQueries({ queryKey: ["careerRoles"] });
    if (pathCRoles.length === 0) toast.success("Roadmap updated");
  };

  const handleApplyApplicationActions = async (messageId, actions) => {
    if (!user?.id || appliedAppActionSets[messageId]) return;
    let hasError = false;

    for (const a of actions) {
      if (a.action === "add_application") {
        const status = validStatus(a.status) || "interested";
        // Tier is intentionally not set from the agent's payload — it's
        // derived from the JD-based qualification_score by scoreApplication.
        // If there's no JD, the row shows "Unclassified" until one is added.
        const row = {
          user_id: user.id,
          company: a.company,
          role_title: a.role_title,
          status,
          source: 'chat_agent',
          ...(a.url && { url: a.url }),
          ...(a.location && { location: a.location }),
          ...(a.notes && { notes: a.notes }),
          ...(a.job_description && { job_description: a.job_description }),
          // Auto-set applied_date so the Calendar surfaces it (parallel to
          // the B4 fix on tasks). Only fires when the agent's add request
          // is for an already-applied role.
          ...(status === "applied" && { applied_date: new Date().toISOString() }),
        };
        const { data: inserted, error } = await supabase.from("applications").insert(row).select("id").single();
        if (error) { console.error("add_application error:", error); hasError = true; continue; }
        if (inserted?.id && a.job_description) {
          scoreApplication(supabase, queryClient, inserted.id, a.job_description, user.id);
        }
      } else if (a.action === "update_application") {
        const patch = {};
        const newStatus = validStatus(a.new_status);
        const newTier = validTier(a.new_tier);
        const newStage = validInterviewStage(a.new_interview_stage);
        if (newStatus) patch.status = newStatus;
        if (newStage) patch.interview_stage = newStage;
        if (newTier) patch.tier = newTier;
        if (a.new_notes && typeof a.new_notes === "string") patch.notes = a.new_notes;
        if (Object.keys(patch).length === 0) continue;

        // Pre-check so we know whether to set applied_date and to surface
        // multi-match ambiguity rather than silently updating multiple rows.
        const { data: matches, error: lookupErr } = await supabase
          .from("applications")
          .select("id, applied_date")
          .eq("user_id", user.id)
          .ilike("company", a.match_company)
          .ilike("role_title", a.match_role_title);
        if (lookupErr) { console.error("update_application lookup error:", lookupErr); hasError = true; continue; }
        if (!matches || matches.length === 0) { console.error("update_application: not found", a.match_company, a.match_role_title); hasError = true; continue; }
        if (matches.length > 1) { console.error("update_application: ambiguous match"); hasError = true; continue; }
        const target = matches[0];

        // Auto-set applied_date when transitioning to "applied" and the row
        // doesn't already have one. Don't overwrite existing applied_date.
        if (newStatus === "applied" && !target.applied_date) {
          patch.applied_date = new Date().toISOString();
        }

        const { error } = await supabase
          .from("applications")
          .update(patch)
          .eq("id", target.id);
        if (error) { console.error("update_application error:", error); hasError = true; }
      }
    }
    if (hasError) {
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
    let hasError = false;
    let skippedDuplicate = 0;

    for (const a of actions) {
      if (a.action === "add_company_target") {
        const name = String(a.company_name || "").trim();
        if (!name) { hasError = true; continue; }

        // Lookup or create the company.
        const { data: existing, error: lookupErr } = await supabase
          .from("companies")
          .select("id")
          .ilike("name", name)
          .limit(1)
          .maybeSingle();
        if (lookupErr) { console.error("company lookup error:", lookupErr); hasError = true; continue; }

        let companyId = existing?.id;
        if (!companyId) {
          const { data: created, error: createErr } = await supabase
            .from("companies")
            .insert({
              name,
              source: "manual",
              created_by: user.id,
              ...(a.company_domain && { domain: a.company_domain }),
              ...(a.company_sector && { sector: a.company_sector }),
            })
            .select("id")
            .single();
          if (createErr) { console.error("company insert error:", createErr); hasError = true; continue; }
          companyId = created?.id;
        }
        if (!companyId) { hasError = true; continue; }

        // Insert company_target with source='self_added'. Conflict on
        // unique (user_id, company_id) means it's already in the pipeline
        // — skip with a tally, not an error.
        const { error: insertErr } = await supabase
          .from("company_targets")
          .insert({
            user_id: user.id,
            company_id: companyId,
            source: "self_added",
            status: "exploring",
            ...(a.pitched_role && { pitched_role: a.pitched_role }),
            ...(a.pitch_rationale && { pitch_rationale: a.pitch_rationale }),
            ...(Array.isArray(a.skill_gaps_this_fills) && a.skill_gaps_this_fills.length > 0 && { skill_gaps_this_fills: a.skill_gaps_this_fills }),
            ...(a.notes && { notes: a.notes }),
          });
        if (insertErr) {
          if (insertErr.code === "23505") { skippedDuplicate++; continue; }
          console.error("company_target insert error:", insertErr);
          hasError = true;
        }
      } else if (a.action === "update_company_target_status") {
        const matchCompany = String(a.match_company || "").trim();
        if (!matchCompany || !a.new_status) { hasError = true; continue; }

        const { data: matches, error: lookupErr } = await supabase
          .from("company_targets")
          .select("id, companies!inner(name)")
          .eq("user_id", user.id)
          .ilike("companies.name", matchCompany);
        if (lookupErr) { console.error("company_target lookup error:", lookupErr); hasError = true; continue; }
        if (!matches || matches.length === 0) { console.error("update_company_target_status: not found", matchCompany); hasError = true; continue; }
        if (matches.length > 1) { console.error("update_company_target_status: ambiguous match", matchCompany); hasError = true; continue; }
        const target = matches[0];

        const { error: updateErr } = await supabase
          .from("company_targets")
          .update({ status: a.new_status })
          .eq("id", target.id);
        if (updateErr) { console.error("company_target update error:", updateErr); hasError = true; continue; }

        // Patch the just-inserted audit row's note column. Trigger
        // already fired on the UPDATE above.
        if (a.note && a.note.trim()) {
          const { data: latestChange } = await supabase
            .from("company_target_status_changes")
            .select("id")
            .eq("target_id", target.id)
            .order("changed_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (latestChange?.id) {
            await supabase
              .from("company_target_status_changes")
              .update({ note: a.note.trim() })
              .eq("id", latestChange.id);
          }
        }
      } else if (a.action === "enrich_company") {
        const matchCompany = String(a.match_company || "").trim();
        if (!matchCompany) { hasError = true; continue; }

        const patch = {};
        if (a.description) patch.description = a.description;
        if (a.sector) patch.sector = a.sector;
        if (a.domain) patch.domain = a.domain;
        if (a.industry) patch.industry = a.industry;
        if (Object.keys(patch).length === 0) continue;

        // RLS pins UPDATE to rows where source='manual'. Filter explicitly
        // so we get a clean "no rows updated" if the company is jsearch
        // or faculty_seeded rather than a confusing RLS deny.
        const { error: updateErr } = await supabase
          .from("companies")
          .update(patch)
          .ilike("name", matchCompany)
          .eq("source", "manual");
        if (updateErr) { console.error("enrich_company error:", updateErr); hasError = true; }
      }
    }

    if (hasError) {
      toast.error("Some practicum changes could not be applied. Please try again.");
      return;
    }
    setAppliedCompanyTargetSets((prev) => ({ ...prev, [messageId]: true }));
    queryClient.invalidateQueries({ queryKey: ["company_targets", user.id] });
    if (skippedDuplicate > 0) {
      toast.message(`Already in your pipeline — skipped ${skippedDuplicate}.`);
    } else {
      toast.success("Practicum updated");
    }
  };

  const handleGenerateCV = async (messageId, proposal, templateStyle = "ats-optimized") => {
    if (!user?.id || !proposal?.target_role) return;
    if (cvGenStates[messageId]?.status === "generating" || cvGenStates[messageId]?.status === "done") return;

    setCvGenStates((prev) => ({ ...prev, [messageId]: { status: "generating" } }));
    try {
      const { data, error } = await supabase.functions.invoke("generate-tailored-cv", {
        body: {
          target_role: proposal.target_role,
          application_id: proposal.application_id || null,
          job_description: proposal.job_description || null,
          template_style: templateStyle,
        },
      });
      if (error) throw error;
      if (!data?.cv_url) throw new Error(data?.error || "CV generation did not return a download link.");

      // Snapshot everything the card needs — cv_url, fit_analysis, the
      // application_id the edge function actually wrote to the tracker, and
      // the keyword-tailoring score.
      const next = {
        status: "done",
        cv_url: data.cv_url,
        fit_analysis: data.fit_analysis,
        application_id: data.application_id || null,
        tailoring: data.tailoring || null,
      };
      setCvGenStates((prev) => ({ ...prev, [messageId]: next }));

      // Persist the result alongside the original proposal so refreshing the
      // conversation still shows the download button + fit analysis + linkage.
      const merged = {
        ...proposal,
        result: {
          cv_url: data.cv_url,
          fit_analysis: data.fit_analysis,
          application_id: data.application_id,
          tailoring: data.tailoring || null,
        },
      };
      await supabase.from("chat_messages")
        .update({ suggested_cv_generation: merged })
        .eq("id", messageId);

      // If the function touched an application, refresh the tracker cache.
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      if (data.application_id) {
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
              suggestedStoryCapture: followData.suggested_story_capture || null,
            }]);
          }
        }
      } catch (followUpErr) {
        // Don't surface to the user — CV gen already succeeded; missed
        // story-capture is acceptable degradation, not a failure.
        console.warn("Story-capture follow-up failed (non-blocking):", followUpErr);
      }
    } catch (err) {
      console.error("CV generation failed:", err);
      const message = err?.message || "Could not generate CV. Please try again.";
      setCvGenStates((prev) => ({ ...prev, [messageId]: { status: "idle", error: message } }));
      toast.error(message);
    }
  };

  const handleSwitchAgent = (page) => {
    navigate(createPageUrl(page));
  };

  // StorySaveCard's two-stage handlers. onExtractStory invokes the
  // extract-story-from-text edge function (the same function the
  // AddInformation surfaces will call in Wk 3); onSaveStory writes to
  // the stories table via the user-scoped supabase client (RLS gates
  // ownership). Source is hard-coded 'conversation' since this card
  // only renders for chat-captured stories.
  const handleExtractStory = async (text) => {
    try {
      const { data, error } = await supabase.functions.invoke("extract-story-from-text", {
        body: {
          text,
          source: "conversation",
        },
      });
      if (error) {
        console.error("Story extraction error:", error);
        return null;
      }
      return data || null;
    } catch (err) {
      console.error("Story extraction exception:", err);
      return null;
    }
  };

  const handleSaveStory = async (story, capture) => {
    if (!user?.id) return false;
    try {
      const { error } = await supabase.from("stories").insert({
        user_id: user.id,
        source: "conversation",
        // Both FKs are nullable. capture.experience_id was validated as
        // a UUID by the ai-chat parser; conversation_id comes from local
        // state. activeConversationId can be null if the chat is brand
        // new (insert path defers conversation creation), in which case
        // we store the story without the back-link rather than blocking
        // the save.
        experience_id: capture?.experience_id || null,
        conversation_id: activeConversationId || null,
        title: story.title,
        situation: story.situation || null,
        task: story.task || null,
        action: story.action || null,
        result: story.result || null,
        metrics: Array.isArray(story.metrics) ? story.metrics : [],
        skills_demonstrated: Array.isArray(story.skills_demonstrated) ? story.skills_demonstrated : [],
        tools_used: Array.isArray(story.tools_used) ? story.tools_used : [],
        relevance_tags: Array.isArray(story.relevance_tags) ? story.relevance_tags : [],
      });
      if (error) {
        console.error("Story save error:", error);
        toast.error("Could not save story. Please try again.");
        return false;
      }
      return true;
    } catch (err) {
      console.error("Story save exception:", err);
      return false;
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#E5E5E5] bg-white flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-[#0A0A0A]">{title}</h2>
          {description && (
            <p className="text-xs text-[#A3A3A3] mt-0.5 truncate">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Conversation switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="text-xs max-w-[220px]">
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
                    <p className="text-[10px] text-[#A3A3A3]">{new Date(c.updated_at).toLocaleDateString()}</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); deleteConversation(c.id); }}
                    className="p-1 rounded hover:bg-red-50 text-[#A3A3A3] hover:text-red-500 flex-shrink-0"
                    aria-label="Delete conversation"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        {loadingMessages && (
          <div className="flex items-center justify-center py-8 text-xs text-[#A3A3A3]">
            <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Loading conversation…
          </div>
        )}
        {!loadingMessages && messages.length === 0 && (
          <div className="text-center py-12 space-y-4">
            {introMessage ? (
              <p className="text-sm text-[#525252] max-w-md mx-auto leading-relaxed whitespace-pre-line">
                {introMessage}
              </p>
            ) : (
              <p className="text-sm text-[#A3A3A3]">
                Start a conversation. Ask a question about your career path.
              </p>
            )}
            {suggestedPrompts?.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center">
                {suggestedPrompts.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(prompt)}
                    className="text-xs bg-[#F5F5F5] hover:bg-[#E5E5E5] text-[#525252] rounded-full px-3 py-1.5 transition-colors"
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
                  onGenerate={(templateStyle) => handleGenerateCV(msg.id, msg.suggestedCVGeneration, templateStyle)}
                  appLabel={applicationsById[msg.suggestedCVGeneration.application_id] || null}
                />
              )}
              {msg.suggestedStoryCapture && msg.suggestedStoryCapture.text && (
                <StorySaveCard
                  capture={msg.suggestedStoryCapture}
                  experienceLabel={experiencesById[msg.suggestedStoryCapture.experience_id] || null}
                  onExtract={handleExtractStory}
                  onSave={handleSaveStory}
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

        {/* Typing indicator */}
        {sending && (
          <div className="flex gap-3">
            <div className="h-7 w-7 rounded-lg bg-[#0A0A0A] flex items-center justify-center mt-0.5 flex-shrink-0">
              <div className="h-1.5 w-1.5 rounded-full bg-white" />
            </div>
            <div className="bg-white border border-[#E5E5E5] rounded-2xl px-4 py-2.5 flex gap-1">
              <div className="w-2 h-2 bg-[#A3A3A3] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="w-2 h-2 bg-[#A3A3A3] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <div className="w-2 h-2 bg-[#A3A3A3] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t border-[#E5E5E5] bg-white">
        {messages.length > 0 && (
          <div className="flex justify-end mb-2">
            <button
              onClick={startNewConversation}
              className="text-xs text-[#525252] hover:text-[#0A0A0A] flex items-center gap-1 transition-colors"
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
            placeholder="Type your message..."
            rows={1}
            className="flex-1 resize-none rounded-lg border border-[#E5E5E5] px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#0A0A0A] focus:border-[#0A0A0A] placeholder:text-[#A3A3A3]"
            style={{ minHeight: "40px", maxHeight: "120px" }}
          />
          <Button
            onClick={sendMessage}
            disabled={sending || !input.trim()}
            aria-label="Send message"
            className="bg-[#0A0A0A] hover:bg-[#262626] h-10 w-10 p-0 flex-shrink-0"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
