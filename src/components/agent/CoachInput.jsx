import React from "react";
import { Send, Loader2 } from "lucide-react";
import { useCoachConversation } from "@/lib/CoachConversationContext";

// Persistent input row. Reads/writes shared input + sending state from
// CoachConversationProvider so the dock and panel surfaces stay in sync
// even when both are mounted.
//
// Variant just controls padding + textarea row count. Send semantics are
// identical to ChatInterface (Enter to send, Shift+Enter for newline).

export default function CoachInput({ variant = "dock" }) {
  const conv = useCoachConversation();
  if (!conv) return null;
  const isDock = variant === "dock";

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      conv.sendMessage();
    }
  };

  return (
    <div
      className={`${isDock ? "px-3 py-2.5" : "px-4 py-3"} border-t border-rd-border bg-rd-bg-card flex items-end gap-2`}
      data-coach-input
      data-variant={variant}
    >
      <textarea
        value={conv.input}
        onChange={(e) => conv.setInput(e.target.value)}
        onKeyDown={handleKey}
        placeholder={isDock ? "Ask about this page…" : "Message your coach…"}
        rows={1}
        className={`flex-1 ${isDock ? "px-2.5 py-1.5 text-[12.5px] min-h-[32px] max-h-[88px] rounded-[10px]" : "px-3.5 py-2.5 text-[14px] min-h-[42px] max-h-[120px] rounded-[14px]"} border border-rd-border bg-rd-bg-card text-rd-text font-body resize-none placeholder:text-rd-text-tertiary focus:outline-none focus:border-rd-coral focus:shadow-[0_0_0_3px_var(--rd-coral-tint)] transition-colors`}
      />
      <button
        type="button"
        onClick={() => conv.sendMessage()}
        disabled={conv.sending || !conv.input.trim()}
        aria-label="Send message"
        className={`${isDock ? "w-8 h-8" : "w-[42px] h-[42px]"} rounded-full bg-rd-coral hover:bg-rd-coral-dark text-white inline-flex items-center justify-center flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97] transition-all`}
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
