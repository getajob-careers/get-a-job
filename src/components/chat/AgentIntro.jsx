import React, { useState } from "react";
import { ChevronDown, Info } from "lucide-react";

// Shared collapsible intro header for the four agent pages (CareerAgent,
// CVAgent, InterviewCoach, SkillDevelopmentAdvisor). Restores the
// capabilities + how-to-use content that used to live on the now-deprecated
// Subagents router page — without that context, users land on a blank chat
// and don't know what the agent is good at.
//
// Expanded by default on first visit. Once collapsed, the collapsed state
// is remembered per-agent via localStorage so returning users don't see
// the panel re-expand every session.

export default function AgentIntro({ agentId, capabilities, howToUse }) {
  const storageKey = `gaj.agent_intro_seen_${agentId}`;
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem(storageKey) !== "collapsed";
    } catch {
      return true;
    }
  });

  const toggle = () => {
    setOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(storageKey, next ? "expanded" : "collapsed");
      } catch {
        /* private mode — non-essential persistence */
      }
      return next;
    });
  };

  return (
    <div className="border-b border-[#E5E5E5] bg-white shrink-0">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="w-full px-6 py-2.5 flex items-center gap-2 text-xs text-[#525252] hover:bg-[#FAFAFA] transition-colors"
      >
        <Info className="w-3.5 h-3.5 text-[#A3A3A3]" />
        <span className="font-medium">
          {open ? "What this agent does" : "What can this agent do?"}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-[#A3A3A3] ml-auto transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="px-6 pb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[#A3A3A3] font-semibold mb-1.5">
              Capabilities
            </p>
            <ul className="space-y-0.5">
              {capabilities.map((cap, i) => (
                <li key={i} className="text-xs text-[#525252] leading-relaxed">
                  {cap}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-lg px-3 py-2.5 h-fit">
            <p className="text-[10px] uppercase tracking-wider text-[#D97706] font-semibold mb-1">
              How to use
            </p>
            <p className="text-xs text-[#525252] leading-relaxed">{howToUse}</p>
          </div>
        </div>
      )}
    </div>
  );
}
