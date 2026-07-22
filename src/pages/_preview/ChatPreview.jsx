// Chat preview harness — DEV-only route at /_preview/chat/:state.
//
// ChatInterface does direct supabase reads on mount (conversations
// list + chat_messages load), NOT TanStack-wrapped — so we install a
// fetch override that mocks the PostgREST endpoints. Cleanup restores
// the real fetch on unmount.
//
// ─── Why the dropdown-click dance ────────────────────────────────
// ChatInterface.jsx:496-498 intentionally does NOT auto-resume the
// most-recent conversation on cold mount ("every fresh agent open
// starts a clean chat"). So even when conversations + chat_messages
// fetches are mocked, activeConversationId stays null and the
// messages-load effect (line 504) bails out with messages.length===0
// → empty intro state.
//
// To wake a fixture's seeded thread we must drive the same DOM path
// a real user would: open the conversation dropdown (Radix
// DropdownMenuTrigger button → aria-haspopup="menu"), then click
// the conversation's DropdownMenuItem (role="menuitem"). That fires
// ChatInterface.selectConversation() → sets activeConversationId →
// the messages-load effect fires → mocked fetch returns rows →
// bubbles + cards render.
//
// ─── subtreeOnly for story-capture ───────────────────────────────
// `suggestedStoryCapture` is the only suggestion field NOT persisted
// to chat_messages (it's an in-memory-only field added during live
// sendMessage at line 708). The messages-load mapping at lines
// 523-535 deliberately omits it. So the fetch-mock path CANNOT
// surface a StorySaveCard.
//
// The story-thread subtree mirrors the 3J-C `subtreeOnly` pattern:
// renders a chat-thread simulacrum using exported components
// (MessageBubble + StorySaveCard) standalone, bypassing
// ChatInterface entirely. The chrome (header + composer) is
// re-implemented inline.
//
// Production safety: route registration in App.jsx is gated by
// `import.meta.env.DEV`. Prod /_preview/chat/* falls through to
// AuthenticatedApp → /login.

import React, { useMemo, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Send, Plus, MessageSquare, ChevronDown } from "lucide-react";
import { AuthContext } from "@/lib/AuthContext";
import ChatInterface from "@/components/chat/ChatInterface";
import AgentIntro from "@/components/chat/AgentIntro";
import MessageBubble from "@/components/chat/MessageBubble";
import StorySaveCard from "@/components/chat/StorySaveCard";
import {
  CHAT_FIXTURES,
  CHAT_FIXTURE_UID,
} from "./fixtures/chat";

