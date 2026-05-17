import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import AutocompleteInput from "./AutocompleteInput";
import PresetBubbleInput from "./PresetBubbleInput";

// Work-arrangement preset bubbles. Exhaustive list — no custom input
// surfaced (these four options cover every meaningful arrangement;
// allowing free text would just create noisy variants).
const WORK_ARRANGEMENT_PRESETS = ["Remote", "Hybrid", "On-site", "Flexible"];

export default function StepConstraints({ data, onChange, onSubmit, onBack, submitting }) {
  const set = (key, val) => onChange({ ...data, [key]: val });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#0A0A0A] tracking-tight">Constraints</h2>
        <p className="text-sm text-[#525252] mt-1">
          Practical filters that apply to every role recommendation. These boundaries are factored into tier classification.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-[#E5E5E5] p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <AutocompleteInput
              label="Location"
              value={data.location || ""}
              onChange={(v) => set("location", v)}
              placeholder="e.g. New York, NY or London, UK"
              suggestionType="location"
            />
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium mb-1">Earliest Start Date</label>
            <Input
              type="date"
              value={data.available_start_date || ""}
              onChange={(e) => set("available_start_date", e.target.value)}
            />
          </div>

          <div className="md:col-span-2">
            <PresetBubbleInput
              label="Work Arrangement"
              description="Select all arrangements you're open to."
              presets={WORK_ARRANGEMENT_PRESETS}
              tags={data.work_type || []}
              onChange={(v) => set("work_type", v)}
              allowCustom={false}
            />
          </div>
        </div>
      </div>

      <div className="bg-[#F5F5F5] rounded-xl p-5 border border-[#E5E5E5]">
        <h3 className="text-xs uppercase tracking-wider font-semibold text-[#525252] mb-2">What happens next</h3>
        <p className="text-sm text-[#525252] leading-relaxed">
          Next we'll ask a few self-assessment questions, then run your full career analysis — classifying your qualification level, identifying your Tier 1–3 roles, and generating a personalised task list and action plan.
        </p>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} className="text-sm">Back</Button>
        <Button
          onClick={onSubmit}
          disabled={submitting}
          className="bg-[#0A0A0A] hover:bg-[#262626] text-sm px-6"
        >
          {submitting ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Building Profile...</>
          ) : (
            "Continue to Survey"
          )}
        </Button>
      </div>
    </div>
  );
}