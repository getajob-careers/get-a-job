import { Users } from "lucide-react";

// Honest marker: this posting comes from a staffing/recruiting agency, so the
// role is a client placement/repost, not the agency's own headcount. Reads
// job.is_agency (propagated from companies_il.json at ingest). Renders nothing
// for direct-employer rows. Design restyles later — this is honesty, not polish.
export default function AgencyBadge({ isAgency, className = "" }) {
  if (!isAgency) return null;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[10px] bg-rd-golden-tint text-rd-golden-dark rounded-full px-1.5 py-0.5 whitespace-nowrap ${className}`}
      title="Posted by a staffing agency — this is a client placement, not the agency's own role"
    >
      <Users className="w-2.5 h-2.5" />
      via staffing agency
    </span>
  );
}
