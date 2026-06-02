import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

// Shared pitch UI — used by:
//   - browse/CompanyDetailDrawer (pitch from generate-internship-pitch cache)
//   - CompanyTargetDrawer (pitch fields persisted on company_targets)
//
// Both surfaces pass a `pitch` prop with the same shape:
//   { pitched_role, pitch_rationale, who_to_contact[], skill_gaps_this_fills[] }
// Surfaces choose what to render around it (combined-score tile,
// status/notes/timeline for kanban, action buttons for browse).
//
// Strings unified per PR5:
//   "Role to pitch" / "Your angle" / "Who to contact" / "Closes these gaps"
// "Your" addresses the student in second person, matching the
// pitch-prompt voice change that landed in the same PR.

const SUB_LABEL = "text-[10px] uppercase tracking-[0.09em] font-mono text-rd-text-eyebrow font-medium mb-1";
const SUB_BODY  = "text-xs text-rd-text-secondary leading-relaxed";

export default function PitchSection({ pitch, loading, error, emptyMessage }) {
  if (loading) return <PitchSkeleton />;
  if (error) {
    return <p className="text-xs text-rd-coral-dark">{String(error.message || error)}</p>;
  }
  if (!pitch) {
    return <p className="text-xs text-rd-text-tertiary">{emptyMessage || "No pitch available."}</p>;
  }

  const role = pitch.pitched_role;
  const angle = pitch.pitch_rationale;
  const contacts = Array.isArray(pitch.who_to_contact) ? pitch.who_to_contact : [];
  const gaps = Array.isArray(pitch.skill_gaps_this_fills) ? pitch.skill_gaps_this_fills : [];

  return (
    <>
      {role && (
        <SubSection label="Role to pitch">
          <p className="text-sm font-display font-bold text-rd-text">{role}</p>
        </SubSection>
      )}
      {angle && (
        <SubSection label="Your angle">
          <p className={SUB_BODY}>{angle}</p>
        </SubSection>
      )}
      {contacts.length > 0 && (
        <SubSection label="Who to contact">
          <p className={SUB_BODY}>{contacts.join(" · ")}</p>
        </SubSection>
      )}
      {gaps.length > 0 && (
        <SubSection label="Closes these gaps">
          <div className="flex flex-wrap gap-1.5">
            {gaps.map((g, i) => (
              <span
                key={i}
                className="inline-flex items-center px-2 py-0.5 text-xs text-rd-text-secondary bg-rd-bg-soft border border-rd-border rounded-full"
              >
                {g}
              </span>
            ))}
          </div>
        </SubSection>
      )}
    </>
  );
}

function SubSection({ label, children }) {
  return (
    <div className="mb-3 last:mb-0">
      <p className={SUB_LABEL}>{label}</p>
      {children}
    </div>
  );
}

function PitchSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-3">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-5/6" />
      <Skeleton className="h-3 w-1/4" />
    </div>
  );
}
