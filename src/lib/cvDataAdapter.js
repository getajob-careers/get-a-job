// cvDataAdapter.js — maps persisted application_cvs.cv_data <-> the CV Studio's
// editor model.
//
// The persisted shape is what generate-tailored-cv / build-pdf use: dates are
// formatted STRINGS ("Nov 2024 – Present"), bullets are plain strings, skills is
// an object { domain, tools, technical, languages }. The editor model wraps
// bullets/entries with stable ids (for React keys + drag-reorder) and edits
// dates as text.
//
// toCvData spreads the ORIGINAL cv_data first (__source), so any section the
// studio doesn't surface yet — military / volunteering / leadership / honors /
// certifications / projects — survives a save untouched. Only the sections the
// editor owns are overwritten.
//
// v1 simplifications (flagged for later refinement):
//   - dates: edited as free text (matches the stored string; no month/year parse).
//   - skills: the { domain, tools, technical } arrays are flattened into one
//     editable list and written back into skills.domain on save (category
//     grouping is lost on round-trip; skills.languages is preserved via __source).

const uid = () => Math.random().toString(36).slice(2, 9);
const asArray = (v) => (Array.isArray(v) ? v : []);
const str = (v) => (typeof v === "string" ? v : v == null ? "" : String(v));

function bulletsIn(entry) {
  return asArray(entry?.bullets).map((b) => ({ id: uid(), text: str(b) }));
}

export function fromCvData(cvData) {
  const c =
    cvData && typeof cvData === "object" && !Array.isArray(cvData)
      ? cvData
      : {};
  const h = c.header || {};
  return {
    header: {
      name: str(h.name),
      headline: str(h.subtitle),
      email: str(h.email),
      linkedin: str(h.linkedin),
      location: str(h.location),
      phone: str(h.phone),
    },
    summary: str(c.summary || c.about_me),
    experiences: asArray(c.professional_experiences).map((e) => ({
      id: uid(),
      title: str(e?.title),
      company: str(e?.company),
      dates: str(e?.dates),
      bullets: bulletsIn(e),
    })),
    education: asArray(c.education).map((e) => ({
      id: uid(),
      institution: str(e?.institution),
      degree: str(e?.degree),
      dates: str(e?.dates),
      field: str(e?.field),
    })),
    skills: [
      ...asArray(c.skills?.domain),
      ...asArray(c.skills?.tools),
      ...asArray(c.skills?.technical),
    ]
      .map(str)
      .filter(Boolean),
    languages: asArray(c.languages)
      .map((l) =>
        typeof l === "string" ? l : str(l?.name || l?.language || l),
      )
      .filter(Boolean),
    // Untouched original — toCvData reads it to preserve unrendered sections.
    __source: c,
  };
}

export function toCvData(model) {
  const m = model || {};
  const base = m.__source && typeof m.__source === "object" ? m.__source : {};
  const baseSkills =
    base.skills && typeof base.skills === "object" ? base.skills : {};
  return {
    ...base,
    header: {
      ...(base.header || {}),
      name: str(m.header?.name),
      subtitle: str(m.header?.headline),
      email: str(m.header?.email),
      linkedin: str(m.header?.linkedin),
      location: str(m.header?.location),
      phone: str(m.header?.phone),
    },
    summary: str(m.summary),
    about_me: str(m.summary),
    professional_experiences: asArray(m.experiences).map((e) => ({
      title: str(e.title),
      company: str(e.company),
      dates: str(e.dates),
      bullets: asArray(e.bullets)
        .map((b) => str(b?.text).trim())
        .filter(Boolean),
    })),
    education: asArray(m.education).map((e) => ({
      institution: str(e.institution),
      degree: str(e.degree),
      dates: str(e.dates),
      ...(str(e.field) ? { field: str(e.field) } : {}),
    })),
    skills: {
      ...baseSkills,
      domain: asArray(m.skills)
        .map((s) => str(s).trim())
        .filter(Boolean),
      tools: [],
      technical: [],
    },
    languages: asArray(m.languages)
      .map((s) => str(s).trim())
      .filter(Boolean),
  };
}

// ---------------------------------------------------------------------------
// buildMasterCvData — a FAITHFUL, deterministic master cv_data built straight
// from the user's profile + experiences + education (which already hold the
// onboarding CV's parsed content). No LLM, so the content is 1:1 with what the
// user gave us; style is whatever template the studio renders it with. Mirrors
// generate-tailored-cv's field mapping (titles/companies/dates/bullets, the
// military/volunteer/leadership bucket split, education columns) minus the LLM
// authoring pass.

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

function fmtMonthYear(d) {
  const s = str(d).trim();
  if (!s) return "";
  const iso = s.match(/^(\d{4})-(\d{1,2})/);
  if (iso) {
    const mo = parseInt(iso[2], 10);
    return `${MONTHS_SHORT[mo - 1] || ""} ${iso[1]}`.trim();
  }
  const yr = s.match(/^(\d{4})$/);
  if (yr) return yr[1];
  return s; // already human-readable ("Nov 2024") or unknown — keep verbatim
}

function dateRange(start, end, isCurrent) {
  const s = fmtMonthYear(start);
  const e = isCurrent ? "Present" : fmtMonthYear(end);
  if (s && e) return `${s} – ${e}`;
  return s || e || "";
}

// Mirrors generate-tailored-cv's classifyExperience (type tag + keyword fallback).
function bucketOf(exp) {
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
function expBullets(exp) {
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

export function buildMasterCvData(profile, experiences, education, userEmail) {
  const p = profile || {};
  const mapped = asArray(experiences).map((e) => ({
    bucket: bucketOf(e),
    entry: {
      title: str(e?.title),
      company: str(e?.company),
      dates: dateRange(e?.start_date, e?.end_date, e?.is_current),
      bullets: expBullets(e),
    },
  }));
  const inBucket = (name) =>
    mapped.filter((m) => m.bucket === name).map((m) => m.entry);
  const languages = asArray(p.languages)
    .map((l) => (typeof l === "string" ? l : str(l?.language || l?.name)))
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
    professional_experiences: inBucket("professional"),
    military_experiences: inBucket("military"),
    volunteering_experiences: inBucket("volunteering"),
    leadership_experiences: inBucket("leadership"),
    education: asArray(education).map((ed) => ({
      institution: str(ed?.institution),
      degree: str(ed?.degree_type),
      field: str(ed?.field_of_study),
      dates: dateRange(ed?.start_date, ed?.end_date, ed?.is_current),
    })),
    skills: {
      domain: asArray(p.skills).map(str).filter(Boolean),
      tools: [],
      technical: [],
      languages: [],
    },
    languages,
  };
}
