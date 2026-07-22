import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Settings } from "lucide-react";
import { createPageUrl } from "@/utils";
import { useAuth } from "@/lib/AuthContext";
import { useProfileQuery } from "@/lib/queries/useProfile";
import CoachDock from "@/components/agent/CoachDock";
import DepthField from "@/components/redesign/DepthField";
import GroundWash from "@/components/redesign/GroundWash";
import CanvasLogo from "./CanvasLogo";
import CanvasSidebar from "./CanvasSidebar";
import CanvasAvatarChip from "./CanvasAvatarChip";

// CanvasShell - the redesign app frame (flag ON only), wrapping the REAL routed
// page in `children`. THE CANVAS chrome (Eli's reframe: the canvas is the design,
// the mockup is colour-only): a non-scrolling h-[100dvh] frame with the top
// utility bar (brand + settings + account) and the left sidebar (toolkit carousel
// + coach dock + account chip), then a scrolling content column. Providers (auth,
// react-query, agent drawer, coach) come from Layout above.
//
// `relative isolate` makes this a stacking context - REQUIRED so the -z-10
// DepthField/GroundWash ground layers paint (see canvas-tokens.md ground spec).
const selectName = (p) => (p ? { full_name: p.full_name } : p);

export default function CanvasShell({ children, revealMode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { data: profileName } = useProfileQuery(user?.id, selectName);

  const account = {
    name: profileName?.full_name || "",
    email: user?.email || "",
    onProfile: () => navigate(createPageUrl("Profile")),
    onSettings: () => navigate(createPageUrl("Settings")),
    onSignOut: () => logout(),
  };

  return (
    <div
      data-private
      className="relative isolate flex h-[100dvh] max-w-[1400px] mx-auto px-4 md:px-6 py-5 flex-col overflow-hidden min-h-0 bg-rd-bg-page font-body text-rd-text"
    >
      <DepthField />
      <GroundWash />
      {!revealMode && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed bottom-2 right-2 z-[60] rounded-sm bg-rd-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white opacity-80 shadow-rd"
        >
          NEXT
        </div>
      )}

      {/* Top utility bar: brand left, actions right (the canvas chrome). */}
      <div className="flex items-center justify-between gap-3 flex-shrink-0">
        <div className="min-w-0">
          <Link
            to={createPageUrl("Home")}
            aria-label="Get A Job home"
            className="inline-flex rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-rd-primary"
          >
            <CanvasLogo size={28} />
          </Link>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Link
            to={createPageUrl("Settings")}
            aria-label="Settings"
            className="inline-flex items-center justify-center w-8 h-8 rounded-full text-rd-text-secondary hover:text-rd-text hover:bg-rd-bg-soft rd-press"
          >
            <Settings className="w-4 h-4" aria-hidden="true" />
          </Link>
          <CanvasAvatarChip compact account={account} />
        </div>
      </div>

      {/* Content row: the canvas sidebar, then the routed page. The <main> is
          transparent so the ground shows through (flag ON only reaches here). It
          scrolls on every size so real pages are never clipped. */}
      <div className="mt-4 flex-1 min-h-0 overflow-hidden flex flex-col md:flex-row gap-4">
        <CanvasSidebar coach={<CoachDock />} account={account} />
        <main className="legacy-body flex-1 min-w-0 min-h-0 overflow-y-auto pb-16 md:pb-0">
          {children}
        </main>
      </div>
    </div>
  );
}
