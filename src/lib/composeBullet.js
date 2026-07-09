// composeBullet — pure helpers for folding a legacy STAR `stories` row into a
// single STAR-disciplined experience bullet (Phase 1 of the Story Bank →
// experiences migration). Used by the backfill script
// (scripts/backfill-experience-bullets.mjs) and unit-tested in isolation.
//
// The resume-relevant content of a story is action + result + the real
// metric/tool. situation/task were always empty on live data and aren't
// resume material, so they don't contribute. Every real metric MUST survive
// in the composed bullet text verbatim (that's where the anti-fabrication
// guarantee now lives — the bullet text is the source of truth; see the
// Phase 4 CV rewire). tools_used + skills_demonstrated do NOT go into the
// bullet text — they dedupe into experiences.skills via mergeBulletSkills.
//
// Pure: no imports, no runtime APIs. Importable from Node (script + Vitest)
// and safe to keep dependency-free.

function clean(v) {
  return typeof v === "string" ? v.trim().replace(/\s+/g, " ") : "";
}

function toArray(v) {
  return Array.isArray(v)
    ? v.filter((x) => typeof x === "string" && x.trim())
    : [];
}

/**
 * Compose ONE experience bullet from a legacy story row.
 * @param {{action?:string|null, result?:string|null, metrics?:string[], title?:string|null}} story
 * @returns {string|null} the bullet line, or null if there's nothing to say.
 */
export function composeBulletFromStory(story) {
  const action = clean(story?.action);
  const result = clean(story?.result);

  // Core narrative = action + result. (situation/task intentionally excluded.)
  // Fall back to the headline title only when both are empty so a story with
  // just a title still produces SOMETHING reviewable rather than vanishing.
  let core = [action, result].filter(Boolean).join(" - ");
  if (!core) core = clean(story?.title);
  if (!core) return null;

  // Verbatim metric survival: append any metric whose exact text isn't already
  // present (case-insensitive substring) as a trailing clause. Numbers/units
  // stay byte-for-byte — we never reword a metric.
  const lc = core.toLowerCase();
  const missing = toArray(story?.metrics)
    .map((m) => m.trim())
    .filter((m) => m && !lc.includes(m.toLowerCase()));

  let bullet = core;
  if (missing.length) {
    const sep = /[.!?]$/.test(bullet) ? "" : ".";
    bullet = `${bullet}${sep} ${missing.join("; ")}`;
  }
  return clean(bullet) || null;
}

/**
 * Merge a story's skills_demonstrated + tools_used into an experience's
 * existing skills array, case-insensitively deduped (first spelling wins).
 * @param {string[]} existingSkills
 * @param {{skills_demonstrated?:string[], tools_used?:string[]}} story
 * @returns {string[]} the merged, deduped skills array.
 */
export function mergeBulletSkills(existingSkills, story) {
  const out = [];
  const seen = new Set();
  const push = (s) => {
    const t = typeof s === "string" ? s.trim() : "";
    if (!t) return;
    const key = t.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(t);
  };
  for (const s of toArray(existingSkills)) push(s);
  for (const s of toArray(story?.skills_demonstrated)) push(s);
  for (const s of toArray(story?.tools_used)) push(s);
  return out;
}
