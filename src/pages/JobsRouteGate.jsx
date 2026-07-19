import React from "react";
import { Navigate } from "react-router-dom";
import { isNextDesign } from "@/lib/nextDesign";
import Jobs from "./Jobs";

// /Jobs. Flag ON: redirect to the Browse Jobs tab of the home (/?tab=jobs). Flag
// OFF: the current Jobs page, unchanged.
export default function JobsRouteGate() {
  if (isNextDesign()) return <Navigate to="/?tab=jobs" replace />;
  return <Jobs />;
}
