import React, { useState, useMemo } from "react";
import { supabase } from "@/api/supabaseClient";
import { useQueryClient } from "@tanstack/react-query";
import { useEducationQuery } from "@/lib/queries/useEducation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import SkillTagInput from "@/components/onboarding/SkillTagInput";
import { DEGREE_TYPE_OPTIONS, dropdownValueForDegreeType, EDUCATION_LEVELS } from "@/lib/educationPolicy";
import { recomputeProfileSkillsCanonical } from "@/lib/recomputeProfileSkillsCanonical";

// Multi-entry education editor for the AddInformation Profile page.
// Mirrors the Experience-tab pattern: an add/edit form at the top, a list
// of saved rows below with Edit + Delete controls per row.
//
// Dual-degree support: nothing here assumes one current education per
// user. Multiple rows can have is_current=true; multiple rows can share
// the same institution / start_date / end_date; the form happily handles
// adding a second degree at the same school with overlapping dates.

const EMPTY_FORM = {
  id: undefined,
  institution: "",
  education_level: "",
  degree_type: "",
  field_of_study: "",
  start_date: "",
  end_date: "",
  is_current: false,
  gpa: "",
  honors: [],
  relevant_coursework: [],
  academic_projects: [],
  skills: [],
  location: "",
};

const LEVEL_LABEL = {
  high_school: "High School",
  associate: "Associate Degree",
  bachelors: "Bachelor's Degree",
  masters: "Master's Degree",
  phd: "PhD",
  bootcamp: "Bootcamp",
  self_taught: "Self-Taught",
};

