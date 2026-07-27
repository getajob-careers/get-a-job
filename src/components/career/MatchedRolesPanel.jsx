import React from "react";
import { Link } from "react-router-dom";
import {
  Check,
  Plus,
  ChevronUp,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { createPageUrl } from "@/utils";
import { humanizeSkillId } from "@/lib/humanizeSkillId";

// The "Your matched roles" why-panel. Extracted verbatim from Career.jsx so
// the Browse Jobs tab (ThreeTabHome) can render the SAME panel beside the feed
// without forking a second implementation. Presentational + controlled: the
// caller owns the role list, the expand state, and the goal name; this renders.
//
// Two size tiers. `compact` reproduces Career's original inline classes
// byte-for-byte (Career must stay byte-identical). `comfortable` gives the
// panel real width + type on the roomier Browse Jobs layout (the ~39% Career
// column squeezed it).

const toPct = (v) => Math.max(0, Math.min(100, Math.round((v ?? 0) * 100)));

// Band styling per track - the used subset of Career's TRACK_BAND (the retired
// track-card icon/circle/activeBorder fields are dropped; only the row's dot,
// chip tint, and bar colours are read here).
const TRACK_BAND = [
  {
    key: "track_1",
    tintBg: "bg-rd-primary-tint",
    ink: "text-rd-primary-dark",
    dot: "bg-rd-primary",
    barFill: "bg-rd-primary",
    barTrack: "bg-rd-primary-tint",
  },
  {
    key: "track_2",
    tintBg: "bg-rd-teal-tint",
    ink: "text-rd-teal-dark",
    dot: "bg-rd-teal",
    barFill: "bg-rd-teal",
    barTrack: "bg-rd-teal-tint",
  },
  {
    key: "track_3",
    tintBg: "bg-rd-golden-tint",
    ink: "text-rd-golden-dark",
    dot: "bg-rd-golden",
    barFill: "bg-rd-golden",
    barTrack: "bg-rd-golden-tint",
  },
];

const TRACK_NAMES = {
  track_1: "Sweet spot",
  track_2: "Detour",
  track_3: "Growth",
};

// Tier-before-score sort: sweet spot (track_1), then growth (track_3), then
// detour (track_2); match_score DESC within a tier. Unknown tracks last. Pure
// helper so Career and ThreeTabHome share ONE ordering (no drift), and each
// keeps its own expand state + page-context reporting.
export function sortMatchedRoles(roles) {
  const TIER_ORDER = { track_1: 0, track_3: 1, track_2: 2 };
  return [...roles].sort((a, b) => {
    const ta = TIER_ORDER[a.track] ?? 99;
    const tb = TIER_ORDER[b.track] ?? 99;
    if (ta !== tb) return ta - tb;
    return (b.match_score ?? 0) - (a.match_score ?? 0);
  });
}

// First matched role opens by default; falls back to the top role once the user
// collapses the open one (the closed-<id> sentinel never matches a real id).
export function resolveActiveRoleId(sortedRoles, expandedRoleId) {
  return expandedRoleId && sortedRoles.some((r) => r.id === expandedRoleId)
    ? expandedRoleId
    : (sortedRoles[0]?.id ?? null);
}

const SIZES = {
  compact: {
    root: "bg-rd-bg-page border border-rd-border-subtle rounded-[16px] p-3.5",
    headerRow: "flex items-center justify-between mb-2",
    title: "font-display font-bold text-[14px] text-rd-text",
    count: "text-[10.5px] text-rd-text-secondary",
    desc: "text-[10.5px] leading-[1.5] text-rd-text-tertiary mb-2.5",
    list: "flex flex-col gap-2",
    empty: "text-[12px] text-rd-text-secondary px-1 py-2",
    card: "bg-rd-bg-card border border-rd-border rounded-[12px] overflow-hidden",
    toggle: "w-full text-left px-3 py-2.5 flex items-center gap-2",
    roleTitle:
      "flex-1 min-w-0 font-display font-bold text-[12.5px] leading-[1.25] text-rd-text",
    chip: "font-display font-semibold text-[10px] rounded-full px-2 py-0.5",
    body: "px-3 pb-3",
    skillsWrap: "flex flex-wrap gap-1.5 mt-2.5",
    skill:
      "inline-flex items-center gap-1 text-[10px] rounded-[6px] px-2 py-0.5",
    skillIcon: "w-2.5 h-2.5",
    link: "inline-flex items-center gap-1 mt-2.5 text-[11px] font-medium text-rd-primary-dark hover:text-rd-text transition-colors",
    axisLabel: "text-[10px] text-rd-text-secondary w-[104px] flex-shrink-0",
    axisTrack: "flex-1 h-1.5 rounded-full",
  },
  comfortable: {
    root: "bg-rd-bg-page border border-rd-border-subtle rounded-[18px] p-5",
    headerRow: "flex items-center justify-between mb-3",
    title: "font-display font-bold text-[16px] text-rd-text",
    count: "text-[11.5px] text-rd-text-secondary",
    desc: "text-[12px] leading-[1.55] text-rd-text-tertiary mb-4",
    list: "flex flex-col gap-2.5",
    empty: "text-[13px] text-rd-text-secondary px-1 py-2",
    card: "bg-rd-bg-card border border-rd-border rounded-[14px] overflow-hidden",
    toggle: "w-full text-left px-4 py-3 flex items-center gap-2.5",
    roleTitle:
      "flex-1 min-w-0 font-display font-bold text-[14px] leading-[1.3] text-rd-text",
    chip: "font-display font-semibold text-[11px] rounded-full px-2.5 py-0.5",
    body: "px-4 pb-4",
    skillsWrap: "flex flex-wrap gap-1.5 mt-3",
    skill:
      "inline-flex items-center gap-1 text-[11px] rounded-[7px] px-2.5 py-1",
    skillIcon: "w-3 h-3",
    link: "inline-flex items-center gap-1 mt-3 text-[12px] font-medium text-rd-primary-dark hover:text-rd-text transition-colors",
    axisLabel: "text-[11px] text-rd-text-secondary w-[120px] flex-shrink-0",
    axisTrack: "flex-1 h-2 rounded-full",
  },
};

function AxisBar({ label, value, fill, track, sz }) {
  // RULINGS.md (b): explanatory axes render as bars with NO numerals. The bar
  // fill is the sole carrier of magnitude; the label names the axis. Keep it
  // numeral-free.
  const v = Math.max(0, Math.min(100, value || 0));
  return (
    <div className="flex items-center gap-2">
      <span className={sz.axisLabel}>{label}</span>
      <span className={`${sz.axisTrack} ${track} overflow-hidden`}>
        <span
          className={`block h-full rounded-full ${fill}`}
          style={{ width: `${v}%` }}
        />
      </span>
    </div>
  );
}

export default function MatchedRolesPanel({
  roles,
  goalName,
  expandedId,
  onToggle,
  size = "compact",
  scrollSelf = false,
  scrollAt = "md",
  isLoading = false,
  className = "",
}) {
  const sz = SIZES[size] || SIZES.compact;
  // The breakpoint at which the panel owns its own scroll. Career passes the
  // default "md" (byte-identical to its original inline layout). ThreeTabHome
  // passes "lg" because it lives inside the coach shell rail: below lg its
  // content region is too narrow to sit the panel beside the feed, so it stacks
  // (no self-scroll - the jobs container scrolls the whole stack) and only owns
  // its scroll once side-by-side at lg.
  const rootScroll = scrollSelf
    ? scrollAt === "lg"
      ? " lg:h-full lg:overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      : " md:h-full md:overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    : " md:self-start";

  return (
    <div
      className={`${sz.root}${rootScroll}${className ? ` ${className}` : ""}`}
    >
      <div className={sz.headerRow}>
        <span className={sz.title}>Your matched roles</span>
        <span className={sz.count}>
          {roles.length} {roles.length === 1 ? "role" : "roles"}
        </span>
      </div>
      <p className={sz.desc}>
        Why you&apos;re matched: every role is scored on two axes - how{" "}
        <b className="text-rd-text">qualified</b> you are now, and how well it{" "}
        <b className="text-rd-text">moves you toward {goalName}</b>.
        {/* Sort disclosure (Eli PR-D item 6): the list order is deliberate -
            surface it. Comfortable-only so Career's compact render stays
            byte-identical. Mirrors sortMatchedRoles (tier before score). */}
        {size === "comfortable" && (
          <>
            {" "}
            Roles on your goal path are listed first, then by match strength.
          </>
        )}
      </p>
      <div className={sz.list}>
        {isLoading && roles.length === 0 && (
          <p className={sz.empty} aria-live="polite">
            Finding your matched roles…
          </p>
        )}
        {!isLoading && roles.length === 0 && (
          <p className={sz.empty}>No matched roles yet.</p>
        )}
        {roles.map((r) => {
          const expanded = r.id === expandedId;
          // Each role carries its OWN track band (the list is mixed-track).
          // Fall back to track_1 styling if the stored track is unrecognized so
          // a row never renders without a colour.
          const band =
            TRACK_BAND.find((t) => t.key === r.track) || TRACK_BAND[0];
          const trackName = TRACK_NAMES[r.track];
          // RULINGS.md (e): null score columns NEVER render as 0%. Compute
          // "available" from the raw nulls (not the coalesced fallback) so a
          // genuinely-missing column omits its bar entirely. readiness_score
          // falls back to match_score for display; both null is the only case
          // that omits the qualified bar.
          const qualifiedRaw = r.readiness_score ?? r.match_score;
          const qualifiedAvailable =
            qualifiedRaw !== null && qualifiedRaw !== undefined;
          const pathAvailable =
            r.goal_alignment_score !== null &&
            r.goal_alignment_score !== undefined;
          const qualified = toPct(qualifiedRaw);
          const path = toPct(r.goal_alignment_score);
          const matched = (r.matched_skills || []).slice(0, 4);
          const gaps = (r.missing_skills || []).slice(0, 3);
          return (
            <div key={r.id} className={sz.card}>
              <button
                onClick={() => onToggle(expanded ? `closed-${r.id}` : r.id)}
                aria-expanded={expanded}
                className={`${sz.toggle} transition-colors hover:bg-rd-bg-soft active:bg-rd-border-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-rd-primary`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${band.dot} flex-shrink-0`}
                />
                <span className={sz.roleTitle}>{r.title}</span>
                {trackName && (
                  <span className={`${sz.chip} ${band.tintBg} ${band.ink}`}>
                    {trackName}
                  </span>
                )}
                {expanded ? (
                  <ChevronUp className="w-3.5 h-3.5 text-rd-text-secondary flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-rd-text-secondary flex-shrink-0" />
                )}
              </button>
              {expanded && (
                <div className={sz.body}>
                  {(qualifiedAvailable || pathAvailable) && (
                    <div className="flex flex-col gap-1.5">
                      {qualifiedAvailable && (
                        <AxisBar
                          label="Qualified now"
                          value={qualified}
                          fill={band.barFill}
                          track={band.barTrack}
                          sz={sz}
                        />
                      )}
                      {pathAvailable && (
                        <AxisBar
                          label={`Moves you to ${goalName}`}
                          value={path}
                          fill={band.barFill}
                          track={band.barTrack}
                          sz={sz}
                        />
                      )}
                    </div>
                  )}
                  {(matched.length > 0 || gaps.length > 0) && (
                    <div className={sz.skillsWrap}>
                      {matched.map((s) => (
                        <span
                          key={s}
                          className={`${sz.skill} bg-rd-teal-tint text-rd-teal-dark`}
                        >
                          <Check className={sz.skillIcon} />{" "}
                          {humanizeSkillId(s)}
                        </span>
                      ))}
                      {gaps.map((s) => (
                        <span
                          key={s}
                          className={`${sz.skill} bg-rd-golden-tint text-rd-golden-dark`}
                        >
                          <Plus className={sz.skillIcon} /> {humanizeSkillId(s)}
                        </span>
                      ))}
                    </div>
                  )}
                  <Link to={createPageUrl("Roadmap")} className={sz.link}>
                    Full role detail <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
