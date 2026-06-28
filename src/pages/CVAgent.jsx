// CV Agent — the editable CV studio. Reads the user's application_cvs (master +
// tailored copies), inline-edits with autosave, chat-edits via edit-cv, and
// renders PDFs via render-cv. Replaces the legacy chat-only agent (see git
// history for the ChatInterface version). The dashboard shell (Layout) is
// provided by App.jsx's LayoutWrapper, so this renders the studio directly.

import React from "react";
import CVStudioLive from "@/components/cv-studio/CVStudioLive";

export default function CVAgent() {
  return <CVStudioLive />;
}
