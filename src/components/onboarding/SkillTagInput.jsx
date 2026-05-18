import React, { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";

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
  "On-Site",
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

// Curated honors / awards a Reichman business student is likely to list —
// Israeli academic + military scholarships, US-typical Latin honors, and
// society memberships seen on dual-background CVs. Order: most-common first.
const HONORS_SUGGESTIONS = [
  // Israeli academic + government
  "Dean's List", "Honors Program", "President's Honors", "Academic Excellence Award",
  "Merit Scholarship", "Israel Government Scholarship", "Heseg Foundation Scholarship",
  "Reichman Excellence Scholarship", "Adler Scholarship", "Hila Excellence Program",
  "Argov Fellows Program", "Honors Thesis", "Distinction in Field",
  // Military
  "IDF Excellence Award", "Lone Soldier Scholarship",
  // Fellowships
  "Birthright Excel Fellow", "Hillel Scholar",
  // US-style Latin honors + societies
  "Summa Cum Laude", "Magna Cum Laude", "Cum Laude", "First Class Honors", "High Distinction",
  "Phi Beta Kappa", "Beta Gamma Sigma", "Tau Beta Pi",
  // Class-rank distinctions
  "Valedictorian", "Salutatorian", "Outstanding Student Award",
];

const SKILL_SUGGESTIONS = [
  // Business & Management
  "Account Management", "Accounting", "Business Analysis", "Business Development", "Business Strategy",
  "Change Management", "Client Relations", "Consulting", "Contract Negotiation", "Corporate Strategy",
  "Customer Success", "Entrepreneurship", "Financial Analysis", "Financial Modeling", "Financial Planning",
  "Forecasting", "Fundraising", "Investment Analysis", "Lean Management", "Market Analysis",
  "Market Research", "Mergers & Acquisitions", "Operations Management", "Partnership Development",
  "Process Improvement", "Product Management", "Product Strategy", "Program Management", "Project Management",
  "Risk Management", "Sales Strategy", "Strategic Planning", "Supply Chain Management", "Vendor Management",
  
  // Marketing & Sales
  "B2B Marketing", "B2C Marketing", "Brand Management", "Brand Strategy", "Campaign Management",
  "Content Marketing", "Content Strategy", "Conversion Optimization", "Copywriting", "Customer Acquisition",
  "Digital Marketing", "Email Marketing", "Event Planning", "Go-to-Market Strategy", "Growth Marketing",
  "Influencer Marketing", "Lead Generation", "Marketing Analytics", "Marketing Automation", "Marketing Strategy",
  "Performance Marketing", "Product Marketing", "Public Relations", "Sales", "Sales Operations",
  "SEO", "SEM", "Social Media Marketing", "Video Marketing",
  
  // Technical Skills
  "API Development", "API Integration", "Algorithms", "Android Development", "Artificial Intelligence",
  "Automation", "Backend Development", "Blockchain", "C++", "C#", "Cloud Architecture", "Cloud Computing",
  "Computer Vision", "Cryptography", "Cybersecurity", "Data Engineering", "Data Mining", "Data Modeling",
  "Data Science", "Database Design", "Deep Learning", "DevOps", "Distributed Systems", "Docker",
  "Embedded Systems", "ETL", "Frontend Development", "Full Stack Development", "Go", "iOS Development",
  "Java", "JavaScript", "Kotlin", "Kubernetes", "Machine Learning", "Microservices", "Mobile Development",
  "Natural Language Processing", "Network Security", "Node.js", "Python", "React", "React Native",
  "Ruby", "Rust", "Scala", "Software Architecture", "Software Engineering", "SQL", "Swift",
  "System Design", "TypeScript", "UI Development", "Version Control", "Web Development",
  
  // Data & Analytics
  "A/B Testing", "Big Data", "Business Intelligence", "Cohort Analysis", "Data Analysis", "Data Visualization",
  "Econometrics", "Excel", "Experimental Design", "Google Analytics", "Predictive Modeling", "Quantitative Analysis",
  "R", "Regression Analysis", "Statistical Analysis", "Statistical Modeling", "Tableau", "Time Series Analysis",
  
  // Tools & Software
  "Adobe Creative Suite", "Adobe Photoshop", "Adobe Illustrator", "Airtable", "Asana", "AutoCAD", "AWS",
  "Azure", "Canva", "ClickUp", "Confluence", "CRM Software", "Figma", "GitHub", "Google Cloud Platform",
  "Google Sheets", "HubSpot", "Jira", "Looker", "Monday.com", "Notion", "Power BI", "PowerPoint",
  "Salesforce", "SAP", "Shopify", "Sketch", "Slack", "Snowflake", "Stripe", "Trello", "WordPress", "Zapier",
  
  // Design & Creative
  "3D Modeling", "Animation", "Brand Design", "Graphic Design", "Illustration", "Interaction Design",
  "Motion Graphics", "Prototyping", "UI Design", "UX Design", "UX Research", "User Research",
  "Video Editing", "Visual Design", "Web Design", "Wireframing",
  
  // Communication & Soft Skills
  "Coaching", "Collaboration", "Conflict Resolution", "Cross-functional Collaboration", "Decision Making",
  "Facilitation", "Interpersonal Skills", "Leadership", "Mentoring", "Negotiation", "Networking",
  "Organizational Skills", "Presentation Skills", "Problem Solving", "Public Speaking", "Relationship Building",
  "Stakeholder Management", "Team Building", "Team Leadership", "Team Management", "Technical Writing",
  "Time Management", "Training", "Written Communication",
  
  // Domain-Specific
  "Agile Methodology", "Bookkeeping", "Clinical Research", "Compliance", "Contract Law", "Copyright Law",
  "Corporate Law", "Critical Thinking", "Customer Service", "Data Privacy", "Financial Reporting", "GDPR",
  "Healthcare Administration", "HR Management", "Intellectual Property", "Legal Research", "Payroll",
  "Policy Development", "Quality Assurance", "Recruitment", "Regulatory Compliance", "Research",
  "Root Cause Analysis", "Scrum", "Six Sigma", "Tax Preparation", "Teaching", "Technical Support",
  "Test Automation", "UX Writing", "User Acceptance Testing",
];

export default function SkillTagInput({ label, description, tags, onChange, placeholder, suggestionType = "skills" }) {
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
        : SKILL_SUGGESTIONS;

      const filtered = sourceList.filter(
        (skill) =>
          skill.toLowerCase().includes(input.toLowerCase()) &&
          !tags.includes(skill)
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
    if (val && !tags.includes(val)) {
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

  return (
    <div ref={wrapperRef} className="relative">
      {label && (
        <label className="block text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium mb-1">
          {label}
        </label>
      )}
      {description && <p className="text-xs text-[#A3A3A3] mb-2">{description}</p>}
      <div className="flex gap-2 mb-2">
        <div className="relative flex-1">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (input.trim() && suggestions.length > 0) {
                setShowSuggestions(true);
              }
            }}
            placeholder={placeholder || "Type and press Enter"}
            className="text-sm"
          />
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-[#E5E5E5] rounded-lg shadow-lg max-h-64 overflow-y-auto">
              {suggestions.map((skill, index) => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => add(skill)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                    index === selectedIndex
                      ? "bg-[#F5F5F5] text-[#0A0A0A]"
                      : "text-[#525252] hover:bg-[#FAFAFA]"
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
          className="px-3 py-2 text-xs font-medium border border-[#E5E5E5] rounded-lg hover:bg-[#F5F5F5] transition-colors whitespace-nowrap"
        >
          Add
        </button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 text-xs bg-[#F5F5F5] text-[#525252] px-2.5 py-1 rounded-md border border-[#E5E5E5]"
            >
              {tag}
              <button onClick={() => remove(tag)} className="hover:text-red-500 transition-colors">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}