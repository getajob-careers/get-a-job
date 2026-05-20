import React, { useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, Circle } from "lucide-react";
import { toast } from "sonner";

export default function InterviewPrep({ app, onUpdate }) {
  const [prep, setPrep] = useState(app.interview_prep || {});
  const [saving, setSaving] = useState(false);

  const handleToggle = async (field) => {
    if (saving) return;
    const previous = prep;
    const updated = { ...prep, [field]: !prep[field] };
    setPrep(updated);
    setSaving(true);
    const { error } = await supabase.from("applications").update({ interview_prep: updated }).eq("id", app.id);
    setSaving(false);
    if (error) {
      console.error("Failed to save interview prep:", error);
      setPrep(previous);
      toast.error("Failed to save. Please try again.");
      return;
    }
    onUpdate();
  };

  const items = [
    { key: "questions_prepared", label: "Questions Prepared" },
    { key: "company_research_done", label: "Company Research Done" },
    { key: "mock_interview_completed", label: "Mock Interview Completed" },
  ];

  const completedCount = items.filter((item) => prep[item.key]).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-wider text-[#9C9DA1] font-medium">
          Interview Preparation
        </p>
        <span className="text-xs text-[#52545A]">
          {completedCount}/{items.length} Complete
        </span>
      </div>

      {app.status !== "applied" && app.status !== "interviewing" && app.status !== "offer" ? (
        <p className="text-xs text-[#9C9DA1] py-4 text-center">
          Interview prep will unlock once you've applied to this role.
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <label
              key={item.key}
              className="flex items-center gap-3 p-3 bg-[#F4F4F2] rounded-lg cursor-pointer hover:bg-[#E8E8E5] transition-colors"
            >
              <Checkbox
                checked={prep[item.key]}
                onCheckedChange={() => handleToggle(item.key)}
                disabled={saving}
              />
              <span className="text-sm text-[#0E1014] flex-1">{item.label}</span>
              {prep[item.key] ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <Circle className="w-4 h-4 text-[#9C9DA1]" />
              )}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}