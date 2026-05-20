import React, { useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ChatInterface from "../components/chat/ChatInterface";
import AgentIntro from "../components/chat/AgentIntro";

const INTERVIEW_COACH_CAPABILITIES = [
  "💬 Generates role-specific interview questions",
  "🧠 Provides STAR-method answer frameworks",
  "🔍 Identifies your weak areas for the role",
  "📋 Creates interview prep tasks in your tracker",
  "🎤 Can do mock interview practice with feedback",
];
const INTERVIEW_COACH_HOW_TO_USE =
  "Tell it the role and company you're interviewing for. Ask for likely questions, or start a mock interview. Be specific — e.g. 'I have a Product Manager interview at Google next week'.";

const SUGGESTED_PROMPTS = [
  "Generate likely interview questions for this role",
  "What competencies will the interviewer test me on?",
  "Run a mock interview with me",
  "What are my weakest areas for this role?",
  "How should I answer 'Tell me about yourself'?",
];

export default function InterviewCoach() {
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
    // an application elsewhere then opened Interview Coach and saw
    // an empty dropdown from a stale TanStack cache.
    refetchOnMount: "always",
  });

  const selectedApp = applications.find((a) => a.id === selectedAppId);
  const title = selectedApp
    ? `Interview Coach — ${selectedApp.role_title}${selectedApp.company ? ` at ${selectedApp.company}` : ""}`
    : "Interview Coach";
  const description = selectedApp
    ? "Coaching tailored to this role, your skill gaps, and your experience."
    : "Select a role above for tailored prep, or ask general interview questions.";

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <AgentIntro
        agentId="interview_coach"
        capabilities={INTERVIEW_COACH_CAPABILITIES}
        howToUse={INTERVIEW_COACH_HOW_TO_USE}
      />
      <div className="px-6 py-3 border-b border-[#E5E5E5] bg-white flex items-center gap-3 shrink-0">
        <span className="text-xs font-medium text-[#525252] shrink-0">Preparing for:</span>
        <Select value={selectedAppId} onValueChange={setSelectedAppId}>
          <SelectTrigger className="h-8 text-xs max-w-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="general">General Interview Prep</SelectItem>
            {applications.map((app) => (
              <SelectItem key={app.id} value={app.id}>
                {app.role_title} at {app.company}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 overflow-hidden">
        {/* key resets messages when the selected role changes */}
        <ChatInterface
          key={selectedAppId}
          agentName="interview_coach"
          title={title}
          description={description}
          applicationId={selectedAppId === "general" ? null : selectedAppId}
          suggestedPrompts={SUGGESTED_PROMPTS}
        />
      </div>
    </div>
  );
}
