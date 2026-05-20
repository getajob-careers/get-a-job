import React, { useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, Circle } from "lucide-react";
import { toast } from "sonner";

export default function FollowUp({ app, onUpdate }) {
  const [followUp, setFollowUp] = useState(app.follow_up || {});
  const [saving, setSaving] = useState(false);

  const handleToggle = async (field) => {
    if (saving) return;
    const previous = followUp;
    const updated = { ...followUp, [field]: !followUp[field] };
    setFollowUp(updated);
    setSaving(true);
    const { error } = await supabase.from("applications").update({ follow_up: updated }).eq("id", app.id);
    setSaving(false);
    if (error) {
      console.error("Failed to save follow-up:", error);
      setFollowUp(previous);
      toast.error("Failed to save. Please try again.");
      return;
    }
    onUpdate();
  };

  const items = [
    { key: "follow_up_sent", label: "Follow-up Email Sent" },
    { key: "recruiter_contacted", label: "Recruiter Contacted" },
    { key: "response_received", label: "Response Received" },
  ];

  const completedCount = items.filter((item) => followUp[item.key] === true).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-wider text-[#9C9DA1] font-medium">
          Follow-Up Actions
        </p>
        <span className="text-xs text-[#52545A]">
          {completedCount}/{items.length} Complete
        </span>
      </div>

      {app.status !== "applied" && app.status !== "interviewing" && app.status !== "offer" ? (
        <p className="text-xs text-[#9C9DA1] py-4 text-center">
          Follow-up tracking will unlock once you've applied.
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <label
              key={item.key}
              className="flex items-center gap-3 p-3 bg-[#F4F4F2] rounded-lg cursor-pointer hover:bg-[#E8E8E5] transition-colors"
            >
              <Checkbox
                checked={followUp[item.key]}
                onCheckedChange={() => handleToggle(item.key)}
                disabled={saving}
              />
              <span className="text-sm text-[#0E1014] flex-1">{item.label}</span>
              {followUp[item.key] ? (
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