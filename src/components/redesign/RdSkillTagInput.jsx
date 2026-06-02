import React, { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
import skillIdsData from "@/lib/skillIdsGenerated.json";

// RdSkillTagInput — redesign fork of the canonical SkillTagInput.
//
// Why a fork:
//   - The redesign uses --rd-* tokens (coral focus ring, warm borders,
//     soft tag pills) while existing consumers (Profile, EducationTab,
//     CertificationsSection) keep the Direction-3 ink-on-grey look until
//     their own restyle PRs land. A single component that reads both
//     palettes would couple every future visual decision to old code.
//   - Matches the foundation pattern (RdButton, RdCard) — drop the new
//     primitive in next to the old one, delete the old after every
//     consumer has migrated.
//
// Behaviour parity with SkillTagInput is intentional:
//   - Same canonical-library autocomplete via skillIdsGenerated.json
//   - Same suggestionType modes (library_skills / job_titles / industries
//     / work_environment / work_arrangement / honors / none)
//   - Case-insensitive dedupe, same keyboard handling, same placeholder /
//     description / label slots.
//
// Visual changes vs Direction-3:
//   - input: --rd-border, coral focus ring (--rd-coral + --rd-coral-tint),
//     10px radius (matches Login)
//   - tags: --rd-bg-soft pills with --rd-text text + coral X on hover
//   - suggestions dropdown: --rd-bg-card, --rd-border, coral-tint hover

const LIBRARY_SKILL_NAMES = Object.values(skillIdsData.names ?? {}).sort();

const JOB_TITLE_SUGGESTIONS = [
  "Junior Analyst", "Associate Consultant", "Marketing Coordinator", "Sales Representative", "Customer Success Associate",
  "Data Analyst", "Business Analyst", "Financial Analyst", "Operations Analyst", "Product Analyst",
  "Software Engineer", "Frontend Developer", "Backend Developer", "Full Stack Developer", "Quality Assurance Engineer",
  "Content Writer", "Social Media Manager", "Digital Marketing Specialist", "SEO Specialist", "Email Marketing Specialist",
  "HR Coordinator", "Recruiter", "Administrative Assistant", "Executive Assistant", "Office Manager",
  "Graphic Designer", "UX Designer", "UI Designer", "Web Designer", "Brand Designer",
  "Account Executive", "Business Development Representative", "Inside Sales Representative",
  "Senior Analyst", "Senior Consultant", "Marketing Manager", "Sales Manager", "Customer Success Manager",
  "Senior Data Analyst", "Senior Business Analyst", "Senior Financial Analyst", "Operations Manager", "Product Manager",
  "Senior Software Engineer", "Senior Developer", "Engineering Manager", "Technical Lead", "DevOps Engineer",
  "Content Marketing Manager", "Social Media Director", "Digital Marketing Manager", "Growth Marketing Manager",
  "HR Manager", "Talent Acquisition Manager", "People Operations Manager", "Training Manager",
  "Senior Designer", "Lead Designer", "Design Manager", "Creative Director",
  "Account Manager", "Business Development Manager", "Regional Sales Manager",
  "Project Manager", "Program Manager", "Scrum Master", "Product Owner",
  "Data Scientist", "Machine Learning Engineer", "Research Scientist", "Quantitative Analyst",
  "Director of Marketing", "Director of Sales", "Director of Operations", "Director of Product", "Director of Engineering",
  "VP of Marketing", "VP of Sales", "VP of Product", "VP of Engineering", "VP of Operations",
  "Chief Marketing Officer", "Chief Technology Officer", "Chief Product Officer", "Chief Operating Officer",
  "Head of Growth", "Head of Analytics", "Head of Design", "Head of People", "Head of Strategy",
  "General Manager", "Managing Director", "Country Manager", "Regional Director",
  "Principal Engineer", "Distinguished Engineer", "Staff Engineer", "Architect",
  "Senior Product Manager", "Group Product Manager", "Principal Product Manager",
  "Strategy Consultant", "Management Consultant", "Senior Consultant", "Principal Consultant",
];

const WORK_ENVIRONMENT_SUGGESTIONS = [
  "Startup", "Large Corporate", "NGO / Non-Profit", "Public Sector / Government",
  "Scale-Up", "Small Business", "Mid-Size Company", "Enterprise", "Agency", "Consultancy",
];

const WORK_ARRANGEMENT_SUGGESTIONS = ["Remote", "Hybrid", "On-site", "Flexible"];

const INDUSTRY_SUGGESTIONS = [
  "Technology", "Software", "SaaS", "E-commerce", "Fintech", "Edtech", "Healthtech", "Cybersecurity",
  "Artificial Intelligence", "Machine Learning", "Data Analytics", "Cloud Computing", "Blockchain",
  "Mobile Apps", "Gaming", "Social Media", "Digital Media", "Adtech", "Martech",
  "Banking", "Investment Banking", "Private Equity", "Venture Capital", "Asset Management", "Wealth Management",
  "Insurance", "Financial Services", "Accounting", "Auditing", "Tax", "Corporate Finance",
  "Consulting", "Management Consulting", "Strategy Consulting", "Legal Services", "Law",
  "Human Resources", "Recruitment", "Marketing Services", "Advertising", "Public Relations",
  "Healthcare", "Pharmaceuticals", "Biotechnology", "Medical Devices", "Clinical Research",
  "Hospital & Health Care", "Mental Health", "Veterinary", "Wellness", "Fitness",
  "Retail", "Consumer Goods", "Fashion", "Luxury Goods", "Food & Beverage",
  "Hospitality", "Travel & Tourism", "Hotels & Resorts", "Restaurants",
  "Manufacturing", "Automotive", "Aerospace", "Defense", "Industrial", "Construction",
  "Engineering", "Supply Chain", "Logistics", "Transportation",
  "Energy", "Oil & Gas", "Renewable Energy", "Solar Energy", "Wind Energy", "Utilities",
  "Environmental Services", "Sustainability", "CleanTech",
  "Media", "Entertainment", "Film & Video", "Music", "Publishing", "Broadcasting",
  "Creative Services", "Animation", "Design",
  "Education", "Higher Education", "K-12 Education", "EdTech", "Online Learning",
  "Research", "Academia", "Think Tanks", "Libraries",
  "Government", "Public Sector", "Defense & Space", "Public Policy", "International Affairs",
  "Non-Profit", "NGO", "Social Impact", "Charity", "Foundations",
  "Real Estate", "Commercial Real Estate", "Property Management",
  "Architecture", "Urban Planning",
  "Telecommunications", "Internet", "Networking", "Wireless",
  "Agriculture", "Farming", "Food Production", "AgriTech",
];

const HONORS_SUGGESTIONS = [
  "Dean's List", "Honors Program", "President's Honors", "Academic Excellence Award",
  "Merit Scholarship", "Honors Thesis", "Distinction in Field",
  "Summa Cum Laude", "Magna Cum Laude", "Cum Laude", "First Class Honors", "High Distinction",
  "Valedictorian", "Salutatorian", "Outstanding Student Award",
  "Phi Beta Kappa", "Beta Gamma Sigma", "Tau Beta Pi",
];

export default function RdSkillTagInput({
  label,
  description,
  tags,
  onChange,
  placeholder,
  suggestionType = "library_skills",
}) {
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (suggestionType === "none") {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    if (input.trim().length > 0) {
      const sourceList =
        suggestionType === "job_titles" ? JOB_TITLE_SUGGESTIONS
        : suggestionType === "industries" ? INDUSTRY_SUGGESTIONS
        : suggestionType === "work_environment" ? WORK_ENVIRONMENT_SUGGESTIONS
        : suggestionType === "work_arrangement" ? WORK_ARRANGEMENT_SUGGESTIONS
        : suggestionType === "honors" ? HONORS_SUGGESTIONS
        : LIBRARY_SKILL_NAMES;
      const lowerTags = new Set(tags.map((t) => String(t).toLowerCase()));
      const lowerInput = input.toLowerCase();
      const filtered = sourceList
        .filter((s) => s.toLowerCase().includes(lowerInput) && !lowerTags.has(s.toLowerCase()))
        .slice(0, 8);
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
      setSelectedIndex(0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [input, tags, suggestionType]);

  const add = (skill = input.trim()) => {
    const val = skill.trim();
    if (!val) return;
    const lowerTags = new Set(tags.map((t) => String(t).toLowerCase()));
    if (!lowerTags.has(val.toLowerCase())) onChange([...tags, val]);
    setInput("");
    setShowSuggestions(false);
  };

  const remove = (tag) => onChange(tags.filter((t) => t !== tag));

  const handleKeyDown = (e) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIndex((p) => (p + 1) % suggestions.length); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIndex((p) => (p - 1 + suggestions.length) % suggestions.length); }
      else if (e.key === "Enter") { e.preventDefault(); add(suggestions[selectedIndex]); }
      else if (e.key === "Escape") setShowSuggestions(false);
    } else if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add();
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      {label && (
        <label className="block text-[12px] font-semibold text-rd-text mb-1.5">
          {label}
        </label>
      )}
      {description && (
        <p className="text-[11.5px] text-rd-text-secondary mb-2.5 leading-snug">{description}</p>
      )}
      <div className="flex gap-2 mb-2.5">
        <div className="relative flex-1">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (input.trim() && suggestions.length > 0) setShowSuggestions(true);
            }}
            placeholder={placeholder || "Type and press Enter"}
            className="w-full px-3.5 py-2.5 rounded-[10px] border border-rd-border bg-rd-bg-card text-rd-text text-[13.5px] placeholder:text-rd-text-secondary/70 outline-none transition-[border-color,box-shadow] duration-150 focus:border-rd-coral focus:shadow-[0_0_0_3px_var(--rd-coral-tint)]"
          />
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-rd-bg-card border border-rd-border rounded-[12px] shadow-rd max-h-64 overflow-y-auto">
              {suggestions.map((skill, index) => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => add(skill)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full text-left px-3.5 py-2.5 text-[13.5px] transition-colors ${
                    index === selectedIndex
                      ? "bg-rd-coral-tint text-rd-text"
                      : "text-rd-text-secondary hover:bg-rd-bg-soft"
                  }`}
                >
                  {skill}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => add()}
          className="px-4 py-2.5 text-[13px] font-semibold rounded-full border border-rd-border text-rd-text bg-rd-bg-card hover:bg-rd-bg-soft transition-colors whitespace-nowrap"
        >
          Add
        </button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 text-[12px] bg-rd-bg-soft text-rd-text px-2.5 py-1 rounded-md font-medium"
            >
              {tag}
              <button
                onClick={() => remove(tag)}
                className="text-rd-text-secondary hover:text-rd-coral transition-colors"
                aria-label={`Remove ${tag}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
