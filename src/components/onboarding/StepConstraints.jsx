import React from "react";
import { Loader2, Globe, Building2, Layers, Sparkles, ArrowRight } from "lucide-react";
import RdAutocompleteInput from "@/components/redesign/RdAutocompleteInput";
import RdButton from "@/components/redesign/RdButton";

// Restyled for PR 2C — behaviour identical to the Direction-3 version.
// AutocompleteInput → RdAutocompleteInput. Work arrangement remains a
// 4-card multi-select; toggling is unchanged. onSubmit still triggers
// the wrapper's `handleConstraintsNext` (which fires the background
// generate-career-analysis call in Onboarding.jsx; not touched).
//
// Phase 1 onboarding trim: available_start_date capture removed (no
// downstream consumers found). Location + work_type[] remain.

const WORK_ARRANGEMENTS = [
  { value: "Remote",   label: "Remote",   Icon: Globe },
  { value: "Hybrid",   label: "Hybrid",   Icon: Layers },
  { value: "On-site",  label: "On-site",  Icon: Building2 },
  { value: "Flexible", label: "Flexible", Icon: Sparkles },
];

export default function StepConstraints({ data, onChange, onSubmit, onBack, submitting }) {
  const set = (key, val) => onChange({ ...data, [key]: val });
  const selectedArr = Array.isArray(data.work_type) ? data.work_type : [];
  const toggleArrangement = (value) => {
    const next = selectedArr.includes(value)
      ? selectedArr.filter((v) => v !== value)
      : [...selectedArr, value];
    set("work_type", next);
  };

  return (
    <div className="space-y-7">
      <div>
        <p className="text-[10.5px] uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow font-mono">
          step 8 of 9 · constraints
        </p>
        <h1 className="font-display font-extrabold text-[26px] sm:text-[28px] leading-[1.1] tracking-tight text-rd-text mt-2">
          Where and when can you work?
        </h1>
        <p className="text-[13.5px] leading-[1.6] text-rd-text-secondary mt-3">
          Practical filters that apply to every role recommendation. These boundaries factor into track classification.
        </p>
      </div>

      <div className="space-y-5">
        <RdAutocompleteInput
          label="Location"
          value={data.location || ""}
          onChange={(v) => set("location", v)}
          placeholder="e.g. New York, London, Berlin"
          suggestionType="location"
        />

        <div>
          <label className="block text-[12px] font-semibold text-rd-text mb-1.5">
            Work arrangement
          </label>
          <p className="text-[11.5px] text-rd-text-secondary mb-3">
            Select all arrangements you&apos;re open to.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {WORK_ARRANGEMENTS.map(({ value, label, Icon }) => {
              const isSelected = selectedArr.includes(value);
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => toggleArrangement(value)}
                  data-selected={isSelected}
                  className={[
                    "flex flex-col items-center gap-2 p-3 rounded-[14px] border transition-[border-color,background-color,box-shadow] duration-150",
                    isSelected
                      ? "border-rd-coral bg-rd-coral-tint shadow-[0_0_0_3px_var(--rd-coral-tint)]"
                      : "border-rd-border bg-rd-bg-card hover:border-rd-border-hover",
                  ].join(" ")}
                >
                  <div
                    className={[
                      "w-9 h-9 rounded-full flex items-center justify-center transition-colors",
                      isSelected ? "bg-rd-coral text-white" : "bg-rd-bg-soft text-rd-text-secondary",
                    ].join(" ")}
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
      </div>

      <div className="bg-rd-bg-soft border border-rd-border rounded-[14px] p-5">
        <p className="text-[10.5px] uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow">
          What happens next
        </p>
        <p className="text-[13.5px] text-rd-text-secondary leading-relaxed mt-1.5">
          One last step — 3 quick self-assessment questions — then we&apos;ll run your career analysis and build your roadmap. Takes about 30 seconds.
        </p>
      </div>

      <div className="flex justify-between items-center pt-2">
        <button
          onClick={onBack}
          className="text-[13px] font-semibold text-rd-text-tertiary hover:text-rd-text transition-colors"
        >
          ← Back
        </button>
        <RdButton onClick={onSubmit} disabled={submitting}>
          {submitting ? (
            <><Loader2 className="w-4 h-4 animate-spin" />Building profile…</>
          ) : (
            <>Continue <ArrowRight className="w-4 h-4" /></>
          )}
        </RdButton>
      </div>
    </div>
  );
}
