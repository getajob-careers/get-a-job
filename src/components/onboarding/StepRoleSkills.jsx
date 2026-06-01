import React, { useState, useMemo } from "react";
import { Briefcase, GraduationCap, FolderGit2, ChevronDown, ChevronUp, CheckCircle2, Sparkles, Plus } from "lucide-react";
import SkillTagInput from "./SkillTagInput";
import SkillChipBank from "./SkillChipBank";
import SkipFooter from "./SkipFooter";
import { matchesSkill } from "./skillBank";
import { suggestSkillsForTitle } from "@/lib/roleSkillsLookup";
import { humanizeSkillId } from "@/lib/humanizeSkillId";

// Per-experience/education/project skill tagging — one scrollable screen
// with collapsible cards. Each card carries the full SKILL_BANK (6
// categories × 18 chips) for one-tap tagging, a SkillTagInput for
// searching the full 595-skill library, and (for experiences only) a
// role-library suggestion section that pre-fills common skills for the
// matched role title.
//
// Accordion behavior: ONE card expanded at a time. First card expanded
// by default. Clicking another card collapses the current and opens the
// new one. State writes happen on every chip click / input change —
// collapsing doesn't lose anything.
//
// Suggestions come from src/lib/roleSkillsLookup.js → 183-role mirror
// generated from 00_role_library.ts + 04_role_skill_mapping.ts.
// Honest framing: "Common skills for [matched role] — tap to add" with
// the matched canonical role title shown so the user can dismiss if it
// doesn't fit.

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
        <div className="w-9 h-9 rounded-lg bg-[#E8E8E5] flex items-center justify-center flex-shrink-0 mt-0.5">
          <Icon className="w-4 h-4 text-[#52545A]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#0E1014] truncate">{title}</p>
          {subtitle && <p className="text-xs text-[#9C9DA1] mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {chipCount > 0 && (
          <span className="inline-flex items-center gap-1 text-[11px] text-[#52545A] bg-[#F4F4F2] px-2 py-0.5 rounded-full">
            <CheckCircle2 className="w-3 h-3" />
            {chipCount} tagged
          </span>
        )}
        {expanded ? <ChevronUp className="w-4 h-4 text-[#9C9DA1]" /> : <ChevronDown className="w-4 h-4 text-[#9C9DA1]" />}
      </div>
    </button>
  );
}

