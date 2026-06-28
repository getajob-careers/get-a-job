// cvDataAdapter.js — maps the persisted application_cvs.cv_data <-> the CV
// Studio's editor model.
//
// FAITHFUL SHIM: the persisted shape is the CANONICAL one that
// generate-tailored-cv / refine-cv / render-cv (build-pdf) use — education uses
// `field_of_study`, military uses `unit`, volunteering/leadership use
// `organization`, the four *_experiences buckets, skills is
// { domain, tools, technical, languages }, languages is [{language,proficiency}].
// The adapter renames NOTHING and drops NOTHING in the persisted output. The
// only transforms are:
//   1. id-injection — a synthetic `id` on every experience/education entry and
//      bullet, for React keys + @hello-pangea/dnd; stripped by toCvData.
//   2. bullet wrapping — persisted bullets are plain strings; the editor model
//      wraps them as { id, text }; toCvData unwraps them.
//   3. org unification — each editor experience entry exposes a single `org`
//      field; toCvData writes it back under the bucket's canonical key
//      (company/unit/organization).
// Everything else is preserved verbatim: each editor entry carries `__src` (its
// original canonical entry) and the model carries `__source` (the whole original
// cv_data), so toCvData reconstructs the canonical object by OVERLAYING the
// editor-owned fields onto the preserved originals. This makes
// toCvData(fromCvData(x)) deep-equal x (modulo the injected ids) — see
// src/test/cvDataAdapter.roundtrip.test.js.
//
// v1 boundary (round-trip-preserved, not yet editable in the studio):
//   - skills.tools / skills.technical / skills.languages are preserved verbatim;
//     the studio's single skills line edits skills.domain only.
//   - language proficiency is preserved (matched back by name); the line edits
//     language names only.

const uid = () => Math.random().toString(36).slice(2, 9);
const asArray = (v) => (Array.isArray(v) ? v : []);
const str = (v) => (typeof v === "string" ? v : v == null ? "" : String(v));
const obj = (v) => (v && typeof v === "object" && !Array.isArray(v) ? v : {});

// Persisted experience entry -> editor entry. `orgKey` is the bucket's canonical
// org field (company/unit/organization). `__src` preserves the original entry so
// any per-entry field the editor doesn't surface (employment_type, location, …)
// is reattached on the way out.
function mapExpIn(arr, orgKey) {
  return asArray(arr).map((e) => ({
    id: uid(),
    title: str(e?.title),
    org: str(e?.[orgKey]),
    dates: str(e?.dates),
    bullets: asArray(e?.bullets).map((b) => ({ id: uid(), text: str(b) })),
    __src: obj(e),
  }));
}

// Editor entry -> persisted entry: overlay the editor-owned fields (under the
// canonical org key) onto __src, drop ids, bullets back to strings.
function mapExpOut(arr, orgKey) {
  return asArray(arr).map((e) => ({
    ...obj(e.__src),
    title: str(e.title),
    [orgKey]: str(e.org),
    dates: str(e.dates),
    bullets: asArray(e.bullets)
      .map((b) => str(b?.text).trim())
      .filter(Boolean),
  }));
}

// Rebuild canonical languages [{language,proficiency}] from the editor's flat
// name list, preserving each language's original object (proficiency + any
// extras) by matching on name; a newly-typed language with no source becomes a
// bare name string.
function rebuildLanguages(modelLangs, baseLangs) {
  const base = asArray(baseLangs);
  return asArray(modelLangs).map((name) => {
    const nm = str(name).trim();
    const match = base.find((b) => {
      const bn = typeof b === "string" ? b : str(b?.language || b?.name);
      return str(bn).trim().toLowerCase() === nm.toLowerCase();
    });
    if (match && typeof match === "object") return { ...match };
    if (typeof match === "string") return match;
    return nm;
  });
}

export function fromCvData(cvData) {
  const c = obj(cvData);
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
    experiences: mapExpIn(c.professional_experiences, "company"),
    military: mapExpIn(c.military_experiences, "unit"),
    volunteering: mapExpIn(c.volunteering_experiences, "organization"),
    leadership: mapExpIn(c.leadership_experiences, "organization"),
    education: asArray(c.education).map((e) => ({
      id: uid(),
      institution: str(e?.institution),
      degree: str(e?.degree),
      dates: str(e?.dates),
      field: str(e?.field_of_study),
      __src: obj(e),
    })),
    // Editable line = canonical skills.domain only; tools/technical/languages
    // are preserved verbatim via __source (see v1 boundary).
    skills: asArray(c.skills?.domain).map(str).filter(Boolean),
    // Editable as names; proficiency preserved by name-match in toCvData.
    languages: asArray(c.languages)
      .map((l) => (typeof l === "string" ? l : str(l?.language || l?.name)))
      .filter(Boolean),
    // Untouched original — toCvData overlays onto this to preserve every
    // unsurfaced section + key verbatim.
    __source: c,
  };
}

export function toCvData(model) {
  const m = model || {};
  const base = obj(m.__source);
  const baseSkills = obj(base.skills);
  const out = {
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
    professional_experiences: mapExpOut(m.experiences, "company"),
    military_experiences: mapExpOut(m.military, "unit"),
    volunteering_experiences: mapExpOut(m.volunteering, "organization"),
    leadership_experiences: mapExpOut(m.leadership, "organization"),
    education: asArray(m.education).map((e) => ({
      ...obj(e.__src),
      institution: str(e.institution),
      degree: str(e.degree),
      dates: str(e.dates),
      ...(str(e.field) ? { field_of_study: str(e.field) } : {}),
    })),
    skills: {
      ...baseSkills,
      domain: asArray(m.skills)
        .map((s) => str(s).trim())
        .filter(Boolean),
    },
    languages: rebuildLanguages(m.languages, base.languages),
  };
  // Mirror summary into about_me only if the source carried it — don't introduce
  // a key that wasn't there.
  if ("about_me" in base) out.about_me = str(m.summary);
  return out;
}

// ---------------------------------------------------------------------------
// buildMasterCvData — a FAITHFUL, deterministic master cv_data built straight
// from the user's profile + experiences + education (which already hold the
// onboarding CV's parsed content). No LLM, so the content is 1:1 with what the
// user gave us; style is whatever template the studio renders it with. Emits the
// CANONICAL shape (field_of_study, per-bucket org keys) — same as fromCvData /
// toCvData and generate-tailored-cv.

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

// Canonical org key per bucket — military=unit, volunteering/leadership=organization.
const MASTER_ORG_KEY = {
  professional: "company",
  military: "unit",
  volunteering: "organization",
  leadership: "organization",
};

export function buildMasterCvData(profile, experiences, education, userEmail) {
  const p = profile || {};
  const buckets = {
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
    });
  }
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
    professional_experiences: buckets.professional,
    military_experiences: buckets.military,
    volunteering_experiences: buckets.volunteering,
    leadership_experiences: buckets.leadership,
    education: asArray(education).map((ed) => ({
      institution: str(ed?.institution),
      degree: str(ed?.degree_type),
      field_of_study: str(ed?.field_of_study),
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
