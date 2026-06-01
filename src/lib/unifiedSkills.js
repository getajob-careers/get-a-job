// Dual-write helper for the unified entity + skills model (P1.2).
//
// Every write to experiences / education / projects / certifications goes
// through `withUnifiedSkills(payload, entity)` to compute the new
// `skills` column from the legacy columns. Reads still hit the legacy
// columns until P1.3 — this phase is purely additive on writes.
//
// Drop this helper + the legacy column references in P1.4 cleanup.

const LEGACY_SOURCES = {
  experience:    ["skills_used", "tools_used"],
  education:     ["skills_developed"],
  project:       ["skills_demonstrated"],
  certification: [],
};

/**
 * Returns a copy of `payload` with a `skills` field computed from the
 * entity's legacy skill columns. Empty/null entries are dropped, output
 * is deduped + sorted (matches the P1.1 backfill ordering).
 *
 * @param {object} payload - the row payload about to be written
 * @param {"experience"|"education"|"project"|"certification"} entity
 * @returns {object} payload + skills
 */
export function withUnifiedSkills(payload, entity) {
  const sources = LEGACY_SOURCES[entity];
  if (!sources) return payload;
  const merged = [];
  for (const col of sources) {
    const v = payload[col];
    if (Array.isArray(v)) merged.push(...v);
  }
  const skills = [...new Set(merged.map((s) => String(s ?? "").trim()).filter(Boolean))].sort();
  return { ...payload, skills };
}
