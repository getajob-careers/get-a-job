// Preview wrapper. The shared avatar chip now lives at
// src/components/redesign/shell/CanvasAvatarChip.jsx (single source, prop-driven).
// This wrapper injects the FIXTURE account so the preview's <CanvasAvatarChip />
// keeps showing the fixture profile with prototype-toast menu actions.
import React from "react";
import { toast } from "sonner";
import ShellAvatarChip from "@/components/redesign/shell/CanvasAvatarChip";
import { CANVAS_PROFILE } from "../fixtures/canvasHome";

const account = {
  name: CANVAS_PROFILE.full_name,
  email: CANVAS_PROFILE.email,
  onProfile: () => toast.info("Prototype: open profile."),
  onSettings: () => toast.info("Prototype: open settings."),
  onSignOut: () => toast.info("Prototype: sign out (no-op)."),
};

export default function CanvasAvatarChip(props) {
  return <ShellAvatarChip {...props} account={account} />;
}
