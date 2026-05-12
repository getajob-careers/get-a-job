import React from "react";
import CompanyTargetCard from "./CompanyTargetCard";
import { STATUSES, STATUS_LABELS, STATUS_ACCENTS } from "./constants";

// 6-column kanban. Horizontally scrollable on mobile; grid on desktop.
// Each column displays its targets sorted by fit_score DESC (server
// already returns this ordering, but we re-sort defensively).

export default function CompanyTargetsKanban({ targets, onCardClick }) {
  const byStatus = STATUSES.reduce((acc, status) => {
    acc[status] = targets.filter((t) => t.status === status);
    return acc;
  }, {});

  return (
    <div className="overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0">
      <div className="grid grid-cols-6 gap-3 min-w-[1100px] lg:min-w-0">
        {STATUSES.map((status) => {
          const column = byStatus[status];
          return (
            <div key={status} className="flex flex-col min-h-[200px]">
              <div className="flex items-center justify-between mb-2 px-1">
                <span className={`inline-flex items-center px-2 py-0.5 text-[10px] uppercase tracking-wider font-medium rounded ${STATUS_ACCENTS[status]}`}>
                  {STATUS_LABELS[status]}
                </span>
                <span className="text-[10px] text-[#A3A3A3] tabular-nums">{column.length}</span>
              </div>
              <div className="flex-1">
                {column.length === 0 ? (
                  <div className="text-[11px] text-[#A3A3A3] italic px-1 py-2">No targets here yet.</div>
                ) : (
                  column.map((t) => (
                    <CompanyTargetCard key={t.id} target={t} onClick={() => onCardClick(t)} />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
