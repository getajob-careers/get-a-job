import React, { useState } from "react";
import { ChevronDown, ChevronUp, RefreshCw, AlertCircle } from "lucide-react";

// Collapsible read-only summary of the user's internship_profiles row.
// Default state: collapsed (just the targets). Expanded: pitchable
// archetypes + skill gaps to close. Refresh button regenerates the
// whole row via generate-internship-profile.
//
// Staleness banner: when generated_from_career_roles_at is older than
// the most recent career_roles.created_at (career_roles rows are
// replaced wholesale each analysis run — there's no updated_at
// column), render a soft yellow nudge so the user knows their pitch
// strategy may no longer reflect their current roadmap.

export default function InternshipProfileStrip({
  profile,
  onRefresh,
  refreshDisabled,
  refreshLoading,
  latestCareerRolesUpdatedAt,
}) {
  const [expanded, setExpanded] = useState(false);

  if (!profile) return null;

  const isStale = (() => {
    if (!latestCareerRolesUpdatedAt) return false;
    if (!profile.generated_from_career_roles_at) return true;
    return latestCareerRolesUpdatedAt > profile.generated_from_career_roles_at;
  })();

  const targets = [
    ...(profile.realistic_company_stages || []),
    ...(profile.realistic_sectors || []),
  ].filter(Boolean);

  return (
    <div className="bg-rd-bg-card rounded-[14px] border border-rd-border mb-5 overflow-hidden">
      {isStale && (
        <div className="flex items-start gap-2 px-4 py-2.5 bg-rd-golden-tint border-b border-rd-golden/40">
          <AlertCircle className="w-3.5 h-3.5 text-rd-golden-dark flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-rd-golden-dark">
              Your career roadmap changed since this pitch strategy was generated. Refresh to keep them in sync.
            </p>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshDisabled}
            className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-display font-semibold text-rd-golden-dark bg-rd-bg-card border border-rd-golden/40 hover:bg-rd-golden-tint disabled:opacity-50 disabled:cursor-not-allowed rounded-full transition-colors flex-shrink-0"
          >
            {refreshLoading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      )}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-start justify-between gap-3 p-4 text-left hover:bg-rd-bg-soft transition-colors"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-[10px] uppercase tracking-[0.09em] font-mono font-medium text-rd-text-eyebrow">Your pitch strategy</p>
          </div>
          {targets.length > 0 ? (
            <p className="text-sm text-rd-text line-clamp-1">
              Targeting{" "}
              <span className="font-display font-semibold">{targets.slice(0, 4).join(", ")}</span>
              {targets.length > 4 && ` +${targets.length - 4} more`}
            </p>
          ) : (
            <p className="text-sm text-rd-text-tertiary italic">No targets captured yet.</p>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-rd-text-tertiary flex-shrink-0 mt-0.5" />
        ) : (
          <ChevronDown className="w-4 h-4 text-rd-text-tertiary flex-shrink-0 mt-0.5" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-rd-border-subtle pt-4 space-y-3">
          <ProfileSection title="Realistic stages" items={profile.realistic_company_stages} />
          <ProfileSection title="Realistic sectors" items={profile.realistic_sectors} />
          <ProfileSection title="Pitchable role archetypes" items={profile.pitchable_role_archetypes} />
          <ProfileSection title="Pitch strength signals" items={profile.pitch_strength_signals} />
          <ProfileSection title="Skill gaps to close" items={profile.skill_gaps_to_close} />
          {profile.track_1_role_alignment && (
            <ProfileText title="Track-1 alignment" text={profile.track_1_role_alignment} />
          )}
          {profile.career_compound_rationale && (
            <ProfileText title="Career compound rationale" text={profile.career_compound_rationale} />
          )}

          <div className="pt-2 border-t border-rd-border-subtle flex items-center justify-between gap-3">
            <p className="text-[11px] text-rd-text-tertiary">
              {profile.generated_from_career_roles_at
                ? `Generated ${new Date(profile.generated_from_career_roles_at).toLocaleDateString()}`
                : "Generation timestamp unavailable"}
            </p>
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshDisabled}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-display font-semibold bg-rd-bg-card border border-rd-border hover:bg-rd-bg-soft disabled:opacity-50 disabled:cursor-not-allowed text-rd-text-secondary rounded-full transition-colors"
              title="Regenerate pitch strategy"
            >
              <RefreshCw className={`w-3 h-3 ${refreshLoading ? "animate-spin" : ""}`} />
              {refreshLoading ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileSection({ title, items }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.09em] font-mono font-medium text-rd-text-eyebrow mb-1.5">{title}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, idx) => (
          <span
            key={`${title}-${idx}`}
            className="inline-flex items-center px-2 py-0.5 text-xs text-rd-text-secondary bg-rd-bg-soft border border-rd-border rounded-full"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function ProfileText({ title, text }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.09em] font-mono font-medium text-rd-text-eyebrow mb-1">{title}</p>
      <p className="text-xs text-rd-text-secondary leading-relaxed">{text}</p>
    </div>
  );
}
