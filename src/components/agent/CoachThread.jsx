import React, { useEffect, useRef, useState } from "react";
import { isNextDesign } from "@/lib/nextDesign";
import { Loader2, RefreshCw, Maximize2, CheckCircle2, AlertCircle, ListTodo, Route, Briefcase, Building2, FileText, Download } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import MessageBubble from "@/components/chat/MessageBubble";
import BulletSaveCard from "@/components/chat/BulletSaveCard";
import AddSkillCard from "@/components/chat/AddSkillCard";
import { triggerBlobDownload, cvFilename } from "@/lib/downloadFile";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useCoachConversation } from "@/lib/CoachConversationContext";
import { useAgentDrawer } from "@/lib/AgentDrawerContext";
import { useAuth } from "@/lib/AuthContext";
import { useProfileQuery } from "@/lib/queries/useProfile";
import { useExperiencesQuery } from "@/lib/queries/useExperiences";
import { useEducationQuery } from "@/lib/queries/useEducation";
import CvGenerationProgress from "@/components/cv-studio/CvGenerationProgress";
import {
  applyAllTaskSuggestions,
  applyRoadmapChanges,
  applyApplicationActions,
  applyCompanyTargetActions,
  extractBullets,
  appendBullets,
  restoreBullets,
  applyAddSkillToExperience,
} from "@/lib/coachActionHandlers";
import { DEFAULT_DOCK_PROMPTS } from "./coachPrompts";

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

