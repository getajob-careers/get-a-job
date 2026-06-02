import React, { useState, useMemo } from "react";
import { Briefcase, GraduationCap, FolderGit2, ChevronDown, ChevronUp, CheckCircle2, Sparkles, Plus } from "lucide-react";
import RdSkillTagInput from "@/components/redesign/RdSkillTagInput";
import RdSkillChipBank from "@/components/redesign/RdSkillChipBank";
import RdSkipFooter from "@/components/redesign/RdSkipFooter";
import { matchesSkill } from "./skillBank";
import { suggestSkillsForTitle } from "@/lib/roleSkillsLookup";
import { humanizeSkillId } from "@/lib/humanizeSkillId";

// Per-experience/education/project skill tagging — one scrollable screen
// with collapsible cards.
//
// **Skill guarantee (top priority, per PR 2B spec):** the user sees the
// same skills to choose from as today — the per-card RdSkillTagInput
// (library autocomplete) PLUS the RdSkillChipBank (6 categories × 18
// chips) PLUS the role-library suggestions section (RoleSuggestions).
// All three sources are unchanged; only the chrome around them is.
//
// Accordion behaviour preserved verbatim — one card expanded at a time,
// first card expanded by default, clicking another card collapses the
// current and opens the new one. **The accordion auto-scroll bug is
// EXPLICITLY DEFERRED** (no scroll-into-view change here; restyle is
// visual-only per PR 2B scope).

function formatDateRange(start, end, isCurrent) {
  const s = (start || "").trim();
  const e = isCurrent ? "Present" : (end || "").trim();
  if (s && e) return `${s} – ${e}`;
  if (s) return s;
  return "";
}

function CardHeader({ icon: Icon, title, subtitle, chipCount, expanded, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-between gap-3 text-left"
    >
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <div className="w-9 h-9 rounded-lg bg-rd-bg-soft flex items-center justify-center flex-shrink-0 mt-0.5">
          <Icon className="w-4 h-4 text-rd-text-secondary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display font-semibold text-[14px] text-rd-text truncate">{title}</p>
          {subtitle && (
            <p className="text-[12px] text-rd-text-secondary mt-0.5 truncate">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {chipCount > 0 && (
          <span className="inline-flex items-center gap-1 text-[11px] text-rd-teal-dark bg-rd-teal-tint px-2 py-0.5 rounded-full font-medium">
            <CheckCircle2 className="w-3 h-3" />
            {chipCount} tagged
          </span>
        )}
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-rd-text-secondary" />
        ) : (
          <ChevronDown className="w-4 h-4 text-rd-text-secondary" />
        )}
      </div>
    </button>
  );
}

