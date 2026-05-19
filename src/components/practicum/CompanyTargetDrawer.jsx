import React, { useState, useEffect } from "react";
import { supabase } from "@/api/supabaseClient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "sonner";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ExternalLink, MessageSquare } from "lucide-react";
import { STATUSES, STATUS_LABELS, scoreBand } from "./constants";
import { Link } from "react-router-dom";
import { track, EVENTS } from "@/lib/analytics";

// Right-side detail panel. Sections, top-to-bottom:
//   1. Company header (name + sector + stage + external link)
//   2. Scores (fit + career_compound) with discrete-band labels + rationale
//   3. Pitch recommendation (pitched_role + pitch_rationale + skill_gaps_this_fills)
//   4. Status change form (Select + optional note textarea + Save)
//   5. Notes (general notes textarea — auto-save on blur)
//   6. Timeline of status_changes (newest first)
//
// Status-change writes are two-phase: UPDATE company_targets.status first
// (the trigger inserts an audit row); then if note was provided, UPDATE
// the just-inserted audit row's note column. Both writes are RLS-scoped
// to the user's own rows.

export default function CompanyTargetDrawer({ target, open, onClose }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [pendingStatus, setPendingStatus] = useState(target?.status || "exploring");
  const [pendingNote, setPendingNote] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);

  const [notes, setNotes] = useState(target?.notes || "");
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    if (target) {
      setPendingStatus(target.status);
      setPendingNote("");
      setNotes(target.notes || "");
    }
  }, [target?.id, target?.status, target?.notes, target]);

  const { data: timeline = [] } = useQuery({
    queryKey: ["company_target_status_changes", target?.id],
    queryFn: async () => {
      if (!target?.id) return [];
      const { data, error } = await supabase
        .from("company_target_status_changes")
        .select("*")
        .eq("target_id", target.id)
        .order("changed_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!target?.id,
  });

  if (!target) return null;

  const company = target.companies || {};
  const fit = scoreBand(target.fit_score);
  const compound = scoreBand(target.career_compound_score);
  const showScores = target.source === "matched" && target.fit_score != null;

  const handleSaveStatus = async () => {
    if (pendingStatus === target.status && !pendingNote.trim()) {
      toast.message("Nothing to save.");
      return;
    }
    setSavingStatus(true);
    try {
      // 1. Status change (trigger writes audit row).
      if (pendingStatus !== target.status) {
        const { error: updateError } = await supabase
          .from("company_targets")
          .update({ status: pendingStatus })
          .eq("id", target.id);
        if (updateError) {
          toast.error("Couldn't update status.");
          return;
        }
        track(EVENTS.PRACTICUM_STATUS_CHANGED, {
          old_status: target.status,
          new_status: pendingStatus,
        });
      }

      // 2. If a note was provided, patch the most recent audit row.
      // (If status didn't change but the user typed a note, there's no
      // new audit row to patch — surface this case as a soft no-op.)
      if (pendingNote.trim() && pendingStatus !== target.status) {
        const { data: latest, error: selectError } = await supabase
          .from("company_target_status_changes")
          .select("id")
          .eq("target_id", target.id)
          .order("changed_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!selectError && latest?.id) {
          await supabase
            .from("company_target_status_changes")
            .update({ note: pendingNote.trim() })
            .eq("id", latest.id);
        }
      }

      toast.success("Status updated.");
      setPendingNote("");
      queryClient.invalidateQueries({ queryKey: ["company_targets", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["company_target_status_changes", target.id] });
    } finally {
      setSavingStatus(false);
    }
  };

  const handleSaveNotes = async () => {
    if (notes === (target.notes || "")) return;
    setSavingNotes(true);
    try {
      const { error } = await supabase
        .from("company_targets")
        .update({ notes: notes || null })
        .eq("id", target.id);
      if (error) {
        toast.error("Couldn't save notes.");
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["company_targets", user?.id] });
    } finally {
      setSavingNotes(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <div className="space-y-6 pt-2">
          {/* Header */}
          <div>
            <h2 className="text-lg font-semibold text-[#0A0A0A] mb-1">{company.name || "Unnamed company"}</h2>
            <p className="text-sm text-[#525252]">
              {[company.sector, company.stage, company.hq_city].filter(Boolean).join(" · ") || "No company metadata yet."}
            </p>
            {company.domain && (
              <a
                href={`https://${company.domain.replace(/^https?:\/\//, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-[#1E40AF] hover:underline mt-1.5"
              >
                {company.domain}
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          {/* Scores */}
          {showScores && (
            <Section title="Match">
              <div className="grid grid-cols-2 gap-3 mb-3">
                <ScoreTile label="Fit" score={target.fit_score} band={fit} />
                <ScoreTile label="Career compound" score={target.career_compound_score} band={compound} />
              </div>
              {target.fit_rationale && (
                <p className="text-xs text-[#525252] leading-relaxed">{target.fit_rationale}</p>
              )}
            </Section>
          )}

          {/* Pitch recommendation */}
          {target.pitched_role && (
            <Section title="What to pitch">
              <p className="text-sm font-medium text-[#0A0A0A] mb-1.5">{target.pitched_role}</p>
              {target.pitch_rationale && (
                <p className="text-xs text-[#525252] leading-relaxed mb-3">{target.pitch_rationale}</p>
              )}
              {Array.isArray(target.skill_gaps_this_fills) && target.skill_gaps_this_fills.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[#A3A3A3] font-medium mb-1.5">Closes these gaps</p>
                  <div className="flex flex-wrap gap-1.5">
                    {target.skill_gaps_this_fills.map((g, idx) => (
                      <span key={idx} className="inline-flex items-center px-2 py-0.5 text-xs text-[#525252] bg-[#FAFAFA] border border-[#F0F0F0] rounded">
                        {g}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </Section>
          )}

          {/* Status change */}
          <Section title="Status">
            <select
              value={pendingStatus}
              onChange={(e) => setPendingStatus(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-[#E5E5E5] rounded-md focus:outline-none focus:border-[#0A0A0A] mb-2"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
            {pendingStatus !== target.status && (
              <textarea
                value={pendingNote}
                onChange={(e) => setPendingNote(e.target.value)}
                placeholder="Optional: what happened? (e.g. 'Reached out via Sarah Cohen, intro to PM team')"
                rows={3}
                className="w-full px-3 py-2 text-sm bg-white border border-[#E5E5E5] rounded-md focus:outline-none focus:border-[#0A0A0A] mb-2 resize-none"
              />
            )}
            <button
              type="button"
              onClick={handleSaveStatus}
              disabled={savingStatus || (pendingStatus === target.status && !pendingNote.trim())}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium bg-[#0A0A0A] hover:bg-[#262626] disabled:bg-[#E5E5E5] disabled:text-[#A3A3A3] disabled:cursor-not-allowed text-white rounded-md transition-colors"
            >
              {savingStatus ? "Saving…" : "Save status"}
            </button>
          </Section>

          {/* General notes */}
          <Section title="Notes">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={handleSaveNotes}
              placeholder="Anything you want to remember about this company — research, contacts, reminders…"
              rows={4}
              className="w-full px-3 py-2 text-sm bg-white border border-[#E5E5E5] rounded-md focus:outline-none focus:border-[#0A0A0A] resize-none"
            />
            {savingNotes && <p className="text-[10px] text-[#A3A3A3] mt-1">Saving…</p>}
          </Section>

          {/* Timeline */}
          <Section title="Timeline">
            {timeline.length === 0 ? (
              <p className="text-xs text-[#A3A3A3] italic">No transitions yet.</p>
            ) : (
              <ol className="space-y-3">
                {timeline.map((change) => (
                  <li key={change.id} className="flex gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#0A0A0A] mt-1.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-[#0A0A0A]">
                        {change.old_status ? (
                          <>
                            <span className="text-[#A3A3A3]">{STATUS_LABELS[change.old_status] || change.old_status}</span>
                            <span className="text-[#A3A3A3]"> → </span>
                            <span className="font-medium">{STATUS_LABELS[change.new_status] || change.new_status}</span>
                          </>
                        ) : (
                          <span className="font-medium">{STATUS_LABELS[change.new_status] || change.new_status}</span>
                        )}
                      </p>
                      <p className="text-[10px] text-[#A3A3A3] mt-0.5">
                        {new Date(change.changed_at).toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                      {change.note && (
                        <p className="text-xs text-[#525252] mt-1.5 leading-relaxed">{change.note}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Section>

          {/* Outreach Coach link — prefills company + pitched_role into the
              composer's target form so the user starts at the goal picker
              with context already filled. */}
          <div className="pt-2 border-t border-[#F0F0F0]">
            <Link
              to={`/LinkedinOptimizer?tab=networking${
                company.name ? `&prefillCompany=${encodeURIComponent(company.name)}` : ""
              }${
                target.pitched_role ? `&prefillRole=${encodeURIComponent(target.pitched_role)}` : ""
              }`}
              className="inline-flex items-center gap-1.5 text-xs text-[#1E40AF] hover:underline"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Open in Outreach Coach
            </Link>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-[#A3A3A3] font-medium mb-2">{title}</p>
      {children}
    </div>
  );
}

function ScoreTile({ label, score, band }) {
  return (
    <div className="bg-[#FAFAFA] rounded-md p-3 border border-[#F0F0F0]">
      <p className="text-[10px] uppercase tracking-wider text-[#A3A3A3] font-medium mb-1">{label}</p>
      <div className="flex items-baseline gap-1.5">
        <span className="text-xl font-semibold text-[#0A0A0A]">{Math.round(score)}</span>
        <span className={`text-[11px] font-medium ${band.color}`}>{band.label}</span>
      </div>
    </div>
  );
}
