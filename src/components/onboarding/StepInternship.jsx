import React from "react";
import { Briefcase, User2, X, ArrowRight } from "lucide-react";
import RdButton from "@/components/redesign/RdButton";

// Onboarding internship step — captures profiles.practicum_path (DB
// column name kept; see CLAUDE.md). The institution-detection regex
// remains as a future hook for cohort-specific framing, but copy is
// generic across both branches today.
//
// "No" leaves practicum_path = null, which makes /Internship redirect
// home (the page guards on practicum_path before rendering).
//
// Phase 1 onboarding trim: practicum_cohort capture removed. The DB
// column stays (post-onboarding profile editor still surfaces it).
//
// Visual: redesigned for PR 2A — --rd-* tokens, Rokkitt heading,
// peach-framed shell. Behaviour identical to the Direction-3 version.

const INTERNSHIP_PROGRAM_PATTERNS = [/reichman/i, /idc\s*herzliya/i, /\bidc\b/i];
const STUDENT_LEVELS = new Set(["bachelors", "masters", "phd"]);

function looksLikeKnownInternshipProgram(institution) {
  if (!institution || typeof institution !== "string") return false;
  return INTERNSHIP_PROGRAM_PATTERNS.some((re) => re.test(institution));
}

function knownInternshipProgramFromEducations(educations) {
  if (!Array.isArray(educations)) return "";
  const candidates = educations.filter(
    (e) => e?.is_current === true && STUDENT_LEVELS.has(e?.education_level)
  );
  for (const e of candidates) {
    if (looksLikeKnownInternshipProgram(e.institution)) return e.institution;
  }
  for (const e of educations) {
    if (looksLikeKnownInternshipProgram(e?.institution)) return e.institution;
  }
  return "";
}

export default function StepInternship({ data, onChange, educations, onNext, onBack }) {
  // Detection retained but unused for copy variation today — both branches
  // get the same generic phrasing. Kept around for a future cohort-aware
  // surface that doesn't leak school branding into shared UX.
  const isKnownInternshipProgram = !!knownInternshipProgramFromEducations(educations);
  void isKnownInternshipProgram;
  const path = data.practicum_path || null;

  const headline = "Are you enrolled in your school's internship program?";
  const description =
    "Some universities run an internship program - faculty-coordinated placements or student-sourced under program oversight. A \"yes\" here lets the Internship Finder reference your program enrollment in outreach. Pick \"no\" if your school doesn't have one or you're not enrolled.";

  const setPath = (next) => {
    const newPath = next === path ? null : next;
    onChange({
      ...data,
      practicum_path: newPath,
    });
  };

  return (
    <div className="space-y-7">
      <div>
        <p className="text-[10.5px] uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow font-mono">
          step 3 of 6 · internship
        </p>
        <h1 className="font-display font-extrabold text-[26px] sm:text-[28px] leading-[1.1] tracking-tight text-rd-text mt-2">
          {headline}
        </h1>
        <p className="text-[13.5px] leading-[1.6] text-rd-text-secondary mt-3">
          {description}
        </p>
      </div>

      <div className="space-y-2.5">
        <OptionCard
          icon={Briefcase}
          title="Yes - enrolled, placement arranged by faculty"
          description="I'm in my school's internship program. My faculty mentor coordinates the placement; the company is (or will be) assigned by them."
          selected={path === "faculty_assigned"}
          onClick={() => setPath("faculty_assigned")}
        />
        <OptionCard
          icon={User2}
          title="Yes - enrolled, I source my own placement"
          description="I'm in my school's internship program, and I'm responsible for sourcing and pitching the company myself (under program oversight)."
          selected={path === "self_sourced"}
          onClick={() => setPath("self_sourced")}
        />
        <OptionCard
          icon={X}
          title="No, I'm not enrolled in an internship program"
          description="Skip this - Get A Job will still help with everything else (CV, LinkedIn, applications, stories)."
          selected={path === null && data.practicum_path !== undefined}
          onClick={() => setPath(null)}
        />
      </div>

      <div className="flex justify-between items-center pt-2">
        <button
          onClick={onBack}
          className="text-[13px] font-semibold text-rd-text-tertiary hover:text-rd-text transition-colors"
        >
          ← Back
        </button>
        <RdButton onClick={onNext}>
          Continue <ArrowRight className="w-4 h-4" />
        </RdButton>
      </div>
    </div>
  );
}

function OptionCard({ icon: Icon, title, description, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full text-left flex items-start gap-4 p-4 rounded-[14px] transition-[border-color,background-color,box-shadow] duration-150",
        "border bg-rd-bg-card",
        selected
          ? "border-rd-coral shadow-[0_0_0_3px_var(--rd-coral-tint)]"
          : "border-rd-border hover:border-rd-border-hover",
      ].join(" ")}
      data-selected={selected}
    >
      <div
        className={[
          "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors",
          selected
            ? "bg-rd-coral text-white"
            : "bg-rd-bg-soft text-rd-text-secondary",
        ].join(" ")}
      >
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-display font-semibold text-[14.5px] text-rd-text">{title}</p>
        <p className="text-[12.5px] text-rd-text-secondary leading-[1.5] mt-1">{description}</p>
      </div>
    </button>
  );
}
