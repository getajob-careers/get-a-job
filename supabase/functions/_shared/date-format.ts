// Canonical date-granularity formatter for CV output + on-screen display.
//
// Product standard (2026-07): employment/education dates render as
// "Mon YYYY" (e.g. "Oct 2025"), a range as "Mon YYYY – Mon YYYY" or
// "Mon YYYY – Present". Year-only stays year-only ("2019") — we NEVER
// fabricate a month to "complete" a date. Day-level granularity is never
// emitted: a stored ISO value ("2025-10-19", from the old native date
// picker) is rendered "Oct 2025", the day dropped.
//
// This is the ONE shared implementation. It replaces three divergent
// copies (cv-master.fmtMonthYear, reconcile.formatDatePart, and the inline
// normaliser in generate-tailored-cv/index.ts) that each handled a
// different subset of input shapes — the ISO-with-day case in particular
// leaked through two of them. The frontend imports it too (Vite bundles
// _shared/*.ts, same path skillResolver.js already uses).
//
// Formatting is render-side ONLY. Stored data is never mutated.

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const MONTHS_FULL: Record<string, string> = {
  january: "Jan", february: "Feb", march: "Mar", april: "Apr",
  may: "May", june: "Jun", july: "Jul", august: "Aug",
  september: "Sep", sept: "Sep", october: "Oct", november: "Nov",
  december: "Dec",
};

const MONTHS_SHORT_SET = new Set(MONTHS_SHORT);

// "still ongoing" tokens — echoed with canonical capitalisation.
const PASSTHROUGH: Record<string, string> = {
  present: "Present", current: "Present", now: "Present",
  ongoing: "Present", "n/a": "",
};

// Range separator: en-dash, em-dash, hyphen, or the word "to", but ONLY
// when surrounded by whitespace. Requiring whitespace is what keeps an ISO
// date's internal hyphens ("2023-09-01") from being split into pieces —
// only a real "<date> - <date>" separator (which carries spaces) matches.
const RANGE_RE = /\s+(?:to|[–—-])\s+/i;

function titleMonth(raw: string): string | null {
  const key = raw.toLowerCase().replace(/\.$/, "");
  // 3-4 letter abbreviation already ("oct", "sept").
  const abbrev = key.length >= 3
    ? key.charAt(0).toUpperCase() + key.slice(1, 3).toLowerCase()
    : "";
  if (MONTHS_SHORT_SET.has(abbrev) && key.length <= 4) return abbrev;
  // Full month name.
  return MONTHS_FULL[key] || null;
}

/**
 * Normalise a SINGLE date value to "Mon YYYY" (or "YYYY", or "Present").
 * Unknown shapes are returned verbatim so we never corrupt an edge case
 * (e.g. a bare year-range "2020-2022" in one field is left as-is rather
 * than mangled). Never emits a day.
 */
export function formatMonthYear(raw: unknown): string {
  const s = String(raw ?? "").trim();
  if (!s) return "";

  const pass = PASSTHROUGH[s.toLowerCase()];
  if (pass !== undefined) return pass;

  // ISO "YYYY-MM" or "YYYY-MM-DD" — month must be 01-12 so a year-range
  // like "2020-2022" (second part 22, not a valid month) falls through.
  const iso = s.match(/^(\d{4})-(0?[1-9]|1[0-2])(?:-\d{1,2})?$/);
  if (iso) return `${MONTHS_SHORT[parseInt(iso[2], 10) - 1]} ${iso[1]}`;

  // Year only.
  if (/^\d{4}$/.test(s)) return s;

  // "Oct 2025" / "October 2025" / "Sept 2024".
  const named = s.match(/^([A-Za-z]{3,9})\.?\s+(\d{4})$/);
  if (named) {
    const mon = titleMonth(named[1]);
    if (mon) return `${mon} ${named[2]}`;
  }

  // "10/2025" or "10-2025" (month first, 01-12).
  const numeric = s.match(/^(0?[1-9]|1[0-2])[/-](\d{4})$/);
  if (numeric) return `${MONTHS_SHORT[parseInt(numeric[1], 10) - 1]} ${numeric[2]}`;

  // Unknown — keep verbatim, never fabricate.
  return s;
}

/**
 * Build a display range from separate start/end fields.
 * "Mon YYYY – Mon YYYY", "Mon YYYY – Present", or a single endpoint.
 */
export function formatDateRange(
  start: unknown,
  end: unknown,
  isCurrent?: unknown,
): string {
  const s = formatMonthYear(start);
  const e = isCurrent ? "Present" : formatMonthYear(end);
  if (s && e) return `${s} – ${e}`;
  return s || e || "";
}

/**
 * Normalise a pre-joined range STRING (e.g. an LLM-produced
 * "October 2025 – Present" or an education "2023 - 2024"). Splits on the
 * whitespace-delimited range separator, normalises each endpoint, and
 * rejoins with an en-dash. A single value normalises in place.
 */
export function formatDateString(raw: unknown): string {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  const parts = s.split(RANGE_RE);
  if (parts.length === 1) return formatMonthYear(parts[0]);
  return parts.map(formatMonthYear).filter(Boolean).join(" – ");
}