export default function EducationTab({ user }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const { data: educations = [], isLoading } = useEducationQuery(user?.id);

  const resetForm = () => setForm(EMPTY_FORM);

  const degreeDropdownValue = useMemo(
    () => dropdownValueForDegreeType(form.degree_type),
    [form.degree_type]
  );
  const isDegreeOther = degreeDropdownValue === "other";

  const handleDegreeDropdownChange = (v) => {
    if (v === "other") {
      setForm({ ...form, degree_type: isDegreeOther ? form.degree_type : "" });
    } else {
      setForm({ ...form, degree_type: v });
    }
  };

  const handleSave = async () => {
    if (!form.institution.trim()) {
      toast.error("Add an institution before saving.");
      return;
    }
    if (!form.education_level) {
      toast.error("Pick an education level before saving.");
      return;
    }
    if (!form.field_of_study.trim()) {
      toast.error("Add a field of study before saving.");
      return;
    }
    if (!form.start_date.trim()) {
      toast.error("Add a start date before saving.");
      return;
    }
    if (!form.is_current && !form.end_date.trim()) {
      toast.error("Enter an end date or check \"I'm currently studying\"");
      return;
    }
    setSaving(true);
    try {
      // Determine display_order for new rows: max(existing) + 1.
      // Edits preserve the row's existing order.
      const nextDisplayOrder = form.id
        ? undefined
        : (educations.reduce((max, e) => Math.max(max, e.display_order ?? 0), -1) + 1);

      const payload = {
        user_id: user.id,
        institution: form.institution || null,
        education_level: form.education_level || null,
        degree_type: form.degree_type || null,
        field_of_study: form.field_of_study || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        is_current: !!form.is_current,
        gpa: form.gpa || null,
        honors: form.honors || [],
        relevant_coursework: form.relevant_coursework || [],
        academic_projects: form.academic_projects || [],
        skills: form.skills || [],
        location: form.location || null,
        ...(nextDisplayOrder !== undefined && { display_order: nextDisplayOrder }),
      };

      if (form.id) {
        const { error } = await supabase
          .from("education")
          .update(payload)
          .eq("id", form.id)
          .eq("user_id", user.id);
        if (error) throw error;
        toast.success("Education updated.");
      } else {
        const { error } = await supabase.from("education").insert(payload);
        if (error) throw error;
        toast.success("Education added.");
      }
      queryClient.invalidateQueries({ queryKey: ["education", user.id] });
      // Also invalidate any cached profile queries that include nested
      // education (Home, ProfileSummary, edge function callers).
      queryClient.invalidateQueries({ queryKey: ["userProfile", user.id] });

      // skills changes affect profiles.skills_canonical. Recompute
      // from FRESH DB rows (all 4 sources) per the PR #178 incident pattern —
      // don't reuse cached React state.
      const recompute = await recomputeProfileSkillsCanonical(supabase, user.id);
      if (!recompute.ok) {
        console.error("Failed to recompute skills_canonical after education save:", recompute.error);
      }

      resetForm();
    } catch (e) {
      console.error("Education save error:", e);
      toast.error(e.message || "Failed to save education.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (e) => {
    setForm({
      id: e.id,
      institution: e.institution || "",
      education_level: e.education_level || "",
      degree_type: e.degree_type || "",
      field_of_study: e.field_of_study || "",
      start_date: e.start_date || "",
      end_date: e.end_date || "",
      is_current: !!e.is_current,
      gpa: e.gpa || "",
      honors: e.honors || [],
      relevant_coursework: e.relevant_coursework || [],
      academic_projects: e.academic_projects || [],
      // P1.3 read switch: prefer the unified `skills` column; fall back
      // to legacy until P1.4 drops it.
      skills: e.skills || [],
      location: e.location || "",
    });
    // Scroll to top of tab so the form is visible
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (row) => {
    if (!confirm(`Remove ${row.institution || "this education entry"}?`)) return;
    const { error } = await supabase
      .from("education")
      .delete()
      .eq("id", row.id)
      .eq("user_id", user.id);
    if (error) { toast.error("Failed to delete."); return; }
    if (form.id === row.id) resetForm();
    queryClient.invalidateQueries({ queryKey: ["education", user.id] });
    queryClient.invalidateQueries({ queryKey: ["userProfile", user.id] });
    toast.success("Education removed.");
  };

  return (
    <div className="space-y-4">
      {/* Add / Edit form */}
      <div className="bg-white rounded-xl border border-[#DDDDDB] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#0E1014]">
            {form.id ? "Edit Education" : "Add Education"}
          </h3>
          {form.id && (
            <button onClick={resetForm} className="text-xs text-[#9C9DA1] hover:text-[#52545A] underline">
              Cancel edit
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] uppercase tracking-wider text-[#9C9DA1] font-medium">Institution</label>
            <Input
              value={form.institution}
              onChange={(e) => setForm({ ...form, institution: e.target.value })}
              className="mt-1"
              placeholder="e.g. Stanford University"
            />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-[#9C9DA1] font-medium">Education Level</label>
            <Select value={form.education_level || undefined} onValueChange={(v) => setForm({ ...form, education_level: v })}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select level" /></SelectTrigger>
              <SelectContent>
                {EDUCATION_LEVELS.map((lvl) => (
                  <SelectItem key={lvl} value={lvl}>{LEVEL_LABEL[lvl] || lvl}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-[#9C9DA1] font-medium">Degree Type</label>
            <Select value={degreeDropdownValue || undefined} onValueChange={handleDegreeDropdownChange}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select degree type" /></SelectTrigger>
              <SelectContent>
                {DEGREE_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isDegreeOther && (
              <Input
                value={form.degree_type}
                onChange={(e) => setForm({ ...form, degree_type: e.target.value })}
                placeholder="e.g. B.Eng., Pharm.D., specific credential"
                className="mt-2"
              />
            )}
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-[#9C9DA1] font-medium">Field of Study</label>
            <Input
              value={form.field_of_study}
              onChange={(e) => setForm({ ...form, field_of_study: e.target.value })}
              className="mt-1"
              placeholder="e.g. Business Administration"
            />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-[#9C9DA1] font-medium">Start Date</label>
            <Input
              value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              className="mt-1"
              placeholder="e.g. September 2023, 2023"
            />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-[#9C9DA1] font-medium">End Date</label>
            <Input
              value={form.end_date}
              onChange={(e) => setForm({ ...form, end_date: e.target.value, is_current: /present|current/i.test(e.target.value) })}
              disabled={!!form.is_current}
              className="mt-1"
              placeholder='e.g. May 2025, "Present"'
            />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-[#9C9DA1] font-medium">GPA (optional)</label>
            <Input
              value={form.gpa}
              onChange={(e) => setForm({ ...form, gpa: e.target.value })}
              className="mt-1"
              placeholder="e.g. 3.7 / 4.0 or 90 / 100"
            />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-[#9C9DA1] font-medium">Location (optional)</label>
            <Input
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              className="mt-1"
              placeholder="e.g. Boston, MA"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Checkbox
            id="is_current"
            checked={!!form.is_current}
            onCheckedChange={(v) =>
              setForm({ ...form, is_current: !!v, ...(v && { end_date: "" }) })
            }
          />
          <Label htmlFor="is_current" className="text-xs text-[#52545A] cursor-pointer">
            I'm currently studying for this degree
          </Label>
        </div>

        <SkillTagInput
          label="Honors / Awards"
          description="Scholarships, Dean's List, named awards earned during this degree."
          tags={form.honors}
          onChange={(v) => setForm({ ...form, honors: v })}
          placeholder="e.g. Dean's List, Merit Scholarship"
          suggestionType="honors"
        />

        <SkillTagInput
          label="Relevant Coursework"
          description="Courses that map to your target roles."
          tags={form.relevant_coursework}
          onChange={(v) => setForm({ ...form, relevant_coursework: v })}
          placeholder="e.g. Marketing Strategy, Statistics"
          suggestionType="none"
        />

        <SkillTagInput
          label="Academic Projects"
          description="Thesis, capstone, or notable course projects."
          tags={form.academic_projects}
          onChange={(v) => setForm({ ...form, academic_projects: v })}
          placeholder="e.g. Senior thesis, Capstone project"
          suggestionType="none"
        />

        <SkillTagInput
          label="Skills Developed"
          description="Programs, methods, fields, or tools you developed during this degree — search the library or type custom."
          tags={form.skills}
          onChange={(v) => setForm({ ...form, skills: v })}
          placeholder="e.g. financial modeling, market research"
          suggestionType="library_skills"
        />

        <Button onClick={handleSave} disabled={saving} className="bg-[#0E1014] hover:bg-[#52545A] text-sm">
          {form.id ? <>Update Education</> : <><Plus className="w-4 h-4 mr-2" />Add Education</>}
        </Button>
      </div>

      {/* List of saved entries */}
      <div className="space-y-2">
        {isLoading && <p className="text-xs text-[#9C9DA1]">Loading…</p>}
        {!isLoading && educations.length === 0 && (
          <div className="text-center py-6 text-xs text-[#9C9DA1]">
            No education entries yet — add your first one above.
          </div>
        )}
        {educations.map((e) => (
          <div key={e.id} className="bg-white rounded-xl border border-[#DDDDDB] p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#E8E8E5] flex items-center justify-center flex-shrink-0">
              <GraduationCap className="w-4 h-4 text-[#52545A]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#0E1014] truncate">
                {e.degree_type ? `${e.degree_type} · ` : ""}{e.field_of_study || (LEVEL_LABEL[e.education_level] || "Education")}
              </p>
              <p className="text-xs text-[#52545A] truncate">
                {e.institution || "Institution not set"}
                {e.start_date || e.end_date ? ` · ${e.start_date || ""}${e.start_date && e.end_date ? " – " : ""}${e.end_date || (e.is_current ? "Present" : "")}` : ""}
              </p>
              {(e.honors?.length > 0 || e.relevant_coursework?.length > 0 || e.academic_projects?.length > 0 || e.skills?.length > 0) && (
                <p className="text-[11px] text-[#9C9DA1] mt-1 truncate">
                  {e.honors?.length > 0 && <>{e.honors.length} honor{e.honors.length === 1 ? "" : "s"} · </>}
                  {e.relevant_coursework?.length > 0 && <>{e.relevant_coursework.length} course{e.relevant_coursework.length === 1 ? "" : "s"} · </>}
                  {e.academic_projects?.length > 0 && <>{e.academic_projects.length} project{e.academic_projects.length === 1 ? "" : "s"} · </>}
                  {(() => {
                    const n = e.skills?.length || 0;
                    return n > 0 ? <>{n} skill{n === 1 ? "" : "s"}</> : null;
                  })()}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button variant="ghost" size="sm" onClick={() => handleEdit(e)}>
                <Pencil className="w-3.5 h-3.5 text-[#9C9DA1]" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleDelete(e)}>
                <Trash2 className="w-3.5 h-3.5 text-[#9C9DA1] hover:text-red-500" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
