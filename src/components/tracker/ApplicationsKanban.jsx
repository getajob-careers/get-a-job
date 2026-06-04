import React, { useEffect, useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronDown, ChevronUp } from "lucide-react";
import { track, EVENTS } from "@/lib/analytics";

// Opt-in kanban view of applications. Ports the practicum CompanyTargetsKanban
// pattern verbatim:
//   - @hello-pangea/dnd (DragDropContext / Droppable / Draggable)
//   - optimistic mutate via queryClient.setQueryData on ["applications", uid]
//   - rollback via invalidateQueries on error
//   - mobile (<768px) fallback to accordion with a status-select per card
//
// Cache discipline (lesson 2026-05-28): the parent Tracker page reads
// ["applications", uid] with select("*"). We reuse that exact key and
// mutate ALL fields per row (just the status diff) so the cached row
// stays wide — no narrow-projection poisoning.
//
// Audit: the trg_log_application_status_change DB trigger writes
// status_changes on every status UPDATE. The app NEVER inserts to
// status_changes directly.

const MOBILE_BREAKPOINT = 768;

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < MOBILE_BREAKPOINT : false,
  );
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return isMobile;
}

// Column tone — small color dot in the column header. Mirrors the mockup's
// per-column markers (gray / amber / teal / coral) while extending across
// the full 7 application statuses we actually use. Keeps the warm rd
// palette; no new tokens.
const COLUMN_DOT = {
  interested:   "bg-rd-text-tertiary",
  preparing:    "bg-rd-golden",
  applied:      "bg-rd-golden",
  interviewing: "bg-rd-teal",
  offer:        "bg-rd-coral",
  accepted:     "bg-rd-coral",
  rejected:     "bg-rd-text-tertiary",
};

// Logo tile tone per column — matches mockup (status-tinted initial chip).
const LOGO_TILE_TONE = {
  interested:   { bg: "bg-rd-bg-soft",    fg: "text-rd-text-secondary" },
  preparing:    { bg: "bg-rd-golden-tint", fg: "text-rd-golden-dark" },
  applied:      { bg: "bg-rd-golden-tint", fg: "text-rd-golden-dark" },
  interviewing: { bg: "bg-rd-teal-tint",   fg: "text-rd-teal-dark" },
  offer:        { bg: "bg-rd-coral-tint",  fg: "text-rd-coral-dark" },
  accepted:     { bg: "bg-rd-coral-tint",  fg: "text-rd-coral-dark" },
  rejected:     { bg: "bg-rd-bg-soft",    fg: "text-rd-text-tertiary" },
};

