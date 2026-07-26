// Browse Jobs tab content for the 3-tab homepage demo (Home3TabPreview.jsx).
//
// The real <UnifiedJobsFeed/> gates on real career_roles data to build its
// job query - a reviewing account with none renders it empty, which isn't
// representative of what this tab is meant to show. This rebuilds the same
// visual shape (tab toggle, filter bar, job grid, matched-roles rail) from
// hardcoded fixture data (Home3TabFixtures.js) instead.
//
// Reuse-over-rebuild: the job cards below mount the real JobGridCard
// (same component the CV tab's mock top matches and the real
// UnifiedJobsFeed both use) rather than a new card. The matched-roles rail
// has no equivalent extracted/importable component to reuse - Career.jsx's
// real version (TRACK_BAND, AxisBar, the row renderer) is written inline in
// that page, not exported - so it's recreated here matching that same
// visual pattern (track dot + chip, expandable axis bars, matched/gap skill
// chips) via the shared TRACK_STYLES/TRACK_NAMES in Home3TabFixtures.js.
//
// Search + seniority/work-type chips actually filter the fixture list
// client-side (cheap on 10 static rows, makes the demo feel real per the
// ask). Function/location dropdowns are visual-only selects - the fixture
// set isn't varied enough across those axes for real filtering to mean
// anything.
//
// Revision 4: the tab toggle and filter chips' active state, and the
// matched-roles track colors, are coral/teal/golden again - matching the
// real UnifiedTabButton (bg-rd-coral when active) and FacetChip (bg-rd-
// coral when active) in JobsSearchTab.jsx/UnifiedJobsFeed.jsx, and the
// real TRACK_CONFIG mapping. An earlier pass here used teal as a stand-in
// accent to avoid coral; that wasn't a real decision and has been
// reverted so this recreation reads the same as what it's recreating.

import React, { useMemo, useState } from "react";
import { Search, ChevronDown, ChevronUp, Check, Plus } from "lucide-react";
import JobGridCard from "@/components/jobs/JobGridCard";
import { TRACK_CONFIG } from "@/lib/trackConfig";
import { humanizeSkillId } from "@/lib/humanizeSkillId";
import {
  MOCK_JOBS,
  MOCK_MATCHED_ROLES,
  TRACK_NAMES,
  TRACK_STYLES,
} from "./Home3TabFixtures";

const SENIORITY_CHIPS = [
  ["entry", "Entry"],
  ["mid", "Mid"],
  ["senior", "Senior"],
];
const WORK_TYPE_CHIPS = [
  ["onsite", "On-site"],
  ["remote", "Remote"],
];
const FUNCTION_OPTIONS = [
  "All functions",
  "Product",
  "Operations",
  "Strategy",
  "GTM / Sales",
];
const LOCATION_OPTIONS = [
  "All locations",
  "Tel Aviv",
  "Herzliya",
  "Remote (Israel)",
];

const toPct = (v) => Math.max(0, Math.min(100, Math.round((v ?? 0) * 100)));

