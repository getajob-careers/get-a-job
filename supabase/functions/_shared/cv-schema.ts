// cv-schema.ts - THE single source of truth for the canonical cv_data shape.
//
// The canonical cv_data shape (produced by buildMasterCvData, consumed by
// generate-tailored-cv / refine-cv / render-cv / build-pdf, and round-tripped by
// the client studio's cvDataAdapter) was previously described independently in
// cv-master.ts (server) and cvDataAdapter.js (client). The two agreed only by
// convention: the four *_experiences bucket keys, each bucket's org key
// (company / unit / organization), the education field_of_study key, and the
// skills {domain, technical, tools} shape all appeared as literals in both
// files. If one side renamed a key the round-trip broke silently.
//
// This module holds those canonical names ONCE. cv-master.ts and cvDataAdapter.js
// both import from here, so the org-key / field-name mapping can no longer drift.
// Pure, framework-free, no imports: works under both Deno (relative import) and
// Vite (client, via the @shared alias), exactly like cv-master.ts.
//
// This is a consolidation only: the values below are byte-identical to the
// literals they replace, so existing CVs build unchanged.

// deno-lint-ignore-file no-explicit-any

// The four experience buckets, in canonical render order. `bucket` is the
// internal tag buildMasterCvData sorts rows into; `cvKey` is the array key on
// cv_data; `orgKey` is the per-entry organization field name for that bucket.
export const EXPERIENCE_BUCKETS = [
  {
    bucket: "professional",
    cvKey: "professional_experiences",
    orgKey: "company",
  },
  { bucket: "military", cvKey: "military_experiences", orgKey: "unit" },
  {
    bucket: "volunteering",
    cvKey: "volunteering_experiences",
    orgKey: "organization",
  },
  {
    bucket: "leadership",
    cvKey: "leadership_experiences",
    orgKey: "organization",
  },
] as const;

export type ExperienceBucket = (typeof EXPERIENCE_BUCKETS)[number]["bucket"];

// bucket -> org key. Derived from EXPERIENCE_BUCKETS so there is exactly one place
// the mapping lives. Equals { professional:"company", military:"unit",
// volunteering:"organization", leadership:"organization" } (unchanged).
export const MASTER_ORG_KEY: Record<string, string> = Object.fromEntries(
  EXPERIENCE_BUCKETS.map((b) => [b.bucket, b.orgKey]),
);

// Canonical skills groups, in render order. skills is always this exact shape.
export const SKILL_GROUPS = ["domain", "technical", "tools"] as const;

// Canonical education field name that carries the specialization.
export const EDUCATION_FIELD_OF_STUDY = "field_of_study";

// ── The canonical cv_data type. Server code annotates against it; the client
// (JS) imports the runtime constants above. Documentation + compile-time guard. ──
export interface CvHeader {
  name: string;
  subtitle: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
}

export interface CvExperienceEntry {
  title: string;
  dates: string;
  bullets: string[];
  experience_id?: string;
  // exactly one org key is present per entry, per the bucket (MASTER_ORG_KEY):
  company?: string;
  unit?: string;
  organization?: string;
}

export interface CvEducationEntry {
  institution: string;
  degree: string;
  field_of_study: string;
  dates: string;
}

export interface CvSkills {
  domain: string[];
  technical: string[];
  tools: string[];
}

export interface CvData {
  header: CvHeader;
  summary: string;
  professional_experiences: CvExperienceEntry[];
  military_experiences: CvExperienceEntry[];
  volunteering_experiences: CvExperienceEntry[];
  leadership_experiences: CvExperienceEntry[];
  education: CvEducationEntry[];
  skills: CvSkills;
  languages: string[];
}
