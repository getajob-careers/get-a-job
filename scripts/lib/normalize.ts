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
  // Staffing/recruiting agency: postings are client placements/reposts, not
  // its own headcount. Propagated to public.jobs.is_agency at ingest so the UI
  // can mark them and evals can exclude them. Optional; absent === false.
  is_agency?: boolean;
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
  description_html: string | null; // raw, may be HTML or plain text
  location_raw: string | null; // exact ATS string
  structured_country: string | null; // ISO code or country name when ATS exposes it
  apply_url: string;
  date_posted: string | null; // ISO timestamp from ATS
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  is_remote: boolean;
  raw_payload: unknown; // full ATS object for forensics
}

/** What lands in public.jobs after IL filter + seniority classification. */
export interface NormalizedJob {
  ats_source: string;
  external_id: string;
  company_slug: string;
  company_name: string;
  title: string;
  description: string | null; // PLAIN TEXT (HTML stripped)
  apply_url: string;
  location_raw: string | null;
  location_city: string | null;
  is_il: boolean;
  is_remote: boolean;
  is_agency: boolean; // from the company row; see CompanyEntry.is_agency
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
// trigram track matching. Strip in this order — earlier strips affect
// later ones (e.g. ID prefix has to go before maternity suffix detection
// on tail-only patterns).
const RX_LOCATION_SUFFIX =
  /\s*\(\s*[A-Za-z'.\- ]+,\s*(?:Israel|IL)(?:,\s*\d+)?\s*\)\s*$/i;
const RX_JOB_ID_PREFIX = /^\s*\d{4,6}\s*-\s*/;
const RX_MATERNITY_TAIL =
  /\s*[-–—]?\s*\(?\s*(?:temporary,?\s*)?maternity[^)]*\)?\s*$/i;
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
      if (
        /(israel|hybrid|isr|herzliya|tel\s*aviv|haifa|maternity|petach|petah|kfar|sodom|sdom|shoham|early\s*talent)/i.test(
          inner,
        ) ||
        /^[A-Z][A-Za-z\s\-]{8,}$/.test(inner)
      ) {
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
// Hebrew + English city aliases. The Hebrew block was added 2026-06-04
// for the Workday-MNC pass: global boards (NVIDIA, Intel, Motorola,
// Mavenir, Forcepoint, etc.) frequently emit Hebrew-language location
// strings for IL postings — those were being silently dropped by the
// English-only matcher. Adding Hebrew aliases as substring matches is
// safe because .toLowerCase() is a no-op for Hebrew code points, and
// every Hebrew alias here is a place-name that can't false-positive on
// any non-IL Hebrew string (unlike e.g. country-name "ישראל" which
// would have to be word-boundary checked — handled separately below).
const IL_CITY_MAP: Record<string, string> = {
  // ─── English variants ────────────────────────────────────────────
  "tel aviv-yafo": "Tel Aviv",
  "tel-aviv": "Tel Aviv",
  "tel aviv": "Tel Aviv",
  telaviv: "Tel Aviv",
  tlv: "Tel Aviv",
  herzliya: "Herzliya",
  hertzliya: "Herzliya",
  "ramat gan": "Ramat Gan",
  "ramat-gan": "Ramat Gan",
  "bnei brak": "Bnei Brak",
  "petah tikva": "Petah Tikva",
  "petach tikva": "Petah Tikva",
  "petah-tikva": "Petah Tikva",
  "rishon lezion": "Rishon LeZion",
  "rishon le zion": "Rishon LeZion",
  rehovot: "Rehovot",
  modiin: "Modi'in",
  "modi'in": "Modi'in",
  "hod hasharon": "Hod Hasharon",
  "kfar saba": "Kfar Saba",
  "ra'anana": "Ra'anana",
  raanana: "Ra'anana",
  netanya: "Netanya",
  ashdod: "Ashdod",
  ashkelon: "Ashkelon",
  haifa: "Haifa",
  jerusalem: "Jerusalem",
  "be'er sheva": "Be'er Sheva",
  "beer sheva": "Be'er Sheva",
  beersheba: "Be'er Sheva",
  nazareth: "Nazareth",
  yokneam: "Yokneam",
  caesarea: "Caesarea",
  krayot: "Krayot",
  eilat: "Eilat",
  holon: "Holon",
  "bat yam": "Bat Yam",
  lod: "Lod",
  ramla: "Ramla",
  givatayim: "Givatayim",
  "or yehuda": "Or Yehuda",
  yavne: "Yavne",
  // PR #387 additions: SuccessFactors silent-drop (53% of SF IL rows landed
  // with NULL location_city) plus the Greenhouse/Lever/Ashby city-only tail.
  "nes ziona": "Nes Ziona",
  "ness ziona": "Nes Ziona",
  "nes-ziona": "Nes Ziona",
  "ness-ziona": "Nes Ziona",
  "rosh haayin": "Rosh HaAyin",
  "rosh ha'ayin": "Rosh HaAyin",
  "rosh ha-ayin": "Rosh HaAyin",
  "kiryat gat": "Kiryat Gat",
  "kiryat-gat": "Kiryat Gat",
  "migdal haemek": "Migdal HaEmek",
  "migdal ha'emek": "Migdal HaEmek",
  "migdal ha-emek": "Migdal HaEmek",
  // NOTE: "Airport City" districts also exist abroad (Manchester, Beijing).
  // On global ATS feeds this English needle can match a non-IL location. The
  // Hebrew needle below is unambiguous. Flagged for review.
  "airport city": "Airport City",
  "tel hai": "Tel-Hai",
  "tel-hai": "Tel-Hai",
  sdom: "Sdom",
  "neot hovav": "Neot Hovav",
  "neot-hovav": "Neot Hovav",
  karmiel: "Karmiel",
  carmiel: "Karmiel",
  // ─── Hebrew variants — all map to their canonical English form ───
  "תל אביב": "Tel Aviv",
  "תל-אביב": "Tel Aviv",
  הרצליה: "Herzliya",
  "רמת גן": "Ramat Gan",
  "רמת-גן": "Ramat Gan",
  "בני ברק": "Bnei Brak",
  "פתח תקווה": "Petah Tikva",
  "פתח-תקווה": "Petah Tikva",
  "ראשון לציון": "Rishon LeZion",
  רחובות: "Rehovot",
  מודיעין: "Modi'in",
  "הוד השרון": "Hod Hasharon",
  "כפר סבא": "Kfar Saba",
  רעננה: "Ra'anana",
  נתניה: "Netanya",
  אשדוד: "Ashdod",
  אשקלון: "Ashkelon",
  חיפה: "Haifa",
  ירושלים: "Jerusalem",
  "באר שבע": "Be'er Sheva",
  נצרת: "Nazareth",
  יקנעם: "Yokneam",
  קיסריה: "Caesarea",
  אילת: "Eilat",
  חולון: "Holon",
  "בת ים": "Bat Yam",
  לוד: "Lod",
  רמלה: "Ramla",
  גבעתיים: "Givatayim",
  "אור יהודה": "Or Yehuda",
  יבנה: "Yavne",
  // PR #387 additions (Hebrew). "פתח תקווה" (double vav) is already present
  // above; "פתח תקוה" (single vav) is the missing spelling variant.
  "נס ציונה": "Nes Ziona",
  "נס-ציונה": "Nes Ziona",
  "ראש העין": "Rosh HaAyin",
  "קריית גת": "Kiryat Gat",
  "קרית גת": "Kiryat Gat",
  "מגדל העמק": "Migdal HaEmek",
  "עיר נמל התעופה": "Airport City",
  "תל חי": "Tel-Hai",
  "תל-חי": "Tel-Hai",
  סדום: "Sdom",
  "נאות חובב": "Neot Hovav",
  כרמיאל: "Karmiel",
  "פתח תקוה": "Petah Tikva",
  "פתח-תקוה": "Petah Tikva",
};

// Hebrew (and English-transliterated) region/district tags that appear
// as bare locations on Israeli boards — usually because the employer
// is hiring across a metro area or the ATS only exposes a regional
// tag instead of a specific city. PR-M1 step (a) audit (2026-06-12)
// found ~222 active IL jobs (5.7% of the corpus) currently land with
// is_il=true but city=NULL because these tags aren't in IL_CITY_MAP.
//
// Mapped to Israel's six administrative districts so the values
// roll up cleanly in dashboards:
//   • גוש דן (Gush Dan)   — Tel Aviv metro            → Tel Aviv District
//   • השפלה (HaShfela)    — coastal lowlands south of TLV → Central District
//   • השרון (HaSharon)    — Sharon coast (Herzliya/Ra'anana/Netanya) → Central District
//   • דרום (Darom)        — South                     → Southern District
//   • צפון (Tzafon)       — North                     → Northern District
//   • מרכז (Merkaz)       — Center                    → Central District
//
// Region match runs AFTER the specific city map — a real city name
// always wins (e.g. "Tel Aviv-Yafo, Gush Dan, Israel" resolves to
// "Tel Aviv" via the city map, never "Tel Aviv District" via this).
const IL_REGION_MAP: Record<string, string> = {
  // ─── Hebrew ──────────────────────────────────────────────────────
  "גוש דן": "Tel Aviv District",
  השפלה: "Central District",
  השרון: "Central District",
  דרום: "Southern District",
  צפון: "Northern District",
  מרכז: "Central District",
  // ─── English transliterations + literal district names ──────────
  "gush dan": "Tel Aviv District",
  "tel aviv district": "Tel Aviv District",
  "central district": "Central District",
  "center district": "Central District", // Workday's English spelling
  "southern district": "Southern District",
  "northern district": "Northern District",
  "haifa district": "Haifa District",
  "jerusalem district": "Jerusalem District",
  "judea and samaria": "Judea and Samaria District",
};

// Country-level fallback when the city map doesn't match but Israel is
// mentioned. Word-boundary guards prevent matching "Illinois" / "Lille".
const RX_COUNTRY_ISRAEL = /\bisrael\b/i;
const RX_COUNTRY_IL_CODE = /\bIL\b/; // case-sensitive to avoid "ail", "ill", etc.
// Hebrew country name. Hebrew has no \b semantics in JS regex (Unicode
// categories don't trigger word-boundary), so we match as a bare
// substring — "ישראל" is unique enough that this is safe.
const RX_COUNTRY_HEBREW_ISRAEL = /ישראל/;

// Hard US signals — when ANY of these appear alongside a bare "IL" token,
// the "IL" is the Illinois state code (US), not the Israel country code.
//
// The original RX_COUNTRY_IL_CODE alone was wrong because "Chicago, IL"
// matches \bIL\b cleanly. We could have just blocked "<word>, IL" but
// that would also drop "Yokneam, IL" (a small Israeli town not in our
// city map), so the rule is conservative: only flip away from IL when
// there's a CORROBORATING US signal somewhere in the same string.
//
// Signals (any one hits):
//   • ", US" / ", USA" / "United States" / "United States of America"
//   • A 5- or 9-digit US ZIP code as a standalone token
//   • Any non-IL US state code as a standalone uppercase token
//     ("Chicago, IL; Denver, CO" → "CO" corroborates US for the whole
//     string → IL flips to false)
//   • A US tech-hub city name (PR-M1 step (a), 2026-06-12). Required
//     before adding MNC boards: Google/Microsoft/Meta/Amazon Workday
//     feeds return many "Chicago, IL", "Seattle, WA", "Mountain View, CA"
//     rows. The state-code rule already catches the explicit-state
//     pattern, but a bare "Chicago, IL" (no other US signal) was the
//     pre-existing miss — 67 active false-positives in production at
//     audit time. The city allowlist closes that hole. Additive: it
//     cannot regress any currently-correct IL row, because every IL
//     classification path (city map, "Israel" word, structured country)
//     runs before this guard.
const RX_US_COUNTRY = /,\s*(US|USA|United\s+States(\s+of\s+America)?)\b/i;
const RX_US_ZIP = /\b\d{5}(-\d{4})?\b/;
const RX_US_STATE_NON_IL =
  /\b(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)\b/;

// 50 US tech-hub cities (24 multi-word, 26 single-word, alphabetized).
// Word-boundaries on either side of each entry — "San Jose, CA" matches
// "San Jose"; "San Joseph" does not. Case-insensitive. Includes the
// multi-word cities Eli specifically named for MNC coverage:
// San Francisco, New York, Los Angeles, San Jose, Mountain View,
// Menlo Park, Redmond, Santa Clara, Palo Alto, Ann Arbor, Salt Lake City.
//
// Both "Saint Louis" and "St. Louis" are listed since both spellings
// appear in ATS feeds (UnitedHealth uses "St. Louis"; Edward Jones uses
// "Saint Louis"). The period in "St\\." is escaped — regex special.
//
// Phoenix is included even though it shares a name with the Israeli
// insurer (Phoenix Insurance / הפניקס). The function reads location_raw
// (ATS-supplied geographic string), not company names, so a "Phoenix
// Insurance, Tel Aviv" location passes the IL_CITY_MAP check long before
// reaching this guard. The malformed "Phoenix, IL" case (US miscoding)
// correctly flips to is_il=false under this rule.
const RX_US_CITY = new RegExp(
  "\\b(" +
    [
      "Ann Arbor",
      "Atlanta",
      "Austin",
      "Bellevue",
      "Berkeley",
      "Boston",
      "Boulder",
      "Cambridge",
      "Charlotte",
      "Chicago",
      "Colorado Springs",
      "Cupertino",
      "Dallas",
      "Denver",
      "Detroit",
      "Foster City",
      "Fremont",
      "Houston",
      "Indianapolis",
      "Irvine",
      "Kansas City",
      "Las Vegas",
      "Los Angeles",
      "Menlo Park",
      "Miami",
      "Minneapolis",
      "Mountain View",
      "Nashville",
      "New York",
      "Oakland",
      "Palo Alto",
      "Philadelphia",
      "Phoenix",
      "Pittsburgh",
      "Plano",
      "Portland",
      "Raleigh",
      "Redmond",
      "Redwood City",
      "Sacramento",
      "Saint Louis",
      "St\\. Louis",
      "Salt Lake City",
      "San Diego",
      "San Francisco",
      "San Jose",
      "San Mateo",
      "Santa Clara",
      "Santa Monica",
      "Seattle",
      "Sunnyvale",
    ].join("|") +
    ")\\b",
  "i",
);

// US Illinois suppression additions (PR #387, scripts/findings/country-code-
// fetcher-audit.md). The 2026-06-12 guard caught explicit-state strings and the
// tech-hub allowlist, but ~164 US-Illinois rows still slipped through: Illinois
// suburbs not in the tech-hub list, the dotted "U.S." / "U.S.A." forms, and rows
// whose structured_country was already "US". These three signals close that gap.
// They run only inside hasUsCorroboratingSignal, which gates the bare "IL" rule
// alone, so the IL_CITY_MAP / region / "Israel" paths still win first and no
// legitimate IL row can regress.
//
// Major US cities that pair with the Illinois state code. A bare "Naperville,
// IL" (no other US token) was the residual miss.
const RX_US_IL_CITY =
  /\b(Chicago|Springfield|Aurora|Rockford|Naperville|Joliet|Peoria|Schaumburg|Elgin)\b/i;
// Dotted US country forms: "U.S." and "U.S.A." (RX_US_COUNTRY only catches the
// undotted "US" / "USA" / "United States" after a comma).
const RX_US_DOTTED = /\bU\.S\.(?:A\.?)?/i;
// A structured_country supplied by the ATS that resolves to the United States.
const RX_US_STRUCTURED =
  /^(?:US|USA|U\.S\.(?:A\.?)?|United\s+States(?:\s+of\s+America)?)$/i;

function hasUsCorroboratingSignal(
  raw: string,
  structuredCountry?: string | null,
): boolean {
  if (structuredCountry && RX_US_STRUCTURED.test(structuredCountry.trim())) {
    return true;
  }
  return (
    RX_US_COUNTRY.test(raw) ||
    RX_US_DOTTED.test(raw) ||
    RX_US_ZIP.test(raw) ||
    RX_US_STATE_NON_IL.test(raw) ||
    RX_US_CITY.test(raw) ||
    RX_US_IL_CITY.test(raw)
  );
}

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

  // City substring match — first hit wins. An Israeli city anywhere in
  // the string wins regardless of US co-mentions: "Tel Aviv; Remote, US"
  // is a global-remote role that includes Israel — keep it.
  for (const [needle, canonical] of Object.entries(IL_CITY_MAP)) {
    if (lower.includes(needle)) return { is_il: true, city: canonical };
  }

  // Region match — Hebrew district tags (גוש דן / השפלה / etc.) and
  // their English transliterations. Runs AFTER the city map so a real
  // city in the string always wins ("Tel Aviv-Yafo, Gush Dan, Israel"
  // resolves to "Tel Aviv" via city, never "Tel Aviv District" via
  // region). PR-M1 step (a): closes the ~222-job city-attribution gap
  // surfaced by the 2026-06-12 audit.
  for (const [needle, canonical] of Object.entries(IL_REGION_MAP)) {
    if (lower.includes(needle)) return { is_il: true, city: canonical };
  }

  // Explicit Israel mention (English or Hebrew) — same precedence as
  // city match; a US co-mention doesn't override a literal "Israel".
  if (RX_COUNTRY_ISRAEL.test(raw) || RX_COUNTRY_HEBREW_ISRAEL.test(raw)) {
    return { is_il: true, city: null };
  }

  // Bare "IL" country code — only counts as Israel if NO corroborating
  // US signal exists in the string. This is the Illinois fix (now
  // extended to catch US tech-hub city co-mentions before adding MNCs).
  if (
    RX_COUNTRY_IL_CODE.test(raw) &&
    !hasUsCorroboratingSignal(raw, structuredCountry)
  ) {
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
  for (const [needle, canonical] of Object.entries(IL_REGION_MAP)) {
    if (lower.includes(needle)) return canonical;
  }
  return null;
}

// ───── Seniority detection ────────────────────────────────────────────

export type Seniority =
  | "entry"
  | "mid"
  | "senior"
  | "lead"
  | "director"
  | "executive";

/**
 * v1: detect bucket from title alone. Used as the baseline before any
 * description-based parsing overrides it.
 *
 * Rules (locked 2026-06-09 after the cache audit):
 * - `lead` is RESERVED for explicit Lead/Principal/Staff/Architect/
 *   Team Leader/Group + bare Head (not "Head of X" — that's executive).
 *   Bare "Manager" / "Controller" / "Counsel" route to mid, NOT lead —
 *   sending 200+ PMs and CSMs to lead would hide them from junior users
 *   on the entry-track Jobs page (566-roles-to-lead concern from the
 *   ISSUE 2 distribution audit).
 * - `entry` includes the genuine signals (intern/junior/grad/trainee/
 *   student/fellow/new-grad/early-career/university) PLUS explicit
 *   entry-track titles (SDR/BDR/Sales Development Rep/Business
 *   Development Representative/Coordinator/Representative).
 * - `associate` ALONE no longer auto-routes to entry; "Associate Manager
 *   of X" was being wrongly tagged entry. Now requires a following IC
 *   role-noun (engineer, analyst, scientist, developer, designer,
 *   specialist, consultant, coordinator, product, partner, attorney,
 *   representative, manager) — and even "Associate Manager" lands in
 *   entry only if the rest of the title is bare; downstream finalSeniority
 *   doesn't auto-promote it.
 */
export function detectSeniorityFromTitle(title: string): Seniority {
  const t = (title || "").toLowerCase();
  if (/\b(vp\b|chief|cto|ceo|cmo|cpo|cfo|head\s+of|vice\s+president)\b/.test(t))
    return "executive";
  if (/\bdirector\b/.test(t)) return "director";
  if (/\b(senior|sr\.?)\b/.test(t)) return "senior";
  if (/\b(principal|staff|lead|architect|team[\s-]?lead(er)?|group)\b/.test(t))
    return "lead";
  // Bare "Head" only counts as lead when not part of "Head of X" — that
  // executive case is already caught above.
  if (/\bhead\b/.test(t)) return "lead";
  if (
    /\b(intern|internship|junior|jr\.?|graduate|trainee|student|entry|fellow|new\s?grad|early[\s-]?career|university|sdr|bdr|sales\s+development\s+(representative|rep)|business\s+development\s+representative|coordinator|representative)\b/.test(
      t,
    )
  )
    return "entry";
  // Narrowed associate: must be followed by an IC role-noun. "Associate
  // Engineer" → entry; "Associate Manager, Marketplace S&O" → entry only
  // when no other management signal in the title (this still routes
  // there but finalSeniority + JD context can re-route).
  if (
    /\bassociate\s+(engineer|analyst|scientist|developer|designer|specialist|consultant|coordinator|product|partner|attorney|representative|manager)\b/.test(
      t,
    )
  )
    return "entry";
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
export function parseYearsOfExperience(description: string | null): {
  min: number | null;
  max: number | null;
} {
  if (!description) return { min: null, max: null };
  const text = description.slice(0, 3000).toLowerCase();

  // Range first ("3-5 years" / "3 to 5 years") so it doesn't lose to "3+"
  const rangeMatch = text.match(
    /(\d{1,2})\s*(?:to|-|–|—)\s*(\d{1,2})\s*(?:years?|yrs?)\b/,
  );
  if (rangeMatch) {
    const a = parseInt(rangeMatch[1], 10);
    const b = parseInt(rangeMatch[2], 10);
    if (a <= b && a < 30 && b < 30) return { min: a, max: b };
  }

  // "5+ years" / "5 or more years"
  const plusMatch = text.match(
    /(\d{1,2})\s*\+?\s*(?:\+|or\s+more)?\s*(?:years?|yrs?)\s*(?:of\s+)?(?:experience|exp)?/,
  );
  const minimumMatch = text.match(
    /(?:minimum|at\s+least|min\.?)\s+(\d{1,2})\s*(?:years?|yrs?)/,
  );

  let min: number | null = null;
  if (minimumMatch) min = parseInt(minimumMatch[1], 10);
  else if (plusMatch) min = parseInt(plusMatch[1], 10);

  if (min !== null && min >= 0 && min < 30) return { min, max: null };
  return { min: null, max: null };
}

/**
 * Detect an EXPLICIT junior signal in the description text — a
 * recruiter saying "we want a beginner" in so many words. Used by
 * finalSeniority to promote neutral-IC titles (Analyst, Specialist,
 * Coordinator, etc.) from mid → entry when the JD explicitly invites
 * junior applicants. Deliberately strict: bare "1+ year" or "2 years"
 * does NOT count — that was the original over-promotion bug.
 */
const RX_EXPLICIT_JUNIOR =
  /\b(?:0\s*(?:-|–|to)\s*1\s*(?:years?|yrs?)|no\s+(?:prior\s+|previous\s+)?experience(?:\s+(?:required|needed|necessary))?|new\s*grad(?:uate)?|recent\s+grad(?:uate)?s?|entry[\s-]?level)\b/i;

// Hebrew explicit-junior signals. RX_EXPLICIT_JUNIOR is English-only, so it
// never fires on the Hebrew-heavy ATSs (AdamTotal, Comeet) — these JDs carry
// the beginner invitation in Hebrew prose. Same role as the English regex:
// promote a neutral-IC "mid" title to entry on an explicit junior signal in
// the JD TEXT. This is the layer the 2026-06-09 review endorsed — the prior
// rejection (see derive-hebrew-seniority.ts) was for adding Hebrew to the
// TITLE regex, which has no JD context to disambiguate (`רכז ... בכיר` is a
// SENIOR coordinator); the JD-text signal has that context.
//   bare:   עבודה ראשונה ("first job") · ללא ניסיון ("no experience",
//           נסיון spelling variant ok) · ג'וניור ("junior", geresh variant ok)
//   scoped: דרושים/דרושות ("wanted", m/f plural) is the generic hiring
//           headline on nearly every IL post — it promotes ONLY when a
//           no-experience qualifier sits within ~40 chars. Bare
//           "דרושים מהנדס תוכנה" must NOT promote, else it re-creates the
//           #270 / Variant-C mass-over-promotion of Hebrew mid-IC roles.
const HE_NO_EXPERIENCE = "(?:ללא\\s+ני?סיון|עבודה\\s+ראשונה)";
const RX_HE_JUNIOR = new RegExp(
  HE_NO_EXPERIENCE +
    "|ג['׳]וניור|" +
    "דרוש(?:ים|ות)[\\s\\S]{0,40}" +
    HE_NO_EXPERIENCE +
    "|" +
    HE_NO_EXPERIENCE +
    "[\\s\\S]{0,40}דרוש(?:ים|ות)",
);

export function parseExplicitJuniorSignal(description: string | null): boolean {
  if (!description) return false;
  const head = description.slice(0, 3000);
  return RX_EXPLICIT_JUNIOR.test(head) || RX_HE_JUNIOR.test(head);
}

/**
 * True when the title carries an explicit management signal that
 * `detectSeniorityFromTitle` collapses into the mid bucket. Used by
 * `finalSeniority` to block the explicit-junior promotion for
 * management titles — "Marketing Manager" with an "entry-level" JD
 * sentence shouldn't become entry just because the recruiter pasted
 * boilerplate.
 */
export function detectMgmtSignalFromTitle(title: string): boolean {
  const t = (title || "").toLowerCase();
  return /\b(manager|controller|counsel|owner|partner)\b/.test(t);
}

/**
 * Combine title + years + JD signals. Variant C (locked 2026-06-09):
 *
 *   - If title classifies as senior / lead / director / executive,
 *     TITLE WINS. Recruiters set the level via the title.
 *   - If title classifies as entry, title wins.
 *   - If title is "mid" (neutral IC — Analyst, Specialist, Engineer,
 *     etc.), promote to entry ONLY if the JD has an explicit junior
 *     signal (parseExplicitJuniorSignal). The old years-based demotion
 *     ("years.min ≤ 2 → entry") was removed because too many neutral
 *     postings mention "1+ year" or "2 years" as a soft floor; demoting
 *     them all to entry hid 100+ legit mid roles per refresh.
 *   - Years still refine UPWARD: 6-8 → senior, 9+ → lead. Years never
 *     demote.
 *
 * Why Variant B failed (cache audit 2026-06-09):
 *   - 87 management titles (Manager / Controller / Counsel / Team
 *     Leader / Specialist / etc.) tagged as `entry` because the title
 *     regex was too narrow and years.min ≤ 2 in their JDs demoted
 *     them.
 *   - ~168 "Software Engineer" / "Marketing Specialist" gray-area
 *     roles tagged entry because of the same years branch.
 *
 * Variant C promotes only on the EXPLICIT junior phrases ("0-1 years",
 * "no experience required", "new grad", "recent graduate", "entry
 * level"), giving up the years auto-demote in exchange for ~250 fewer
 * mis-tagged entry rows.
 */
export function finalSeniority(
  titleBucket: Seniority,
  years: { min: number | null; max: number | null },
  opts: { explicitJunior?: boolean; titleHasMgmtSignal?: boolean } = {},
): Seniority {
  if (
    titleBucket === "senior" ||
    titleBucket === "lead" ||
    titleBucket === "director" ||
    titleBucket === "executive"
  ) {
    return titleBucket;
  }
  if (titleBucket === "entry") return "entry";

  // titleBucket is "mid". Promotion to entry fires ONLY when the JD has
  // an explicit junior signal AND the title is a neutral IC (NOT
  // management). "Marketing Manager" with "entry-level" boilerplate in
  // the JD shouldn't become entry.
  if (opts.explicitJunior && !opts.titleHasMgmtSignal) return "entry";

  // Years can only refine UPWARD from mid. No more years-based
  // demotion to entry (Variant C change).
  if (years.min === null) return "mid";
  if (years.min < 6) return "mid";
  if (years.min < 9) return "senior";
  return "lead";
}

// ───── HTML → plain text ──────────────────────────────────────────────

/**
 * Cheap HTML stripper. Pulls out text content, decodes the common entities,
 * collapses whitespace. NOT a sanitizer — we strip everything, not just
 * dangerous tags. Good enough for storing job descriptions in plain-text
 * form. ~50 KB of HTML → ~5-15 KB of plain text typically.
 */
// PARITY CONTRACT: this function is byte-mirrored in
// supabase/functions/_shared/strip-html.ts (Deno can't import this Node
// file). Any change here MUST be replicated there. src/test/stripHtmlParity.test.js
// asserts identical output across a fixed corpus and will fail CI on drift.
export function stripHtml(input: string | null): string | null {
  if (input == null) return null;
  return (
    input
      // STEP 1 (load-bearing): decode entities FIRST. Greenhouse + SAP
      // SuccessFactors return HTML that's been ENCODED for transport
      // (`&lt;p&gt;...&lt;/p&gt;`). If we leave entity-decode at the end
      // (the original ordering), the tag-strip regexes below see no
      // literal `<` and pass through — then the decode at step 5 turns
      // `&lt;p&gt;` into real `<p>` tags in the output, leaving the
      // sanitizer's caller with a string FULL of HTML. Live audit on
      // 2026-05-31 showed greenhouse 1147/1147 + SF 299/301 dirty in
      // jobs.description; that bug is here, not at the call site.
      .replace(/&nbsp;/g, " ")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&hellip;/g, "…")
      .replace(/&mdash;/g, "—")
      .replace(/&ndash;/g, "–")
      .replace(/&#(\d+);/g, (_, n: string) => {
        const code = parseInt(n, 10);
        return code > 0 && code < 0x10000 ? String.fromCharCode(code) : " ";
      })
      // &amp; is decoded LAST in the first pass so we don't double-decode
      // already-decoded `&...;` sequences mid-stream. Step 5 mops up any
      // entities embedded in plaintext content that survived tag-strip
      // (e.g. `&copy;` inside paragraph text); &amp; goes there.
      // STEP 2: drop scripts/styles wholesale before tag stripping (their
      // contents are JS/CSS, not human text)
      .replace(/<(script|style)[^>]*>[\s\S]*?<\/(?:script|style)>/gi, " ")
      // STEP 3: convert <br> and block-level closing tags to newlines for readability
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, "\n")
      // STEP 4: strip all remaining tags (including data-* attributes via
      // the catch-all)
      .replace(/<[^>]*>/g, " ")
      // STEP 5: decode the entities that appear inside plaintext content
      // (after tags are gone). Also catches anything that was originally
      // double-encoded (&amp;lt; → &lt; after step 1 → < here, no tag to
      // strip but at least the entity is resolved).
      .replace(/&amp;/g, "&")
      .replace(/&nbsp;/g, " ")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&hellip;/g, "…")
      .replace(/&mdash;/g, "—")
      .replace(/&ndash;/g, "–")
      .replace(/&#(\d+);/g, (_, n: string) => {
        const code = parseInt(n, 10);
        return code > 0 && code < 0x10000 ? String.fromCharCode(code) : " ";
      })
      // STEP 6: collapse whitespace runs (but keep paragraph breaks readable)
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

/**
 * Dedup normalized rows by external_id, keeping the LAST occurrence (a fresher
 * copy wins). The jobs upsert uses ON CONFLICT (ats_source, external_id); a
 * board that lists the same external_id twice (observed on JoVE / Workable)
 * makes Postgres reject the whole batch ("ON CONFLICT DO UPDATE command cannot
 * affect row a second time") and lose every IL role for that company.
 * ats_source is constant within one company's batch, so deduping on
 * external_id alone is sufficient.
 */
export function dedupByExternalId(rows: NormalizedJob[]): NormalizedJob[] {
  const byId = new Map<string, NormalizedJob>();
  for (const row of rows) byId.set(row.external_id, row);
  return Array.from(byId.values());
}
