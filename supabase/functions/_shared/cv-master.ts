// cv-master.ts - single source of truth for the DETERMINISTIC master cv_data
// build. Ported from src/lib/cvDataAdapter.js (buildMasterCvData) so the client
// studio AND the Deno engines (generate-tailored-cv master mode) share ONE
// builder, instead of the LLM re-authoring structured fields it can drop.
//
// Pure, framework-free, no imports: works under both Vite (client, via the
// @shared alias) and Deno (engine, via a relative ../_shared import).
//
// Scope: experience and education are sourced faithfully from the structured
// profile / experiences / education rows. Education always carries
// field_of_study. Skills stay as a flat domain list (the source profile.skills
// is a single uncategorized array); bucketing into technical/tools is out of
// scope because there is no categorized source to preserve.

// deno-lint-ignore-file no-explicit-any

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const str = (v: any): string =>
  typeof v === "string" ? v : v == null ? "" : String(v);
const asArray = (v: any): any[] => (Array.isArray(v) ? v : []);

const MASTER_ORG_KEY: Record<string, string> = {
  professional: "company",
  military: "unit",
  volunteering: "organization",
  leadership: "organization",
};

function fmtMonthYear(d: any): string {
  const s = str(d).trim();
  if (!s) return "";
  const iso = s.match(/^(\d{4})-(\d{1,2})/);
  if (iso) {
    const mo = parseInt(iso[2], 10);
    return `${MONTHS_SHORT[mo - 1] || ""} ${iso[1]}`.trim();
  }
  const yr = s.match(/^(\d{4})$/);
  if (yr) return yr[1];
  return s; // already human-readable ("Nov 2024") or unknown, keep verbatim
}

function dateRange(start: any, end: any, isCurrent: any): string {
  const s = fmtMonthYear(start);
  const e = isCurrent ? "Present" : fmtMonthYear(end);
  if (s && e) return `${s} – ${e}`;
  return s || e || "";
}

// Bucket an experience row into professional / military / volunteering /
// leadership from its type tag plus keyword fallback.
function bucketOf(exp: any): string {
  const company = str(exp?.company).toLowerCase();
  const title = str(exp?.title).toLowerCase();
  const type = str(exp?.type).toLowerCase();
  const military =
    /\b(idf|israel\s?defense\s?forces|nahal|golani|givati|paratroopers?|sayeret|unit\s?8200|8200|army|navy|air\s?force|brigade|platoon|battalion|regiment|commander|sergeant|corporal|lieutenant|captain|reservist|conscript|military\s?service|military\s?role)\b/;
  const volunteer = /\b(volunteer(ed|ing)?|voluntary|pro\s?bono)\b/;
  const ngo = /\b(ngo|non[-\s]?profit|charity|foundation)\b/;
  const leadership =
    /\b(president of|editor of|captain of|head of student|club president|society president|student council)\b/;
  const looksMilitary =
    military.test(company) || military.test(title) || type === "military";
  if (looksMilitary && volunteer.test(title)) return "volunteering";
  if (looksMilitary) return "military";
  if (
    volunteer.test(title) ||
    volunteer.test(company) ||
    ngo.test(company) ||
    type === "volunteering" ||
    type === "volunteer"
  )
    return "volunteering";
  if (type === "leadership" || leadership.test(title)) return "leadership";
  return "professional";
}

// Prefer the curated bullets; else fall back to the responsibilities text,
// split on the user's own line/bullet breaks (no sentence-level re-splitting,
// to keep wording verbatim).
function expBullets(exp: any): string[] {
  const curated = asArray(exp?.bullets)
    .map(str)
    .map((s) => s.trim())
    .filter(Boolean);
  if (curated.length) return curated;
  const resp = str(exp?.responsibilities);
  if (!resp) return [];
  return resp
    .split(/\r?\n|[•·▪‣]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1);
}

// Build the master cv_data deterministically from the user's structured rows.
// experience_id is stamped from the experiences row id so the per-job reframe
// step (refine-cv) can address bullets for rewording; an experience with no id
// still carries through (refine-cv keeps it verbatim).
export function buildMasterCvData(
  profile: any,
  experiences: any,
  education: any,
  userEmail?: string,
): any {
  const p = profile || {};
  const buckets: Record<string, any[]> = {
    professional: [],
    military: [],
    volunteering: [],
    leadership: [],
  };
  for (const e of asArray(experiences)) {
    const bucket = bucketOf(e);
    buckets[bucket].push({
      title: str(e?.title),
      [MASTER_ORG_KEY[bucket]]: str(e?.company),
      dates: dateRange(e?.start_date, e?.end_date, e?.is_current),
      bullets: expBullets(e),
      ...(e?.id ? { experience_id: str(e.id) } : {}),
    });
  }
  const languages = asArray(p.languages)
    .map((l: any) => (typeof l === "string" ? l : str(l?.language || l?.name)))
    .filter(Boolean);

  return {
    header: {
      name: str(p.full_name),
      subtitle: str(p.headline),
      email: str(p.email || userEmail),
      phone: str(p.phone_number),
      location: str(p.location),
      linkedin: str(p.linkedin_url),
    },
    summary: str(p.summary),
    professional_experiences: buckets.professional,
    military_experiences: buckets.military,
    volunteering_experiences: buckets.volunteering,
    leadership_experiences: buckets.leadership,
    education: asArray(education).map((ed: any) => ({
      institution: str(ed?.institution),
      degree: str(ed?.degree_type),
      field_of_study: str(ed?.field_of_study),
      dates: dateRange(ed?.start_date, ed?.end_date, ed?.is_current),
    })),
    // Canonical skills shape {domain, technical, tools}. Source profile.skills
    // is a flat list, so it all lands in domain (no categorized source to split
    // on). No inner languages key; languages are a separate top-level array.
    skills: {
      domain: asArray(p.skills).map(str).filter(Boolean),
      technical: [],
      tools: [],
    },
    languages,
  };
}
