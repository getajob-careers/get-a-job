// Shared types + normalization helpers for refresh-jobs.ts.
//
// Lives outside supabase/functions/_shared because that directory runs in
// Deno; this code runs in Node via tsx. Once PR 3 cuts the frontend over
// to the local cache, the Deno-side _shared/job-search.ts becomes dead
// code and we can delete it — at which point this can become canonical.

// ───── Types ──────────────────────────────────────────────────────────

export interface CompanyEntry {
  name: string;
  type: "israeli_founded" | "international_il_rd";
  industry: string | null;
  domain: string | null;
  careers_url: string | null;
  ats: string;
  slug: string | null;
  api_url: string | null;
  verified: boolean;
  notes: string | null;
}

export interface CompanyRegistry {
  generated_at: string;
  total_companies: number;
  by_ats: Record<string, number>;
  companies: CompanyEntry[];
}

/** What every ATS fetcher emits, before normalization for the DB row. */
export interface RawJob {
  external_id: string;
  title: string;
  description_html: string | null;   // raw, may be HTML or plain text
  location_raw: string | null;       // exact ATS string
  structured_country: string | null; // ISO code or country name when ATS exposes it
  apply_url: string;
  date_posted: string | null;        // ISO timestamp from ATS
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  is_remote: boolean;
  raw_payload: unknown;              // full ATS object for forensics
}

/** What lands in public.jobs after IL filter + seniority classification. */
export interface NormalizedJob {
  ats_source: string;
  external_id: string;
  company_slug: string;
  company_name: string;
  title: string;
  description: string | null;        // PLAIN TEXT (HTML stripped)
  apply_url: string;
  location_raw: string | null;
  location_city: string | null;
  is_il: boolean;
  is_remote: boolean;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  seniority: string;
  years_experience_min: number | null;
  years_experience_max: number | null;
  industry: string | null;
  date_posted: string | null;
  raw_payload: unknown;
}

// ───── Title normalization + junk filter ─────────────────────────────

// Patterns SF / Workday / Comeet feeds attach to titles that wreck
// trigram tier matching. Strip in this order — earlier strips affect
// later ones (e.g. ID prefix has to go before maternity suffix detection
// on tail-only patterns).
const RX_LOCATION_SUFFIX = /\s*\(\s*[A-Za-z'.\- ]+,\s*(?:Israel|IL)(?:,\s*\d+)?\s*\)\s*$/i;
const RX_JOB_ID_PREFIX   = /^\s*\d{4,6}\s*-\s*/;
const RX_MATERNITY_TAIL  = /\s*[-–—]?\s*\(?\s*(?:temporary,?\s*)?maternity[^)]*\)?\s*$/i;
// Most trailing parentheticals after a real title are noise (city,
// product, "Hybrid, ISR", "early talent" etc.). Strip when conservative:
// only when the leading title still has 2+ words after the strip.
const RX_TRAIL_PAREN_NOISE = /\s*\([^)]{1,60}\)\s*$/;

/**
 * Normalize a job title for matching. Idempotent (safe to call twice).
 * Returns the input unchanged if no rules apply.
 */
export function normalizeJobTitle(input: string | null | undefined): string {
  if (!input) return "";
  let t = input.trim();
  t = t.replace(RX_JOB_ID_PREFIX, "");
  t = t.replace(RX_LOCATION_SUFFIX, "");
  t = t.replace(RX_MATERNITY_TAIL, "");
  // Strip a single trailing parenthetical if doing so leaves a usable
  // multi-word title behind. Don't loop — second-level parens are rare
  // and stripping them aggressively can wipe meaningful qualifiers
  // (e.g. "Product Designer (UX/UI)" — that's worth keeping).
  const stripped = t.replace(RX_TRAIL_PAREN_NOISE, "");
  if (stripped.trim().split(/\s+/).length >= 2 && /^[A-Z]/i.test(stripped)) {
    // Only apply if the stripped paren looks like noise — keep "(UX/UI)"
    // style qualifiers by detecting alphanumeric-only short parens.
    const m = t.match(RX_TRAIL_PAREN_NOISE);
    if (m) {
      const inner = m[0].replace(/[()\s]/g, "");
      // Strip when the paren mentions location, product, hybrid, etc.
      if (/(israel|hybrid|isr|herzliya|tel\s*aviv|haifa|maternity|petach|petah|kfar|sodom|sdom|shoham|early\s*talent)/i.test(inner)
          || /^[A-Z][A-Za-z\s\-]{8,}$/.test(inner)) {
        t = stripped;
      }
    }
  }
  return t.replace(/\s{2,}/g, " ").trim();
}

