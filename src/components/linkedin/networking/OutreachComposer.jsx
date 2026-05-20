import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Loader2, Sparkles, Copy, Check, AlertCircle, ChevronLeft,
  Send, Edit3, RefreshCw, MessageCircleQuestion, CheckCircle2,
  Archive, Pencil, Save, X,
} from "lucide-react";
import { GOAL_LABELS } from "./OutreachConversationsList";

// OutreachComposer — multi-turn conversation coach. Two modes:
//   1. New: pick goal + describe target person → AI generates opener.
//   2. Resume: load by conversation_id → render thread + AI suggestion.
//
// Per Eli's PR #34/35 design decisions:
//   - 1A: goal can be edited mid-conversation (button in header)
//   - 2A: blank "their reply" = follow-up coaching after silence
//   - 3A: list view of past conversations at top of Outreach section
//   - 4A: AI proactively signals goal_complete = good wrap-up point
//   - 5A: editable message bubbles in the thread
//   - 6C: grouped goal picker (job-search / network / closing-the-loop)

const GOAL_GROUPS = [
  {
    label: "Job search",
    goals: [
      { value: "message_recruiter", title: "Message a recruiter", hint: "Highest-reply-rate target (~12%) — direct ask in turn 1 is appropriate" },
      { value: "message_hiring_manager", title: "Message a hiring manager", hint: "Lower reply rate (~6%); learning-conversation framing beats 'are you hiring?'" },
      { value: "ask_for_referral", title: "Ask for a referral", hint: "Strong relationships → direct ask. Dormant relationships → reconnect first, ask in turn 2-3" },
    ],
  },
  {
    label: "Network",
    goals: [
      { value: "message_alumni", title: "Message an alumni", hint: "Reichman alumni — shared affiliation activates social capital; specific ask wanted" },
      { value: "request_informational_interview", title: "Request an informational interview", hint: "20-30 min learning conversation; come with 2-3 specific questions" },
      { value: "reconnect_dormant", title: "Reconnect with a dormant connection", hint: "No ask in turn 1. Pure reconnection; ask comes later if needed" },
    ],
  },
  {
    label: "Closing the loop",
    goals: [
      { value: "thank_you_follow_up", title: "Thank-you / follow-up", hint: "After an interview or call. Specific is the bar — name what stuck with you" },
      { value: "ask_for_recommendation", title: "Ask for a LinkedIn recommendation", hint: "Offer a draft or 3 specific moments — reduce the lift to make 'yes' easy" },
    ],
  },
];