export default function Home3TabJobsTab() {
  const [tab, setTab] = useState("matches");
  const [search, setSearch] = useState("");
  const [seniority, setSeniority] = useState(new Set());
  const [workType, setWorkType] = useState(new Set());
  const [funcFilter, setFuncFilter] = useState(FUNCTION_OPTIONS[0]);
  const [locFilter, setLocFilter] = useState(LOCATION_OPTIONS[0]);

  const toggleSet = (setter) => (key) =>
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const filteredJobs = useMemo(() => {
    if (tab !== "search") return MOCK_JOBS;
    return MOCK_JOBS.filter(({ job }) => {
      if (
        search.trim() &&
        !`${job.title} ${job.company_name}`
          .toLowerCase()
          .includes(search.trim().toLowerCase())
      ) {
        return false;
      }
      if (seniority.size > 0 && !seniority.has(job.seniority)) return false;
      if (workType.size > 0) {
        const wantsRemote = workType.has("remote");
        const wantsOnsite = workType.has("onsite");
        if (wantsRemote && !wantsOnsite && !job.is_remote) return false;
        if (wantsOnsite && !wantsRemote && job.is_remote) return false;
      }
      return true;
    });
  }, [tab, search, seniority, workType]);

  return (
    <div className="flex flex-col md:flex-row gap-4 h-full min-h-0">
      <div className="w-full md:flex-[1.55] min-w-0 md:h-full md:overflow-y-auto md:pr-1">
        <div className="flex gap-2 mb-5">
          <ToggleButton
            label="Top Matches for You"
            active={tab === "matches"}
            onClick={() => setTab("matches")}
          />
          <ToggleButton
            label="Search All Jobs"
            active={tab === "search"}
            onClick={() => setTab("search")}
          />
        </div>

        {tab === "search" && (
          <div className="mb-4 flex flex-col gap-2.5">
            <div className="relative">
              <Search
                className="w-3.5 h-3.5 text-rd-text-tertiary absolute left-3 top-1/2 -translate-y-1/2"
                aria-hidden="true"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by title or company"
                className="w-full pl-9 pr-3 py-2 text-[12.5px] bg-rd-bg-card border border-rd-border rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-rd-coral placeholder:text-rd-text-tertiary"
              />
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {SENIORITY_CHIPS.map(([key, label]) => (
                <FilterChip
                  key={key}
                  label={label}
                  active={seniority.has(key)}
                  onClick={() => toggleSet(setSeniority)(key)}
                />
              ))}
              <span className="w-px h-4 bg-rd-border mx-1" />
              {WORK_TYPE_CHIPS.map(([key, label]) => (
                <FilterChip
                  key={key}
                  label={label}
                  active={workType.has(key)}
                  onClick={() => toggleSet(setWorkType)(key)}
                />
              ))}
              <span className="w-px h-4 bg-rd-border mx-1" />
              <SimpleSelect
                value={funcFilter}
                onChange={setFuncFilter}
                options={FUNCTION_OPTIONS}
              />
              <SimpleSelect
                value={locFilter}
                onChange={setLocFilter}
                options={LOCATION_OPTIONS}
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <p className="font-display font-bold text-[15px] text-rd-text">
            {filteredJobs.length} job{filteredJobs.length === 1 ? "" : "s"}{" "}
            match, best fit first
          </p>
          <p className="text-[11px] uppercase tracking-[0.08em] font-mono text-rd-text-secondary">
            Sample listings for this prototype
          </p>
        </div>

        {filteredJobs.length === 0 ? (
          <div className="rounded-[18px] border border-rd-border bg-rd-bg-card px-6 py-10 shadow-rd text-center">
            <p className="text-[13.5px] text-rd-text-secondary">
              No sample jobs match those filters.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredJobs.map(({ job, score }) => {
              const trackColor = TRACK_CONFIG[score.track]?.rdColor || null;
              return (
                <JobGridCard
                  key={job.id}
                  job={job}
                  scoreResult={score}
                  trackColor={trackColor}
                  unified
                  onOpen={() => {}}
                />
              );
            })}
          </div>
        )}
      </div>

      <div className="w-full md:flex-1 min-w-0 bg-rd-bg-page border border-rd-border-subtle rounded-[16px] p-3.5 md:h-full md:overflow-y-auto">
        <MatchedRolesPanel />
      </div>
    </div>
  );
}

function ToggleButton({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center font-display font-bold text-[13px] rounded-full px-4 py-1.5 transition-colors ${
        active
          ? "bg-rd-coral text-white"
          : "bg-rd-bg-soft text-rd-text-secondary hover:text-rd-text"
      }`}
    >
      {label}
    </button>
  );
}

function FilterChip({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center font-display font-semibold text-[11.5px] rounded-full px-3 py-1.5 border transition-colors ${
        active
          ? "bg-rd-coral text-white border-rd-coral"
          : "bg-rd-bg-card text-rd-text-secondary border-rd-border hover:border-rd-border-hover"
      }`}
    >
      {label}
    </button>
  );
}

