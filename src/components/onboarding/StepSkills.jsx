import React from "react";
import { Check, Wrench, Briefcase, Code, BarChart2, MessageSquare, Users, ArrowRight } from "lucide-react";
import SkillTagInput from "./SkillTagInput";

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

  const setSkills = (next) => onChange({ ...data, skills: next });

  const toggleSkill = (label) => {
    if (matches(skills, label)) {
      setSkills(skills.filter((s) => s.toLowerCase() !== label.toLowerCase()));
    } else {
      setSkills([...skills, label]);
    }
  };

  return (
    <div className="space-y-7">
      <div>
        <h1 className="onb-h1">Your skills.</h1>
        <p className="onb-sub">
          Tap any chip to add it, or search the full skill library below. Selected ones stay highlighted. Free text still works if nothing matches.
        </p>
        <p className="onb-help">Only add skills you can actually demonstrate in an interview.</p>
      </div>

      {/* Library autocomplete + selected pills. SkillTagInput owns the
          tag-chip rendering. */}
      <div className="onb-card">
        <SkillTagInput
          label={skills.length > 0 ? `Selected (${skills.length})` : undefined}
          description="Search 595 standard skills or type your own."
          tags={skills}
          onChange={setSkills}
          suggestionType="library_skills"
          placeholder="Search skills, or type and press Enter to add custom"
        />
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
