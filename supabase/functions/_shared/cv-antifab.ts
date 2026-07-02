// cv-antifab.ts — the single anti-fabrication gate shared by the three CV
// functions (generate-tailored-cv, refine-cv, edit-cv). One source, three
// consumers — no inline reimplementations. See the edit-cv anti-fab plan.
//
// The quantified-token trace: every metric/number/money/multiplier and every
// CamelCase / ALLCAPS proper-noun token in a piece of text must already appear
// in the trace corpus (the user's own source content). It cannot prove a reword
// is faithful, but it catches the high-risk fabrication: invented numbers,
// tools, companies, acronyms.

export const QUANT_TOKEN_RE =
  /\b(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?[%$€₪]?|[$€₪]\d+[KMB]?|\d+\+|\d+x|[A-Z][a-z]+(?:[A-Z][a-zA-Z]+)+|[A-Z]{3,})\b/g;

export const TOKEN_BLOCKLIST = new Set([
  "Israel",
  "Tel",
  "Aviv",
  "Hebrew",
  "English",
  "USA",
  "UK",
  "EU",
  "API",
  "CV",
  "JD",
  "PM",
  "HR",
  "CS",
  "VIP",
  "CEO",
  "CFO",
  "CTO",
  "COO",
  "SQL",
]);

// Ordinary capitalized English + place / time / role words that legitimately
// appear MID-SENTENCE in a CV and are NOT brand names. Kept deliberately free of
// known tool/brand homonyms (Notion, Slack, Monday, Zoom, Segment, Gong, Linear,
// Loom, Cursor, Claude, Canva) so those still get traced. This lets us flag
// single-capitalized proper nouns (Zendesk, Intercom, Salesforce, HubSpot, Jira,
// Figma, Tableau, Asana, Trello, Airtable, Marketo, Klaviyo, ...) that the
// CamelCase / ALLCAPS patterns miss, without reverting normal reworded prose.
// The lookup strips a trailing "s" so plurals (Managers -> Manager) are covered.
export const PROPER_NOUN_STOPLIST = new Set([
  // places / nationalities / languages
  "Israel",
  "Israeli",
  "Tel",
  "Aviv",
  "Jerusalem",
  "Haifa",
  "Herzliya",
  "America",
  "American",
  "Europe",
  "European",
  "Asia",
  "English",
  "Hebrew",
  "Arabic",
  "Spanish",
  "French",
  "German",
  "Russian",
  "Chinese",
  "Middle",
  "East",
  "West",
  "North",
  "South",
  // months / time
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
  "Present",
  "Current",
  "Today",
  // common role / domain words (capitalized inside titles)
  "Manager",
  "Director",
  "Lead",
  "Analyst",
  "Specialist",
  "Coordinator",
  "Associate",
  "Officer",
  "Engineer",
  "Developer",
  "Designer",
  "Consultant",
  "Administrator",
  "Representative",
  "Executive",
  "President",
  "Founder",
  "Head",
  "Intern",
  "Senior",
  "Junior",
  "Principal",
  "Staff",
  "Trainee",
  "Advisor",
  "Success",
  "Support",
  "Sales",
  "Marketing",
  "Product",
  "Operations",
  "Finance",
  "Business",
  "Customer",
  "Client",
  "Team",
  "Project",
  "Program",
  "Growth",
  "Strategy",
  "Data",
  "Quality",
  "Service",
  "Research",
  "Content",
  "Development",
  "Engineering",
  "Science",
  "Technology",
  "Human",
  "Resource",
  "Account",
  "Partner",
  "Partnership",
  "Community",
  "Brand",
  "Digital",
  "Social",
  "Media",
  "Public",
  "Relation",
  "Administration",
  "Economics",
  "Management",
  "Computer",
  "Information",
  "System",
  "Innovation",
  "Analytics",
  "University",
  "College",
  "Bachelor",
  "Master",
  "Degree",
  // common capitalized connectors / determiners (sentence-internal)
  "The",
  "This",
  "That",
  "These",
  "Those",
  "With",
  "And",
  "For",
  "From",
  "Into",
  "Over",
  "Under",
  "After",
  "Before",
  "When",
  "While",
  "During",
  "Using",
  "Within",
  "Across",
  "Through",
  "Between",
  "Their",
  "They",
  "Both",
  "Each",
  "Also",
  "Then",
  "Than",
  "Such",
  "More",
  "Most",
  "Full",
  "Part",
  "New",
  "Key",
  "Main",
  "Core",
  "First",
  "Second",
  "Third",
  "Best",
  "Real",
  "Strong",
  "High",
  "Low",
  "Global",
  "Local",
  "National",
  "International",
  "Cross",
  "Multi",
]);

