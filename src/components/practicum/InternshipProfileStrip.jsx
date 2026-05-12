import React, { useState } from "react";
import { ChevronDown, ChevronUp, RefreshCw, AlertCircle } from "lucide-react";

// Collapsible read-only summary of the user's internship_profiles row.
// Default state: collapsed (just the targets). Expanded: pitchable
// archetypes + skill gaps to close. Refresh button regenerates the
// whole row via generate-internship-profile.
//
// Staleness banner: when generated_from_career_roles_at is older than
// the most recent career_roles.updated_at, render a soft yellow nudge
// so the user knows their pitch strategy may no longer reflect their
// current roadmap.

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
    <div className="bg-white rounded-xl border border-[#E5E5E5] mb-5 overflow-hidden">
      {isStale && (
        <div className="flex items-start gap-2 px-4 py-2.5 bg-amber-50 border-b border-amber-100">
          <AlertCircle className="w-3.5 h-3.5 text-amber-700 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-amber-900">
              Your career roadmap changed since this pitch strategy was generated. Refresh to keep them in sync.
            </p>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshDisabled}
            className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium text-amber-900 bg-white border border-amber-200 hover:bg-amber-100 disabled:bg-amber-50 disabled:text-amber-400 disabled:cursor-not-allowed rounded transition-colors flex-shrink-0"
          >
            {refreshLoading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      )}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-start justify-between gap-3 p-4 text-left hover:bg-[#FAFAFA] transition-colors"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-[10px] uppercase tracking-wider text-[#A3A3A3] font-medium">Your pitch strategy</p>
          </div>
          {targets.length > 0 ? (
            <p className="text-sm text-[#0A0A0A] line-clamp-1">
              Targeting{" "}
              <span className="font-medium">{targets.slice(0, 4).join(", ")}</span>
              {targets.length > 4 && ` +${targets.length - 4} more`}
            </p>
          ) : (
            <p className="text-sm text-[#A3A3A3] italic">No targets captured yet.</p>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-[#A3A3A3] flex-shrink-0 mt-0.5" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[#A3A3A3] flex-shrink-0 mt-0.5" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-[#F0F0F0] pt-4 space-y-3">
          <ProfileSection title="Realistic stages" items={profile.realistic_company_stages} />
          <ProfileSection title="Realistic sectors" items={profile.realistic_sectors} />
          <ProfileSection title="Pitchable role archetypes" items={profile.pitchable_role_archetypes} />
          <ProfileSection title="Pitch strength signals" items={profile.pitch_strength_signals} />
          <ProfileSection title="Skill gaps to close" items={profile.skill_gaps_to_close} />
          {profile.tier_1_role_alignment && (
            <ProfileText title="Tier-1 alignment" text={profile.tier_1_role_alignment} />
          )}
          {profile.career_compound_rationale && (
            <ProfileText title="Career compound rationale" text={profile.career_compound_rationale} />
          )}

          <div className="pt-2 border-t border-[#F0F0F0] flex items-center justify-between gap-3">
            <p className="text-[11px] text-[#A3A3A3]">
              {profile.generated_from_career_roles_at
                ? `Generated ${new Date(profile.generated_from_career_roles_at).toLocaleDateString()}`
                : "Generation timestamp unavailable"}
            </p>
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshDisabled}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-white border border-[#E5E5E5] hover:bg-[#FAFAFA] disabled:bg-[#FAFAFA] disabled:text-[#A3A3A3] disabled:cursor-not-allowed text-[#525252] rounded-md transition-colors"
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
      <p className="text-[10px] uppercase tracking-wider text-[#A3A3A3] font-medium mb-1.5">{title}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, idx) => (
          <span
            key={`${title}-${idx}`}
            className="inline-flex items-center px-2 py-0.5 text-xs text-[#525252] bg-[#FAFAFA] border border-[#F0F0F0] rounded"
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
      <p className="text-[10px] uppercase tracking-wider text-[#A3A3A3] font-medium mb-1">{title}</p>
      <p className="text-xs text-[#525252] leading-relaxed">{text}</p>
    </div>
  );
}
