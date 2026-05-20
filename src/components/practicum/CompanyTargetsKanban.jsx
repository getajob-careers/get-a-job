import React, { useEffect, useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronDown, ChevronUp } from "lucide-react";
import CompanyTargetCard from "./CompanyTargetCard";
import { STATUSES, STATUS_LABELS, STATUS_TONE } from "./constants";
import { track, EVENTS } from "@/lib/analytics";

// Desktop: 6-column drag-drop kanban (@hello-pangea/dnd).
// Mobile (<768px): vertical accordion with one section per status; status
//                  changes via a select dropdown inside each card. Drag-drop
//                  is unreliable on touch screens and the accordion gives
//                  pilot students a usable experience on their phones.
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

export default function CompanyTargetsKanban({ targets, onCardClick }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  const byStatus = STATUSES.reduce((acc, status) => {
    acc[status] = targets.filter((t) => t.status === status);
    return acc;
  }, {});

  const updateStatus = async (target, newStatus, via) => {
    const oldStatus = target.status;
    if (oldStatus === newStatus) return;

    queryClient.setQueryData(
      ["company_targets", user?.id],
      (prev) => Array.isArray(prev)
        ? prev.map((t) => (t.id === target.id ? { ...t, status: newStatus } : t))
        : prev,
    );

    const { error } = await supabase
      .from("company_targets")
      .update({ status: newStatus })
      .eq("id", target.id);

    if (error) {
      console.error("[kanban] status update failed:", error);
      toast.error("Couldn't update status. Reverted.");
      queryClient.invalidateQueries({ queryKey: ["company_targets", user?.id] });
      return;
    }

    track(EVENTS.PRACTICUM_STATUS_CHANGED, {
      old_status: oldStatus,
      new_status: newStatus,
      via,
    });

    queryClient.invalidateQueries({ queryKey: ["company_targets", user?.id] });
    queryClient.invalidateQueries({ queryKey: ["company_target_status_changes", target.id] });
  };

  const onDragEnd = async (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId) return;
    const target = targets.find((t) => t.id === draggableId);
    if (!target) return;
    await updateStatus(target, destination.droppableId, "drag");
  };

  if (isMobile) {
    return (
      <MobileAccordion
        byStatus={byStatus}
        onCardClick={onCardClick}
        onStatusChange={(target, newStatus) => updateStatus(target, newStatus, "select")}
      />
    );
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0">
        <div className="act-kanban-row">
          {STATUSES.map((status) => {
            const column = byStatus[status];
            return (
              <Droppable key={status} droppableId={status}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`act-kanban-col act-status-${STATUS_TONE[status]}`}
                    data-dragover={snapshot.isDraggingOver}
                  >
                    <div className="act-kanban-col-head">
                      <span className="act-status-badge">{STATUS_LABELS[status]}</span>
                      <span className="act-kanban-col-count">{column.length}</span>
                    </div>
                    {column.length === 0 ? (
                      <div className="act-kanban-empty">No targets here yet.</div>
                    ) : (
                      column.map((t, index) => (
                        <Draggable key={t.id} draggableId={t.id} index={index}>
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
                              <CompanyTargetCard target={t} onClick={() => onCardClick(t)} />
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

// ───── Mobile accordion ─────

function MobileAccordion({ byStatus, onCardClick, onStatusChange }) {
  // Default-expand "exploring" + any column that has cards. Empty columns
  // start collapsed so the screen isn't dominated by blank sections.
  const initialOpen = STATUSES.filter((s) => s === "exploring" || (byStatus[s]?.length || 0) > 0);
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
      {STATUSES.map((status) => {
        const column = byStatus[status] || [];
        const isOpen = openSet.has(status);
        return (
          <div key={status} className="act-accordion-section">
            <button type="button" onClick={() => toggle(status)} className="act-accordion-head">
              <div className="flex items-center gap-2.5">
                <span className={`act-status-badge act-status-${STATUS_TONE[status]}`}>
                  {STATUS_LABELS[status]}
                </span>
                <span className="text-xs text-[#9C9DA1] tabular-nums">{column.length}</span>
              </div>
              {isOpen ? (
                <ChevronUp className="w-4 h-4 text-[#52545A]" />
              ) : (
                <ChevronDown className="w-4 h-4 text-[#52545A]" />
              )}
            </button>
            {isOpen && (
              <div className="act-accordion-body">
                {column.length === 0 ? (
                  <p className="text-xs text-[#9C9DA1] italic py-1">No targets here yet.</p>
                ) : (
                  column.map((t) => (
                    <div key={t.id}>
                      <CompanyTargetCard target={t} onClick={() => onCardClick(t)} />
                      {/* Inline status change — drag-drop isn't reliable on
                          touch screens, so users move cards between stages
                          via this select instead. */}
                      <div className="flex items-center gap-2 mt-1.5 px-1">
                        <span className="text-[11px] text-[#9C9DA1]">Move to:</span>
                        <select
                          value={t.status}
                          onChange={(e) => onStatusChange(t, e.target.value)}
                          className="text-[12px] text-[#0E1014] bg-white border border-[#DDDDDB] rounded-md px-2 py-1"
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
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