const STATE_META = {
  cold_open: { label: "Cold open", color: "text-[#52545A] bg-[#F4F4F2] border-[#DDDDDB]" },
  warming_up: { label: "Warming up", color: "text-[#B8841C] bg-[#F5E8C9] border-[#E0B850]" },
  rapport_built: { label: "Rapport built", color: "text-blue-700 bg-blue-50 border-blue-200" },
  making_the_ask: { label: "Making the ask", color: "text-purple-700 bg-purple-50 border-purple-200" },
  awaiting_reply: { label: "Awaiting reply", color: "text-[#52545A] bg-[#F4F4F2] border-[#DDDDDB]" },
  goal_complete: { label: "Goal complete", color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
};

export default function OutreachComposer({
  conversationId,
  prefillCompany = null,
  prefillRole = null,
  onBack,
  onChange,
}) {
  // Local conversation state. Prefill (from Practicum's drawer link) seeds
  // target.company + target.role so the user lands at the goal picker with
  // context already filled — goal pick is independent of company/role and
  // still required because we don't know if the contact is a recruiter vs
  // hiring manager vs alumni.
  const [convoId, setConvoId] = useState(conversationId || null);
  const [goal, setGoal] = useState(null);
  const [target, setTarget] = useState({
    name: "",
    role: prefillRole || "",
    company: prefillCompany || "",
    relationship: "",
    mutual_context: "",
  });
  const [thread, setThread] = useState([]);
  const [status, setStatus] = useState("active");

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [suggestion, setSuggestion] = useState(null);
  const [draftText, setDraftText] = useState("");
  const [theirReply, setTheirReply] = useState("");
  const [showGoalEdit, setShowGoalEdit] = useState(false);
  const [editingTurn, setEditingTurn] = useState(null);
  const [editingDraft, setEditingDraft] = useState("");

  const screen = !goal ? "pick_goal" : !convoId ? "describe_target" : "thread";

  useEffect(() => {
    if (!conversationId) return;
    let ignore = false;
    (async () => {
      const { data, error: err } = await supabase
        .from("linkedin_outreach_conversations")
        .select("*")
        .eq("id", conversationId)
        .single();
      if (ignore) return;
      if (err || !data) {
        setError("Couldn't load this conversation.");
        return;
      }
      setConvoId(data.id);
      setGoal(data.goal);
      setTarget(data.target_person || {});
      setThread(Array.isArray(data.message_thread) ? data.message_thread : []);
      setStatus(data.status);
    })();
    return () => { ignore = true; };
  }, [conversationId]);

  const callEdge = async (body) => {
    setGenerating(true);
    setError(null);
    try {
      const { data, error: invokeErr } = await supabase.functions.invoke("generate-linkedin-outreach-message", { body });
      if (invokeErr) {
        const code = invokeErr?.context?.status;
        if (code === 429) throw new Error("Rate limit reached (60/hour). Try again in a bit.");
        if (code === 404) throw new Error("Profile incomplete. Complete onboarding first.");
        throw new Error(invokeErr.message || "Generation failed. Please try again.");
      }
      if (!data?.suggestion?.suggested_text) {
        throw new Error("AI returned an unexpected response. Please try again.");
      }
      setConvoId(data.conversation_id);
      setGoal(data.goal);
      setTarget(data.target_person);
      setThread(data.message_thread || []);
      setStatus(data.status);
      setSuggestion(data.suggestion);
      setDraftText(data.suggestion.suggested_text);
      setTheirReply("");
      onChange?.();
      return data;
    } catch (e) {
      setError(e.message || "Something went wrong.");
      toast.error(e.message || "Generation failed.");
      throw e;
    } finally {
      setGenerating(false);
    }
  };

  const handleStartConversation = async () => {
    if (!goal) return;
    if (!target.name?.trim()) {
      setError("The recipient's name is required.");
      return;
    }
    try {
      await callEdge({
        goal,
        target_person: {
          name: target.name.trim(),
          role: target.role?.trim() || undefined,
          company: target.company?.trim() || undefined,
          relationship: target.relationship?.trim() || undefined,
          mutual_context: target.mutual_context?.trim() || undefined,
        },
      });
    } catch { /* surfaced inline */ }
  };

  const handleAcceptAndSend = async () => {
    if (!convoId || !draftText.trim()) return;
    try {
      await callEdge({ conversation_id: convoId, mark_as_sent: draftText.trim() });
      toast.success("Added to thread. Paste their reply when it arrives.");
    } catch { /* surfaced inline */ }
  };

  const handleSubmitReply = async () => {
    if (!convoId) return;
    try {
      await callEdge({ conversation_id: convoId, new_them_reply: theirReply });
    } catch { /* surfaced inline */ }
  };

  const handleRegenerate = async () => {
    if (!convoId) return;
    try {
      await callEdge({ conversation_id: convoId });
    } catch { /* surfaced inline */ }
  };

  const handleChangeGoal = async (newGoal) => {
    if (!convoId || newGoal === goal) {
      setShowGoalEdit(false);
      return;
    }
    try {
      await callEdge({ conversation_id: convoId, goal: newGoal });
      setShowGoalEdit(false);
    } catch { /* surfaced inline */ }
  };

  const handleSaveTurnEdit = async (turnIndex) => {
    if (!convoId) return;
    const updated = thread.slice();
    if (!updated[turnIndex]) return;
    updated[turnIndex] = { ...updated[turnIndex], text: editingDraft };
    const { error: updateErr } = await supabase
      .from("linkedin_outreach_conversations")
      .update({ message_thread: updated })
      .eq("id", convoId);
    if (updateErr) {
      toast.error("Couldn't save the edit.");
      return;
    }
    setThread(updated);
    setEditingTurn(null);
    setEditingDraft("");
    onChange?.();
  };

  const handleMarkStatus = async (newStatus) => {
    if (!convoId) return;
    const { error: updateErr } = await supabase
      .from("linkedin_outreach_conversations")
      .update({ status: newStatus })
      .eq("id", convoId);
    if (updateErr) {
      toast.error("Couldn't update status.");
      return;
    }
    setStatus(newStatus);
    onChange?.();
    if (newStatus !== "active") onBack?.();
  };

  // === RENDER ===
  return (
    <div className="bg-white border border-[#DDDDDB] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center text-xs text-[#52545A] hover:text-[#0E1014]"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
          )}
          <h3 className="text-sm font-semibold text-[#0E1014]">
            {screen === "pick_goal" ? "Outreach Coach — pick your goal" : (target.name ? `Outreach to ${target.name}` : "New outreach")}
          </h3>
        </div>
        {convoId && status === "active" && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleMarkStatus("completed")}
              className="text-[11px] inline-flex items-center gap-1 text-emerald-700 hover:bg-emerald-50 px-2 py-1 rounded"
              title="Mark as goal-complete"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />Done
            </button>
            <button
              type="button"
              onClick={() => handleMarkStatus("archived")}
              className="text-[11px] inline-flex items-center gap-1 text-[#52545A] hover:bg-[#F4F4F2] px-2 py-1 rounded"
              title="Archive (shelve without completing)"
            >
              <Archive className="w-3.5 h-3.5" />Shelve
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 mb-3">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {screen === "pick_goal" && <GoalPicker onPick={setGoal} />}

      {screen === "describe_target" && (
        <TargetForm
          goal={goal}
          target={target}
          setTarget={setTarget}
          onBack={() => setGoal(null)}
          onSubmit={handleStartConversation}
          generating={generating}
        />
      )}

      {screen === "thread" && (
        <ThreadView
          goal={goal}
          target={target}
          thread={thread}
          status={status}
          suggestion={suggestion}
          draftText={draftText}
          setDraftText={setDraftText}
          theirReply={theirReply}
          setTheirReply={setTheirReply}
          generating={generating}
          editingTurn={editingTurn}
          setEditingTurn={setEditingTurn}
          editingDraft={editingDraft}
          setEditingDraft={setEditingDraft}
          showGoalEdit={showGoalEdit}
          setShowGoalEdit={setShowGoalEdit}
          onChangeGoal={handleChangeGoal}
          onAcceptAndSend={handleAcceptAndSend}
          onSubmitReply={handleSubmitReply}
          onRegenerate={handleRegenerate}
          onSaveTurnEdit={handleSaveTurnEdit}
        />
      )}
    </div>
  );
}

