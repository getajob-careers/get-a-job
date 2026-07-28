// PROD ORIGINAL: src/components/tracker/ApplicationsKanban.jsx (canvas clone)
import React from "react";
import { createPortal } from "react-dom";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { reveal } from "./stagger";

// Fixture-mode Kanban for the design canvas. Presentational + LOCAL-STATE ONLY:
// dragging a card calls onMove(appId, toStatus) which updates the parent's
// useState — it NEVER touches Supabase (the prod ApplicationsKanban writes
// status changes straight to the DB via supabase.update). Same @hello-pangea/dnd
// mechanics as prod so the drag feel matches; styling stays on --rd-* tokens.

// Clay-coherent status tones: warm/restrained, no gold rainbow. Neutral putty
// for passive stages (saved / applied / rejected), Clay's terracotta primary for
// the "active work" stages (preparing / interviewing), and the one cool accent
// teal reserved for the wins (offer / accepted). Nothing predates the palette.
const STATUS_TONE = {
  interested: { tint: "var(--rd-bg-soft)", fg: "var(--rd-text-secondary)" },
  preparing: { tint: "var(--rd-primary-tint)", fg: "var(--rd-primary-dark)" },
  applied: { tint: "var(--rd-bg-soft)", fg: "var(--rd-text-secondary)" },
  interviewing: { tint: "var(--rd-primary-tint)", fg: "var(--rd-primary-dark)" },
  offer: { tint: "var(--rd-teal-tint)", fg: "var(--rd-teal-dark)" },
  accepted: { tint: "var(--rd-teal-tint)", fg: "var(--rd-teal-dark)" },
  rejected: { tint: "var(--rd-bg-soft)", fg: "var(--rd-text-tertiary)" },
};

function pct(v) {
  return v == null ? null : `${Math.round(v * 100)}%`;
}

function CanvasKanbanCard({ app, onClick, settling, dragging }) {
  const tone = STATUS_TONE[app.status] || STATUS_TONE.interested;
  const match = pct(app.qualification_score);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onClick?.()}
      className={`${settling ? "cx-settle" : ""} cursor-grab active:cursor-grabbing rd-r-sm p-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-rd-teal focus-visible:ring-offset-1 ${
        dragging
          ? "bg-rd-bg-card border border-rd-primary rotate-2 shadow-[0_16px_36px_rgba(40,25,10,0.28)]"
          : "rd-lift rd-lift-hover"
      }`}
    >
      <div className="flex items-start gap-2">
        <span
          className="flex-shrink-0 inline-flex items-center justify-center w-7 h-7 rd-r-sm font-display font-bold rd-t-body-s"
          style={{ background: tone.tint, color: tone.fg }}
          aria-hidden="true"
        >
          {app.company?.[0] || "?"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display font-bold rd-t-body-s text-rd-text leading-[1.2] line-clamp-2">
            {app.role_title}
          </p>
          <p className="rd-t-micro text-rd-text-secondary mt-0.5 truncate">
            {[app.company, app.location].filter(Boolean).join(" · ")}
          </p>
        </div>
      </div>
      {match && (
        <div className="mt-2 flex items-center justify-between">
          <span className="rd-t-micro uppercase tracking-[0.08em] font-mono text-rd-text-eyebrow">
            {app.date_applied ? `Applied ${app.date_applied}` : "Saved"}
          </span>
          <span
            className="inline-flex items-center font-display font-bold rd-t-micro rounded-full px-1.5 py-0.5"
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
  justMoved,
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
          const tone = STATUS_TONE[status] || STATUS_TONE.interested;
          return (
            <Droppable droppableId={status} key={status}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  style={{
                    ...rv.style,
                    // Medium+ amplitude washes the column body with a faint band
                    // tint instead of the flat page; unset elsewhere → page.
                    ...(snapshot.isDraggingOver
                      ? null
                      : {
                          background:
                            "var(--rd-amp-kanban-body, var(--rd-bg-page))",
                        }),
                  }}
                  className={`${rv.className} flex-shrink-0 w-[220px] rd-r-lg p-2 transition-colors ${
                    snapshot.isDraggingOver ? "bg-rd-bg-soft" : ""
                  }`}
                >
                  {/* Header carries the status tint (not just the card avatar)
                      + a filled count chip — reads designed, not a board clone.
                      Mauve-forward amplitude fills it with vivid mauve; the label
                      then jumps to large-bold white (cx-kanban-label, amplitude.css)
                      so white-on-mauve rides the 3:1 large-bold floor, not 4.5. */}
                  <div
                    className="flex items-center justify-between gap-2 px-2 py-1.5 mb-2 rd-r-sm"
                    style={{
                      background: `var(--rd-amp-kanban-header, ${tone.tint})`,
                    }}
                  >
                    <span
                      className="cx-kanban-label font-display font-bold rd-t-body-s truncate"
                      style={{
                        color: `var(--rd-amp-kanban-label, ${tone.fg})`,
                      }}
                    >
                      {statusLabels[status] || status}
                    </span>
                    <span
                      className="flex-shrink-0 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rd-r-xs rd-t-micro font-mono font-bold bg-rd-bg-card"
                      style={{ color: tone.fg }}
                    >
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
                        {(dragProvided, dragSnapshot) => {
                          const node = (
                            <div
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              {...dragProvided.dragHandleProps}
                            >
                              <CanvasKanbanCard
                                app={app}
                                onClick={() => onCardClick?.(app)}
                                settling={app.id === justMoved}
                                dragging={dragSnapshot.isDragging}
                              />
                            </div>
                          );
                          // Portal the dragged card to <body> so the board's
                          // overflow-x-auto can't clip it (the fix for the lost
                          // visible drag). Placeholder keeps the source slot.
                          return dragSnapshot.isDragging
                            ? createPortal(node, document.body)
                            : node;
                        }}
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
