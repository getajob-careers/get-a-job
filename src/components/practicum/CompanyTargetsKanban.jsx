import React from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import CompanyTargetCard from "./CompanyTargetCard";
import { STATUSES, STATUS_LABELS, STATUS_ACCENTS } from "./constants";
import { track, EVENTS } from "@/lib/analytics";

// 6-column kanban with drag-and-drop (@hello-pangea/dnd).
//   - Each column is a Droppable keyed by status; cards are Draggables.
//   - Drop on a same-column slot is a no-op (we only care about status change).
//   - Optimistic mutate: invalidate immediately after a successful UPDATE.
//   - On error, the cache invalidation pulls the server-truth status back —
//     the card visually snaps back to its original column.
//   - Clicks on the card body still open the drawer; the library's drag
//     threshold disambiguates click vs. drag automatically.

export default function CompanyTargetsKanban({ targets, onCardClick }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const byStatus = STATUSES.reduce((acc, status) => {
    acc[status] = targets.filter((t) => t.status === status);
    return acc;
  }, {});

  const onDragEnd = async (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId) return;

    const target = targets.find((t) => t.id === draggableId);
    if (!target) return;
    const oldStatus = target.status;
    const newStatus = destination.droppableId;

    // Optimistic — overwrite the cached array in place so the card moves
    // before the server confirms. The mutation below either commits this
    // optimistic state (via invalidate) or rolls back (via the same
    // invalidate, which pulls server truth).
    queryClient.setQueryData(
      ["company_targets", user?.id],
      (prev) => Array.isArray(prev)
        ? prev.map((t) => (t.id === draggableId ? { ...t, status: newStatus } : t))
        : prev,
    );

    const { error } = await supabase
      .from("company_targets")
      .update({ status: newStatus })
      .eq("id", draggableId);

    if (error) {
      console.error("[kanban] drag status update failed:", error);
      toast.error("Couldn't update status. Reverted.");
      // Refetch to roll back the optimistic mutation.
      queryClient.invalidateQueries({ queryKey: ["company_targets", user?.id] });
      return;
    }

    track(EVENTS.PRACTICUM_STATUS_CHANGED, {
      old_status: oldStatus,
      new_status: newStatus,
      via: "drag",
    });

    // Confirm the optimistic state + pull the new status_changes audit row
    // the trigger inserted, so the drawer's timeline stays current.
    queryClient.invalidateQueries({ queryKey: ["company_targets", user?.id] });
    queryClient.invalidateQueries({ queryKey: ["company_target_status_changes", draggableId] });
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0">
        <div className="grid grid-cols-6 gap-3 min-w-[1100px] lg:min-w-0">
          {STATUSES.map((status) => {
            const column = byStatus[status];
            return (
              <Droppable key={status} droppableId={status}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex flex-col min-h-[200px] rounded-lg transition-colors ${
                      snapshot.isDraggingOver ? "bg-[#FAFAFA] ring-1 ring-[#E5E5E5]" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2 px-1">
                      <span className={`inline-flex items-center px-2 py-0.5 text-[10px] uppercase tracking-wider font-medium rounded ${STATUS_ACCENTS[status]}`}>
                        {STATUS_LABELS[status]}
                      </span>
                      <span className="text-[10px] text-[#A3A3A3] tabular-nums">{column.length}</span>
                    </div>
                    <div className="flex-1 px-1">
                      {column.length === 0 ? (
                        <div className="text-[11px] text-[#A3A3A3] italic px-1 py-2">No targets here yet.</div>
                      ) : (
                        column.map((t, index) => (
                          <Draggable key={t.id} draggableId={t.id} index={index}>
                            {(dragProvided, dragSnapshot) => (
                              <div
                                ref={dragProvided.innerRef}
                                {...dragProvided.draggableProps}
                                {...dragProvided.dragHandleProps}
                                className={dragSnapshot.isDragging ? "shadow-lg" : ""}
                              >
                                <CompanyTargetCard target={t} onClick={() => onCardClick(t)} />
                              </div>
                            )}
                          </Draggable>
                        ))
                      )}
                      {provided.placeholder}
                    </div>
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
