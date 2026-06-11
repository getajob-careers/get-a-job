import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Loader2, Sparkles, Copy, Check, AlertCircle, ChevronLeft,
  Send, Edit3, RefreshCw, MessageCircleQuestion, CheckCircle2,
  Archive, Pencil, Save, X, ShieldCheck,
} from "lucide-react";
import { GOAL_LABELS } from "./OutreachConversationsList";

// PR 3J-C — restyled to match
// docs/design/redesign/getajob_linkedin_networking_outreach.html.
// The "Your agent drafted a reply" suggestion card is the showpiece.
//
// Restyle-only on behavior. All five P10 body shapes preserved
// byte-for-byte through callEdge:
//   - new:           { goal, target_person }
//   - mark_as_sent:  { conversation_id, mark_as_sent: draftText }
//   - new_them_reply:{ conversation_id, new_them_reply: theirReply }
//   - change_goal:   { conversation_id, goal: newGoal }
//   - regenerate:    { conversation_id }
//
// P12 handleSaveTurnEdit (linkedin_outreach_conversations.UPDATE
// message_thread .eq("id", convoId)) and P13 handleMarkStatus
// (UPDATE status) preserved byte-for-byte.
//
// Q4 ruling: warm_up_advice = "Coach's advice" CORRECTIVE WARNING
// banner — load-bearing per the edge-fn spec (fires only when the
// user is pushing for an ask their thread state isn't ready for).
// Restyled to rd-golden WARNING tokens IN PLACE; salience preserved.
// Mockup's "Why this works:" affirmative-rationale line dropped — no
// honest field backs it.
//
// Q5 ruling: affirmative anti-pattern-PASS state is client-derived
// from `warnings.length === 0`. Honest generic affirmation only —
// "No anti-pattern flags raised". No fabricated specifics (e.g. "Soft
// ask, no pressure" or "Reads natural — no filler phrases") because
// they're not backed by checks the edge fn actually ran.
//
// Mockup-fidelity bubble radii (PR-level annotation per Q9):
//   - User bubble: rounded-tl-[14px] rounded-tr-[14px] rounded-br-[4px]
//                  rounded-bl-[14px]  (sharp bottom-right corner)
//   - Them bubble: rounded-tl-[14px] rounded-tr-[14px] rounded-br-[14px]
//                  rounded-bl-[4px]   (sharp bottom-left corner)
//   - User bg dark #211D18, white text; them bg warm #F3ECE0, dark text.

const RD_INPUT_CLS = "border-rd-border rounded-[10px] bg-rd-bg-card text-rd-text text-[13.5px] placeholder:text-rd-text-tertiary focus-visible:border-rd-coral focus-visible:ring-0 focus-visible:shadow-[0_0_0_3px_var(--rd-coral-tint)]";
const RD_TEXTAREA_CLS = "w-full text-[13.5px] border border-rd-border rounded-[10px] px-3 py-2 bg-rd-bg-card text-rd-text placeholder:text-rd-text-tertiary focus:outline-none focus:border-rd-coral focus:shadow-[0_0_0_3px_var(--rd-coral-tint)]";
const RD_BTN_PRIMARY = "inline-flex items-center justify-center gap-1.5 font-display font-bold text-[13px] text-white bg-rd-coral hover:bg-rd-coral-dark disabled:opacity-50 disabled:cursor-not-allowed rounded-full px-4 py-2.5 transition-colors";
const RD_BTN_SOFT_PILL = "inline-flex items-center gap-1.5 font-display font-semibold text-[12.5px] rounded-full px-3 py-[7px] bg-rd-bg-soft text-rd-text-secondary hover:bg-rd-border hover:text-rd-text transition-colors";

