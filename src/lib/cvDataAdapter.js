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

// buildMasterCvData is the deterministic master builder. It lives in a shared
// module so the client studio and the Deno engines (generate-tailored-cv master
// mode) build the master from ONE source instead of re-authoring it. See
// supabase/functions/_shared/cv-master.ts.
export { buildMasterCvData } from "@shared/cv-master";
