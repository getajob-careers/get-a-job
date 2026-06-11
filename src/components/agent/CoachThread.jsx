import React, { useEffect, useRef } from "react";
import { Loader2, RefreshCw, Maximize2, ChevronRight } from "lucide-react";
import MessageBubble from "@/components/chat/MessageBubble";
import { useCoachConversation } from "@/lib/CoachConversationContext";
import { useAgentDrawer } from "@/lib/AgentDrawerContext";

// CoachThread — shared message list rendered by both the sidebar dock
// and the drawer panel. Reads from CoachConversationProvider so both
// views display the same messages simultaneously.
//
// Variants:
//   - "dock"   compact: tight padding, narrow bubbles, condensed
//              SUGGESTED_*_JSON cards (a single line per card with
//              an "Expand for details" link that opens the panel).
//   - "panel"  full: original padding from the AgentDrawer panel; the
//              cards still render condensed in this PR (Phase-B
//              follow-up: parity with full ChatInterface rich cards).
//
// The scroll container uses `overscroll-behavior: contain` so reaching
// the top/bottom of the thread never chains scroll to the page or the
// sidebar. Bubbles use the existing MessageBubble with a new variant
// prop instead of a fork.

const DEFAULT_DOCK_PROMPTS = [
  "What should I focus on?",
  "Am I ready to apply?",
  "What's my biggest gap?",
];

function CondensedSuggestionRow({ label, onExpand }) {
  return (
    <button
      type="button"
      onClick={onExpand}
      className="w-full text-left bg-rd-bg-soft border border-rd-border rounded-[10px] px-3 py-2 mt-1.5 flex items-center justify-between gap-2 hover:border-rd-coral transition-colors"
    >
      <span className="text-[11px] text-rd-text-secondary truncate">
        <span className="font-display font-bold text-rd-text">Suggestion</span>
        {" — "}
        {label}
      </span>
      <ChevronRight className="w-3 h-3 text-rd-text-tertiary flex-shrink-0" />
    </button>
  );
}

export default function CoachThread({ variant = "dock" }) {
  const conv = useCoachConversation();
  const drawer = useAgentDrawer();
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [conv?.messages.length, conv?.sending]);

  if (!conv) return null;
  const isDock = variant === "dock";

  const expandPanel = () => drawer.open({});

  const padding = isDock ? "px-3 py-3" : "px-4 py-4";

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
            Your coach knows your roadmap, pipeline, and the page you're on.
            Ask anything.
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
            {(msg.suggestedTasks ||
              msg.suggestedRoadmapChanges ||
              msg.suggestedApplicationActions ||
              msg.suggestedCompanyTargetActions ||
              msg.suggestedCVGeneration) && (
              <CondensedSuggestionRow
                label={
                  msg.suggestedTasks
                    ? `${msg.suggestedTasks.length} task${msg.suggestedTasks.length === 1 ? "" : "s"} to add`
                    : msg.suggestedRoadmapChanges
                      ? "roadmap changes"
                      : msg.suggestedApplicationActions
                        ? "application updates"
                        : msg.suggestedCompanyTargetActions
                          ? "internship updates"
                          : "tailored CV ready"
                }
                onExpand={expandPanel}
              />
            )}
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