export default function ApplicationsKanban({
  applications,
  statuses,           // canonical order
  statusLabels,       // label map
  onCardClick,        // (app) => void — opens the same expansion the list view uses
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  const byStatus = statuses.reduce((acc, status) => {
    acc[status] = applications.filter((a) => a.status === status);
    return acc;
  }, {});

  const updateStatus = async (app, newStatus, via) => {
    const oldStatus = app.status;
    if (oldStatus === newStatus) return;

    // Optimistic mutate on the SAME key the Tracker page reads.
    queryClient.setQueryData(
      ["applications", user?.id],
      (prev) => Array.isArray(prev)
        ? prev.map((a) => (a.id === app.id ? { ...a, status: newStatus } : a))
        : prev,
    );

    const { error } = await supabase
      .from("applications")
      .update({ status: newStatus })
      .eq("id", app.id);

    if (error) {
      console.error("[tracker-kanban] status update failed:", error);
      toast.error("Couldn't update status. Reverted.");
      queryClient.invalidateQueries({ queryKey: ["applications", user?.id] });
      return;
    }

    track(EVENTS.APPLICATION_STATUS_CHANGED || "application_status_changed", {
      old_status: oldStatus,
      new_status: newStatus,
      via,
    });

    // Refetch to pick up the trigger-written status_changes audit and any
    // server-side timestamp updates.
    queryClient.invalidateQueries({ queryKey: ["applications", user?.id] });
  };

  const onDragEnd = async (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId) return;
    const app = applications.find((a) => a.id === draggableId);
    if (!app) return;
    await updateStatus(app, destination.droppableId, "drag");
  };

  if (isMobile) {
    return (
      <MobileAccordion
        statuses={statuses}
        statusLabels={statusLabels}
        byStatus={byStatus}
        onCardClick={onCardClick}
        onStatusChange={(app, newStatus) => updateStatus(app, newStatus, "select")}
      />
    );
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0">
        <div className="flex gap-2.5 min-w-[1100px]">
          {statuses.map((status) => {
            const column = byStatus[status];
            return (
              <Droppable key={status} droppableId={status}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={[
                      "flex-1 min-w-0 flex flex-col gap-1.5 p-2 rounded-[12px] min-h-[220px] transition-colors",
                      snapshot.isDraggingOver
                        ? "bg-rd-coral-tint shadow-[inset_0_0_0_2px_var(--rd-coral)]"
                        : "bg-rd-bg-soft",
                    ].join(" ")}
                    data-dragover={snapshot.isDraggingOver}
                  >
                    <div className="flex items-center gap-1.5 px-1 py-0.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${COLUMN_DOT[status] || "bg-rd-text-tertiary"}`} />
                      <span className="font-display font-bold text-[12px] text-rd-text">
                        {statusLabels[status]}
                      </span>
                      <span className="flex-1" />
                      <span className="font-mono text-[10.5px] text-rd-text-tertiary tabular-nums">
                        {column.length}
                      </span>
                    </div>
                    {column.length === 0 ? (
                      <div
                        className="text-[10.5px] text-rd-text-tertiary italic text-center px-2 py-3.5 rounded-[10px] border border-dashed border-rd-border mt-1.5 leading-tight"
                      >
                        Drop apps here
                      </div>
                    ) : (
                      column.map((app, index) => (
                        <Draggable key={app.id} draggableId={app.id} index={index}>
                          {(dragProvided, dragSnapshot) => (
                            <div
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              {...dragProvided.dragHandleProps}
                              style={{
                                ...dragProvided.draggableProps.style,
                                boxShadow: dragSnapshot.isDragging ? "0 6px 24px rgba(14,16,20,0.18)" : undefined,
                              }}
                            >
                              <ApplicationKanbanCard
                                app={app}
                                onClick={() => onCardClick?.(app)}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))
                    )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            );
          })}
        </div>
      </div>
    </DragDropContext>
  );
}

// ───── Card ─────

function ApplicationKanbanCard({ app, onClick }) {
  const initial = (app.company || app.role_title || "?").trim().charAt(0).toUpperCase();
  const tone = LOGO_TILE_TONE[app.status] || LOGO_TILE_TONE.interested;
  const matchPct = pickDisplayScore(app);
  const role = app.role_title || "Untitled role";
  const company = app.company || "";

  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-rd-bg-card border border-rd-border rounded-[10px] p-2.5 cursor-grab text-left transition-[transform,border-color] duration-150 hover:-translate-y-[2px] hover:border-rd-border-hover focus:outline-none focus:ring-2 focus:ring-rd-coral/40 w-full"
    >
      <div className="flex items-center justify-between gap-2">
        <span className={`w-[22px] h-[22px] rounded-md flex items-center justify-center font-display font-bold text-[11px] ${tone.bg} ${tone.fg}`}>
          {initial}
        </span>
        {matchPct != null && (
          <span className={`font-display font-bold text-[10.5px] ${tone.fg}`}>
            {matchPct}%
          </span>
        )}
      </div>
      <div className="font-display font-bold text-[11.5px] leading-tight mt-1.5 text-rd-text line-clamp-2">
        {role}
      </div>
      {company && (
        <div className="text-[10px] text-rd-text-secondary mt-0.5 truncate">
          {company}
        </div>
      )}
    </button>
  );
}

// Pick the score we display on the card. Prefer qualification_score (track
// fit); fall back to goal_alignment_score; null when neither is set.
function pickDisplayScore(app) {
  const q = numOrNull(app.qualification_score);
  if (q != null) return Math.round(q);
  const g = numOrNull(app.goal_alignment_score);
  if (g != null) return Math.round(g);
  return null;
}
function numOrNull(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// ───── Mobile accordion fallback ─────

function MobileAccordion({ statuses, statusLabels, byStatus, onCardClick, onStatusChange }) {
  // Default-expand "interested" + any column that has cards.
  const initialOpen = statuses.filter((s) => s === "interested" || (byStatus[s]?.length || 0) > 0);
  const [openSet, setOpenSet] = useState(new Set(initialOpen));

  const toggle = (status) => {
    setOpenSet((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status); else next.add(status);
      return next;
    });
  };

  return (
    <div>
      {statuses.map((status) => {
        const column = byStatus[status] || [];
        const isOpen = openSet.has(status);
        return (
          <div key={status} className="bg-rd-bg-card border border-rd-border rounded-[14px] mb-2.5 overflow-hidden">
            <button
              type="button"
              onClick={() => toggle(status)}
              className="w-full flex items-center justify-between px-4 py-3.5 bg-transparent border-0 cursor-pointer font-body hover:bg-rd-bg-soft transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <span className={`w-2 h-2 rounded-full ${COLUMN_DOT[status] || "bg-rd-text-tertiary"}`} />
                <span className="font-display font-bold text-[13px] text-rd-text">
                  {statusLabels[status]}
                </span>
                <span className="text-xs text-rd-text-tertiary tabular-nums">{column.length}</span>
              </div>
              {isOpen ? (
                <ChevronUp className="w-4 h-4 text-rd-text-secondary" />
              ) : (
                <ChevronDown className="w-4 h-4 text-rd-text-secondary" />
              )}
            </button>
            {isOpen && (
              <div className="px-3.5 pb-3.5 flex flex-col gap-2 border-t border-rd-border pt-3">
                {column.length === 0 ? (
                  <p className="text-xs text-rd-text-tertiary italic py-1">No applications here yet.</p>
                ) : (
                  column.map((app) => (
                    <div key={app.id}>
                      <ApplicationKanbanCard app={app} onClick={() => onCardClick?.(app)} />
                      <div className="flex items-center gap-2 mt-1.5 px-1">
                        <span className="text-[11px] text-rd-text-tertiary">Move to:</span>
                        <select
                          value={app.status}
                          onChange={(e) => onStatusChange(app, e.target.value)}
                          className="text-[12px] text-rd-text bg-rd-bg-card border border-rd-border rounded-md px-2 py-1"
                        >
                          {statuses.map((s) => (
                            <option key={s} value={s}>{statusLabels[s]}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
