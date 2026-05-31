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

// Curated honors / awards suggestions — universal academic distinctions
// + common societies. Earlier versions of this list leaned heavily on
// Israeli academic + military scholarships (Heseg, IDF Excellence,
// Reichman Excellence, Lone Soldier, etc.); those were removed when the
// platform copy was generalized away from a single country/school.
// Users with cohort-specific honors can still type them in as free text;
// this list is purely autocomplete acceleration.
const HONORS_SUGGESTIONS = [
  // Generic academic distinctions
  "Dean's List", "Honors Program", "President's Honors", "Academic Excellence Award",
  "Merit Scholarship", "Honors Thesis", "Distinction in Field",
  // Latin honors + class-rank distinctions
  "Summa Cum Laude", "Magna Cum Laude", "Cum Laude", "First Class Honors", "High Distinction",
  "Valedictorian", "Salutatorian", "Outstanding Student Award",
  // Common honor societies
  "Phi Beta Kappa", "Beta Gamma Sigma", "Tau Beta Pi",
];

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

  // Tailwind arbitrary values (not .onb-* classes) so this component
  // stays portable — used in onboarding (.onb-scoped) AND in
  // EducationTab on the Profile page (no .onb wrapper).
  return (
    <div ref={wrapperRef} className="relative">
      {label && (
        <label className="block text-[13px] font-medium text-[#0E1014] mb-1.5 tracking-[-0.005em]">
          {label}
        </label>
      )}
      {description && <p className="text-xs text-[#9C9DA1] mb-2.5 leading-snug">{description}</p>}
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
            className="w-full px-3.5 py-2.5 rounded-[14px] border border-[#DDDDDB] bg-white text-[#0E1014] text-sm font-[Geist,system-ui,sans-serif] transition-[border-color,box-shadow] duration-150 placeholder:text-[#9C9DA1] focus:outline-none focus:border-[#0E1014] focus:shadow-[0_0_0_3px_rgba(14,16,20,0.08)]"
          />
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-[#DDDDDB] rounded-[14px] shadow-lg max-h-64 overflow-y-auto">
              {suggestions.map((skill, index) => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => add(skill)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full text-left px-3.5 py-2.5 text-sm transition-colors ${
                    index === selectedIndex
                      ? "bg-[#FDE7E3] text-[#0E1014]"
                      : "text-[#52545A] hover:bg-[#F4F4F2]"
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
          className="px-4 py-2.5 text-sm font-semibold rounded-full border border-[#DDDDDB] text-[#0E1014] bg-transparent hover:bg-[#E8E8E5] transition-colors whitespace-nowrap"
        >
          Add
        </button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 text-xs bg-[#0E1014] text-white px-2.5 py-1 rounded-md"
            >
              {tag}
              <button onClick={() => remove(tag)} className="hover:text-[#F87060] transition-colors" aria-label={`Remove ${tag}`}>
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}