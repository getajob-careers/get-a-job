import React from "react";
import { Check } from "lucide-react";
import { SKILL_BANK, matchesSkill } from "@/components/onboarding/skillBank";

// RdSkillChipBank — redesign fork of SkillChipBank.
//
// Behaviour parity with the canonical SkillChipBank is intentional:
//   - Same SKILL_BANK source (6 categories × 18 chips)
//   - Same matchesSkill case-insensitive lookup
//   - Same compact-mode behaviour (smaller chip + label sizes for per-
//     card context in StepRoleSkills)
//   - Same selected-count subtitle per category
//
// User-facing guarantee preserved (SKILL GUARANTEE, top priority): the
// user keeps seeing the same chips to choose from. Only the chip styling
// changes — chips render in --rd-* tokens with a coral selected state.

export default function RdSkillChipBank({ selected, onToggle, compact = false }) {
  const skills = Array.isArray(selected) ? selected : [];
  const sectionGap = compact ? "space-y-3" : "space-y-6";
  const headerMargin = compact ? "mb-2" : "mb-4";
  const iconSize = compact ? "w-8 h-8" : "w-9 h-9";
  const chipPad = compact ? "px-2.5 py-1" : "px-3 py-1.5";

  return (
    <div className={sectionGap}>
      {SKILL_BANK.map((section) => {
        const Icon = section.icon;
        const sectionSelectedCount = section.chips.filter((c) => matchesSkill(skills, c)).length;
        return (
          <div key={section.key}>
            <div className={`flex items-center gap-2.5 ${headerMargin}`}>
              <div
                className={`${iconSize} rounded-lg bg-rd-bg-soft flex items-center justify-center flex-shrink-0`}
              >
                <Icon className="w-4 h-4 text-rd-text-secondary" />
              </div>
              <div className="min-w-0">
                <p
                  className={`${compact ? "text-xs" : "text-sm"} font-display font-semibold text-rd-text`}
                >
                  {section.label}
                </p>
                {sectionSelectedCount > 0 && (
                  <p className="text-[10px] text-rd-text-secondary">
                    {sectionSelectedCount} selected
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {section.chips.map((chip) => {
                const isSelected = matchesSkill(skills, chip);
                return (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => onToggle(chip)}
                    className={
                      isSelected
                        ? `inline-flex items-center gap-1.5 text-xs bg-rd-coral text-white ${chipPad} rounded-full border border-rd-coral hover:bg-rd-coral-dark hover:border-rd-coral-dark transition-colors`
                        : `inline-flex items-center gap-1.5 text-xs bg-rd-bg-card text-rd-text-secondary ${chipPad} rounded-full border border-rd-border hover:border-rd-border-hover hover:text-rd-text transition-colors`
                    }
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                    {chip}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
