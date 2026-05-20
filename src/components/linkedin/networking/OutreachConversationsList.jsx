import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "@/api/supabaseClient";
import { Loader2, Plus, MessageSquare, Archive, CheckCircle2, Clock } from "lucide-react";

// OutreachConversationsList — list view of user's outreach conversations,
// active first, sorted by updated_at DESC (decision 3A from PR #34).
// Click a row to resume; click "New conversation" to start a new one.

const GOAL_LABELS = {
  message_recruiter: "Message a recruiter",
  message_hiring_manager: "Message a hiring manager",
  message_alumni: "Message an alumni",
  request_informational_interview: "Informational interview",
  thank_you_follow_up: "Thank-you / follow-up",
  reconnect_dormant: "Reconnect (dormant)",
  ask_for_referral: "Ask for a referral",
  ask_for_recommendation: "Ask for a recommendation",
};

const STATUS_META = {
  active: { Icon: Clock, label: "Active", color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  completed: { Icon: CheckCircle2, label: "Completed", color: "text-blue-700 bg-blue-50 border-blue-200" },
  archived: { Icon: Archive, label: "Archived", color: "text-[#9C9DA1] bg-[#F4F4F2] border-[#DDDDDB]" },
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
    <div className="bg-white border border-[#DDDDDB] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-[#0E1014]">Your outreach conversations</h3>
          <p className="text-[11px] text-[#9C9DA1] mt-0.5">Active first, most recent on top</p>
        </div>
        <button
          type="button"
          onClick={onNew}
          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-[#0E1014] text-white rounded-md hover:bg-[#F87060]"
        >
          <Plus className="w-3.5 h-3.5" />
          New conversation
        </button>
      </div>

      {rows === null && (
        <div className="flex items-center gap-2 text-xs text-[#9C9DA1] py-4">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading…
        </div>
      )}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">{error}</div>
      )}
      {rows && rows.length === 0 && (
        <div className="text-xs text-[#9C9DA1] italic py-3">
          No conversations yet. Click "New conversation" to start coaching your first outreach.
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
      className="w-full text-left bg-[#F4F4F2] hover:bg-[#E8E8E5] border border-[#DDDDDB] rounded-lg p-3 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare className="w-3.5 h-3.5 text-[#52545A] flex-shrink-0" />
            <span className="text-sm font-medium text-[#0E1014] truncate">{target.name || "(no name)"}</span>
            {target.company && (
              <span className="text-[11px] text-[#9C9DA1] truncate">— {target.company}</span>
            )}
          </div>
          <p className="text-[11px] text-[#52545A] truncate">{goalLabel}</p>
          <p className="text-[10px] text-[#9C9DA1] mt-0.5">
            {turnsCount} {turnsCount === 1 ? "turn" : "turns"} · updated {formatRelative(row.updated_at)}
          </p>
        </div>
        <div className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded-full border ${statusMeta.color} flex-shrink-0`}>
          <StatusIcon className="w-3 h-3" />
          {statusMeta.label}
        </div>
      </div>
    </button>
  );
}

export { GOAL_LABELS };
