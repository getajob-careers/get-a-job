import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, ArrowRight } from "lucide-react";
import SkillTagInput from "./SkillTagInput";
import PresetBubbleInput from "./PresetBubbleInput";
import { matchRoles } from "@/lib/roleMatch";

// Industry presets aligned with companies.industry canonical spellings so the
// substring matcher in match-internship-companies fires against real seeded
// rows. Original 12 ordered by pilot-seed company count; 8 appended below
// for broader coverage (e-commerce, climate, mobility, logistics, devtools,
// salestech, foodtech, consumer apps). New entries may not seed companies
// yet — they'll match new entries as the company library grows.
const INDUSTRY_PRESETS = [
  "Cybersecurity", "FinTech", "B2B SaaS", "AI/ML", "InsurTech", "HealthTech",
  "HR Tech", "MarTech", "AdTech", "Gaming", "EdTech", "PropTech",
  "E-commerce", "Climate Tech", "Mobility", "Logistics Tech",
  "DevTools", "Sales Tech", "FoodTech", "Consumer Apps",
];

// Mirrors AddInformation.jsx exactly so onboarding ↔ profile-edit don't drift.
const WORK_ENVIRONMENT_PRESETS = [
  "Startup", "Scale-up", "Corporate", "Agency", "Non-profit", "Public Sector",
];

export default function StepCareerDirection({ data, onChange, onNext, onBack }) {
  const set = (key, val) => onChange({ ...data, [key]: val });

  const canProceed = !!data.five_year_role?.trim();

  // Debounced autocomplete against the 183-role library — surface canonical
  // titles so the user can pick one without being forced.
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [dismissedFor, setDismissedFor] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const debounceRef = useRef(null);
  const fiveYearWrapperRef = useRef(null);
  const [debouncedInput, setDebouncedInput] = useState(data.five_year_role || "");

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedInput(data.five_year_role || "");
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [data.five_year_role]);

  const { exact, suggestions } = useMemo(
    () => matchRoles(debouncedInput, 5),
    [debouncedInput]
  );

  useEffect(() => {
    const onClick = (e) => {
      if (fiveYearWrapperRef.current && !fiveYearWrapperRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => { setHighlightedIndex(0); }, [suggestions]);

  const shouldShow =
    showSuggestions &&
    !exact &&
    !!debouncedInput.trim() &&
    debouncedInput.trim() !== dismissedFor &&
    suggestions.length > 0;

  const chooseSuggestion = (s) => {
    set("five_year_role", s.title);
    setShowSuggestions(false);
    setDismissedFor("");
  };

  const dismiss = () => {
    setDismissedFor((data.five_year_role || "").trim());
    setShowSuggestions(false);
  };

  const handleFiveYearKeyDown = (e) => {
    if (!shouldShow) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((p) => (p + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((p) => (p - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      chooseSuggestion(suggestions[highlightedIndex]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  return (
    <div className="space-y-7">
      <div>
        <h1 className="onb-h1">Where do you want to go?</h1>
        <p className="onb-sub">
          Tell us where you want your career to head. We&apos;ll separate what you qualify for now from what you&apos;re aiming for next.
        </p>
      </div>

      <div className="space-y-5">
        <div ref={fiveYearWrapperRef} className="relative">
          <label className="onb-label">
            Where do you want to be in 5 years? <span className="req">*</span>
          </label>
          <input
            value={data.five_year_role || ""}
            onChange={(e) => {
              set("five_year_role", e.target.value);
              setShowSuggestions(true);
              if (e.target.value.trim() !== dismissedFor) setDismissedFor("");
            }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={handleFiveYearKeyDown}
            placeholder="e.g. Product Manager, Data Analyst, Marketing Manager"
            className="onb-input"
          />

          {shouldShow && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-[#DDDDDB] rounded-[14px] shadow-lg max-h-72 overflow-y-auto">
              {suggestions.map((s, idx) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => chooseSuggestion(s)}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={`w-full text-left px-3.5 py-2.5 text-sm transition-colors ${
                    idx === highlightedIndex
                      ? "bg-[#FDE7E3] text-[#0E1014]"
                      : "text-[#52545A] hover:bg-[#F4F4F2]"
                  }`}
                >
                  {s.title}
                </button>
              ))}
              <button
                type="button"
                onClick={dismiss}
                className="w-full text-left px-3.5 py-2.5 text-xs text-[#9C9DA1] hover:text-[#52545A] border-t border-[#E8E8E5]"
              >
                None of these — keep &quot;{(data.five_year_role || "").trim()}&quot;
              </button>
            </div>
          )}

          {exact && (data.five_year_role || "").trim() && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-[#1D7556]">
              <Check className="w-3.5 h-3.5" /> Matched: {exact.title}
            </p>
          )}
        </div>

        <SkillTagInput
          label="Job titles that interest you now"
          description="Roles you might apply to in the next 3–6 months."
          tags={data.target_job_titles || []}
          onChange={(v) => set("target_job_titles", v)}
          placeholder="e.g. Data Analyst, Marketing Coordinator"
          suggestionType="job_titles"
        />

        <PresetBubbleInput
          label="Target industries"
          description="Pick the industries you're aiming for. Add your own if it's not listed."
          presets={INDUSTRY_PRESETS}
          tags={data.target_industries || []}
          onChange={(v) => set("target_industries", v)}
          customPlaceholder="Or type another industry"
        />

        <PresetBubbleInput
          label="Preferred work environment"
          description="Select all environments you're open to working in."
          presets={WORK_ENVIRONMENT_PRESETS}
          tags={data.work_environment || []}
          onChange={(v) => set("work_environment", v)}
          customPlaceholder="Or type another"
        />

        <div className="space-y-3 pt-1">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={data.open_to_lateral || false}
              onChange={(e) => set("open_to_lateral", e.target.checked)}
              className="rounded mt-0.5 accent-[#F87060]"
            />
            <div>
              <p className="text-sm text-[#0E1014] font-medium">Open to lateral roles</p>
              <p className="text-xs text-[#9C9DA1]">Roles at the same level in a different function or industry</p>
            </div>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={data.open_to_outside_degree || false}
              onChange={(e) => set("open_to_outside_degree", e.target.checked)}
              className="rounded mt-0.5 accent-[#F87060]"
            />
            <div>
              <p className="text-sm text-[#0E1014] font-medium">Open to roles outside my degree field</p>
              <p className="text-xs text-[#9C9DA1]">E.g. a Finance major applying to Operations or Product roles</p>
            </div>
          </label>
        </div>
      </div>

      <div className="flex justify-between pt-2">
        <button onClick={onBack} className="onb-btn onb-btn-outline">Back</button>
        <button onClick={onNext} disabled={!canProceed} className="onb-btn onb-btn-primary onb-btn-lg">
          Continue <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