function SuggestionRowShell({ kind, KindIcon, title, action, error, applied, onApply, busy, downloadUrl, downloadName, studioAppId }) {
  const navigate = useNavigate();
  return (
    <div className="ml-9 mt-1 bg-rd-bg-card border border-rd-primary-tint rounded-[10px] px-3 py-2">
      <div className="flex items-center gap-1.5">
        {KindIcon && <KindIcon className="w-2.5 h-2.5 text-rd-primary-dark flex-shrink-0" aria-hidden="true" />}
        <p className="text-[10px] uppercase tracking-[0.07em] font-display font-bold text-rd-primary-dark">
          {kind}
        </p>
      </div>
      <p className="text-[11.5px] text-rd-text leading-snug mt-0.5">{title}</p>
      {error && (
        <p className="text-[10.5px] text-rd-primary-dark mt-1 inline-flex items-center gap-1">
          <AlertCircle className="w-2.5 h-2.5" />
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-end gap-1.5 mt-1.5">
        {applied ? (
          downloadUrl ? (
            <>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await triggerBlobDownload(downloadUrl, downloadName);
                  } catch (err) {
                    toast.error(`Download failed: ${err?.message || "unknown error"}`);
                  }
                }}
                className="inline-flex items-center gap-1 text-[10.5px] font-display font-bold text-white bg-rd-primary hover:bg-rd-primary-dark rounded-full px-2.5 py-1 transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rd-primary focus-visible:ring-offset-1 active:brightness-95"
              >
                <Download className="w-2.5 h-2.5" />
                Download CV
              </button>
              {studioAppId && (
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      createPageUrl("CVAgent") +
                        `?application_id=${encodeURIComponent(studioAppId)}`,
                    )
                  }
                  className="inline-flex items-center gap-1 text-[10.5px] font-display font-bold text-rd-primary bg-rd-bg-card border border-rd-primary/40 hover:bg-rd-primary-tint rounded-full px-2.5 py-1 transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rd-primary focus-visible:ring-offset-1 active:brightness-95"
                >
                  Open in Studio
                </button>
              )}
              {/* studioAppId IS the linked application_id — also deep-links the tracker row. */}
              {studioAppId && (
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      createPageUrl("Tracker") +
                        `?app=${encodeURIComponent(studioAppId)}`,
                    )
                  }
                  className="inline-flex items-center gap-1 text-[10.5px] font-display font-bold text-rd-text-secondary bg-rd-bg-card border border-rd-border hover:bg-rd-bg-page rounded-full px-2.5 py-1 transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rd-primary focus-visible:ring-offset-1 active:brightness-95"
                >
                  <Briefcase className="w-2.5 h-2.5" />
                  Tracker
                </button>
              )}
            </>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10.5px] font-display font-bold text-rd-teal-dark bg-rd-teal-tint rounded-full px-2 py-0.5">
              <CheckCircle2 className="w-2.5 h-2.5" />
              Added
            </span>
          )
        ) : (
          <>
            {action && (
              <button
                type="button"
                onClick={onApply}
                disabled={busy}
                className="inline-flex items-center gap-1 text-[10.5px] font-display font-bold text-white bg-rd-primary hover:bg-rd-primary-dark rounded-full px-2.5 py-1 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {busy ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : null}
                {action}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Exported for CoachThread-N-cards.test.jsx (the never-silence guard).
export function SuggestionRow({ message, conv, user, queryClient, profileSkills }) {
  // Per-kind busy/error so a single turn carrying MANY action cards doesn't let
  // one card's in-flight/error state bleed onto the others.
  const [busyKind, setBusyKind] = useState(null);
  const [errorByKind, setErrorByKind] = useState({});

  const wrap = async (kind, fn) => {
    if (busyKind) return;
    setBusyKind(kind);
    setErrorByKind((p) => ({ ...p, [kind]: null }));
    try {
      const res = await fn();
      if (res?.error) {
        setErrorByKind((p) => ({ ...p, [kind]: res.error }));
        toast.error(res.error);
      } else {
        conv.markApplied(kind, message.id);
        toast.success(res?.toastSuccess || "Added");
      }
    } finally {
      setBusyKind(null);
    }
  };

  // CV generation is PROVIDER-OWNED + CLICK-GATED (QA2 P0). No fire-on-mount:
  // the card renders a Generate button; generation runs only when the user
  // clicks it, exactly once, via conv.generateCvForMessage (single-owner across
  // dock + panel; result merges back into the message).
  const cvState = conv.cvGenStates?.[message.id];

  // Render EVERY action block the turn carries. A single coach turn can emit any
  // combination of tasks + roadmap + application + company-target + CV; the user
  // MUST see a card for each. The prior early-return chain rendered only the
  // FIRST matching kind and silently swallowed the rest (the "never silence"
  // launch-gate). Structural fix: independent conditional blocks, no early
  // return, so N action types => N cards. Guarded by CoachThread-N-cards test.
  const hasAnyCard =
    message.suggestedTasks ||
    message.suggestedRoadmapChanges ||
    message.suggestedApplicationActions ||
    message.suggestedCompanyTargetActions ||
    message.suggestedCVGeneration?.target_role;
  if (!hasAnyCard) return null;

  return (
    <>
      {message.suggestedTasks && (
        <SuggestionRowShell
          kind="Tasks proposed"
          KindIcon={ListTodo}
          title={`${message.suggestedTasks.length} task${message.suggestedTasks.length === 1 ? "" : "s"} from your coach`}
          action="Add all"
          applied={!!conv.appliedSets.tasks[message.id]}
          busy={busyKind === "tasks"}
          error={errorByKind.tasks}
          onApply={() => wrap("tasks", async () => {
            const res = await applyAllTaskSuggestions({ user, tasks: message.suggestedTasks });
            if (res.ok) {
              queryClient.invalidateQueries({ queryKey: ["tasks"] });
              return { ok: true, toastSuccess: `Added ${res.added} task${res.added === 1 ? "" : "s"}` };
            }
            return res;
          })}
        />
      )}

      {message.suggestedRoadmapChanges && (
        <SuggestionRowShell
          kind="Roadmap changes proposed"
          KindIcon={Route}
          title={`${message.suggestedRoadmapChanges.length} change${message.suggestedRoadmapChanges.length === 1 ? "" : "s"} to your career roadmap`}
          action="Apply"
          applied={!!conv.appliedSets.roadmap[message.id]}
          busy={busyKind === "roadmap"}
          error={errorByKind.roadmap}
          onApply={() => wrap("roadmap", async () => {
            const res = await applyRoadmapChanges({ user, changes: message.suggestedRoadmapChanges, userSkills: profileSkills });
            if (res.ok || res.hasError) {
              queryClient.invalidateQueries({ queryKey: ["careerRoles"] });
            }
            if (res.error) return res;
            return { ok: true, toastSuccess: "Roadmap updated" };
          })}
        />
      )}

      {message.suggestedApplicationActions && (
        <SuggestionRowShell
          kind="Application updates proposed"
          KindIcon={Briefcase}
          title={`${message.suggestedApplicationActions.length} update${message.suggestedApplicationActions.length === 1 ? "" : "s"} to your tracker`}
          action="Apply"
          applied={!!conv.appliedSets.applications[message.id]}
          busy={busyKind === "applications"}
          error={errorByKind.applications}
          onApply={() => wrap("applications", async () => {
            const res = await applyApplicationActions({ user, queryClient, actions: message.suggestedApplicationActions });
            if (res.error) return res;
            queryClient.invalidateQueries({ queryKey: ["applications"] });
            return { ok: true, toastSuccess: "Applications updated" };
          })}
        />
      )}

      {message.suggestedCompanyTargetActions && (
        <SuggestionRowShell
          kind="Internship updates proposed"
          KindIcon={Building2}
          title={`${message.suggestedCompanyTargetActions.length} update${message.suggestedCompanyTargetActions.length === 1 ? "" : "s"} to your internship pipeline`}
          action="Apply"
          applied={!!conv.appliedSets.companyTargets[message.id]}
          busy={busyKind === "companyTargets"}
          error={errorByKind.companyTargets}
          onApply={() => wrap("companyTargets", async () => {
            const res = await applyCompanyTargetActions({ user, actions: message.suggestedCompanyTargetActions });
            if (res.error) return res;
            queryClient.invalidateQueries({ queryKey: ["company_targets", user.id] });
            const msg = res.skippedDuplicate > 0
              ? `Already in your pipeline - skipped ${res.skippedDuplicate}.`
              : "Internship updated";
            return { ok: true, toastSuccess: msg };
          })}
        />
      )}

      {message.suggestedCVGeneration?.target_role && (
        <>
          <SuggestionRowShell
            kind="CV generation proposed"
            KindIcon={FileText}
            title={`Tailored CV for ${message.suggestedCVGeneration.target_role}`}
            action={message.suggestedCVGeneration.result?.cv_url ? null : cvState?.error ? "Try again" : "Generate"}
            applied={!!message.suggestedCVGeneration.result?.cv_url}
            downloadUrl={message.suggestedCVGeneration.result?.cv_url || undefined}
            downloadName={cvFilename(user?.user_metadata?.full_name, message.suggestedCVGeneration.target_role)}
            studioAppId={message.suggestedCVGeneration.result?.cv_url ? message.suggestedCVGeneration.result?.application_id : undefined}
            busy={cvState?.status === "generating"}
            error={cvState?.error}
            onApply={() => conv.generateCvForMessage(message.id)}
          />
          {/* S1: honest CV-shaped skeleton + phase labels during the ~30-40s
              generation, instead of only the button spinner. */}
          {cvState?.status === "generating" && (
            <div className="mt-2">
              <CvGenerationProgress compact />
            </div>
          )}
        </>
      )}
    </>
  );
}

// The two ADD-ONLY profile-write cards (story-capture + add-skill).
// Unlike the condensed SuggestionRows above, these are interactive
// confirm cards (same components the full-page agents render) wired to
// the SAME centralized handlers — closing the seam where story-capture
// used to render full-page but silently vanish in the dock.
function ProfileWriteCards({ message, user, conversationId, experiencesById, experiences, educations }) {
  const queryClient = useQueryClient();
  const cap = message.suggestedBulletCapture;
  const skillBlock = message.suggestedAddSkill;
  if (!cap?.text && !skillBlock?.skill) return null;

  return (
    <>
      {cap?.text && (
        <BulletSaveCard
          capture={cap}
          experiences={experiences}
          educations={educations}
          onExtract={(text, targetType, targetId) =>
            extractBullets({ text, targetType, targetId })
          }
          onSave={async ({ bullets, skills, targetType, targetId }) => {
            const res = await appendBullets({
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
            queryClient.invalidateQueries({
              queryKey: [targetType === "education" ? "education" : "experiences"],
            });
            return { ok: true, snapshot: res.snapshot };
          }}
          onUndo={async ({ snapshot, targetType, targetId }) => {
            const res = await restoreBullets({
              user,
              targetType,
              targetId,
              snapshot,
            });
            if (res.error) {
              toast.error(res.error);
              return false;
            }
            queryClient.invalidateQueries({
              queryKey: [targetType === "education" ? "education" : "experiences"],
            });
            return true;
          }}
        />
      )}
      {skillBlock?.skill && (
        <AddSkillCard
          skill={skillBlock.skill}
          experienceLabel={experiencesById[skillBlock.experience_id] || null}
          onConfirm={async () => {
            const res = await applyAddSkillToExperience({
              user,
              queryClient,
              skill: skillBlock.skill,
              experienceId: skillBlock.experience_id,
            });
            if (res.error) {
              toast.error(res.error);
              return res;
            }
            toast.success(res.alreadyPresent ? "Already on that experience" : "Skill added");
            return res;
          }}
        />
      )}
    </>
  );
}

export default function CoachThread({ variant = "dock" }) {
  const conv = useCoachConversation();
  const drawer = useAgentDrawer();
  const { user } = useAuth();
  const { data: profile } = useProfileQuery(user?.id);
  const { data: experiences = [] } = useExperiencesQuery(user?.id);
  const { data: educations = [] } = useEducationQuery(user?.id);
  const queryClient = useQueryClient();
  const bottomRef = useRef(null);
  const scrollRef = useRef(null);
  const pinnedRef = useRef(true);
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    pinnedRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
  };

  // Resolve experience_id → "Role at Company" for the add-skill /
  // bullet-capture confirm cards (so they show the exact target).
  const experiencesById = React.useMemo(() => {
    const m = {};
    for (const e of experiences) {
      m[e.id] = `${e.title || "(untitled)"}${e.company ? ` at ${e.company}` : ""}`;
    }
    return m;
  }, [experiences]);

  useEffect(() => {
    // Pin to bottom on new message/sending ONLY if the user is already near
    // the bottom - otherwise scrolling up to read history is yanked back down.
    if (pinnedRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [conv?.messages.length, conv?.sending]);

  if (!conv) return null;
  const isDock = variant === "dock";
  const alive = isNextDesign();

  const expandPanel = () => drawer.open({});
  const padding = isDock ? "px-3 py-3" : "px-4 py-4";
  const profileSkills = (profile?.skills || []).filter((s) => typeof s === "string");

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
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
        // Top-anchored, left-aligned — not centered in the void. One
        // short line, then coach-flavored coral-tint pill chips stacked
        // left-aligned so they read as part of the coach's first turn
        // rather than generic suggestion bubbles.
        <div className="space-y-2.5">
          <p className={`${isDock ? "text-[12px]" : "text-[13px]"} text-rd-text-secondary leading-[1.5]`}>
            Knows your roadmap, your pipeline, and this page.
          </p>
          {/* Flag-ON: the composer pop-up is the primary suggestion affordance,
              so the empty-state slims to the intro line (no duplicate chips).
              Flag-OFF keeps the coral-tint pill chips. */}
          {!alive && (
            <div className="flex flex-col items-start gap-1.5">
              {DEFAULT_DOCK_PROMPTS.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => conv.sendMessage(p)}
                  disabled={conv.sending}
                  className={`inline-flex items-center ${isDock ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-[12px]"} rounded-full bg-rd-primary-tint border border-rd-primary/30 text-rd-primary-dark font-display font-semibold hover:bg-rd-primary hover:border-rd-primary hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {conv.messages
        .filter((m) => m.role !== "system")
        .map((msg, i) => (
          <React.Fragment key={msg.id || i}>
            {alive ? (
              <div className="animate-rd-msg-in">
                <MessageBubble message={msg} variant={variant} />
              </div>
            ) : (
              <MessageBubble message={msg} variant={variant} />
            )}
            <SuggestionRow
              message={msg}
              conv={conv}
              user={user}
              queryClient={queryClient}
              profileSkills={profileSkills}
            />
            <ProfileWriteCards
              message={msg}
              user={user}
              conversationId={conv.activeConversationId}
              experiencesById={experiencesById}
              experiences={experiences}
              educations={educations}
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
          <span className="w-[22px] h-[22px] rounded-full bg-rd-primary-tint flex items-center justify-center flex-shrink-0 mt-[2px]">
            <span className="w-1.5 h-1.5 rounded-full bg-rd-primary" />
          </span>
          <span className={`inline-flex gap-1 items-center px-3 py-2 bg-rd-bg-soft rounded-tl-[12px] rounded-tr-[12px] rounded-br-[12px] rounded-bl-[3px]${alive ? " rd-thinking-shimmer" : ""}`}>
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
