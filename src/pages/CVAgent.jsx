import React, { useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ChatInterface from "../components/chat/ChatInterface";
import AgentIntro from "../components/chat/AgentIntro";

const CV_AGENT_CAPABILITIES = [
  "📄 Generates a tailored CV as a downloadable PDF for any target role",
  "🎯 Scores your fit against the job description and flags major gaps",
  "✍️ Rewrites summaries, bullets, and experience blocks with strong action verbs",
  "🔍 Surfaces missing ATS keywords for the target role",
  "📎 Saves the generated CV onto the linked application in your tracker",
];
const CV_AGENT_HOW_TO_USE =
  "Pick an application at the top of the page, or ask a general CV question. When you say \"generate a CV for <role>\", the agent proposes a confirm card — click Generate CV to produce the PDF.";

const GENERAL_PROMPTS = [
  "Generate a tailored CV for my top Tier 1 role",
  "Rewrite my summary for a Product Manager role",
  "Turn my most recent job into 5 strong CV bullets",
  "What keywords am I missing for a Data Analyst CV?",
];

export default function CVAgent() {
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
    // Fresh fetch every page open — fixes the case where user added
    // an application elsewhere then opened CV Agent and saw an empty
    // dropdown from a stale TanStack cache.
    refetchOnMount: "always",
  });

  const selectedApp = applications.find((a) => a.id === selectedAppId);
  const appLabel = selectedApp
    ? `${selectedApp.role_title}${selectedApp.company ? ` at ${selectedApp.company}` : ""}`
    : null;
  const title = selectedApp
    ? `CV Agent — ${appLabel}`
    : "CV Agent";
  const description = selectedApp
    ? "CV tailoring scoped to this application's role and job description."
    : "Pick an application above to anchor the CV, or ask general CV questions.";

  // Empty-state greeting — keep it minimal; the chips below carry the verbs.
  // When a specific application is selected, mention it so the user knows
  // the agent is anchored. Otherwise: same generic invitation as the other
  // app-aware agents.
  const introMessage = selectedApp
    ? `Tailoring for ${appLabel}. What would you like to do?`
    : "What would you like to work on?";
  const suggestedPrompts = selectedApp
    ? [
        "Generate a tailored CV for this role",
        "What should I emphasise for this role?",
        "Rewrite my summary for this role",
        "Which of my bullets matter most here?",
      ]
    : GENERAL_PROMPTS;

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <AgentIntro
        agentId="cv_agent"
        capabilities={CV_AGENT_CAPABILITIES}
        howToUse={CV_AGENT_HOW_TO_USE}
      />
      <div className="px-6 py-3 border-b border-[#DDDDDB] bg-white flex items-center gap-3 shrink-0">
        <span className="text-xs font-medium text-[#52545A] shrink-0">Context:</span>
        <Select value={selectedAppId} onValueChange={setSelectedAppId}>
          <SelectTrigger className="h-8 text-xs max-w-xs border-[#DDDDDB]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="general">General CV help</SelectItem>
            {applications.map((app) => (
              <SelectItem key={app.id} value={app.id}>
                {app.role_title}{app.company ? ` at ${app.company}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 overflow-hidden">
        {/* key resets messages when the selected application changes */}
        <ChatInterface
          key={selectedAppId}
          agentName="application_cv_success_agent"
          title={title}
          description={description}
          applicationId={selectedAppId === "general" ? null : selectedAppId}
          suggestedPrompts={suggestedPrompts}
          introMessage={introMessage}
        />
      </div>
    </div>
  );
}
