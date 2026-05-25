import React from "react";
import { Check } from "lucide-react";
import { SKILL_BANK, matchesSkill } from "./skillBank";

// Shared 6-category chip grid. Used by:
//   - StepSkills (catch-all "Any other skills?" page)
//   - StepRoleSkills (per-experience/education/project card)
//
// Compact mode shrinks chip + label sizes for the per-card context where
// vertical real estate is tighter. Categories are always visible (Eli's
// decision Q1 — no nested accordions).
export default function SkillChipBank({ selected, onToggle, compact = false }) {
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
              <div className={`${iconSize} rounded-lg bg-[#E8E8E5] flex items-center justify-center flex-shrink-0`}>
                <Icon className="w-4 h-4 text-[#52545A]" />
              </div>
              <div className="min-w-0">
                <p className={`${compact ? "text-xs" : "text-sm"} font-semibold text-[#0E1014]`}>{section.label}</p>
                {sectionSelectedCount > 0 && (
                  <p className="text-[10px] text-[#9C9DA1]">{sectionSelectedCount} selected</p>
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
                        ? `inline-flex items-center gap-1.5 text-xs bg-[#0E1014] text-white ${chipPad} rounded-full border border-[#0E1014] hover:bg-[#F87060] hover:border-[#F87060] transition-colors`
                        : `inline-flex items-center gap-1.5 text-xs bg-white text-[#52545A] ${chipPad} rounded-full border border-[#DDDDDB] hover:border-[#52545A] hover:text-[#0E1014] transition-colors`
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
