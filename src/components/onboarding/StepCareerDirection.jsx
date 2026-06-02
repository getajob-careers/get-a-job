import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, ArrowRight } from "lucide-react";
import RdSkillTagInput from "@/components/redesign/RdSkillTagInput";
import RdPresetBubbleInput from "@/components/redesign/RdPresetBubbleInput";
import RdButton from "@/components/redesign/RdButton";
import { matchRoles } from "@/lib/roleMatch";

// Restyled for PR 2B — behaviour identical to the Direction-3 version.
// SkillTagInput → RdSkillTagInput, PresetBubbleInput → RdPresetBubbleInput.
// Role-library autocomplete (debounced 350ms against the 183-role library),
// dismiss-and-keep behaviour, exact-match success indicator, and the
// 2 boolean checkboxes (open_to_lateral, open_to_outside_degree) are
// all preserved verbatim.
//
// Industry presets aligned with companies.industry canonical spellings so the
// substring matcher in match-internship-companies fires against real seeded
// rows.
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

const INPUT_CLS =
  "w-full px-3.5 py-2.5 rounded-[10px] border border-rd-border bg-rd-bg-card text-rd-text text-[13.5px] placeholder:text-rd-text-secondary/70 outline-none transition-[border-color,box-shadow] duration-150 focus:border-rd-coral focus:shadow-[0_0_0_3px_var(--rd-coral-tint)]";

export default function StepCareerDirection({ data, onChange, onNext, onBack }) {
  const set = (key, val) => onChange({ ...data, [key]: val });

  const canProceed = !!data.five_year_role?.trim();

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
        <p className="text-[10.5px] uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow font-mono">
          step 7 of 9 · career direction
        </p>
        <h1 className="font-display font-extrabold text-[26px] sm:text-[28px] leading-[1.1] tracking-tight text-rd-text mt-2">
          Where do you want to go?
        </h1>
        <p className="text-[13.5px] leading-[1.6] text-rd-text-secondary mt-3">
          Tell us where you want your career to head. We&apos;ll separate what you qualify for now from what you&apos;re aiming for next.
        </p>
      </div>

      <div className="space-y-5">
        <div ref={fiveYearWrapperRef} className="relative">
          <label className="block text-[12px] font-semibold text-rd-text mb-1.5">
            Where do you want to be in 5 years? <span className="text-rd-coral">*</span>
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
            className={INPUT_CLS}
          />

          {shouldShow && (
            <div className="absolute z-50 w-full mt-1 bg-rd-bg-card border border-rd-border rounded-[12px] shadow-rd max-h-72 overflow-y-auto">
              {suggestions.map((s, idx) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => chooseSuggestion(s)}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={`w-full text-left px-3.5 py-2.5 text-[13.5px] transition-colors ${
                    idx === highlightedIndex
                      ? "bg-rd-coral-tint text-rd-text"
                      : "text-rd-text-secondary hover:bg-rd-bg-soft"
                  }`}
                >
                  {s.title}
                </button>
              ))}
              <button
                type="button"
                onClick={dismiss}
                className="w-full text-left px-3.5 py-2.5 text-[12px] text-rd-text-secondary hover:text-rd-text border-t border-rd-border-subtle"
              >
                None of these — keep &quot;{(data.five_year_role || "").trim()}&quot;
              </button>
            </div>
          )}

          {exact && (data.five_year_role || "").trim() && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-[12px] text-rd-teal-dark">
              <Check className="w-3.5 h-3.5" /> Matched: {exact.title}
            </p>
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

        <RdPresetBubbleInput
          label="Target industries"
          description="Pick the industries you're aiming for. Add your own if it's not listed."
          presets={INDUSTRY_PRESETS}
          tags={data.target_industries || []}
          onChange={(v) => set("target_industries", v)}
          customPlaceholder="Or type another industry"
        />

        <RdPresetBubbleInput
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
              className="mt-0.5 w-[15px] h-[15px] accent-rd-coral cursor-pointer"
            />
            <div>
              <p className="text-[13.5px] text-rd-text font-medium">Open to lateral roles</p>
              <p className="text-[12px] text-rd-text-secondary leading-snug">
                Roles at the same level in a different function or industry
              </p>
            </div>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={data.open_to_outside_degree || false}
              onChange={(e) => set("open_to_outside_degree", e.target.checked)}
              className="mt-0.5 w-[15px] h-[15px] accent-rd-coral cursor-pointer"
            />
            <div>
              <p className="text-[13.5px] text-rd-text font-medium">Open to roles outside my degree field</p>
              <p className="text-[12px] text-rd-text-secondary leading-snug">
                E.g. a Finance major applying to Operations or Product roles
              </p>
            </div>
          </label>
        </div>
      </div>

      <div className="flex justify-between items-center pt-2">
        <button
          onClick={onBack}
          className="text-[13px] font-semibold text-rd-text-tertiary hover:text-rd-text transition-colors"
        >
          ← Back
        </button>
        <RdButton onClick={onNext} disabled={!canProceed}>
          Continue <ArrowRight className="w-4 h-4" />
        </RdButton>
      </div>
    </div>
  );
}
