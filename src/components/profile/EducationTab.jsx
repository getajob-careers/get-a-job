import React, { useState, useMemo } from "react";
import { supabase } from "@/api/supabaseClient";
import { useQueryClient } from "@tanstack/react-query";
import { useEducationQuery } from "@/lib/queries/useEducation";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, GraduationCap, Loader2 } from "lucide-react";
import BulletsEditor from "@/components/profile/BulletsEditor";
import { formatDateRange } from "../../../supabase/functions/_shared/date-format.ts";
import { toast } from "sonner";
import SkillTagInput from "@/components/onboarding/SkillTagInput";
import {
  DEGREE_TYPE_OPTIONS,
  dropdownValueForDegreeType,
  EDUCATION_LEVELS,
} from "@/lib/educationPolicy";
import { recomputeProfileSkillsCanonical } from "@/lib/recomputeProfileSkillsCanonical";
import CertificationsSection from "./CertificationsSection";

// PR 3F — EducationTab restyled on rd-* tokens. Restyle-only: write
// paths (handleSave, handleDelete), the recomputeProfileSkillsCanonical
// call AFTER each entity write (PR #178 narrow-projection invariant),
// and the RLS `.eq("user_id", user.id)` guards are all preserved
// verbatim.
//
// Multi-entry education editor for the Profile page. Mirrors the
// Experience-tab pattern: an add/edit form at the top, a list of saved
// rows below with Edit + Delete controls per row.
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

// rd-token class strings — mirror Profile.jsx's vocabulary.
const RD_CARD =
  "rounded-[18px] border border-rd-border bg-rd-bg-card p-5 sm:p-6 shadow-rd";
const RD_CARD_LG =
  "rounded-[18px] border border-rd-border bg-rd-bg-card p-6 sm:p-7 shadow-rd";
const RD_LABEL =
  "block text-[11px] font-display font-semibold text-rd-text mb-1.5";
const RD_INPUT_CLS =
  "border-rd-border rounded-[10px] bg-rd-bg-card text-rd-text text-[13.5px] placeholder:text-rd-text-tertiary focus-visible:border-rd-coral focus-visible:ring-0 focus-visible:shadow-[0_0_0_3px_var(--rd-coral-tint)]";
const RD_BTN_PRIMARY =
  "inline-flex items-center justify-center gap-1.5 font-display font-bold text-[13px] text-white bg-rd-coral hover:bg-rd-coral-dark disabled:opacity-50 disabled:cursor-not-allowed rounded-full px-4 py-2.5 transition-colors";
const RD_BTN_GHOST =
  "inline-flex items-center gap-1.5 text-[12px] text-rd-text-secondary hover:text-rd-text hover:bg-rd-bg-soft rounded-full px-2.5 py-1.5 transition-colors";

