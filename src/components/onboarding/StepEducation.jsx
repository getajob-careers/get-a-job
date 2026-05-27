import React, { useMemo, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GraduationCap, BookOpen, Award, Microscope, Code2, ArrowRight } from "lucide-react";
import SkillTagInput from "./SkillTagInput";
import { DEGREE_TYPE_OPTIONS, dropdownValueForDegreeType } from "@/lib/educationPolicy";
import { EMPTY_EDUCATION_ROW } from "@/lib/onboardingPayload";

// Onboarding's single-entry education form (FIRST row, display_order=0).
// Secondary education from CV (high school) is silently created in state but
// hidden here per the Phase B design decision. Users add/edit multiple
// entries on Profile post-onboarding.

const EDU_LEVELS = [
  { value: "high_school", label: "High school", Icon: BookOpen },
  { value: "bachelors", label: "Bachelor's", Icon: GraduationCap },
  { value: "masters", label: "Master's", Icon: Award },
  { value: "phd", label: "PhD", Icon: Microscope },
  { value: "bootcamp", label: "Bootcamp", Icon: Code2 },
];
// associate + self_taught keep the dropdown fallback below — they're real
// values but uncommon enough that the visual grid would dilute the primary
// 5 options. Falls into "Other levels" pulldown.
const OTHER_LEVELS = [
  { value: "associate", label: "Associate degree" },
  { value: "self_taught", label: "Self-taught" },
];

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

  // Bidirectional end_date ↔ is_current sync. Typing "Present"/"Current" in
  // the end_date input checks is_current; checking the box clears end_date.
  // Matches Profile EducationTab UX.
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

  // Required: full_name + institution + level + field_of_study + start_date
  // + (end_date OR is_current). Degree type stays soft (useful for matching
  // but not worth blocking on).
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
        <h1 className="onb-h1">Where did you study?</h1>
        <p className="onb-sub">
          We use this to map your knowledge domains to role requirements.
        </p>
      </div>

      <div className="space-y-5">
        <div>
          <label className="onb-label">Full name <span className="req">*</span></label>
          <input
            type="text"
            value={data.full_name || ""}
            onChange={(e) => setProfileField("full_name", e.target.value)}
            placeholder="Your full name"
            className="onb-input"
          />
        </div>

        <div>
          <label className="onb-label">Institution / University <span className="req">*</span></label>
          <input
            type="text"
            value={primary.institution || ""}
            onChange={(e) => setEduField("institution", e.target.value)}
            placeholder="e.g. Stanford University, University of Toronto"
            className="onb-input"
          />
        </div>

        <div>
          <label className="onb-label">Education level <span className="req">*</span></label>
          <div className="onb-grid-cards onb-grid-cards-5">
            {EDU_LEVELS.map(({ value, label, Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setEduField("education_level", value)}
                className="onb-grid-card"
                data-selected={currentLevel === value}
              >
                <div className="onb-grid-card-icon">
                  <Icon className="w-4 h-4" />
                </div>
                <span className="onb-grid-card-label">{label}</span>
              </button>
            ))}
          </div>
          {/* Fallback dropdown for the long tail (associate / self-taught). */}
          <div className="mt-3">
            <Select
              value={isOtherLevel ? currentLevel : ""}
              onValueChange={(v) => setEduField("education_level", v)}
            >
              <SelectTrigger className="text-sm h-9 border-[#DDDDDB]">
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
            <label className="onb-label">Degree type</label>
            <Select value={degreeDropdownValue || undefined} onValueChange={handleDegreeDropdownChange}>
              <SelectTrigger className="text-sm border-[#DDDDDB]"><SelectValue placeholder="Select degree type" /></SelectTrigger>
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
                className="onb-input mt-2"
              />
            )}
          </div>

          <div>
            <label className="onb-label">Field of study <span className="req">*</span></label>
            <input
              type="text"
              value={primary.field_of_study || ""}
              onChange={(e) => setEduField("field_of_study", e.target.value)}
              placeholder="e.g. Computer Science, Business"
              className="onb-input"
            />
          </div>

          <div>
            <label className="onb-label">Start date <span className="req">*</span></label>
            <input
              type="text"
              value={primary.start_date || ""}
              onChange={(e) => setEduField("start_date", e.target.value)}
              placeholder="e.g. September 2023, 2023"
              className="onb-input"
            />
          </div>

          <div>
            <label className="onb-label">End date {!primary.is_current && <span className="req">*</span>}</label>
            <input
              type="text"
              value={primary.end_date || ""}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={!!primary.is_current}
              placeholder='e.g. May 2025, "Present"'
              className="onb-input"
            />
          </div>

          <div>
            <label className="onb-label">GPA <span className="text-[#9C9DA1] font-normal">(optional)</span></label>
            <input
              type="text"
              value={primary.gpa || ""}
              onChange={(e) => setEduField("gpa", e.target.value)}
              placeholder="e.g. 3.7 / 4.0"
              className="onb-input"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="onb-edu-is-current"
            checked={!!primary.is_current}
            onChange={(e) => setIsCurrent(e.target.checked)}
            className="cursor-pointer"
          />
          <label htmlFor="onb-edu-is-current" className="text-xs text-[#52545A] cursor-pointer">
            I'm currently studying for this degree
          </label>
        </div>

        <SkillTagInput
          label="Relevant coursework"
          description="List courses that are relevant to your target roles."
          tags={primary.relevant_coursework || []}
          onChange={(v) => setEduField("relevant_coursework", v)}
          placeholder="e.g. Data Structures, Financial Accounting"
          suggestionType="none"
        />

        <SkillTagInput
          label="Academic projects"
          description="Thesis, capstone, or notable academic projects."
          tags={primary.academic_projects || []}
          onChange={(v) => setEduField("academic_projects", v)}
          placeholder="e.g. Sales Forecasting ML Model"
          suggestionType="none"
        />
      </div>

      {dateError && (
        <p className="text-xs text-[#C84F40]">
          Enter an end date or check &ldquo;I&apos;m currently studying&rdquo;
        </p>
      )}

      <div className="flex justify-between pt-2">
        <button onClick={onBack} className="onb-btn onb-btn-outline">Back</button>
        <button
          onClick={onNext}
          disabled={!canProceed}
          className="onb-btn onb-btn-primary onb-btn-lg"
        >
          Continue <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
