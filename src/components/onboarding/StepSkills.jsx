import React, { useState } from "react";
import { Check, X, Wrench, Briefcase, Code, BarChart2, MessageSquare, Users, ArrowRight } from "lucide-react";

// Curated chip bank — 6 visual sections × 12 skills. Categories are PURELY
// VISUAL — every selected chip lands in a single flat profileData.skills
// array (no category arrays in state or DB).
const SKILL_BANK = [
  { key: "tools",        label: "Tools & software",         icon: Wrench,        chips: ["Excel","Google Sheets","PowerPoint","Notion","Salesforce","HubSpot","Slack","Zendesk","Figma","Jira","Asana","Airtable","Looker Studio","Mixpanel","Amplitude","Loom","Linear","Webflow"] },
  { key: "domain",       label: "Domain knowledge",         icon: Briefcase,     chips: ["Customer Success","Project Management","Product Management","Account Management","Marketing Strategy","Sales Operations","Financial Modeling","Market Research","UX Research","HR Operations","Supply Chain","Contract Negotiation","Operations","Compliance","Vendor Management","Pricing Strategy","Go-to-Market","Partnership Development"] },
  { key: "technical",    label: "Technical & engineering",  icon: Code,          chips: ["Python","JavaScript","TypeScript","SQL","React","Node.js","REST APIs","GraphQL","Git","Docker","AWS","Machine Learning","Java","C++","Ruby","Linux/Bash","Kubernetes","CI/CD"] },
  { key: "analytical",   label: "Analytical & quantitative", icon: BarChart2,    chips: ["Data Analysis","A/B Testing","Forecasting","KPI Reporting","Cohort Analysis","Statistics","Business Intelligence","Tableau","Power BI","Looker","Excel Modeling","Dashboard Design","Regression Analysis","Causal Inference","Time-Series Analysis","Mixed Methods Research","Survey Design","Financial Forecasting"] },
  { key: "communication", label: "Communication",            icon: MessageSquare, chips: ["Presentations","Public Speaking","Technical Writing","Copywriting","Stakeholder Updates","Email Outreach","Storytelling","Documentation","Cross-Cultural Communication","Pitching","Negotiation","Active Listening","Internal Memos","Customer Calls","Workshop Facilitation","Cross-Team Negotiation","Conflict De-escalation","Speech Writing"] },
  { key: "leadership",   label: "Leadership & people",      icon: Users,         chips: ["Mentoring","Coaching","Team Coordination","Stakeholder Management","Hiring","Onboarding Others","Delegation","Conflict Resolution","Performance Reviews","Cross-functional Collaboration","1:1 Management","Vision Setting","Org Design","Strategic Planning","Resource Allocation","Change Management","Talent Development","Career Coaching"] },
];

const matches = (arr, label) => arr.some((s) => s.toLowerCase() === label.toLowerCase());

export default function StepSkills({ data, onChange, onNext, onBack }) {
  const skills = Array.isArray(data.skills) ? data.skills : [];
  const [input, setInput] = useState("");

  const setSkills = (next) => onChange({ ...data, skills: next });

  const toggleSkill = (label) => {
    if (matches(skills, label)) {
      setSkills(skills.filter((s) => s.toLowerCase() !== label.toLowerCase()));
    } else {
      setSkills([...skills, label]);
    }
  };

  const addCustom = () => {
    const v = input.trim();
    if (!v) return;
    if (!matches(skills, v)) setSkills([...skills, v]);
    setInput("");
  };

  const allBankLabels = new Set(SKILL_BANK.flatMap((s) => s.chips.map((c) => c.toLowerCase())));
  const customSkills = skills.filter((s) => !allBankLabels.has(s.toLowerCase()));

  return (
    <div className="space-y-7">
      <div>
        <h1 className="onb-h1">Your skills.</h1>
        <p className="onb-sub">
          Tap any skill to add it. Selected ones stay highlighted. Type below for anything not in the suggestions.
        </p>
        <p className="onb-help">Only add skills you can actually demonstrate in an interview.</p>
      </div>

      {/* Free-text input + selected pills */}
      <div className="onb-card space-y-3">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustom(); } }}
            placeholder="Type a skill not in the suggestions and press Enter"
            className="onb-input"
          />
          <button onClick={addCustom} disabled={!input.trim()} className="onb-btn onb-btn-outline">
            Add
          </button>
        </div>

        {skills.length > 0 && (
          <div>
            <p className="onb-eyebrow mb-2">Selected ({skills.length})</p>
            <div className="flex flex-wrap gap-1.5">
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1 text-xs bg-[#0E1014] text-white px-2.5 py-1 rounded-md"
                >
                  {skill}
                  {customSkills.includes(skill) && (
                    <span className="text-[9px] uppercase tracking-wider text-[#9C9DA1] ml-0.5">custom</span>
                  )}
                  <button onClick={() => toggleSkill(skill)} className="hover:text-[#F87060]" aria-label={`Remove ${skill}`}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Chip bank — six visual sections, gap-6 keeps them distinct rather
          than reading as one wall of chips. */}
      <div className="space-y-6">
        {SKILL_BANK.map((section) => {
          const Icon = section.icon;
          const sectionSelectedCount = section.chips.filter((c) => matches(skills, c)).length;
          return (
            <div key={section.key} className="onb-card">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-lg bg-[#E8E8E5] flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-[#52545A]" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#0E1014]">{section.label}</p>
                  {sectionSelectedCount > 0 && (
                    <p className="text-[11px] text-[#9C9DA1]">{sectionSelectedCount} selected</p>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {section.chips.map((chip) => {
                  const selected = matches(skills, chip);
                  return (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => toggleSkill(chip)}
                      className={
                        selected
                          ? "inline-flex items-center gap-1.5 text-xs bg-[#0E1014] text-white px-3 py-1.5 rounded-full border border-[#0E1014] hover:bg-[#F87060] hover:border-[#F87060] transition-colors"
                          : "inline-flex items-center gap-1.5 text-xs bg-white text-[#52545A] px-3 py-1.5 rounded-full border border-[#DDDDDB] hover:border-[#52545A] hover:text-[#0E1014] transition-colors"
                      }
                    >
                      {selected && <Check className="w-3 h-3" />}
                      {chip}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-between items-center pt-2">
        <button onClick={onBack} className="onb-btn onb-btn-outline">Back</button>
        <div className="flex items-center gap-4">
          <span className="text-xs text-[#9C9DA1]">{skills.length} skill{skills.length !== 1 ? "s" : ""} added</span>
          <button onClick={onNext} className="onb-btn onb-btn-primary onb-btn-lg">
            Continue <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