export default function EducationTab({ user }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const { data: educations = [], isLoading } = useEducationQuery(user?.id);

  const resetForm = () => setForm(EMPTY_FORM);

  const degreeDropdownValue = useMemo(
    () => dropdownValueForDegreeType(form.degree_type),
    [form.degree_type],
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
      toast.error('Enter an end date or check "I\'m currently studying"');
      return;
    }
    setSaving(true);
    try {
      // Determine display_order for new rows: max(existing) + 1.
      // Edits preserve the row's existing order.
      const nextDisplayOrder = form.id
        ? undefined
        : educations.reduce(
            (max, e) => Math.max(max, e.display_order ?? 0),
            -1,
          ) + 1;

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
        ...(nextDisplayOrder !== undefined && {
          display_order: nextDisplayOrder,
        }),
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
      const recompute = await recomputeProfileSkillsCanonical(
        supabase,
        user.id,
      );
      if (!recompute.ok) {
        console.error(
          "Failed to recompute skills_canonical after education save:",
          recompute.error,
        );
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
    if (typeof window !== "undefined")
      window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (row) => {
    if (!confirm(`Remove ${row.institution || "this education entry"}?`))
      return;
    const { error } = await supabase
      .from("education")
      .delete()
      .eq("id", row.id)
      .eq("user_id", user.id);
    if (error) {
      toast.error("Failed to delete.");
      return;
    }
    if (form.id === row.id) resetForm();
    queryClient.invalidateQueries({ queryKey: ["education", user.id] });
    queryClient.invalidateQueries({ queryKey: ["userProfile", user.id] });
    toast.success("Education removed.");
  };

  return (
    <div className="space-y-4">
      {/* Add / Edit form */}
      <div className={`${RD_CARD_LG} space-y-4`}>
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold text-[14px] text-rd-text">
            {form.id ? "Edit Education" : "Add Education"}
          </h3>
          {form.id && (
            <button
              onClick={resetForm}
              className="text-[12px] text-rd-text-tertiary hover:text-rd-text underline"
            >
              Cancel edit
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={RD_LABEL}>Institution</label>
            <Input
              value={form.institution}
              onChange={(e) =>
                setForm({ ...form, institution: e.target.value })
              }
              className={RD_INPUT_CLS}
              placeholder="e.g. Stanford University"
            />
          </div>
          <div>
            <label className={RD_LABEL}>Education Level</label>
            <Select
              value={form.education_level || undefined}
              onValueChange={(v) => setForm({ ...form, education_level: v })}
            >
              <SelectTrigger className={RD_INPUT_CLS}>
                <SelectValue placeholder="Select level" />
              </SelectTrigger>
              <SelectContent>
                {EDUCATION_LEVELS.map((lvl) => (
                  <SelectItem key={lvl} value={lvl}>
                    {LEVEL_LABEL[lvl] || lvl}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className={RD_LABEL}>Degree Type</label>
            <Select
              value={degreeDropdownValue || undefined}
              onValueChange={handleDegreeDropdownChange}
            >
              <SelectTrigger className={RD_INPUT_CLS}>
                <SelectValue placeholder="Select degree type" />
              </SelectTrigger>
              <SelectContent>
                {DEGREE_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isDegreeOther && (
              <Input
                value={form.degree_type}
                onChange={(e) =>
                  setForm({ ...form, degree_type: e.target.value })
                }
                placeholder="e.g. B.Eng., Pharm.D., specific credential"
                className={`${RD_INPUT_CLS} mt-2`}
              />
            )}
          </div>
          <div>
            <label className={RD_LABEL}>Field of Study</label>
            <Input
              value={form.field_of_study}
              onChange={(e) =>
                setForm({ ...form, field_of_study: e.target.value })
              }
              className={RD_INPUT_CLS}
              placeholder="e.g. Business Administration"
            />
          </div>
          <div>
            <label className={RD_LABEL}>Start Date</label>
            <Input
              value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              className={RD_INPUT_CLS}
              placeholder="e.g. September 2023, 2023"
            />
          </div>
          <div>
            <label className={RD_LABEL}>End Date</label>
            <Input
              value={form.end_date}
              onChange={(e) =>
                setForm({
                  ...form,
                  end_date: e.target.value,
                  is_current: /present|current/i.test(e.target.value),
                })
              }
              disabled={!!form.is_current}
              className={RD_INPUT_CLS}
              placeholder='e.g. May 2025, "Present"'
            />
          </div>
          <div>
            <label className={RD_LABEL}>GPA (optional)</label>
            <Input
              value={form.gpa}
              onChange={(e) => setForm({ ...form, gpa: e.target.value })}
              className={RD_INPUT_CLS}
              placeholder="e.g. 3.7 / 4.0 or 90 / 100"
            />
          </div>
          <div>
            <label className={RD_LABEL}>Location (optional)</label>
            <Input
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              className={RD_INPUT_CLS}
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
            className="border-rd-border data-[state=checked]:bg-rd-coral data-[state=checked]:border-rd-coral"
          />
          <Label
            htmlFor="is_current"
            className="text-[12px] text-rd-text-secondary cursor-pointer"
          >
            I&apos;m currently studying for this degree
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
          description="Programs, methods, fields, or tools you developed during this degree - search the library or type custom."
          tags={form.skills}
          onChange={(v) => setForm({ ...form, skills: v })}
          placeholder="e.g. financial modeling, market research"
          suggestionType="library_skills"
        />

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className={RD_BTN_PRIMARY}
        >
          {saving ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Saving…
            </>
          ) : form.id ? (
            "Update Education"
          ) : (
            <>
              <Plus className="w-3.5 h-3.5" />
              Add Education
            </>
          )}
        </button>
      </div>

      {/* List of saved entries */}
      <div className="space-y-2">
        {isLoading && (
          <p className="text-[12px] text-rd-text-tertiary">Loading…</p>
        )}
        {!isLoading && educations.length === 0 && (
          <div className={`${RD_CARD} text-center py-8`}>
            <GraduationCap className="w-9 h-9 text-rd-coral mx-auto mb-2.5" />
            <p className="text-[12.5px] text-rd-text-tertiary">
              No education entries yet - add your first one above.
            </p>
          </div>
        )}
        {educations.map((e) => (
          // NOTE: not yet using EntityCard here — education rows have
          // richer subtitle composition (degree_type, field_of_study,
          // institution, dates) and a different meta-line shape
          // (honors / coursework / projects / skills counts). PR 3 or a
          // follow-up cleanup can lift these into EntityCard once
          // courses are in place and the shared shape is concrete.
          <div
            key={e.id}
            data-edu-id={e.id}
            className={`${RD_CARD} hover:border-rd-border-hover transition-colors`}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-[12px] bg-rd-teal-tint flex items-center justify-center flex-shrink-0">
                <GraduationCap className="w-4 h-4 text-rd-teal-dark" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display font-bold text-[13.5px] text-rd-text truncate">
                  {e.degree_type ? `${e.degree_type} · ` : ""}
                  {e.field_of_study ||
                    LEVEL_LABEL[e.education_level] ||
                    "Education"}
                </p>
                <p className="text-[12px] text-rd-text-secondary truncate">
                  {e.institution || "Institution not set"}
                  {e.start_date || e.end_date || e.is_current
                    ? ` · ${formatDateRange(e.start_date, e.end_date, e.is_current)}`
                    : ""}
                </p>
                {(e.honors?.length > 0 ||
                  e.relevant_coursework?.length > 0 ||
                  e.academic_projects?.length > 0 ||
                  e.skills?.length > 0) && (
                  <p className="text-[11px] text-rd-text-tertiary mt-1 truncate">
                    {e.honors?.length > 0 && (
                      <>
                        {e.honors.length} honor
                        {e.honors.length === 1 ? "" : "s"} ·{" "}
                      </>
                    )}
                    {e.relevant_coursework?.length > 0 && (
                      <>
                        {e.relevant_coursework.length} course
                        {e.relevant_coursework.length === 1 ? "" : "s"} ·{" "}
                      </>
                    )}
                    {e.academic_projects?.length > 0 && (
                      <>
                        {e.academic_projects.length} project
                        {e.academic_projects.length === 1 ? "" : "s"} ·{" "}
                      </>
                    )}
                    {(() => {
                      const n = e.skills?.length || 0;
                      return n > 0 ? (
                        <>
                          {n} skill{n === 1 ? "" : "s"}
                        </>
                      ) : null;
                    })()}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => handleEdit(e)}
                  className={RD_BTN_GHOST}
                  aria-label="Edit"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(e)}
                  className={RD_BTN_GHOST}
                  aria-label="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <BulletsEditor
              targetType="education"
              entity={e}
              userId={user?.id}
              onChanged={() =>
                queryClient.invalidateQueries({
                  queryKey: ["education", user.id],
                })
              }
            />
          </div>
        ))}
      </div>

      {/* Certifications — rendered under the Education tab per PR 2 of
          the entity IA. The standalone Certifications tab is removed
          (its URL redirects here). */}
      <div className="pt-6 border-t border-rd-border-subtle space-y-3">
        <div>
          <h2 className="font-display font-bold text-[15px] text-rd-text">
            Certifications
          </h2>
          <p className="text-[12px] text-rd-text-tertiary mt-0.5">
            Industry certs, course completions, in-progress credentials. Skills
            you tag here count toward your profile.
          </p>
        </div>
        <CertificationsSection user={user} />
      </div>
    </div>
  );
}
