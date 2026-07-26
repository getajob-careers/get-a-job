// Humanize an internal snake_case tag / enum value for display, so raw
// identifiers like "software_engineering" or "equivalent_experience" never
// reach the user verbatim. Two treatments, picked by context:
//
//   deslug(value)      underscores / hyphens -> spaces, case preserved. Use when
//                      the value is dropped MID-SENTENCE and should read as prose
//                      ("Your experience centers on software engineering.").
//   humanizeTag(value) deslug + Title Case with an acronym allowlist. Use for a
//                      STANDALONE label (a band value, a chip): "equivalent_
//                      experience" -> "Equivalent Experience", "hr" -> "HR".
//
// Both are null-safe and idempotent on already-clean input ("Product Management"
// stays "Product Management").

const ACRONYMS = new Set([
  "hr",
  "it",
  "qa",
  "ux",
  "ui",
  "ai",
  "ml",
  "b2b",
  "b2c",
  "seo",
  "crm",
  "saas",
]);

export function deslug(value) {
  return String(value ?? "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function humanizeTag(value) {
  return deslug(value)
    .split(" ")
    .filter(Boolean)
    .map((w) =>
      ACRONYMS.has(w.toLowerCase())
        ? w.toUpperCase()
        : w.charAt(0).toUpperCase() + w.slice(1),
    )
    .join(" ");
}
