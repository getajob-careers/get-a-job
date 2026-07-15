// PROD ORIGINAL: src/components/agent/CoachDock.jsx (canvas clone; fixture
// thread + local send, no CoachConversationProvider / LLM / DB)
import React, { useEffect, useRef, useState } from "react";
import {
  Sparkles,
  Maximize2,
  ArrowUp,
  Search,
  Target,
  CheckCircle2,
  Building2,
} from "lucide-react";
import CanvasCommandItem from "./CanvasCommandItem";
import { reveal } from "./stagger";
import { CANVAS_COACH_MESSAGES } from "../fixtures/canvasHome";

// Idea #13: warm grain-texture for the coach panel. A gentle white→peach
// gradient (the AI surface reads warmer than flat-cream content) with a faint
// SVG-noise grain laid over the top — texture, not effect (grainient.supply).
const WARM_GRADIENT =
  "linear-gradient(155deg, var(--rd-bg-card) 35%, var(--rd-coral-tint) 135%)";
const GRAIN_URL =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

// Fixture-mode Coach dock. Mirrors the prod CoachDock's inset-card look but is
// self-contained: the thread is seeded from fixtures and "send" appends to
// LOCAL state with a canned reply — no CoachConversationProvider, no LLM call,
// no DB write. Purely a design surface.

export default function CanvasCoachDock() {
  const [messages, setMessages] = useState(CANVAS_COACH_MESSAGES);
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false); // action-search dropdown
  const [activeIdx, setActiveIdx] = useState(-1);
  const threadRef = useRef(null);

  // Action-search suggestions (idea #2 sibling of ⌘K). Prompts wrap rather than
  // clip now (CanvasCommandItem truncate=false), so length isn't fatal, but they
  // stay short to read as one line at the 248px dock width. "[tracked company]"
  // = Lemonade, the interviewing fixture app.
  const ACTIONS = [
    { icon: Target, label: "What's my next move?" },
    { icon: CheckCircle2, label: "Am I ready to apply?" },
    { icon: Building2, label: "Prep me for Lemonade" },
  ];

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight });
  }, [messages]);

  const send = (text) => {
    const t = text.trim();
    if (!t) return;
    setMessages((prev) => [
      ...prev,
      { id: `cx-local-${prev.length}`, role: "user", text: t },
      {
        id: `cx-local-${prev.length + 1}`,
        role: "assistant",
        text: "(Prototype coach — replies are stubbed in fixture mode. In the live product I'd answer using your roadmap, pipeline, and this page.)",
      },
    ]);
    setDraft("");
    setOpen(false);
    setActiveIdx(-1);
  };

  const onKeyDown = (e) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % ACTIONS.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => (i - 1 + ACTIONS.length) % ACTIONS.length);
    } else if (e.key === "Enter" && activeIdx >= 0) {
      e.preventDefault();
      send(ACTIONS[activeIdx].label);
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIdx(-1);
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col p-3">
      <div
        className="relative flex-1 min-h-0 flex flex-col border border-rd-border-subtle rounded-lg overflow-hidden"
        style={{ background: WARM_GRADIENT }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-3 h-8 border-b border-rd-border-subtle">
          <Sparkles
            className="w-3.5 h-3.5 text-rd-coral flex-shrink-0"
            aria-hidden="true"
            strokeWidth={2}
          />
          <span className="flex-1 font-display font-bold text-[12.5px] tracking-tight text-rd-text leading-none">
            Coach
          </span>
          <button
            type="button"
            aria-label="Open coach in full panel"
            className="inline-flex items-center justify-center w-5 h-5 rounded-md text-rd-text-tertiary hover:bg-rd-bg-soft hover:text-rd-text transition-colors"
          >
            <Maximize2 className="w-3 h-3" aria-hidden="true" />
          </button>
        </div>

        {/* Thread */}
        <div
          ref={threadRef}
          className="flex-1 min-h-0 overflow-y-auto px-3 py-2.5 space-y-2.5"
        >
          {messages.map((m) => (
            <div
              key={m.id}
              className={
                m.role === "user" ? "flex justify-end" : "flex justify-start"
              }
            >
              <div
                className={`max-w-[85%] rounded-[12px] px-2.5 py-1.5 text-[12px] leading-[1.5] ${
                  m.role === "user"
                    ? "bg-rd-coral text-white"
                    : "bg-rd-bg-soft text-rd-text"
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
        </div>

        {/* Action-search input — focus opens a staggered command dropdown
            (kokonutUI ActionSearchBar; sibling of the future ⌘K palette). */}
        <div className="relative border-t border-rd-border-subtle">
          {open && (
            <div
              id="cx-coach-actions"
              role="listbox"
              className="absolute bottom-full left-2 right-2 mb-1.5 z-20 rounded-lg border border-rd-border bg-rd-bg-card shadow-rd p-1"
            >
              <p className="px-2 pt-1 pb-1 text-[9px] uppercase tracking-[0.09em] font-mono text-rd-text-eyebrow">
                Suggested
              </p>
              {ACTIONS.map((a, i) => (
                <CanvasCommandItem
                  key={a.label}
                  icon={a.icon}
                  label={a.label}
                  hint={a.hint}
                  active={i === activeIdx}
                  onSelect={() => send(a.label)}
                  className={reveal(i, 35).className}
                  style={reveal(i, 35).style}
                />
              ))}
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(draft);
            }}
            className="flex items-center gap-1.5 px-2.5 py-2"
          >
            <Search
              className="w-3.5 h-3.5 text-rd-text-tertiary flex-shrink-0"
              aria-hidden="true"
            />
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onFocus={() => {
                setOpen(true);
                setActiveIdx(-1);
              }}
              onBlur={() => setOpen(false)}
              onKeyDown={onKeyDown}
              role="combobox"
              aria-expanded={open}
              aria-controls="cx-coach-actions"
              placeholder="Ask your coach or pick an action…"
              className="flex-1 bg-transparent text-[12.5px] text-rd-text placeholder:text-rd-text-tertiary focus:outline-none"
            />
            <button
              type="submit"
              disabled={!draft.trim()}
              aria-label="Send"
              className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-rd-coral text-white hover:bg-rd-coral-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ArrowUp className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </form>
        </div>

        {/* Grain overlay — faint film grain over the whole panel. */}
        <div
          className="pointer-events-none absolute inset-0 rounded-lg"
          style={{
            backgroundImage: GRAIN_URL,
            // Grain tuning is overridable via CSS vars (a future field/theme can
            // retune it); defaults to the warm-cream multiply treatment.
            opacity: "var(--rd-grain-opacity, 0.05)",
            mixBlendMode: "var(--rd-grain-blend, multiply)",
          }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
