// Single source of truth for education-level validation + degree-type options.
// Used by the CV-extraction mapping (Onboarding.jsx handleResumeExtracted),
// the in-onboarding StepEducation form, and the Profile page Education tab.
//
// Mirrors the Supabase-side enum-ish convention. Education level on the
// profile is a free-text column but the values we accept from extraction
// or from the dropdown are bounded — `normalizeEducationLevel` collapses
// any LLM-returned variant ("Bachelor's", "BA", "Undergraduate") down to
// one of the canonical strings or to "" when nothing matches.

export const EDUCATION_LEVELS = [
  "high_school",
  "associate",
  "bachelors",
  "masters",
  "phd",
  "bootcamp",
  "self_taught",
];

const EDUCATION_LEVEL_SET = new Set(EDUCATION_LEVELS);

// Variant → canonical map. Lowercase keys. Cover the common LLM outputs +
// abbreviations students actually write. Falls through to "" for unknowns —
// dropping a value is more honest than silently mismapping it.
const EDUCATION_LEVEL_ALIASES = {
  // bachelors
  "bachelor": "bachelors",
  "bachelors": "bachelors",
  "bachelor's": "bachelors",
  "bachelor's degree": "bachelors",
  "bachelor degree": "bachelors",
  "ba": "bachelors",
  "b.a.": "bachelors",
  "b.a": "bachelors",
  "bsc": "bachelors",
  "b.sc.": "bachelors",
  "b.sc": "bachelors",
  "bs": "bachelors",
  "b.s.": "bachelors",
  "llb": "bachelors",
  "ll.b": "bachelors",
  "ll.b.": "bachelors",
  "undergraduate": "bachelors",
  "undergrad": "bachelors",

  // masters
  "master": "masters",
  "masters": "masters",
  "master's": "masters",
  "master's degree": "masters",
  "master degree": "masters",
  "ma": "masters",
  "m.a.": "masters",
  "m.a": "masters",
  "msc": "masters",
  "m.sc.": "masters",
  "m.sc": "masters",
  "ms": "masters",
  "m.s.": "masters",
  "mba": "masters",
  "m.b.a.": "masters",
  "jd": "masters",
  "j.d.": "masters",
  "md": "masters",
  "m.d.": "masters",
  "llm": "masters",
  "ll.m": "masters",
  "ll.m.": "masters",

  // phd
  "phd": "phd",
  "ph.d.": "phd",
  "ph.d": "phd",
  "ph d": "phd",
  "doctorate": "phd",
  "doctoral": "phd",

  // high school
  "high school": "high_school",
  "high_school": "high_school",
  "highschool": "high_school",
  "secondary school": "high_school",
  "secondary education": "high_school",

  // associate
  "associate": "associate",
  "associates": "associate",
  "associate degree": "associate",

  // bootcamp
  "bootcamp": "bootcamp",
  "boot camp": "bootcamp",
  "coding bootcamp": "bootcamp",

  // self-taught
  "self-taught": "self_taught",
  "self taught": "self_taught",
  "self_taught": "self_taught",
  "autodidact": "self_taught",
};

export function normalizeEducationLevel(raw) {
  if (raw == null) return "";
  const s = String(raw).toLowerCase().trim();
  if (!s) return "";
  if (EDUCATION_LEVEL_SET.has(s)) return s;
  if (Object.prototype.hasOwnProperty.call(EDUCATION_LEVEL_ALIASES, s)) {
    return EDUCATION_LEVEL_ALIASES[s];
  }
  return "";
}

// Degree-type dropdown options. `value` is what gets stored on the
// education row's `degree_type` column (after Phase B cutover; currently
// stored in `profiles.degree`). `label` is what the dropdown displays.
// "other" is a sentinel — when selected, the form shows a free-text input
// and writes the user-typed string instead of the literal "other".
export const DEGREE_TYPE_OPTIONS = [
  { value: "B.A.",              label: "B.A. — Bachelor of Arts" },
  { value: "B.Sc.",             label: "B.Sc. — Bachelor of Science" },
  { value: "M.A.",              label: "M.A. — Master of Arts" },
  { value: "M.Sc.",             label: "M.Sc. — Master of Science" },
  { value: "MBA",               label: "MBA — Master of Business Administration" },
  { value: "Ph.D.",             label: "Ph.D." },
  { value: "J.D.",              label: "J.D." },
  { value: "M.D.",              label: "M.D." },
  { value: "LL.B.",             label: "LL.B. — Bachelor of Laws" },
  { value: "Practical Engineer", label: "Practical Engineer" },
  { value: "other",             label: "Other (specify)" },
];

export const DEGREE_TYPE_VALUES = new Set(
  DEGREE_TYPE_OPTIONS.filter((o) => o.value !== "other").map((o) => o.value)
);

// Helper: given a stored degree-type string, return which dropdown option
// should be "selected" — one of the canonical values, or "other" if the
// stored string doesn't match any preset. The form uses this to decide
// whether to show the free-text input.
export function dropdownValueForDegreeType(stored) {
  if (!stored) return "";
  return DEGREE_TYPE_VALUES.has(stored) ? stored : "other";
}
