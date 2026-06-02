// Chat preview harness — DEV-only route at /_preview/chat/:state.
//
// ChatInterface does direct supabase reads on mount (conversations
// list + chat_messages load), NOT TanStack-wrapped — so we install a
// fetch override that mocks the PostgREST endpoints. Cleanup restores
// the real fetch on unmount.
//
// Two render paths:
//   - default: mount full <ChatInterface> with seeded fetch results
//     for conversations + chat_messages.
//   - subtreeOnly: NOT USED for 3K (story-capture seed handled via
//     a Suggested-Card simulacrum injected directly into the message
//     stream — see fixtures.seedStoryCapture).
//
// Production safety: route registration in App.jsx is gated by
// `import.meta.env.DEV`. Prod /_preview/chat/* falls through to
// AuthenticatedApp → /login.

import React, { useMemo, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext } from "@/lib/AuthContext";
import ChatInterface from "@/components/chat/ChatInterface";
import AgentIntro from "@/components/chat/AgentIntro";
import {
  CHAT_FIXTURES,
  CHAT_FIXTURE_UID,
} from "./fixtures/chat";

function seedCache(qc, fixture) {
  qc.setQueryData(["userProfile", CHAT_FIXTURE_UID], fixture.profile ?? null);
  // useProfileQuery + useExperiencesQuery are used by ChatInterface;
  // pre-seed empty profile + experiences so the page doesn't fan-out.
  qc.setQueryData(["profile", CHAT_FIXTURE_UID], fixture.profile ?? null);
  qc.setQueryData(["experiences", CHAT_FIXTURE_UID], []);
  qc.setQueryData(["applications", CHAT_FIXTURE_UID], [
    { id: "app-fixture-1", role_title: "Product Analyst", company: "Riverside" },
  ]);
}

function installFetchOverride(fixture) {
  const real = window.fetch;
  window.fetch = (input, init) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof Request
          ? input.url
          : String(input || "");

    // PostgREST: conversations list
    if (url.includes("/rest/v1/conversations")) {
      const rows = fixture.conversations ?? [];
      return jsonResponse(rows);
    }

    // PostgREST: chat_messages list
    if (url.includes("/rest/v1/chat_messages")) {
      const rows = fixture.messages ?? [];
      return jsonResponse(rows);
    }

    // PostgREST: profiles
    if (url.includes("/rest/v1/profiles")) {
      return jsonResponse([fixture.profile ?? null]);
    }

    // PostgREST: experiences (used by useExperiencesQuery)
    if (url.includes("/rest/v1/experiences")) {
      return jsonResponse([]);
    }

    // PostgREST: applications
    if (url.includes("/rest/v1/applications")) {
      return jsonResponse([
        { id: "app-fixture-1", role_title: "Product Analyst", company: "Riverside" },
      ]);
    }

    // Edge function: ai-chat (no-op return — fixtures don't send live messages)
    if (url.includes("/functions/v1/ai-chat")) {
      return jsonResponse({ reply: "[harness — no AI call fired]" });
    }

    return real(input, init);
  };
  return () => {
    window.fetch = real;
  };
}

function jsonResponse(body, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    }),
  );
}

// AgentIntro defaults to expanded on first visit. The harness wants
// it expanded regardless, so we wipe the localStorage sentinel that
// would auto-collapse it on later visits.
function resetAgentIntroState() {
  try {
    const keys = ["gaj.agent_intro_visits_career_agent", "gaj.agent_intro_seen_career_agent"];
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* private mode */
  }
}

// Post-mount seed: inject the suggested_story_capture into the
// message that needs it. Looks up the assistant message in the React
// state tree via a global setMessages reference (set by ChatInterface).
// Because messages are React useState, we rely on the fetch-mocked
// chat_messages already populating the list, then we use a custom
// hook-bridge: we patch the rendered DOM. Simpler: skip the harness
// path entirely and render a standalone StorySaveCard inside the
// flow when the fixture requests it. See SeededStoryCapture below.

export default function ChatPreview() {
  const { state } = useParams();
  const fixture =
    CHAT_FIXTURES[state] || CHAT_FIXTURES["chat-empty-intro"];

  const queryClient = useMemo(() => {
    const qc = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: Infinity,
          retry: false,
          refetchOnWindowFocus: false,
          refetchOnMount: false,
        },
      },
    });
    seedCache(qc, fixture);
    return qc;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const cleanupRef = useRef(null);
  useEffect(() => {
    resetAgentIntroState();
    const cleanup = installFetchOverride(fixture);
    cleanupRef.current = cleanup;
    return () => {
      if (typeof cleanupRef.current === "function") cleanupRef.current();
    };
  }, [fixture]);

  const authValue = useMemo(
    () => ({
      user: { id: CHAT_FIXTURE_UID, email: "eli@example.com" },
      isAuthenticated: true,
      isLoadingAuth: false,
      isLoadingPublicSettings: false,
      authError: null,
      appPublicSettings: null,
      logout: () => {},
      navigateToLogin: () => {},
      checkAppState: () => {},
    }),
    [],
  );

  // CareerAgent capabilities + how-to-use — pulled verbatim from the
  // live page for visual fidelity in the intro fixture.
  const careerAgentCapabilities = [
    "Pick the right next move when you're between threads",
    "Talk through a stuck application or interview wobble",
    "Propose roadmap changes when your direction shifts",
    "Set up tasks + applications + internship targets",
  ];
  const careerAgentHowToUse =
    "Tell me what's happening — a concrete moment, a stuck thread, or a question. I'll propose specific actions you can accept or edit.";

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue}>
        <div className="min-h-screen bg-rd-bg-page font-body text-rd-text">
          {/* Wrapper mirrors CareerAgent page chrome (top-bar omitted
              for fixture clarity). Fixed-height container so the
              composer sticks to the bottom inside the screenshot. */}
          <div className="max-w-4xl mx-auto h-screen flex flex-col">
            <AgentIntro
              agentId="career_agent"
              capabilities={careerAgentCapabilities}
              howToUse={careerAgentHowToUse}
            />
            <div className="flex-1 overflow-hidden">
              <ChatInterface
                key={state}
                agentName="career_agent"
                title="Career Agent"
                description="Tell me what you're working on — I'll help you move it forward."
                applicationId={null}
                suggestedPrompts={[
                  "What should I focus on this week?",
                  "Find jobs for me",
                ]}
                introMessage="What would you like to work on?"
              />
            </div>
          </div>
        </div>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}
