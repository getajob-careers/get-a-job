import React, { useRef, useLayoutEffect } from "react";
import { Send, Loader2 } from "lucide-react";
import { useCoachConversation } from "@/lib/CoachConversationContext";
import { isNextDesign } from "@/lib/nextDesign";
import AgentComposer from "./AgentComposer";
import { DEFAULT_DOCK_PROMPTS } from "./coachPrompts";

// Persistent input row. Reads/writes shared input + sending state from
// CoachConversationProvider so the dock and panel surfaces stay in sync
// even when both are mounted.
//
// Visual: pinned to the bottom of the dock card. Rounded input. Send
// button is a solid coral circle when the textarea has content, muted
// coral-tint (with coral icon) when empty — distinct from a washed-pink
// disabled state. While `sending` the button shows a spinner on the
// solid background so the press feels durable.
//
// Behavior unchanged: Enter to send, Shift+Enter for newline.

export default function CoachInput({ variant = "dock" }) {
  const conv = useCoachConversation();
  const taRef = useRef(null);
  const isDock = variant === "dock";

  // Auto-grow so a long message reveals its full height instead of clipping the
  // top. Reset to auto, grow to content, cap at the variant max: the DOCK is
  // sidebar-constrained so a fixed 160px (~8 lines) is predictable; the PANEL
  // lives in a viewport-height drawer, so a viewport-relative 40vh scales with
  // the screen while the flex-1 thread takes the remainder. Beyond the cap it
  // scrolls; the CSS max-h class backstops the cap on resize.
  useLayoutEffect(() => {
    const el = taRef.current;
    if (!el) return;
    const maxH = isDock ? 160 : Math.round(window.innerHeight * 0.4);
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, maxH)}px`;
  }, [conv?.input, isDock]);

  if (!conv) return null;
  // Flag-ON: the shared canvas composer (rd-well bar + focus/empty suggestion
  // pop-up). Flag-OFF keeps the markup below byte-identical. Auto-grow is
  // unconditional - AgentComposer carries its own for the flag-on path.
  if (isNextDesign())
    return (
      <AgentComposer variant={variant} suggestions={DEFAULT_DOCK_PROMPTS} />
    );
  const hasText = !!conv.input.trim();
  const canSend = hasText && !conv.sending;

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      conv.sendMessage();
    }
  };

  // Solid coral when send is possible (or in flight); muted coral-tint
  // chip when there's nothing to send. The empty state still feels
  // like part of the coral vocabulary — not a generic disabled grey.
  const sendBtnClasses = canSend || conv.sending
    ? "bg-rd-primary hover:bg-rd-primary-dark text-white"
    : "bg-rd-primary-tint text-rd-primary cursor-not-allowed";

  return (
    <div
      className={`${isDock ? "px-3 py-2.5" : "px-4 py-3"} border-t border-rd-border-subtle bg-rd-bg-card flex items-end gap-2`}
      data-coach-input
      data-variant={variant}
    >
      <textarea
        ref={taRef}
        value={conv.input}
        onChange={(e) => conv.setInput(e.target.value)}
        onKeyDown={handleKey}
        placeholder={isDock ? "Ask about this page…" : "Message your coach…"}
        rows={1}
        className={`flex-1 ${isDock ? "px-3 py-1.5 text-[12.5px] min-h-[34px] max-h-[160px] rounded-lg" : "px-4 py-2.5 text-[14px] min-h-[42px] max-h-[40vh] rounded-lg"} border border-rd-border bg-rd-bg-card text-rd-text font-body resize-none placeholder:text-rd-text-tertiary focus:outline-none focus:border-rd-primary focus:shadow-[0_0_0_3px_var(--rd-primary-tint)] transition-colors`}
      />
      <button
        type="button"
        onClick={() => conv.sendMessage()}
        disabled={!canSend}
        aria-label="Send message"
        className={`${isDock ? "w-8 h-8" : "w-[42px] h-[42px]"} rounded-full inline-flex items-center justify-center flex-shrink-0 active:scale-[0.97] transition-all ${sendBtnClasses}`}
      >
        {conv.sending ? (
          <Loader2 className={`${isDock ? "w-3 h-3" : "w-4 h-4"} animate-spin`} />
        ) : (
          <Send className={isDock ? "w-3 h-3" : "w-4 h-4"} />
        )}
      </button>
    </div>
  );
}
