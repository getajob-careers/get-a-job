import React from "react";
import { Navigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

// Legacy router page - the four specialist agents now live in the sidebar's
// "Chat" section (/CareerAgent, /CVAgent, /InterviewCoach,
// /SkillDevelopmentAdvisor). The standalone hub was retired; the route stays
// registered and redirects so any deep links keep resolving.

export default function Subagents() {
  return <Navigate to={createPageUrl("CareerAgent")} replace />;
}
