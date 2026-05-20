import React, { useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ChatInterface from "../components/chat/ChatInterface";
import AgentIntro from "../components/chat/AgentIntro";

const CAREER_AGENT_CAPABILITIES = [
  "🧭 Maps your qualifications to realistic target roles",
  "🔍 Identifies gaps between where you are and where you want to be",
  "📊 Gives honest confidence scores for each role you're targeting",
  "✅ Updates your tracker, tasks, and profile directly",
  "💡 Suggests next steps based on your actual data — no generic advice",
];
const CAREER_AGENT_HOW_TO_USE =
  "Start by asking it to evaluate your profile or assess your fit for a specific role. Be direct — e.g. 'Am I ready for a Product Manager role?' or 'What should I focus on this week?'";

const GENERAL_PROMPTS = [
  "Am I ready to apply for my Tier 1 roles?",
  "What should I focus on this week?",
  "Which role should I target first and why?",
  "What's my biggest gap blocking a Tier 1 role?",
  "Reassess my roadmap based on my current profile",
];

export default function CareerAgent() {
  const { user } = useAuth();
  const [selectedAppId, setSelectedAppId] = useState("general");

  const { data: applications = [] } = useQuery({
    queryKey: ["applications", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("applications")
        .select("id, role_title, company, status")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    refetchOnMount: "always",
  });

  const selectedApp = applications.find((a) => a.id === selectedAppId);
  const appLabel = selectedApp
    ? `${selectedApp.role_title}${selectedApp.company ? ` at ${selectedApp.company}` : ""}`
    : null;
  const title = selectedApp
    ? `AI Career Agent — ${appLabel}`
    : "AI Career Agent";
  const description = selectedApp
    ? "Career strategy scoped to this specific role and your fit for it."
    : "Honest, data-driven career strategy based on your actual profile and roadmap.";

  const APPLICATION_PROMPTS = [
    "What's my biggest gap for this role?",
    "Should I apply to this role now or wait?",
    "What can I do this week to prepare for this application?",
    "How does my profile compare to what this role requires?",
  ];
  const suggestedPrompts = selectedApp ? APPLICATION_PROMPTS : GENERAL_PROMPTS;

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <AgentIntro
        agentId="career_agent"
        capabilities={CAREER_AGENT_CAPABILITIES}
        howToUse={CAREER_AGENT_HOW_TO_USE}
      />
      <div className="px-6 py-3 border-b border-[#DDDDDB] bg-white flex items-center gap-3 shrink-0">
        <span className="text-xs font-medium text-[#52545A] shrink-0">Context:</span>
        <Select value={selectedAppId} onValueChange={setSelectedAppId}>
          <SelectTrigger className="h-8 text-xs max-w-xs border-[#DDDDDB]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="general">General career strategy</SelectItem>
            {applications.map((app) => (
              <SelectItem key={app.id} value={app.id}>
                {app.role_title}{app.company ? ` at ${app.company}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 overflow-hidden">
        {/* key resets messages when the selected application changes — same
            pattern as CVAgent / InterviewCoach to prevent context bleed. */}
        <ChatInterface
          key={selectedAppId}
          agentName="career_agent"
          title={title}
          description={description}
          applicationId={selectedAppId === "general" ? null : selectedAppId}
          suggestedPrompts={suggestedPrompts}
          introMessage="What would you like to work on?"
        />
      </div>
    </div>
  );
}