function GoalPicker({ onPick }) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-[#52545A] leading-snug">
        Pick the kind of outreach you're starting. The AI applies a different framework per goal — recruiters get directness, dormant connections get warm reconnection first, referral asks get warm-up coaching when the relationship isn't strong enough.
      </p>
      {GOAL_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="text-[11px] uppercase tracking-wider text-[#9C9DA1] font-medium mb-2">{group.label}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {group.goals.map((g) => (
              <button
                key={g.value}
                type="button"
                onClick={() => onPick(g.value)}
                className="text-left bg-[#F4F4F2] hover:bg-[#E8E8E5] border border-[#DDDDDB] rounded-lg p-3 transition-colors"
              >
                <p className="text-sm font-medium text-[#0E1014] mb-0.5">{g.title}</p>
                <p className="text-[11px] text-[#52545A] leading-snug">{g.hint}</p>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TargetForm({ goal, target, setTarget, onBack, onSubmit, generating }) {
  const goalLabel = GOAL_LABELS[goal];
  const update = (field) => (e) => setTarget({ ...target, [field]: e.target.value });
  return (
    <div className="space-y-3">
      <div className="bg-[#F4F4F2] border border-[#DDDDDB] rounded-lg p-3">
        <p className="text-[11px] uppercase tracking-wider text-[#9C9DA1] font-medium mb-0.5">Goal</p>
        <div className="flex items-center justify-between">
          <p className="text-sm text-[#0E1014] font-medium">{goalLabel}</p>
          <button type="button" onClick={onBack} className="text-[11px] text-[#52545A] hover:text-[#0E1014]">Change</button>
        </div>
      </div>

      <p className="text-xs text-[#52545A] leading-snug">
        Tell the AI about the recipient. The more specific you are about your relationship and any shared context, the better the opener will be — and the less likely the AI is to fabricate.
      </p>

      <div>
        <label className="text-[11px] uppercase tracking-wider text-[#9C9DA1] font-medium block mb-1">
          Their name <span className="text-red-500">*</span>
        </label>
        <Input value={target.name || ""} onChange={update("name")} placeholder="e.g. Maya Levi" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] uppercase tracking-wider text-[#9C9DA1] font-medium block mb-1">
            Their role <span className="text-[#9C9DA1] normal-case font-normal">(optional)</span>
          </label>
          <Input value={target.role || ""} onChange={update("role")} placeholder="e.g. Senior CSM" />
        </div>
        <div>
          <label className="text-[11px] uppercase tracking-wider text-[#9C9DA1] font-medium block mb-1">
            Their company <span className="text-[#9C9DA1] normal-case font-normal">(optional)</span>
          </label>
          <Input value={target.company || ""} onChange={update("company")} placeholder="e.g. Verbit" />
        </div>
      </div>
      <div>
        <label className="text-[11px] uppercase tracking-wider text-[#9C9DA1] font-medium block mb-1">
          Your relationship to them <span className="text-[#9C9DA1] normal-case font-normal">(optional but very useful)</span>
        </label>
        <Input
          value={target.relationship || ""}
          onChange={update("relationship")}
          placeholder='e.g. "alumni from Reichman BBA 2020", "former colleague at Wix", "cold — found via LinkedIn search"'
        />
      </div>
      <div>
        <label className="text-[11px] uppercase tracking-wider text-[#9C9DA1] font-medium block mb-1">
          Mutual context <span className="text-[#9C9DA1] normal-case font-normal">(optional)</span>
        </label>
        <textarea
          value={target.mutual_context || ""}
          onChange={update("mutual_context")}
          rows={3}
          placeholder='Anything specific that grounds the message — shared event, shared course, mutual person, a post of theirs you engaged with. Be specific: "took Prof Lee&apos;s Customer Discovery course together" — not just "we have a connection." Don&apos;t invent things you don&apos;t actually know.'
          className="w-full text-sm border border-[#DDDDDB] rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
        />
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onBack}
          disabled={generating}
          className="text-xs px-3 py-1.5 text-[#52545A] hover:text-[#0E1014] disabled:opacity-60"
        >
          Back
        </button>
        <Button
          onClick={onSubmit}
          disabled={generating || !target.name?.trim()}
          className="bg-[#0E1014] hover:bg-[#F87060] text-sm"
        >
          {generating ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating opener…</>
          ) : (
            <><Sparkles className="w-4 h-4 mr-2" />Generate opening message</>
          )}
        </Button>
      </div>
    </div>
  );
}

function ThreadView({
  goal, target, thread, status, suggestion, draftText, setDraftText,
  theirReply, setTheirReply, generating, editingTurn, setEditingTurn,
  editingDraft, setEditingDraft, showGoalEdit, setShowGoalEdit,
  onChangeGoal, onAcceptAndSend, onSubmitReply, onRegenerate, onSaveTurnEdit,
}) {
  const goalLabel = GOAL_LABELS[goal];
  const stateMeta = suggestion?.conversation_state ? STATE_META[suggestion.conversation_state] : null;
  const lastTurn = thread[thread.length - 1];
  const awaitingReply = lastTurn?.role === "user";

  return (
    <div className="space-y-4">
      <ConversationHeader
        goal={goal}
        goalLabel={goalLabel}
        target={target}
        status={status}
        showGoalEdit={showGoalEdit}
        setShowGoalEdit={setShowGoalEdit}
        onChangeGoal={onChangeGoal}
        generating={generating}
      />

      {thread.length > 0 && (
        <div className="space-y-2 bg-[#F4F4F2] border border-[#DDDDDB] rounded-lg p-3 max-h-[500px] overflow-y-auto">
          {thread.map((msg, i) => (
            <ThreadBubble
              key={i}
              msg={msg}
              index={i}
              editing={editingTurn === i}
              editingDraft={editingDraft}
              setEditingDraft={setEditingDraft}
              onStartEdit={() => { setEditingTurn(i); setEditingDraft(msg.text); }}
              onCancelEdit={() => { setEditingTurn(null); setEditingDraft(""); }}
              onSave={() => onSaveTurnEdit(i)}
            />
          ))}
        </div>
      )}

      {awaitingReply && status === "active" && (
        <ReplyPasteCard
          theirReply={theirReply}
          setTheirReply={setTheirReply}
          onSubmit={onSubmitReply}
          generating={generating}
        />
      )}

      {suggestion && status === "active" && (
        <SuggestionCard
          suggestion={suggestion}
          stateMeta={stateMeta}
          draftText={draftText}
          setDraftText={setDraftText}
          generating={generating}
          onAcceptAndSend={onAcceptAndSend}
          onRegenerate={onRegenerate}
        />
      )}

      {suggestion?.conversation_state === "goal_complete" && status === "active" && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-800 leading-snug">
          <strong>Good wrap-up point.</strong> The AI thinks the goal of this conversation has been achieved. Click "Done" in the header to mark this conversation completed — keeps your active list clean.
        </div>
      )}
    </div>
  );
}

function ConversationHeader({ goal, goalLabel, target, status, showGoalEdit, setShowGoalEdit, onChangeGoal, generating }) {
  return (
    <div className="bg-[#F4F4F2] border border-[#DDDDDB] rounded-lg p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-wider text-[#9C9DA1] font-medium mb-0.5">
            {target.role ? `${target.role}` : ""}
            {target.role && target.company ? " · " : ""}
            {target.company ? target.company : ""}
          </p>
          <p className="text-sm font-semibold text-[#0E1014]">{target.name}</p>
          {target.relationship && (
            <p className="text-[11px] text-[#52545A] italic mt-0.5 leading-snug">"{target.relationship}"</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-[10px] uppercase tracking-wider text-[#9C9DA1] font-medium">
            Status: {status}
          </span>
          <button
            type="button"
            onClick={() => setShowGoalEdit(!showGoalEdit)}
            disabled={generating}
            className="text-[11px] inline-flex items-center gap-1 text-[#52545A] hover:text-[#0E1014] disabled:opacity-60"
          >
            <Edit3 className="w-3 h-3" />
            {goalLabel}
          </button>
        </div>
      </div>
      {showGoalEdit && (
        <div className="mt-3 pt-3 border-t border-[#DDDDDB]">
          <p className="text-[11px] uppercase tracking-wider text-[#9C9DA1] font-medium mb-2">Switch goal mid-thread</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
            {GOAL_GROUPS.flatMap((g) => g.goals).map((g) => (
              <button
                key={g.value}
                type="button"
                onClick={() => onChangeGoal(g.value)}
                disabled={generating || g.value === goal}
                className={`text-left text-[12px] px-2 py-1.5 rounded border ${g.value === goal ? "bg-[#0E1014] text-white border-[#0E1014]" : "bg-white border-[#DDDDDB] hover:bg-[#F4F4F2]"} disabled:opacity-60`}
              >
                {g.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ThreadBubble({ msg, editing, editingDraft, setEditingDraft, onStartEdit, onCancelEdit, onSave }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] ${isUser ? "bg-[#0E1014] text-white" : "bg-white text-[#0E1014] border border-[#DDDDDB]"} rounded-lg p-3`}>
        <div className="flex items-center justify-between gap-2 mb-1">
          <p className={`text-[10px] uppercase tracking-wider font-medium ${isUser ? "text-white/60" : "text-[#9C9DA1]"}`}>
            {isUser ? "You sent" : "They replied"}
          </p>
          {!editing && (
            <button
              type="button"
              onClick={onStartEdit}
              className={`text-[10px] inline-flex items-center gap-0.5 ${isUser ? "text-white/70 hover:text-white" : "text-[#9C9DA1] hover:text-[#0E1014]"}`}
              title="Edit this message"
            >
              <Pencil className="w-3 h-3" />
            </button>
          )}
        </div>
        {editing ? (
          <>
            <textarea
              value={editingDraft}
              onChange={(e) => setEditingDraft(e.target.value)}
              rows={Math.min(8, Math.max(3, Math.ceil(editingDraft.length / 60)))}
              className="w-full text-sm bg-white text-[#0E1014] border border-[#DDDDDB] rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
            />
            <div className="flex justify-end gap-1 mt-1.5">
              <button
                type="button"
                onClick={onCancelEdit}
                className={`text-[11px] inline-flex items-center gap-1 px-2 py-0.5 rounded ${isUser ? "text-white/70 hover:bg-white/10" : "text-[#52545A] hover:bg-[#F4F4F2]"}`}
              >
                <X className="w-3 h-3" />Cancel
              </button>
              <button
                type="button"
                onClick={onSave}
                className={`text-[11px] inline-flex items-center gap-1 px-2 py-0.5 rounded ${isUser ? "bg-white text-[#0E1014]" : "bg-[#0E1014] text-white"}`}
              >
                <Save className="w-3 h-3" />Save
              </button>
            </div>
          </>
        ) : (
          <p className="text-sm whitespace-pre-wrap leading-snug">{msg.text || <span className="italic opacity-60">(silence — no reply yet)</span>}</p>
        )}
      </div>
    </div>
  );
}

function ReplyPasteCard({ theirReply, setTheirReply, onSubmit, generating }) {
  const handleNoReply = () => {
    setTheirReply("");
    setTimeout(onSubmit, 0);
  };
  return (
    <div className="bg-white border border-[#DDDDDB] rounded-lg p-3">
      <p className="text-[11px] uppercase tracking-wider text-[#9C9DA1] font-medium mb-2">Paste their reply</p>
      <textarea
        value={theirReply}
        onChange={(e) => setTheirReply(e.target.value.slice(0, 4000))}
        rows={4}
        placeholder="Paste what they wrote back here. The AI will read the full thread + their reply and coach the next response."
        className="w-full text-sm border border-[#DDDDDB] rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
      />
      <div className="flex justify-between items-center mt-2">
        <button
          type="button"
          onClick={handleNoReply}
          disabled={generating}
          className="text-[11px] text-[#52545A] hover:text-[#0E1014] inline-flex items-center gap-1 disabled:opacity-60"
          title="They haven't replied yet — coach a soft follow-up"
        >
          <MessageCircleQuestion className="w-3.5 h-3.5" />
          They haven't replied — coach a follow-up
        </button>
        <Button
          onClick={onSubmit}
          disabled={generating || !theirReply.trim()}
          className="bg-[#0E1014] hover:bg-[#F87060] text-sm"
        >
          {generating ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Coaching…</>
          ) : (
            <><Send className="w-4 h-4 mr-2" />Coach next response</>
          )}
        </Button>
      </div>
    </div>
  );
}

function SuggestionCard({ suggestion, stateMeta, draftText, setDraftText, generating, onAcceptAndSend, onRegenerate }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(draftText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy. Select the text manually.");
    }
  };

  return (
    <div className="border border-[#0E1014]/30 bg-white rounded-lg p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-[#9C9DA1] font-medium">
            AI suggestion · {turnTypeLabel(suggestion.turn_type)}
          </p>
          {suggestion.angle && (
            <p className="text-[11px] text-[#52545A] italic mt-0.5 leading-snug">{suggestion.angle}</p>
          )}
        </div>
        {stateMeta && (
          <span className={`text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded-full border ${stateMeta.color} flex-shrink-0`}>
            {stateMeta.label}
          </span>
        )}
      </div>

      {suggestion.warm_up_advice && (
        <div className="li-banner li-banner-warning p-3 mb-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-[#B8841C] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[11px] uppercase tracking-wider text-[#6B4E0F] font-medium mb-0.5">Coach's advice</p>
            <p className="text-xs text-[#6B4E0F] leading-snug">{suggestion.warm_up_advice}</p>
          </div>
        </div>
      )}

      <textarea
        value={draftText}
        onChange={(e) => setDraftText(e.target.value)}
        rows={Math.min(12, Math.max(4, Math.ceil((draftText?.length || 100) / 70)))}
        className="w-full text-sm bg-[#F4F4F2] border border-[#DDDDDB] rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
      />
      <CharCount text={draftText} turnType={suggestion.turn_type} />

      {suggestion.warnings?.length > 0 && (
        <div className="mt-3 space-y-1">
          {suggestion.warnings.map((w, i) => (
            <div key={i} className="text-[11px] text-[#B8841C] bg-[#F5E8C9] border border-[#E0B850] rounded px-2 py-1 leading-snug">
              {w}
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end gap-2 mt-3">
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 text-xs font-medium text-[#52545A] hover:text-[#0E1014] px-2 py-1.5"
        >
          {copied ? <><Check className="w-3.5 h-3.5 text-emerald-600" />Copied</> : <><Copy className="w-3.5 h-3.5" />Copy</>}
        </button>
        <button
          type="button"
          onClick={onRegenerate}
          disabled={generating}
          className="inline-flex items-center gap-1 text-xs font-medium text-[#52545A] hover:text-[#0E1014] px-2 py-1.5 disabled:opacity-60"
        >
          <RefreshCw className="w-3.5 h-3.5" />Regenerate
        </button>
        <Button
          onClick={onAcceptAndSend}
          disabled={generating || !draftText.trim()}
          className="bg-[#0E1014] hover:bg-[#F87060] text-sm"
          title="Mark this message as sent (after copying + pasting into LinkedIn)"
        >
          {generating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</> : <><Send className="w-4 h-4 mr-2" />Mark as sent</>}
        </Button>
      </div>
    </div>
  );
}

function CharCount({ text, turnType }) {
  const wordCount = useMemo(() => (text || "").split(/\s+/).filter(Boolean).length, [text]);
  const charCount = (text || "").length;
  const isConnNote = turnType === "connection_request_note";
  const overConnLimit = isConnNote && charCount > 200;
  if (isConnNote) {
    return (
      <p className={`text-[10px] mt-1 text-right ${overConnLimit ? "text-red-600" : "text-[#9C9DA1]"}`}>
        {charCount}/200 chars (connection-request note limit)
      </p>
    );
  }
  const tooShort = wordCount < 30;
  const tooLong = wordCount > 200;
  return (
    <p className={`text-[10px] mt-1 text-right ${tooShort || tooLong ? "text-[#B8841C]" : "text-[#9C9DA1]"}`}>
      {wordCount} words {tooShort ? "(short — consider adding 1 more specific signal)" : tooLong ? "(long — consider tightening)" : ""}
    </p>
  );
}

function turnTypeLabel(t) {
  switch (t) {
    case "opener": return "Opening message";
    case "follow_up_after_silence": return "Follow-up after silence";
    case "next_response": return "Next response";
    case "connection_request_note": return "Connection-request note";
    default: return "Suggestion";
  }
}
