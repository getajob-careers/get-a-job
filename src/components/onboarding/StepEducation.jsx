import React, { useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import SkillTagInput from "./SkillTagInput";
import { DEGREE_TYPE_OPTIONS, dropdownValueForDegreeType } from "@/lib/educationPolicy";
import { EMPTY_EDUCATION_ROW } from "@/lib/onboardingPayload";

// Onboarding's single-entry education form. Renders the FIRST education
// row (display_order=0) — secondary education from CV (high school) is
// silently created in state but not shown here, per the Phase B design
// decision to keep onboarding scope tight. Users can add/edit multiple
// entries on the Profile page's Education tab post-onboarding.
//
// Props:
//   data             — profileData (for full_name field, which lives on profiles)
//   onChange         — setProfileData
//   educations       — array of education rows (Phase B education table)
//   setEducations    — setter for the educations array
//   onNext / onBack  — flow navigation

export default function StepEducation({ data, onChange, educations, setEducations, onNext, onBack }) {
  // Auto-init: if no row exists yet (fresh onboarding, no CV uploaded),
  // seed a blank primary row so the form has something to bind against.
  // Matches the pre-Phase-B UX where the form fields were always present.
  useEffect(() => {
    if (!Array.isArray(educations) || educations.length === 0) {
      setEducations([{ ...EMPTY_EDUCATION_ROW }]);
    }
  }, [educations, setEducations]);

  const primary = educations?.[0] || EMPTY_EDUCATION_ROW;

  // Update a single field on the primary education row. Always mutates
  // index 0 immutably. Preserves any other rows (secondary HS, etc.).
  const setEduField = (key, val) => {
    setEducations((prev) => {
      const arr = Array.isArray(prev) && prev.length > 0 ? [...prev] : [{ ...EMPTY_EDUCATION_ROW }];
      arr[0] = { ...arr[0], [key]: val };
      return arr;
    });
  };

  const setProfileField = (key, val) => onChange({ ...data, [key]: val });

  // Required: full_name + institution + education_level. Degree type and
  // field of study are soft-suggested — they add fidelity to downstream
  // role matching but aren't worth blocking onboarding over (a marketing
  // student still wanting "Product Manager" matches without a degree_type).
  const canProceed =
    !!data.full_name?.trim() &&
    !!primary.institution?.trim() &&
    !!primary.education_level;

  // Degree dropdown — pick which option is "selected" based on what's stored.
  // If the stored value isn't a preset, the dropdown shows "Other" and we
  // surface a free-text input below for editing.
  const degreeDropdownValue = useMemo(
    () => dropdownValueForDegreeType(primary.degree_type),
    [primary.degree_type]
  );
  const isDegreeOther = degreeDropdownValue === "other";

  const handleDegreeDropdownChange = (v) => {
    if (v === "other") {
      // Switching to "Other" — preserve any existing non-preset value as
      // the starting point for the free-text input. If the user was on a
      // preset, clear the field so they can type their custom value.
      setEduField("degree_type", isDegreeOther ? primary.degree_type : "");
    } else {
      setEduField("degree_type", v);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#0A0A0A] tracking-tight">Education</h2>
        <p className="text-sm text-[#525252] mt-1">
          This information maps your knowledge domains to job role requirements.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-[#E5E5E5] p-6 space-y-5">
        <div>
          <label className="block text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium mb-1">
            Full Name <span className="text-red-400">*</span>
          </label>
          <Input
            value={data.full_name || ""}
            onChange={(e) => setProfileField("full_name", e.target.value)}
            placeholder="Your full name"
          />
        </div>

        <div>
          <label className="block text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium mb-1">
            Institution / University <span className="text-red-400">*</span>
          </label>
          <Input
            value={primary.institution || ""}
            onChange={(e) => setEduField("institution", e.target.value)}
            placeholder="e.g. Reichman University, IDC Herzliya, Tel Aviv University"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium mb-1">
              Education Level <span className="text-red-400">*</span>
            </label>
            <Select value={primary.education_level || undefined} onValueChange={(v) => setEduField("education_level", v)}>
              <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="high_school">High School</SelectItem>
                <SelectItem value="associate">Associate Degree</SelectItem>
                <SelectItem value="bachelors">Bachelor's Degree</SelectItem>
                <SelectItem value="masters">Master's Degree</SelectItem>
                <SelectItem value="phd">PhD</SelectItem>
                <SelectItem value="bootcamp">Bootcamp</SelectItem>
                <SelectItem value="self_taught">Self-Taught</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium mb-1">
              Degree Type
            </label>
            <Select value={degreeDropdownValue || undefined} onValueChange={handleDegreeDropdownChange}>
              <SelectTrigger><SelectValue placeholder="Select degree type" /></SelectTrigger>
              <SelectContent>
                {DEGREE_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isDegreeOther && (
              <Input
                value={primary.degree_type || ""}
                onChange={(e) => setEduField("degree_type", e.target.value)}
                placeholder="e.g. B.Eng., Pharm.D., specific credential"
                className="mt-2"
              />
            )}
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium mb-1">
              Field of Study / Specialization
            </label>
            <Input
              value={primary.field_of_study || ""}
              onChange={(e) => setEduField("field_of_study", e.target.value)}
              placeholder="e.g. Computer Science, Business Administration"
            />
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium mb-1">
              GPA (optional)
            </label>
            <Input
              value={primary.gpa || ""}
              onChange={(e) => setEduField("gpa", e.target.value)}
              placeholder="e.g. 3.7 / 4.0"
            />
          </div>
        </div>

        <SkillTagInput
          label="Relevant Coursework"
          description="List courses that are relevant to your target roles."
          tags={primary.relevant_coursework || []}
          onChange={(v) => setEduField("relevant_coursework", v)}
          placeholder="e.g. Data Structures, Financial Accounting"
          suggestionType="none"
        />

        <SkillTagInput
          label="Academic Projects"
          description="Thesis, capstone, or notable academic projects."
          tags={primary.academic_projects || []}
          onChange={(v) => setEduField("academic_projects", v)}
          placeholder="e.g. Sales Forecasting ML Model"
          suggestionType="none"
        />
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} className="text-sm">Back</Button>
        <Button
          onClick={onNext}
          disabled={!canProceed}
          className="bg-[#0A0A0A] hover:bg-[#262626] text-sm px-6"
        >
          Continue to Practicum
        </Button>
      </div>
    </div>
  );
}
