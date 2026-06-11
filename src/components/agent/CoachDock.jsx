import React, { useEffect, useRef, useState } from "react";
import { Sparkles, Maximize2 } from "lucide-react";
import { useAgentDrawer } from "@/lib/AgentDrawerContext";
import CoachThread from "./CoachThread";
import CoachInput from "./CoachInput";

// CoachDock — permanently mounted live chat in the sidebar's dead space
// between the nav items and the user footer. Renders header + thread +
// input.
//
// Short-viewport behavior: when available height drops below
// COLLAPSE_THRESHOLD_PX, the thread region is hidden (header + input
// only). Measured via ResizeObserver on the dock root. The user can
// still type into the input and tap expand to open the full panel.
//
// The dock NEVER overlaps the user footer because it sits as the
// flex-1 sibling of the footer inside the sidebar's flex-col chain.
//
// Reads / writes from CoachConversationProvider which is mounted in
// Layout.jsx alongside AgentDrawerProvider.

const COLLAPSE_THRESHOLD_PX = 220;

export default function CoachDock() {
  const drawer = useAgentDrawer();
  const rootRef = useRef(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!rootRef.current) return;
    const el = rootRef.current;
    const measure = () => {
      const h = el.clientHeight;
      setCollapsed(h < COLLAPSE_THRESHOLD_PX);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const expand = () => drawer.open({});

  return (
    <div
      ref={rootRef}
      className="flex-1 min-h-0 flex flex-col bg-rd-bg-card border-t border-rd-border-subtle"
      data-coach-dock
      data-collapsed={collapsed}
    >
      {/* Slim header — sparkles + label + expand */}
      <div className="px-3 py-2 flex items-center gap-2 border-b border-rd-border-subtle bg-rd-bg-soft">
        <span className="w-5 h-5 rounded-full bg-rd-coral flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-2.5 h-2.5 text-white" aria-hidden="true" />
        </span>
        <span className="flex-1 font-display font-bold text-[12px] tracking-tight text-rd-text">
          Coach
        </span>
        <button
          type="button"
          onClick={expand}
          aria-label="Open coach in full panel"
          className="inline-flex items-center justify-center w-6 h-6 rounded-md text-rd-text-tertiary hover:bg-rd-bg-card hover:text-rd-text transition-colors"
        >
          <Maximize2 className="w-3 h-3" aria-hidden="true" />
        </button>
      </div>

      {/* Thread (hidden when collapsed) */}
      {!collapsed && <CoachThread variant="dock" />}

      {/* Input row — always visible. When collapsed the input gets the
          full remaining height. */}
      <CoachInput variant="dock" />
    </div>
  );
}
