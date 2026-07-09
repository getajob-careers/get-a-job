import React from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Check, ArrowRight, ExternalLink, Lock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/api/supabaseClient";
import { createPageUrl } from "@/utils";
import { invokeWithAuthRetry } from "@/api/invokeWithAuthRetry";
import { trackCvGenerated } from "@/lib/analytics";

// 7-step application checklist, restyled per
// docs/design/redesign/getajob_application_steps_checklist.html (2026-06-05).
//
// Behaviour preserved 1:1 from the prior implementation:
//   - 7 checklist keys (P15)
//   - lock semantics for step 6 (application_submitted) — stays locked
//     until steps 1–5 are complete
//   - optimistic update + rollback pattern in the parent (P5)
//
// Net-new in this restyle:
//   - One CTA per step. CTAs route to either an agent page
//     (?application_id= + optional ?seed=), a sibling tab on the same
//     application detail (via onNavigateTab), the Outreach Coach
//     deep-link, or the company's careers URL.
//   - Phase-tinted color treatment matches the mockup's golden / teal /
//     coral palette via rd-tokens. Current-step is wrapped in a
//     cream-tinted highlight card with a solid coral CTA; other pending
//     steps use a muted tan pill.
//
// The first non-done step is the "current" step. Done steps render as
// muted "Done" with no CTA (clicking the marker still toggles them
// back to incomplete, same as before).

const STEPS = [
  {
    key: "qualification_confirmed",
    title: "Qualify yourself",
    description: "", // current-step gets no body text here
    descriptionWhenCurrent:
      "Check your fit for this role before you invest more time.",
    cta: {
      label: "Check if you qualify",
      icon: ArrowRight,
      action: "career_agent_with_seed",
    },
    phase: "know",
  },
  {
    key: "jd_dissected",
    title: "Dissect the job description",
    description: "",
    descriptionWhenCurrent:
      "Know the role inside-out - responsibilities, must-have skills, seniority signals.",
    cta: {
      label: "Review the job description",
      icon: ArrowRight,
      action: "navigate_tab",
      tab: "target",
    },
    phase: "know",
  },
  {
    key: "cv_tailored",
    title: "Tailor your CV",
    description: "Generate a CV tuned to this role's must-haves.",
    descriptionWhenCurrent: "Generate a CV tuned to this role's must-haves.",
    cta: {
      label: "Generate tailored CV",
      icon: ArrowRight,
      action: "generate_cv",
    },
    phase: "build",
  },
  {
    key: "skills_proof_mapped",
    title: "Map your skill evidence",
    description: "Match your stories to what the role asks for.",
    descriptionWhenCurrent: "Match your stories to what the role asks for.",
    cta: {
      label: "See your skill match",
      icon: ArrowRight,
      action: "navigate_tab",
      tab: "skills",
    },
    phase: "build",
  },
  {
    key: "referral_attempted",
    title: "Find a referral contact",
    description: "Find someone at {company} who can refer you in.",
    descriptionWhenCurrent: "Find someone at {company} who can refer you in.",
    cta: {
      label: "Find a referral",
      icon: ArrowRight,
      action: "outreach_referral",
    },
    phase: "build",
  },
  {
    key: "application_submitted",
    title: "Submit your application",
    description: "Apply on the company's careers page.",
    descriptionWhenCurrent: "Apply on the company's careers page.",
    cta: { label: "Apply", icon: ExternalLink, action: "open_apply_url" },
    phase: "apply",
  },
  {
    key: "interview_prep_done",
    title: "Prep for the interview",
    description: "Practice STAR-format answers with the Interview Coach.",
    descriptionWhenCurrent:
      "Practice STAR-format answers with the Interview Coach.",
    cta: {
      label: "Open Interview Coach",
      icon: ArrowRight,
      action: "open_agent",
      page: "InterviewCoach",
    },
    phase: "apply",
  },
];

const PHASES = {
  know: { label: "Know the role", color: "var(--rd-golden-dark)" },
  build: { label: "Build your case", color: "var(--rd-teal-dark)" },
  apply: { label: "Apply & prep", color: "var(--rd-coral-dark)" },
};
const PHASE_ORDER = ["know", "build", "apply"];

// Seed message for step 1's Career Agent CTA. Kept in sync with the
// step's intent — qualification check scoped to a single application.
const STEP1_SEED =
  "Help me check whether I qualify for this role - walk through my track placement, goal alignment, and gaps.";

