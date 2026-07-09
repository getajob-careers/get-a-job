import React from "react";
import ChatInterface from "../components/chat/ChatInterface";
import AgentIntro from "../components/chat/AgentIntro";

const SUGGESTED_PROMPTS = [
  "Analyse my skill gaps for my target roles",
  "Build me a 3-month learning plan",
  "What projects would prove my skills to employers?",
  "Which skill should I prioritise first?",
  "Recommend courses to close my biggest gap",
];

const SKILL_ADVISOR_CAPABILITIES = [
  "📊 Analyzes which skills you're missing for target roles",
  "🎓 Recommends specific courses (Coursera, LinkedIn Learning, etc.)",
  "🛠️ Suggests projects to prove your skills to employers",
  "🗺️ Builds a structured learning roadmap with timelines",
  "➕ Adds courses and projects directly to your profile",
];
const SKILL_ADVISOR_HOW_TO_USE =
  "Tell it which role you want to get ready for, or ask it to analyze your skill gaps. You can also ask for a full learning plan - e.g. 'I want to become a Data Analyst in 3 months'.";

export default function SkillDevelopmentAdvisor() {
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <AgentIntro
        agentId="skill_development_agent"
        capabilities={SKILL_ADVISOR_CAPABILITIES}
        howToUse={SKILL_ADVISOR_HOW_TO_USE}
      />
      <ChatInterface
        agentName="skill_development_agent"
        title="Skill Development Advisor"
        description="Gap analysis, learning plans, and project recommendations tailored to your profile."
        suggestedPrompts={SUGGESTED_PROMPTS}
      />
    </div>
  );
}
