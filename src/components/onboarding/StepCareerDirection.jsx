import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, ArrowRight, Search, X } from "lucide-react";
import RdSkillTagInput from "@/components/redesign/RdSkillTagInput";
import RdButton from "@/components/redesign/RdButton";
import { matchRoles } from "@/lib/roleMatch";
import { ROLE_LOOKUP } from "@/lib/roleLookup";

// Phase 2 onboarding redesign: structured pick against the 183-role library.
//
// Why the swap: free-text five_year_role produced goal_alignment_score = 0
// for real users whose phrasing fell below the resolveGoalRoleId Jaccard
// threshold (typos, non-canonical titles). The structured pick writes the
// role.id directly, which generate-career-analysis now consumes first
// (skipping the resolver entirely). Legacy free-text path stays as a
// fallback for users whose column is null.
//
// On selection we write BOTH:
//   - five_year_goal_role_id = role.id           (the contract for scoring)
//   - five_year_role          = role.standardized_title  (display + fallback)
// Never set one without the other.

const SENIORITY_RANK = {
  Entry: 0, Entry_Mid: 1, Mid: 2, Senior: 3,
  Lead_Manager: 4, Director_Head: 5, VP_Executive: 6,
};

const SENIORITY_LABEL = {
  Entry: "Entry", Entry_Mid: "Entry/Mid", Mid: "Mid", Senior: "Senior",
  Lead_Manager: "Lead / Manager", Director_Head: "Director / Head",
  VP_Executive: "VP / Executive",
};

// Display labels for role_family. Underscores are storage shape; this map
// is presentation only. New families added to the library need a label
// here, otherwise the snake_case key shows through (acceptable fallback).
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

const familyLabel = (f) => FAMILY_LABEL[f] || f || "";
const seniorityLabel = (s) => SENIORITY_LABEL[s] || s || "";

// Families sorted by display label, derived from what's actually present in
// ROLE_LOOKUP so a future library trim/expansion doesn't leave orphan
// dropdown entries.
const FAMILY_OPTIONS = Array.from(new Set(ROLE_LOOKUP.map((r) => r.role_family)))
  .filter(Boolean)
  .sort((a, b) => familyLabel(a).localeCompare(familyLabel(b)));

const INPUT_CLS =
  "w-full px-3.5 py-2.5 rounded-[10px] border border-rd-border bg-rd-bg-card text-rd-text text-[13.5px] placeholder:text-rd-text-secondary/70 outline-none transition-[border-color,box-shadow] duration-150 focus:border-rd-coral focus:shadow-[0_0_0_3px_var(--rd-coral-tint)]";