export default function ApplicationChecklist({
  app,
  checklist = {},
  onChange,
  onNavigateTab,
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const completedCount = STEPS.filter((s) => checklist[s.key]).length;
  const isReadyToApply =
    checklist.qualification_confirmed &&
    checklist.jd_dissected &&
    checklist.cv_tailored &&
    checklist.skills_proof_mapped &&
    checklist.referral_attempted;

  // The current step is the first non-done step (or null if all done).
  const currentStepKey = STEPS.find((s) => !checklist[s.key])?.key ?? null;

  const toggle = (key) => {
    onChange({ ...checklist, [key]: !checklist[key] });
  };

  const interpolate = (text) =>
    text.replaceAll("{company}", app?.company || "this company");

  const handleCta = (cta) => {
    switch (cta.action) {
      case "career_agent_with_seed": {
        if (!app?.id) return;
        const url =
          createPageUrl("CareerAgent") +
          `?application_id=${encodeURIComponent(app.id)}` +
          `&seed=${encodeURIComponent(STEP1_SEED)}`;
        navigate(url);
        return;
      }
      case "generate_cv": {
        // Generate the tailored CV directly (no more routing into chat to
        // prompt it). Fire-and-forget + global sonner toast so it survives the
        // user closing the drawer / navigating away while it generates (~30s);
        // the success toast deep-links into the CV studio at the new copy.
        if (!app?.id) return;
        const tId = toast.loading("Generating your tailored CV…");
        (async () => {
          // The checklist's `app` prop may be a narrow projection, so pull the
          // JD fresh rather than trusting app.job_description.
          let jd = app.job_description;
          if (!jd) {
            const { data: row } = await supabase
              .from("applications")
              .select("job_description")
              .eq("id", app.id)
              .maybeSingle();
            jd = row?.job_description || "";
          }
          if (!jd) {
            toast.error(
              "Add a job description first (step 2) so the CV can be tailored to it.",
              { id: tId },
            );
            return;
          }
          const genStartedAt = performance.now();
          const { data, error } = await invokeWithAuthRetry(
            "generate-tailored-cv",
            {
              body: {
                job_description: jd,
                target_role: app.role_title,
                application_id: app.id,
                cv_model: "sonnet",
              },
            },
          );
          if (error || !data?.cv_url) {
            trackCvGenerated({
              success: false,
              source: "tracker",
              model: "sonnet",
              application_id: app.id,
              role_title: app.role_title,
              duration_ms: Math.round(performance.now() - genStartedAt),
              failure_reason: data?.error || error?.message || "unknown",
            });
            toast.error("Couldn't generate the CV. Please try again.", {
              id: tId,
            });
            return;
          }
          trackCvGenerated({
            success: true,
            source: "tracker",
            model: data?.model || "sonnet",
            application_id: app.id,
            role_title: app.role_title,
            duration_ms: Math.round(performance.now() - genStartedAt),
            unsourced_bullets_count: Array.isArray(data?.unsourced_bullets)
              ? data.unsourced_bullets.length
              : 0,
          });
          // Studio deep-link (QA2): make the new tailored CV visible to the
          // CV-list cache so /CVAgent?application_id= resolves to it, not master.
          queryClient.invalidateQueries({ queryKey: ["applicationCvs"] });
          toast.success("Your tailored CV is ready.", {
            id: tId,
            duration: 15000,
            action: {
              label: "Open in CV Agent",
              onClick: () =>
                navigate(
                  createPageUrl("CVAgent") +
                    `?application_id=${encodeURIComponent(app.id)}`,
                ),
            },
          });
        })();
        return;
      }
      case "open_agent": {
        if (!app?.id || !cta.page) return;
        const url =
          createPageUrl(cta.page) +
          `?application_id=${encodeURIComponent(app.id)}`;
        navigate(url);
        return;
      }
      case "navigate_tab": {
        if (!cta.tab) return;
        onNavigateTab?.(cta.tab);
        return;
      }
      case "outreach_referral": {
        if (!app?.company) {
          // Without a company we can't seed the composer meaningfully —
          // fall back to the Networking tab + let the user fill it in.
          onNavigateTab?.("networking");
          return;
        }
        const params = new URLSearchParams({
          tab: "networking",
          goal: "ask_for_referral",
          prefillCompany: app.company,
        });
        if (app.role_title) params.set("prefillRole", app.role_title);
        navigate(`${createPageUrl("Linkedin")}?${params.toString()}`);
        return;
      }
      case "open_apply_url": {
        const url = app?.url;
        if (url) {
          // Open in a new tab so the user keeps the Tracker open and can
          // come back to log applied_date (which auto-completes this step).
          window.open(url, "_blank", "noopener,noreferrer");
        } else {
          // No URL on file — drop them on the Application tab to enter it.
          onNavigateTab?.("application");
        }
        return;
      }
      default:
        return;
    }
  };

  return (
    <div>
      {/* Progress bar — full-width track, coral fill, "{done} / 7" tail. */}
      <div className="flex items-center gap-2.5 mb-5">
        <div className="flex-1 h-[7px] rounded-full bg-rd-bg-soft overflow-hidden">
          <div
            className="h-full bg-rd-coral transition-[width] duration-500 ease-out"
            style={{ width: `${(completedCount / STEPS.length) * 100}%` }}
          />
        </div>
        <span className="font-display font-bold text-[12px] text-rd-text-secondary tabular-nums">
          {completedCount} / {STEPS.length}
        </span>
      </div>

      {/* Phase-grouped step list */}
      {PHASE_ORDER.map((phase) => {
        const phaseSteps = STEPS.map((s, i) => ({ ...s, step: i + 1 })).filter(
          (s) => s.phase === phase,
        );
        const phaseConfig = PHASES[phase];
        return (
          <div key={phase} className="mt-4 first:mt-0">
            <p
              className="font-display font-bold text-[11px] uppercase tracking-[0.04em] mb-1.5"
              style={{ color: phaseConfig.color }}
            >
              {phaseConfig.label}
            </p>
            <div className="flex flex-col">
              {phaseSteps.map((step) => {
                const done = !!checklist[step.key];
                const isCurrent = step.key === currentStepKey;
                const isLocked =
                  step.key === "application_submitted" &&
                  !isReadyToApply &&
                  !done;
                return (
                  <StepRow
                    key={step.key}
                    step={step}
                    done={done}
                    isCurrent={isCurrent}
                    isLocked={isLocked}
                    interpolate={interpolate}
                    onToggle={() => !isLocked && toggle(step.key)}
                    onCta={handleCta}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StepRow({
  step,
  done,
  isCurrent,
  isLocked,
  interpolate,
  onToggle,
  onCta,
}) {
  const description = isCurrent
    ? interpolate(step.descriptionWhenCurrent || step.description)
    : interpolate(step.description);
  const Icon = step.cta?.icon;

  // Current step is wrapped in a cream highlight card. Non-current rows
  // are plain, no card chrome — keeps the eye on the next action.
  const rowInner = (
    <div className="flex items-start gap-3 py-2 px-0.5">
      <StepMarker
        done={done}
        isCurrent={isCurrent}
        isLocked={isLocked}
        onToggle={onToggle}
      />
      <div className="flex-1 min-w-0">
        <p
          className={[
            "font-display font-bold text-[13.5px] leading-tight",
            done
              ? "text-rd-text-tertiary"
              : isLocked
                ? "text-rd-text-tertiary"
                : "text-rd-text",
          ].join(" ")}
        >
          {step.step} · {step.title}
        </p>
        {done ? (
          <p className="text-[11px] text-rd-text-tertiary mt-0.5">Done</p>
        ) : description ? (
          <p
            className={[
              "text-[11.5px] leading-[1.4] mt-0.5",
              isLocked ? "text-rd-text-tertiary" : "text-rd-text-secondary",
            ].join(" ")}
          >
            {description}
          </p>
        ) : null}

        {/* CTA — hidden when done; muted-tan when pending; solid-coral
            when current. Locked steps show a disabled lock pill. */}
        {!done &&
          step.cta &&
          (isLocked ? (
            <span
              className="inline-flex items-center gap-1.5 font-display font-semibold text-[11.5px] rounded-full px-3 py-1.5 mt-2 bg-rd-bg-soft text-rd-text-tertiary cursor-not-allowed"
              aria-disabled="true"
            >
              <Lock className="w-3 h-3" /> Locked
            </span>
          ) : (
            <button
              type="button"
              onClick={() => onCta(step.cta)}
              className={[
                "inline-flex items-center gap-1.5 font-display font-semibold text-[11.5px] rounded-full px-3 py-1.5 mt-2 transition-colors",
                isCurrent
                  ? "bg-rd-coral text-white hover:bg-rd-coral-dark"
                  : "bg-rd-bg-soft text-rd-text-secondary hover:bg-rd-border hover:text-rd-text border border-rd-border",
              ].join(" ")}
            >
              {step.cta.label}
              {Icon && <Icon className="w-3 h-3" />}
            </button>
          ))}
      </div>
    </div>
  );

  if (isCurrent) {
    return (
      <div className="bg-rd-bg-soft border border-rd-border rounded-[12px] my-1 px-2.5 py-0.5">
        {rowInner}
      </div>
    );
  }
  return rowInner;
}

function StepMarker({ done, isCurrent, isLocked, onToggle }) {
  // Done: filled coral circle with white check. Current: coral outline
  // circle. Pending: light-gray outline circle. Click anywhere toggles
  // (the user can still manually mark steps complete without clicking
  // the CTA — preserves the original toggle UX).
  const base =
    "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors";
  if (isLocked) {
    return (
      <span
        className={`${base} border-[1.5px] border-rd-border bg-rd-bg-soft cursor-not-allowed`}
        aria-label="Locked"
      >
        <Lock className="w-3 h-3 text-rd-text-tertiary" />
      </span>
    );
  }
  if (done) {
    return (
      <button
        type="button"
        onClick={onToggle}
        aria-label="Mark step incomplete"
        className={`${base} bg-rd-coral text-white hover:bg-rd-coral-dark`}
      >
        <Check className="w-3.5 h-3.5" strokeWidth={3} />
      </button>
    );
  }
  if (isCurrent) {
    return (
      <button
        type="button"
        onClick={onToggle}
        aria-label="Mark step complete"
        className={`${base} border-2 border-rd-coral bg-white hover:bg-rd-coral-tint`}
      />
    );
  }
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label="Mark step complete"
      className={`${base} border-[1.5px] border-rd-border bg-white hover:border-rd-coral`}
    />
  );
}
