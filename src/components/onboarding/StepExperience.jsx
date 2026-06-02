import React, { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import RdSkillTagInput from "@/components/redesign/RdSkillTagInput";
import RdButton from "@/components/redesign/RdButton";
import { Plus, Trash2, FileText, ArrowRight } from "lucide-react";

// Restyled for PR 2B — behaviour identical to the Direction-3 version.
// Multi-entry experience form. SkillTagInput → RdSkillTagInput (preserves
// the suggestionType="library_skills" autocomplete + suggestions per the
// standing skill guarantee). Founder type (PR #211) preserved in the
// dropdown. Edit / add / delete + "currently working / managed people /
// cross-functional" flags untouched.

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

const INPUT_CLS =
  "w-full px-3.5 py-2.5 rounded-[10px] border border-rd-border bg-rd-bg-card text-rd-text text-[13.5px] placeholder:text-rd-text-secondary/70 outline-none transition-[border-color,box-shadow] duration-150 focus:border-rd-coral focus:shadow-[0_0_0_3px_var(--rd-coral-tint)]";

function FieldLabel({ children }) {
  return (
    <label className="block text-[12px] font-semibold text-rd-text mb-1.5">{children}</label>
  );
}

export default function StepExperience({ experiences, onChange, onNext, onBack }) {
  const [editing, setEditing] = useState(experiences.length === 0 ? 0 : null);
  const [draft, setDraft] = useState(experiences.length > 0 ? null : { ...EMPTY_EXP });

  const set = (key, val) => setDraft((d) => ({ ...d, [key]: val }));

  const saveEntry = () => {
    if (!draft?.title || !draft?.company) return;
    const updated = [...experiences];
    if (editing < experiences.length) {
      updated[editing] = draft;
    } else {
      updated.push(draft);
    }
    onChange(updated);
    setEditing(null);
    setDraft(null);
  };

  const deleteEntry = (i) => onChange(experiences.filter((_, idx) => idx !== i));

  const startAdd = () => {
    setDraft({ ...EMPTY_EXP });
    setEditing(experiences.length);
  };

  const startEdit = (i) => {
    setDraft({ ...experiences[i] });
    setEditing(i);
  };

  return (
    <div className="space-y-7">
      <div>
        <p className="text-[10.5px] uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow font-mono">
          step 4 of 9 · experience
        </p>
        <h1 className="font-display font-extrabold text-[26px] sm:text-[28px] leading-[1.1] tracking-tight text-rd-text mt-2">
          Your experience.
        </h1>
        <p className="text-[13.5px] leading-[1.6] text-rd-text-secondary mt-3">
          Internships, volunteering, leadership, military, projects — each role is analysed for skills.
        </p>
      </div>

      {experiences.length > 0 && (
        <div className="bg-rd-teal-tint border border-rd-teal/40 rounded-[14px] px-3.5 py-2.5 text-[13px] text-rd-teal-dark flex items-center gap-2.5">
          <FileText className="w-4 h-4 flex-shrink-0" />
          <p>
            <span className="font-display font-semibold text-rd-text">
              {experiences.length} {experiences.length === 1 ? "entry" : "entries"}
            </span>{" "}
            pre-filled from your CV — review, edit, or add more below.
          </p>
        </div>
      )}

      {experiences.length === 0 && (
        <div className="bg-rd-golden-tint border border-rd-golden/40 rounded-[14px] px-3.5 py-2.5 text-[13px] text-rd-golden-dark flex items-center gap-2.5">
          <FileText className="w-4 h-4 flex-shrink-0" />
          <p>No experience extracted from your CV. Add entries manually below, or go back to upload your CV.</p>
        </div>
      )}

      {/* Existing entries */}
      {experiences.length > 0 && (
        <div className="space-y-2">
          {experiences.map((exp, i) => (
            <div
              key={i}
              className="bg-rd-bg-card rounded-[14px] border border-rd-border px-4 py-3 flex items-center justify-between"
            >
              <div className="min-w-0">
                <p className="font-display font-semibold text-[14px] text-rd-text truncate">{exp.title}</p>
                <p className="text-[12px] text-rd-text-secondary truncate">
                  {exp.company} — {exp.type?.replace("_", " ")}
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => startEdit(i)}
                  className="text-[12px] text-rd-text-secondary hover:text-rd-text px-2.5 py-1 rounded-md border border-rd-border hover:bg-rd-bg-soft transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteEntry(i)}
                  className="text-[12px] text-rd-coral-dark hover:text-rd-coral px-2 py-1 rounded-md border border-rd-coral-tint hover:bg-rd-coral-tint transition-colors"
                  aria-label={`Delete ${exp.title}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form for adding/editing */}
      {draft !== null ? (
        <div className="bg-rd-bg-card border border-rd-border rounded-[14px] p-5 space-y-4">
          <h3 className="font-display font-semibold text-[14px] text-rd-text">
            {editing < experiences.length ? "Edit entry" : "Add experience"}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabel>Job title</FieldLabel>
              <input
                className={INPUT_CLS}
                value={draft.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="e.g. Marketing Intern"
              />
            </div>
            <div>
              <FieldLabel>Company / Organization</FieldLabel>
              <input
                className={INPUT_CLS}
                value={draft.company}
                onChange={(e) => set("company", e.target.value)}
                placeholder="e.g. Goldman Sachs"
              />
            </div>
            <div>
              <FieldLabel>Type</FieldLabel>
              <Select value={draft.type} onValueChange={(v) => set("type", v)}>
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
              <FieldLabel>Start date</FieldLabel>
              <input
                type="date"
                className={INPUT_CLS}
                value={draft.start_date}
                onChange={(e) => set("start_date", e.target.value)}
              />
            </div>
            {!draft.is_current && (
              <div>
                <FieldLabel>End date</FieldLabel>
                <input
                  type="date"
                  className={INPUT_CLS}
                  value={draft.end_date}
                  onChange={(e) => set("end_date", e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-[13px] text-rd-text-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={draft.is_current}
                onChange={(e) => set("is_current", e.target.checked)}
                className="w-[15px] h-[15px] accent-rd-coral cursor-pointer"
              />
              Currently working here
            </label>
            <label className="flex items-center gap-2 text-[13px] text-rd-text-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={draft.managed_people}
                onChange={(e) => set("managed_people", e.target.checked)}
                className="w-[15px] h-[15px] accent-rd-coral cursor-pointer"
              />
              Managed people
            </label>
            <label className="flex items-center gap-2 text-[13px] text-rd-text-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={draft.cross_functional}
                onChange={(e) => set("cross_functional", e.target.checked)}
                className="w-[15px] h-[15px] accent-rd-coral cursor-pointer"
              />
              Cross-functional
            </label>
          </div>

          <div>
            <FieldLabel>Responsibilities &amp; achievements</FieldLabel>
            <Textarea
              value={draft.responsibilities}
              onChange={(e) => set("responsibilities", e.target.value)}
              rows={4}
              placeholder="Describe what you did and any measurable outcomes..."
              className="border-rd-border bg-rd-bg-card text-rd-text text-[13.5px] focus-visible:ring-rd-coral"
            />
          </div>

          <RdSkillTagInput
            label="Skills & tools"
            description="Skills you applied + software / platforms you used in this role — feeds CV bullet generation and skill-graph matching."
            tags={draft.skills || []}
            onChange={(v) => set("skills", v)}
            placeholder="e.g. customer success, project management, Salesforce, Python"
            suggestionType="library_skills"
          />

          <div className="flex gap-2 pt-1">
            <RdButton onClick={saveEntry} disabled={!draft.title || !draft.company}>
              Save entry
            </RdButton>
            <button
              onClick={() => { setDraft(null); setEditing(null); }}
              className="text-[13px] font-semibold text-rd-text-tertiary hover:text-rd-text px-4 py-2.5 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={startAdd}
          className="w-full flex items-center justify-center gap-2 py-3.5 border border-dashed border-rd-border-hover rounded-[14px] text-[13px] text-rd-text-secondary hover:border-rd-coral hover:text-rd-coral hover:bg-rd-coral-tint transition-colors bg-rd-bg-card"
        >
          <Plus className="w-4 h-4" />
          Add experience entry
        </button>
      )}

      <div className="flex justify-between items-center pt-2">
        <button
          onClick={onBack}
          className="text-[13px] font-semibold text-rd-text-tertiary hover:text-rd-text transition-colors"
        >
          ← Back
        </button>
        <RdButton onClick={onNext}>
          Continue <ArrowRight className="w-4 h-4" />
        </RdButton>
      </div>
    </div>
  );
}
