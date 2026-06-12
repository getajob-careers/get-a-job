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
//
// Caveat (accepted): a bare "Chicago, IL" with no other US signal in
// the string stays as IL under this rule. Live audit shows this case is
// rare (~46 rows across Reddit/Toast/etc.); fixing it would require a
// US-city whitelist that risks new false negatives on Yokneam-class
// small Israeli towns. Conservative beats clever here.
const RX_US_COUNTRY = /,\s*(US|USA|United\s+States(\s+of\s+America)?)\b/i;
const RX_US_ZIP = /\b\d{5}(-\d{4})?\b/;
const RX_US_STATE_NON_IL =
  /\b(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)\b/;

function hasUsCorroboratingSignal(raw: string): boolean {
  return (
    RX_US_COUNTRY.test(raw) ||
    RX_US_ZIP.test(raw) ||
    RX_US_STATE_NON_IL.test(raw)
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

  // Explicit Israel mention (English or Hebrew) — same precedence as
  // city match; a US co-mention doesn't override a literal "Israel".
  if (RX_COUNTRY_ISRAEL.test(raw) || RX_COUNTRY_HEBREW_ISRAEL.test(raw)) {
    return { is_il: true, city: null };
  }

  // Bare "IL" country code — only counts as Israel if NO corroborating
  // US signal exists in the string. This is the Illinois fix.
  if (RX_COUNTRY_IL_CODE.test(raw) && !hasUsCorroboratingSignal(raw)) {
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
