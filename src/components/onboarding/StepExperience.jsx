import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import SkillTagInput from "./SkillTagInput";
import { Plus, Trash2, FileText } from "lucide-react";

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

  const deleteEntry = (i) => {
    onChange(experiences.filter((_, idx) => idx !== i));
  };

  const startAdd = () => {
    setDraft({ ...EMPTY_EXP });
    setEditing(experiences.length);
  };

  const startEdit = (i) => {
    setDraft({ ...experiences[i] });
    setEditing(i);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#0A0A0A] tracking-tight">Work & Experience</h2>
        <p className="text-sm text-[#525252] mt-1">
          Include internships, volunteer work, leadership, and independent projects. Each role is analyzed for skill clusters.
        </p>
      </div>

      {experiences.length > 0 && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
          <FileText className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <p className="text-sm text-emerald-700">
            <span className="font-semibold">{experiences.length} {experiences.length === 1 ? "entry" : "entries"}</span> pre-filled from your CV — review, edit, or add more below.
          </p>
        </div>
      )}

      {experiences.length === 0 && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <FileText className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-700">
            No experience was extracted from your CV. Add entries manually below, or go back to upload your CV.
          </p>
        </div>
      )}

      {/* Existing entries */}
      {experiences.length > 0 && (
        <div className="space-y-2">
          {experiences.map((exp, i) => (
            <div key={i} className="bg-white rounded-lg border border-[#E5E5E5] px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-[#0A0A0A]">{exp.title}</p>
                <p className="text-xs text-[#A3A3A3]">{exp.company} &mdash; {exp.type?.replace("_", " ")}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => startEdit(i)} className="text-xs text-[#525252] hover:text-[#0A0A0A] px-2 py-1 rounded border border-[#E5E5E5] hover:bg-[#F5F5F5]">Edit</button>
                <button onClick={() => deleteEntry(i)} className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded border border-red-100 hover:bg-red-50">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form for adding/editing */}
      {draft !== null ? (
        <div className="bg-white rounded-xl border border-[#E5E5E5] p-6 space-y-4">
          <h3 className="text-sm font-semibold text-[#0A0A0A]">
            {editing < experiences.length ? "Edit Entry" : "Add Experience"}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium mb-1">Job Title</label>
              <Input value={draft.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Marketing Intern" />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium mb-1">Company / Organization</label>
              <Input value={draft.company} onChange={(e) => set("company", e.target.value)} placeholder="e.g. Goldman Sachs" />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium mb-1">Type</label>
              <Select value={draft.type} onValueChange={(v) => set("type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
              <label className="block text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium mb-1">Start Date</label>
              <Input type="date" value={draft.start_date} onChange={(e) => set("start_date", e.target.value)} />
            </div>
            {!draft.is_current && (
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium mb-1">End Date</label>
                <Input type="date" value={draft.end_date} onChange={(e) => set("end_date", e.target.value)} />
              </div>
            )}
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm text-[#525252] cursor-pointer">
              <input type="checkbox" checked={draft.is_current} onChange={(e) => set("is_current", e.target.checked)} className="rounded" />
              Currently working here
            </label>
            <label className="flex items-center gap-2 text-sm text-[#525252] cursor-pointer">
              <input type="checkbox" checked={draft.managed_people} onChange={(e) => set("managed_people", e.target.checked)} className="rounded" />
              Managed people
            </label>
            <label className="flex items-center gap-2 text-sm text-[#525252] cursor-pointer">
              <input type="checkbox" checked={draft.cross_functional} onChange={(e) => set("cross_functional", e.target.checked)} className="rounded" />
              Cross-functional
            </label>
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium mb-1">Responsibilities & Achievements</label>
            <Textarea value={draft.responsibilities} onChange={(e) => set("responsibilities", e.target.value)} rows={4} placeholder="Describe what you did and any measurable outcomes..." />
          </div>

          <SkillTagInput
            label="Tools Used"
            tags={draft.tools_used || []}
            onChange={(v) => set("tools_used", v)}
            placeholder="e.g. Excel, Python, Salesforce"
          />

          <div className="flex gap-2 pt-1">
            <Button onClick={saveEntry} disabled={!draft.title || !draft.company} className="bg-[#0A0A0A] hover:bg-[#262626] text-sm">
              Save Entry
            </Button>
            <Button variant="outline" onClick={() => { setDraft(null); setEditing(null); }} className="text-sm">
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <button
          onClick={startAdd}
          className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-[#D4D4D4] rounded-xl text-sm text-[#A3A3A3] hover:border-[#A3A3A3] hover:text-[#525252] transition-colors bg-white"
        >
          <Plus className="w-4 h-4" />
          Add Experience Entry
        </button>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} className="text-sm">Back</Button>
        <Button onClick={onNext} className="bg-[#0A0A0A] hover:bg-[#262626] text-sm px-6">
          Continue to Skills
        </Button>
      </div>
    </div>
  );
}