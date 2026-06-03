// Server-driven CV experience reconciliation.
//
// The LLM emits ONLY {index, bullets} per experience entry — never title,
// company, unit, organization, or dates. The server iterates the
// authoritative source list (from the DB) and stamps title / org / dates
// from the source onto each output entry, attaching the LLM's bullets by
// matching the LLM's `index` to the source's array position.
//
// Invariants:
//   - Output length === sources length. No experience is ever dropped.
//   - title / org / dates come from the DB, never from the LLM.
//   - If the LLM omits an index or echoes an out-of-range one, positional
//     fallback (llmEntries[i] for sources[i]) attaches whatever bullets
//     sit at the same array slot. Out-of-range indices are logged.
//   - If an entry ends up with no bullets, its source.responsibilities
//     text is split into bullets so the experience still renders content.
//
// Replaces the pre-2026-06-02 `reconcile` step which keyed entries by
// date strings — a fragile join that collapsed past + current roles onto
// the same key when an operator-precedence bug made every entry's end-date
// render as "present". See PR #234 for the bug history.

export interface SourceExperience {
  title: string;
  company: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  responsibilities: string;
}

export interface LlmEntry {
  index?: number;
  bullets?: string[];
  [k: string]: any;
}

export interface FilledEntry {
  title: string;
  dates: string;
  bullets: string[];
  [orgField: string]: any;
}

const MONTHS_FULL: Record<string, string> = {
  january: "Jan", february: "Feb", march: "Mar", april: "Apr", may: "May",
  june: "Jun", july: "Jul", august: "Aug", september: "Sep", sept: "Sep",
  october: "Oct", november: "Nov", december: "Dec",
};
const MONTHS_SHORT_OK = new Set([
  "Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec",
]);

function formatDatePart(raw: string): string {
  const t = String(raw || "").trim();
  if (!t) return "";
  const short = t.match(/^([A-Za-z]{3,4})\.?\s+(\d{4})$/);
  if (short) {
    const monRaw = short[1];
    const cap = monRaw.charAt(0).toUpperCase() + monRaw.slice(1, 3).toLowerCase();
    if (MONTHS_SHORT_OK.has(cap)) return `${cap} ${short[2]}`;
  }
  const long = t.match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (long) {
    const abbrev = MONTHS_FULL[long[1].toLowerCase()];
    if (abbrev) return `${abbrev} ${long[2]}`;
  }
  if (/^\d{4}$/.test(t)) return t;
  const numeric = t.match(/^(\d{1,2})[\/\-](\d{4})$/);
  if (numeric) {
    const idx = parseInt(numeric[1], 10);
    if (idx >= 1 && idx <= 12) {
      const abbrev = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][idx - 1];
      return `${abbrev} ${numeric[2]}`;
    }
  }
  return t;
}

export function formatExperienceDates(
  start: string,
  end: string,
  isCurrent: boolean,
): string {
  const s = formatDatePart(start);
  const e = isCurrent ? "Present" : formatDatePart(end);
  if (s && e) return `${s} – ${e}`;
  if (s) return s;
  if (e) return e;
  return "";
}

function responsibilitiesToBullets(text: string): string[] {
  if (!text) return [];
  return text
    .split(/\r?\n+/)
    .map((s) => s.replace(/^\s*[-•*]\s*/, "").trim())
    .filter(Boolean);
}

export function fillFromSource(
  sources: SourceExperience[],
  llmEntries: LlmEntry[] | undefined | null,
  orgFieldName: string,
  opts?: { logger?: (msg: string) => void },
): FilledEntry[] {
  const log = opts?.logger || ((msg: string) => console.warn(msg));
  const entries: LlmEntry[] = Array.isArray(llmEntries) ? llmEntries : [];

  // Build a map source-index → bullets in two passes so positional
  // fallback never double-uses an LLM entry already claimed by a valid
  // index match:
  //   pass 1: every entry with a valid in-range integer index claims
  //           that source slot (first-wins on duplicate indices).
  //   pass 2: entries with missing / out-of-range / non-integer indices
  //           are rescued by mapping them to source[j] (their own array
  //           position) IF that slot is still unclaimed.
  const bulletsBySource = new Map<number, string[]>();
  const cleanBullets = (raw: unknown): string[] =>
    Array.isArray(raw)
      ? (raw as unknown[]).map((b) => String(b || "").trim()).filter(Boolean)
      : [];

  for (let j = 0; j < entries.length; j++) {
    const e = entries[j];
    if (!e) continue;
    const raw = e.index;
    const idx = Number(raw);
    const valid = Number.isInteger(idx) && idx >= 0 && idx < sources.length;
    if (valid && !bulletsBySource.has(idx)) {
      bulletsBySource.set(idx, cleanBullets(e.bullets));
    }
  }
  for (let j = 0; j < entries.length; j++) {
    const e = entries[j];
    if (!e) continue;
    const raw = e.index;
    const idx = Number(raw);
    const valid = Number.isInteger(idx) && idx >= 0 && idx < sources.length;
    if (valid) continue;
    log(`[CV reconcile] LLM entry ${j} has out-of-range index=${raw} (sources.length=${sources.length}); positional fallback to source ${j}`);
    if (j < sources.length && !bulletsBySource.has(j)) {
      bulletsBySource.set(j, cleanBullets(e.bullets));
    }
  }

  return sources.map((src, i) => {
    let bullets = bulletsBySource.get(i) || [];
    if (bullets.length === 0) {
      bullets = responsibilitiesToBullets(src.responsibilities);
    }
    const out: FilledEntry = {
      title: src.title || "",
      dates: formatExperienceDates(src.start_date, src.end_date, !!src.is_current),
      bullets,
    };
    out[orgFieldName] = src.company || "";
    return out;
  });
}
