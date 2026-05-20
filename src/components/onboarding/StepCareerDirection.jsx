import React, { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import SkillTagInput from "./SkillTagInput";
import PresetBubbleInput from "./PresetBubbleInput";
import { matchRoles } from "@/lib/roleMatch";

// Preset bubbles for the industries field — aligned with the canonical
// spellings in the companies.industry column so the substring matcher in
// match-internship-companies can actually fire against real seeded rows.
// Ordered by company count in the pilot seed (Cybersecurity is the biggest
// segment in Israeli tech; PropTech is the smallest of the high-signal ones).
const INDUSTRY_PRESETS = [
  "Cybersecurity",
  "FinTech",
  "B2B SaaS",
  "AI/ML",
  "InsurTech",
  "HealthTech",
  "HR Tech",
  "MarTech",
  "AdTech",
  "Gaming",
  "EdTech",
  "PropTech",
];

// Preset bubbles for work environment — matches the 6 options in
// AddInformation.jsx exactly so onboarding ↔ profile-edit don't drift.
const WORK_ENVIRONMENT_PRESETS = [
  "Startup",
  "Scale-up",
  "Corporate",
  "Agency",
  "Non-profit",
  "Public Sector",
];

export default function StepCareerDirection({ data, onChange, onNext, onBack }) {
  const set = (key, val) => onChange({ ...data, [key]: val });

  const canProceed = data.five_year_role?.trim();

  // Debounced suggestions for the 5-year role input.
  // The user may type "product", "PM", "UX", etc. — we surface matching library titles
  // so they can pick a canonical one without being forced.
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [dismissedFor, setDismissedFor] = useState(""); // raw text the user dismissed with "None of these"
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

  // Click-outside to dismiss the dropdown (mirrors AutocompleteInput pattern).
  useEffect(() => {
    const onClick = (e) => {
      if (fiveYearWrapperRef.current && !fiveYearWrapperRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Reset keyboard highlight whenever the suggestion list changes.
  useEffect(() => { setHighlightedIndex(0); }, [suggestions]);

  // Auto-hide suggestions if the field matches exactly, is empty, or was dismissed.
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
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#0A0A0A] tracking-tight">Career Direction</h2>
        <p className="text-sm text-[#525252] mt-1">
          Tell us where you want your career to go. We&apos;ll separate what you qualify for now from what you&apos;re aiming for next.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-[#E5E5E5] p-6 space-y-5">
        <div ref={fiveYearWrapperRef} className="relative">
          <label className="block text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium mb-1">
            Where do you want to be in 5 years? <span className="text-red-400">*</span>
          </label>
          <Input
            value={data.five_year_role || ""}
            onChange={(e) => {
              set("five_year_role", e.target.value);
              setShowSuggestions(true);
              // Clear the dismissal if user changes the text
              if (e.target.value.trim() !== dismissedFor) setDismissedFor("");
            }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={handleFiveYearKeyDown}
            placeholder="e.g. Product Manager, Data Analyst, Marketing Manager"
          />

          {/* Dropdown overlay — true autocomplete pattern */}
          {shouldShow && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-[#E5E5E5] rounded-lg shadow-lg max-h-72 overflow-y-auto">
              {suggestions.map((s, idx) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => chooseSuggestion(s)}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                    idx === highlightedIndex
                      ? "bg-[#F5F5F5] text-[#0A0A0A]"
                      : "text-[#525252] hover:bg-[#FAFAFA]"
                  }`}
                >
                  {s.title}
                </button>
              ))}
              <button
                type="button"
                onClick={dismiss}
                className="w-full text-left px-3 py-2 text-xs text-[#A3A3A3] hover:text-[#525252] border-t border-[#F0F0F0]"
              >
                None of these — keep &quot;{(data.five_year_role || "").trim()}&quot;
              </button>
            </div>
          )}

          {/* Exact match — quiet confirmation below the input */}
          {exact && (data.five_year_role || "").trim() && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-emerald-700">
              <Check className="w-3.5 h-3.5" /> Matched: {exact.title}
            </p>
          )}
        </div>

        <SkillTagInput
          label="Job Titles That Interest You Now"
          description="Roles you are considering applying to in the next 3–6 months."
          tags={data.target_job_titles || []}
          onChange={(v) => set("target_job_titles", v)}
          placeholder="e.g. Data Analyst, Marketing Coordinator"
          suggestionType="job_titles"
        />

        <PresetBubbleInput
          label="Target Industries"
          description="Pick the industries you're aiming for. Add your own if it's not listed."
          presets={INDUSTRY_PRESETS}
          tags={data.target_industries || []}
          onChange={(v) => set("target_industries", v)}
          customPlaceholder="Or type another industry"
        />

        <PresetBubbleInput
          label="Preferred Work Environment"
          description="Select all environments you're open to working in."
          presets={WORK_ENVIRONMENT_PRESETS}
          tags={data.work_environment || []}
          onChange={(v) => set("work_environment", v)}
          customPlaceholder="Or type another"
        />

        <div className="space-y-3 pt-1">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={data.open_to_lateral || false}
              onChange={(e) => set("open_to_lateral", e.target.checked)}
              className="rounded"
            />
            <div>
              <p className="text-sm text-[#0A0A0A] font-medium">Open to lateral roles</p>
              <p className="text-xs text-[#A3A3A3]">Roles at the same level in a different function or industry</p>
            </div>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={data.open_to_outside_degree || false}
              onChange={(e) => set("open_to_outside_degree", e.target.checked)}
              className="rounded"
            />
            <div>
              <p className="text-sm text-[#0A0A0A] font-medium">Open to roles outside my degree field</p>
              <p className="text-xs text-[#A3A3A3]">E.g. a Finance major applying to Operations or Product roles</p>
            </div>
          </label>
        </div>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} className="text-sm">Back</Button>
        <Button onClick={onNext} disabled={!canProceed} className="bg-[#0A0A0A] hover:bg-[#262626] text-sm px-6">
          Continue to Constraints
        </Button>
      </div>
    </div>
  );
}
