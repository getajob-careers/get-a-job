import React from "react";
import { Briefcase, User2, X, ArrowRight } from "lucide-react";

// Onboarding practicum step — captures profiles.practicum_path +
// practicum_cohort. The institution-detection regex remains as a future
// hook for cohort-specific framing, but copy is generic across both
// branches today (universal language; we used to surface school-specific
// copy when the detection matched, which leaked branding).
//
// "No" leaves practicum_path = null, which makes /Practicum render the
// NoPracticumPath empty state.

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

export default function StepPracticum({ data, onChange, educations, onNext, onBack }) {
  // Detection retained but unused for copy variation today — both branches
  // get the same generic phrasing. Kept around for a future cohort-aware
  // surface that doesn't leak school branding into shared UX.
  const isKnownInternshipProgram = !!knownInternshipProgramFromEducations(educations);
  void isKnownInternshipProgram;
  const path = data.practicum_path || null;

  const headline = "Are you part of an internship program?";
  const description = "Some universities and programs coordinate internships through faculty. Let us know so we can tailor the Internship Finder.";

  const setPath = (next) => {
    const newPath = next === path ? null : next;
    onChange({
      ...data,
      practicum_path: newPath,
      ...(newPath === null && { practicum_cohort: "" }),
    });
  };

  return (
    <div className="space-y-7">
      <div>
        <h1 className="onb-h1">{headline}</h1>
        <p className="onb-sub">{description}</p>
      </div>

      <div className="space-y-2.5">
        <OptionCard
          icon={Briefcase}
          title="Yes — placement arranged by faculty"
          description="My faculty mentor coordinates the internship; the company has been (or will be) assigned."
          selected={path === "faculty_assigned"}
          onClick={() => setPath("faculty_assigned")}
        />
        <OptionCard
          icon={User2}
          title="Yes — I find my own internship"
          description="I'm responsible for sourcing and pitching the company myself."
          selected={path === "self_sourced"}
          onClick={() => setPath("self_sourced")}
        />
        <OptionCard
          icon={X}
          title="No, I'm not in a practicum"
          description="Skip this — Get A Job will still help with everything else (CV, LinkedIn, applications, stories)."
          selected={path === null && data.practicum_path !== undefined}
          onClick={() => setPath(null)}
        />
      </div>

      {path && (
        <div className="onb-card">
          <label className="onb-label">Cohort <span className="text-[#9C9DA1] font-normal">(optional)</span></label>
          <input
            type="text"
            value={data.practicum_cohort || ""}
            onChange={(e) => onChange({ ...data, practicum_cohort: e.target.value })}
            placeholder="e.g. Spring 2026"
            className="onb-input"
          />
          <p className="onb-help">
            Helps faculty and admins group students for cohort-level analytics. You can skip this.
          </p>
        </div>
      )}

      <div className="flex justify-between pt-2">
        <button onClick={onBack} className="onb-btn onb-btn-outline">Back</button>
        <button onClick={onNext} className="onb-btn onb-btn-primary onb-btn-lg">
          Continue <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function OptionCard({ icon: Icon, title, description, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="onb-option-card"
      data-selected={selected}
    >
      <div className="onb-option-card-icon">
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="onb-option-card-title">{title}</p>
        <p className="onb-option-card-desc">{description}</p>
      </div>
    </button>
  );
}
