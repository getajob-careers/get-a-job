import React from "react";
import { Navigate } from "react-router-dom";
import { isNextDesign } from "@/lib/nextDesign";
import Jobs from "./Jobs";

// /Jobs. Flag ON: redirect to the Browse Jobs tab of the authenticated home
// (/Home?tab=jobs - NOT /?tab=jobs, which is the public landing). Flag OFF: the
// current Jobs page, unchanged.
export default function JobsRouteGate() {
  if (isNextDesign()) return <Navigate to="/Home?tab=jobs" replace />;
  return <Jobs />;
}
