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
  // PR #321 Phase-4 read side: user-curated achievement bullets (chat
  // "add X to my CV" capture). When present, preferred over splitting
  // responsibilities in the no-LLM-bullets fallback below. Optional so the
  // job-CV / from-scratch callers that omit it stay byte-identical.
  bullets?: string[];
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

// Defensive instrumentation surface — additive, no render-behavior change.
//
// Two warning kinds:
//   - 'unclaimed_entry'    — an LLM entry that produced no slot binding after
//                            both pass 1 (in-range index claim) AND pass 2
//                            (positional rescue). Its bullets are dropped.
//                            This is the agamf123-shape failure: misrouted
//                            bucket, out-of-range index, no positional slot
//                            available — the LLM's tailored text vanishes
//                            silently.
//   - 'positional_fallback'— a slot claimed via pass-2 positional rescue
//                            rather than a valid index. Indicates the LLM
//                            emitted an out-of-range or non-integer index.
//                            Less severe than 'unclaimed_entry' because the
//                            bullets DO attach to a source slot — but they
//                            may be misrouted (the LLM's bullets describe a
//                            different role than the source at position j).
//
// Caller passes a shared array via opts.warnings; fillFromSource appends to
// it across all four bucket calls. The shape mirrors unsourcedBullets in
// the index.ts response payload (`{ bucket, ...details }`) so the same
// rendering / inspection plumbing applies.
export interface ReconcileWarning {
  bucket: string;
  kind: 'unclaimed_entry' | 'positional_fallback' | 'attribution_mismatch';
  entry_position: number;
  llm_index: number | string | null;
  source_index?: number;
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

// A1 (cv_reconcile_verify) — per-experience attribution verification. The LLM
// optionally echoes a `company_check` stub next to `index`; before trusting an
// in-range index we confirm the stub names the SAME org as the DB source at that
// index. Normalized comparison: lowercase + strip all non-alphanumeric, then
// equal-or-substring (min length 4). Chosen over exact match because the model
// paraphrases the org ("Get A Job" / "Get a Job" / "GetAJob") while still clearly
// distinguishing different employers (Guardio vs Get A Job). Empty on either side
// → cannot compare → never reject (fail open, no false rejects).
function normOrg(s: unknown): string {
  return String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}
function attributionStub(e: LlmEntry): string {
  // company_check (the A1 stub) or a stray company echo — NEVER title: a title is
  // not an org, so comparing it to src.company would falsely reject an honest entry
  // that echoed only a title (degrading it to responsibilities). Company only.
  const c = (e as any).company_check ?? (e as any).company;
  return typeof c === "string" ? c : "";
}
function stubMatchesSource(stub: string, src: SourceExperience): boolean {
  const a = normOrg(stub);
  const b = normOrg(src?.company);
  if (!a || !b) return true;
  if (a === b) return true;
  if (a.length >= 4 && b.includes(a)) return true;
  if (b.length >= 4 && a.includes(b)) return true;
  return false;
}

// Retention-floor coverage (P1). A stored bullet is "covered" by the emitted
// set when some emitted bullet is a reword of it — i.e. a majority of the stored
// bullet's significant content words reappear in one emitted bullet. This lets
// the floor restore only GENUINELY DROPPED stored bullets, never double a bullet
// the model already reworded. Deliberately lexical + threshold-based (no LLM):
// it must be deterministic and cheap. Errs toward restoring (a false "not
// covered" appends a near-duplicate — visible and fixable; a false "covered"
// would silently drop a stored bullet, which Eli's rule forbids).
const RETENTION_STOPWORDS = new Set([
  "the", "and", "for", "with", "this", "that", "from", "into", "your", "our",
  "their", "team", "role", "work", "using", "used", "across", "while", "which",
]);
function significantTokens(s: string): Set<string> {
  const out = new Set<string>();
  for (const t of String(s || "").toLowerCase().match(/[a-z0-9]{4,}/g) || []) {
    if (!RETENTION_STOPWORDS.has(t)) out.add(t);
  }
  return out;
}
export function bulletCoveredBy(stored: string, emitted: string[]): boolean {
  const s = significantTokens(stored);
  if (s.size === 0) return true; // no content to protect
  for (const e of emitted) {
    const es = significantTokens(e);
    let shared = 0;
    for (const t of s) if (es.has(t)) shared++;
    if (shared / s.size >= 0.5) return true; // majority of content words reworded through
  }
  return false;
}

// Retention floor (P1.1) — the FINAL word on experience bullets, run AFTER the
// proper-noun anti-fab enforcement (which strips bullets and would otherwise
// undo an earlier floor). For every experience, ensures every stored bullet
// appears: a stored bullet not covered by the surviving (reworded) bullets was
// dropped somewhere in the pipeline and is restored VERBATIM (appended) and
// flagged `deprioritized_bullets` (advisory "weakest for this role" for the P6
// UI). Verbatim-stored bullets are grounded by definition, so they are safe to
// add after anti-fab. Mutates `cvData` in place. `storedBulletsByKey` maps
// expKeyOf(title, company) -> that experience's stored bullets.
const RETENTION_BUCKETS = [
  "professional_experiences",
  "military_experiences",
  "volunteering_experiences",
  "leadership_experiences",
];
export function applyRetentionFloor(
  cvData: Record<string, any>,
  storedBulletsByKey: Map<string, string[]>,
  expKeyOf: (title: unknown, company: unknown) => string,
): { restored: number } {
  let restored = 0;
  for (const bucket of RETENTION_BUCKETS) {
    const entries = Array.isArray(cvData?.[bucket]) ? cvData[bucket] : [];
    for (const entry of entries) {
      const stored = (
        storedBulletsByKey.get(expKeyOf(entry?.title, entry?.company)) ?? []
      )
        .map((b) => String(b || "").trim())
        .filter(Boolean);
      if (stored.length === 0) continue;
      let bullets = Array.isArray(entry.bullets)
        ? entry.bullets.map((b: unknown) => String(b || "").trim()).filter(Boolean)
        : [];
      const deprioritized: string[] = [];
      for (const cb of stored) {
        if (!bulletCoveredBy(cb, bullets)) {
          bullets = [...bullets, cb];
          deprioritized.push(cb);
          restored++;
        }
      }
      entry.bullets = bullets;
      if (deprioritized.length > 0) entry.deprioritized_bullets = deprioritized;
      else if ("deprioritized_bullets" in entry) delete entry.deprioritized_bullets;
    }
  }
  return { restored };
}

export function fillFromSource(
  sources: SourceExperience[],
  llmEntries: LlmEntry[] | undefined | null,
  orgFieldName: string,
  opts?: { logger?: (msg: string) => void; warnings?: ReconcileWarning[]; bucket?: string; stampSourceId?: boolean; sourceIds?: (string | null | undefined)[]; verifyAttribution?: boolean },
): FilledEntry[] {
  const log = opts?.logger || ((msg: string) => console.warn(msg));
  const warnings = opts?.warnings;
  const bucket = opts?.bucket || orgFieldName;
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

  // Track which LLM entry produced each claim so the post-pass scan can
  // surface duplicate-index losses (LLM emitted idx=2 twice; only first
  // claims, second is silently dropped without entering pass 2).
  const claimedByEntry = new Set<number>();
  // A1: entries whose echoed attribution stub disagrees with the source at their
  // in-range index. Rejected outright — never claimed AND never positionally
  // rescued — so wrong bullets can never land under the wrong title.
  const rejectedByEntry = new Set<number>();

  // Normalize an llm-supplied `raw` index into a JSON-safe value for the
  // warning payload. Numbers and strings pass through; anything else
  // (null, undefined, objects, NaN bait) becomes null.
  const safeLlmIndex = (raw: unknown): number | string | null => {
    if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
    if (typeof raw === 'string') return raw;
    return null;
  };

  for (let j = 0; j < entries.length; j++) {
    const e = entries[j];
    if (!e) continue;
    const raw = e.index;
    const idx = Number(raw);
    const valid = Number.isInteger(idx) && idx >= 0 && idx < sources.length;
    if (valid && !bulletsBySource.has(idx)) {
      // A1: verify the LLM's echoed stub names the SAME org as sources[idx]
      // before trusting this in-range index. Only when a stub was echoed —
      // an entry with no stub is accepted (cannot verify → fail open).
      if (opts?.verifyAttribution) {
        const stub = attributionStub(e);
        if (stub && !stubMatchesSource(stub, sources[idx])) {
          rejectedByEntry.add(j);
          log(`[CV reconcile] bucket=${bucket} attribution_mismatch j=${j} llm_index=${idx} stub=${JSON.stringify(stub)} source_company=${JSON.stringify(sources[idx]?.company)}`);
          warnings?.push({ bucket, kind: 'attribution_mismatch', entry_position: j, llm_index: safeLlmIndex(raw), source_index: idx });
          continue;
        }
      }
      bulletsBySource.set(idx, cleanBullets(e.bullets));
      claimedByEntry.add(j);
    }
  }
  for (let j = 0; j < entries.length; j++) {
    const e = entries[j];
    if (!e) continue;
    const raw = e.index;
    const idx = Number(raw);
    const valid = Number.isInteger(idx) && idx >= 0 && idx < sources.length;
    if (valid) continue;
    if (rejectedByEntry.has(j)) continue; // A1: attribution-rejected — no positional rescue
    log(`[CV reconcile] LLM entry ${j} has out-of-range index=${raw} (sources.length=${sources.length}); positional fallback to source ${j}`);
    if (j < sources.length && !bulletsBySource.has(j)) {
      bulletsBySource.set(j, cleanBullets(e.bullets));
      claimedByEntry.add(j);
      // Slot j was claimed via positional rescue, not by a valid index
      // match. The LLM's bullets attach to source[j] regardless of which
      // source the LLM thought it was describing.
      log(`[CV reconcile] bucket=${bucket} positional_fallback j=${j} llm_index=${raw}`);
      warnings?.push({
        bucket,
        kind: 'positional_fallback',
        entry_position: j,
        llm_index: safeLlmIndex(raw),
        source_index: j,
      });
    }
  }

  // Post-pass scan — any LLM entry not in claimedByEntry was silently
  // dropped. Catches both (a) the agamf123-shape failure (out-of-range
  // index, j >= sources.length so positional fallback also failed) and
  // (b) duplicate-index entries where pass 1 first-wins skipped them.
  for (let j = 0; j < entries.length; j++) {
    const e = entries[j];
    if (!e || claimedByEntry.has(j) || rejectedByEntry.has(j)) continue;
    const raw = e.index;
    log(`[CV reconcile] bucket=${bucket} unclaimed_entry j=${j} llm_index=${raw} sources.length=${sources.length}`);
    warnings?.push({
      bucket,
      kind: 'unclaimed_entry',
      entry_position: j,
      llm_index: safeLlmIndex(raw),
    });
  }

  return sources.map((src, i) => {
    let bullets = bulletsBySource.get(i) || [];
    if (bullets.length === 0) {
      // PR #321 Phase-4 read side: when the LLM emitted no bullets for this
      // slot, prefer the user-curated bullets over splitting responsibilities.
      const curated = Array.isArray(src.bullets)
        ? src.bullets.map((b) => String(b || "").trim()).filter(Boolean)
        : [];
      bullets =
        curated.length > 0
          ? curated
          : responsibilitiesToBullets(src.responsibilities);
    }
    // NOTE: the retention floor (all stored bullets appear) is NOT applied here.
    // It runs POST-anti-fab (applyRetentionFloor, called from index.ts) so that
    // restored verbatim-stored bullets can't be stripped by the proper-noun
    // enforcement that runs after reconcile — the P1.1 fix.
    const out: FilledEntry = {
      title: src.title || "",
      dates: formatExperienceDates(src.start_date, src.end_date, !!src.is_current),
      bullets,
    };
    out[orgFieldName] = src.company || "";
    // Master addressability (Phase 2.0): stamp the authoritative DB source-row
    // id by the SAME index map used for title/company/dates above. Additive key,
    // gated to master mode via stampSourceId so the from-scratch / job-CV path is
    // byte-identical (no key added). Positional fallback only where no source row
    // id maps. Bullets stay bare strings — unchanged; every other consumer
    // (buildCvPdf included) ignores this extra key.
    if (opts?.stampSourceId) {
      out.experience_id = opts.sourceIds?.[i] || `${bucket}.${i}`;
    }
    return out;
  });
}


// A5 (gtc_author_from_app): when a linked application resolves, ITS role is
// authoritative for BOTH content and label. Return it as the authoring role so
// content matches the label — closing the "content wrong, label right" mask.
// `overridden` marks a caller target_role that disagreed (the caller should LOG
// it — observable, never silent). fromApp=false or no appRole → caller role
// unchanged (byte-identical).
export function resolveAuthoringRole(
  callerRole: string,
  appRole: string,
  fromApp: boolean,
): { role: string; overridden: boolean } {
  if (!fromApp || !appRole) return { role: callerRole, overridden: false };
  const overridden =
    appRole.trim().toLowerCase() !== String(callerRole ?? "").trim().toLowerCase();
  return { role: appRole, overridden };
}
