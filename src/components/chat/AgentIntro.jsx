import React, { useState, useEffect } from "react";
import { ChevronDown, Info } from "lucide-react";

// Shared collapsible intro header for the four agent pages (CareerAgent,
// CVAgent, InterviewCoach, SkillDevelopmentAdvisor). Restores the
// capabilities + how-to-use content that used to live on the now-deprecated
// Subagents router page — without that context, users land on a blank chat
// and don't know what the agent is good at.
//
// Visit-aware default: expanded on first 1–2 visits, then auto-collapsed.
// Once a user has manually toggled the state, that becomes the new default
// (we track "manual" vs "auto" via a sentinel in localStorage).
//
//   gaj.agent_intro_visits_{agentId}  → integer (number of times the page
//                                       has been mounted with the intro
//                                       component rendered)
//   gaj.agent_intro_seen_{agentId}    → "expanded" | "collapsed" | "manual:..."
//                                       "manual:expanded" / "manual:collapsed"
//                                       sticks; "auto" defers to the visit
//                                       count threshold below.
//
// Threshold: VISITS_BEFORE_AUTO_COLLAPSE = 2. Visit 1 and 2 expanded by
// default; visit 3+ collapsed by default. Users can always toggle manually.

const VISITS_BEFORE_AUTO_COLLAPSE = 2;

export default function AgentIntro({ agentId, capabilities, howToUse }) {
  const visitsKey = `gaj.agent_intro_visits_${agentId}`;
  const stateKey = `gaj.agent_intro_seen_${agentId}`;

  // Read once at mount: visit count + persisted manual state (if any).
  const initialOpen = (() => {
    try {
      const raw = localStorage.getItem(stateKey) || "";
      if (raw.startsWith("manual:")) {
        return raw === "manual:expanded";
      }
      const visits = parseInt(localStorage.getItem(visitsKey) || "0", 10) || 0;
      return visits < VISITS_BEFORE_AUTO_COLLAPSE;
    } catch {
      return true;
    }
  })();

  const [open, setOpen] = useState(initialOpen);

  // Bump the visit counter once per mount. Doesn't affect the current
  // render's open state — only future page loads see the auto-collapse.
  useEffect(() => {
    try {
      const visits = parseInt(localStorage.getItem(visitsKey) || "0", 10) || 0;
      localStorage.setItem(visitsKey, String(visits + 1));
    } catch {
      /* private mode */
    }

  }, []);

  const toggle = () => {
    setOpen((prev) => {
      const next = !prev;
      try {
        // Manual toggle takes over from the auto-collapse heuristic.
        localStorage.setItem(stateKey, next ? "manual:expanded" : "manual:collapsed");
      } catch {
        /* private mode */
      }
      return next;
    });
  };

  return (
    <div className="border-b border-rd-border bg-rd-bg-card flex-shrink-0">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="w-full px-6 py-[11px] flex items-center gap-2 bg-transparent border-0 cursor-pointer text-rd-text-secondary text-[12.5px] font-medium hover:bg-rd-bg-soft hover:text-rd-text transition-colors"
      >
        <Info className="w-3.5 h-3.5 text-rd-text-tertiary" />
        <span>{open ? "What this agent does" : "What can this agent do?"}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-rd-text-tertiary ml-auto transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="px-6 pb-[18px] grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-3.5">
          <div>
            <p className="text-[10.5px] uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow font-mono mb-2">
              Capabilities
            </p>
            <ul className="flex flex-col gap-1 m-0 p-0 list-none">
              {capabilities.map((cap, i) => (
                <li key={i} className="text-[12.5px] text-rd-text-secondary leading-snug">{cap}</li>
              ))}
            </ul>
          </div>
          <div className="bg-rd-coral-tint border border-rd-coral/30 rounded-[14px] px-3.5 py-3 h-fit">
            <p className="text-[10.5px] uppercase tracking-[0.09em] font-medium text-rd-coral-dark font-mono mb-1">
              How to use
            </p>
            <p className="text-[12.5px] text-rd-text leading-snug">{howToUse}</p>
          </div>
        </div>
      )}
    </div>
  );
}
