import { Wrench, Briefcase, Code, BarChart2, MessageSquare, Users } from "lucide-react";

// 6 visual categories × 18 chips = 108 chips. Curated for the onboarding
// flow. Originally lived inline in StepSkills.jsx; extracted here so
// StepRoleSkills can render the same bank on each role/edu/project
// card. Categories are PURELY VISUAL — every selected chip lands in a
// flat skills array (no category grouping in state or DB).
//
// Each chip's label resolves to canonical IDs via resolveSkill() at
// save time (skillResolver.js). The 27 chips that didn't resolve were
// fixed in PR #126 — every chip here has a guaranteed library target.
export const SKILL_BANK = [
  { key: "tools",         label: "Tools & software",          icon: Wrench,        chips: ["Excel","Google Sheets","PowerPoint","Notion","Salesforce","HubSpot","Slack","Zendesk","Figma","Jira","Asana","Airtable","Looker Studio","Mixpanel","Amplitude","Loom","Linear","Webflow"] },
  { key: "domain",        label: "Domain knowledge",          icon: Briefcase,     chips: ["Customer Success","Project Management","Product Management","Account Management","Marketing Strategy","Sales Operations","Financial Modeling","Market Research","UX Research","HR Operations","Supply Chain","Contract Negotiation","Operations","Compliance","Vendor Management","Pricing Strategy","Go-to-Market","Partnership Development"] },
  { key: "technical",     label: "Technical & engineering",   icon: Code,          chips: ["Python","JavaScript","TypeScript","SQL","React","Node.js","REST APIs","GraphQL","Git","Docker","AWS","Machine Learning","Java","C++","Ruby","Linux/Bash","Kubernetes","CI/CD"] },
  { key: "analytical",    label: "Analytical & quantitative", icon: BarChart2,     chips: ["Data Analysis","A/B Testing","Forecasting","KPI Reporting","Cohort Analysis","Statistics","Business Intelligence","Tableau","Power BI","Looker","Excel Modeling","Dashboard Design","Regression Analysis","Causal Inference","Time-Series Analysis","Mixed Methods Research","Survey Design","Financial Forecasting"] },
  { key: "communication", label: "Communication",             icon: MessageSquare, chips: ["Presentations","Public Speaking","Technical Writing","Copywriting","Stakeholder Updates","Email Outreach","Storytelling","Documentation","Cross-Cultural Communication","Pitching","Negotiation","Active Listening","Internal Memos","Customer Calls","Workshop Facilitation","Cross-Team Negotiation","Conflict De-escalation","Speech Writing"] },
  { key: "leadership",    label: "Leadership & people",       icon: Users,         chips: ["Mentoring","Coaching","Team Coordination","Stakeholder Management","Hiring","Onboarding Others","Delegation","Conflict Resolution","Performance Reviews","Cross-functional Collaboration","1:1 Management","Vision Setting","Org Design","Strategic Planning","Resource Allocation","Change Management","Talent Development","Career Coaching"] },
];

// Case-insensitive membership test — shared between StepSkills and the
// per-card chip bank so toggling behaves identically everywhere.
export const matchesSkill = (arr, label) =>
  Array.isArray(arr) && arr.some((s) => String(s).toLowerCase() === String(label).toLowerCase());
