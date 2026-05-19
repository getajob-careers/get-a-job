import React from "react";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import {
  CheckCircle2, Clock, X,
  FileText, Send, RotateCw, Mic, Dumbbell, Lightbulb, User, BookText,
} from "lucide-react";

// DailyActionCard — top of Home dashboard (per design-strategy.md §3).
//
// Lazy generation pattern: on mount, invoke generate-daily-action edge
// function. The function short-circuits if today's row exists and returns
// it; otherwise it scores the candidate pool, picks one, gets an LLM
// framing, and inserts. UNIQUE (user_id, for_date) enforces one per day.
//
// Action handlers UPDATE daily_actions directly (RLS allows own-row).
// Reflect is the exception: instead of marking done locally, it navigates
// to AddInformation with location.state carrying the daily_action id +
// reflection prompt. AddInformation reads that, opens its existing Story
// Bank quick-add modal with the custom framing, and marks the daily_action
// done after the story saves — "the reflection IS the capture."

const REFLECTION_PROMPT =
  "What did this week teach you? Reflect on one specific moment from your work — a customer call, a tough decision, a small win — and we'll turn it into a story.";

const ICON_BY_TYPE = {
  apply: FileText,
  reach_out: Send,
  follow_up: RotateCw,
  interview_prep: Mic,
  skill_practice: Dumbbell,
  reflect: Lightbulb,
  update_profile: User,
  capture_story: BookText,
};

export default function DailyActionCard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ["daily_action", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("generate-daily-action", { body: {} });
      if (error) {
        // Rate limit + auth errors surface as messages; other errors silent (daily action is optional).
        const status = error?.context?.status;
        if (status === 429) throw new Error("Rate limit reached. Try again in an hour.");
        if (status === 401 || status === 404) throw new Error("Profile incomplete.");
        throw new Error(error.message || "Couldn't load daily action.");
      }
      return data?.daily_action || null;
    },
    enabled: !!user?.id,
    // Don't refetch on window focus — the action is stable for the day.
    refetchOnWindowFocus: false,
    // 30 minutes — if user kept the tab open past the day boundary, the
    // next interaction will refetch and either return the same row or
    // (after midnight) trigger a fresh generation.
    staleTime: 30 * 60 * 1000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["daily_action", user?.id] });

  const markStatus = async (status) => {
    if (!data?.id) return;
    const { error } = await supabase
      .from("daily_actions")
      .update({
        status,
        completed_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (error) {
      toast.error("Couldn't update — please try again.");
      return;
    }
    invalidate();
  };

  const handleDone = async () => {
    if (data?.action_type === "reflect") {
      // Reflect Done navigates to AddInformation with the daily action
      // context. AddInformation opens its Story Bank quick-add modal,
      // uses the prompt as `framing`, and marks the daily action done
      // after the story saves. Until then, the action stays pending so
      // the user can come back if they cancel.
      navigate(createPageUrl("Profile"), {
        state: {
          dailyAction: {
            id: data.id,
            prompt: REFLECTION_PROMPT,
          },
        },
      });
      return;
    }
    await markStatus("done");
  };

  if (isLoading) {
    return <SkeletonCard />;
  }

  if (error) {
    // Soft-fail: daily action is optional. Render nothing rather than
    // a banner — Home dashboard has other content the user can use.
    console.warn("[DailyActionCard]", error.message);
    return null;
  }

  if (!data) {
    return null;
  }

  if (data.status !== "pending") {
    return <DoneState status={data.status} />;
  }

  const Icon = ICON_BY_TYPE[data.action_type] || Lightbulb;

  return (
    <div className="bg-white rounded-xl border border-[#E5E5E5] p-5 mb-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#0A0A0A] flex items-center justify-center flex-shrink-0">
            <Icon className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[#A3A3A3] font-medium">Today</p>
            <p className="text-[10px] text-[#A3A3A3]">
              {data.estimated_minutes ? `~${data.estimated_minutes} min` : "Quick win"}
            </p>
          </div>
        </div>
      </div>

      <h2 className="text-base font-semibold text-[#0A0A0A] leading-snug mb-2">{data.title}</h2>
      <p className="text-sm text-[#525252] leading-relaxed mb-4">{data.rationale}</p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleDone}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#0A0A0A] hover:bg-[#262626] text-white rounded-md transition-colors"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          Done
        </button>
        <button
          type="button"
          onClick={() => markStatus("snoozed")}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-[#E5E5E5] hover:bg-[#FAFAFA] text-[#525252] rounded-md transition-colors"
        >
          <Clock className="w-3.5 h-3.5" />
          Snooze
        </button>
        <button
          type="button"
          onClick={() => markStatus("dismissed")}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#A3A3A3] hover:text-[#525252] rounded-md transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          Not relevant
        </button>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-[#E5E5E5] p-5 mb-5 animate-pulse">
      <div className="flex items-start gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-[#F0F0F0]" />
        <div className="space-y-1.5">
          <div className="h-2 w-12 bg-[#F0F0F0] rounded" />
          <div className="h-2 w-16 bg-[#F0F0F0] rounded" />
        </div>
      </div>
      <div className="h-4 w-3/4 bg-[#F0F0F0] rounded mb-2" />
      <div className="h-3 w-full bg-[#F0F0F0] rounded mb-1.5" />
      <div className="h-3 w-2/3 bg-[#F0F0F0] rounded" />
    </div>
  );
}

function DoneState({ status }) {
  // Per design call: one thin line after action, no second card same day.
  const message =
    status === "done"
      ? "Done for today — see you tomorrow."
      : status === "snoozed"
        ? "Catch you tomorrow."
        : "Got it — we'll learn from that.";
  const Icon = status === "done" ? CheckCircle2 : status === "snoozed" ? Clock : X;
  return (
    <div className="flex items-center gap-2 mb-5 px-4 py-2.5 text-xs text-[#525252] bg-[#FAFAFA] border border-[#F0F0F0] rounded-md">
      <Icon className="w-3.5 h-3.5 text-[#A3A3A3]" />
      <span>{message}</span>
    </div>
  );
}