// Single-capitalized proper-noun tokens that QUANT_TOKEN_RE (CamelCase / ALLCAPS
// only) misses. Position-aware: we only take tokens that appear MID-SENTENCE
// (preceded by a lowercase letter / digit / comma / close-bracket + a space),
// because a capital at the START of a bullet or right after a period is almost
// always an ordinary word (verb-led bullets: "Handled..."/"Managed..."). Words
// in the stoplist (plural-stripped) or the blocklist are dropped; the rest fall
// through to the same source trace as every other token, so a JD tool absent
// from the user's own content gets reverted instead of authored in.
const SINGLE_CAP_MIDSENTENCE_RE = /(?<=[a-z0-9,)\]] )([A-Z][a-z]{2,})\b/g;
export function properNounTokens(text: string): string[] {
  const out: string[] = [];
  const re = new RegExp(SINGLE_CAP_MIDSENTENCE_RE.source, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(String(text || ""))) !== null) {
    const tok = m[1];
    const singular = tok.replace(/s$/, "");
    if (PROPER_NOUN_STOPLIST.has(tok) || PROPER_NOUN_STOPLIST.has(singular)) {
      continue;
    }
    if (TOKEN_BLOCKLIST.has(tok)) continue;
    out.push(tok);
  }
  return out;
}

// True iff every quantified / proper-noun token in `text` already appears in
// `haystackLower` (the source content). Reworded bullets + the summary must pass
// this — the source is the anti-fab'd ground truth, so this only polices that a
// reword surfaces a keyword without inventing a metric/tool/number.
export function tokensTraceToMaster(
  text: string,
  haystackLower: string,
): boolean {
  const tokens = String(text || "").match(QUANT_TOKEN_RE) || [];
  for (const tok of tokens) {
    if (TOKEN_BLOCKLIST.has(tok)) continue;
    if (!haystackLower.includes(tok.toLowerCase())) return false;
  }
  // Single-capitalized proper nouns (brand / tool names like Zendesk, Intercom)
  // must also trace to the source. CamelCase / ALLCAPS are already covered above;
  // this closes the ordinary-brand-name hole a JD can otherwise author in.
  for (const tok of properNounTokens(text)) {
    if (!haystackLower.includes(tok.toLowerCase())) return false;
  }
  return true;
}

