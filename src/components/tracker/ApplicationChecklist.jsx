import React from "react";
import { CheckCircle2, Circle, Lock, Star } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    key: "qualification_confirmed",
    label: "Confirm You Qualify",
    description: "Check the tier for this role in Career Roadmap. Focus on Tier 1 (Your Move) — your strongest matches with high goal alignment. Tier 2 (Plan B) roles are also strong fits worth applying to. Tier 3 (Work Toward) roles need more skill-building before applying — wait or close the gap first.",
    step: 1,
  },
  {
    key: "jd_dissected",
    label: "Dissect the Job Description",
    description: "Paste the JD in the 'Target Role' tab. Identify the 3 core responsibilities, 3 must-have skills, tools required, and seniority signals. Know this role better than other applicants.",
    step: 2,
  },
  {
    key: "cv_tailored",
    label: "Tailor Your CV to This Role",
    description: "Go to the 'CV' tab. Rewrite your bullets to mirror the JD language. Move your most relevant experience to the top. A generic CV gets ignored — a tailored one gets calls.",
    step: 3,
  },
  {
    key: "skills_proof_mapped",
    label: "Map Proof for Every Skill",
    description: "Go to the 'Skills' tab. For each required skill, attach a project, course, or experience as evidence. Interviewers will ask — have an answer ready before you even apply.",
    step: 4,
  },
  {
    key: "referral_attempted",
    label: "Find & Reach Out for a Referral",
    description: "Go to the 'Networking' tab. Find 2+ people at this company on LinkedIn. A referral gets your CV seen by a human, skips ATS filtering, and — crucially — many companies offer referral bonuses to employees when a candidate they refer gets hired — so they're genuinely motivated to help you.",
    step: 5,
    highlight: true,
  },
  {
    key: "application_submitted",
    label: "Submit the Application",
    description: "Only apply after all 5 steps above are done. Submitting early without prep is the #1 reason candidates get rejected. Go to the 'Application' tab to log the submission date and CV version used.",
    step: 6,
  },
  {
    key: "interview_prep_done",
    label: "Prepare for the Interview",
    description: "Go to the 'Interview' tab. Review likely questions, prep STAR-format answers, and research the company. Most candidates wing it — this is how you stand out.",
    step: 7,
  },
];

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

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] uppercase tracking-wider text-[#9C9DA1] font-medium">
          Application Checklist
        </p>
        <span className="text-[11px] text-[#9C9DA1]">
          {completedCount}/{STEPS.length} steps
        </span>
      </div>

      <div className="mb-4 px-4 py-3 bg-blue-50 border border-blue-100 rounded-lg">
        <p className="text-xs text-blue-800 font-semibold mb-1">How this works</p>
        <p className="text-[11px] text-blue-700 leading-relaxed">
          Follow all 7 steps <em>before</em> submitting. Most applicants skip steps 3–5 — that's exactly how you beat them. Step 5 (referral) is the highest-leverage action: your CV gets seen by a human, ATS is bypassed, and many companies offer referral bonuses to employees when a referred candidate gets hired — so your contact is genuinely motivated to help you.
        </p>
      </div>

      {!isReadyToApply && !checklist.application_submitted && (
        <div className="mb-3 px-3 py-2 bg-amber-50 border border-amber-100 rounded-lg">
          <p className="text-[11px] text-amber-700 font-medium">
            ⚠ Application locked until steps 1–5 are complete. Do not skip the process.
          </p>
        </div>
      )}

      <div className="space-y-2">
        {STEPS.map((step) => {
          const done = !!checklist[step.key];
          const isLocked =
            step.key === "application_submitted" && !isReadyToApply && !done;

          return (
            <div
              key={step.key}
              className={cn(
                "flex items-start gap-3 px-3 py-2.5 rounded-lg border transition-colors",
                done
                  ? "bg-emerald-50 border-emerald-100"
                  : isLocked
                  ? "bg-[#F4F4F2] border-[#E8E8E5] opacity-50"
                  : "bg-white border-[#E8E8E5]"
              )}
            >
              <button
                onClick={() => !isLocked && toggle(step.key)}
                disabled={isLocked}
                className="mt-0.5 flex-shrink-0"
              >
                {isLocked ? (
                  <Lock className="w-4 h-4 text-[#9C9DA1]" />
                ) : done ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Circle className="w-4 h-4 text-[#9C9DA1] hover:text-[#9C9DA1] transition-colors" />
                )}
              </button>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className={cn("text-xs font-semibold", done ? "text-emerald-700" : "text-[#0E1014]")}>
                    Step {step.step} — {step.label}
                  </p>
                  {step.highlight && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-md">
                      <Star className="w-2.5 h-2.5" /> High Impact
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#9C9DA1] mt-0.5 leading-relaxed">{step.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}