// Role-library suggestion section — only rendered for experience cards
// where the title matched the canonical role library. Pre-suggested
// skills appear as dashed-outline chips with a "+" prefix. Tapping
// adds the skill (canonical display name) to the card's skills
// array and removes the chip from the suggestion list. Suggestion source
// and matching unchanged from Direction-3.
function RoleSuggestions({ suggestion, currentSkills, onAccept }) {
  const remainingIds = useMemo(() => {
    if (!suggestion) return [];
    const currentSet = new Set((currentSkills || []).map((s) => String(s).toLowerCase().trim()));
    return suggestion.skillIds.filter((id) => {
      const display = humanizeSkillId(id);
      return !currentSet.has(String(display).toLowerCase().trim()) && !currentSet.has(id.toLowerCase());
    });
  }, [suggestion, currentSkills]);

  if (!suggestion || remainingIds.length === 0) return null;

  return (
    <div className="rounded-[12px] border border-dashed border-rd-coral/40 bg-rd-coral-tint/40 p-3">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-3.5 h-3.5 text-rd-coral-dark" />
        <p className="text-[12px] font-display font-semibold text-rd-text">
          Common skills for{" "}
          <span className="text-rd-coral-dark">{suggestion.roleTitle}</span>
        </p>
      </div>
      <p className="text-[11px] text-rd-text-secondary mb-2.5 leading-snug">
        Tap any that apply to your role — they&apos;ll be added to your tagged skills.
      </p>
      <div className="flex flex-wrap gap-1.5">
        {remainingIds.map((id) => {
          const display = humanizeSkillId(id);
          return (
            <button
              key={id}
              type="button"
              onClick={() => onAccept(display)}
              className="inline-flex items-center gap-1 text-[12px] bg-rd-bg-card text-rd-text-secondary px-2.5 py-1 rounded-full border border-dashed border-rd-coral/50 hover:border-rd-coral hover:text-rd-coral-dark hover:bg-rd-coral-tint transition-colors font-medium"
            >
              <Plus className="w-3 h-3" />
              {display}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function StepRoleSkills({ experiences, setExperiences, educations, setEducations, projects, setProjects, onNext, onBack }) {
  const expList = Array.isArray(experiences) ? experiences : [];
  const eduList = Array.isArray(educations) ? educations : [];
  const projList = Array.isArray(projects) ? projects : [];

  const expSuggestions = useMemo(
    () => expList.map((e) => suggestSkillsForTitle(e?.title)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const orderedKeys = useMemo(() => {
    const keys = [];
    expList.forEach((_, i) => keys.push(`exp_${i}`));
    eduList.forEach((_, i) => keys.push(`edu_${i}`));
    projList.forEach((_, i) => keys.push(`proj_${i}`));
    return keys;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [expandedKey, setExpandedKey] = useState(orderedKeys[0] ?? null);
  const handleToggle = (key) => setExpandedKey((prev) => (prev === key ? null : key));

  const updateExpSkills = (i, next) => {
    setExperiences((prev) => prev.map((e, idx) => idx === i ? { ...e, skills: next } : e));
  };
  const toggleExpSkill = (i, label) => {
    const current = expList[i]?.skills || [];
    const next = matchesSkill(current, label)
      ? current.filter((s) => String(s).toLowerCase() !== String(label).toLowerCase())
      : [...current, label];
    updateExpSkills(i, next);
  };

  const updateEduSkills = (i, next) => {
    setEducations((prev) => prev.map((e, idx) => idx === i ? { ...e, skills: next } : e));
  };
  const toggleEduSkill = (i, label) => {
    const current = eduList[i]?.skills || [];
    const next = matchesSkill(current, label)
      ? current.filter((s) => String(s).toLowerCase() !== String(label).toLowerCase())
      : [...current, label];
    updateEduSkills(i, next);
  };

  const updateProjSkills = (i, next) => {
    setProjects((prev) => prev.map((p, idx) => idx === i ? { ...p, skills: next } : p));
  };
  const toggleProjSkill = (i, label) => {
    const current = projList[i]?.skills || [];
    const next = matchesSkill(current, label)
      ? current.filter((s) => String(s).toLowerCase() !== String(label).toLowerCase())
      : [...current, label];
    updateProjSkills(i, next);
  };

  const totalCards = orderedKeys.length;

  return (
    <div className="space-y-7">
      <div>
        <p className="text-[10.5px] uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow font-mono">
          step 5 of 9 · role skills
        </p>
        <h1 className="font-display font-extrabold text-[26px] sm:text-[28px] leading-[1.1] tracking-tight text-rd-text mt-2">
          Skills you used in each role.
        </h1>
        <p className="text-[13.5px] leading-[1.6] text-rd-text-secondary mt-3">
          For each experience, degree, and project, confirm or add the skills you applied.
          We pre-suggested likely skills where we could match your role to common patterns.
        </p>
        <p className="text-[11.5px] text-rd-text-secondary mt-2 leading-snug">
          Powers job-fit scoring + CV bullet generation per role. Optional but worth 60 seconds.
        </p>
      </div>

      {totalCards === 0 ? (
        <div className="bg-rd-bg-card border border-rd-border rounded-[14px] p-5 text-center">
          <p className="text-[13px] text-rd-text-secondary">
            No experiences, education, or projects on file yet. You can add them via the previous step or skip ahead.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Experiences */}
          {expList.map((e, i) => {
            const key = `exp_${i}`;
            const expanded = expandedKey === key;
            const skills = e?.skills || [];
            const tagged = skills.length;
            const subtitle = [e?.company, formatDateRange(e?.start_date, e?.end_date, e?.is_current)].filter(Boolean).join(" · ");
            return (
              <div key={key} className="bg-rd-bg-card border border-rd-border rounded-[14px] p-5">
                <CardHeader
                  icon={Briefcase}
                  title={e?.title || "(Untitled role)"}
                  subtitle={subtitle}
                  chipCount={tagged}
                  expanded={expanded}
                  onClick={() => handleToggle(key)}
                />
                {expanded && (
                  <div className="mt-4 pt-4 border-t border-rd-border-subtle space-y-4">
                    {expSuggestions[i] && (
                      <RoleSuggestions
                        suggestion={expSuggestions[i]}
                        currentSkills={skills}
                        onAccept={(label) => toggleExpSkill(i, label)}
                      />
                    )}
                    <RdSkillTagInput
                      label="Skills used in this role"
                      description="Search the library or type a custom skill."
                      tags={skills}
                      onChange={(next) => updateExpSkills(i, next)}
                      placeholder="Search 595 skills"
                      suggestionType="library_skills"
                    />
                    <div>
                      <p className="text-[10.5px] uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow mb-2">
                        Or pick from the skill bank:
                      </p>
                      <RdSkillChipBank
                        selected={skills}
                        onToggle={(label) => toggleExpSkill(i, label)}
                        compact
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Education */}
          {eduList.map((e, i) => {
            const key = `edu_${i}`;
            const expanded = expandedKey === key;
            const skills = e?.skills || [];
            const tagged = skills.length;
            const title = [e?.degree_type, e?.field_of_study && `in ${e.field_of_study}`].filter(Boolean).join(" ") || (e?.institution || "(Education)");
            const subtitle = [e?.institution, formatDateRange(e?.start_date, e?.end_date, e?.is_current)].filter(Boolean).join(" · ");
            return (
              <div key={key} className="bg-rd-bg-card border border-rd-border rounded-[14px] p-5">
                <CardHeader
                  icon={GraduationCap}
                  title={title}
                  subtitle={subtitle}
                  chipCount={tagged}
                  expanded={expanded}
                  onClick={() => handleToggle(key)}
                />
                {expanded && (
                  <div className="mt-4 pt-4 border-t border-rd-border-subtle space-y-4">
                    <RdSkillTagInput
                      label="Skills developed during this education"
                      description="Programs, methods, fields, or specific tools — search the library or type custom."
                      tags={skills}
                      onChange={(next) => updateEduSkills(i, next)}
                      placeholder="e.g. financial modeling, market research"
                      suggestionType="library_skills"
                    />
                    <div>
                      <p className="text-[10.5px] uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow mb-2">
                        Or pick from the skill bank:
                      </p>
                      <RdSkillChipBank
                        selected={skills}
                        onToggle={(label) => toggleEduSkill(i, label)}
                        compact
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Projects */}
          {projList.map((p, i) => {
            const key = `proj_${i}`;
            const expanded = expandedKey === key;
            const skills = p?.skills || [];
            const tagged = skills.length;
            const subtitle = p?.description ? p.description.slice(0, 80) + (p.description.length > 80 ? "…" : "") : "";
            return (
              <div key={key} className="bg-rd-bg-card border border-rd-border rounded-[14px] p-5">
                <CardHeader
                  icon={FolderGit2}
                  title={p?.name || "(Untitled project)"}
                  subtitle={subtitle}
                  chipCount={tagged}
                  expanded={expanded}
                  onClick={() => handleToggle(key)}
                />
                {expanded && (
                  <div className="mt-4 pt-4 border-t border-rd-border-subtle space-y-4">
                    <RdSkillTagInput
                      label="Skills demonstrated in this project"
                      description="Tools, techniques, or domains you used to build this."
                      tags={skills}
                      onChange={(next) => updateProjSkills(i, next)}
                      placeholder="Search 595 skills"
                      suggestionType="library_skills"
                    />
                    <div>
                      <p className="text-[10.5px] uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow mb-2">
                        Or pick from the skill bank:
                      </p>
                      <RdSkillChipBank
                        selected={skills}
                        onToggle={(label) => toggleProjSkill(i, label)}
                        compact
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <RdSkipFooter onBack={onBack} onSkip={onNext} onContinue={onNext} />
    </div>
  );
}