// Summary-only gate. NUMERIC tokens (percent/dollar/count/number) must still
// trace to the master — strict. PROPER-NOUN tokens (CamelCase / ALLCAPS, e.g. a
// JD acronym like "GTM") may instead come from the JD keyword set, since
// extractJDKeywords provenance-filters those to terms present in the JD. NOT used
// for bullet rewords — those stay on the strict master-only trace above. (For
// edit-cv there is no JD, so the caller passes an empty jdHaystack and this
// collapses to master-only — stricter, not looser.)
export function summaryTokensClean(
  text: string,
  masterHaystackLower: string,
  jdHaystackLower: string,
): boolean {
  const tokens = String(text || "").match(QUANT_TOKEN_RE) || [];
  for (const tok of tokens) {
    if (TOKEN_BLOCKLIST.has(tok)) continue;
    const lower = tok.toLowerCase();
    if (/\d/.test(tok)) {
      if (!masterHaystackLower.includes(lower)) return false; // numbers: master only (strict)
    } else if (
      !masterHaystackLower.includes(lower) &&
      !jdHaystackLower.includes(lower)
    ) {
      return false; // proper-noun: master OR JD keyword set (widened)
    }
  }
  // Single-capitalized proper nouns follow the same widened rule: they may come
  // from the master OR the JD keyword set, but a name in neither is fabricated.
  for (const tok of properNounTokens(text)) {
    const lower = tok.toLowerCase();
    if (
      !masterHaystackLower.includes(lower) &&
      !jdHaystackLower.includes(lower)
    ) {
      return false;
    }
  }
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// edit-cv gate: apply the trace to an LLM-edited cv_data, using the PRE-EDIT
// cv_data as the trace corpus (no JD, no master fetch). On-violation = (b')
// per-entry revert.

const safeArr = (v: unknown): any[] => (Array.isArray(v) ? v : []);
const str = (v: unknown): string => String(v ?? "");

// Canonical experience buckets and their per-bucket org field.
const EXP_BUCKETS: { key: string; org: string }[] = [
  { key: "professional_experiences", org: "company" },
  { key: "military_experiences", org: "unit" },
  { key: "volunteering_experiences", org: "organization" },
  { key: "leadership_experiences", org: "organization" },
];

export interface AntiFabResult {
  cv_data: Record<string, any>;
  factsReverted: number; // entry title/org/date fields restored from pre-edit
  bulletsReverted: number; // entries whose bullets reverted (fabrication caught)
  summaryReverted: boolean;
}

// Gate an LLM-edited `edited` cv_data against the `original` (pre-edit) cv_data.
//
// - FACTS IMMUTABLE: every matched experience entry's title / org / dates are
//   restored from the pre-edit entry. edit-cv rephrases bullets and the summary;
//   it must not rewrite facts. This catches seniority inflation
//   (Analyst -> Senior Analyst) and swapped employers that the token gate misses.
// - PER-ENTRY BULLET REVERT (b'): if ANY edited bullet in an entry introduces a
//   quantified/proper-noun token absent from that entry's pre-edit content, that
//   entry's whole bullet list reverts to pre-edit verbatim (apply the safe parts,
//   never invent).
// - SUMMARY: reverts independently if it introduces an untraceable token,
//   traced against the whole pre-edit cv_data.
//
// Entries are matched by index within each bucket (edit-cv's structural guard
// already prevents dropping a section); an edited entry with no pre-edit
// counterpart is traced against an empty corpus, so any quantified bullet
// reverts to empty.
export function applyAntiFabGate(
  original: Record<string, any>,
  edited: Record<string, any>,
): AntiFabResult {
  const out: Record<string, any> = { ...edited };
  let factsReverted = 0;
  let bulletsReverted = 0;
  let summaryReverted = false;

  for (const { key, org } of EXP_BUCKETS) {
    const editList = safeArr(edited?.[key]);
    if (editList.length === 0) continue;
    const origList = safeArr(original?.[key]);
    out[key] = editList.map((ee: any, i: number) => {
      const oe = origList[i] || {};
      const entry: any = { ...ee };
      // facts immutable — restore title / org / dates from pre-edit
      for (const f of ["title", org, "dates"]) {
        if (f in oe && entry[f] !== oe[f]) {
          entry[f] = oe[f];
          factsReverted++;
        }
      }
      // per-entry bullet trace against THIS entry's pre-edit content
      const haystack = [oe.title, oe[org], ...safeArr(oe.bullets)]
        .map(str)
        .join(" \n ")
        .toLowerCase();
      const bullets = safeArr(ee.bullets).map(str);
      const clean = bullets.every((b) => tokensTraceToMaster(b, haystack));
      if (!clean) {
        entry.bullets = safeArr(oe.bullets).map(str);
        bulletsReverted++;
      }
      return entry;
    });
  }

  // summary — independent; trace numbers + proper-nouns against the whole
  // pre-edit cv_data (no JD, so jdHaystack is empty → master-only).
  const summaryText = str(edited?.summary ?? edited?.about_me);
  if (summaryText.trim()) {
    const haystack = JSON.stringify(original ?? {}).toLowerCase();
    if (!summaryTokensClean(summaryText, haystack, "")) {
      if ("summary" in out) out.summary = original?.summary ?? "";
      if ("about_me" in out) out.about_me = original?.about_me ?? "";
      summaryReverted = true;
    }
  }

  return { cv_data: out, factsReverted, bulletsReverted, summaryReverted };
}

// ─────────────────────────────────────────────────────────────────────────────
// generate-tailored-cv enforcement: the from-scratch authoring path emits fresh
// bullets, so there is no 1:1 master ancestor to revert a single bullet to.
// Policy (QA2 P1, Option A): a bullet that invents a PROPER-NOUN tool/brand token
// absent from the user's source is REMOVED (dropped). NUMBER tokens stay a
// non-blocking flag (returned so the caller can surface unsourced_bullets).
// No-empty invariant (#437): if enforcement would leave an EXPERIENCE bucket
// entry with zero bullets, restore that experience's master bullets instead of
// ever emptying it. Projects may legitimately end empty and are not restored.
// This is the seed of the queued "ONE ENFORCEMENT GATE (consolidation)".

const ENFORCE_EXP_BUCKETS = new Set([
  "professional_experiences",
  "military_experiences",
  "volunteering_experiences",
  "leadership_experiences",
]);

export interface BulletEnforcementResult {
  bulletsEnforced: number; // bullets removed for an unsourced proper-noun token
  experiencesRestored: number; // experiences restored to master (no-empty)
  flags: { bucket: string; bullet: string; tokens: string[] }[];
}

// Mutates cvData bucket entries' `bullets` in place. `masterBulletsByKey` maps
// expKeyOf(title, company) -> that experience's master bullets (used only for
// the no-empty restore). `sourceHaystackLower` is the lowercased corpus of the
// user's own content that a token must trace to.
export function enforceBulletProperNouns(
  cvData: Record<string, any>,
  sourceHaystackLower: string,
  masterBulletsByKey: Map<string, string[]>,
  expKeyOf: (title: unknown, company: unknown) => string,
): BulletEnforcementResult {
  const flags: { bucket: string; bullet: string; tokens: string[] }[] = [];
  let bulletsEnforced = 0;
  let experiencesRestored = 0;

  const scan = (bullet: string): { numbers: string[]; proper: string[] } => {
    const text = String(bullet || "").trim();
    const numbers: string[] = [];
    const proper: string[] = [];
    if (!text) return { numbers, proper };
    for (const tok of text.match(QUANT_TOKEN_RE) || []) {
      if (TOKEN_BLOCKLIST.has(tok)) continue;
      if (sourceHaystackLower.includes(tok.toLowerCase())) continue;
      if (/\d/.test(tok)) numbers.push(tok);
      else proper.push(tok);
    }
    for (const tok of properNounTokens(text)) {
      if (!sourceHaystackLower.includes(tok.toLowerCase())) proper.push(tok);
    }
    return { numbers, proper };
  };

  for (const bucket of [
    "professional_experiences",
    "military_experiences",
    "volunteering_experiences",
    "leadership_experiences",
    "projects",
  ]) {
    const entries = Array.isArray(cvData?.[bucket]) ? cvData[bucket] : [];
    for (const entry of entries) {
      const orig = safeArr(entry?.bullets).map((b) => str(b));
      const kept: string[] = [];
      for (const b of orig) {
        const { numbers, proper } = scan(b);
        if (proper.length > 0) {
          bulletsEnforced++;
          // removed, not surfaced as a flag (a warning about a gone bullet
          // would confuse the user); the count is telemetry only.
          continue; // drop the fabricating bullet
        }
        if (numbers.length > 0)
          flags.push({ bucket, bullet: b, tokens: numbers });
        kept.push(b);
      }
      if (
        kept.length === 0 &&
        orig.length > 0 &&
        ENFORCE_EXP_BUCKETS.has(bucket)
      ) {
        const restored =
          masterBulletsByKey.get(expKeyOf(entry?.title, entry?.company)) ?? [];
        if (restored.length > 0) {
          entry.bullets = restored.slice(0, 8);
          experiencesRestored++;
        } else {
          entry.bullets = orig; // last resort: keep originals, never empty
        }
      } else {
        entry.bullets = kept;
      }
    }
  }

  return { bulletsEnforced, experiencesRestored, flags };
}

// Filter a tailored CV's skills.tools list to the user's source (QA2 P1, Rider 1
// promoted): a tool/brand name absent from the user's own content is a JD
// fabrication and is removed; genuinely-owned tools survive (they trace to the
// source). NEVER-EMPTY rail: if filtering would empty the section, fall back to
// the user's owned tools (ownedFallback, already source-derived). A user who
// genuinely has no tools keeps an empty list (that is honest, not a bug).
export function filterToolsToSource(
  tools: unknown,
  sourceHaystackLower: string,
  ownedFallback: string[],
): { tools: string[]; removed: number } {
  const list = safeArr(tools)
    .map((t) => str(t).trim())
    .filter(Boolean);
  const kept = list.filter((t) =>
    sourceHaystackLower.includes(t.toLowerCase()),
  );
  const removed = list.length - kept.length;
  if (kept.length > 0) return { tools: kept, removed };
  // never-empty: restore the user's genuinely-owned tools (deduped, capped).
  const owned = Array.from(
    new Set(
      safeArr(ownedFallback)
        .map((t) => str(t).trim())
        .filter(Boolean),
    ),
  );
  return { tools: owned.slice(0, 12), removed };
}
