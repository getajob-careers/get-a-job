import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Search,
  X,
  Globe,
  Layers,
  Building2,
  Sparkles,
  GraduationCap,
  User2,
} from "lucide-react";
import { matchRoles } from "@/lib/roleMatch";
import { ROLE_LOOKUP } from "@/lib/roleLookup";

// Onboarding V2 — direction screen (index 2). Merges four onboarding inputs
// that used to be four full screens (career-direction, constraints, internship)
// onto one: 5-year goal role, location, work arrangement, and practicum. The
// goal pick also drives the primary_domain inference write in the shell (see
// inferPrimaryDomainWrite) — this component only collects; the shell persists.
//
// Presentational: no own step chrome (the shell provides eyebrow + progress)
// and no own Continue button (the shell drives advance so it can run the
// inference write on the way out). Styling matches the cv_upload screen — rd-
// tokens, compact rounded-[14px] cards.

const FAMILY_LABEL = {
  Admin_GA: "Admin / G&A",
  BD_Partnerships: "BD & Partnerships",
  Consulting: "Consulting",
  Customer_Experience: "Customer Experience",
  Data: "Data",
  Design_UX: "Design & UX",
  Engineering: "Engineering",
  Finance: "Finance",
  HR_People: "HR & People",
  IT_Security: "IT & Security",
  Leadership: "Leadership",
  Marketing: "Marketing",
  Onboarding_Implementation: "Onboarding & Implementation",
  Operations: "Operations",
  Product: "Product",
  Relationship_Growth: "Customer Success / Account Growth",
  RevOps_BizOps: "RevOps / BizOps",
  Sales: "Sales",
  Solutions_Engineering: "Solutions Engineering",
  Support: "Support",
};

const SENIORITY_LABEL = {
  Entry: "Entry",
  Entry_Mid: "Entry/Mid",
  Mid: "Mid",
  Senior: "Senior",
  Lead_Manager: "Lead / Manager",
  Director_Head: "Director / Head",
  VP_Executive: "VP / Executive",
};

const familyLabel = (f) => FAMILY_LABEL[f] || f || "";
const seniorityLabel = (s) => SENIORITY_LABEL[s] || s || "";

const WORK_ARRANGEMENTS = [
  { value: "Remote", label: "Remote", Icon: Globe },
  { value: "Hybrid", label: "Hybrid", Icon: Layers },
  { value: "On-site", label: "On-site", Icon: Building2 },
  { value: "Flexible", label: "Flexible", Icon: Sparkles },
];

const FIELD_LABEL =
  "text-[11px] font-medium text-rd-text-tertiary uppercase tracking-wide mb-2.5";
const INPUT_CLS =
  "w-full px-3.5 py-2.5 rounded-[10px] border border-rd-border bg-rd-bg-card text-rd-text text-[13.5px] placeholder:text-rd-text-secondary/70 outline-none transition-[border-color,box-shadow] duration-150 focus:border-rd-coral focus:shadow-[0_0_0_3px_var(--rd-coral-tint)]";

