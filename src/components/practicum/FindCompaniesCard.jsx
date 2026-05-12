import React, { useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "sonner";
import { Search, Loader2 } from "lucide-react";

// Trigger card for match-internship-companies. Rate-limited 4/hr at
// the backend; we surface 429 as a friendly toast. After success,
// invalidate the company_targets query so the kanban re-fetches.

export default function FindCompaniesCard({ disabled, disabledReason }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [running, setRunning] = useState(false);

  const handleFind = async () => {
    if (running || disabled) return;
    setRunning(true);

    try {
      const { data, error } = await supabase.functions.invoke("match-internship-companies", { body: {} });

      if (error) {
        const status = error?.context?.status;
        if (status === 429) {
          toast.error("Rate limit reached — try again in an hour.");
        } else if (status === 400) {
          const message = error?.context?.error || "Preconditions not met. Check your profile and pitch strategy.";
          toast.error(message);
        } else {
          toast.error("Couldn't run the matcher. Please try again.");
        }
        return;
      }

      if (!data) {
        toast.error("No response from the matcher.");
        return;
      }

      if (data.matched === 0 && data.message) {
        toast.message(data.message);
        return;
      }

      const top = data.top_targets?.[0]?.name;
      const summary = top
        ? `${data.matched} companies scored — top: ${top}`
        : `${data.matched} companies scored.`;
      toast.success(summary);

      queryClient.invalidateQueries({ queryKey: ["company_targets", user?.id] });
    } catch {
      toast.error("Couldn't run the matcher. Please try again.");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-[#E5E5E5] p-5 mb-5">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg bg-[#0A0A0A] flex items-center justify-center flex-shrink-0">
          <Search className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold text-[#0A0A0A] mb-1">Find companies that match your pitch</h2>
          <p className="text-sm text-[#525252] leading-relaxed mb-4">
            We'll score the top candidates against your strategy and add them to your kanban. Companies you've already engaged with stay untouched.
          </p>
          <button
            type="button"
            onClick={handleFind}
            disabled={running || disabled}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#0A0A0A] hover:bg-[#262626] disabled:bg-[#E5E5E5] disabled:text-[#A3A3A3] disabled:cursor-not-allowed text-white rounded-md transition-colors"
            title={disabled ? disabledReason : ""}
          >
            {running ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Scoring companies…
              </>
            ) : (
              <>
                <Search className="w-3.5 h-3.5" />
                Find companies
              </>
            )}
          </button>
          {disabled && disabledReason && (
            <p className="text-[11px] text-[#A3A3A3] mt-2">{disabledReason}</p>
          )}
        </div>
      </div>
    </div>
  );
}
