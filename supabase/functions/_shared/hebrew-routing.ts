// hebrew-routing.ts — pure, dependency-free helpers for the Hebrew-extractor
// language-routing feature (docs/research/hebrew-extractor-language-routing-scoping.md).
//
// Two independent jobs, both fully deterministic (NO LLM, NO network):
//   1. Pre-call routing: decide whether a JD body is Hebrew/mixed enough to send
//      the extraction call to gpt-5.4-mini. Keys on SCRIPT, never on the
//      LLM-emitted `jd_language` (which is only known AFTER extraction, so it
//      cannot route the call — spec §1).
//   2. Post-extraction guardrails on the routed path ONLY (spec §3):
//      (a) drop Hebrew-script skill labels (English-only-labels contract),
//      (b) drop fabricated skills not token-grounded in the JD body (padding kill).
//
// The Hebrew character range matches _shared/cv-translate.ts (cvHasHebrew) so the
// two surfaces agree on what "contains Hebrew" means.

// U+0590–U+05FF (Hebrew block) + U+FB1D–U+FB4F (Hebrew presentation forms).
const HEBREW_CHAR = /[֐-׿יִ-ﭏ]/;
const HEBREW_CHAR_G = /[֐-׿יִ-ﭏ]/g;
const LATIN_CHAR_G = /[A-Za-z]/g;

// Routing threshold: the fraction of "letter" characters (Hebrew + Latin) that
// must be Hebrew for a JD to route to the reasoning model. 0.10 cleanly separates
// a JD with genuine Hebrew content (mixed Israeli JDs run ~30–100% Hebrew among
// letters) from an English JD carrying a stray Hebrew token (a company name is
// typically well under 2% of letters).
export const HEBREW_ROUTING_THRESHOLD = 0.1;

// Ratio of Hebrew letters to (Hebrew + Latin) letters. Ignores digits, spaces,
// and punctuation so a number-heavy English JD isn't diluted toward 0 and a
// Hebrew JD peppered with English tech terms still scores high.
export function hebrewCharRatio(text: string): number {
  if (!text || typeof text !== "string") return 0;
  const hebrew = (text.match(HEBREW_CHAR_G) ?? []).length;
  const latin = (text.match(LATIN_CHAR_G) ?? []).length;
  const denom = hebrew + latin;
  return denom === 0 ? 0 : hebrew / denom;
}

// The router's verdict: true ⇒ route to gpt-5.4-mini (Hebrew/mixed body).
export function isHebrewJd(text: string, threshold = HEBREW_ROUTING_THRESHOLD): boolean {
  return hebrewCharRatio(text) >= threshold;
}

// True when a single string contains any Hebrew-script character.
export function containsHebrew(s: unknown): boolean {
  return typeof s === "string" && HEBREW_CHAR.test(s);
}

// Guardrail (b): English-only skill labels. Drop any label containing Hebrew.
export function dropHebrewLabels(labels: string[]): string[] {
  if (!Array.isArray(labels)) return [];
  return labels.filter((l) => typeof l === "string" && !containsHebrew(l));
}

// The routed-path emitted-skill cap (spec §3a.2): tighter than the 4o-mini
// path's 25 to blunt the reasoning model's padding tendency.
export const EXTRACT_HE_SKILL_CAP = 15;

// Below this many DISTINCT Latin tokens, a JD body is Hebrew-dominant and its
// English skill labels (which are translations) cannot be verified against it —
// so token-grounding is skipped rather than nuking every legitimately-translated
// descriptive clause. On English/mixed bodies (many Latin tokens) it runs.
export const MIN_LATIN_TOKENS_FOR_GROUNDING = 20;

// Glue + generic filler that must not falsely "ground" a fabricated skill (these
// words appear in almost every JD, so a label made only of them is unverifiable).
const GROUNDING_STOPWORDS = new Set([
  "and", "the", "for", "with", "of", "to", "in", "on", "by", "or", "a", "an",
  "skills", "skill", "experience", "ability", "strong", "using", "use", "work",
  "working", "knowledge", "proficiency", "understanding", "management", "team",
]);

// Latin word tokens (len >= 3), lowercased. Keeps tech punctuation (c++, ci/cd,
// node.js) attached so those still ground correctly.
function latinTokens(text: string): string[] {
  if (!text || typeof text !== "string") return [];
  return text.toLowerCase().match(/[a-z][a-z0-9+#.]{2,}/g) ?? [];
}

// Guardrail (a.3): drop fabricated skills. A Latin-script label is kept only if
// at least one of its SIGNIFICANT tokens appears in the JD body; a label with
// zero JD-anchored tokens is the padding signature. Hebrew-script labels pass
// through untouched (dropHebrewLabels owns them). On a Hebrew-dominant body (too
// few Latin tokens to verify English labels against) the whole filter no-ops so
// legitimately-translated clauses survive.
export function tokenGroundedSkills(labels: string[], jdBody: string): string[] {
  if (!Array.isArray(labels)) return [];
  const bodyTokens = new Set(latinTokens(jdBody || ""));
  if (bodyTokens.size < MIN_LATIN_TOKENS_FOR_GROUNDING) return labels;
  return labels.filter((label) => {
    if (typeof label !== "string") return false;
    if (containsHebrew(label)) return true; // owned by dropHebrewLabels
    const toks = latinTokens(label).filter((t) => !GROUNDING_STOPWORDS.has(t));
    if (toks.length === 0) return true; // nothing checkable (numbers/punct only)
    return toks.some((t) => bodyTokens.has(t));
  });
}
