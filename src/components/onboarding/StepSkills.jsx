import React from "react";
import RdSkillTagInput from "@/components/redesign/RdSkillTagInput";
import RdSkillChipBank from "@/components/redesign/RdSkillChipBank";
import RdSkipFooter from "@/components/redesign/RdSkipFooter";
import { matchesSkill } from "./skillBank";

// "Any other skills?" — optional catch-all after StepRoleSkills.
// The bulk of skill capture now happens per-experience/education/project
// in StepRoleSkills; this page exists for skills not tied to any
// specific source (broad capabilities, self-taught, side projects, etc.).
//
// Restyled for PR 2B — behaviour identical to the Direction-3 version.
// SkillTagInput → RdSkillTagInput and SkillChipBank → RdSkillChipBank.
// Both are behaviour-identical forks (same canonical-library suggestion
// source, same chip categories, same matchesSkill helper).
// Skill-picking UX preserved verbatim per the standing skill guarantee.

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
        <p className="text-[10.5px] uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow font-mono">
          step 6 of 9 · any other skills
        </p>
        <h1 className="font-display font-extrabold text-[26px] sm:text-[28px] leading-[1.1] tracking-tight text-rd-text mt-2">
          Any other skills?
        </h1>
        <p className="text-[13.5px] leading-[1.6] text-rd-text-secondary mt-3">
          You&apos;ve already tagged skills under each role, degree, and project. This catch-all is for anything that doesn&apos;t belong to a specific experience — broad capabilities, side learning, or things you&apos;ve picked up outside work.
        </p>
        <p className="text-[11.5px] text-rd-text-secondary mt-2 leading-snug">
          Optional. Only add skills you can actually demonstrate in an interview.
        </p>
      </div>

      <div className="bg-rd-bg-card border border-rd-border rounded-[14px] p-5">
        <RdSkillTagInput
          label={skills.length > 0 ? `Selected (${skills.length})` : undefined}
          description="Search 595 standard skills or type your own."
          tags={skills}
          onChange={setSkills}
          suggestionType="library_skills"
          placeholder="Search skills, or type and press Enter to add custom"
        />
      </div>

      <div className="bg-rd-bg-card border border-rd-border rounded-[14px] p-5">
        <RdSkillChipBank selected={skills} onToggle={toggleSkill} />
      </div>

      <RdSkipFooter onBack={onBack} onSkip={onNext} onContinue={onNext} />
    </div>
  );
}
