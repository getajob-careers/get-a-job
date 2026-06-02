// Resources preview harness — DEV-only route at /_preview/resources/:state.
//
// Resources.jsx is purely static (no fetches, no auth gating). The only
// state that needs driving is the accordion's open-index. Post-mount
// DOM action clicks the appropriate guide button to expand it.
//
// Production safety: route registration in App.jsx is gated by
// `import.meta.env.DEV`. Prod /_preview/resources/* falls through to
// AuthenticatedApp → /login.

import React, { useEffect } from "react";
import { useParams } from "react-router-dom";
import Resources from "@/pages/Resources";
import { RESOURCES_FIXTURES } from "./fixtures/resources";

function expandGuide(index) {
  if (index == null) return;
  // Resources.jsx renders an <button> per guide; the Nth button opens
  // the Nth guide. Click the button at the requested index.
  const buttons = Array.from(
    document.querySelectorAll('button[aria-expanded]'),
  );
  const btn = buttons[index];
  if (btn instanceof HTMLElement) btn.click();
}

export default function ResourcesPreview() {
  const { state } = useParams();
  const fixture =
    RESOURCES_FIXTURES[state] || RESOURCES_FIXTURES["resources-default"];

  useEffect(() => {
    const t = setTimeout(() => expandGuide(fixture.openGuideIndex), 300);
    return () => clearTimeout(t);
  }, [fixture]);

  return <Resources />;
}
