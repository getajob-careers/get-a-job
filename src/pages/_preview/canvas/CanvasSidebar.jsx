// Preview wrapper. The shared shell sidebar lives at
// src/components/redesign/shell/CanvasSidebar.jsx (single source; the canvas
// structure - carousel + coach dock + account chip). This wrapper injects the
// FIXTURE coach + fixture account so /_preview/home-3tab stays fixture-driven.
import React from "react";
import { toast } from "sonner";
import ShellSidebar from "@/components/redesign/shell/CanvasSidebar";
import CanvasCoachDock from "./CanvasCoachDock";
import { CANVAS_PROFILE } from "../fixtures/canvasHome";

const account = {
  name: CANVAS_PROFILE.full_name,
  email: CANVAS_PROFILE.email,
  onProfile: () => toast.info("Prototype: open profile."),
  onSettings: () => toast.info("Prototype: open settings."),
  onSignOut: () => toast.info("Prototype: sign out (no-op)."),
};

export default function CanvasSidebar() {
  return <ShellSidebar coach={<CanvasCoachDock />} account={account} />;
}
