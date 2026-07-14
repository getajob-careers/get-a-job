// PROD ORIGINAL: src/components/tracker/ApplicationsKanban.jsx (canvas clone)
import React from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { reveal } from "./stagger";

// Fixture-mode Kanban for the design canvas. Presentational + LOCAL-STATE ONLY:
// dragging a card calls onMove(appId, toStatus) which updates the parent's
// useState — it NEVER touches Supabase (the prod ApplicationsKanban writes
// status changes straight to the DB via supabase.update). Same @hello-pangea/dnd
// mechanics as prod so the drag feel matches; styling stays on --rd-* tokens.

const STATUS_TONE = {
  interested: { tint: "var(--rd-bg-soft)", fg: "var(--rd-text-secondary)" },
  preparing: { tint: "var(--rd-golden-tint)", fg: "var(--rd-golden-dark)" },
  applied: { tint: "var(--rd-bg-soft)", fg: "var(--rd-text-secondary)" },
  interviewing: { tint: "var(--rd-teal-tint)", fg: "var(--rd-teal-dark)" },
  offer: { tint: "var(--rd-coral-tint)", fg: "var(--rd-coral-dark)" },
  accepted: { tint: "var(--rd-teal-tint)", fg: "var(--rd-teal-dark)" },
  rejected: { tint: "var(--rd-bg-soft)", fg: "var(--rd-text-tertiary)" },
};

function pct(v) {
  return v == null ? null : `${Math.round(v * 100)}%`;
}

function CanvasKanbanCard({ app, onClick }) {
  const tone = STATUS_TONE[app.status] || STATUS_TONE.interested;
  const match = pct(app.qualification_score);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onClick?.()}
      className="cursor-pointer bg-rd-bg-card border border-rd-border rounded-[10px] p-2.5 hover:border-rd-border-hover hover:shadow-rd transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-rd-teal focus-visible:ring-offset-1"
    >
      <div className="flex items-start gap-2">
        <span
          className="flex-shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-[8px] font-display font-bold text-[12px]"
          style={{ background: tone.tint, color: tone.fg }}
          aria-hidden="true"
        >
          {app.company?.[0] || "?"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display font-bold text-[12px] text-rd-text leading-[1.2] line-clamp-2">
            {app.role_title}
          </p>
          <p className="text-[10.5px] text-rd-text-secondary mt-0.5 truncate">
            {[app.company, app.location].filter(Boolean).join(" · ")}
          </p>
        </div>
      </div>
      {match && (
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[9.5px] uppercase tracking-[0.08em] font-mono text-rd-text-eyebrow">
            {app.date_applied ? `Applied ${app.date_applied}` : "Saved"}
          </span>
          <span
            className="inline-flex items-center font-display font-bold text-[10px] rounded-full px-1.5 py-0.5"
            style={{
              background: "var(--rd-teal-tint)",
              color: "var(--rd-teal-dark)",
            }}
          >
            {match}
          </span>
        </div>
      )}
    </div>
  );
}

export default function CanvasKanban({
  applications,
  statuses,
  statusLabels,
  onMove,
  onCardClick,
}) {
  const byStatus = statuses.reduce((acc, s) => {
    acc[s] = applications.filter((a) => a.status === s);
    return acc;
  }, {});

  const onDragEnd = (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId) return;
    onMove?.(draggableId, destination.droppableId);
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {statuses.map((status, colIdx) => {
          const cards = byStatus[status] || [];
          const rv = reveal(colIdx);
          return (
            <Droppable droppableId={status} key={status}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  style={rv.style}
                  className={`${rv.className} flex-shrink-0 w-[220px] rounded-[12px] p-2 transition-colors ${
                    snapshot.isDraggingOver ? "bg-rd-bg-soft" : "bg-rd-bg-page"
                  }`}
                >
                  <div className="flex items-center justify-between px-1 mb-2">
                    <span className="font-display font-bold text-[11.5px] text-rd-text">
                      {statusLabels[status] || status}
                    </span>
                    <span className="text-[10.5px] font-mono text-rd-text-tertiary">
                      {cards.length}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2 min-h-[8px]">
                    {cards.map((app, index) => (
                      <Draggable
                        key={app.id}
                        draggableId={app.id}
                        index={index}
                      >
                        {(dragProvided, dragSnapshot) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                            style={{
                              ...dragProvided.draggableProps.style,
                              boxShadow: dragSnapshot.isDragging
                                ? "0 6px 24px rgba(14,16,20,0.18)"
                                : undefined,
                            }}
                          >
                            <CanvasKanbanCard
                              app={app}
                              onClick={() => onCardClick?.(app)}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                </div>
              )}
            </Droppable>
          );
        })}
      </div>
    </DragDropContext>
  );
}
