import React from "react";
import SkillTagInput from "./SkillTagInput";
import SkillChipBank from "./SkillChipBank";
import SkipFooter from "./SkipFooter";
import { matchesSkill } from "./skillBank";

// "Any other skills?" — optional catch-all after StepRoleSkills.
// The bulk of skill capture now happens per-experience/education/project
// in StepRoleSkills; this page exists for skills not tied to any
// specific source (broad capabilities, self-taught, side projects, etc.).
//
// Shared with StepRoleSkills via SkillChipBank — same 6 categories,
// same toggle behavior. Library autocomplete on top for searching the
// full 595-skill canonical library.

export default function StepSkills({ data, onChange, onNext, onBack }) {
  const skills = Array.isArray(data.skills) ? data.skills : [];
  const setSkills = (next) => onChange({ ...data, skills: next });

  const toggleSkill = (label) => {
    if (matchesSkill(skills, label)) {
      setSkills(skills.filter((s) => s.toLowerCase() !== label.toLowerCase()));
    } else {
      setSkills([...skills, label]);
    }
  };

  return (
    <div className="space-y-7">
      <div>
        <h1 className="onb-h1">Any other skills?</h1>
        <p className="onb-sub">
          You've already tagged skills under each role, degree, and project. This catch-all is for anything that doesn't belong to a specific experience — broad capabilities, side learning, or things you've picked up outside work.
        </p>
        <p className="onb-help">Optional. Only add skills you can actually demonstrate in an interview.</p>
      </div>

      <div className="onb-card">
        <SkillTagInput
          label={skills.length > 0 ? `Selected (${skills.length})` : undefined}
          description="Search 595 standard skills or type your own."
          tags={skills}
          onChange={setSkills}
          suggestionType="library_skills"
          placeholder="Search skills, or type and press Enter to add custom"
        />
      </div>

      <div className="onb-card">
        <SkillChipBank selected={skills} onToggle={toggleSkill} />
      </div>

      <SkipFooter
        onBack={onBack}
        onSkip={onNext}
        onContinue={onNext}
      />
    </div>
  );
}
