import {
  normalizeEducationLevel,
  parseEducationDateRange,
} from "@/lib/educationPolicy";
import { inferExperienceType } from "@/lib/onboardingPayload";

// Pure mapping from the raw resume-extractor JSON to the onboarding state shape
// (profile scalar patch + the four entity arrays). Mirrors V1's inline
// handleResumeExtracted (Onboarding.jsx) exactly — extracted here so the V2
// review screen seeds from the SAME transform rather than a divergent copy.
// (V1 adopting this helper is a follow-up dedup; keeping the transform in one
// place is the point.) Pure + deterministic — no setState, no I/O.
//
// profilePatch uses `value || default`, so a re-extract (retry) overwrites with
// the new CV. Callers merge it over prior state; for the first populate prior is
// empty so nothing is clobbered.
export function mapExtractedToOnboardingState(extracted) {
  const ex = extracted || {};
  const edu = ex.education?.[0] || {};
  const normalizedLevel = normalizeEducationLevel(ex.education_level);
  const eduDates = parseEducationDateRange(ex.education_dates);

  const profilePatch = {
    full_name: ex.full_name || "",
    phone_number: ex.phone_number || "",
    location: ex.location || "",
    linkedin_url: ex.linkedin_url || "",
    summary: ex.summary || "",
    languages: ex.languages || [],
    skills: ex.skills || [],
    volunteering: ex.volunteering || [],
    proof_signals: ex.proof_signals?.length ? ex.proof_signals : [],
    primary_domain: ex.primary_domain || null,
    adjacent_fields: ex.adjacent_fields?.length ? ex.adjacent_fields : [],
  };

  const primaryEdu = {
    id: undefined,
    institution: ex.institution || edu.institution || "",
    education_level: normalizedLevel || "",
    degree_type: ex.degree || edu.degree || "",
    field_of_study: ex.field_of_study || edu.field_of_study || "",
    start_date: eduDates.start,
    end_date: eduDates.end,
    is_current: eduDates.is_current,
    gpa: ex.gpa || edu.gpa || "",
    honors: ex.honors || edu.honors || [],
    relevant_coursework: [],
    academic_projects: ex.academic_projects || [],
    location: "",
    display_order: 0,
  };
  const educations = [primaryEdu];

  // Secondary education (high school) — silently created if the extractor
  // returned one; not surfaced in the single-entry review, rides along for
  // persistence parity with V1.
  if (ex.secondary_education && typeof ex.secondary_education === "object") {
    const sec = ex.secondary_education;
    const secDates = parseEducationDateRange(sec.dates);
    educations.push({
      id: undefined,
      institution: sec.institution || "",
      education_level: "high_school",
      degree_type: "",
      field_of_study: "",
      start_date: secDates.start,
      end_date: secDates.end,
      is_current: false,
      gpa: "",
      honors: Array.isArray(sec.highlights) ? sec.highlights : [],
      relevant_coursework: [],
      academic_projects: [],
      location: sec.location || "",
      display_order: 1,
    });
  }

  const rawExps = ex.experiences || ex.experience || [];
  const experiences = rawExps.map((e) => ({
    title: e.title || "",
    company: e.company || "",
    type: inferExperienceType(e),
    start_date: e.start_date || "",
    end_date: e.end_date || "",
    is_current: e.is_current || false,
    responsibilities: Array.isArray(e.responsibilities)
      ? e.responsibilities.join("\n")
      : e.responsibilities || "",
    skills: e.skills || [],
  }));

  const projects = Array.isArray(ex.projects) ? ex.projects : [];
  const certifications = Array.isArray(ex.certifications)
    ? ex.certifications
    : [];

  return { profilePatch, educations, experiences, projects, certifications };
}