// Junk titles surface from ATS career pages that include "ghost" listings
// for talent-network / future-opportunities / template entries. They're
// not real jobs — filter them at the source.
const RX_JUNK_TITLE = new RegExp(
  [
    "^\\s*$",
    "^\\[?TEMPLATE\\]?",
    "^\\s*(future\\s+opportunit|general\\s+application|talent\\s+network|career\\s+at\\s+\\w+\\s*$|join\\s+our\\s+team|didn'?t\\s+find|explore\\s+(new\\s+)?opportunit|looking\\s+for\\s+something|the\\s+role\\s+you|would\\s+love\\s+to\\s+join|\\w+\\s+has\\s+amazing\\s+openings|company\\s+page|view\\s+all\\s+jobs)",
    "^Hailo\\s+has\\s+amazing",
    "^WorldQuant\\s+Technology\\s+Talent",
    "^Career\\s+at\\s+\\w+\\s*!?\\s*$",
    "^[\\s.!?-]{0,20}$",
  ].join("|"),
  "i",
);

/** True when the title is a placeholder / non-job entry that should not
 *  be cached. Apply at fetch time. */
export function isJunkTitle(title: string | null | undefined): boolean {
  if (!title) return true;
  const t = title.trim();
  if (t.length < 3) return true;
  return RX_JUNK_TITLE.test(t);
}

// ───── Location classification ────────────────────────────────────────

/**
 * Canonical city map. Lowercase substring keys → canonical display name.
 * Order matters when multiple match: we take the first hit, which is fine
 * because each city only appears once.
 *
 * "tlv" maps to Tel Aviv. "il" / "israel" are checked separately below
 * with word-boundary regex to avoid Illinois / Lille false positives.
 */
const IL_CITY_MAP: Record<string, string> = {
  "tel aviv-yafo": "Tel Aviv",
  "tel-aviv":      "Tel Aviv",
  "tel aviv":      "Tel Aviv",
  "telaviv":       "Tel Aviv",
  "tlv":           "Tel Aviv",
  "herzliya":      "Herzliya",
  "hertzliya":     "Herzliya",
  "ramat gan":     "Ramat Gan",
  "ramat-gan":     "Ramat Gan",
  "bnei brak":     "Bnei Brak",
  "petah tikva":   "Petah Tikva",
  "petach tikva":  "Petah Tikva",
  "petah-tikva":   "Petah Tikva",
  "rishon lezion": "Rishon LeZion",
  "rishon le zion":"Rishon LeZion",
  "rehovot":       "Rehovot",
  "modiin":        "Modi'in",
  "modi'in":       "Modi'in",
  "hod hasharon":  "Hod Hasharon",
  "kfar saba":     "Kfar Saba",
  "ra'anana":      "Ra'anana",
  "raanana":       "Ra'anana",
  "netanya":       "Netanya",
  "ashdod":        "Ashdod",
  "ashkelon":      "Ashkelon",
  "haifa":         "Haifa",
  "jerusalem":     "Jerusalem",
  "be'er sheva":   "Be'er Sheva",
  "beer sheva":    "Be'er Sheva",
  "beersheba":     "Be'er Sheva",
  "nazareth":      "Nazareth",
  "yokneam":       "Yokneam",
  "caesarea":      "Caesarea",
  "krayot":        "Krayot",
  "eilat":         "Eilat",
  "holon":         "Holon",
  "bat yam":       "Bat Yam",
  "lod":           "Lod",
  "ramla":         "Ramla",
};

// Country-level fallback when the city map doesn't match but Israel is
// mentioned. Word-boundary guards prevent matching "Illinois" / "Lille".
const RX_COUNTRY_ISRAEL = /\bisrael\b/i;
const RX_COUNTRY_IL_CODE = /\bIL\b/;       // case-sensitive to avoid "ail", "ill", etc.

export function classifyLocation(
  raw: string | null,
  structuredCountry?: string | null,
): { is_il: boolean; city: string | null } {
  // Trust structured country first (most reliable).
  if (structuredCountry) {
    const sc = structuredCountry.trim();
    if (/^il$/i.test(sc) || /^israel$/i.test(sc)) {
      return { is_il: true, city: extractIlCity(raw) };
    }
  }

  if (!raw) return { is_il: false, city: null };
  const lower = raw.toLowerCase();

  // City substring match — first hit wins
  for (const [needle, canonical] of Object.entries(IL_CITY_MAP)) {
    if (lower.includes(needle)) return { is_il: true, city: canonical };
  }

  // Country-level Israel mention (no specific city found)
  if (RX_COUNTRY_ISRAEL.test(raw) || RX_COUNTRY_IL_CODE.test(raw)) {
    return { is_il: true, city: null };
  }

  return { is_il: false, city: null };
}