const GOAL_GROUPS = [
  {
    label: "Internship",
    goals: [
      { value: "propose_internship", title: "Propose an internship", hint: "For an UNPOSTED internship in a target function. Value-forward proposal to the function lead, not 'are you hiring?'" },
    ],
  },
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
      { value: "message_alumni", title: "Message an alumni", hint: "Shared school affiliation activates social capital; specific ask wanted" },
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

// Conversation-state pill tones — mapped to rd tokens. Exported so
// the DEV preview harness can render SuggestionCard standalone with
// the right state-chip tone.
export const STATE_META = {
  cold_open:       { label: "Cold open",       chip: "bg-rd-bg-soft text-rd-text-tertiary border-rd-border" },
  warming_up:      { label: "Warming up",      chip: "bg-rd-golden-tint text-rd-golden-dark border-rd-golden/40" },
  rapport_built:   { label: "Rapport built",   chip: "bg-rd-teal-tint text-rd-teal-dark border-rd-teal/30" },
  making_the_ask:  { label: "Making the ask",  chip: "bg-rd-coral-tint text-rd-coral-dark border-rd-coral/30" },
  awaiting_reply:  { label: "Awaiting reply",  chip: "bg-rd-bg-soft text-rd-text-tertiary border-rd-border" },
  goal_complete:   { label: "Goal complete",   chip: "bg-rd-teal-tint text-rd-teal-dark border-rd-teal/30" },
};

export default function OutreachComposer({
  conversationId,
  prefillCompany = null,
  prefillFunction = null,
  prefillContact = null,
  prefillRole = null,
  prefillGoal = null,
  onBack,
  onChange,
}) {
  // Two distinct deep-link prefill flows arrive here today:
  //
  // 1. /Internship drawer (P14, goal=propose_internship): seeds target.role
  //    with prefillContact (the function leader's contact role) +
  //    target.relationship with the function name. target.company from
  //    the company card.
  //
  // 2. /Career?pipeline=open application-detail step-5 CTA
  //    (goal=ask_for_referral): seeds target.role with prefillRole =
  //    applications.role_title (the role the user is asking to be referred
  //    FOR). target.company from applications.company. Originally launched
  //    from /Tracker before the seamless-IA Tracker-absorption rolls
  //    (PR-A1+A2) moved the surface into Career.
  //
  // prefillContact and prefillRole are mutually-exclusive in practice
  // today; if both arrive, prefillContact wins (it's the older flow's
  // contract).
  const [convoId, setConvoId] = useState(conversationId || null);
  const [goal, setGoal] = useState(prefillGoal || null);
  const [target, setTarget] = useState({
    name: "",
    role: prefillContact || prefillRole || "",
    company: prefillCompany || "",
    relationship: prefillFunction ? `Proposing a ${prefillFunction} internship` : "",
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

  // P12 — manual turn edit. UPDATE message_thread on the row.
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

  // P13 — status change.
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

  return (
    <div className="bg-white border border-rd-border rounded-[18px] p-5 sm:p-6 shadow-rd">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1 text-[12px] text-rd-text-secondary hover:text-rd-text"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
          )}
          <h3 className="font-display font-bold text-[14px] text-rd-text">
            {screen === "pick_goal" ? "Outreach Coach — pick your goal" : (target.name ? `Outreach to ${target.name}` : "New outreach")}
          </h3>
        </div>
        {convoId && status === "active" && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleMarkStatus("completed")}
              data-action="mark-done"
              className="text-[11.5px] inline-flex items-center gap-1 text-rd-teal-dark hover:bg-rd-teal-tint px-2 py-1 rounded-full"
              title="Mark as goal-complete"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />Done
            </button>
            <button
              type="button"
              onClick={() => handleMarkStatus("archived")}
              data-action="mark-archived"
              className="text-[11.5px] inline-flex items-center gap-1 text-rd-text-secondary hover:bg-rd-bg-soft px-2 py-1 rounded-full"
              title="Archive (shelve without completing)"
            >
              <Archive className="w-3.5 h-3.5" />Shelve
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="px-3 py-2.5 rounded-[10px] bg-rd-coral-tint border border-rd-coral/30 text-[12.5px] text-rd-coral-dark flex items-start gap-2 mb-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
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
      <p className="text-[12px] text-rd-text-secondary leading-snug">
        Pick the kind of outreach you&apos;re starting. The AI applies a different framework per goal — recruiters get directness, dormant connections get warm reconnection first, referral asks get warm-up coaching when the relationship isn&apos;t strong enough.
      </p>
      {GOAL_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="text-[10.5px] uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow font-mono mb-2">{group.label}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {group.goals.map((g) => (
              <button
                key={g.value}
                type="button"
                onClick={() => onPick(g.value)}
                data-goal={g.value}
                className="text-left bg-rd-bg-soft hover:bg-rd-border border border-rd-border rounded-[14px] p-3 transition-colors"
              >
                <p className="font-display font-bold text-[13.5px] text-rd-text mb-0.5">{g.title}</p>
                <p className="text-[11px] text-rd-text-secondary leading-snug">{g.hint}</p>
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
      <div className="bg-rd-bg-soft border border-rd-border rounded-[14px] p-3">
        <p className="text-[10.5px] uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow font-mono mb-0.5">Goal</p>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="font-display font-bold text-[13.5px] text-rd-text">{goalLabel}</p>
          <button type="button" onClick={onBack} className="text-[11.5px] text-rd-text-secondary hover:text-rd-text">Change</button>
        </div>
      </div>

      <p className="text-[12px] text-rd-text-secondary leading-snug">
        Tell the AI about the recipient. The more specific you are about your relationship and any shared context, the better the opener will be — and the less likely the AI is to fabricate.
      </p>

      <div>
        <label className="block text-[11px] font-display font-semibold text-rd-text mb-1">
          Their name <span className="text-rd-coral">*</span>
        </label>
        <Input value={target.name || ""} onChange={update("name")} placeholder="e.g. Maya Levi" className={RD_INPUT_CLS} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-display font-semibold text-rd-text mb-1">
            Their role <span className="text-rd-text-tertiary font-normal normal-case tracking-normal">(optional)</span>
          </label>
          <Input value={target.role || ""} onChange={update("role")} placeholder="e.g. Senior CSM" className={RD_INPUT_CLS} />
        </div>
        <div>
          <label className="block text-[11px] font-display font-semibold text-rd-text mb-1">
            Their company <span className="text-rd-text-tertiary font-normal normal-case tracking-normal">(optional)</span>
          </label>
          <Input value={target.company || ""} onChange={update("company")} placeholder="e.g. Verbit" className={RD_INPUT_CLS} />
        </div>
      </div>
      <div>
        <label className="block text-[11px] font-display font-semibold text-rd-text mb-1">
          Your relationship to them <span className="text-rd-text-tertiary font-normal normal-case tracking-normal">(optional but very useful)</span>
        </label>
        <Input
          value={target.relationship || ""}
          onChange={update("relationship")}
          placeholder='e.g. "alumni from my undergrad program", "former colleague", "cold — found via LinkedIn search"'
          className={RD_INPUT_CLS}
        />
      </div>
      <div>
        <label className="block text-[11px] font-display font-semibold text-rd-text mb-1">
          Mutual context <span className="text-rd-text-tertiary font-normal normal-case tracking-normal">(optional)</span>
        </label>
        <textarea
          value={target.mutual_context || ""}
          onChange={update("mutual_context")}
          rows={3}
          placeholder='Anything specific that grounds the message — shared event, shared course, mutual person, a post of theirs you engaged with. Be specific: "took Prof Lee&apos;s Customer Discovery course together" — not just "we have a connection." Don&apos;t invent things you don&apos;t actually know.'
          className={RD_TEXTAREA_CLS}
        />
      </div>

      <div className="flex justify-end gap-2 pt-1 items-center flex-wrap">
        <button
          type="button"
          onClick={onBack}
          disabled={generating}
          className="text-[12px] px-3 py-1.5 text-rd-text-secondary hover:text-rd-text disabled:opacity-60 rounded-full"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={generating || !target.name?.trim()}
          data-action="generate-opener"
          className={RD_BTN_PRIMARY}
        >
          {generating ? (
            <><Loader2 className="w-4 h-4 animate-spin" />Generating opener…</>
          ) : (
            <><Sparkles className="w-4 h-4" />Generate opening message</>
          )}
        </button>
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
        <div className="space-y-2.5 bg-rd-bg-soft border border-rd-border rounded-[14px] p-3 max-h-[500px] overflow-y-auto">
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
          target={target}
        />
      )}

      {suggestion?.conversation_state === "goal_complete" && status === "active" && (
        <div className="rounded-[14px] px-4 py-3 bg-rd-teal-tint border border-rd-teal/30 text-[12px] text-rd-teal-dark leading-snug">
          <strong className="font-display font-bold">Good wrap-up point.</strong> The AI thinks the goal of this conversation has been achieved. Click &quot;Done&quot; in the header to mark this conversation completed — keeps your active list clean.
        </div>
      )}
    </div>
  );
}

export function ConversationHeader({ goal, goalLabel, target, status, showGoalEdit, setShowGoalEdit, onChangeGoal, generating }) {
  // Avatar circle initial from target name (mockup-fidelity teal-tint
  // mini-avatar at left of the person-card).
  const targetInitial = (target.name || "?").trim().charAt(0).toUpperCase() || "?";
  return (
    <div className="bg-rd-bg-soft border border-rd-border rounded-[14px] p-3">
      <div className="flex items-center gap-3 flex-wrap">
        {/* Goal coral-tint pill per mockup */}
        <button
          type="button"
          onClick={() => setShowGoalEdit(!showGoalEdit)}
          disabled={generating}
          data-action="edit-goal"
          className="inline-flex items-center gap-1.5 font-display font-semibold text-[12.5px] rounded-full px-3 py-[7px] bg-rd-coral-tint text-rd-coral-dark hover:bg-rd-coral-tint/80 disabled:opacity-60 transition-colors"
        >
          <Edit3 className="w-3 h-3" />
          Goal · {goalLabel}
        </button>

        {/* Target person mini-card with teal avatar */}
        <div className="flex items-center gap-2">
          <div className="w-[30px] h-[30px] rounded-full bg-rd-teal-tint flex items-center justify-center">
            <span className="font-display text-[13px] font-bold text-rd-teal-dark">{targetInitial}</span>
          </div>
          <div className="min-w-0">
            <div className="font-display font-bold text-[13px] text-rd-text leading-[1.1]">{target.name || "(no name)"}</div>
            <div className="text-[10.5px] text-rd-text-tertiary">
              {target.role || ""}
              {target.role && target.company ? " · " : ""}
              {target.company || ""}
            </div>
          </div>
        </div>

        <div className="flex-1" />
        <span className="text-[10px] uppercase tracking-[0.06em] font-mono font-semibold text-rd-text-tertiary">
          {status}
        </span>
      </div>

      {target.relationship && (
        <p className="text-[11px] text-rd-text-secondary italic mt-2 leading-snug">&quot;{target.relationship}&quot;</p>
      )}

      {showGoalEdit && (
        <div className="mt-3 pt-3 border-t border-rd-border">
          <p className="text-[10.5px] uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow font-mono mb-2">Switch goal mid-thread</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
            {GOAL_GROUPS.flatMap((g) => g.goals).map((g) => (
              <button
                key={g.value}
                type="button"
                onClick={() => onChangeGoal(g.value)}
                disabled={generating || g.value === goal}
                className={`text-left text-[12px] px-2 py-1.5 rounded-[10px] border ${g.value === goal ? "bg-rd-text text-white border-rd-text" : "bg-white border-rd-border hover:bg-rd-bg-soft"} disabled:opacity-60 transition-colors`}
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

export function ThreadBubble({ msg, editing, editingDraft, setEditingDraft, onStartEdit, onCancelEdit, onSave }) {
  // Mockup-fidelity radius asymmetry (Q9):
  //   User bubble  → rounded-tl-[14px] rounded-tr-[14px] rounded-br-[4px] rounded-bl-[14px]
  //   Them bubble  → rounded-tl-[14px] rounded-tr-[14px] rounded-br-[14px] rounded-bl-[4px]
  const isUser = msg.role === "user";
  const ts = msg.ts ? formatTurnTs(msg.ts) : "";
  return (
    <div className={`flex gap-2 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="w-[26px] h-[26px] rounded-full bg-rd-teal-tint flex items-center justify-center flex-shrink-0 mt-[2px]">
          <span className="font-display text-[11px] font-bold text-rd-teal-dark">{(msg.name || "?").trim().charAt(0).toUpperCase() || "?"}</span>
        </div>
      )}
      <div
        className={[
          "max-w-[80%] px-3 py-2.5 text-[12.5px] leading-[1.5]",
          isUser
            ? "bg-[#211D18] text-white rounded-tl-[14px] rounded-tr-[14px] rounded-br-[4px] rounded-bl-[14px]"
            : "bg-[#F3ECE0] text-rd-text rounded-tl-[14px] rounded-tr-[14px] rounded-br-[14px] rounded-bl-[4px]",
        ].join(" ")}
      >
        <div className="flex items-center justify-between gap-2 mb-1">
          <p className={`text-[10px] uppercase tracking-[0.06em] font-mono font-semibold ${isUser ? "text-white/60" : "text-rd-text-tertiary"}`}>
            {isUser ? "You sent" : "They replied"}
          </p>
          {!editing && (
            <button
              type="button"
              onClick={onStartEdit}
              className={`text-[10px] inline-flex items-center gap-0.5 ${isUser ? "text-white/70 hover:text-white" : "text-rd-text-tertiary hover:text-rd-text"}`}
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
              className="w-full text-[13px] bg-white text-rd-text border border-rd-border rounded-[8px] px-2 py-1.5 focus:outline-none focus:border-rd-coral focus:shadow-[0_0_0_3px_var(--rd-coral-tint)]"
            />
            <div className="flex justify-end gap-1 mt-1.5">
              <button
                type="button"
                onClick={onCancelEdit}
                className={`text-[11px] inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${isUser ? "text-white/70 hover:bg-white/10" : "text-rd-text-secondary hover:bg-rd-bg-soft"}`}
              >
                <X className="w-3 h-3" />Cancel
              </button>
              <button
                type="button"
                onClick={onSave}
                className={`text-[11px] inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${isUser ? "bg-white text-rd-text" : "bg-rd-text text-white"}`}
              >
                <Save className="w-3 h-3" />Save
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="whitespace-pre-wrap">{msg.text || <span className="italic opacity-60">(silence — no reply yet)</span>}</p>
            {isUser && ts && (
              <p className="text-[9.5px] text-white/60 mt-1.5 text-right">Sent · {ts}</p>
            )}
          </>
        )}
      </div>
      {isUser && (
        <div className="w-[26px] flex-shrink-0" aria-hidden="true" />
      )}
    </div>
  );
}

function formatTurnTs(ts) {
  try {
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString(undefined, { weekday: "short" });
  } catch {
    return "";
  }
}

function ReplyPasteCard({ theirReply, setTheirReply, onSubmit, generating }) {
  const handleNoReply = () => {
    setTheirReply("");
    setTimeout(onSubmit, 0);
  };
  return (
    <div className="bg-white border border-rd-border rounded-[14px] p-3">
      <p className="text-[10.5px] uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow font-mono mb-2">Paste their reply</p>
      <textarea
        value={theirReply}
        onChange={(e) => setTheirReply(e.target.value.slice(0, 4000))}
        rows={4}
        placeholder="Paste what they wrote back here. The AI will read the full thread + their reply and coach the next response."
        className={RD_TEXTAREA_CLS}
      />
      <div className="flex justify-between items-center mt-2 flex-wrap gap-2">
        <button
          type="button"
          onClick={handleNoReply}
          disabled={generating}
          className="text-[11.5px] text-rd-text-secondary hover:text-rd-text inline-flex items-center gap-1 disabled:opacity-60"
          title="They haven't replied yet — coach a soft follow-up"
        >
          <MessageCircleQuestion className="w-3.5 h-3.5" />
          They haven&apos;t replied — coach a follow-up
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={generating || !theirReply.trim()}
          data-action="coach-next"
          className={RD_BTN_PRIMARY}
        >
          {generating ? (
            <><Loader2 className="w-4 h-4 animate-spin" />Coaching…</>
          ) : (
            <><Send className="w-4 h-4" />Coach next response</>
          )}
        </button>
      </div>
    </div>
  );
}

// SuggestionCard — THE SHOWPIECE. Mockup-fidelity surface:
//   - Coral Sparkles icon + "Your agent drafted a reply" slab heading
//   - Suggestion text in a soft warm box (#FBF7F1 bg, #EFE7DA border)
//   - Q5 honest anti-pattern affirmation when warnings.length === 0
//   - Q4 warm_up_advice CORRECTIVE WARNING banner (preserved salience)
//   - Edit (soft) + Use this message (coral) action row
export function SuggestionCard({ suggestion, stateMeta, draftText, setDraftText, generating, onAcceptAndSend, onRegenerate, target }) {
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(draftText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy. Select the text manually.");
    }
  };

  const targetInitial = (target?.name || "?").trim().charAt(0).toUpperCase() || "?";
  const hasWarnings = Array.isArray(suggestion.warnings) && suggestion.warnings.length > 0;
  const hasWarmUp = !!suggestion.warm_up_advice;
  // Q5: client-derived affirmative state when no warnings AND no warm-
  // up advice (i.e. the edge fn's anti-pattern checks all passed).
  // Honest generic affirmation only — no fabricated specific claims.
  const showAffirmative = !hasWarnings && !hasWarmUp;

  return (
    <div className="bg-white border border-rd-border rounded-[16px] p-4 shadow-rd">
      {/* Heading — coral sparkles + slab title */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <Sparkles className="w-4 h-4 text-rd-coral" />
        <span className="font-display font-bold text-[14px] text-rd-text">Your agent drafted a reply</span>
        <div className="flex-1" />
        {stateMeta && (
          <span className={`text-[10px] uppercase tracking-[0.06em] font-mono font-semibold px-2 py-0.5 rounded-full border ${stateMeta.chip}`}>
            {stateMeta.label}
          </span>
        )}
      </div>

      {/* Optional: avatar+name mini-row before the suggestion so the
          card visually echoes the message it's drafting toward. Mockup
          has a small teal-tint avatar on the recipient. */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-[26px] h-[26px] rounded-full bg-rd-teal-tint flex items-center justify-center flex-shrink-0">
          <span className="font-display text-[11px] font-bold text-rd-teal-dark">{targetInitial}</span>
        </div>
        <p className="text-[11.5px] text-rd-text-secondary">
          To <span className="font-display font-semibold text-rd-text">{target?.name || "your recipient"}</span>
          {suggestion.turn_type && (
            <> · {turnTypeLabel(suggestion.turn_type)}</>
          )}
        </p>
      </div>

      {/* Suggestion in soft warm box (mockup #FBF7F1 / border #EFE7DA) */}
      {editing ? (
        <textarea
          value={draftText}
          onChange={(e) => setDraftText(e.target.value)}
          rows={Math.min(12, Math.max(4, Math.ceil((draftText?.length || 100) / 70)))}
          className="w-full text-[13px] bg-[#FBF7F1] border border-[#EFE7DA] rounded-[12px] px-3 py-2.5 text-rd-text focus:outline-none focus:border-rd-coral focus:shadow-[0_0_0_3px_var(--rd-coral-tint)] leading-[1.6]"
        />
      ) : (
        <div className="bg-[#FBF7F1] border border-[#EFE7DA] rounded-[12px] px-3 py-2.5 text-[13px] text-rd-text leading-[1.6] whitespace-pre-wrap">
          {draftText}
        </div>
      )}
      <CharCount text={draftText} turnType={suggestion.turn_type} />

      {/* Q4 — warm_up_advice CORRECTIVE WARNING banner. Preserved
          cautionary salience: only when warm_up_advice is non-empty.
          NOT moved to a calm/affirmative slot. */}
      {hasWarmUp && (
        <div className="mt-3 rounded-[12px] px-3 py-2.5 bg-rd-golden-tint border border-rd-golden/40 text-rd-golden-dark flex items-start gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[10.5px] uppercase tracking-[0.09em] font-display font-bold mb-0.5">Coach&apos;s advice</p>
            <p className="text-[12px] leading-snug">{suggestion.warm_up_advice}</p>
          </div>
        </div>
      )}

      {/* Edge-fn warnings (separate from warm_up_advice) */}
      {hasWarnings && (
        <div className="mt-3 space-y-1">
          {suggestion.warnings.map((w, i) => (
            <div key={i} className="rounded-[10px] px-2.5 py-1.5 bg-rd-golden-tint border border-rd-golden/40 text-[11.5px] text-rd-golden-dark leading-snug">
              {w}
            </div>
          ))}
        </div>
      )}

      {/* Q5 — honest affirmative anti-pattern-PASS state. Client-derived
          from no warnings + no warm_up_advice. Honest generic
          affirmation only; no fabricated specific claims. */}
      {showAffirmative && (
        <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-display font-semibold rounded-full px-2.5 py-1 bg-rd-teal-tint text-rd-teal-dark">
          <ShieldCheck className="w-3.5 h-3.5" />
          No anti-pattern flags raised
        </div>
      )}

      {/* Action row — Edit (soft) + Use this message (coral) per mockup */}
      <div className="flex justify-end gap-2 mt-4 items-center flex-wrap">
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 text-[12px] font-display font-semibold text-rd-text-secondary hover:text-rd-text px-2 py-1.5 rounded-full"
        >
          {copied ? <><Check className="w-3.5 h-3.5 text-rd-teal-dark" />Copied</> : <><Copy className="w-3.5 h-3.5" />Copy</>}
        </button>
        <button
          type="button"
          onClick={onRegenerate}
          disabled={generating}
          data-action="regenerate"
          className="inline-flex items-center gap-1 text-[12px] font-display font-semibold text-rd-text-secondary hover:text-rd-text px-2 py-1.5 rounded-full disabled:opacity-60"
        >
          <RefreshCw className="w-3.5 h-3.5" />Regenerate
        </button>
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          data-action="edit-suggestion"
          className={RD_BTN_SOFT_PILL}
        >
          <Pencil className="w-3.5 h-3.5" />{editing ? "Done editing" : "Edit"}
        </button>
        <button
          type="button"
          onClick={onAcceptAndSend}
          disabled={generating || !draftText.trim()}
          data-action="use-message"
          className={RD_BTN_PRIMARY}
          title="Mark this message as sent (after copying + pasting into LinkedIn)"
        >
          {generating ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : <><Send className="w-4 h-4" />Use this message</>}
        </button>
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
      <p className={`text-[10px] mt-1 text-right ${overConnLimit ? "text-rd-coral-dark" : "text-rd-text-tertiary"}`}>
        {charCount}/200 chars (connection-request note limit)
      </p>
    );
  }
  const tooShort = wordCount < 30;
  const tooLong = wordCount > 200;
  return (
    <p className={`text-[10px] mt-1 text-right ${tooShort || tooLong ? "text-rd-golden-dark" : "text-rd-text-tertiary"}`}>
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
