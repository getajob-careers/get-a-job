import React from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare, Briefcase, GraduationCap, Brain } from "lucide-react";
import { createPageUrl } from "@/utils";

// Legacy router page — replaced by the sidebar's "Chat" section (which
// links directly to /CareerAgent, /CVAgent, /InterviewCoach, and
// /SkillDevelopmentAdvisor). This page is no longer in the nav but
// remains routable so any deep links keep resolving. The info panels
// per agent ("What can this agent do?") were cut on 2026-05-20 — users
// now learn each agent by talking to it.

const SUBAGENTS = [
  {
    id: "career_agent",
    page: "CareerAgent",
    title: "AI Career Agent",
    icon: Brain,
    description: "Your main career advisor — analyzes your full profile, maps qualifications to roles, and creates actionable plans.",
  },
  {
    id: "application_cv_success_agent",
    page: "CVAgent",
    title: "CV Agent",
    icon: Briefcase,
    description: "CV tailoring and review. Generates a polished PDF tailored to a specific role and application.",
  },
  {
    id: "interview_coach",
    title: "Interview Coach",
    page: "InterviewCoach",
    icon: MessageSquare,
    description: "Prepares you for interviews with likely questions, answer frameworks, and gap analysis.",
  },
  {
    id: "skill_development_agent",
    title: "Skill Development Advisor",
    page: "SkillDevelopmentAdvisor",
    icon: GraduationCap,
    description: "Analyzes skill gaps, recommends courses, maps skills to projects, and creates learning roadmaps.",
  },
];

export default function Subagents() {
  const navigate = useNavigate();

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-[#0A0A0A]">Specialist Agents</h1>
        <p className="text-sm text-[#A3A3A3] mt-1">
          Specialized tools for specific career tasks. Each agent can update your tracker, tasks, or profile — just ask.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SUBAGENTS.map((agent) => {
          const Icon = agent.icon;
          const isLive = !!agent.page;
          return (
            <div
              key={agent.id}
              onClick={isLive ? () => navigate(createPageUrl(agent.page)) : undefined}
              className={`bg-white rounded-xl border border-[#E5E5E5] p-6 transition-all group ${isLive ? "hover:border-[#D4D4D4] cursor-pointer" : "opacity-60"}`}
            >
              <div className="flex items-start gap-4 w-full text-left">
                <div className={`w-10 h-10 rounded-lg bg-[#F5F5F5] flex items-center justify-center flex-shrink-0 transition-colors ${isLive ? "group-hover:bg-[#0A0A0A]" : ""}`}>
                  <Icon className={`w-5 h-5 text-[#525252] transition-colors ${isLive ? "group-hover:text-white" : ""}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-[#0A0A0A]">{agent.title}</h3>
                    {isLive ? (
                      <span className="text-[10px] font-medium bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Live</span>
                    ) : (
                      <span className="text-[10px] font-medium bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Coming Soon</span>
                    )}
                  </div>
                  <p className="text-xs text-[#A3A3A3] mt-1 leading-relaxed">{agent.description}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}