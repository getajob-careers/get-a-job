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
  const c = cvData && typeof cvData === "object" && !Array.isArray(cvData) ? cvData : {};
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
    ].map(str).filter(Boolean),
    languages: asArray(c.languages)
      .map((l) => (typeof l === "string" ? l : str(l?.name || l?.language || l)))
      .filter(Boolean),
    // Untouched original — toCvData reads it to preserve unrendered sections.
    __source: c,
  };
}

export function toCvData(model) {
  const m = model || {};
  const base = m.__source && typeof m.__source === "object" ? m.__source : {};
  const baseSkills = base.skills && typeof base.skills === "object" ? base.skills : {};
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
      bullets: asArray(e.bullets).map((b) => str(b?.text).trim()).filter(Boolean),
    })),
    education: asArray(m.education).map((e) => ({
      institution: str(e.institution),
      degree: str(e.degree),
      dates: str(e.dates),
      ...(str(e.field) ? { field: str(e.field) } : {}),
    })),
    skills: {
      ...baseSkills,
      domain: asArray(m.skills).map((s) => str(s).trim()).filter(Boolean),
      tools: [],
      technical: [],
    },
    languages: asArray(m.languages).map((s) => str(s).trim()).filter(Boolean),
  };
}
