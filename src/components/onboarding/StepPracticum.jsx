import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Briefcase, User2, X } from "lucide-react";

// Onboarding practicum step — captures profiles.practicum_path +
// practicum_cohort. Adapts copy by institution: Reichman students see
// Reichman framing; everyone else sees generic faculty-internship
// framing (same answer space, same DB fields).
//
// Three options on a single screen + optional cohort text. "No" leaves
// practicum_path = null, which makes /Practicum render the
// NoPracticumPath empty state.

const REICHMAN_PATTERNS = [/reichman/i, /idc\s*herzliya/i, /\bidc\b/i];
const STUDENT_LEVELS = new Set(["bachelors", "masters", "phd"]);

function looksLikeReichman(institution) {
  if (!institution || typeof institution !== "string") return false;
  return REICHMAN_PATTERNS.some((re) => re.test(institution));
}

// Pick which education row to check for Reichman matching. Prefer the
// user's current undergrad/grad row (the one driving their practicum
// eligibility) over a completed degree or a high-school row. For a
// dual-degree student with two current rows at Reichman, either match
// gives the same result (both are Reichman).
function reichmanInstitutionFromEducations(educations) {
  if (!Array.isArray(educations)) return "";
  const candidates = educations.filter(
    (e) => e?.is_current === true && STUDENT_LEVELS.has(e?.education_level)
  );
  for (const e of candidates) {
    if (looksLikeReichman(e.institution)) return e.institution;
  }
  // Fall back to any institution if no current-undergrad/grad row matches —
  // students between degrees should still see Reichman framing if their
  // most recent degree was at Reichman.
  for (const e of educations) {
    if (looksLikeReichman(e?.institution)) return e.institution;
  }
  return "";
}

export default function StepPracticum({ data, onChange, educations, onNext, onBack }) {
  const isReichman = !!reichmanInstitutionFromEducations(educations);
  const path = data.practicum_path || null;

  const headline = isReichman
    ? "Are you part of the Reichman practicum?"
    : "Are you part of a faculty-coordinated internship program?";

  const description = isReichman
    ? "The Reichman practicum runs Aug–Nov. We'll tailor the Internship Finder to your placement track."
    : "Some universities and programs coordinate internships through faculty. Let us know so we can tailor the Internship Finder.";

  const setPath = (next) => {
    // Clicking the currently-selected card toggles it off — gives the
    // user a way to clear their answer without back-navigating.
    const newPath = next === path ? null : next;
    onChange({
      ...data,
      practicum_path: newPath,
      ...(newPath === null && { practicum_cohort: "" }),
    });
  };

  const setCohort = (cohort) => {
    onChange({ ...data, practicum_cohort: cohort });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#0A0A0A] tracking-tight">{headline}</h2>
        <p className="text-sm text-[#525252] mt-1">{description}</p>
      </div>

      <div className="space-y-3">
        <OptionCard
          icon={Briefcase}
          title={isReichman ? "Yes — faculty-assigned placement" : "Yes — placement arranged by faculty"}
          description="My faculty mentor coordinates the internship; the company has been (or will be) assigned."
          selected={path === "faculty_assigned"}
          onClick={() => setPath("faculty_assigned")}
        />
        <OptionCard
          icon={User2}
          title={isReichman ? "Yes — I'll find my own (self-sourced)" : "Yes — I find my own internship"}
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
        <div className="bg-white rounded-xl border border-[#E5E5E5] p-5">
          <label className="block text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium mb-1">
            Cohort (optional)
          </label>
          <Input
            value={data.practicum_cohort || ""}
            onChange={(e) => setCohort(e.target.value)}
            placeholder={isReichman ? "e.g. Aug-Nov 2026" : "e.g. Spring 2026"}
          />
          <p className="text-[11px] text-[#A3A3A3] mt-2">
            Helps faculty and admins group students for cohort-level analytics. You can skip this.
          </p>
        </div>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} className="text-sm">Back</Button>
        <Button
          onClick={onNext}
          // No required selection — "No" is a valid answer, and so is
          // "I haven't decided yet, advance me anyway". Practicum is
          // optional context, not a gate.
          className="bg-[#0A0A0A] hover:bg-[#262626] text-sm px-6"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}

function OptionCard({ icon: Icon, title, description, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left bg-white rounded-xl border p-4 transition-all ${
        selected
          ? "border-[#0A0A0A] shadow-sm ring-1 ring-[#0A0A0A]"
          : "border-[#E5E5E5] hover:border-[#A3A3A3]"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
          selected ? "bg-[#0A0A0A]" : "bg-[#FAFAFA]"
        }`}>
          <Icon className={`w-4 h-4 ${selected ? "text-white" : "text-[#525252]"}`} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#0A0A0A] mb-0.5">{title}</p>
          <p className="text-xs text-[#525252] leading-relaxed">{description}</p>
        </div>
      </div>
    </button>
  );
}
