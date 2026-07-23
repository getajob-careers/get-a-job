import React, { useRef, useState, useLayoutEffect } from "react";
import { Search, ArrowUp, Loader2 } from "lucide-react";
import { useCoachConversation } from "@/lib/CoachConversationContext";
import CanvasCommandItem from "@/components/redesign/shell/CanvasCommandItem";

// Shared canvas composer (flag-ON coach surface): the rd-well bar (icon +
// textarea + send as one unit) with a focus/empty pop-up of suggestions that
// floats above the input, staggered-reveal in, and is keyboard-navigable.
// Promoted from the _preview CanvasCoachDock reference; bound to the shared
// CoachConversationProvider (dock + panel stay in sync) instead of local draft.
//
// Suggestions v1: static per-surface starters via the `suggestions` prop (each
// item a string or { icon, label }). The prop shape is ready for a context-aware
// v2 that hands tailored suggestions in. The pop-up is now the PRIMARY suggestion
// affordance, so the thread empty-state drops its duplicate chips (flag-on).
//
// Behaviour parity with flag-off CoachInput: Enter = send, Shift+Enter = newline,
// disabled while sending, auto-grow (UNCONDITIONAL) capped by variant (dock 160px
// fixed / panel 40vh), rounded rectangle. Scroll-pin stays with CoachThread.

const norm = (s) => (typeof s === "string" ? { label: s } : s);

export default function AgentComposer({ variant = "dock", suggestions = [] }) {
  const conv = useCoachConversation();
  const taRef = useRef(null);
  const [focused, setFocused] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const isDock = variant === "dock";
  const items = suggestions.map(norm).filter((s) => s && s.label);

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
  const showSuggestions = focused && !hasText && items.length > 0;

  const onKeyDown = (e) => {
    if (showSuggestions && e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % items.length);
    } else if (showSuggestions && e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => (i - 1 + items.length) % items.length);
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (showSuggestions && activeIdx >= 0)
        conv.sendMessage(items[activeIdx].label);
      else conv.sendMessage();
      setActiveIdx(-1);
    } else if (e.key === "Escape") {
      setActiveIdx(-1);
      taRef.current?.blur();
    }
  };

  const popId = `agent-composer-actions-${variant}`;

  return (
    <div
      className={`relative ${isDock ? "px-3 py-2.5" : "px-4 py-3"} border-t border-rd-border-subtle bg-rd-bg-card`}
      data-agent-composer
      data-variant={variant}
    >
      {showSuggestions && (
        <div
          id={popId}
          role="listbox"
          className="absolute bottom-full left-3 right-3 mb-1.5 z-20 rd-r-md rd-lift p-1 bg-rd-bg-card"
        >
          <p className="px-2 pt-1 pb-1 rd-t-micro uppercase tracking-[0.09em] font-mono text-rd-text-eyebrow">
            Suggested
          </p>
          {items.map((a, i) => (
            <CanvasCommandItem
              key={a.label}
              icon={a.icon}
              label={a.label}
              active={i === activeIdx}
              onSelect={() => {
                conv.sendMessage(a.label);
                setActiveIdx(-1);
              }}
              className="cx-reveal"
              style={{ animationDelay: `${i * 35}ms` }}
            />
          ))}
        </div>
      )}

      <div className="rd-well rd-r-md flex items-end gap-1.5 px-2.5 py-2 transition-shadow focus-within:ring-2 focus-within:ring-rd-primary/35">
        <Search
          className="w-4 h-4 text-rd-text-tertiary flex-shrink-0 mb-1.5"
          aria-hidden="true"
        />
        <textarea
          ref={taRef}
          value={conv.input}
          rows={1}
          onChange={(e) => conv.setInput(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={onKeyDown}
          aria-controls={popId}
          aria-expanded={showSuggestions}
          placeholder={isDock ? "Ask about this page…" : "Message your coach…"}
          className={`flex-1 resize-none bg-transparent rd-t-body-m text-rd-text placeholder:text-rd-text-tertiary focus:outline-none leading-[1.5] ${isDock ? "max-h-[160px]" : "max-h-[40vh]"}`}
        />
        <button
          type="button"
          onClick={() => conv.sendMessage()}
          disabled={!hasText && !conv.sending}
          aria-label="Send message"
          className={`${isDock ? "w-7 h-7" : "w-8 h-8"} inline-flex items-center justify-center flex-shrink-0 rounded-full bg-rd-primary text-white hover:bg-rd-primary-dark rd-press disabled:opacity-40 disabled:cursor-not-allowed transition-colors`}
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
