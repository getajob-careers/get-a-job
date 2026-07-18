// PROD ORIGINAL: src/components/agent/CoachDock.jsx (canvas clone; fixture
// thread + local send, no CoachConversationProvider / LLM / DB). Round-3 coach
// ergonomics pass: (1) auto-growing textarea input, (2) body-m message type +
// roomier bubbles, (3) STREAM-AWARE scroll — pins to bottom while a reply streams
// but stops if the user scrolls up, with a quiet "↓ latest" button, and (4) an
// expand affordance that opens a wide overlay for comfortable long reads.
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Sparkles,
  Maximize2,
  X,
  ArrowUp,
  Search,
  ArrowDown,
  Target,
  CheckCircle2,
  Building2,
} from "lucide-react";
import CanvasCommandItem from "./CanvasCommandItem";
import { reveal } from "./stagger";
import { CANVAS_COACH_MESSAGES } from "../fixtures/canvasHome";

const WARM_GRADIENT =
  "linear-gradient(155deg, var(--rd-bg-card) 35%, var(--rd-coral-tint) 135%)";
const GRAIN_URL =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

const ACTIONS = [
  { icon: Target, label: "What's my next move?" },
  { icon: CheckCircle2, label: "Am I ready to apply?" },
  { icon: Building2, label: "Prep me for Lemonade" },
];

const STREAM_REPLY =
  "Great question. In the live product I'd pull your roadmap, pipeline, and this page to answer. Short version: prep the Lemonade case study next — your Bringg A/B-testing work is your strongest lever, so build the STAR story around the activation lift you drove.";

