import React, { useMemo, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GraduationCap, BookOpen, Award, Microscope, Code2, ArrowRight } from "lucide-react";
import RdSkillTagInput from "@/components/redesign/RdSkillTagInput";
import RdButton from "@/components/redesign/RdButton";
import { DEGREE_TYPE_OPTIONS, dropdownValueForDegreeType } from "@/lib/educationPolicy";
import { EMPTY_EDUCATION_ROW } from "@/lib/onboardingPayload";

// Onboarding's single-entry education form (FIRST row, display_order=0).
// Secondary education from CV (high school) is silently created in state but
// hidden here per the Phase B design decision. Users add/edit multiple
// entries on Profile post-onboarding.
//
// Restyled for PR 2A — behaviour identical to the Direction-3 version.
// Required-field rule preserved: full_name + institution + level +
// field_of_study + start_date + (end_date OR is_current). Bidirectional
// end_date ↔ is_current sync preserved. RdSkillTagInput (forked from
// SkillTagInput) replaces inline SkillTagInput; suggestionType="none" is
// preserved on both coursework / academic_projects (free-text fields).

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

function Label({ children, required = false }) {
  return (
    <label className="block text-[12px] font-semibold text-rd-text mb-1.5">
      {children}{" "}
      {required ? <span className="text-rd-coral">*</span> : null}
    </label>
  );
}

export default function StepEducation({ data, onChange, educations, setEducations, onNext, onBack }) {
  useEffect(() => {
    if (!Array.isArray(educations) || educations.length === 0) {
      setEducations([{ ...EMPTY_EDUCATION_ROW }]);
    }
  }, [educations, setEducations]);

  const primary = educations?.[0] || EMPTY_EDUCATION_ROW;

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
    [primary.degree_type]
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

  return (
    <div className="space-y-7">
      <div>
        <p className="text-[10.5px] uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow font-mono">
          step 2 of 9 · education
        </p>
        <h1 className="font-display font-extrabold text-[26px] sm:text-[28px] leading-[1.1] tracking-tight text-rd-text mt-2">
          Where did you study?
        </h1>
        <p className="text-[13.5px] leading-[1.6] text-rd-text-secondary mt-3">
          We use this to map your knowledge domains to role requirements.
        </p>
      </div>

      <div className="space-y-5">
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
          {/* Fallback dropdown for the long tail (associate / self-taught). */}
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
            id="onb-edu-is-current"
            checked={!!primary.is_current}
            onChange={(e) => setIsCurrent(e.target.checked)}
            className="w-[15px] h-[15px] accent-rd-coral cursor-pointer"
          />
          <label
            htmlFor="onb-edu-is-current"
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
      </div>

      {dateError && (
        <p className="text-[12px] text-rd-coral-dark">
          Enter an end date or check &ldquo;I&apos;m currently studying&rdquo;
        </p>
      )}

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
