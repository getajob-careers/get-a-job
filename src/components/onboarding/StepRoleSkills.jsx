import React, { useState, useMemo } from "react";
import { Briefcase, GraduationCap, FolderGit2, ChevronDown, ChevronUp, CheckCircle2 } from "lucide-react";
import SkillTagInput from "./SkillTagInput";
import SkipFooter from "./SkipFooter";

// Batched per-object skill tagging — one scrollable screen with
// collapsible cards. Per experience (skills_used), per education
// (skills_developed), per project (skills_demonstrated). Card expands
// automatically when the corresponding array is empty AND there's
// content the user could tag against (responsibilities text, degree
// program, project description). Cards with skills already tagged
// stay collapsed and show their chip count in the header.
//
// Pre-suggestions: experiences[].skills_used and
// projects[].skills_demonstrated come pre-populated when the CV
// extractor runs (StepResumeUpload.jsx:154 + extraction schema).
// Education has no extractor pre-fill in v1 — user fills manually.
//
// Skippable per the onboarding redesign — empty arrays persist as
// `[]`, downstream union just collects from other sources.

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

export default function StepRoleSkills({ experiences, setExperiences, educations, setEducations, projects, setProjects, onNext, onBack }) {
  const expList = Array.isArray(experiences) ? experiences : [];
  const eduList = Array.isArray(educations) ? educations : [];
  const projList = Array.isArray(projects) ? projects : [];

  // Auto-expand rule (per Eli's decision):
  //   - Expand if skills array is empty AND the object has content to anchor on
  //   - Collapse if already tagged
  // "Content to anchor on":
  //   - Experience: responsibilities text or title (always has title)
  //   - Education: institution or degree present
  //   - Project: description or name
  const initialExpanded = useMemo(() => {
    const m = {};
    expList.forEach((e, i) => {
      const tagged = (e?.skills_used || []).length > 0;
      const hasContent = (e?.responsibilities || "").trim().length > 0 || (e?.title || "").trim().length > 0;
      m[`exp_${i}`] = !tagged && hasContent;
    });
    eduList.forEach((e, i) => {
      const tagged = (e?.skills_developed || []).length > 0;
      const hasContent = (e?.institution || "").trim().length > 0 || (e?.degree_type || "").trim().length > 0;
      m[`edu_${i}`] = !tagged && hasContent;
    });
    projList.forEach((p, i) => {
      const tagged = (p?.skills_demonstrated || []).length > 0;
      const hasContent = (p?.description || "").trim().length > 0 || (p?.name || "").trim().length > 0;
      m[`proj_${i}`] = !tagged && hasContent;
    });
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);  // compute once on mount — user-driven toggles take over after

  const [expanded, setExpanded] = useState(initialExpanded);
  const toggle = (key) => setExpanded((m) => ({ ...m, [key]: !m[key] }));

  const updateExpSkills = (i, next) => {
    setExperiences((prev) => prev.map((e, idx) => idx === i ? { ...e, skills_used: next } : e));
  };
  const updateEduSkills = (i, next) => {
    setEducations((prev) => prev.map((e, idx) => idx === i ? { ...e, skills_developed: next } : e));
  };
  const updateProjSkills = (i, next) => {
    setProjects((prev) => prev.map((p, idx) => idx === i ? { ...p, skills_demonstrated: next } : p));
  };

  const handleSkip = () => {
    // Persist current state as-is. Empty arrays stay empty (not null);
    // skipping ≠ erasing. The downstream union just collects what's there.
    onNext();
  };

  const totalCards = expList.length + eduList.length + projList.length;

  return (
    <div className="space-y-7">
      <div>
        <h1 className="onb-h1">Skills you used in each role.</h1>
        <p className="onb-sub">
          For each experience, degree, and project, confirm or add the skills you applied.
          We pre-filled what your CV mentions — your edits make the matching sharper.
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
            const tagged = (e?.skills_used || []).length;
            const subtitle = [e?.company, formatDateRange(e?.start_date, e?.end_date, e?.is_current)].filter(Boolean).join(" · ");
            return (
              <div key={key} className="onb-card">
                <CardHeader
                  icon={Briefcase}
                  title={e?.title || "(Untitled role)"}
                  subtitle={subtitle}
                  chipCount={tagged}
                  expanded={expanded[key]}
                  onClick={() => toggle(key)}
                />
                {expanded[key] && (
                  <div className="mt-4 pt-4 border-t border-[#E8E8E5]">
                    <SkillTagInput
                      label="Skills used in this role"
                      description={e?.responsibilities ? "Based on your responsibilities, we suggested likely skills. Confirm, add, or remove." : "Search the skill library or type a custom skill."}
                      tags={e?.skills_used || []}
                      onChange={(next) => updateExpSkills(i, next)}
                      placeholder="Search 595 skills or type a custom one"
                      suggestionType="library_skills"
                    />
                  </div>
                )}
              </div>
            );
          })}

          {/* Education — second */}
          {eduList.map((e, i) => {
            const key = `edu_${i}`;
            const tagged = (e?.skills_developed || []).length;
            const title = [e?.degree_type, e?.field_of_study && `in ${e.field_of_study}`].filter(Boolean).join(" ") || (e?.institution || "(Education)");
            const subtitle = [e?.institution, formatDateRange(e?.start_date, e?.end_date, e?.is_current)].filter(Boolean).join(" · ");
            return (
              <div key={key} className="onb-card">
                <CardHeader
                  icon={GraduationCap}
                  title={title}
                  subtitle={subtitle}
                  chipCount={tagged}
                  expanded={expanded[key]}
                  onClick={() => toggle(key)}
                />
                {expanded[key] && (
                  <div className="mt-4 pt-4 border-t border-[#E8E8E5]">
                    <SkillTagInput
                      label="Skills developed during this education"
                      description="What did you learn or get good at? Programs, methods, fields, or specific tools — search the library or type custom."
                      tags={e?.skills_developed || []}
                      onChange={(next) => updateEduSkills(i, next)}
                      placeholder="e.g. financial modeling, market research"
                      suggestionType="library_skills"
                    />
                  </div>
                )}
              </div>
            );
          })}

          {/* Projects — third */}
          {projList.map((p, i) => {
            const key = `proj_${i}`;
            const tagged = (p?.skills_demonstrated || []).length;
            const subtitle = p?.description ? p.description.slice(0, 80) + (p.description.length > 80 ? "…" : "") : "";
            return (
              <div key={key} className="onb-card">
                <CardHeader
                  icon={FolderGit2}
                  title={p?.name || "(Untitled project)"}
                  subtitle={subtitle}
                  chipCount={tagged}
                  expanded={expanded[key]}
                  onClick={() => toggle(key)}
                />
                {expanded[key] && (
                  <div className="mt-4 pt-4 border-t border-[#E8E8E5]">
                    <SkillTagInput
                      label="Skills demonstrated in this project"
                      description="Tools, techniques, or domains you used to build this."
                      tags={p?.skills_demonstrated || []}
                      onChange={(next) => updateProjSkills(i, next)}
                      placeholder="Search 595 skills or type custom"
                      suggestionType="library_skills"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <SkipFooter
        onBack={onBack}
        onSkip={handleSkip}
        onContinue={onNext}
      />
    </div>
  );
}
