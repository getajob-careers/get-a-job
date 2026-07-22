import React from "react";
import { Pencil, Trash2 } from "lucide-react";

// PR 3F — restyled on rd-* tokens. Pure presentational primitive for
// entity items rendered under the Education page (certifications now,
// courses in PR 3). No data ops, no state. The parent owns query, form,
// save, delete.
//
// Tokens match the per-row education card in EducationTab.jsx so rows
// sit consistently in the same list. The caller can override the icon
// chip's tint via `iconBg` (defaults to the warm peach tint) — used so
// each entity family has its own visual key (golden for certifications,
// teal for education).
export default function EntityCard({
  icon,
  iconBg = "bg-rd-primary-tint",
  title,
  subtitle,
  statusBadge,
  description,
  metaLine,
  onEdit,
  onDelete,
  entityId,
}) {
  return (
    <div
      data-entity-id={entityId}
      className="rounded-[18px] border border-rd-border bg-rd-bg-card p-5 flex items-start gap-3 shadow-rd hover:border-rd-border-hover transition-colors"
    >
      <div className={`w-10 h-10 rounded-[12px] ${iconBg} flex items-center justify-center flex-shrink-0`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-display font-bold text-[13.5px] text-rd-text truncate">{title}</p>
          {statusBadge}
        </div>
        {subtitle && (
          <p className="text-[12px] text-rd-text-secondary truncate">{subtitle}</p>
        )}
        {description && (
          <p className="text-[12px] text-rd-text-secondary mt-1 line-clamp-2 leading-[1.5]">{description}</p>
        )}
        {metaLine && (
          <p className="text-[11px] text-rd-text-tertiary mt-1 truncate">{metaLine}</p>
        )}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-1.5 text-[12px] text-rd-text-secondary hover:text-rd-text hover:bg-rd-bg-soft rounded-full px-2.5 py-1.5 transition-colors"
            aria-label="Edit"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center gap-1.5 text-[12px] text-rd-text-secondary hover:text-rd-primary-dark hover:bg-rd-bg-soft rounded-full px-2.5 py-1.5 transition-colors"
            aria-label="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
