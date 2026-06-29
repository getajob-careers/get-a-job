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
