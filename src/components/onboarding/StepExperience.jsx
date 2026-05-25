import React, { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SkillTagInput from "./SkillTagInput";
import { Plus, Trash2, FileText, ArrowRight } from "lucide-react";

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
  skills_used: [],
  tools_used: [],
};

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
        <h1 className="onb-h1">Your experience.</h1>
        <p className="onb-sub">
          Internships, volunteering, leadership, military, projects — each role is analysed for skills.
        </p>
      </div>

      {experiences.length > 0 && (
        <div className="onb-banner onb-banner-success flex items-center gap-2.5">
          <FileText className="w-4 h-4 flex-shrink-0" />
          <p>
            <span className="font-semibold">{experiences.length} {experiences.length === 1 ? "entry" : "entries"}</span> pre-filled from your CV — review, edit, or add more below.
          </p>
        </div>
      )}

      {experiences.length === 0 && (
        <div className="onb-banner onb-banner-warning flex items-center gap-2.5">
          <FileText className="w-4 h-4 flex-shrink-0" />
          <p>No experience extracted from your CV. Add entries manually below, or go back to upload your CV.</p>
        </div>
      )}

      {/* Existing entries */}
      {experiences.length > 0 && (
        <div className="space-y-2">
          {experiences.map((exp, i) => (
            <div key={i} className="bg-white rounded-[14px] border border-[#DDDDDB] px-4 py-3 flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#0E1014] truncate">{exp.title}</p>
                <p className="text-xs text-[#9C9DA1] truncate">{exp.company} — {exp.type?.replace("_", " ")}</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => startEdit(i)} className="text-xs text-[#52545A] hover:text-[#0E1014] px-2.5 py-1 rounded-md border border-[#DDDDDB] hover:bg-[#E8E8E5]">Edit</button>
                <button onClick={() => deleteEntry(i)} className="text-xs text-[#C84F40] hover:text-[#F87060] px-2 py-1 rounded-md border border-[#FDE7E3] hover:bg-[#FDE7E3]">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form for adding/editing */}
      {draft !== null ? (
        <div className="onb-card space-y-4">
          <h3 className="text-sm font-semibold text-[#0E1014]">
            {editing < experiences.length ? "Edit entry" : "Add experience"}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="onb-label">Job title</label>
              <input className="onb-input" value={draft.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Marketing Intern" />
            </div>
            <div>
              <label className="onb-label">Company / Organization</label>
              <input className="onb-input" value={draft.company} onChange={(e) => set("company", e.target.value)} placeholder="e.g. Goldman Sachs" />
            </div>
            <div>
              <label className="onb-label">Type</label>
              <Select value={draft.type} onValueChange={(v) => set("type", v)}>
                <SelectTrigger className="border-[#DDDDDB]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="internship">Internship</SelectItem>
                  <SelectItem value="full_time">Full-Time</SelectItem>
                  <SelectItem value="part_time">Part-Time</SelectItem>
                  <SelectItem value="freelance">Freelance</SelectItem>
                  <SelectItem value="volunteer">Volunteer</SelectItem>
                  <SelectItem value="leadership">Leadership / Club</SelectItem>
                  <SelectItem value="military">Military service</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="onb-label">Start date</label>
              <input type="date" className="onb-input" value={draft.start_date} onChange={(e) => set("start_date", e.target.value)} />
            </div>
            {!draft.is_current && (
              <div>
                <label className="onb-label">End date</label>
                <input type="date" className="onb-input" value={draft.end_date} onChange={(e) => set("end_date", e.target.value)} />
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-[#52545A] cursor-pointer">
              <input type="checkbox" checked={draft.is_current} onChange={(e) => set("is_current", e.target.checked)} className="rounded accent-[#F87060]" />
              Currently working here
            </label>
            <label className="flex items-center gap-2 text-sm text-[#52545A] cursor-pointer">
              <input type="checkbox" checked={draft.managed_people} onChange={(e) => set("managed_people", e.target.checked)} className="rounded accent-[#F87060]" />
              Managed people
            </label>
            <label className="flex items-center gap-2 text-sm text-[#52545A] cursor-pointer">
              <input type="checkbox" checked={draft.cross_functional} onChange={(e) => set("cross_functional", e.target.checked)} className="rounded accent-[#F87060]" />
              Cross-functional
            </label>
          </div>

          <div>
            <label className="onb-label">Responsibilities & achievements</label>
            <Textarea
              value={draft.responsibilities}
              onChange={(e) => set("responsibilities", e.target.value)}
              rows={4}
              placeholder="Describe what you did and any measurable outcomes..."
              className="border-[#DDDDDB]"
            />
          </div>

          <SkillTagInput
            label="Skills used"
            description="Skills you applied in this role — feeds CV bullet generation and skill-graph matching."
            tags={draft.skills_used || []}
            onChange={(v) => set("skills_used", v)}
            placeholder="e.g. customer success, project management"
            suggestionType="library_skills"
          />
          <SkillTagInput
            label="Tools used"
            description="Software, platforms, or systems you used."
            tags={draft.tools_used || []}
            onChange={(v) => set("tools_used", v)}
            placeholder="e.g. Excel, Python, Salesforce"
            suggestionType="library_skills"
          />

          <div className="flex gap-2 pt-1">
            <button onClick={saveEntry} disabled={!draft.title || !draft.company} className="onb-btn onb-btn-primary">
              Save entry
            </button>
            <button onClick={() => { setDraft(null); setEditing(null); }} className="onb-btn onb-btn-outline">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={startAdd}
          className="w-full flex items-center justify-center gap-2 py-3.5 border border-dashed border-[#DDDDDB] rounded-[14px] text-sm text-[#9C9DA1] hover:border-[#F87060] hover:text-[#F87060] transition-colors bg-white"
        >
          <Plus className="w-4 h-4" />
          Add experience entry
        </button>
      )}

      <div className="flex justify-between pt-2">
        <button onClick={onBack} className="onb-btn onb-btn-outline">Back</button>
        <button onClick={onNext} className="onb-btn onb-btn-primary onb-btn-lg">
          Continue <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
