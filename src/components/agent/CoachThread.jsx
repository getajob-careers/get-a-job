import React, { useEffect, useRef, useState } from "react";
import { Loader2, RefreshCw, Maximize2, CheckCircle2, AlertCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import MessageBubble from "@/components/chat/MessageBubble";
import { useCoachConversation } from "@/lib/CoachConversationContext";
import { useAgentDrawer } from "@/lib/AgentDrawerContext";
import { useAuth } from "@/lib/AuthContext";
import { useProfileQuery } from "@/lib/queries/useProfile";
import {
  applyAllTaskSuggestions,
  applyRoadmapChanges,
  applyApplicationActions,
  applyCompanyTargetActions,
  generateTailoredCV,
} from "@/lib/coachActionHandlers";

// CoachThread — shared message list rendered by both the sidebar dock
// and the drawer panel. Reads from CoachConversationProvider so both
// views display the same messages simultaneously.
//
// Suggestion rows: each SUGGESTED_*_JSON proposal renders as a
// condensed row with a REAL Apply button wired through to the shared
// handler module (src/lib/coachActionHandlers.js). Apply state is
// tracked in the provider's appliedSets so both surfaces flip to the
// success chip when one acts on it. Labels are proposal-language —
// "CV generation proposed", "5 tasks proposed", etc — never asserting
// completion before the user clicks Apply.
//
// Variants:
//   - "dock"   compact: tight padding, narrow bubbles.
//   - "panel"  same UI shape but with the panel's wider padding.
//
// Scroll: own container with overscroll-behavior: contain so reaching
// top/bottom never chains scroll to the page or the sidebar.

const DEFAULT_DOCK_PROMPTS = [
  "What should I focus on?",
  "Am I ready to apply?",
  "What's my biggest gap?",
];

function SuggestionRowShell({ kind, title, action, error, applied, onApply, onExpand, busy }) {
  return (
    <div className="ml-9 mt-1 bg-rd-bg-soft border border-rd-border rounded-[10px] px-3 py-2 flex items-center justify-between gap-2">
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-[0.07em] font-medium text-rd-text-eyebrow font-mono">
          {kind}
        </p>
        <p className="text-[11.5px] text-rd-text-secondary truncate">{title}</p>
        {error && (
          <p className="text-[10.5px] text-rd-coral-dark mt-0.5 inline-flex items-center gap-1">
            <AlertCircle className="w-2.5 h-2.5" />
            {error}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {applied ? (
          <span className="inline-flex items-center gap-1 text-[10.5px] font-display font-bold text-rd-teal-dark">
            <CheckCircle2 className="w-2.5 h-2.5" />
            Applied
          </span>
        ) : (
          <>
            {action && (
              <button
                type="button"
                onClick={onApply}
                disabled={busy}
                className="inline-flex items-center gap-1 text-[10.5px] font-display font-bold text-white bg-rd-coral hover:bg-rd-coral-dark rounded-full px-2.5 py-1 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {busy ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : null}
                {action}
              </button>
            )}
            {onExpand && (
              <button
                type="button"
                onClick={onExpand}
                className="inline-flex items-center justify-center w-5 h-5 rounded-md text-rd-text-tertiary hover:bg-rd-bg-card hover:text-rd-text transition-colors"
                aria-label="Open in panel for details"
              >
                <Maximize2 className="w-2.5 h-2.5" />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function SuggestionRow({ message, conv, openPanel, user, queryClient, profileSkills }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const wrap = async (kind, fn) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fn();
      if (res?.error) {
        setError(res.error);
        toast.error(res.error);
      } else {
        conv.markApplied(kind, message.id);
        toast.success(res?.toastSuccess || "Applied");
      }
    } finally {
      setBusy(false);
    }
  };

  if (message.suggestedTasks) {
    const applied = !!conv.appliedSets.tasks[message.id];
    const n = message.suggestedTasks.length;
    return (
      <SuggestionRowShell
        kind="Tasks proposed"
        title={`${n} task${n === 1 ? "" : "s"} from your coach`}
        action="Add all"
        applied={applied}
        busy={busy}
        error={error}
        onApply={() => wrap("tasks", async () => {
          const res = await applyAllTaskSuggestions({ user, tasks: message.suggestedTasks });
          if (res.ok) {
            queryClient.invalidateQueries({ queryKey: ["tasks"] });
            return { ok: true, toastSuccess: `Added ${res.added} task${res.added === 1 ? "" : "s"}` };
          }
          return res;
        })}
        onExpand={openPanel}
      />
    );
  }

  if (message.suggestedRoadmapChanges) {
    const applied = !!conv.appliedSets.roadmap[message.id];
    const n = message.suggestedRoadmapChanges.length;
    return (
      <SuggestionRowShell
        kind="Roadmap changes proposed"
        title={`${n} change${n === 1 ? "" : "s"} to your career roadmap`}
        action="Apply"
        applied={applied}
        busy={busy}
        error={error}
        onApply={() => wrap("roadmap", async () => {
          const res = await applyRoadmapChanges({ user, changes: message.suggestedRoadmapChanges, userSkills: profileSkills });
          if (res.ok || res.hasError) {
            queryClient.invalidateQueries({ queryKey: ["careerRoles"] });
          }
          if (res.error) return res;
          return { ok: true, toastSuccess: "Roadmap updated" };
        })}
        onExpand={openPanel}
      />
    );
  }

  if (message.suggestedApplicationActions) {
    const applied = !!conv.appliedSets.applications[message.id];
    const n = message.suggestedApplicationActions.length;
    return (
      <SuggestionRowShell
        kind="Application updates proposed"
        title={`${n} update${n === 1 ? "" : "s"} to your tracker`}
        action="Apply"
        applied={applied}
        busy={busy}
        error={error}
        onApply={() => wrap("applications", async () => {
          const res = await applyApplicationActions({ user, queryClient, actions: message.suggestedApplicationActions });
          if (res.error) return res;
          queryClient.invalidateQueries({ queryKey: ["applications"] });
          return { ok: true, toastSuccess: "Applications updated" };
        })}
        onExpand={openPanel}
      />
    );
  }

  if (message.suggestedCompanyTargetActions) {
    const applied = !!conv.appliedSets.companyTargets[message.id];
    const n = message.suggestedCompanyTargetActions.length;
    return (
      <SuggestionRowShell
        kind="Internship updates proposed"
        title={`${n} update${n === 1 ? "" : "s"} to your internship pipeline`}
        action="Apply"
        applied={applied}
        busy={busy}
        error={error}
        onApply={() => wrap("companyTargets", async () => {
          const res = await applyCompanyTargetActions({ user, actions: message.suggestedCompanyTargetActions });
          if (res.error) return res;
          queryClient.invalidateQueries({ queryKey: ["company_targets", user.id] });
          const msg = res.skippedDuplicate > 0
            ? `Already in your pipeline — skipped ${res.skippedDuplicate}.`
            : "Internship updated";
          return { ok: true, toastSuccess: msg };
        })}
        onExpand={openPanel}
      />
    );
  }

  if (message.suggestedCVGeneration && message.suggestedCVGeneration.target_role) {
    const result = message.suggestedCVGeneration.result;
    const done = !!result?.cv_url;
    return (
      <SuggestionRowShell
        kind="CV generation proposed"
        title={`Tailored CV for ${message.suggestedCVGeneration.target_role}`}
        action={done ? null : "Generate"}
        applied={done}
        busy={busy}
        error={error}
        onApply={() => wrap("cvGeneration", async () => {
          const res = await generateTailoredCV({ queryClient, proposal: message.suggestedCVGeneration, messageId: message.id });
          if (res.error) return res;
          const msg = res.result.application_id ? "CV linked to your application tracker!" : "CV generated";
          return { ok: true, toastSuccess: msg };
        })}
        onExpand={openPanel}
      />
    );
  }

  return null;
}

export default function CoachThread({ variant = "dock" }) {
  const conv = useCoachConversation();
  const drawer = useAgentDrawer();
  const { user } = useAuth();
  const { data: profile } = useProfileQuery(user?.id);
  const queryClient = useQueryClient();
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [conv?.messages.length, conv?.sending]);

  if (!conv) return null;
  const isDock = variant === "dock";

  const expandPanel = () => drawer.open({});
  const padding = isDock ? "px-3 py-3" : "px-4 py-4";
  const profileSkills = (profile?.skills || []).filter((s) => typeof s === "string");

  return (
    <div
      className={`flex-1 min-h-0 overflow-y-auto ${padding} space-y-3`}
      style={{ overscrollBehavior: "contain" }}
      data-coach-thread
      data-variant={variant}
    >
      {conv.loadingMessages && (
        <div className="flex items-center justify-center py-4 text-[11px] text-rd-text-tertiary">
          <Loader2 className="w-3 h-3 animate-spin mr-1.5" /> Loading…
        </div>
      )}

      {!conv.loadingMessages && conv.messages.length === 0 && (
        <div className={`text-center ${isDock ? "py-2" : "py-8"} space-y-3`}>
          <p className={`${isDock ? "text-[11.5px]" : "text-[13px]"} text-rd-text-secondary leading-relaxed`}>
            Your coach knows your roadmap, pipeline, and the page you're on. Ask anything.
          </p>
          <div className="flex flex-wrap gap-1.5 justify-center">
            {DEFAULT_DOCK_PROMPTS.map((p, i) => (
              <button
                key={i}
                type="button"
                onClick={() => conv.sendMessage(p)}
                disabled={conv.sending}
                className={`inline-flex items-center ${isDock ? "px-2 py-1 text-[10.5px]" : "px-3 py-1.5 text-[12px]"} rounded-full bg-rd-bg-card border border-rd-border text-rd-text-secondary font-medium hover:bg-rd-coral-tint hover:border-rd-coral hover:text-rd-coral-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {conv.messages
        .filter((m) => m.role !== "system")
        .map((msg, i) => (
          <React.Fragment key={msg.id || i}>
            <MessageBubble message={msg} variant={variant} />
            <SuggestionRow
              message={msg}
              conv={conv}
              openPanel={expandPanel}
              user={user}
              queryClient={queryClient}
              profileSkills={profileSkills}
            />
            {msg.isError && msg.userMessageText && (
              <div className={`${isDock ? "ml-9" : "ml-10"} mt-1`}>
                <button
                  type="button"
                  onClick={() => conv.retryLast(msg.id, msg.userMessageText)}
                  disabled={conv.sending}
                  className="inline-flex items-center gap-1 text-[10.5px] font-display font-semibold text-rd-text-secondary hover:text-rd-text"
                >
                  <RefreshCw className="w-2.5 h-2.5" /> Retry
                </button>
              </div>
            )}
          </React.Fragment>
        ))}

      {conv.sending && (
        <div className="flex gap-2">
          <span className="w-[22px] h-[22px] rounded-full bg-rd-coral-tint flex items-center justify-center flex-shrink-0 mt-[2px]">
            <span className="w-1.5 h-1.5 rounded-full bg-rd-coral" />
          </span>
          <span className="inline-flex gap-1 items-center px-3 py-2 bg-[#F3ECE0] rounded-tl-[12px] rounded-tr-[12px] rounded-br-[12px] rounded-bl-[3px]">
            <span className="w-[4px] h-[4px] rounded-full bg-rd-text-tertiary animate-chat-typing" />
            <span className="w-[4px] h-[4px] rounded-full bg-rd-text-tertiary animate-chat-typing [animation-delay:0.15s]" />
            <span className="w-[4px] h-[4px] rounded-full bg-rd-text-tertiary animate-chat-typing [animation-delay:0.3s]" />
          </span>
        </div>
      )}

      <div ref={bottomRef} />

      {isDock && conv.messages.length > 0 && (
        <button
          type="button"
          onClick={expandPanel}
          className="w-full inline-flex items-center justify-center gap-1 text-[10.5px] text-rd-text-tertiary hover:text-rd-text font-display font-semibold mt-1"
        >
          <Maximize2 className="w-2.5 h-2.5" /> Open in panel
        </button>
      )}
    </div>
  );
}
