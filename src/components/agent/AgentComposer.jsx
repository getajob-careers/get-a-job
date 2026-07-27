import React, { useRef, useLayoutEffect } from "react";
import { ArrowUp, Loader2 } from "lucide-react";
import { useCoachConversation } from "@/lib/CoachConversationContext";

// Shared canvas composer (flag-ON coach surface): the rd-well bar (textarea +
// send as one unit), reading as a CHAT input - no leading magnifier, no floating
// suggestion pop-up. Bound to the shared CoachConversationProvider (dock + panel
// stay in sync) instead of local draft.
//
// Starter suggestions live in the CoachThread empty-state (a dismissible block
// shown only before the first message), NOT here: a focus/empty pop-up above the
// input re-appeared over the conversation every time the empty input was focused
// mid-thread. Keeping suggestions in the thread's first turn stops them covering
// the conversation.
//
// Behaviour parity with flag-off CoachInput: Enter = send, Shift+Enter = newline,
// Escape = blur, disabled while sending, auto-grow (UNCONDITIONAL) capped by
// variant (dock 160px fixed / panel 40vh), rounded rectangle. Scroll-pin stays
// with CoachThread.

export default function AgentComposer({ variant = "dock" }) {
  const conv = useCoachConversation();
  const taRef = useRef(null);
  const isDock = variant === "dock";

  // Auto-grow (unconditional): reset to auto, grow to content, cap by variant.
  // The dock is sidebar-constrained (fixed 160px ≈ 8 lines is predictable); the
  // panel lives in a viewport-height drawer (40vh scales with the screen). Same
  // caps as flag-off CoachInput (#686/#687).
  useLayoutEffect(() => {
    const el = taRef.current;
    if (!el) return;
    const maxH = isDock ? 160 : Math.round(window.innerHeight * 0.4);
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, maxH)}px`;
  }, [conv?.input, isDock]);

  if (!conv) return null;
  const hasText = !!conv.input.trim();

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      conv.sendMessage();
    } else if (e.key === "Escape") {
      taRef.current?.blur();
    }
  };

  return (
    <div
      className={`${isDock ? "px-3 py-2.5" : "px-4 py-3"} border-t border-rd-border-subtle bg-rd-bg-card`}
      data-agent-composer
      data-variant={variant}
    >
      <div className="rd-well rd-r-md flex items-end gap-1.5 px-2.5 py-2 transition-shadow focus-within:ring-2 focus-within:ring-rd-primary/60">
        <textarea
          ref={taRef}
          value={conv.input}
          rows={1}
          onChange={(e) => conv.setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={isDock ? "Ask about this page…" : "Message your coach…"}
          className={`flex-1 resize-none bg-transparent rd-t-body-m text-rd-text placeholder:text-rd-text-secondary focus:outline-none leading-[1.5] ${isDock ? "max-h-[160px]" : "max-h-[40vh]"}`}
        />
        <button
          type="button"
          onClick={() => conv.sendMessage()}
          disabled={!hasText || conv.sending}
          aria-label="Send message"
          className={`${isDock ? "w-7 h-7" : "w-8 h-8"} rd-hit-44 rd-focus-ring inline-flex items-center justify-center flex-shrink-0 rounded-full bg-rd-primary text-white hover:bg-rd-primary-dark rd-press disabled:opacity-40 disabled:cursor-not-allowed transition-colors`}
        >
          {conv.sending ? (
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          ) : (
            <ArrowUp className="w-4 h-4" aria-hidden="true" />
          )}
        </button>
      </div>
    </div>
  );
}
