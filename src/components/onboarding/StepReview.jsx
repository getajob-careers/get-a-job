import React, { useEffect, useMemo } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  GraduationCap, BookOpen, Award, Microscope, Code2, ArrowRight,
  Plus, Trash2, FileText, Sparkles, Briefcase, FolderGit2, BadgeCheck,
} from "lucide-react";
import RdSkillTagInput from "@/components/redesign/RdSkillTagInput";
import RdSkillChipBank from "@/components/redesign/RdSkillChipBank";
import RdButton from "@/components/redesign/RdButton";
import { DEGREE_TYPE_OPTIONS, dropdownValueForDegreeType } from "@/lib/educationPolicy";
import { EMPTY_EDUCATION_ROW } from "@/lib/onboardingPayload";
import { suggestSkillsForTitle } from "@/lib/roleSkillsLookup";
import { humanizeSkillId } from "@/lib/humanizeSkillId";
import { matchesSkill } from "./skillBank";

// Phase 3 onboarding redesign: the Review-and-Edit page.
//
// Collapses what used to be StepEducation (1), StepExperience (3),
// StepRoleSkills (4), and StepSkills (5) into a single page that lands
// right after the resume upload. The user sees the entire gpt-5.4-mini
// extractor output as editable cards, can correct anything wrong, add
// what's missing, delete what's spurious.
//
// **Primary correctness constraint:** each experience card carries its
// OWN skills array via a per-card RdSkillTagInput. aggregateProfileSkills()
// at finalize unions per-entity skills into profiles.skills_canonical —
// dropping the per-card structure would silently degrade CV generation
// (which grounds bullet content in the experience's tagged skills).
//
// Validation: education is hard-gated (institution, level, field_of_study,
// dates). Experiences / projects / certifications are encouraged but
// optional — many real students have zero of one or more, and the page
// should not block them. The catch-all skills section is fully optional.
//
// Education writes still go through saveEducations() per-step in
// Onboarding.jsx (locked decision — they are NOT moved into the finalise
// transaction). Experiences / projects / certifications still write at
// finalize, byte-identical to the pre-Phase-3 path.

const EDU_LEVELS = [
  { value: "high_school", label: "High school", Icon: BookOpen },
  { value: "bachelors", label: "Bachelor's", Icon: GraduationCap },
  { value: "masters", label: "Master's", Icon: Award },
  { value: "phd", label: "PhD", Icon: Microscope },
  { value: "bootcamp", label: "Bootcamp", Icon: Code2 },
];

const OTHER_LEVELS = [
  { value: "associate", label: "Associate degree" },
  { value: "self_taught", label: "Self-taught" },
];

const INPUT_CLS =
  "w-full px-3.5 py-2.5 rounded-[10px] border border-rd-border bg-rd-bg-card text-rd-text text-[13.5px] placeholder:text-rd-text-secondary/70 outline-none transition-[border-color,box-shadow] duration-150 focus:border-rd-coral focus:shadow-[0_0_0_3px_var(--rd-coral-tint)]";

const EMPTY_EXP = {
  title: "",
  company: "",
  type: "internship",
  start_date: "",
  end_date: "",
  is_current: false,
  responsibilities: "",
  managed_people: false,
  cross_functional: false,
  skills: [],
};

const EMPTY_PROJ = { name: "", description: "", url: "", skills: [] };

const EMPTY_CERT = { name: "", issuer: "", date_earned: "" };

function Label({ children, required = false }) {
  return (
    <label className="block text-[12px] font-semibold text-rd-text mb-1.5">
      {children}
      {required ? <span className="text-rd-coral ml-1">*</span> : null}
    </label>
  );
}

