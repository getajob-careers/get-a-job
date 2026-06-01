import React from "react";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";

// Shared presentational card primitive for entity items rendered under
// the Education page (certifications now, courses in PR 3). Pure render —
// no data ops, no state. The parent owns query, form, save, delete.
//
// Tokens match the existing education card row in EducationTab.jsx so the
// rows sit consistently in the same list. Subtitle / description / meta /
// statusBadge are all optional and gracefully omit when absent.
export default function EntityCard({
  icon,
  title,
  subtitle,
  statusBadge,
  description,
  metaLine,
  onEdit,
  onDelete,
}) {
  return (
    <div className="bg-white rounded-xl border border-[#DDDDDB] p-4 flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg bg-[#E8E8E5] flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-[#0E1014] truncate">{title}</p>
          {statusBadge}
        </div>
        {subtitle && (
          <p className="text-xs text-[#52545A] truncate">{subtitle}</p>
        )}
        {description && (
          <p className="text-xs text-[#52545A] mt-1 line-clamp-2">{description}</p>
        )}
        {metaLine && (
          <p className="text-[11px] text-[#9C9DA1] mt-1 truncate">{metaLine}</p>
        )}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {onEdit && (
          <Button variant="ghost" size="sm" onClick={onEdit} aria-label="Edit">
            <Pencil className="w-3.5 h-3.5 text-[#9C9DA1]" />
          </Button>
        )}
        {onDelete && (
          <Button variant="ghost" size="sm" onClick={onDelete} aria-label="Delete">
            <Trash2 className="w-3.5 h-3.5 text-[#9C9DA1] hover:text-red-500" />
          </Button>
        )}
      </div>
    </div>
  );
}
