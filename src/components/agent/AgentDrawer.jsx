import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useAgentDrawer } from "@/lib/AgentDrawerContext";
import ChatInterface from "@/components/chat/ChatInterface";

// Agent drawer panel. PR-A3 originally shipped a right-edge floating
// tab beside the panel; the founder retired the tab after production use
// because it was too invisible. The drawer entry now lives as the
// "Coach" item in Layout's sidebar (Layout.jsx). This component owns
// only the panel + overlay + close button — the trigger is external.
//
// Panel mechanics (unchanged from #293):
//   - Desktop ≥ 768px: right-side panel (520px wide) with translate-x
//     transition.
//   - Mobile < 768px: bottom sheet (85vh tall) with translate-y
//     transition.
//   - Overlay z-[58], panel z-[60] — layers above the
//     ApplicationDetailDrawer Sheet (Radix default z-50) so the agent
//     wins the foreground when invoked.
//
// Mount strategy: ChatInterface stays mounted whenever isOpen has been
// truthy at least once. We keep its state in memory across close so the
// user's rolling conversation persists across open/close cycles — that's
// the "one rolling conversation per user" contract.

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

// Default suggested prompts for the drawer's empty-state. The seed (when
// present) is prepended above these. Kept short — the panel is narrow.
const DEFAULT_DRAWER_PROMPTS = [
  "What should I focus on this week?",
  "Am I ready to apply for my Track 1 roles?",
  "What's my biggest gap right now?",
];

export default function AgentDrawer() {
  // `open` no longer destructured — the sidebar's Coach item is the
  // trigger now (Layout.jsx handleCoachClick → openAgentDrawer({})).
  const { isOpen, seed, applicationId, pageContext, close } = useAgentDrawer();
  const isMobile = useIsMobile();

  // Mount the chat once the drawer has been opened at least once; keep
  // it mounted across close/reopen so the rolling conversation persists.
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    if (isOpen && !hasMounted) setHasMounted(true);
  }, [isOpen, hasMounted]);

  // Esc closes the drawer (same a11y affordance every dialog gets).
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, close]);

  const suggestedPrompts = seed
    ? [seed, ...DEFAULT_DRAWER_PROMPTS.filter((p) => p !== seed)]
    : DEFAULT_DRAWER_PROMPTS;

  return (
    <>
      {/* Overlay — interactive (click closes), aria-hidden so screen
          readers don't double-announce the dialog backdrop. Only renders
          when open so the page stays scrollable when the drawer is
          closed. */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[58] bg-rd-text/30 backdrop-blur-[2px]"
          onClick={close}
          aria-hidden="true"
        />
      )}

      {/* Panel / sheet. Always in the DOM once mounted so ChatInterface
          state survives close. Transform-driven slide so the close →
          reopen path doesn't unmount + lose conversation state. */}
      <aside
        id="agent-drawer-panel"
        role="dialog"
        aria-label="Career agent"
        aria-hidden={!isOpen}
        aria-modal={isOpen ? "true" : "false"}
        className={[
          "fixed z-[60] bg-rd-bg-card border-rd-border shadow-xl flex flex-col transition-transform duration-300 ease-out",
          isMobile
            ? `left-0 right-0 bottom-0 h-[85vh] rounded-t-[18px] border-t ${isOpen ? "translate-y-0" : "translate-y-full"}`
            : `right-0 top-0 h-full w-[520px] max-w-[100vw] border-l ${isOpen ? "translate-x-0" : "translate-x-full"}`,
        ].join(" ")}
        data-agent-panel
      >
        {/* Close affordance inside the panel chrome — distinct from the
            right-edge tab (which stays for re-open after close). */}
        <button
          type="button"
          onClick={close}
          aria-label="Close your career agent"
          tabIndex={isOpen ? 0 : -1}
          className="absolute right-3 top-3 z-10 inline-flex items-center justify-center w-7 h-7 rounded-full text-rd-text-tertiary hover:bg-rd-bg-soft hover:text-rd-text transition-colors"
        >
          <X className="w-3.5 h-3.5" aria-hidden="true" />
        </button>

        {hasMounted && (
          <ChatInterface
            variant="drawer"
            agentName="career_agent"
            title="Career Agent"
            description=""
            applicationId={applicationId}
            pageContext={pageContext}
            suggestedPrompts={suggestedPrompts}
            initialInput={seed || null}
            introMessage="What would you like to work on?"
          />
        )}
      </aside>
    </>
  );
}