export default function StepCareerDirection({ data, onChange, onNext, onBack }) {
  const set = (key, val) => onChange({ ...data, [key]: val });

  // The structured pick is the preferred path, NOT a hard gate. Users can
  // always advance. If they typed something but didn't pick, that text is
  // committed to five_year_role as free text on continue (handleContinue
  // below) so the resolveGoalRoleId fallback in generate-career-analysis
  // still has something to chew on. Empty → both stay null/empty.

  // The chosen role — resolved from the id when set so display stays in sync
  // even if five_year_role drifts.
  const chosenRole = useMemo(() => {
    if (!data.five_year_goal_role_id) return null;
    return ROLE_LOOKUP.find((r) => r.id === data.five_year_goal_role_id) || null;
  }, [data.five_year_goal_role_id]);

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [familyFilter, setFamilyFilter] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const debounceRef = useRef(null);
  const wrapperRef = useRef(null);

  // Prefill the search input from the prior free-text answer so users mid-
  // flow from before Phase 2 see what they typed before and can re-pick.
  // Only seeds once on mount; further edits drive `query` directly.
  useEffect(() => {
    if (!data.five_year_goal_role_id && data.five_year_role) {
      setQuery(data.five_year_role);
      setShowSuggestions(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(query), 350);
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

  // Suggestion derivation:
  //   - query >= 2 chars  → matchRoles scoring, then family filter, top 8
  //   - no query, family set → all roles in family (asc seniority, then title), top 12
  //   - no query, no family  → empty (user is prompted to search or pick a family)
  const suggestions = useMemo(() => {
    const norm = (debouncedQuery || "").trim();
    if (norm.length >= 2) {
      const { suggestions: scored } = matchRoles(norm, 30);
      const enriched = scored
        .map((s) => {
          const full = ROLE_LOOKUP.find((r) => r.id === s.id);
          return full ? { ...full } : null;
        })
        .filter(Boolean);
      const filtered = familyFilter
        ? enriched.filter((r) => r.role_family === familyFilter)
        : enriched;
      return filtered.slice(0, 8);
    }
    if (familyFilter) {
      return ROLE_LOOKUP.filter((r) => r.role_family === familyFilter)
        .slice()
        .sort((a, b) => {
          const rankA = SENIORITY_RANK[a.seniority] ?? 2;
          const rankB = SENIORITY_RANK[b.seniority] ?? 2;
          if (rankA !== rankB) return rankA - rankB;
          return (a.title || "").localeCompare(b.title || "");
        })
        .slice(0, 12);
    }
    return [];
  }, [debouncedQuery, familyFilter]);

  useEffect(() => { setHighlightedIndex(0); }, [suggestions]);

  const choose = (role) => {
    // Write BOTH columns together. five_year_goal_role_id is the contract
    // for goal_alignment_score; five_year_role keeps the human-readable
    // label in sync for display, CV grounding, and the fallback resolver.
    onChange({
      ...data,
      five_year_goal_role_id: role.id,
      five_year_role: role.title,
    });
    setQuery("");
    setShowSuggestions(false);
  };

  const clearPick = () => {
    onChange({
      ...data,
      five_year_goal_role_id: null,
      five_year_role: "",
    });
    setQuery("");
    setShowSuggestions(true);
  };

  // Advance handler. Picked roles already have both fields set via choose().
  // For the unpicked path, capture whatever the user typed (even if it
  // doesn't match a library role) so generate-career-analysis can still try
  // resolveGoalRoleId(five_year_role). Empty query → wipe both so we don't
  // carry stale state from a prior pass through this step.
  const handleContinue = () => {
    if (!chosenRole) {
      const trimmed = (query || "").trim();
      onChange({
        ...data,
        five_year_role: trimmed,
        five_year_goal_role_id: null,
      });
    }
    onNext();
  };

  const handleSearchKeyDown = (e) => {
    if (suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((p) => (p + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((p) => (p - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(suggestions[highlightedIndex]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  const showPicker = !chosenRole;
  const showSuggestionsList = showPicker && showSuggestions && suggestions.length > 0;

  return (
    <div className="space-y-7">
      <div>
        <p className="text-[10.5px] uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow font-mono">
          step 4 of 6 · career direction
        </p>
        <h1 className="font-display font-extrabold text-[26px] sm:text-[28px] leading-[1.1] tracking-tight text-rd-text mt-2">
          Where do you want to go?
        </h1>
        <p className="text-[13.5px] leading-[1.6] text-rd-text-secondary mt-3">
          Pick the role you&apos;re aiming for in 5 years. Locking it to a known role
          gives us the strongest signal for measuring goal alignment — but if
          you&apos;re not sure yet, that&apos;s fine, you can continue without picking.
        </p>
      </div>

      <div className="space-y-5">
        <div ref={wrapperRef} className="relative">
          <label className="block text-[12px] font-semibold text-rd-text mb-1.5">
            5-year goal role
          </label>

          {chosenRole ? (
            <div className="flex items-start gap-3 p-4 rounded-[14px] border border-rd-coral bg-rd-coral-tint shadow-[0_0_0_3px_var(--rd-coral-tint)]">
              <Check className="w-4 h-4 text-rd-coral mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-display font-semibold text-[14.5px] text-rd-text">
                  {chosenRole.title}
                </p>
                <p className="text-[11.5px] text-rd-text-secondary mt-0.5">
                  {seniorityLabel(chosenRole.seniority)} · {familyLabel(chosenRole.role_family)}
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
                  onChange={(e) => { setQuery(e.target.value); setShowSuggestions(true); }}
                  onFocus={() => setShowSuggestions(true)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Search roles (e.g. Product Manager, Data Analyst)"
                  className={`${INPUT_CLS} pl-9`}
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => { setQuery(""); setDebouncedQuery(""); }}
                    aria-label="Clear search"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-rd-text-secondary hover:text-rd-coral transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="mt-2 flex items-center gap-2">
                <label className="text-[11.5px] text-rd-text-secondary">Filter by area</label>
                <select
                  value={familyFilter}
                  onChange={(e) => setFamilyFilter(e.target.value)}
                  className="text-[12px] px-2.5 py-1.5 rounded-[8px] border border-rd-border bg-rd-bg-card text-rd-text outline-none focus:border-rd-coral focus:shadow-[0_0_0_2px_var(--rd-coral-tint)]"
                >
                  <option value="">All areas</option>
                  {FAMILY_OPTIONS.map((f) => (
                    <option key={f} value={f}>{familyLabel(f)}</option>
                  ))}
                </select>
                {familyFilter && (
                  <button
                    type="button"
                    onClick={() => setFamilyFilter("")}
                    className="text-[11.5px] text-rd-text-tertiary hover:text-rd-coral transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>

              {showSuggestionsList && (
                <div className="absolute z-50 w-full mt-1 bg-rd-bg-card border border-rd-border rounded-[12px] shadow-rd max-h-80 overflow-y-auto">
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
                      <div className="text-[13.5px] text-rd-text font-medium">{r.title}</div>
                      <div className="text-[11px] text-rd-text-secondary mt-0.5">
                        {seniorityLabel(r.seniority)} · {familyLabel(r.role_family)}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {showPicker && debouncedQuery.trim().length >= 2 && suggestions.length === 0 && (
                <p className="mt-2 text-[12px] text-rd-text-secondary">
                  No matches{familyFilter ? ` in ${familyLabel(familyFilter)}` : ""}. Try a broader term or clear the filter.
                </p>
              )}
              {showPicker && !debouncedQuery.trim() && !familyFilter && (
                <p className="mt-2 text-[12px] text-rd-text-secondary">
                  Type to search across all roles, or pick an area to browse.
                </p>
              )}

              {/* Secondary, de-emphasized escape hatch — text link, NOT a CTA.
                  Picking from the library stays the path of least resistance;
                  this affordance just signals that proceeding without picking
                  is allowed. Same handler as the main Continue button — keeps
                  the unpicked-with-text path behaviour identical. */}
              <p className="mt-4 text-[12px] text-rd-text-secondary">
                Not sure yet?{" "}
                <button
                  type="button"
                  onClick={handleContinue}
                  className="underline underline-offset-2 text-rd-text-tertiary hover:text-rd-text transition-colors"
                >
                  {query.trim() ? "Continue with what I typed" : "Skip and come back to this later"}
                </button>
              </p>
            </>
          )}
        </div>

        <RdSkillTagInput
          label="Job titles that interest you now"
          description="Roles you might apply to in the next 3–6 months."
          tags={data.target_job_titles || []}
          onChange={(v) => set("target_job_titles", v)}
          placeholder="e.g. Data Analyst, Marketing Coordinator"
          suggestionType="job_titles"
        />
      </div>

      <div className="flex justify-between items-center pt-2">
        <button
          onClick={onBack}
          className="text-[13px] font-semibold text-rd-text-tertiary hover:text-rd-text transition-colors"
        >
          ← Back
        </button>
        <RdButton onClick={handleContinue}>
          Continue <ArrowRight className="w-4 h-4" />
        </RdButton>
      </div>
    </div>
  );
}
