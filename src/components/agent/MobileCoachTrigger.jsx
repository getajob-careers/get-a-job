import React from "react";
import { Sparkles } from "lucide-react";
import { useAgentDrawer } from "@/lib/AgentDrawerContext";

// Mobile-only persistent Coach trigger. Lives in Layout's mobile top
// header next to the hamburger so the coach is always one tap away on
// <768px even when the sidebar is closed. Coral chip — distinct enough
// from the brand mark in the center but not so loud it competes with
// page-level Apply buttons or the floating feedback pill on the right
// edge (which is why this chip lives on the LEFT, beside the hamburger,
// not on the right edge).
export default function MobileCoachTrigger() {
  const drawer = useAgentDrawer();
  return (
    <button
      type="button"
      onClick={() => drawer.open({})}
      aria-label="Open your career coach"
      data-coach-mobile-trigger
      className="inline-flex items-center gap-1 rounded-full bg-rd-primary text-white px-2.5 py-1.5 hover:bg-rd-primary-dark transition-colors"
    >
      <Sparkles className="w-3 h-3" aria-hidden="true" />
      <span className="font-display font-bold text-[11px] tracking-tight">Coach</span>
    </button>
  );
}