function SectionHeader({ icon: Icon, title, subtitle, required }) {
  return (
    <div className="flex items-start gap-3 mb-3">
      <div className="w-8 h-8 rounded-lg bg-rd-bg-soft flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-rd-text-secondary" />
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="font-display font-bold text-[17px] leading-tight text-rd-text">
          {title}
          {required ? <span className="text-rd-coral ml-1.5">*</span> : null}
        </h2>
        {subtitle && (
          <p className="text-[12px] text-rd-text-secondary mt-0.5 leading-snug">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}

// Role-library suggestion strip — only renders when the experience title
// matches a canonical role in roleSkillsLookup. Tapping a chip appends
// the canonical display name to the card's skills array. Verbatim from
// the v1 StepRoleSkills implementation; preserves the standing skill
// guarantee.
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

function ExperienceCard({ exp, onChange, onRemove }) {
  const set = (key, val) => onChange({ ...exp, [key]: val });

  // Recompute role suggestions on every title change so users who refine
  // a vague extractor title (e.g. "Intern" → "Marketing Intern") get
  // fresh suggestions. Cheap function call; no memoization key drama.
  const suggestion = suggestSkillsForTitle(exp.title);

  const skills = exp.skills || [];
  const toggleSkill = (label) => {
    set(
      "skills",
      matchesSkill(skills, label)
        ? skills.filter((s) => String(s).toLowerCase() !== String(label).toLowerCase())
        : [...skills, label],
    );
  };

  return (
    <div className="bg-rd-bg-card border border-rd-border rounded-[14px] p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display font-semibold text-[14px] text-rd-text">
          {exp.title?.trim() || "(New experience)"}
        </h3>
        <button
          type="button"
          onClick={onRemove}
          className="text-rd-coral-dark hover:text-rd-coral p-1.5 rounded-md border border-rd-coral-tint hover:bg-rd-coral-tint transition-colors flex-shrink-0"
          aria-label="Remove experience"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Job title</Label>
          <input
            className={INPUT_CLS}
            value={exp.title || ""}
            onChange={(e) => set("title", e.target.value)}
            placeholder="e.g. Marketing Intern"
          />
        </div>
        <div>
          <Label>Company / Organization</Label>
          <input
            className={INPUT_CLS}
            value={exp.company || ""}
            onChange={(e) => set("company", e.target.value)}
            placeholder="e.g. Goldman Sachs"
          />
        </div>
        <div>
          <Label>Type</Label>
          <Select value={exp.type || "internship"} onValueChange={(v) => set("type", v)}>
            <SelectTrigger className="text-sm border-rd-border bg-rd-bg-card text-rd-text">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="internship">Internship</SelectItem>
              <SelectItem value="full_time">Full-Time</SelectItem>
              <SelectItem value="part_time">Part-Time</SelectItem>
              <SelectItem value="freelance">Freelance</SelectItem>
              <SelectItem value="founder">Founder / Self-employed</SelectItem>
              <SelectItem value="volunteer">Volunteer</SelectItem>
              <SelectItem value="leadership">Leadership / Club</SelectItem>
              <SelectItem value="military">Military service</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Start date</Label>
          <input
            type="date"
            className={INPUT_CLS}
            value={exp.start_date || ""}
            onChange={(e) => set("start_date", e.target.value)}
          />
        </div>
        {!exp.is_current && (
          <div>
            <Label>End date</Label>
            <input
              type="date"
              className={INPUT_CLS}
              value={exp.end_date || ""}
              onChange={(e) => set("end_date", e.target.value)}
            />
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-[13px] text-rd-text-secondary cursor-pointer">
          <input
            type="checkbox"
            checked={!!exp.is_current}
            onChange={(e) => set("is_current", e.target.checked)}
            className="w-[15px] h-[15px] accent-rd-coral cursor-pointer"
          />
          Currently working here
        </label>
        <label className="flex items-center gap-2 text-[13px] text-rd-text-secondary cursor-pointer">
          <input
            type="checkbox"
            checked={!!exp.managed_people}
            onChange={(e) => set("managed_people", e.target.checked)}
            className="w-[15px] h-[15px] accent-rd-coral cursor-pointer"
          />
          Managed people
        </label>
        <label className="flex items-center gap-2 text-[13px] text-rd-text-secondary cursor-pointer">
          <input
            type="checkbox"
            checked={!!exp.cross_functional}
            onChange={(e) => set("cross_functional", e.target.checked)}
            className="w-[15px] h-[15px] accent-rd-coral cursor-pointer"
          />
          Cross-functional
        </label>
      </div>

      <div>
        <Label>Responsibilities &amp; achievements</Label>
        <Textarea
          value={exp.responsibilities || ""}
          onChange={(e) => set("responsibilities", e.target.value)}
          rows={4}
          placeholder="Describe what you did and any measurable outcomes…"
          className="border-rd-border bg-rd-bg-card text-rd-text text-[13.5px] focus-visible:ring-rd-coral"
        />
      </div>

      {/* Per-card role-library suggestion strip + RdSkillTagInput. The
          card-level skills array is the contract for aggregateProfileSkills
          at finalize. Do NOT collapse into a flat field. */}
      {suggestion && (
        <RoleSuggestions
          suggestion={suggestion}
          currentSkills={skills}
          onAccept={toggleSkill}
        />
      )}
      <RdSkillTagInput
        label="Skills &amp; tools"
        description="Skills you applied + software / platforms you used in this role — feeds CV bullet generation and skill-graph matching."
        tags={skills}
        onChange={(v) => set("skills", v)}
        placeholder="e.g. customer success, project management, Salesforce"
        suggestionType="library_skills"
      />
    </div>
  );
}

function ProjectCard({ proj, onChange, onRemove }) {
  const set = (key, val) => onChange({ ...proj, [key]: val });
  const skills = proj.skills || [];

  return (
    <div className="bg-rd-bg-card border border-rd-border rounded-[14px] p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display font-semibold text-[14px] text-rd-text">
          {proj.name?.trim() || "(New project)"}
        </h3>
        <button
          type="button"
          onClick={onRemove}
          className="text-rd-coral-dark hover:text-rd-coral p-1.5 rounded-md border border-rd-coral-tint hover:bg-rd-coral-tint transition-colors flex-shrink-0"
          aria-label="Remove project"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div>
        <Label>Project name</Label>
        <input
          className={INPUT_CLS}
          value={proj.name || ""}
          onChange={(e) => set("name", e.target.value)}
          placeholder="e.g. Sales Forecasting Model"
        />
      </div>

      <div>
        <Label>Description</Label>
        <Textarea
          value={proj.description || ""}
          onChange={(e) => set("description", e.target.value)}
          rows={3}
          placeholder="What you built and what it achieved."
          className="border-rd-border bg-rd-bg-card text-rd-text text-[13.5px] focus-visible:ring-rd-coral"
        />
      </div>

      <div>
        <Label>Link (optional)</Label>
        <input
          className={INPUT_CLS}
          value={proj.url || ""}
          onChange={(e) => set("url", e.target.value)}
          placeholder="https://github.com/… or live URL"
        />
      </div>

      <RdSkillTagInput
        label="Skills used"
        description="Tools, techniques, or domains you used to build this."
        tags={skills}
        onChange={(v) => set("skills", v)}
        placeholder="e.g. Python, SQL, financial modelling"
        suggestionType="library_skills"
      />
    </div>
  );
}

function CertificationCard({ cert, onChange, onRemove }) {
  const set = (key, val) => onChange({ ...cert, [key]: val });

  return (
    <div className="bg-rd-bg-card border border-rd-border rounded-[14px] p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display font-semibold text-[14px] text-rd-text">
          {cert.name?.trim() || "(New certification)"}
        </h3>
        <button
          type="button"
          onClick={onRemove}
          className="text-rd-coral-dark hover:text-rd-coral p-1.5 rounded-md border border-rd-coral-tint hover:bg-rd-coral-tint transition-colors flex-shrink-0"
          aria-label="Remove certification"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Name</Label>
          <input
            className={INPUT_CLS}
            value={cert.name || ""}
            onChange={(e) => set("name", e.target.value)}
            placeholder="e.g. Google Analytics Certified"
          />
        </div>
        <div>
          <Label>Issuer</Label>
          <input
            className={INPUT_CLS}
            value={cert.issuer || ""}
            onChange={(e) => set("issuer", e.target.value)}
            placeholder="e.g. Google"
          />
        </div>
        <div>
          <Label>Date earned</Label>
          <input
            className={INPUT_CLS}
            value={cert.date_earned || ""}
            onChange={(e) => set("date_earned", e.target.value)}
            placeholder="e.g. June 2025"
          />
        </div>
      </div>
    </div>
  );
}

function AddCardButton({ label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-center gap-2 py-3.5 border border-dashed border-rd-border-hover rounded-[14px] text-[13px] text-rd-text-secondary hover:border-rd-coral hover:text-rd-coral hover:bg-rd-coral-tint transition-colors bg-rd-bg-card"
    >
      <Plus className="w-4 h-4" />
      {label}
    </button>
  );
}

function EmptyState({ message }) {
  return (
    <div className="bg-rd-bg-soft border border-rd-border rounded-[14px] px-4 py-3 text-[12.5px] text-rd-text-secondary">
      {message}
    </div>
  );
}

export default function StepReview({
  data, onChange,
  educations, setEducations,
  experiences, setExperiences,
  projects, setProjects,
  certifications, setCertifications,
  onNext, onBack,
}) {
  // Ensure at least one (primary) education row exists in state so the
  // user can fill it even when the extractor returned nothing.
  useEffect(() => {
    if (!Array.isArray(educations) || educations.length === 0) {
      setEducations([{ ...EMPTY_EDUCATION_ROW }]);
    }
  }, [educations, setEducations]);

  const primary = educations?.[0] || EMPTY_EDUCATION_ROW;

  // Education setters — mirror the v1 StepEducation patterns so secondary
  // education at display_order=1 (the silent high-school row) is never
  // touched by these mutations.
  const setEduField = (key, val) => {
    setEducations((prev) => {
      const arr = Array.isArray(prev) && prev.length > 0 ? [...prev] : [{ ...EMPTY_EDUCATION_ROW }];
      arr[0] = { ...arr[0], [key]: val };
      return arr;
    });
  };

  const setProfileField = (key, val) => onChange({ ...data, [key]: val });

  const setEndDate = (val) => {
    setEducations((prev) => {
      const arr = Array.isArray(prev) && prev.length > 0 ? [...prev] : [{ ...EMPTY_EDUCATION_ROW }];
      arr[0] = { ...arr[0], end_date: val, is_current: /present|current/i.test(val) };
      return arr;
    });
  };

  const setIsCurrent = (val) => {
    setEducations((prev) => {
      const arr = Array.isArray(prev) && prev.length > 0 ? [...prev] : [{ ...EMPTY_EDUCATION_ROW }];
      arr[0] = { ...arr[0], is_current: !!val, ...(val && { end_date: "" }) };
      return arr;
    });
  };

  const hasEndOrCurrent = !!primary.is_current || !!primary.end_date?.trim();
  const dateError = !!primary.start_date?.trim() && !hasEndOrCurrent;
  const canProceed =
    !!data.full_name?.trim() &&
    !!primary.institution?.trim() &&
    !!primary.education_level &&
    !!primary.field_of_study?.trim() &&
    !!primary.start_date?.trim() &&
    hasEndOrCurrent;

  const degreeDropdownValue = useMemo(
    () => dropdownValueForDegreeType(primary.degree_type),
    [primary.degree_type],
  );
  const isDegreeOther = degreeDropdownValue === "other";

  const handleDegreeDropdownChange = (v) => {
    if (v === "other") {
      setEduField("degree_type", isDegreeOther ? primary.degree_type : "");
    } else {
      setEduField("degree_type", v);
    }
  };

  const currentLevel = primary.education_level;
  const isOtherLevel = currentLevel && !EDU_LEVELS.some((l) => l.value === currentLevel);

  // Experience / project / certification list operations
  const updateExp = (i, next) => setExperiences((prev) => prev.map((e, idx) => (idx === i ? next : e)));
  const addExp = () => setExperiences((prev) => [...(prev || []), { ...EMPTY_EXP }]);
  const removeExp = (i) => setExperiences((prev) => prev.filter((_, idx) => idx !== i));

  const updateProj = (i, next) => setProjects((prev) => prev.map((p, idx) => (idx === i ? next : p)));
  const addProj = () => setProjects((prev) => [...(prev || []), { ...EMPTY_PROJ }]);
  const removeProj = (i) => setProjects((prev) => prev.filter((_, idx) => idx !== i));

  const updateCert = (i, next) => setCertifications((prev) => prev.map((c, idx) => (idx === i ? next : c)));
  const addCert = () => setCertifications((prev) => [...(prev || []), { ...EMPTY_CERT }]);
  const removeCert = (i) => setCertifications((prev) => prev.filter((_, idx) => idx !== i));

  // Catch-all skills (profileData.skills) — the union of these and per-
  // entity skills lands in skills_canonical via aggregateProfileSkills.
  const skills = Array.isArray(data.skills) ? data.skills : [];
  const setSkills = (next) => onChange({ ...data, skills: next });
  const toggleSkill = (label) => {
    if (matchesSkill(skills, label)) {
      setSkills(skills.filter((s) => String(s).toLowerCase() !== String(label).toLowerCase()));
    } else {
      setSkills([...skills, label]);
    }
  };

  const expList = Array.isArray(experiences) ? experiences : [];
  const projList = Array.isArray(projects) ? projects : [];
  const certList = Array.isArray(certifications) ? certifications : [];
  const extractedCount = expList.length + projList.length + certList.length;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[10.5px] uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow font-mono">
          step 2 of 6 · review what we extracted
        </p>
        <h1 className="font-display font-extrabold text-[26px] sm:text-[28px] leading-[1.1] tracking-tight text-rd-text mt-2">
          Review and refine.
        </h1>
        <p className="text-[13.5px] leading-[1.6] text-rd-text-secondary mt-3">
          Here&apos;s what we found in your CV. Edit anything that isn&apos;t right,
          add what&apos;s missing, then continue.
        </p>
      </div>

      {extractedCount > 0 && (
        <div className="bg-rd-teal-tint border border-rd-teal/40 rounded-[14px] px-3.5 py-2.5 text-[13px] text-rd-teal-dark flex items-center gap-2.5">
          <FileText className="w-4 h-4 flex-shrink-0" />
          <p>
            <span className="font-display font-semibold text-rd-text">
              {extractedCount} {extractedCount === 1 ? "item" : "items"}
            </span>{" "}
            pre-filled from your CV — review, edit, or add more below.
          </p>
        </div>
      )}

      {/* SECTION 1 — EDUCATION (hard-validated). Primary row only; the
          silent secondary_education path at display_order=1 (high school
          from the extractor) rides along untouched. */}
      <section>
        <SectionHeader
          icon={GraduationCap}
          title="Education"
          subtitle="The primary degree powers role-fit scoring."
          required
        />
        <div className="bg-rd-bg-card border border-rd-border rounded-[14px] p-5 space-y-5">
          <div>
            <Label required>Full name</Label>
            <input
              type="text"
              value={data.full_name || ""}
              onChange={(e) => setProfileField("full_name", e.target.value)}
              placeholder="Your full name"
              className={INPUT_CLS}
            />
          </div>

          <div>
            <Label required>Institution / University</Label>
            <input
              type="text"
              value={primary.institution || ""}
              onChange={(e) => setEduField("institution", e.target.value)}
              placeholder="e.g. Stanford University, University of Toronto"
              className={INPUT_CLS}
            />
          </div>

          <div>
            <Label required>Education level</Label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {EDU_LEVELS.map(({ value, label, Icon }) => {
                const isSelected = currentLevel === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setEduField("education_level", value)}
                    data-selected={isSelected}
                    className={[
                      "flex flex-col items-center gap-2 p-3 rounded-[14px] border transition-[border-color,background-color,box-shadow] duration-150",
                      isSelected
                        ? "border-rd-coral bg-rd-coral-tint shadow-[0_0_0_3px_var(--rd-coral-tint)]"
                        : "border-rd-border bg-rd-bg-card hover:border-rd-border-hover",
                    ].join(" ")}
                  >
                    <div
                      className={[
                        "w-9 h-9 rounded-full flex items-center justify-center transition-colors",
                        isSelected ? "bg-rd-coral text-white" : "bg-rd-bg-soft text-rd-text-secondary",
                      ].join(" ")}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-[12px] font-display font-semibold text-rd-text text-center leading-tight">
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mt-3">
              <Select
                value={isOtherLevel ? currentLevel : ""}
                onValueChange={(v) => setEduField("education_level", v)}
              >
                <SelectTrigger className="text-sm h-9 border-rd-border bg-rd-bg-card text-rd-text">
                  <SelectValue placeholder="Other (Associate / Self-taught)" />
                </SelectTrigger>
                <SelectContent>
                  {OTHER_LEVELS.map((l) => (
                    <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Degree type</Label>
              <Select
                value={degreeDropdownValue || undefined}
                onValueChange={handleDegreeDropdownChange}
              >
                <SelectTrigger className="text-sm border-rd-border bg-rd-bg-card text-rd-text">
                  <SelectValue placeholder="Select degree type" />
                </SelectTrigger>
                <SelectContent>
                  {DEGREE_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isDegreeOther && (
                <input
                  type="text"
                  value={primary.degree_type || ""}
                  onChange={(e) => setEduField("degree_type", e.target.value)}
                  placeholder="e.g. B.Eng., Pharm.D., specific credential"
                  className={INPUT_CLS + " mt-2"}
                />
              )}
            </div>

            <div>
              <Label required>Field of study</Label>
              <input
                type="text"
                value={primary.field_of_study || ""}
                onChange={(e) => setEduField("field_of_study", e.target.value)}
                placeholder="e.g. Computer Science, Business"
                className={INPUT_CLS}
              />
            </div>

            <div>
              <Label required>Start date</Label>
              <input
                type="text"
                value={primary.start_date || ""}
                onChange={(e) => setEduField("start_date", e.target.value)}
                placeholder="e.g. September 2023, 2023"
                className={INPUT_CLS}
              />
            </div>

            <div>
              <Label required={!primary.is_current}>End date</Label>
              <input
                type="text"
                value={primary.end_date || ""}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={!!primary.is_current}
                placeholder='e.g. May 2025, "Present"'
                className={INPUT_CLS + " disabled:bg-rd-bg-soft disabled:cursor-not-allowed"}
              />
            </div>

            <div>
              <Label>
                GPA <span className="text-rd-text-secondary font-normal">(optional)</span>
              </Label>
              <input
                type="text"
                value={primary.gpa || ""}
                onChange={(e) => setEduField("gpa", e.target.value)}
                placeholder="e.g. 3.7 / 4.0"
                className={INPUT_CLS}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="review-edu-is-current"
              checked={!!primary.is_current}
              onChange={(e) => setIsCurrent(e.target.checked)}
              className="w-[15px] h-[15px] accent-rd-coral cursor-pointer"
            />
            <label
              htmlFor="review-edu-is-current"
              className="text-[12.5px] text-rd-text-secondary cursor-pointer"
            >
              I&apos;m currently studying for this degree
            </label>
          </div>

          <RdSkillTagInput
            label="Relevant coursework"
            description="List courses that are relevant to your target roles."
            tags={primary.relevant_coursework || []}
            onChange={(v) => setEduField("relevant_coursework", v)}
            placeholder="e.g. Data Structures, Financial Accounting"
            suggestionType="none"
          />

          <RdSkillTagInput
            label="Academic projects"
            description="Thesis, capstone, or notable academic projects."
            tags={primary.academic_projects || []}
            onChange={(v) => setEduField("academic_projects", v)}
            placeholder="e.g. Sales Forecasting ML Model"
            suggestionType="none"
          />

          {dateError && (
            <p className="text-[12px] text-rd-coral-dark">
              Enter an end date or check &ldquo;I&apos;m currently studying&rdquo;
            </p>
          )}
        </div>
      </section>

      {/* SECTION 2 — EXPERIENCE. Always-editable cards; per-card skills
          via RdSkillTagInput + RoleSuggestions where title matches the
          library. THIS IS THE LOAD-BEARING PIECE for skills_canonical. */}
      <section>
        <SectionHeader
          icon={Briefcase}
          title="Experience"
          subtitle="Internships, jobs, volunteering, military service, leadership roles."
        />
        {expList.length === 0 ? (
          <EmptyState message="No experience extracted from your CV. Add one if you have any — otherwise continue and add later." />
        ) : (
          <div className="space-y-3">
            {expList.map((exp, i) => (
              <ExperienceCard
                key={i}
                exp={exp}
                onChange={(next) => updateExp(i, next)}
                onRemove={() => removeExp(i)}
              />
            ))}
          </div>
        )}
        <div className="mt-3">
          <AddCardButton label="Add experience" onClick={addExp} />
        </div>
      </section>

      {/* SECTION 3 — PROJECTS. Optional. */}
      <section>
        <SectionHeader
          icon={FolderGit2}
          title="Projects"
          subtitle="Side projects, capstones, hackathons — anything you built end-to-end."
        />
        {projList.length === 0 ? (
          <EmptyState message="No projects extracted. Add one if you have any — this section is optional." />
        ) : (
          <div className="space-y-3">
            {projList.map((proj, i) => (
              <ProjectCard
                key={i}
                proj={proj}
                onChange={(next) => updateProj(i, next)}
                onRemove={() => removeProj(i)}
              />
            ))}
          </div>
        )}
        <div className="mt-3">
          <AddCardButton label="Add project" onClick={addProj} />
        </div>
      </section>

      {/* SECTION 4 — CERTIFICATIONS. Optional. */}
      <section>
        <SectionHeader
          icon={BadgeCheck}
          title="Certifications"
          subtitle="Licences and credentials — surfaced in CV generation when relevant."
        />
        {certList.length === 0 ? (
          <EmptyState message="No certifications extracted. Add one if you have any — this section is optional." />
        ) : (
          <div className="space-y-3">
            {certList.map((cert, i) => (
              <CertificationCard
                key={i}
                cert={cert}
                onChange={(next) => updateCert(i, next)}
                onRemove={() => removeCert(i)}
              />
            ))}
          </div>
        )}
        <div className="mt-3">
          <AddCardButton label="Add certification" onClick={addCert} />
        </div>
      </section>

      {/* SECTION 5 — CATCH-ALL SKILLS. Anything not tied to a specific
          entity. Joins per-entity skills in skills_canonical at finalize. */}
      <section>
        <SectionHeader
          icon={Sparkles}
          title="Other skills"
          subtitle="Anything not tied to a specific experience — broad capabilities, self-taught, side learning."
        />
        <div className="space-y-3">
          <div className="bg-rd-bg-card border border-rd-border rounded-[14px] p-5">
            <RdSkillTagInput
              label={skills.length > 0 ? `Selected (${skills.length})` : undefined}
              description="Search the library or type your own."
              tags={skills}
              onChange={setSkills}
              suggestionType="library_skills"
              placeholder="Search skills, or type and press Enter to add custom"
            />
          </div>
          <div className="bg-rd-bg-card border border-rd-border rounded-[14px] p-5">
            <RdSkillChipBank selected={skills} onToggle={toggleSkill} />
          </div>
        </div>
      </section>

      <div className="flex justify-between items-center pt-2">
        <button
          onClick={onBack}
          className="text-[13px] font-semibold text-rd-text-tertiary hover:text-rd-text transition-colors"
        >
          ← Back
        </button>
        <RdButton onClick={onNext} disabled={!canProceed}>
          Continue <ArrowRight className="w-4 h-4" />
        </RdButton>
      </div>
    </div>
  );
}
