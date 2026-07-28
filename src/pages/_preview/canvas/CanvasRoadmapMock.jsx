// PROPOSAL - the live "Your matched roles" panel (Career.jsx / TopMatchesPanel),
// restyled AND given a real craft pass to the job-card standard. Structure is
// LOCKED (roles, tier badges, two-axis bars, skill chips, expand); this pass
// elevates the craft:
//   - hierarchy: the open role is the hero (stronger lift + a tier spine),
//     collapsed rows are calm and lift on hover
//   - motion: a grid-rows reveal on expand, the chevron rotates, and the two
//     bars DRAW IN (the sheen-arc language, borrowed from the score ring)
//   - the bars are the signature visual: top-lit sheen fill on a ghost track,
//     rounded cap, animated width
//   - tier badges carry presence: a solid tier dot + an inset sheen so they read
//     as raised chips, not painted tint
// The "+ to build" chips route to Skill hub. Placement: right rail of Browse Jobs.
// Fixture data (Noa - target RevOps Lead).
import React, { useEffect, useState } from "react";
import {
  Check,
  Plus,
  ChevronDown,
  ChevronRight,
  ArrowRight,
} from "lucide-react";

const GOAL = "RevOps Lead";
const REDUCE =
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const TIERS = {
  sweet: {
    name: "Sweet spot",
    dot: "bg-rd-primary",
    badgeBg: "bg-rd-primary-tint",
    badgeInk: "text-rd-primary-dark",
    fill: "var(--rd-primary)",
    track: "var(--rd-primary-tint)",
  },
  growth: {
    name: "Growth",
    dot: "bg-rd-golden",
    badgeBg: "bg-rd-golden-tint",
    badgeInk: "text-rd-golden-dark",
    fill: "var(--rd-golden)",
    track: "var(--rd-golden-tint)",
  },
  detour: {
    name: "Detour",
    dot: "bg-rd-teal",
    badgeBg: "bg-rd-teal-tint",
    badgeInk: "text-rd-teal-dark",
    fill: "var(--rd-teal)",
    track: "var(--rd-teal-tint)",
  },
};

// Sorted by fit (sweet -> growth -> detour), flat, each carrying its own badge.
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

// Signature bar - the fill is the sole carrier of magnitude (no numerals, per
// the live panel's RULINGS.md b). Top-lit sheen fill on a ghost track, rounded
// cap, width drawn in when the card is active (sheen-arc language).
function AxisBar({ label, value, tier, active }) {
  const v = Math.max(0, Math.min(100, value));
  const width = active ? `${v}%` : "0%";
  return (
    <div className="flex items-center gap-2.5">
      <span className="rd-t-micro text-rd-text-secondary w-[100px] flex-shrink-0">
        {label}
      </span>
      <span
        className="relative flex-1 h-2.5 rounded-full overflow-hidden"
        style={{ background: tier.track }}
      >
        <span
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width,
            background: tier.fill,
            transition: REDUCE
              ? "none"
              : "width 0.7s cubic-bezier(0.22, 0.61, 0.36, 1)",
          }}
        >
          <span className="absolute inset-x-0 top-0 h-1/2 rounded-full bg-white/25" />
        </span>
      </span>
    </div>
  );
}

function TierBadge({ tier }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full pl-1.5 pr-2.5 py-1 font-display font-semibold rd-t-micro ${tier.badgeBg} ${tier.badgeInk}`}
      style={{
        boxShadow:
          "inset 0 1px 0 rgba(255,251,245,0.6), 0 1px 2px rgba(74,44,22,0.08)",
      }}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${tier.dot}`} />
      {tier.name}
    </span>
  );
}