function seedCache(qc, fixture) {
  qc.setQueryData(["userProfile", CHAT_FIXTURE_UID], fixture.profile ?? null);
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

    if (url.includes("/rest/v1/conversations")) {
      return jsonResponse(fixture.conversations ?? []);
    }
    if (url.includes("/rest/v1/chat_messages")) {
      return jsonResponse(fixture.messages ?? []);
    }
    if (url.includes("/rest/v1/profiles")) {
      return jsonResponse([fixture.profile ?? null]);
    }
    if (url.includes("/rest/v1/experiences")) {
      return jsonResponse([]);
    }
    if (url.includes("/rest/v1/applications")) {
      return jsonResponse([
        { id: "app-fixture-1", role_title: "Product Analyst", company: "Riverside" },
      ]);
    }
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

function resetAgentIntroState() {
  try {
    const keys = ["gaj.agent_intro_visits_career_agent", "gaj.agent_intro_seen_career_agent"];
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* private mode */
  }
}

// Conversation hydration is driven from the Playwright runner via
// real pointer events (see scripts/preview-chat.mjs). Radix
// DropdownMenuTrigger doesn't reliably open from a synthetic in-page
// .click(); the runner uses page.click() with real pointer event
// dispatch which Radix listens for. Keeping the logic in the runner
// avoids React/Radix event-system mismatch.

// ── Story-thread subtree (chat-multi-turn-story-capture) ──────────
// Mirrors the live ChatInterface chrome (header + scroll area +
// composer) but renders the message stream + StorySaveCard manually
// from seeded fixture data. Used only when fixture.subtreeOnly ===
// "story-thread" because suggestedStoryCapture is in-memory only and
// can't ride through the chat_messages persistence path.
function StoryThreadSubtree({ fixture }) {
  const messages = (fixture.messages || []).map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
  }));
  const seed = fixture.seedStoryCapture;
  const seedAfter = seed?.messageId || messages[messages.length - 1]?.id || null;

  return (
    <div className="flex flex-col h-full bg-rd-bg-page font-body text-rd-text">
      {/* Header — mirrors ChatInterface lines 1396-1446 */}
      <div className="px-6 py-3.5 border-b border-rd-border bg-rd-bg-card flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display font-bold text-[14.5px] text-rd-text leading-tight">
            Career Agent
          </h2>
          <p className="text-[12px] text-rd-text-tertiary leading-snug mt-0.5 max-w-[540px] truncate">
            Tell me what you&apos;re working on — I&apos;ll help you move it forward.
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-md border border-rd-border bg-rd-bg-card px-2.5 py-1.5 text-xs text-rd-text">
          <MessageSquare className="w-3.5 h-3.5" />
          <span className="truncate max-w-[140px]">
            {fixture.conversations?.[0]?.title || "Career conversation"}
          </span>
          <ChevronDown className="w-3.5 h-3.5" />
        </div>
      </div>

      {/* Messages area — mirrors ChatInterface lines 1449-1571 */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        {messages.map((m) => (
          <React.Fragment key={m.id}>
            <MessageBubble message={m} />
            {seedAfter === m.id && seed && (
              <StorySaveCard
                capture={seed.capture}
                experienceLabel={null}
                onExtract={async () => null}
                onSave={async () => true}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Composer — mirrors ChatInterface lines 1574-1608 */}
      <div className="px-6 pt-3.5 pb-[18px] border-t border-rd-border bg-rd-bg-card">
        <div className="flex justify-end mb-2">
          <button className="text-xs text-rd-text-secondary hover:text-rd-text flex items-center gap-1 transition-colors">
            <Plus className="w-3 h-3" /> New chat
          </button>
        </div>
        <div className="flex items-end gap-2">
          <div className="flex-1 px-3.5 py-2.5 rounded-[14px] border border-rd-border bg-rd-bg-card text-rd-text-tertiary font-body text-[14px] min-h-[42px]">
            Message your agent…
          </div>
          <button
            type="button"
            aria-label="Send message"
            className="w-[42px] h-[42px] rounded-full bg-rd-primary text-white border-0 inline-flex items-center justify-center flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

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

  // Conversation hydration handled by the Playwright runner.

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

  const careerAgentCapabilities = [
    "Pick the right next move when you're between threads",
    "Talk through a stuck application or interview wobble",
    "Propose roadmap changes when your direction shifts",
    "Set up tasks + applications + internship targets",
  ];
  const careerAgentHowToUse =
    "Tell me what's happening — a concrete moment, a stuck thread, or a question. I'll propose specific actions you can accept or edit.";

  // Story-thread subtree — bypass ChatInterface entirely.
  if (fixture.subtreeOnly === "story-thread") {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={authValue}>
          <div className="min-h-screen bg-rd-bg-page font-body text-rd-text">
            <div className="max-w-4xl mx-auto h-screen flex flex-col">
              <AgentIntro
                agentId="career_agent"
                capabilities={careerAgentCapabilities}
                howToUse={careerAgentHowToUse}
              />
              <div className="flex-1 overflow-hidden">
                <StoryThreadSubtree fixture={fixture} />
              </div>
            </div>
          </div>
        </AuthContext.Provider>
      </QueryClientProvider>
    );
  }

  // Default: full ChatInterface with post-mount dropdown click.
  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue}>
        <div className="min-h-screen bg-rd-bg-page font-body text-rd-text">
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
