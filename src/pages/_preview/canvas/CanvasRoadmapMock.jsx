// PROPOSAL - the live "Your matched roles" panel (Career.jsx / TopMatchesPanel),
// RESTYLED in canvas language. Structure is preserved 1:1, NOT restructured:
//   - a flat list of ROLES (no companies), sorted by fit
//   - each role = an expandable card carrying its tier badge ON the role
//     (Sweet spot / Growth / Detour - a badge, never section buckets)
//   - expanded: the two-axis bars (Qualified now / Moves you to <target>),
//     skill chips (check = have, plus = to build), and Full role detail
//   - the two-axis explainer line up top
// Canvas treatment: paper-lift cards, Clay tier tints, the type scale, sheened
// axis bars. The "+ to build" chips route to Skill hub. Placement: right rail of
// Browse Jobs, beside the matches grid. Fixture data (Noa · target RevOps Lead).
import React, { useState } from "react";
import {
  Check,
  Plus,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ArrowRight,
} from "lucide-react";

const GOAL = "RevOps Lead";

const TIERS = {
  sweet: {
    name: "Sweet spot",
    dot: "bg-rd-coral",
    badgeBg: "bg-rd-coral-tint",
    badgeInk: "text-rd-coral-dark",
    barFill: "bg-rd-coral",
    barTrack: "bg-rd-coral-tint",
  },
  growth: {
    name: "Growth",
    dot: "bg-rd-golden",
    badgeBg: "bg-rd-golden-tint",
    badgeInk: "text-rd-golden-dark",
    barFill: "bg-rd-golden",
    barTrack: "bg-rd-golden-tint",
  },
  detour: {
    name: "Detour",
    dot: "bg-rd-teal",
    badgeBg: "bg-rd-teal-tint",
    badgeInk: "text-rd-teal-dark",
    barFill: "bg-rd-teal",
    barTrack: "bg-rd-teal-tint",
  },
};

// Sorted by fit (sweet → growth → detour), flat, each carrying its own badge.
const ROLES = [
  {
    id: "revops-analyst",
    title: "Revenue Operations Analyst",
    tier: "sweet",
    qualified: 88,
    path: 84,
    have: ["Analytical Thinking", "SQL", "Dashboarding", "Stakeholder Comms"],
    build: ["Salesforce / CRM Ops", "Revenue Forecasting"],
  },
  {
    id: "sales-ops-lead",
    title: "Sales Operations Lead",
    tier: "growth",
    qualified: 64,
    path: 88,
    have: ["Analytical Thinking", "SQL", "Process Design"],
    build: ["Salesforce Admin", "Team Leadership", "Forecasting"],
  },
  {
    id: "bizops-manager",
    title: "BizOps Manager",
    tier: "growth",
    qualified: 58,
    path: 90,
    have: ["Analytical Thinking", "Stakeholder Comms"],
    build: ["Strategic Planning", "SQL Modeling", "People Management"],
  },
  {
    id: "revops-manager",
    title: "Revenue Operations Manager",
    tier: "growth",
    qualified: 55,
    path: 92,
    have: ["Dashboarding", "Stakeholder Comms"],
    build: ["RevOps Systems", "Revenue Forecasting", "Team Leadership"],
  },
  {
    id: "data-analyst",
    title: "Data Analyst",
    tier: "detour",
    qualified: 90,
    path: 48,
    have: ["SQL", "Excel modeling", "Dashboarding", "Statistics"],
    build: ["dbt / Pipelines"],
  },
  {
    id: "marketing-analyst",
    title: "Marketing Analyst",
    tier: "detour",
    qualified: 82,
    path: 40,
    have: ["Excel modeling", "Dashboarding", "A/B Testing"],
    build: ["Marketing Attribution"],
  },
];

// Axis bar - the fill is the sole carrier of magnitude (no numerals, per the
// live panel's RULINGS.md (b)). A top sheen strip gives it the soft-3D read.
function AxisBar({ label, value, tier }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="flex items-center gap-2">
      <span className="rd-t-micro text-rd-text-secondary w-[104px] flex-shrink-0">
        {label}
      </span>
      <span
        className={`relative flex-1 h-2 rounded-full overflow-hidden ${tier.barTrack}`}
      >
        <span
          className={`relative block h-full rounded-full ${tier.barFill}`}
          style={{ width: `${v}%` }}
        >
          <span className="absolute inset-x-0 top-0 h-1/2 rounded-full bg-white/25" />
        </span>
      </span>
    </div>
  );
}

