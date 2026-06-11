import React, { useEffect, useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { useAgentDrawer } from "@/lib/AgentDrawerContext";
import ChatInterface from "@/components/chat/ChatInterface";

// PR-A3: persistent right-edge agent drawer.
//
// Tab: always-visible button on the right edge of the viewport while
// authenticated. z-[55] keeps it clickable when an
// ApplicationDetailDrawer Sheet (Radix default z-50) is open.
//
// Panel: layered above the detail Sheet so the agent always wins the
// foreground when invoked. Overlay z-[58], panel z-[60], detail Sheet
// stays at z-50.
//
// Desktop ≥ 768px: right-side panel (520px wide) with translate-x
// transition. Mobile < 768px: bottom sheet (85vh tall) with translate-y
// transition. The tab remains right-edge on both — only the panel
// presentation changes.
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
  const { isOpen, seed, applicationId, pageContext, open, close } = useAgentDrawer();
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
      {/* Right-edge tab — always visible while the drawer provider is
          mounted. Vertical text leaves the tab narrow (~36px) so it
          doesn't crowd page content. */}
      <button
        type="button"
        onClick={() => open({})}
        aria-label="Open your career agent"
        aria-expanded={isOpen}
        aria-controls="agent-drawer-panel"
        className="fixed right-0 top-1/2 -translate-y-1/2 z-[55] bg-rd-coral text-white pl-1.5 pr-1 py-3.5 rounded-l-[12px] shadow-rd hover:bg-rd-coral-dark transition-colors flex flex-col items-center gap-1.5"
        data-agent-tab
      >
        <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />
        <span
          className="font-display font-bold text-[10.5px] tracking-tight whitespace-nowrap"
          style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
        >
          Ask your agent
        </span>
      </button>

      {/* Overlay — interactive (click closes), aria-hidden so screen
          readers don't double-announce the dialog backdrop. Only renders
          when open so the page stays scrollable + the tab keeps its
          right-edge hit area when closed. */}
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
