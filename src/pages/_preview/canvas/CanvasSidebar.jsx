// Preview wrapper. The shared shell sidebar now lives at
// src/components/redesign/shell/CanvasSidebar.jsx (single source, wired for the
// production shell with real coach + account). This wrapper injects the FIXTURE
// coach + fixture account so /_preview/home-3tab stays fixture-driven and
// zero-arg <CanvasSidebar /> keeps working.
import React, { useState } from "react";
import { toast } from "sonner";
import ShellSidebar from "@/components/redesign/shell/CanvasSidebar";
import CanvasCoachDock from "./CanvasCoachDock";
import { CANVAS_PROFILE } from "../fixtures/canvasHome";

export default function CanvasSidebar() {
  const [coachExpanded, setCoachExpanded] = useState(false);
  return (
    <ShellSidebar
      name={CANVAS_PROFILE.full_name}
      profileStrength={62}
      onOpenChat={() => setCoachExpanded(true)}
      coach={
        <CanvasCoachDock
          expanded={coachExpanded}
          onExpandedChange={setCoachExpanded}
        />
      }
      account={{
        name: CANVAS_PROFILE.full_name,
        email: CANVAS_PROFILE.email,
        onProfile: () => toast.info("Prototype: open profile."),
        onSettings: () => toast.info("Prototype: open settings."),
        onSignOut: () => toast.info("Prototype: sign out (no-op)."),
      }}
    />
  );
}
