import React from "react";
import { CheckCircle2, Circle, Lock, Star } from "lucide-react";

// PR 3E — Restyled on rd tokens with the grouped 7-step layout from
// docs/design/redesign/getajob_tracker_seven_step_guide.html. The 7
// checklist keys (P15) and lock rules (step 6 disabled until steps 1-5
// done) are preserved 1:1. Only the visual reflow changes — same data
// shape, same toggle behaviour, same optimistic-update + rollback
// pattern in the parent (P5).

const STEPS = [
  {
    key: "qualification_confirmed",
    label: "Confirm You Qualify",
    description: "Check the track for this role in Career Roadmap. Focus on Track 1 (Your Move) — your strongest matches with high goal alignment. Track 2 (Plan B) roles are also strong fits worth applying to. Track 3 (Work Toward) roles need more skill-building before applying — wait or close the gap first.",
    step: 1,
    phase: "know",
  },
  {
    key: "jd_dissected",
    label: "Dissect the Job Description",
    description: "Paste the JD in the 'Target Role' tab. Identify the 3 core responsibilities, 3 must-have skills, tools required, and seniority signals. Know this role better than other applicants.",
    step: 2,
    phase: "know",
  },
  {
    key: "cv_tailored",
    label: "Tailor Your CV to This Role",
    description: "Go to the 'CV' tab. Rewrite your bullets to mirror the JD language. Move your most relevant experience to the top. A generic CV gets ignored — a tailored one gets calls.",
    step: 3,
    phase: "build",
  },
  {
    key: "skills_proof_mapped",
    label: "Map Proof for Every Skill",
    description: "Go to the 'Skills' tab. For each required skill, attach a project, course, or experience as evidence. Interviewers will ask — have an answer ready before you even apply.",
    step: 4,
    phase: "build",
  },
  {
    key: "referral_attempted",
    label: "Find & Reach Out for a Referral",
    description: "Go to the 'Networking' tab. Find 2+ people at this company on LinkedIn. A referral gets your CV seen by a human, skips ATS filtering, and — crucially — many companies offer referral bonuses to employees when a candidate they refer gets hired — so they're genuinely motivated to help you.",
    step: 5,
    phase: "build",
    highlight: true,
  },
  {
    key: "application_submitted",
    label: "Submit the Application",
    description: "Only apply after all 5 steps above are done. Submitting early without prep is the #1 reason candidates get rejected. Go to the 'Application' tab to log the submission date and CV version used.",
    step: 6,
    phase: "apply",
  },
  {
    key: "interview_prep_done",
    label: "Prepare for the Interview",
    description: "Go to the 'Interview' tab. Review likely questions, prep STAR-format answers, and research the company. Most candidates wing it — this is how you stand out.",
    step: 7,
    phase: "apply",
  },
];

// Phase palette — matches the "How to use" tiles on the Tracker page so
// the 7-step framing reads as one continuous visual story.
const PHASES = {
  know:  {
    label:      "Know the role",
    headerBg:   "var(--rd-golden-tint)",
    headerFg:   "var(--rd-golden-dark)",
    rowTint:    "var(--rd-golden-tint)",
    accent:     "var(--rd-golden)",
    badgeBg:    "var(--rd-golden)",
  },
  build: {
    label:      "Build your case",
    headerBg:   "var(--rd-teal-tint)",
    headerFg:   "var(--rd-teal-dark)",
    rowTint:    "var(--rd-teal-tint)",
    accent:     "var(--rd-teal)",
    badgeBg:    "var(--rd-teal)",
  },
  apply: {
    label:      "Apply & prep",
    headerBg:   "var(--rd-coral-tint)",
    headerFg:   "var(--rd-coral-dark)",
    rowTint:    "var(--rd-coral-tint)",
    accent:     "var(--rd-coral)",
    badgeBg:    "var(--rd-coral)",
  },
};

const PHASE_ORDER = ["know", "build", "apply"];