function SimpleSelect({ value, onChange, options }) {
  return (
    <div className="relative inline-flex items-center">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none cursor-pointer font-display font-semibold text-[11.5px] text-rd-text-secondary bg-rd-bg-card border border-rd-border hover:border-rd-border-hover rounded-full pl-3 pr-7 py-1.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rd-coral"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      <ChevronDown
        className="w-3 h-3 text-rd-text-tertiary absolute right-2 pointer-events-none"
        aria-hidden="true"
      />
    </div>
  );
}

// ───── Right rail: matched roles (recreated pattern, see file header) ─────

function MatchedRolesPanel() {
  const [expandedId, setExpandedId] = useState(
    MOCK_MATCHED_ROLES[0]?.id || null,
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="font-display font-bold text-[14px] text-rd-text">
          Your matched roles
        </span>
      </div>
      <p className="text-[10.5px] text-rd-text-tertiary mb-3">
        Sample roles for this prototype
      </p>
      <div className="flex flex-col gap-2">
        {MOCK_MATCHED_ROLES.map((r) => {
          const expanded = r.id === expandedId;
          const style = TRACK_STYLES[r.track] || TRACK_STYLES.track_1;
          const trackName = TRACK_NAMES[r.track];
          const qualified = toPct(r.readiness_score);
          const path = toPct(r.goal_alignment_score);
          const matched = (r.matched_skills || []).slice(0, 4);
          const gaps = (r.missing_skills || []).slice(0, 3);
          return (
            <div
              key={r.id}
              className="bg-rd-bg-card border border-rd-border rounded-[12px] overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setExpandedId(expanded ? null : r.id)}
                className="w-full text-left px-3 py-2.5 flex items-center gap-2"
              >
                <span
                  className={`w-2 h-2 rounded-full ${style.dot} flex-shrink-0`}
                />
                <span className="flex-1 min-w-0 font-display font-bold text-[12.5px] leading-[1.25] text-rd-text">
                  {r.title}
                </span>
                {trackName && (
                  <span
                    className={`font-display font-semibold text-[10px] rounded-full px-2 py-0.5 ${style.tintBg} ${style.ink}`}
                  >
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
                <div className="px-3 pb-3">
                  <div className="flex flex-col gap-1.5">
                    <AxisBar
                      label="Qualified now"
                      value={qualified}
                      fill={style.barFill}
                      track={style.barTrack}
                    />
                    <AxisBar
                      label="Moves you toward goal"
                      value={path}
                      fill={style.barFill}
                      track={style.barTrack}
                    />
                  </div>
                  {(matched.length > 0 || gaps.length > 0) && (
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {matched.map((s) => (
                        <span
                          key={s}
                          className="inline-flex items-center gap-1 text-[10px] bg-rd-teal-tint text-rd-teal-dark rounded-[6px] px-2 py-0.5"
                        >
                          <Check className="w-2.5 h-2.5" />
                          {humanizeSkillId(s)}
                        </span>
                      ))}
                      {gaps.map((s) => (
                        <span
                          key={s}
                          className="inline-flex items-center gap-1 text-[10px] bg-rd-golden-tint text-rd-golden-dark rounded-[6px] px-2 py-0.5"
                        >
                          <Plus className="w-2.5 h-2.5" />
                          {humanizeSkillId(s)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AxisBar({ label, value, fill, track }) {
  const v = Math.max(0, Math.min(100, value || 0));
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-rd-text-secondary w-[104px] flex-shrink-0">
        {label}
      </span>
      <span className={`flex-1 h-1.5 rounded-full ${track} overflow-hidden`}>
        <span
          className={`block h-full rounded-full ${fill}`}
          style={{ width: `${v}%` }}
        />
      </span>
    </div>
  );
}
