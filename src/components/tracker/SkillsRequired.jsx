import React, { useMemo } from "react";
import { CheckCircle2, Circle, AlertCircle, Sparkles } from "lucide-react";
import { computeSkillMatch } from "@/lib/skillMatch";
import { humanizeSkillId } from "@/lib/humanizeSkillId";
import { cn } from "@/lib/utils";

// Live-derived Skills tab: intersects the job's required skills
// (applications.skills_required = { core: [...ids], nice: [...ids] })
// with the user's current canonical skills (profile.skills_canonical)
// on every render. Gaps move to strengths the instant the user adds
// the skill in Profile — nothing is frozen here.
//
// Storage shape is set at JobCard track time (the only jobs-cache-sourced
// insert path). Non-ATS rows (manual paste, chat agent) currently land
// with skills_required = null and render the empty state — JD extraction
// for those flows is the follow-up PR.

export default function SkillsRequired({ app, profile }) {
  const userCanonical = profile?.skills_canonical || [];
  const required = app?.skills_required || null;
  const hasAnyRequirements =
    Array.isArray(required?.core) && required.core.length > 0 ||
    Array.isArray(required?.nice) && required.nice.length > 0;

  const match = useMemo(
    () => computeSkillMatch(required || { core: [], nice: [] }, userCanonical),
    [required, userCanonical],
  );

  if (!hasAnyRequirements) {
    return (
      <div className="space-y-3">
        <SectionLabel>Skills Required for This Role</SectionLabel>
        <EmptyState />
      </div>
    );
  }

  const totalRequired = (required?.core?.length || 0) + (required?.nice?.length || 0);
  const totalMatched = match.matchedCore.length + match.matchedNice.length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <SectionLabel>Skills Required for This Role</SectionLabel>
        <p className="text-[11px] font-mono text-rd-text-tertiary">
          {totalMatched} of {totalRequired} matched
        </p>
      </div>

      {/* Strengths — matched core OR nice, surfaced first so the user
          sees what they bring before what they lack. */}
      {(match.matchedCore.length > 0 || match.matchedNice.length > 0) && (
        <SkillGroup
          label="Your strengths"
          tone="strength"
          ids={[...match.matchedCore, ...match.matchedNice]}
        />
      )}

      {/* Missing core — prominent coral. These are must-haves. */}
      {match.missingCore.length > 0 && (
        <SkillGroup
          label="Missing core requirements"
          tone="missing-core"
          ids={match.missingCore}
        />
      )}

      {/* Missing nice — muted. Not blocking. */}
      {match.missingNice.length > 0 && (
        <SkillGroup
          label="Nice-to-haves you don't have yet"
          tone="missing-nice"
          ids={match.missingNice}
        />
      )}
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <p className="text-[10.5px] uppercase tracking-[0.09em] font-mono font-medium text-rd-text-eyebrow">
      {children}
    </p>
  );
}

function SkillGroup({ label, tone, ids }) {
  const { Icon, chipClass } = TONE_STYLES[tone];
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-display font-semibold text-rd-text-secondary">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {ids.map((id) => (
          <span
            key={id}
            className={cn(
              "inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full",
              chipClass,
            )}
          >
            <Icon className="w-2.5 h-2.5" />
            {humanizeSkillId(id)}
          </span>
        ))}
      </div>
    </div>
  );
}

const TONE_STYLES = {
  strength: {
    Icon: CheckCircle2,
    chipClass: "bg-rd-teal-tint text-rd-teal-dark",
  },
  "missing-core": {
    Icon: AlertCircle,
    chipClass: "bg-rd-coral-tint text-rd-coral-dark",
  },
  "missing-nice": {
    Icon: Circle,
    chipClass: "bg-rd-bg-soft text-rd-text-tertiary border border-rd-border",
  },
};

function EmptyState() {
  return (
    <div className="rounded-[12px] border border-rd-border bg-rd-bg-soft px-4 py-5 text-center">
      <Sparkles className="w-5 h-5 text-rd-text-tertiary mx-auto mb-2" />
      <p className="text-[12.5px] text-rd-text-secondary leading-[1.55]">
        No extracted requirements for this role yet.
      </p>
      <p className="text-[11.5px] text-rd-text-tertiary mt-1 leading-[1.5]">
        Jobs tracked from the Browse feed auto-fill this view once the role's
        requirements are extracted (usually within 24 hours of posting).
      </p>
    </div>
  );
}
