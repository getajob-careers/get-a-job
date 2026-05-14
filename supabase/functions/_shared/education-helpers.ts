// Education-table helpers for edge functions. Mirrors the logic in
// src/lib/educationPolicy.js — keep these in sync.
//
// Phase B (2026-05-14) moved education off the profiles flat columns into
// its own table. Edge functions that previously read profile.degree /
// profile.field_of_study / profile.education_level now fetch profiles with
// `.select('*, education(*)')` and use pickPrimaryEducation to pick a
// single row for prompt context.

export type EducationRow = {
  id?: string;
  user_id?: string;
  institution?: string | null;
  education_level?: string | null;
  degree_type?: string | null;
  field_of_study?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  is_current?: boolean | null;
  gpa?: string | null;
  honors?: string[] | null;
  relevant_coursework?: string[] | null;
  academic_projects?: string[] | null;
  location?: string | null;
  display_order?: number | null;
}

const EDUCATION_LEVEL_RANK: Record<string, number> = {
  phd: 6,
  masters: 5,
  bachelors: 4,
  associate: 3,
  bootcamp: 2,
  self_taught: 1,
  high_school: 0,
};

const STUDENT_CHECK_LEVELS = new Set(["bachelors", "masters", "phd"]);

function rankOf(level: string | null | undefined): number {
  if (!level) return -1;
  return EDUCATION_LEVEL_RANK[level] ?? -1;
}

// Pick the "primary" education row for display contexts that take a single
// row. Same algorithm as the frontend helper:
//   1. Prefer is_current=true rows.
//   2. Among same is_current, prefer higher education_level rank.
//   3. Tiebreak by display_order ascending, then id ascending.
export function pickPrimaryEducation(educations: EducationRow[] | null | undefined): EducationRow | null {
  if (!Array.isArray(educations) || educations.length === 0) return null;
  const sorted = [...educations].sort((a, b) => {
    const ac = a.is_current ? 1 : 0;
    const bc = b.is_current ? 1 : 0;
    if (ac !== bc) return bc - ac;
    if (rankOf(a.education_level) !== rankOf(b.education_level)) {
      return rankOf(b.education_level) - rankOf(a.education_level);
    }
    const ao = a.display_order ?? Number.MAX_SAFE_INTEGER;
    const bo = b.display_order ?? Number.MAX_SAFE_INTEGER;
    if (ao !== bo) return ao - bo;
    return String(a.id ?? "").localeCompare(String(b.id ?? ""));
  });
  return sorted[0];
}

// Does the user have at least one in-progress education at undergrad-
// or-above level? Replaces the dead "edu.includes('student')" substring
// check that previously read a single string column on profiles.
export function isCurrentlyStudent(educations: EducationRow[] | null | undefined): boolean {
  if (!Array.isArray(educations)) return false;
  return educations.some(
    (e) => e?.is_current === true && STUDENT_CHECK_LEVELS.has(e?.education_level ?? "")
  );
}

// Convenience formatter used by several edge functions' LLM prompts.
// Returns "B.A. in Business Administration at Reichman University (bachelors)"
// — falls back gracefully when fields are missing.
export function formatEducationLine(row: EducationRow | null): string {
  if (!row) return "Not provided";
  const parts: string[] = [];
  if (row.degree_type) parts.push(row.degree_type);
  if (row.field_of_study) parts.push(`in ${row.field_of_study}`);
  if (row.institution) parts.push(`at ${row.institution}`);
  if (row.education_level) parts.push(`(${row.education_level})`);
  return parts.length > 0 ? parts.join(" ") : "Not provided";
}
