// Surgical single-field undo for the CV editor model (CV RED item-1 fix).
//
// The Studio undo used to restore the ENTIRE pre-edit model to cv_data (an
// unmediated whole-model write), while the source row only had the one edited
// field reverted through the mediation. When the pre-edit snapshot had drifted
// from the current source in some OTHER field (e.g. bullets, which re-seed from
// cv_data on every load), undoing one field (e.g. summary) clobbered cv_data's
// bullets back to the stale snapshot while the source kept the user's edit - the
// stores diverged and the cv_data write was unlogged.
//
// This reverts ONLY the slice that `field` (+ `entityId`) identifies, copying
// its pre-edit value from `prev` onto the CURRENT model. Every other (later)
// edit in `current` is preserved, so undo of one field can no longer clobber an
// unrelated field. It mirrors, in the cv_data cache, exactly what the mediated
// source revert does to the source row - one field, nothing else.
//
// Structural undos (row add / delete / reorder) do not carry a `field` and are
// handled by their own revert path; this helper is only for single-field edits.

const HEADER_KEY = {
  full_name: "name",
  headline: "headline",
  linkedin: "linkedin",
  location: "location",
  phone: "phone",
};
const EXP_KEY = {
  exp_title: "title",
  exp_company: "org",
  exp_bullets: "bullets",
};
const EDU_KEY = {
  edu_institution: "institution",
  edu_degree: "degree",
  edu_field: "field",
};
const CERT_KEY = {
  cert_name: "name",
  cert_issuer: "issuer",
  cert_date: "date",
};
const PROJ_KEY = { project_name: "name", project_url: "url" };
const EXP_SECTIONS = ["experiences", "military", "volunteering", "leadership"];

// Copy one model-key of the entity matched by (srcKey === entityId) from prev to
// current, within a single collection. Other entries + other keys are untouched.
function revertInCollection(
  current,
  prev,
  collection,
  srcKey,
  modelKey,
  entityId,
) {
  const cur = current[collection];
  const prv = prev[collection];
  if (!Array.isArray(cur) || !Array.isArray(prv)) return current;
  const prevEntry = prv.find((e) => e?.__src?.[srcKey] === entityId);
  if (!prevEntry) return current;
  return {
    ...current,
    [collection]: cur.map((e) =>
      e?.__src?.[srcKey] === entityId
        ? { ...e, [modelKey]: prevEntry[modelKey] }
        : e,
    ),
  };
}

export function revertCvDataField(current, prev, field, entityId) {
  if (!current || !prev || !field) return current;

  if (field === "summary") return { ...current, summary: prev.summary };

  if (HEADER_KEY[field]) {
    const k = HEADER_KEY[field];
    return { ...current, header: { ...current.header, [k]: prev.header?.[k] } };
  }

  // The flat skills column is derived from three model buckets; revert all three
  // to the pre-edit slice so the derived value round-trips.
  if (field === "skills")
    return {
      ...current,
      skills: prev.skills,
      skillsTools: prev.skillsTools,
      skillsTechnical: prev.skillsTechnical,
    };

  if (field === "languages") return { ...current, languages: prev.languages };

  // Entity-scoped fields: match by source id across the relevant collection.
  if (EXP_KEY[field]) {
    const modelKey = EXP_KEY[field];
    const prevEntry = EXP_SECTIONS.flatMap((s) => prev[s] || []).find(
      (e) => e?.__src?.experience_id === entityId,
    );
    if (!prevEntry) return current;
    const next = { ...current };
    for (const s of EXP_SECTIONS) {
      if (!Array.isArray(next[s])) continue;
      next[s] = next[s].map((e) =>
        e?.__src?.experience_id === entityId
          ? { ...e, [modelKey]: prevEntry[modelKey] }
          : e,
      );
    }
    return next;
  }
  if (EDU_KEY[field])
    return revertInCollection(
      current,
      prev,
      "education",
      "education_id",
      EDU_KEY[field],
      entityId,
    );
  if (CERT_KEY[field])
    return revertInCollection(
      current,
      prev,
      "certifications",
      "certification_id",
      CERT_KEY[field],
      entityId,
    );
  if (PROJ_KEY[field])
    return revertInCollection(
      current,
      prev,
      "projects",
      "project_id",
      PROJ_KEY[field],
      entityId,
    );

  return current;
}
