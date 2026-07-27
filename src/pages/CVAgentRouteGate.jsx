import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { isNextDesign } from "@/lib/nextDesign";
import CVAgent from "./CVAgent";

// /CVAgent. Flag ON: the CV bank now lives in Home's CV tab (the coach supersedes
// the standalone CV Agent), so redirect there - PRESERVING the query string so a
// tracker/coach deep-link (?application_id=...) still opens that tailored CV in
// the tab (CVStudioLive reads application_id wherever it is mounted). Flag OFF:
// the live CV editor, unchanged until Flip 2. Mirrors JobsRouteGate.
export default function CVAgentRouteGate() {
  const { search } = useLocation();
  if (isNextDesign()) {
    // Force tab=cv rather than relying on ThreeTabHome's default tab (QA-Breaker
    // P2): a deep-link like ?application_id=X must land the CV bank tab even if
    // the home default ever changes. Matches the established ?tab=cv&application_id
    // convention every other CV deep-link uses.
    const params = new URLSearchParams(search);
    params.set("tab", "cv");
    return <Navigate to={`/Home?${params.toString()}`} replace />;
  }
  return <CVAgent />;
}
