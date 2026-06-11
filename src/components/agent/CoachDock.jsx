import React, { useEffect, useRef, useState } from "react";
import { Sparkles, Maximize2 } from "lucide-react";
import { useAgentDrawer } from "@/lib/AgentDrawerContext";
import CoachThread from "./CoachThread";
import CoachInput from "./CoachInput";

// CoachDock — permanently mounted live chat in the sidebar's dead space
// between the nav items and the user footer. Renders header + thread +
// input.
//
// Visual treatment (founder review of production): single inset card
// floating within the sidebar's cream background. The previous full-
// bleed white block + separate header band stacked two backgrounds; the
// inset card is one surface, the sidebar background shows around it.
//
// Short-viewport behavior unchanged — when available height drops below
// COLLAPSE_THRESHOLD_PX, the thread region hides (header + input only).
// The dock NEVER overlaps the user footer because it sits as the flex-1
// sibling of the footer inside the sidebar's flex-col chain.
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
    // Outer wrapper: claims the dead space; the sidebar's cream
    // background shows around the inset card via the p-3 gutter.
    <div
      ref={rootRef}
      className="flex-1 min-h-0 flex flex-col p-3"
      data-coach-dock
      data-collapsed={collapsed}
    >
      {/* Single inset card — one surface, one border, rounded corners. */}
      <div className="flex-1 min-h-0 flex flex-col bg-rd-bg-card border border-rd-border-subtle rounded-lg overflow-hidden">
        {/* Compact header — Sparkles as a coral LINE icon (no filled
            badge), "Coach" in font-display, expand right, hairline below.
            One row ~32px. */}
        <div className="flex items-center gap-2 px-3 h-8 border-b border-rd-border-subtle">
          <Sparkles className="w-3.5 h-3.5 text-rd-coral flex-shrink-0" aria-hidden="true" strokeWidth={2} />
          <span className="flex-1 font-display font-bold text-[12.5px] tracking-tight text-rd-text leading-none">
            Coach
          </span>
          <button
            type="button"
            onClick={expand}
            aria-label="Open coach in full panel"
            className="inline-flex items-center justify-center w-5 h-5 rounded-md text-rd-text-tertiary hover:bg-rd-bg-soft hover:text-rd-text transition-colors"
          >
            <Maximize2 className="w-3 h-3" aria-hidden="true" />
          </button>
        </div>

        {/* Thread (hidden when collapsed) */}
        {!collapsed && <CoachThread variant="dock" />}

        {/* Input — pinned to the card's bottom. */}
        <CoachInput variant="dock" />
      </div>
    </div>
  );
}
