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
    <div className="c-intro">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="c-intro-toggle"
      >
        <Info className="w-3.5 h-3.5 text-[#9C9DA1]" />
        <span>{open ? "What this agent does" : "What can this agent do?"}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-[#9C9DA1] ml-auto transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="c-intro-body">
          <div>
            <p className="c-intro-cap-label">Capabilities</p>
            <ul className="c-intro-cap-list">
              {capabilities.map((cap, i) => (
                <li key={i}>{cap}</li>
              ))}
            </ul>
          </div>
          <div className="c-intro-howto">
            <p className="c-intro-howto-label">How to use</p>
            <p className="c-intro-howto-body">{howToUse}</p>
          </div>
        </div>
      )}
    </div>
  );
}
