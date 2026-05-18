import React, { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, X, Wrench, Briefcase, Code, BarChart2, MessageSquare, Users, ChevronDown } from "lucide-react";

// Curated chip bank — 6 visual sections.
//
// Each section has:
//   chips:    full pool of suggestions (~14 each)
//   chipsTop: the first N rendered by default; the rest unlock via
//             "Show more" expander. Keeps the surface scannable while
//             still giving the user a rich pool when they want it.
//
// Selected skills are stored in a single flat `profileData.skills` array
// (Bug 3 fix). The categories here serve two purposes:
//   1. Browsing — users see grouped suggestions while choosing.
//   2. Display grouping — the "Selected" list below groups the user's
//      picked skills by category (lookups via `categoryForSkill()`).
const SHOW_MORE_DEFAULT_VISIBLE = 8;

const SKILL_BANK = [
  {
    key: "tools",
    label: "Tools & Software",
    icon: Wrench,
    color: "text-blue-600",
    bg: "bg-blue-50",
    chips: [
      "Excel", "Google Sheets", "PowerPoint", "Notion",
      "Salesforce", "HubSpot", "Slack", "Zendesk",
      "Figma", "Jira", "Asana", "Airtable",
      "Canva", "Webflow", "Shopify", "Stripe", "Zapier",
    ],
  },
  {
    key: "domain",
    label: "Domain Knowledge",
    icon: Briefcase,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    chips: [
      "Customer Success", "Project Management", "Product Management", "Account Management",
      "Marketing Strategy", "Sales Operations", "Financial Modeling", "Market Research",
      "UX Research", "HR Operations", "Supply Chain", "Contract Negotiation",
      "Growth Marketing", "Brand Strategy",
    ],
  },
  {
    key: "technical",
    label: "Technical & Engineering",
    icon: Code,
    color: "text-violet-600",
    bg: "bg-violet-50",
    chips: [
      "Python", "JavaScript", "TypeScript", "SQL",
      "React", "Node.js", "REST APIs", "GraphQL",
      "Git", "Docker", "AWS", "Machine Learning",
      "Pandas", "NumPy", "Matplotlib", "Jupyter",
    ],
  },
  {
    key: "analytical",
    label: "Analytical & Quantitative",
    icon: BarChart2,
    color: "text-amber-600",
    bg: "bg-amber-50",
    chips: [
      "Data Analysis", "A/B Testing", "Forecasting", "KPI Reporting",
      "Cohort Analysis", "Statistics", "Business Intelligence", "Tableau",
      "Power BI", "Looker", "Excel Modeling", "Dashboard Design",
      "Mixpanel", "Amplitude", "Google Analytics", "SQL Querying",
    ],
  },
  {
    key: "communication",
    label: "Communication",
    icon: MessageSquare,
    color: "text-pink-600",
    bg: "bg-pink-50",
    chips: [
      "Presentations", "Public Speaking", "Technical Writing", "Copywriting",
      "Stakeholder Updates", "Email Outreach", "Storytelling", "Documentation",
      "Cross-Cultural Communication", "Pitching", "Negotiation", "Active Listening",
    ],
  },
  {
    key: "leadership",
    label: "Leadership & People",
    icon: Users,
    color: "text-orange-600",
    bg: "bg-orange-50",
    chips: [
      "Mentoring", "Coaching", "Team Coordination", "Stakeholder Management",
      "Hiring", "Onboarding Others", "Delegation", "Conflict Resolution",
      "Performance Reviews", "Cross-functional Collaboration", "1:1 Management", "Vision Setting",
    ],
  },
];

// Hand-curated alias map. Applied at DISPLAY time only — original strings
// remain in profileData.skills. The categorizer normalizes the input via
// this map to find which bank section a skill belongs to.
//
// Only add entries where the canonical form is unambiguous. Don't fold
// distinct skills together (e.g. "Marketing Analytics" stays separate from
// "Marketing Strategy").
const SKILL_ALIASES = {
  // A/B Testing variants
  "ab testing": "A/B Testing",
  "split testing": "A/B Testing",
  "a/b test": "A/B Testing",
  // HubSpot — drop product suffixes
  "hubspot crm": "HubSpot",
  "hubspot marketing": "HubSpot",
  // Google product names
  "google analytics 4": "Google Analytics",
  "ga4": "Google Analytics",
  "looker studio": "Looker",
  // Common Python lib variants
  "numpy/pandas": "Pandas",
  "matplot lib": "Matplotlib",
  // Spreadsheet variants
  "ms excel": "Excel",
  "microsoft excel": "Excel",
  "google sheet": "Google Sheets",
  "sheets": "Google Sheets",
  // Other common variants
  "tableau desktop": "Tableau",
  "power bi desktop": "Power BI",
  "node": "Node.js",
  "nodejs": "Node.js",
  "rest api": "REST APIs",
  "stat": "Statistics",
};

// Flat lookup: every bank label → its section. Memoized once.
const ALL_BANK_LABELS = new Map();
SKILL_BANK.forEach((section) => {
  section.chips.forEach((chip) => {
    ALL_BANK_LABELS.set(chip.toLowerCase(), section);
  });
});

// Case-insensitive match for selection state — handles "python" vs "Python".
const matches = (arr, label) => arr.some((s) => s.toLowerCase() === label.toLowerCase());

