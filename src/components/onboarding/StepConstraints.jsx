import React from "react";
import { Loader2, Globe, Building2, Layers, Sparkles, ArrowRight } from "lucide-react";
import AutocompleteInput from "./AutocompleteInput";

// Work arrangement options — 4 visual cards instead of preset bubbles. These
// 4 cover every meaningful arrangement; allowing free text would just create
// noisy variants in downstream filtering.
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
        <h1 className="onb-h1">Where and when can you work?</h1>
        <p className="onb-sub">
          Practical filters that apply to every role recommendation. These boundaries factor into track classification.
        </p>
      </div>

      <div className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <AutocompleteInput
              label="Location"
              value={data.location || ""}
              onChange={(v) => set("location", v)}
              placeholder="e.g. Tel Aviv, New York, London"
              suggestionType="location"
            />
          </div>

          <div>
            <label className="onb-label">Earliest start date</label>
            <input
              type="date"
              value={data.available_start_date || ""}
              onChange={(e) => set("available_start_date", e.target.value)}
              className="onb-input"
            />
          </div>
        </div>

        <div>
          <label className="onb-label">Work arrangement</label>
          <p className="onb-help mb-3">Select all arrangements you&apos;re open to.</p>
          <div className="onb-grid-cards onb-grid-cards-4">
            {WORK_ARRANGEMENTS.map(({ value, label, Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => toggleArrangement(value)}
                className="onb-grid-card"
                data-selected={selectedArr.includes(value)}
              >
                <div className="onb-grid-card-icon">
                  <Icon className="w-4 h-4" />
                </div>
                <span className="onb-grid-card-label">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="onb-card" style={{ background: "#E8E8E5", borderColor: "#DDDDDB" }}>
        <p className="onb-eyebrow">What happens next</p>
        <p className="text-sm text-[#52545A] leading-relaxed mt-1.5">
          One last step — 6 quick self-assessment questions — then we&apos;ll run your career analysis and build your roadmap. Takes about 60 seconds.
        </p>
      </div>

      <div className="flex justify-between pt-2">
        <button onClick={onBack} className="onb-btn onb-btn-outline">Back</button>
        <button onClick={onSubmit} disabled={submitting} className="onb-btn onb-btn-primary onb-btn-lg">
          {submitting ? (
            <><Loader2 className="w-4 h-4 animate-spin" />Building profile…</>
          ) : (
            <>Continue <ArrowRight className="w-4 h-4" /></>
          )}
        </button>
      </div>
    </div>
  );
}