function extractIlCity(raw: string | null): string | null {
  if (!raw) return null;
  const lower = raw.toLowerCase();
  for (const [needle, canonical] of Object.entries(IL_CITY_MAP)) {
    if (lower.includes(needle)) return canonical;
  }
  return null;
}

// ───── Seniority detection ────────────────────────────────────────────

export type Seniority = "entry" | "mid" | "senior" | "lead" | "director" | "executive";

/**
 * v1: detect bucket from title alone. Used as the baseline before any
 * description-based parsing overrides it.
 */
export function detectSeniorityFromTitle(title: string): Seniority {
  const t = (title || "").toLowerCase();
  if (/\b(vp\b|chief|cto|ceo|cmo|cpo|cfo|head\s+of)\b/.test(t)) return "executive";
  if (/\b(director|head)\b/.test(t))                            return "director";
  if (/\b(principal|staff|lead|manager\s+of|architect)\b/.test(t)) return "lead";
  if (/\b(senior|sr\.?)\b/.test(t))                             return "senior";
  if (/\b(junior|jr\.?|associate|intern|entry|graduate|trainee|student)\b/.test(t)) return "entry";
  return "mid";
}

/**
 * v2: parse minimum / maximum years of experience from a description.
 * Returns null bounds when no parseable signal exists. Patterns we look
 * for, in priority order (first match wins for each bound):
 *
 *   "5+ years"             → min=5, max=null
 *   "5 or more years"      → min=5, max=null
 *   "minimum 3 years"      → min=3, max=null
 *   "at least 3 years"     → min=3, max=null
 *   "3-5 years"            → min=3, max=5
 *   "3 to 5 years"         → min=3, max=5
 *   "2 years experience"   → min=2, max=2 (treated as a point estimate)
 *
 * Operates only on the first ~3000 chars to avoid catching tail mentions
 * like "5+ years ago I co-founded..." that are biographical, not required.
 */
export function parseYearsOfExperience(
  description: string | null,
): { min: number | null; max: number | null } {
  if (!description) return { min: null, max: null };
  const text = description.slice(0, 3000).toLowerCase();

  // Range first ("3-5 years" / "3 to 5 years") so it doesn't lose to "3+"
  const rangeMatch = text.match(/(\d{1,2})\s*(?:to|-|–|—)\s*(\d{1,2})\s*(?:years?|yrs?)\b/);
  if (rangeMatch) {
    const a = parseInt(rangeMatch[1], 10);
    const b = parseInt(rangeMatch[2], 10);
    if (a <= b && a < 30 && b < 30) return { min: a, max: b };
  }

  // "5+ years" / "5 or more years"
  const plusMatch = text.match(/(\d{1,2})\s*\+?\s*(?:\+|or\s+more)?\s*(?:years?|yrs?)\s*(?:of\s+)?(?:experience|exp)?/);
  const minimumMatch = text.match(/(?:minimum|at\s+least|min\.?)\s+(\d{1,2})\s*(?:years?|yrs?)/);

  let min: number | null = null;
  if (minimumMatch) min = parseInt(minimumMatch[1], 10);
  else if (plusMatch) min = parseInt(plusMatch[1], 10);

  if (min !== null && min >= 0 && min < 30) return { min, max: null };
  return { min: null, max: null };
}

/**
 * Combine title + years signals. Years-based wins when it disagrees with
 * the title-based bucket — it's a more direct signal of required experience.
 */
export function finalSeniority(
  titleBucket: Seniority,
  years: { min: number | null; max: number | null },
): Seniority {
  if (years.min === null) return titleBucket;
  if (years.min <= 2) return "entry";
  if (years.min < 6)  return "mid";
  if (years.min < 9)  return "senior";
  return "lead";
}

// ───── HTML → plain text ──────────────────────────────────────────────

/**
 * Cheap HTML stripper. Pulls out text content, decodes the common entities,
 * collapses whitespace. NOT a sanitizer — we strip everything, not just
 * dangerous tags. Good enough for storing job descriptions in plain-text
 * form. ~50 KB of HTML → ~5-15 KB of plain text typically.
 */
export function stripHtml(input: string | null): string | null {
  if (input == null) return null;
  return input
    // Drop scripts/styles wholesale before tag stripping (their contents
    // are JS/CSS, not human text)
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/(?:script|style)>/gi, " ")
    // Convert <br> and block-level closing tags to newlines for readability
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, "\n")
    // Strip all remaining tags
    .replace(/<[^>]*>/g, " ")
    // Decode the entities that show up in 99% of job HTML
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&hellip;/g, "…")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    // Numeric entities (covers most stragglers)
    .replace(/&#(\d+);/g, (_, n: string) => {
      const code = parseInt(n, 10);
      return code > 0 && code < 0x10000 ? String.fromCharCode(code) : " ";
    })
    // Collapse whitespace runs (but keep paragraph breaks readable)
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