export default function ApplicationChecklist({ checklist = {}, onChange }) {
  const completedCount = STEPS.filter((s) => checklist[s.key]).length;
  const isReadyToApply =
    checklist.qualification_confirmed &&
    checklist.jd_dissected &&
    checklist.cv_tailored &&
    checklist.skills_proof_mapped &&
    checklist.referral_attempted;

  const toggle = (key) => {
    onChange({ ...checklist, [key]: !checklist[key] });
  };

  const stepsByPhase = PHASE_ORDER.reduce((acc, phase) => {
    acc[phase] = STEPS.filter((s) => s.phase === phase);
    return acc;
  }, {});

  return (
    <div>
      {/* Header row — eyebrow + N/7 counter */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10.5px] uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow font-mono">
          Application Checklist
        </p>
        <span className="text-[11px] font-mono text-rd-text-secondary">
          {completedCount}/{STEPS.length} steps
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-[7px] rounded-full bg-rd-bg-soft overflow-hidden mb-4">
        <div
          className="h-full rounded-full bg-rd-coral transition-[width] duration-500 ease-out"
          style={{ width: `${(completedCount / STEPS.length) * 100}%` }}
        />
      </div>

      {/* "How this works" callout */}
      <div className="mb-4 rounded-[14px] border border-rd-border bg-rd-bg-soft px-4 py-3">
        <p className="text-[11.5px] font-display font-bold text-rd-text mb-1">
          How this works
        </p>
        <p className="text-[11.5px] text-rd-text-secondary leading-[1.55]">
          Follow all 7 steps <em>before</em> submitting. Most applicants skip steps 3–5 — that&apos;s exactly how you beat them. Step 5 (referral) is the highest-leverage action: your CV gets seen by a human, ATS is bypassed, and many companies offer referral bonuses to employees when a referred candidate gets hired — so your contact is genuinely motivated to help you.
        </p>
      </div>

      {/* Lock warning */}
      {!isReadyToApply && !checklist.application_submitted && (
        <div
          className="mb-3 rounded-[14px] px-3.5 py-2"
          style={{ background: "var(--rd-golden-tint)" }}
        >
          <p
            className="text-[11.5px] font-display font-semibold leading-snug"
            style={{ color: "var(--rd-golden-dark)" }}
          >
            ⚠ Application locked until steps 1–5 are complete. Don&apos;t skip the process.
          </p>
        </div>
      )}

      {/* Phase-grouped steps */}
      <div className="flex flex-col gap-4">
        {PHASE_ORDER.map((phase) => {
          const phaseSteps = stepsByPhase[phase];
          const phaseConfig = PHASES[phase];
          if (phaseSteps.length === 0) return null;
          return (
            <div key={phase}>
              <p
                className="font-display font-bold text-[11px] uppercase tracking-[0.08em] mb-2"
                style={{ color: phaseConfig.headerFg }}
              >
                {phaseConfig.label}
              </p>
              <div className="flex flex-col gap-2">
                {phaseSteps.map((step) => {
                  const done = !!checklist[step.key];
                  const isLocked =
                    step.key === "application_submitted" && !isReadyToApply && !done;
                  return (
                    <StepRow
                      key={step.key}
                      step={step}
                      phaseConfig={phaseConfig}
                      done={done}
                      isLocked={isLocked}
                      onToggle={() => !isLocked && toggle(step.key)}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StepRow({ step, phaseConfig, done, isLocked, onToggle }) {
  // Done row → fully tinted with phase color. Active/idle → cream with
  // subtle border. Locked → muted greyed-out.
  const bg = done
    ? phaseConfig.rowTint
    : isLocked
    ? "var(--rd-bg-soft)"
    : "var(--rd-bg-card)";
  const textColor = done
    ? phaseConfig.headerFg
    : isLocked
    ? "var(--rd-text-tertiary)"
    : "var(--rd-text)";
  const descColor = done
    ? phaseConfig.headerFg
    : isLocked
    ? "var(--rd-text-tertiary)"
    : "var(--rd-text-secondary)";

  return (
    <div
      className="flex items-start gap-3 rounded-[12px] px-3.5 py-2.5 border border-rd-border-subtle transition-colors"
      style={{ background: bg, opacity: isLocked ? 0.55 : 1 }}
    >
      <button
        type="button"
        onClick={onToggle}
        disabled={isLocked}
        aria-label={
          isLocked
            ? `${step.label} (locked)`
            : done
            ? `Mark step ${step.step} incomplete`
            : `Mark step ${step.step} complete`
        }
        className="mt-0.5 flex-shrink-0 disabled:cursor-not-allowed"
      >
        {isLocked ? (
          <Lock className="w-4 h-4 text-rd-text-tertiary" />
        ) : done ? (
          <CheckCircle2 className="w-4 h-4" style={{ color: phaseConfig.accent }} />
        ) : (
          <Circle className="w-4 h-4 text-rd-text-tertiary hover:text-rd-text transition-colors" />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p
            className="font-display font-bold text-[12.5px] leading-tight"
            style={{ color: textColor }}
          >
            Step {step.step} — {step.label}
          </p>
          {step.highlight && (
            <span
              className="inline-flex items-center gap-1 text-[9.5px] font-display font-extrabold tracking-[0.04em] uppercase rounded-md px-1.5 py-0.5"
              style={{
                background: "var(--rd-golden-tint)",
                color: "var(--rd-golden-dark)",
              }}
            >
              <Star className="w-2.5 h-2.5" /> High Impact
            </span>
          )}
        </div>
        <p
          className="text-[11.5px] leading-[1.5] mt-1"
          style={{ color: descColor }}
        >
          {step.description}
        </p>
      </div>
    </div>
  );
}
