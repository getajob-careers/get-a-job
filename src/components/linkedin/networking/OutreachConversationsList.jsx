import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "@/api/supabaseClient";
import { Loader2, Plus, MessageSquare, Archive, CheckCircle2, Clock } from "lucide-react";

// PR 3J-C — restyled on rd-* tokens. Restyle-only on behavior: the
// supabase read (linkedin_outreach_conversations, RLS via implicit
// policy, .order().limit(50) per Eli PR #34), the status-then-updated_at
// sort, and the GOAL_LABELS map (exported for OutreachComposer) are all
// preserved byte-for-byte.

const GOAL_LABELS = {
  message_recruiter: "Message a recruiter",
  message_hiring_manager: "Message a hiring manager",
  message_alumni: "Message an alumni",
  request_informational_interview: "Informational interview",
  thank_you_follow_up: "Thank-you / follow-up",
  reconnect_dormant: "Reconnect (dormant)",
  ask_for_referral: "Ask for a referral",
  ask_for_recommendation: "Ask for a recommendation",
  propose_internship: "Propose an internship",
};

// Status pills mapped to rd tones: active = teal (running), completed
// = coral (closed loop), archived = neutral (shelved).
const STATUS_META = {
  active:    { Icon: Clock,         label: "Active",    chip: "bg-rd-teal-tint text-rd-teal-dark border-rd-teal/30" },
  completed: { Icon: CheckCircle2,  label: "Completed", chip: "bg-rd-primary-tint text-rd-primary-dark border-rd-primary/30" },
  archived:  { Icon: Archive,       label: "Archived",  chip: "bg-rd-bg-soft text-rd-text-tertiary border-rd-border" },
};

function formatRelative(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const min = Math.round(diffMs / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.round(hr / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString();
}

export default function OutreachConversationsList({ onOpen, onNew, refreshKey }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    const { data, error: queryErr } = await supabase
      .from("linkedin_outreach_conversations")
      .select("id, goal, target_person, status, message_thread, updated_at")
      .order("status", { ascending: true })
      .order("updated_at", { ascending: false })
      .limit(50);
    if (queryErr) {
      setError(queryErr.message || "Couldn't load conversations.");
      setRows([]);
      return;
    }
    const ordered = (data || []).slice().sort((a, b) => {
      if (a.status === b.status) {
        return new Date(b.updated_at) - new Date(a.updated_at);
      }
      const order = { active: 0, completed: 1, archived: 2 };
      return (order[a.status] ?? 9) - (order[b.status] ?? 9);
    });
    setRows(ordered);
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  return (
    <div className="bg-white border border-rd-border rounded-[18px] p-5 shadow-rd">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h3 className="font-display font-bold text-[14px] text-rd-text">Your outreach conversations</h3>
          <p className="text-[11px] text-rd-text-tertiary mt-0.5">Active first, most recent on top</p>
        </div>
        <button
          type="button"
          onClick={onNew}
          data-action="new-conversation"
          className="inline-flex items-center justify-center gap-1.5 font-display font-bold text-[12.5px] text-white bg-rd-primary hover:bg-rd-primary-dark rounded-full px-3.5 py-[7px] transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          New conversation
        </button>
      </div>

      {rows === null && (
        <div className="flex items-center gap-2 text-[12px] text-rd-text-tertiary py-4">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading…
        </div>
      )}
      {error && (
        <div className="px-3 py-2.5 rounded-[10px] bg-rd-primary-tint border border-rd-primary/30 text-[12.5px] text-rd-primary-dark">{error}</div>
      )}
      {rows && rows.length === 0 && (
        <div className="text-[12px] text-rd-text-tertiary italic py-3">
          No conversations yet. Click &quot;New conversation&quot; to start coaching your first outreach.
        </div>
      )}
      {rows && rows.length > 0 && (
        <div className="space-y-2">
          {rows.map((row) => <ConversationRow key={row.id} row={row} onOpen={onOpen} />)}
        </div>
      )}
    </div>
  );
}

function ConversationRow({ row, onOpen }) {
  const goalLabel = GOAL_LABELS[row.goal] || row.goal;
  const statusMeta = STATUS_META[row.status] || STATUS_META.active;
  const StatusIcon = statusMeta.Icon;
  const target = row.target_person || {};
  const turnsCount = Array.isArray(row.message_thread) ? row.message_thread.length : 0;

  return (
    <button
      type="button"
      onClick={() => onOpen(row.id)}
      data-conversation-id={row.id}
      className="w-full text-left bg-rd-bg-soft hover:bg-rd-border border border-rd-border rounded-[14px] p-3 transition-colors"
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <MessageSquare className="w-3.5 h-3.5 text-rd-text-secondary flex-shrink-0" />
            <span className="font-display font-semibold text-[13.5px] text-rd-text truncate">{target.name || "(no name)"}</span>
            {target.company && (
              <span className="text-[11px] text-rd-text-tertiary truncate">— {target.company}</span>
            )}
          </div>
          <p className="text-[11.5px] text-rd-text-secondary truncate">{goalLabel}</p>
          <p className="text-[10.5px] text-rd-text-tertiary mt-0.5">
            {turnsCount} {turnsCount === 1 ? "turn" : "turns"} · updated {formatRelative(row.updated_at)}
          </p>
        </div>
        <div className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.06em] font-mono font-semibold px-2 py-0.5 rounded-full border ${statusMeta.chip} flex-shrink-0`}>
          <StatusIcon className="w-3 h-3" />
          {statusMeta.label}
        </div>
      </div>
    </button>
  );
}

export { GOAL_LABELS };