function SkillChip({ children, kind }) {
  const have = kind === "have";
  const Icon = have ? Check : Plus;
  const cls = have
    ? "bg-rd-teal-tint text-rd-teal-dark"
    : "bg-rd-golden-tint text-rd-golden-dark hover:brightness-95";
  return (
    <span
      className={`inline-flex items-center gap-1 rd-r-xs rd-t-micro font-medium px-2 py-0.5 ${cls} ${!have ? "cursor-pointer transition-[filter]" : ""}`}
    >
      <Icon className="w-2.5 h-2.5" aria-hidden="true" />
      {children}
    </span>
  );
}

function RoleCard({ role, open, onToggle }) {
  const tier = TIERS[role.tier];
  const expandable = role.qualified != null;
  return (
    <div className="rd-lift rd-r-md bg-rd-bg-card overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full text-left px-3 py-2.5 flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-rd-coral focus-visible:ring-inset"
      >
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${tier.dot}`} />
        <span className="flex-1 min-w-0 font-display font-bold rd-t-body-s leading-tight text-rd-text truncate">
          {role.title}
        </span>
        <span
          className={`font-display font-semibold rd-t-micro rounded-full px-2 py-0.5 ${tier.badgeBg} ${tier.badgeInk}`}
        >
          {tier.name}
        </span>
        {open ? (
          <ChevronUp
            className="w-3.5 h-3.5 text-rd-text-secondary flex-shrink-0"
            aria-hidden="true"
          />
        ) : (
          <ChevronDown
            className="w-3.5 h-3.5 text-rd-text-secondary flex-shrink-0"
            aria-hidden="true"
          />
        )}
      </button>

      {open && expandable && (
        <div className="px-3 pb-3">
          <div className="flex flex-col gap-1.5">
            <AxisBar label="Qualified now" value={role.qualified} tier={tier} />
            <AxisBar
              label={`Moves you to ${GOAL}`}
              value={role.path}
              tier={tier}
            />
          </div>

          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {role.have.map((s) => (
              <SkillChip key={s} kind="have">
                {s}
              </SkillChip>
            ))}
            {role.build.map((s) => (
              <SkillChip key={s} kind="build">
                {s}
              </SkillChip>
            ))}
          </div>

          <div className="flex items-center justify-between gap-3 mt-2.5">
            <button
              type="button"
              className="inline-flex items-center gap-1 rd-t-micro font-medium text-rd-coral-dark hover:text-rd-text transition-colors"
            >
              Full role detail
              <ChevronRight className="w-3 h-3" aria-hidden="true" />
            </button>
            {/* the "+ to build" chips tie to Skill hub */}
            <button
              type="button"
              className="inline-flex items-center gap-1 rd-t-micro font-display font-bold text-rd-golden-dark hover:brightness-95 transition-[filter]"
            >
              Build in Skill hub
              <ArrowRight className="w-3 h-3" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CanvasRoadmapMock() {
  const [openId, setOpenId] = useState("revops-analyst");
  return (
    <div className="rd-r-lg bg-rd-bg-soft p-4 mb-4 max-w-[360px]">
      <p className="rd-t-micro uppercase tracking-[0.09em] font-mono text-rd-text-eyebrow mb-2">
        Proposal · matched-roles panel restyle (right rail)
      </p>

      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-display font-bold rd-t-display-s text-rd-text">
          Your matched roles
        </h3>
        <span className="rd-t-micro text-rd-text-secondary">
          {ROLES.length + 3} roles
        </span>
      </div>
      <p className="rd-t-micro text-rd-text-tertiary leading-[1.5] mt-1.5 mb-3">
        Why you&apos;re matched: every role is scored on two axes - how{" "}
        <b className="text-rd-text font-semibold">qualified</b> you are now, and
        how well it{" "}
        <b className="text-rd-text font-semibold">moves you toward {GOAL}</b>.
      </p>

      <div className="flex flex-col gap-2">
        {ROLES.map((r) => (
          <RoleCard
            key={r.id}
            role={r}
            open={openId === r.id}
            onToggle={() => setOpenId(openId === r.id ? null : r.id)}
          />
        ))}
      </div>
    </div>
  );
}
