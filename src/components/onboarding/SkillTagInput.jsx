import React, { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
import skillIdsData from "@/lib/skillIdsGenerated.json";

// 595 canonical library skills with full display names. Generated from
// supabase/functions/_shared/libraries/01_skill_library.ts by
// scripts/regen-skill-ids.mjs. Used by `suggestionType="library_skills"`.
const LIBRARY_SKILL_NAMES = Object.values(skillIdsData.names ?? {}).sort();

const JOB_TITLE_SUGGESTIONS = [
  // Entry-Level & Early Career
  "Junior Analyst", "Associate Consultant", "Marketing Coordinator", "Sales Representative", "Customer Success Associate",
  "Data Analyst", "Business Analyst", "Financial Analyst", "Operations Analyst", "Product Analyst",
  "Software Engineer", "Frontend Developer", "Backend Developer", "Full Stack Developer", "Quality Assurance Engineer",
  "Content Writer", "Social Media Manager", "Digital Marketing Specialist", "SEO Specialist", "Email Marketing Specialist",
  "HR Coordinator", "Recruiter", "Administrative Assistant", "Executive Assistant", "Office Manager",
  "Graphic Designer", "UX Designer", "UI Designer", "Web Designer", "Brand Designer",
  "Account Executive", "Business Development Representative", "Inside Sales Representative",

  // Mid-Level
  "Senior Analyst", "Senior Consultant", "Marketing Manager", "Sales Manager", "Customer Success Manager",
  "Senior Data Analyst", "Senior Business Analyst", "Senior Financial Analyst", "Operations Manager", "Product Manager",
  "Senior Software Engineer", "Senior Developer", "Engineering Manager", "Technical Lead", "DevOps Engineer",
  "Content Marketing Manager", "Social Media Director", "Digital Marketing Manager", "Growth Marketing Manager",
  "HR Manager", "Talent Acquisition Manager", "People Operations Manager", "Training Manager",
  "Senior Designer", "Lead Designer", "Design Manager", "Creative Director",
  "Account Manager", "Business Development Manager", "Regional Sales Manager",
  "Project Manager", "Program Manager", "Scrum Master", "Product Owner",
  "Data Scientist", "Machine Learning Engineer", "Research Scientist", "Quantitative Analyst",

  // Senior & Leadership
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
  "Startup",
  "Large Corporate",
  "NGO / Non-Profit",
  "Public Sector / Government",
  "Scale-Up",
  "Small Business",
  "Mid-Size Company",
  "Enterprise",
  "Agency",
  "Consultancy",
];

const WORK_ARRANGEMENT_SUGGESTIONS = [
  "Remote",
  "Hybrid",
  "On-site",
  "Flexible",
];

const INDUSTRY_SUGGESTIONS = [
  // Technology & Digital
  "Technology", "Software", "SaaS", "E-commerce", "Fintech", "Edtech", "Healthtech", "Cybersecurity",
  "Artificial Intelligence", "Machine Learning", "Data Analytics", "Cloud Computing", "Blockchain",
  "Mobile Apps", "Gaming", "Social Media", "Digital Media", "Adtech", "Martech",

  // Financial Services
  "Banking", "Investment Banking", "Private Equity", "Venture Capital", "Asset Management", "Wealth Management",
  "Insurance", "Financial Services", "Accounting", "Auditing", "Tax", "Corporate Finance",

  // Professional Services
  "Consulting", "Management Consulting", "Strategy Consulting", "Legal Services", "Law",
  "Human Resources", "Recruitment", "Marketing Services", "Advertising", "Public Relations",

  // Healthcare & Life Sciences
  "Healthcare", "Pharmaceuticals", "Biotechnology", "Medical Devices", "Clinical Research",
  "Hospital & Health Care", "Mental Health", "Veterinary", "Wellness", "Fitness",

  // Consumer & Retail
  "Retail", "E-commerce", "Consumer Goods", "Fashion", "Luxury Goods", "Food & Beverage",
  "Hospitality", "Travel & Tourism", "Hotels & Resorts", "Restaurants",

  // Manufacturing & Industrial
  "Manufacturing", "Automotive", "Aerospace", "Defense", "Industrial", "Construction",
  "Engineering", "Supply Chain", "Logistics", "Transportation",

  // Energy & Environment
  "Energy", "Oil & Gas", "Renewable Energy", "Solar Energy", "Wind Energy", "Utilities",
  "Environmental Services", "Sustainability", "CleanTech",

  // Media & Entertainment
  "Media", "Entertainment", "Film & Video", "Music", "Publishing", "Broadcasting",
  "Creative Services", "Animation", "Design",

  // Education & Research
  "Education", "Higher Education", "K-12 Education", "EdTech", "Online Learning",
  "Research", "Academia", "Think Tanks", "Libraries",

  // Government & Non-Profit
  "Government", "Public Sector", "Defense & Space", "Public Policy", "International Affairs",
  "Non-Profit", "NGO", "Social Impact", "Charity", "Foundations",

  // Real Estate & Construction
  "Real Estate", "Commercial Real Estate", "Property Management", "Construction",
  "Architecture", "Urban Planning",

  // Telecommunications
  "Telecommunications", "Internet", "Networking", "Wireless",

  // Agriculture
  "Agriculture", "Farming", "Food Production", "AgriTech",
];

// Intentionally empty: honors must be user-typed (their real, earned awards).
// Suggesting specific named awards as tap-to-add chips is a fabrication vector
// (Dean's List was the motivating case for the CV honors-provenance fix).
const HONORS_SUGGESTIONS = [];

// Phase 0a (Skills Coherence): the prior 240-item curated SKILL_SUGGESTIONS
// list was REMOVED. 94/240 (39%) of its entries didn't resolve to canonical
// skill IDs, and it was the silent default for `suggestionType="skills"` —
// callers that defaulted to it silently minted unmapped skills that
// scoreJobFit / CV-gen / internship-matcher couldn't see.
//
// New default suggestion source is `library_skills` (LIBRARY_SKILL_NAMES)
// — sourced from skillIdsGenerated.json's 595 canonical names. Every
// suggestion is guaranteed to resolve to a skill_id.
//
// If you ever need a hand-curated subset surfaced, add it as a NEW
// suggestionType key (don't bring this list back) AND audit it via the
// canonical resolver: every entry must resolve or it shouldn't be
// suggested.

// PR 3F — restyled on rd-* tokens. Modify-in-place is safe: re-confirmed
// at PR time that the 3 consumers (Profile.jsx + EducationTab.jsx +
// CertificationsSection.jsx) are all in the Profile area. Onboarding
// surfaces use the separate RdSkillTagInput component.
//
// Default is "library_skills" — the canonical-resolving source. The old
// default "skills" pointed at a curated list with 39% unresolvable
// labels; that list and the "skills" default were removed in Phase 0a.
export default function SkillTagInput({ label, description, tags, onChange, placeholder, suggestionType = "library_skills" }) {
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
    // "none" disables autocomplete entirely — used for free-text fields like
    // Relevant Coursework + Academic Projects where curated suggestions would
    // be either too generic or actively misleading (e.g. showing skill names
    // when the user is typing a course title).
    if (suggestionType === "none") {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    if (input.trim().length > 0) {
      const sourceList = suggestionType === "job_titles"
        ? JOB_TITLE_SUGGESTIONS
        : suggestionType === "industries"
        ? INDUSTRY_SUGGESTIONS
        : suggestionType === "work_environment"
        ? WORK_ENVIRONMENT_SUGGESTIONS
        : suggestionType === "work_arrangement"
        ? WORK_ARRANGEMENT_SUGGESTIONS
        : suggestionType === "honors"
        ? HONORS_SUGGESTIONS
        : LIBRARY_SKILL_NAMES;

      // Case-insensitive dedup — matches the matches() helper in StepSkills.
      // Prevents "Python" + "python" from coexisting and means a chip stops
      // appearing in suggestions once it's already in tags regardless of case.
      const lowerTags = new Set(tags.map((t) => String(t).toLowerCase()));
      const lowerInput = input.toLowerCase();
      const filtered = sourceList.filter(
        (skill) =>
          skill.toLowerCase().includes(lowerInput) &&
          !lowerTags.has(skill.toLowerCase())
      ).slice(0, 8);
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
    // Case-insensitive dedup — avoids "Python" + "python" living side by side.
    const lowerTags = new Set(tags.map((t) => String(t).toLowerCase()));
    if (!lowerTags.has(val.toLowerCase())) {
      onChange([...tags, val]);
    }
    setInput("");
    setShowSuggestions(false);
  };

  const remove = (tag) => onChange(tags.filter((t) => t !== tag));

  const handleKeyDown = (e) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % suggestions.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        add(suggestions[selectedIndex]);
      } else if (e.key === "Escape") {
        setShowSuggestions(false);
      }
    } else if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add();
    }
  };

  // Tailwind arbitrary values + rd tokens — used in EducationTab,
  // CertificationsSection, and Profile.jsx. Onboarding surfaces use
  // RdSkillTagInput, a separate component.
  return (
    <div ref={wrapperRef} className="relative">
      {label && (
        <label className="block text-[11px] font-display font-semibold text-rd-text mb-1.5">
          {label}
        </label>
      )}
      {description && (
        <p className="text-[11.5px] text-rd-text-tertiary mb-2.5 leading-snug">
          {description}
        </p>
      )}
      <div className="flex gap-2 mb-2.5">
        <div className="relative flex-1">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (input.trim() && suggestions.length > 0) {
                setShowSuggestions(true);
              }
            }}
            placeholder={placeholder || "Type and press Enter"}
            className="w-full px-3.5 py-2.5 rounded-[10px] border border-rd-border bg-rd-bg-card text-rd-text text-[13.5px] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-rd-text-tertiary focus:border-rd-primary focus:shadow-[0_0_0_3px_var(--rd-primary-tint)]"
          />
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-rd-bg-card border border-rd-border rounded-[12px] shadow-rd max-h-64 overflow-y-auto">
              {suggestions.map((skill, index) => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => add(skill)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full text-left px-3.5 py-2.5 text-[13px] transition-colors ${
                    index === selectedIndex
                      ? "bg-rd-primary-tint text-rd-text"
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
          className="inline-flex items-center justify-center px-4 py-2.5 font-display font-semibold text-[13px] rounded-full border border-rd-border text-rd-text bg-rd-bg-card hover:border-rd-border-hover hover:bg-rd-bg-soft transition-colors whitespace-nowrap"
        >
          Add
        </button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 text-[12px] bg-rd-text text-white px-2.5 py-1 rounded-full"
            >
              {tag}
              <button
                type="button"
                onClick={() => remove(tag)}
                className="hover:text-rd-primary-tint transition-colors"
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
