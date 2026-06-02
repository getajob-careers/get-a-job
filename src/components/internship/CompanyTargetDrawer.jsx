import React, { useState, useEffect } from "react";
import { supabase } from "@/api/supabaseClient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ExternalLink, MessageSquare, Trash2 } from "lucide-react";
import { STATUSES, STATUS_LABELS } from "./constants";
import { Link } from "react-router-dom";
import { track, EVENTS } from "@/lib/analytics";
import { createPageUrl } from "@/utils";
import {
  bandForLlmScore,
  BAND_LABELS,
} from "./browse/scoreHelpers";
import PitchSection from "./PitchSection";
import { filterOutTarget } from "@/lib/companyTargetsCacheHelpers";

// Right-side detail panel. Sections, top-to-bottom:
//   1. Company header (name + sector + stage + external link)
//   2. Match — single combined band tile (PR5: replaces fit + compound
//      two-tile layout; one judgment instead of two numbers) + rationale
//   3. Pitch — <PitchSection> shared with the browse drawer so the
//      Role / Angle / Who-to-contact / Gaps copy and layout stay in lock
//      step across surfaces
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

  const [removeOpen, setRemoveOpen] = useState(false);
  const [removing, setRemoving] = useState(false);

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

  // PR8: pitch prose now lives in generate-internship-pitch + the
  // internship_pitches cache, same pattern Browse uses. We pass
  // target.pitched_role as a hint so the prose is grounded against the
  // matcher's chosen role (the hint folds into the cache input_hash,
  // so distinct roles produce distinct cache entries). First open of an
  // existing row is one cache miss; subsequent opens are cached.
  const companyIdForPitch = target?.companies?.id ?? null;
  const pitchQuery = useQuery({
    queryKey: ["internship_pitch", user?.id, companyIdForPitch, target?.pitched_role ?? null],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        "generate-internship-pitch",
        {
          body: {
            company_id: companyIdForPitch,
            pitched_role: target?.pitched_role || undefined,
          },
        },
      );
      if (error) {
        const status = error?.context?.status;
        if (status === 400) throw new Error(error?.context?.error || "Pitch profile missing.");
        if (status === 429) throw new Error("Rate limit reached — try again in a few minutes.");
        throw new Error("Couldn't generate the pitch. Please try again.");
      }
      return data?.pitch ?? null;
    },
    enabled: open && !!user?.id && !!companyIdForPitch && target?.source === "matched",
    staleTime: 30 * 60 * 1000,
    retry: false,
  });

  if (!target) return null;

  const company = target.companies || {};
  const score = target.match_score;
  const band = bandForLlmScore(score);
  const showBand = target.source === "matched" && score != null;
  // PitchSection consumes: pitched_role (from row, always present for
  // matched rows post-PR8), plus prose fetched on-demand. Loading
  // state surfaces via pitchQuery.isLoading; PitchSection renders its
  // own skeleton then.
  const pitchForSection = pitchQuery.data ?? (target.pitched_role ? { pitched_role: target.pitched_role } : null);
  const showPitchSection = target.source === "matched" && (!!target.pitched_role || pitchQuery.isLoading);

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

  // Hard-delete + optimistic cache filter. Mirrors the updateStatus
  // pattern in CompanyTargetsKanban (PR #69): setQueryData → filter out
  // the row → DELETE → on error invalidate to refetch from server. RLS
  // restricts DELETE to the user's own rows; ON DELETE CASCADE on
  // company_target_status_changes.target_id cleans the audit history.
  // For source='matched' rows the matcher is idempotent and may re-add
  // the company on the next "Find companies" run — surfaced in the
  // confirmation copy.
  const handleRemove = async () => {
    if (!target?.id || !user?.id) return;
    setRemoving(true);

    queryClient.setQueryData(
      ["company_targets", user.id],
      (prev) => filterOutTarget(prev, target.id),
    );

    const { error } = await supabase
      .from("company_targets")
      .delete()
      .eq("id", target.id);

    if (error) {
      console.error("[drawer] remove failed:", error);
      toast.error("Couldn't remove from pipeline. Reverted.");
      queryClient.invalidateQueries({ queryKey: ["company_targets", user.id] });
      setRemoving(false);
      setRemoveOpen(false);
      return;
    }

    track(EVENTS.PRACTICUM_STATUS_CHANGED, {
      old_status: target.status,
      new_status: "removed",
      via: "drawer_remove",
    });

    queryClient.invalidateQueries({ queryKey: ["company_targets", user.id] });
    toast.success("Removed from pipeline.");
    setRemoving(false);
    setRemoveOpen(false);
    onClose?.();
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

  // PR13: deep-link into the Outreach Coach's propose_internship goal,
  // picker skipped. Function = pitched_role with the " internship"
  // suffix stripped (the goal already implies internship framing).
  // Contact = the function leader the pitch identified — seeds the
  // composer's target.role so the user only has to add a person name.
  const pitchedFunction = (target.pitched_role || "").replace(/\s+internship\s*$/i, "").trim();
  const pitchContact = Array.isArray(pitchQuery.data?.who_to_contact) ? pitchQuery.data.who_to_contact[0] : null;
  const outreachUrl =
    createPageUrl("Linkedin") +
    `?tab=networking&goal=propose_internship${
      company.name ? `&prefillCompany=${encodeURIComponent(company.name)}` : ""
    }${
      pitchedFunction ? `&prefillFunction=${encodeURIComponent(pitchedFunction)}` : ""
    }${
      pitchContact ? `&prefillContact=${encodeURIComponent(pitchContact)}` : ""
    }`;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <div className="space-y-6 pt-2">
          {/* Header — h2 is also the Radix DialogTitle so screen readers
              announce the company name when the drawer opens. */}
          <div>
            <SheetTitle asChild>
              <h2 className="text-lg font-display font-bold text-rd-text mb-1">{company.name || "Unnamed company"}</h2>
            </SheetTitle>
            <SheetDescription asChild>
              <p className="text-sm text-rd-text-secondary">
                {[company.sector, company.stage, company.hq_city].filter(Boolean).join(" · ") || "No company metadata yet."}
              </p>
            </SheetDescription>
            {company.domain && (
              <a
                href={`https://${company.domain.replace(/^https?:\/\//, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-rd-coral hover:text-rd-coral-dark mt-1.5"
              >
                {company.domain}
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          {/* Match — single combined band tile (PR5) */}
          {showBand && (
            <Section title="Match">
              <BandTile band={band} />
              {target.match_rationale && (
                <p className="text-xs text-rd-text-secondary leading-relaxed mt-2">{target.match_rationale}</p>
              )}
            </Section>
          )}

          {/* Pitch — fetched on demand via generate-internship-pitch
              (PR8). Same shared PitchSection Browse uses. */}
          {showPitchSection && (
            <Section title="Your pitch">
              <PitchSection
                pitch={pitchForSection}
                loading={pitchQuery.isLoading}
                error={pitchQuery.error}
              />
            </Section>
          )}

          {/* Status change */}
          <Section title="Status">
            <select
              value={pendingStatus}
              onChange={(e) => setPendingStatus(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-rd-bg-card border border-rd-border rounded-[10px] focus:outline-none focus:border-rd-coral focus:shadow-[0_0_0_3px_var(--rd-coral-tint)] mb-2 text-rd-text"
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
                className="w-full px-3 py-2 text-sm bg-rd-bg-card border border-rd-border rounded-[10px] focus:outline-none focus:border-rd-coral focus:shadow-[0_0_0_3px_var(--rd-coral-tint)] mb-2 resize-none text-rd-text"
              />
            )}
            <button
              type="button"
              onClick={handleSaveStatus}
              disabled={savingStatus || (pendingStatus === target.status && !pendingNote.trim())}
              className="inline-flex items-center px-4 py-1.5 text-xs font-display font-bold bg-rd-coral hover:bg-rd-coral-dark disabled:bg-rd-bg-soft disabled:text-rd-text-tertiary disabled:cursor-not-allowed text-white rounded-full transition-colors"
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
              className="w-full px-3 py-2 text-sm bg-rd-bg-card border border-rd-border rounded-[10px] focus:outline-none focus:border-rd-coral focus:shadow-[0_0_0_3px_var(--rd-coral-tint)] resize-none text-rd-text"
            />
            {savingNotes && <p className="text-[10px] text-rd-text-tertiary mt-1">Saving…</p>}
          </Section>

          {/* Timeline */}
          <Section title="Timeline">
            {timeline.length === 0 ? (
              <p className="text-xs text-rd-text-tertiary italic">No transitions yet.</p>
            ) : (
              <ol className="space-y-3">
                {timeline.map((change) => (
                  <li key={change.id} className="flex gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-rd-coral mt-1.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-rd-text">
                        {change.old_status ? (
                          <>
                            <span className="text-rd-text-tertiary">{STATUS_LABELS[change.old_status] || change.old_status}</span>
                            <span className="text-rd-text-tertiary"> → </span>
                            <span className="font-display font-semibold">{STATUS_LABELS[change.new_status] || change.new_status}</span>
                          </>
                        ) : (
                          <span className="font-display font-semibold">{STATUS_LABELS[change.new_status] || change.new_status}</span>
                        )}
                      </p>
                      <p className="text-[10px] text-rd-text-tertiary mt-0.5">
                        {new Date(change.changed_at).toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                      {change.note && (
                        <p className="text-xs text-rd-text-secondary mt-1.5 leading-relaxed">{change.note}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Section>

          {/* Footer — Outreach link (left) + Remove (right). Remove is
              styled as a destructive secondary, never the primary action;
              the primary spend on this drawer is status moves + outreach. */}
          <div className="pt-2 border-t border-rd-border flex items-center justify-between gap-3">
            <Link
              to={outreachUrl}
              className="inline-flex items-center gap-1.5 text-xs font-display font-semibold text-rd-coral hover:text-rd-coral-dark transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Open in Outreach Coach
            </Link>
            <button
              type="button"
              onClick={() => setRemoveOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs text-rd-text-tertiary hover:text-rd-coral-dark transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Remove from pipeline
            </button>
          </div>
        </div>
      </SheetContent>

      <AlertDialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {company.name || "this company"} from your pipeline?</AlertDialogTitle>
            <AlertDialogDescription>
              {target.source === "matched"
                ? "If you run Find companies again, it may come back with a fresh evaluation."
                : "You can add it back manually later."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleRemove(); }}
              disabled={removing}
              className="bg-rd-coral hover:bg-rd-coral-dark focus:ring-rd-coral text-white"
            >
              {removing ? "Removing…" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.09em] font-mono font-medium text-rd-text-eyebrow mb-2">{title}</p>
      {children}
    </div>
  );
}

// Band tile — coral for High, dark for Med, faded for Low. Mirrors the
// browse drawer's BandTile so the same band reads the same on both
// surfaces (no number anywhere per PR5).
function BandTile({ band }) {
  const label = BAND_LABELS[band];
  const colorClass =
    band === "high" ? "text-rd-coral" :
    band === "med"  ? "text-rd-text" :
                      "text-rd-text-tertiary";
  return (
    <div className="bg-rd-bg-soft rounded-[10px] p-3 border border-rd-border">
      <p className="text-[10px] uppercase tracking-[0.09em] font-mono font-medium text-rd-text-eyebrow mb-1">Match</p>
      <span className={`text-2xl font-display font-bold ${colorClass}`}>{label}</span>
    </div>
  );
}
