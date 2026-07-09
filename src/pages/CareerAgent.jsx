import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
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
  "💡 Suggests next steps based on your actual data - no generic advice",
];
const CAREER_AGENT_HOW_TO_USE =
  "Start by asking it to evaluate your profile or assess your fit for a specific role. Be direct - e.g. 'Am I ready for a Product Manager role?' or 'What should I focus on this week?'";

const GENERAL_PROMPTS = [
  "Am I ready to apply for my Track 1 roles?",
  "What should I focus on this week?",
  "Which role should I target first and why?",
  "What's my biggest gap blocking a Track 1 role?",
  "Reassess my roadmap based on my current profile",
];

export default function CareerAgent() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedAppId, setSelectedAppId] = useState("general");
  // ?seed=… seeds the suggested prompts pane so the Tracker step-CTA's
  // suggested first question appears at the top. We don't auto-send;
  // student opts in by clicking the chip — same UX as the static
  // suggestedPrompts list.
  const [seedPrompt, setSeedPrompt] = useState(null);

  // Picker-only projection — distinct cache key from the Tracker's wide
  // ["applications", uid] query. Reusing the same key with a narrow
  // select() poisons the wide cache for 5min (default staleTime), which
  // wipes job_description and other tab-only fields on the next Tracker
  // open. Lesson 2026-05-28 — no narrow-projection cache poisoning.
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
    refetchOnMount: "always",
  });

  // Consume ?application_id=…&seed=… from the Tracker step-CTAs.
  // Validate the id against the user's own applications (avoid setting
  // a stranger's id from a stale link). Strip params after capture so
  // a refresh doesn't keep re-applying the seed prompt.
  const validIds = useMemo(() => new Set(applications.map((a) => a.id)), [applications]);
  useEffect(() => {
    const appIdParam = searchParams.get("application_id");
    const seedParam = searchParams.get("seed");
    if (!appIdParam && !seedParam) return;
    // Wait for applications list to load before validating the id.
    if (appIdParam && !validIds.size) return;
    if (appIdParam && validIds.has(appIdParam)) setSelectedAppId(appIdParam);
    if (seedParam) setSeedPrompt(seedParam);
    const next = new URLSearchParams(searchParams);
    next.delete("application_id");
    next.delete("seed");
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validIds.size]);

  const selectedApp = applications.find((a) => a.id === selectedAppId);
  const appLabel = selectedApp
    ? `${selectedApp.role_title}${selectedApp.company ? ` at ${selectedApp.company}` : ""}`
    : null;
  const title = selectedApp
    ? `AI Career Agent - ${appLabel}`
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
  // If a seed prompt arrived via ?seed=, surface it as the FIRST suggested
  // prompt for one easy click. Falls through to the standard prompt set
  // after the seed is dismissed (clicking it sends, which clears it).
  const baseSuggested = selectedApp ? APPLICATION_PROMPTS : GENERAL_PROMPTS;
  const suggestedPrompts = seedPrompt
    ? [seedPrompt, ...baseSuggested.filter((p) => p !== seedPrompt)]
    : baseSuggested;

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