// The shared panel body — used by both the docked dock and the expanded overlay.
function CoachBody({ messages, streaming, onSend, expanded, onToggleExpand }) {
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [atBottom, setAtBottom] = useState(true);
  const threadRef = useRef(null);
  const taRef = useRef(null);

  const near = () => {
    const el = threadRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 48;
  };
  const toBottom = (smooth) => {
    const el = threadRef.current;
    if (el)
      el.scrollTo({
        top: el.scrollHeight,
        behavior: smooth ? "smooth" : "auto",
      });
  };

  // Stream-aware: while content grows, only auto-follow if the user is pinned to
  // the bottom; otherwise leave them where they scrolled and surface "↓ latest".
  useEffect(() => {
    if (atBottom) toBottom(false);
  }, [messages, streaming]);

  const grow = () => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, expanded ? 160 : 104)}px`;
  };
  useEffect(grow, [draft, expanded]);

  const submit = () => {
    const t = draft.trim();
    if (!t) return;
    onSend(t);
    setDraft("");
    setOpen(false);
    setActiveIdx(-1);
    setAtBottom(true);
    requestAnimationFrame(() => toBottom(false));
  };

  const onKeyDown = (e) => {
    if (open && e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % ACTIONS.length);
    } else if (open && e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => (i - 1 + ACTIONS.length) % ACTIONS.length);
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (open && activeIdx >= 0) onSend(ACTIONS[activeIdx].label);
      else submit();
      setOpen(false);
      setActiveIdx(-1);
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIdx(-1);
    }
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-2 px-3 h-9 border-b border-rd-border-subtle flex-shrink-0">
        <Sparkles
          className="w-4 h-4 text-rd-coral flex-shrink-0"
          aria-hidden="true"
          strokeWidth={2}
        />
        <span className="flex-1 font-display font-bold rd-t-body-m tracking-tight text-rd-text leading-none">
          Coach
        </span>
        <button
          type="button"
          onClick={onToggleExpand}
          aria-label={expanded ? "Collapse coach" : "Expand coach"}
          className="inline-flex items-center justify-center w-6 h-6 rd-r-xs text-rd-text-tertiary hover:bg-rd-bg-soft hover:text-rd-text transition-colors"
        >
          {expanded ? (
            <X className="w-4 h-4" aria-hidden="true" />
          ) : (
            <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Thread */}
      <div
        ref={threadRef}
        onScroll={() => setAtBottom(near())}
        className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-3"
      >
        {messages.map((m) => (
          <div
            key={m.id}
            className={
              m.role === "user" ? "flex justify-end" : "flex justify-start"
            }
          >
            <div
              className={`${expanded ? "max-w-[75%]" : "max-w-[88%]"} rd-r-md px-3 py-2 rd-t-body-m leading-[1.55] ${
                m.role === "user"
                  ? "bg-rd-coral text-white rd-btn-sheen"
                  : "rd-lift text-rd-text"
              }`}
            >
              {m.text || (streaming ? "…" : "")}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="relative p-2 flex-shrink-0">
        {/* Stream-aware "jump to latest" */}
        {!atBottom && (
          <button
            type="button"
            onClick={() => {
              toBottom(true);
              setAtBottom(true);
            }}
            className="absolute -top-4 left-1/2 -translate-x-1/2 z-20 inline-flex items-center gap-1 rounded-full bg-rd-text text-white rd-t-micro font-display font-semibold px-2.5 py-1 shadow-rd rd-press"
          >
            <ArrowDown className="w-3 h-3" aria-hidden="true" />
            Latest
          </button>
        )}

        {open && draft.trim() === "" && (
          <div
            id="cx-coach-actions"
            role="listbox"
            className="absolute bottom-full left-2 right-2 mb-1.5 z-20 rd-r-md rd-lift p-1"
          >
            <p className="px-2 pt-1 pb-1 rd-t-micro uppercase tracking-[0.09em] font-mono text-rd-text-eyebrow">
              Suggested
            </p>
            {ACTIONS.map((a, i) => (
              <CanvasCommandItem
                key={a.label}
                icon={a.icon}
                label={a.label}
                active={i === activeIdx}
                onSelect={() => {
                  onSend(a.label);
                  setOpen(false);
                  setAtBottom(true);
                  requestAnimationFrame(() => toBottom(false));
                }}
                className={reveal(i, 35).className}
                style={reveal(i, 35).style}
              />
            ))}
          </div>
        )}

        <div className="rd-well rd-r-md flex items-end gap-1.5 px-2.5 py-2 transition-shadow focus-within:ring-2 focus-within:ring-rd-coral/35">
          <Search
            className="w-4 h-4 text-rd-text-tertiary flex-shrink-0 mb-0.5"
            aria-hidden="true"
          />
          <textarea
            ref={taRef}
            value={draft}
            rows={1}
            onChange={(e) => setDraft(e.target.value)}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            onKeyDown={onKeyDown}
            aria-controls="cx-coach-actions"
            placeholder="Ask your coach or pick an action…"
            className="flex-1 resize-none bg-transparent rd-t-body-m text-rd-text placeholder:text-rd-text-tertiary focus:outline-none leading-[1.5] max-h-[160px]"
          />
          <button
            type="button"
            onClick={submit}
            disabled={!draft.trim()}
            aria-label="Send"
            className="inline-flex items-center justify-center w-7 h-7 flex-shrink-0 rounded-full bg-rd-coral text-white hover:bg-rd-coral-dark rd-press disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ArrowUp className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </>
  );
}

// `expanded`/`onExpandedChange` are optional: pass them to control the expand
// state from outside (the Chat tile opens the SAME conversation, expanded).
// Omitted → the dock owns its own expand state as before.
export default function CanvasCoachDock({
  expanded: expandedProp,
  onExpandedChange,
} = {}) {
  const [messages, setMessages] = useState(CANVAS_COACH_MESSAGES);
  const [streaming, setStreaming] = useState(false);
  const [expandedInternal, setExpandedInternal] = useState(false);
  const expanded = expandedProp ?? expandedInternal;
  const setExpanded = onExpandedChange ?? setExpandedInternal;
  const streamRef = useRef(null);

  useEffect(() => () => clearInterval(streamRef.current), []);

  // Local send with a simulated streaming reply so the pin-while-streaming
  // behaviour is demonstrable (no LLM/DB).
  const send = (text) => {
    const t = text.trim();
    if (!t) return;
    clearInterval(streamRef.current);
    setMessages((prev) => [
      ...prev,
      { id: `cx-u-${prev.length}`, role: "user", text: t },
      { id: `cx-a-${prev.length + 1}`, role: "assistant", text: "" },
    ]);
    setStreaming(true);
    const words = STREAM_REPLY.split(" ");
    let i = 0;
    streamRef.current = setInterval(() => {
      i += 1;
      setMessages((prev) => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        copy[copy.length - 1] = { ...last, text: words.slice(0, i).join(" ") };
        return copy;
      });
      if (i >= words.length) {
        clearInterval(streamRef.current);
        setStreaming(false);
      }
    }, 55);
  };

  // At medium+ amplitude the coach panel OWNS a tint (Eli: a tint, never a dark
  // reading surface); elsewhere it keeps the warm coral-tint gradient.
  const panelBg = { background: `var(--rd-amp-coach-bg, ${WARM_GRADIENT})` };
  const grain = (
    <div
      className="pointer-events-none absolute inset-0"
      style={{
        backgroundImage: GRAIN_URL,
        opacity: "var(--rd-grain-opacity, 0.05)",
        mixBlendMode: "var(--rd-grain-blend, multiply)",
      }}
      aria-hidden="true"
    />
  );

  return (
    <div className="flex-1 min-h-0 flex flex-col p-3">
      <div
        className="relative flex-1 min-h-0 flex flex-col rd-lift-shadow rd-r-lg overflow-hidden"
        style={panelBg}
      >
        <CoachBody
          messages={messages}
          streaming={streaming}
          onSend={send}
          expanded={false}
          onToggleExpand={() => setExpanded(true)}
        />
        {grain}
      </div>

      {expanded &&
        createPortal(
          <div
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-[rgba(40,25,10,0.45)]"
            onClick={() => setExpanded(false)}
          >
            <div
              className="relative w-full max-w-[560px] h-[80vh] flex flex-col rd-r-lg overflow-hidden shadow-rd"
              style={panelBg}
              onClick={(e) => e.stopPropagation()}
            >
              <CoachBody
                messages={messages}
                streaming={streaming}
                onSend={send}
                expanded
                onToggleExpand={() => setExpanded(false)}
              />
              {grain}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
