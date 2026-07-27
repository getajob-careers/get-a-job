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
  if (isNextDesign()) return <Navigate to={`/Home${search}`} replace />;
  return <CVAgent />;
}
