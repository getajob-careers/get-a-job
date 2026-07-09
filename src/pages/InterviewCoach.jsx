import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
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
  "Tell it the role and company you're interviewing for. Ask for likely questions, or start a mock interview. Be specific - e.g. 'I have a Product Manager interview at Google next week'.";

const GENERAL_PROMPTS = [
  "Help me prep for a generic Product Manager interview",
  "What's the STAR framework, and when should I use it?",
  "Run a mock interview with me",
  "How should I answer 'Tell me about yourself'?",
  "What competencies do most early-career interviews test?",
];

const APPLICATION_PROMPTS = [
  "Generate likely interview questions for this role",
  "What competencies will the interviewer test me on?",
  "Run a mock interview with me",
  "What are my weakest areas for this role?",
];

export default function InterviewCoach() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedAppId, setSelectedAppId] = useState("general");

  // Picker-only projection — distinct cache key from the Tracker's wide
  // ["applications", uid] query so a narrow projection here doesn't
  // poison the wide cache (Lesson 2026-05-28).
  const { data: applications = [] } = useQuery({
    queryKey: ["applications", user?.id, "picker"],
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

  // Consume ?application_id= from the Tracker step-7 CTA. Validate +
  // strip param so a refresh doesn't keep re-applying it.
  const validIds = useMemo(() => new Set(applications.map((a) => a.id)), [applications]);
  useEffect(() => {
    const appIdParam = searchParams.get("application_id");
    if (!appIdParam) return;
    if (!validIds.size) return;
    if (validIds.has(appIdParam)) setSelectedAppId(appIdParam);
    const next = new URLSearchParams(searchParams);
    next.delete("application_id");
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validIds.size]);

  const selectedApp = applications.find((a) => a.id === selectedAppId);
  const title = selectedApp
    ? `Interview Coach - ${selectedApp.role_title}${selectedApp.company ? ` at ${selectedApp.company}` : ""}`
    : "Interview Coach";
  const description = selectedApp
    ? "Coaching tailored to this role, your skill gaps, and your experience."
    : "Select a role above for tailored prep, or ask general interview questions.";

  const suggestedPrompts = selectedApp ? APPLICATION_PROMPTS : GENERAL_PROMPTS;

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <AgentIntro
        agentId="interview_coach"
        capabilities={INTERVIEW_COACH_CAPABILITIES}
        howToUse={INTERVIEW_COACH_HOW_TO_USE}
      />
      <div className="px-6 py-3 border-b border-[#DDDDDB] bg-white flex items-center gap-3 shrink-0">
        <span className="text-xs font-medium text-[#52545A] shrink-0">Context:</span>
        <Select value={selectedAppId} onValueChange={setSelectedAppId}>
          <SelectTrigger className="h-8 text-xs max-w-xs border-[#DDDDDB]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="general">General interview prep</SelectItem>
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
          suggestedPrompts={suggestedPrompts}
          introMessage="What would you like to work on?"
        />
      </div>
    </div>
  );
}