// Role-library suggestion section — only rendered for experience cards
// where the title matched the canonical role library. Pre-suggested
// skills appear as dashed-outline chips with a "+" prefix. Tapping
// adds the skill (canonical display name) to the card's skills
// array and removes the chip from the suggestion list.
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
    <div className="rounded-lg border border-dashed border-[#A3A3A3] bg-[#FAFAF8] p-3">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-3.5 h-3.5 text-[#52545A]" />
        <p className="text-xs font-semibold text-[#0E1014]">
          Common skills for <span className="text-[#52545A]">{suggestion.roleTitle}</span>
        </p>
      </div>
      <p className="text-[11px] text-[#9C9DA1] mb-2.5 leading-snug">
        Tap any that apply to your role — they'll be added to your tagged skills.
      </p>
      <div className="flex flex-wrap gap-1.5">
        {remainingIds.map((id) => {
          const display = humanizeSkillId(id);
          return (
            <button
              key={id}
              type="button"
              onClick={() => onAccept(display)}
              className="inline-flex items-center gap-1 text-xs bg-white text-[#52545A] px-2.5 py-1 rounded-full border border-dashed border-[#A3A3A3] hover:border-[#0E1014] hover:text-[#0E1014] transition-colors"
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

  // Precompute role-library suggestions for each experience once. The
  // user's title doesn't change while on this screen, so no need to
  // recompute on every render or expand.
  const expSuggestions = useMemo(
    () => expList.map((e) => suggestSkillsForTitle(e?.title)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Build the ordered list of card keys so the accordion default + key
  // computation are deterministic. Experiences first, then education,
  // then projects (Eli's Q3 order).
  const orderedKeys = useMemo(() => {
    const keys = [];
    expList.forEach((_, i) => keys.push(`exp_${i}`));
    eduList.forEach((_, i) => keys.push(`edu_${i}`));
    projList.forEach((_, i) => keys.push(`proj_${i}`));
    return keys;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Accordion state — single string for the currently-expanded key.
  // null = all collapsed. Default = first card (or null if no cards).
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
        <h1 className="onb-h1">Skills you used in each role.</h1>
        <p className="onb-sub">
          For each experience, degree, and project, confirm or add the skills you applied.
          We pre-suggested likely skills where we could match your role to common patterns.
        </p>
        <p className="onb-help">
          Powers job-fit scoring + CV bullet generation per role. Optional but worth 60 seconds.
        </p>
      </div>

      {totalCards === 0 ? (
        <div className="onb-card text-center">
          <p className="text-sm text-[#52545A]">No experiences, education, or projects on file yet. You can add them via the previous step or skip ahead.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Experiences — first per Eli's decision (Q3) */}
          {expList.map((e, i) => {
            const key = `exp_${i}`;
            const expanded = expandedKey === key;
            const skills = e?.skills || [];
            const tagged = skills.length;
            const subtitle = [e?.company, formatDateRange(e?.start_date, e?.end_date, e?.is_current)].filter(Boolean).join(" · ");
            return (
              <div key={key} className="onb-card">
                <CardHeader
                  icon={Briefcase}
                  title={e?.title || "(Untitled role)"}
                  subtitle={subtitle}
                  chipCount={tagged}
                  expanded={expanded}
                  onClick={() => handleToggle(key)}
                />
                {expanded && (
                  <div className="mt-4 pt-4 border-t border-[#E8E8E5] space-y-4">
                    {expSuggestions[i] && (
                      <RoleSuggestions
                        suggestion={expSuggestions[i]}
                        currentSkills={skills}
                        onAccept={(label) => toggleExpSkill(i, label)}
                      />
                    )}
                    <SkillTagInput
                      label="Skills used in this role"
                      description="Search the library or type a custom skill."
                      tags={skills}
                      onChange={(next) => updateExpSkills(i, next)}
                      placeholder="Search 595 skills"
                      suggestionType="library_skills"
                    />
                    <div>
                      <p className="onb-eyebrow mb-2">Or pick from the skill bank:</p>
                      <SkillChipBank
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

          {/* Education — second. Role-library suggestions skipped per Eli's Q3. */}
          {eduList.map((e, i) => {
            const key = `edu_${i}`;
            const expanded = expandedKey === key;
            const skills = e?.skills || [];
            const tagged = skills.length;
            const title = [e?.degree_type, e?.field_of_study && `in ${e.field_of_study}`].filter(Boolean).join(" ") || (e?.institution || "(Education)");
            const subtitle = [e?.institution, formatDateRange(e?.start_date, e?.end_date, e?.is_current)].filter(Boolean).join(" · ");
            return (
              <div key={key} className="onb-card">
                <CardHeader
                  icon={GraduationCap}
                  title={title}
                  subtitle={subtitle}
                  chipCount={tagged}
                  expanded={expanded}
                  onClick={() => handleToggle(key)}
                />
                {expanded && (
                  <div className="mt-4 pt-4 border-t border-[#E8E8E5] space-y-4">
                    <SkillTagInput
                      label="Skills developed during this education"
                      description="Programs, methods, fields, or specific tools — search the library or type custom."
                      tags={skills}
                      onChange={(next) => updateEduSkills(i, next)}
                      placeholder="e.g. financial modeling, market research"
                      suggestionType="library_skills"
                    />
                    <div>
                      <p className="onb-eyebrow mb-2">Or pick from the skill bank:</p>
                      <SkillChipBank
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

          {/* Projects — third. No role-library lookup; project name doesn't map. */}
          {projList.map((p, i) => {
            const key = `proj_${i}`;
            const expanded = expandedKey === key;
            const skills = p?.skills || [];
            const tagged = skills.length;
            const subtitle = p?.description ? p.description.slice(0, 80) + (p.description.length > 80 ? "…" : "") : "";
            return (
              <div key={key} className="onb-card">
                <CardHeader
                  icon={FolderGit2}
                  title={p?.name || "(Untitled project)"}
                  subtitle={subtitle}
                  chipCount={tagged}
                  expanded={expanded}
                  onClick={() => handleToggle(key)}
                />
                {expanded && (
                  <div className="mt-4 pt-4 border-t border-[#E8E8E5] space-y-4">
                    <SkillTagInput
                      label="Skills demonstrated in this project"
                      description="Tools, techniques, or domains you used to build this."
                      tags={skills}
                      onChange={(next) => updateProjSkills(i, next)}
                      placeholder="Search 595 skills"
                      suggestionType="library_skills"
                    />
                    <div>
                      <p className="onb-eyebrow mb-2">Or pick from the skill bank:</p>
                      <SkillChipBank
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

      <SkipFooter
        onBack={onBack}
        onSkip={onNext}
        onContinue={onNext}
      />
    </div>
  );
}
