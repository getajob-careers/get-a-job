import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useAuth } from "@/lib/AuthContext";
import { useProfileQuery } from "@/lib/queries/useProfile";
import CoachDock from "@/components/agent/CoachDock";
import DepthField from "@/components/redesign/DepthField";
import GrainGround from "@/components/redesign/GrainGround";
import CanvasSidebar from "./CanvasSidebar";
import CanvasAvatarChip from "./CanvasAvatarChip";

// CanvasShell - the redesign app frame (flag ON only), wrapping the REAL routed
// page in `children`. The mockup's chrome: a non-scrolling h-[100dvh] frame with
// the left sidebar (brand + profile-strength chip + labeled nav grid + coach card,
// in CanvasSidebar) and a thin top utility bar (the avatar; the greeting is
// home-route content, search stays out until it has a real target), then a
// scrolling content column. Providers (auth, react-query, agent drawer, coach)
// come from Layout above, so routing/auth/data flow unchanged.
//
// `relative isolate` makes this a stacking context - REQUIRED so the -z-10
// DepthField/GrainGround ground layers paint (see canvas-tokens.md ground spec).
const selectName = (p) => (p ? { full_name: p.full_name } : p);

export default function CanvasShell({ children, revealMode, currentPageName }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { data: profileName } = useProfileQuery(user?.id, selectName);
  const name = profileName?.full_name || "";

  const account = {
    name,
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
      <GrainGround />
      {!revealMode && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed bottom-2 right-2 z-[60] rounded-sm bg-rd-coral px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white opacity-80 shadow-rd"
        >
          NEXT
        </div>
      )}

      {/* Thin top utility bar: the account chip, right-aligned. The brand lives in
          the sidebar (mockup); the greeting is the home route's own content. */}
      <div className="flex items-center justify-end gap-1 flex-shrink-0">
        <CanvasAvatarChip compact account={account} />
      </div>

      {/* Content row: the persistent sidebar, then the routed page. The <main> is
          transparent so the ground shows through (flag ON only reaches here). It
          scrolls on every size so real pages are never clipped. */}
      <div className="mt-3 flex-1 min-h-0 overflow-hidden flex flex-col md:flex-row gap-4">
        <CanvasSidebar
          coach={<CoachDock />}
          account={account}
          currentPageName={currentPageName}
          name={name}
          profileStrength={null}
        />
        <main className="legacy-body flex-1 min-w-0 min-h-0 overflow-y-auto pb-16 md:pb-0">
          {children}
        </main>
      </div>
    </div>
  );
}