function SkillChip({ children, kind }) {
  const have = kind === "have";
  const Icon = have ? Check : Plus;
  const cls = have
    ? "bg-rd-teal-tint text-rd-teal-dark"
    : "bg-rd-golden-tint text-rd-golden-dark cursor-pointer hover:brightness-95 transition-[filter]";
  return (
    <span
      className={`inline-flex items-center gap-1 rd-r-xs rd-t-micro font-medium px-2 py-0.5 ${cls}`}
    >
      <Icon className="w-2.5 h-2.5" aria-hidden="true" />
      {children}
    </span>
  );
}

function RoleCard({ role, open, drawn, onToggle }) {
  const tier = TIERS[role.tier];
  return (
    <div
      className={`relative rd-lift rd-r-md overflow-hidden transition-shadow ${
        open ? "" : "rd-lift-hover"
      }`}
    >
      {/* tier spine - marks the active role */}
      {open && (
        <span
          className="absolute left-0 top-0 bottom-0 w-1"
          style={{ background: tier.fill }}
          aria-hidden="true"
        />
      )}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="relative w-full text-left px-3.5 py-3 flex items-center gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-rd-primary focus-visible:ring-inset"
      >
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${tier.dot}`} />
        <span className="flex-1 min-w-0 font-display font-bold rd-t-body-m leading-tight text-rd-text truncate">
          {role.title}
        </span>
        <TierBadge tier={tier} />
        <ChevronDown
          className="w-4 h-4 text-rd-text-secondary flex-shrink-0"
          aria-hidden="true"
          style={{
            transition: REDUCE ? "none" : "transform 0.2s ease",
            transform: open ? "rotate(180deg)" : "none",
          }}
        />
      </button>

      {/* grid-rows reveal - animates the natural height */}
      <div
        className="grid"
        style={{
          gridTemplateRows: open ? "1fr" : "0fr",
          transition: REDUCE ? "none" : "grid-template-rows 0.3s ease",
        }}
      >
        <div className="overflow-hidden">
          <div className="px-3.5 pb-3.5 pt-0.5">
            <div className="flex flex-col gap-2">
              <AxisBar
                label="Qualified now"
                value={role.qualified}
                tier={tier}
                active={open && drawn}
              />
              <AxisBar
                label={`Moves you to ${GOAL}`}
                value={role.path}
                tier={tier}
                active={open && drawn}
              />
            </div>

            <div className="flex flex-wrap gap-1.5 mt-3">
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

            <div className="flex items-center justify-between gap-3 mt-3">
              <button
                type="button"
                className="inline-flex items-center gap-1 rd-t-micro font-medium text-rd-primary-dark hover:text-rd-text transition-colors"
              >
                Full role detail
                <ChevronRight className="w-3 h-3" aria-hidden="true" />
              </button>
              {/* the "+ to build" chips route to Skill hub */}
              <button
                type="button"
                className="inline-flex items-center gap-1 rd-t-micro font-display font-bold text-rd-golden-dark hover:brightness-95 transition-[filter]"
              >
                Build in Skill hub
                <ArrowRight className="w-3 h-3" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CanvasRoadmapMock() {
  const [openId, setOpenId] = useState("revops-analyst");
  // Draw the bars in once mounted (and re-draw on each open) - the sheen-arc beat.
  const [drawn, setDrawn] = useState(REDUCE);
  useEffect(() => {
    const t = setTimeout(() => setDrawn(true), 90);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="rd-r-lg bg-rd-bg-soft p-4 mb-4 max-w-[368px]">
      <p className="rd-t-micro uppercase tracking-[0.09em] font-mono text-rd-text-eyebrow mb-2.5">
        Proposal · matched-roles panel (right rail)
      </p>

      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-display font-bold rd-t-display-m text-rd-text">
          Your matched roles
        </h3>
        <span className="rd-t-micro font-mono text-rd-text-secondary">
          {ROLES.length + 3} roles
        </span>
      </div>
      <p className="rd-t-micro text-rd-text-tertiary leading-[1.55] mt-1.5 mb-3.5">
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
            drawn={drawn}
            onToggle={() => setOpenId(openId === r.id ? null : r.id)}
          />
        ))}
      </div>
    </div>
  );
}
