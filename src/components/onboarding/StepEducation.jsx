import React from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import SkillTagInput from "./SkillTagInput";

export default function StepEducation({ data, onChange, onNext, onBack }) {
  const set = (key, val) => onChange({ ...data, [key]: val });

  const canProceed = data.full_name?.trim() && data.education_level;

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
            Full Name
          </label>
          <Input
            value={data.full_name || ""}
            onChange={(e) => set("full_name", e.target.value)}
            placeholder="Your full name"
          />
        </div>

        <div>
          <label className="block text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium mb-1">
            Institution / University
          </label>
          <Input
            value={data.education_institution || ""}
            onChange={(e) => set("education_institution", e.target.value)}
            placeholder="e.g. Reichman University, IDC Herzliya, Tel Aviv University"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium mb-1">
              Education Level
            </label>
            <Select value={data.education_level || ""} onValueChange={(v) => set("education_level", v)}>
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
              Degree
            </label>
            <Input
              value={data.degree || ""}
              onChange={(e) => set("degree", e.target.value)}
              placeholder="e.g. BSc, BA, MBA"
            />
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium mb-1">
              Field of Study / Specialization
            </label>
            <Input
              value={data.field_of_study || ""}
              onChange={(e) => set("field_of_study", e.target.value)}
              placeholder="e.g. Computer Science, Business Administration"
            />
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium mb-1">
              GPA (optional)
            </label>
            <Input
              value={data.gpa || ""}
              onChange={(e) => set("gpa", e.target.value)}
              placeholder="e.g. 3.7 / 4.0"
            />
          </div>
        </div>

        <SkillTagInput
          label="Relevant Coursework"
          description="List courses that are relevant to your target roles."
          tags={data.relevant_coursework || []}
          onChange={(v) => set("relevant_coursework", v)}
          placeholder="e.g. Data Structures, Financial Accounting"
        />

        <SkillTagInput
          label="Academic Projects"
          description="Thesis, capstone, or notable academic projects."
          tags={data.academic_projects || []}
          onChange={(v) => set("academic_projects", v)}
          placeholder="e.g. Sales Forecasting ML Model"
        />
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} className="text-sm">Back</Button>
        <Button
          onClick={onNext}
          disabled={!canProceed}
          className="bg-[#0A0A0A] hover:bg-[#262626] text-sm px-6"
        >
          Continue to Experience
        </Button>
      </div>
    </div>
  );
}