export default function DirectionScreenV2({ data, onChange }) {
  const set = (key, val) => onChange({ ...data, [key]: val });

  // ---- Goal role picker (compact search) -------------------------------
  const chosenRole = useMemo(() => {
    if (!data.five_year_goal_role_id) return null;
    return (
      ROLE_LOOKUP.find((r) => r.id === data.five_year_goal_role_id) || null
    );
  }, [data.five_year_goal_role_id]);

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const debounceRef = useRef(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  useEffect(() => {
    const onClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const suggestions = useMemo(() => {
    const norm = (debouncedQuery || "").trim();
    if (norm.length < 2) return [];
    const { suggestions: scored } = matchRoles(norm, 24);
    return scored
      .map((s) => ROLE_LOOKUP.find((r) => r.id === s.id))
      .filter(Boolean)
      .slice(0, 8);
  }, [debouncedQuery]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [suggestions]);

  const choose = (role) => {
    // Write BOTH columns together — five_year_goal_role_id is the scoring
    // contract; five_year_role keeps the human label in sync. Never one
    // without the other (mirrors StepCareerDirection).
    onChange({
      ...data,
      five_year_goal_role_id: role.id,
      five_year_role: role.title,
    });
    setQuery("");
    setShowSuggestions(false);
  };

  const clearPick = () => {
    onChange({ ...data, five_year_goal_role_id: null, five_year_role: "" });
    setQuery("");
    setShowSuggestions(true);
  };

  const onSearchKeyDown = (e) => {
    if (suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((p) => (p + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex(
        (p) => (p - 1 + suggestions.length) % suggestions.length,
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(suggestions[highlightedIndex]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  // ---- Work arrangement (multi-select) ---------------------------------
  const selectedWork = Array.isArray(data.work_type) ? data.work_type : [];
  const toggleWork = (value) => {
    const next = selectedWork.includes(value)
      ? selectedWork.filter((v) => v !== value)
      : [...selectedWork, value];
    set("work_type", next);
  };

  // ---- Practicum (inline-expand radio) ---------------------------------
  // "Yes" reveals the faculty/self choice inline; picking "No" collapses it and
  // clears practicum_path (null == not enrolled, which /Internship guards on).
  const practicumPath = data.practicum_path || null;
  const [practicumYes, setPracticumYes] = useState(practicumPath != null);

  const chooseNoPracticum = () => {
    setPracticumYes(false);
    if (practicumPath != null) set("practicum_path", null);
  };
  const chooseYesPracticum = () => setPracticumYes(true);

  return (
    <div className="space-y-7">
      {/* Goal role */}
      <div ref={wrapperRef} className="relative">
        <p className={FIELD_LABEL}>Your 5-year goal role</p>
        {chosenRole ? (
          <div className="flex items-start gap-3 p-4 rounded-[14px] border border-rd-coral bg-rd-coral-tint">
            <Check className="w-4 h-4 text-rd-coral mt-0.5 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-display font-semibold text-[14.5px] text-rd-text">
                {chosenRole.title}
              </p>
              <p className="text-[11.5px] text-rd-text-secondary mt-0.5">
                {seniorityLabel(chosenRole.seniority)} ·{" "}
                {familyLabel(chosenRole.role_family)}
              </p>
            </div>
            <button
              type="button"
              onClick={clearPick}
              className="text-[12px] font-semibold text-rd-text-tertiary hover:text-rd-coral transition-colors"
            >
              Change
            </button>
          </div>
        ) : (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rd-text-secondary pointer-events-none" />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={onSearchKeyDown}
                placeholder="Search roles (e.g. Product Manager, Data Analyst)"
                className={`${INPUT_CLS} pl-9`}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setDebouncedQuery("");
                  }}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-rd-text-secondary hover:text-rd-coral transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-rd-bg-card border border-rd-border rounded-[12px] shadow-rd max-h-72 overflow-y-auto">
                {suggestions.map((r, idx) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => choose(r)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`w-full text-left px-3.5 py-2.5 transition-colors ${
                      idx === highlightedIndex
                        ? "bg-rd-coral-tint"
                        : "hover:bg-rd-bg-soft"
                    }`}
                  >
                    <div className="text-[13.5px] text-rd-text font-medium">
                      {r.title}
                    </div>
                    <div className="text-[11px] text-rd-text-secondary mt-0.5">
                      {seniorityLabel(r.seniority)} ·{" "}
                      {familyLabel(r.role_family)}
                    </div>
                  </button>
                ))}
              </div>
            )}
            <p className="mt-2 text-[11.5px] text-rd-text-secondary">
              Anchors your track and job-fit scores. You can pick this later if
              you&apos;re still figuring it out.
            </p>
          </>
        )}
      </div>

      {/* Location */}
      <div>
        <p className={FIELD_LABEL}>Where do you want to work?</p>
        <input
          value={data.location || ""}
          onChange={(e) => set("location", e.target.value)}
          placeholder="e.g. Tel Aviv, Herzliya, Remote"
          className={INPUT_CLS}
        />
      </div>

      {/* Work arrangement */}
      <div>
        <p className={FIELD_LABEL}>
          Work arrangement — pick all you&apos;re open to
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {WORK_ARRANGEMENTS.map(({ value, label, Icon }) => {
            const isSelected = selectedWork.includes(value);
            return (
              <button
                key={value}
                type="button"
                onClick={() => toggleWork(value)}
                data-selected={isSelected}
                className={`flex flex-col items-center gap-2 p-3 rounded-[14px] border transition-colors ${
                  isSelected
                    ? "border-rd-coral bg-rd-coral-tint"
                    : "border-rd-border bg-rd-bg-card hover:border-rd-border-hover"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                    isSelected
                      ? "bg-rd-coral text-white"
                      : "bg-rd-bg-soft text-rd-text-secondary"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-[12px] font-display font-semibold text-rd-text text-center leading-tight">
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Practicum — inline-expand radio */}
      <div>
        <p className={FIELD_LABEL}>
          Are you in your school&apos;s internship program?
        </p>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={chooseYesPracticum}
            data-selected={practicumYes}
            className={`p-3 rounded-[14px] border text-[13px] font-display font-semibold transition-colors ${
              practicumYes
                ? "border-rd-coral bg-rd-coral-tint text-rd-text"
                : "border-rd-border bg-rd-bg-card text-rd-text-secondary hover:border-rd-border-hover"
            }`}
          >
            Yes, I&apos;m enrolled
          </button>
          <button
            type="button"
            onClick={chooseNoPracticum}
            data-selected={!practicumYes}
            className={`p-3 rounded-[14px] border text-[13px] font-display font-semibold transition-colors ${
              !practicumYes
                ? "border-rd-coral bg-rd-coral-tint text-rd-text"
                : "border-rd-border bg-rd-bg-card text-rd-text-secondary hover:border-rd-border-hover"
            }`}
          >
            No / not enrolled
          </button>
        </div>

        {practicumYes && (
          <div className="mt-2.5 space-y-2.5">
            <PracticumOption
              Icon={GraduationCap}
              title="Placement arranged by faculty"
              description="My faculty mentor coordinates the placement; the company is assigned by them."
              selected={practicumPath === "faculty_assigned"}
              onClick={() => set("practicum_path", "faculty_assigned")}
            />
            <PracticumOption
              Icon={User2}
              title="I source my own placement"
              description="I source and pitch the company myself, under program oversight."
              selected={practicumPath === "self_sourced"}
              onClick={() => set("practicum_path", "self_sourced")}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function PracticumOption({ Icon, title, description, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-selected={selected}
      className={`w-full text-left flex items-start gap-3 p-3.5 rounded-[14px] border bg-rd-bg-card transition-colors ${
        selected
          ? "border-rd-coral shadow-[0_0_0_3px_var(--rd-coral-tint)]"
          : "border-rd-border hover:border-rd-border-hover"
      }`}
    >
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
          selected
            ? "bg-rd-coral text-white"
            : "bg-rd-bg-soft text-rd-text-secondary"
        }`}
      >
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-display font-semibold text-[13.5px] text-rd-text">
          {title}
        </p>
        <p className="text-[12px] text-rd-text-secondary leading-[1.5] mt-0.5">
          {description}
        </p>
      </div>
    </button>
  );
}
