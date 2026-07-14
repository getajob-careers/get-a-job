// PROD ORIGINAL: src/components/agent/CoachDock.jsx (canvas clone; fixture
// thread + local send, no CoachConversationProvider / LLM / DB)
import React, { useEffect, useRef, useState } from "react";
import { Sparkles, Maximize2, ArrowUp } from "lucide-react";
import {
  CANVAS_COACH_MESSAGES,
  CANVAS_COACH_PROMPTS,
} from "../fixtures/canvasHome";

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
  const threadRef = useRef(null);

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
          {messages.length <= CANVAS_COACH_MESSAGES.length && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {CANVAS_COACH_PROMPTS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => send(p)}
                  className="text-[11px] rounded-full px-2.5 py-1 bg-rd-coral-tint text-rd-coral-dark hover:bg-rd-coral hover:text-white transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(draft);
          }}
          className="flex items-center gap-1.5 px-2.5 py-2 border-t border-rd-border-subtle"
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask your coach…"
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

        {/* Grain overlay — faint film grain over the whole panel. */}
        <div
          className="pointer-events-none absolute inset-0 rounded-lg"
          style={{
            backgroundImage: GRAIN_URL,
            opacity: 0.05,
            mixBlendMode: "multiply",
          }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
