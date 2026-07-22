import React, { useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { useAgentDrawer } from "@/lib/AgentDrawerContext";
import { useCoachConversation } from "@/lib/CoachConversationContext";
import CoachThread from "./CoachThread";
import CoachInput from "./CoachInput";
import { isNextDesign } from "@/lib/nextDesign";

// Agent drawer panel. PR-A3 originally shipped a right-edge floating
// tab; PR-#295 attempt moved the entry to a Coach sidebar nav item.
// This rework retires both: the coach is now a docked live chat in
// the sidebar, and the drawer panel is the "expanded" view of that
// same conversation. State is shared via CoachConversationProvider so
// anything sent in the dock appears here and vice-versa.
//
// Panel mechanics (unchanged from #293/#294):
//   - Desktop ≥ 768px: right-side 520px panel with translate-x.
//   - Mobile < 768px: bottom sheet 85vh with translate-y.
//   - Overlay z-[58], panel z-[60] — layers above ApplicationDetailDrawer
//     Sheet (z-50).
//
// Mount strategy: CoachThread + CoachInput pull from the provider, so the
// rolling conversation persists across close/reopen without needing the
// hasMounted guard from the ChatInterface-based earlier shape.

const MOBILE_BREAKPOINT = 768;

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < MOBILE_BREAKPOINT : false,
  );
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return isMobile;
}

export default function AgentDrawer() {
  const { isOpen, seed, close } = useAgentDrawer();
  const conv = useCoachConversation();
  const isMobile = useIsMobile();

  // Seed integration: when the drawer opens with a coach-band seed,
  // pre-populate the shared input. Empty seed leaves whatever the user
  // is typing alone.
  useEffect(() => {
    if (isOpen && seed && conv) conv.setInput(seed);
  }, [isOpen, seed, conv]);

  // Esc closes (same a11y affordance every dialog gets).
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, close]);

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-[58] bg-rd-text/30 backdrop-blur-[2px]"
          onClick={close}
          aria-hidden="true"
        />
      )}

      <aside
        id="agent-drawer-panel"
        role="dialog"
        aria-label="Career coach"
        aria-hidden={!isOpen}
        aria-modal={isOpen ? "true" : "false"}
        className={[
          `fixed z-[60] bg-rd-bg-card border-rd-border shadow-xl flex flex-col transition-transform duration-300 ${isNextDesign() ? "ease-[cubic-bezier(0.34,1.56,0.64,1)]" : "ease-out"}`,
          isMobile
            ? `left-0 right-0 bottom-0 h-[85vh] rounded-t-[18px] border-t ${isOpen ? "translate-y-0" : "translate-y-full"}`
            : `right-0 top-0 h-full w-[520px] max-w-[100vw] border-l ${isOpen ? "translate-x-0" : "translate-x-full"}`,
        ].join(" ")}
        data-agent-panel
      >
        {/* Panel header — same vocabulary as the dock: coral LINE icon
            (no filled badge), font-display label, X close on the right,
            hairline divider below. */}
        <div className="px-4 py-3 border-b border-rd-border-subtle flex items-center gap-2.5">
          <Sparkles className="w-4 h-4 text-rd-primary flex-shrink-0" aria-hidden="true" strokeWidth={2} />
          <div className="flex-1 min-w-0">
            <p className="font-display font-bold text-[14px] text-rd-text leading-tight">Coach</p>
            <p className="text-[10.5px] text-rd-text-tertiary leading-tight">Same conversation as your sidebar dock</p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close coach panel"
            tabIndex={isOpen ? 0 : -1}
            className="inline-flex items-center justify-center w-7 h-7 rounded-full text-rd-text-tertiary hover:bg-rd-bg-soft hover:text-rd-text transition-colors"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>

        {/* Same shared-state thread + input rendered in the dock, just
            in the panel's wider variant. */}
        <CoachThread variant="panel" />
        <CoachInput variant="panel" />
      </aside>
    </>
  );
}
