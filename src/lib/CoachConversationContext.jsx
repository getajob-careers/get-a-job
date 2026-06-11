// Coach conversation state — lifted from ChatInterface and shared
// between the sidebar dock (CoachDock) and the drawer panel
// (AgentDrawer). One conversation, two views: messages sent from
// either surface appear in the other instantly because both surfaces
// read the same messages array from this provider.
//
// Scoped to the drawer's career_agent surface only. Full-page agents
// (CareerAgent / CVAgent / InterviewCoach / SkillDevelopmentAdvisor)
// continue to use ChatInterface with its internal state — those
// surfaces are independent.
//
// Persistence + send pipeline ported from ChatInterface (the 401-
// refresh-retry, conversation-create-on-first-send, optimistic message
// append, page_context forwarding, suggested-action card state). The
// ai-chat edge function contract is unchanged; this provider just owns
// the client side.

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { CHAT_MODEL } from "@/lib/chatModel";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useAgentDrawer } from "@/lib/AgentDrawerContext";
import { toast } from "sonner";
import { track, EVENTS } from "@/lib/analytics";

const AGENT_NAME = "career_agent";
const TURN_HISTORY_SLICE = 20;

const CoachConversationContext = createContext(null);

function nowMs() { return Date.now(); }

export function CoachConversationProvider({ children }) {
  const { user } = useAuth();
  const { applicationId, pageContext } = useAgentDrawer();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Applied-action state, keyed by message id, so a returned panel/dock
  // re-render shows the "Applied" chip on cards the user already acted on.
  const [appliedSets, setAppliedSets] = useState({
    tasks: {},          // { [msgId]: { [idx]: true } }
    roadmap: {},        // { [msgId]: true }
    applications: {},   // { [msgId]: true }
    companyTargets: {}, // { [msgId]: true }
  });

  // Skip the load-effect once when sendMessage just inserted the row.
  const justCreatedConvoRef = useRef(false);

  // ─── conversation list load ─────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      let q = supabase
        .from("conversations")
        .select("id, title, updated_at, application_id")
        .eq("user_id", user.id)
        .eq("agent", AGENT_NAME)
        .order("updated_at", { ascending: false });
      if (applicationId) q = q.eq("application_id", applicationId);
      else q = q.is("application_id", null);
      const { data, error } = await q;
      if (cancelled) return;
      if (error) { console.error("[coach] load conversations:", error); return; }
      setConversations(data || []);
    })();
    return () => { cancelled = true; };
  }, [user?.id, applicationId]);

  // ─── message load for active conversation ───────────────────────────
  useEffect(() => {
    if (!activeConversationId) { setMessages([]); return; }
    if (justCreatedConvoRef.current) {
      justCreatedConvoRef.current = false;
      return;
    }
    let cancelled = false;
    setLoadingMessages(true);
    (async () => {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("conversation_id", activeConversationId)
        .order("created_at", { ascending: true });
      if (cancelled) return;
      setLoadingMessages(false);
      if (error) { console.error("[coach] load messages:", error); setMessages([]); return; }
      setMessages((data || []).map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        suggestedTasks: Array.isArray(m.suggested_tasks) && m.suggested_tasks.length > 0 ? m.suggested_tasks : null,
        suggestedRoadmapChanges: Array.isArray(m.suggested_roadmap_changes) && m.suggested_roadmap_changes.length > 0 ? m.suggested_roadmap_changes : null,
        suggestedApplicationActions: Array.isArray(m.suggested_application_actions) && m.suggested_application_actions.length > 0 ? m.suggested_application_actions : null,
        suggestedCompanyTargetActions: Array.isArray(m.suggested_company_target_actions) && m.suggested_company_target_actions.length > 0 ? m.suggested_company_target_actions : null,
        suggestedCVGeneration: m.suggested_cv_generation || null,
        suggestedAgent: m.suggested_agent || null,
        isError: m.is_error || false,
        userMessageText: m.original_user_message || null,
      })));
    })();
    return () => { cancelled = true; };
  }, [activeConversationId]);

  // ─── send pipeline ──────────────────────────────────────────────────
  const sendMessage = useCallback(async (overrideText) => {
    const candidate = (typeof overrideText === "string" && overrideText) || input;
    if (!candidate.trim() || sending || !user?.id) return;
    const text = candidate.trim();
    setInput("");

    track(EVENTS.CHAT_MESSAGE_SENT, { agent_name: AGENT_NAME });

    // 1. Ensure conversation row.
    let convoId = activeConversationId;
    if (!convoId) {
      const title = text.slice(0, 60);
      const { data: newConvo, error: createErr } = await supabase
        .from("conversations")
        .insert({
          user_id: user.id,
          agent: AGENT_NAME,
          title,
          ...(applicationId && { application_id: applicationId }),
        })
        .select("id")
        .single();
      if (createErr) {
        console.error("[coach] create conversation:", createErr);
        toast.error("Couldn't start the conversation.");
        return;
      }
      convoId = newConvo.id;
      justCreatedConvoRef.current = true;
      setActiveConversationId(convoId);
      setConversations((prev) => [{ id: convoId, title, updated_at: new Date().toISOString(), application_id: applicationId || null }, ...prev]);
    }

    // 2. Optimistic user message append.
    const userMsg = { id: `pending-user-${nowMs()}`, role: "user", content: text };
    const optimisticMessages = [...messages, userMsg];
    setMessages(optimisticMessages);
    setSending(true);

    // 3. Persist user message.
    const { data: insertedUserMsg } = await supabase.from("chat_messages").insert({
      conversation_id: convoId,
      role: "user",
      content: text,
    }).select("id").single();
    if (insertedUserMsg?.id) {
      setMessages((prev) => prev.map((m) => (m.id === userMsg.id ? { ...m, id: insertedUserMsg.id } : m)));
    }

    // 4. Invoke ai-chat (with optional 401-refresh-retry).
    try {
      const invokeBody = {
        message: text,
        agent: AGENT_NAME,
        conversation_history: optimisticMessages.slice(-TURN_HISTORY_SLICE).filter((m) => m.role !== "system").map((m) => ({ role: m.role, content: m.content })),
        chat_model: CHAT_MODEL,
        ...(applicationId && { application_id: applicationId }),
        ...(pageContext && { page_context: pageContext }),
      };
      let { data, error } = await supabase.functions.invoke("ai-chat", { body: invokeBody });
      if (error?.context?.status === 401) {
        const { error: refreshErr } = await supabase.auth.refreshSession();
        if (!refreshErr) {
          ({ data, error } = await supabase.functions.invoke("ai-chat", { body: invokeBody }));
        }
      }
      if (error) throw error;
      if (!data?.reply) throw new Error("Empty response from the agent.");

      const assistantRow = {
        conversation_id: convoId,
        role: "assistant",
        content: data.reply,
        suggested_tasks: data.suggested_tasks?.length > 0 ? data.suggested_tasks : null,
        suggested_roadmap_changes: data.suggested_roadmap_changes?.length > 0 ? data.suggested_roadmap_changes : null,
        suggested_application_actions: data.suggested_application_actions?.length > 0 ? data.suggested_application_actions : null,
        suggested_company_target_actions: data.suggested_company_target_actions?.length > 0 ? data.suggested_company_target_actions : null,
        suggested_cv_generation: data.suggested_cv_generation || null,
        suggested_agent: data.suggested_agent || null,
      };
      const { data: insertedAssistant } = await supabase.from("chat_messages").insert(assistantRow).select("id").single();
      const assistantMsg = {
        id: insertedAssistant?.id || `assistant-${nowMs()}`,
        role: "assistant",
        content: data.reply,
        suggestedTasks: assistantRow.suggested_tasks,
        suggestedRoadmapChanges: assistantRow.suggested_roadmap_changes,
        suggestedApplicationActions: assistantRow.suggested_application_actions,
        suggestedCompanyTargetActions: assistantRow.suggested_company_target_actions,
        suggestedCVGeneration: assistantRow.suggested_cv_generation,
        suggestedAgent: assistantRow.suggested_agent,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", convoId);
    } catch (err) {
      console.error("[coach] ai-chat error:", err);
      const errorMsg = {
        id: `error-${nowMs()}`,
        role: "assistant",
        content: "Sorry — I couldn't reach your agent. Tap retry to try again.",
        isError: true,
        userMessageText: text,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setSending(false);
    }
  }, [input, sending, user?.id, activeConversationId, messages, applicationId, pageContext]);

  const retryLast = useCallback(async (errorMessageId, userText) => {
    setMessages((prev) => prev.filter((m) => m.id !== errorMessageId));
    await sendMessage(userText);
  }, [sendMessage]);

  const startNewConversation = useCallback(() => {
    setActiveConversationId(null);
    setMessages([]);
    setAppliedSets({ tasks: {}, roadmap: {}, applications: {}, companyTargets: {} });
  }, []);

  // ─── action-applied registration (cards call this on success) ──────
  const markApplied = useCallback((kind, messageId, payload) => {
    setAppliedSets((prev) => ({
      ...prev,
      [kind]: { ...prev[kind], [messageId]: payload === undefined ? true : payload },
    }));
  }, []);

  const value = useMemo(() => ({
    messages,
    // setMessages exposed so the DEV preview harness can seed a
    // canned conversation (e.g. an assistant turn with a suggestedCVGeneration
    // payload) without going through a real ai-chat call. Production
    // surfaces should NEVER call this — the send pipeline owns the
    // append + DB persist contract.
    setMessages,
    input,
    setInput,
    sending,
    activeConversationId,
    setActiveConversationId,
    conversations,
    loadingMessages,
    sendMessage,
    retryLast,
    startNewConversation,
    appliedSets,
    markApplied,
  }), [messages, input, sending, activeConversationId, conversations, loadingMessages, sendMessage, retryLast, startNewConversation, appliedSets, markApplied]);

  return (
    <CoachConversationContext.Provider value={value}>
      {children}
    </CoachConversationContext.Provider>
  );
}

export function useCoachConversation() {
  return useContext(CoachConversationContext);
}