// Given a free-form skill string, look up its bank section (or null for
// custom skills). Applies the alias map first.
function categoryForSkill(skill) {
  const lower = skill.toLowerCase();
  const aliased = SKILL_ALIASES[lower];
  if (aliased) {
    return ALL_BANK_LABELS.get(aliased.toLowerCase()) || null;
  }
  return ALL_BANK_LABELS.get(lower) || null;
}

export default function StepSkills({ data, onChange, onNext, onBack }) {
  const skills = Array.isArray(data.skills) ? data.skills : [];
  const [input, setInput] = useState("");
  // Per-section "show more" expansion. Default: collapsed.
  const [expandedSections, setExpandedSections] = useState({});

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

  const toggleExpand = (key) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Group the user's selected skills by their category. Skills whose
  // category lookup misses fall into "Custom".
  const groupedSelected = useMemo(() => {
    const groups = new Map();
    // Seed with bank order so groups render in a stable sequence
    SKILL_BANK.forEach((s) => groups.set(s.key, { section: s, items: [] }));
    groups.set("custom", { section: { key: "custom", label: "Custom", color: "text-[#525252]", bg: "bg-[#F5F5F5]" }, items: [] });
    skills.forEach((skill) => {
      const section = categoryForSkill(skill);
      const bucket = section ? section.key : "custom";
      groups.get(bucket).items.push(skill);
    });
    // Drop empty groups
    return Array.from(groups.values()).filter((g) => g.items.length > 0);
  }, [skills]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#0A0A0A] tracking-tight">Your Skills</h2>
        <p className="text-sm text-[#525252] mt-1">
          Tap any skill to add it. Selected skills stay highlighted so you can keep browsing.
          Type below for anything not in the suggestions.
        </p>
        <p className="text-xs text-[#A3A3A3] mt-1">
          Only add skills you can actually demonstrate in an interview.
        </p>
      </div>

      {/* Free-text input + selected groups */}
      <div className="bg-white rounded-xl border border-[#E5E5E5] p-5 space-y-4">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustom();
              }
            }}
            placeholder="Type a skill not in the suggestions and press Enter"
            className="text-sm"
          />
          <Button variant="outline" size="sm" onClick={addCustom} disabled={!input.trim()} className="text-xs px-4">
            Add
          </Button>
        </div>

        {skills.length > 0 && (
          <div className="space-y-3">
            <p className="text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium">
              Selected ({skills.length})
            </p>
            {groupedSelected.map(({ section, items }) => (
              <div key={section.key}>
                <p className={`text-[10px] uppercase tracking-wider font-semibold mb-1.5 ${section.color}`}>
                  {section.label} ({items.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {items.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1 text-xs bg-[#0A0A0A] text-white px-2.5 py-1 rounded-md"
                    >
                      {skill}
                      <button onClick={() => toggleSkill(skill)} className="hover:text-red-300" aria-label={`Remove ${skill}`}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chip bank — six visual sections with show-more expander */}
      <div className="space-y-4">
        {SKILL_BANK.map((section) => {
          const Icon = section.icon;
          const sectionSelectedCount = section.chips.filter((c) => matches(skills, c)).length;
          const isExpanded = expandedSections[section.key];
          const visibleChips = isExpanded ? section.chips : section.chips.slice(0, SHOW_MORE_DEFAULT_VISIBLE);
          const hasMore = section.chips.length > SHOW_MORE_DEFAULT_VISIBLE;
          return (
            <div key={section.key} className="bg-white rounded-xl border border-[#E5E5E5] p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-8 h-8 rounded-lg ${section.bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-4 h-4 ${section.color}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#0A0A0A]">{section.label}</p>
                  {sectionSelectedCount > 0 && (
                    <p className="text-[11px] text-[#A3A3A3]">{sectionSelectedCount} selected</p>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {visibleChips.map((chip) => {
                  const selected = matches(skills, chip);
                  return (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => toggleSkill(chip)}
                      className={
                        selected
                          ? "inline-flex items-center gap-1 text-xs bg-[#0A0A0A] text-white px-2.5 py-1 rounded-md border border-[#0A0A0A] hover:bg-[#262626] transition-colors"
                          : "inline-flex items-center gap-1 text-xs bg-white text-[#525252] px-2.5 py-1 rounded-md border border-[#D4D4D4] hover:border-[#A3A3A3] hover:bg-[#FAFAFA] transition-colors"
                      }
                    >
                      {selected && <Check className="w-3 h-3" />}
                      {chip}
                    </button>
                  );
                })}
              </div>
              {hasMore && (
                <button
                  type="button"
                  onClick={() => toggleExpand(section.key)}
                  className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-medium text-[#525252] hover:text-[#0A0A0A]"
                >
                  <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                  {isExpanded ? "Show fewer" : `Show ${section.chips.length - SHOW_MORE_DEFAULT_VISIBLE} more`}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={onBack} className="text-sm">Back</Button>
        <div className="flex items-center gap-4">
          <span className="text-xs text-[#A3A3A3]">{skills.length} skill{skills.length !== 1 ? "s" : ""} added</span>
          <Button onClick={onNext} className="bg-[#0A0A0A] hover:bg-[#262626] text-sm px-6">
            Continue to Career Direction
          </Button>
        </div>
      </div>
    </div>
  );
}
