// cv-enforce-invariants.ts — THE single CV chokepoint. One pure(-ish) function,
// run as the LAST transform before any authoring path persists (or returns)
// cv_data, so `cv_data` is clean-at-rest and the two renderers (buildCvPdf and
// the Studio preview) can no longer diverge. See
// docs/research/cv-consolidation-step1-chokepoint-scoping.md (SIGNED).
//
// It does NOT re-implement the invariants — it COMPOSES the existing, tested
// helpers in a fixed order:
//   1. proper-noun trace-to-master + no-empty restore + numbers-flag-only
//      (enforceBulletProperNouns, _shared/cv-antifab.ts)
//   2. first-person / voice normalization at position 0
//      (normalizeCvDataBullets, _shared/cv-master.ts)
//   3. English-only / Hebrew gate
//      (cvHasHebrew + translateCvToEnglish | stripCvHebrew, _shared/cv-translate.ts)
//
// IDEMPOTENT: enforceCvInvariants(enforceCvInvariants(x)) deep-equals
// enforceCvInvariants(x). Each composed step is individually idempotent and the
// steps do not interfere (voice touches position 0 only; the proper-noun scan is
// mid-sentence + quantified-token only; the Hebrew gate is a no-op once English).
// Idempotency is what makes render-cv's retained at-render net a safe no-op and
// makes the rollout reversible (flag OFF restores the exact legacy path).
//
// Pure w.r.t. the input: the input cv_data is never mutated (deep-cloned first;
// enforceBulletProperNouns mutates in place, so it runs on the clone).

// deno-lint-ignore-file no-explicit-any

import { enforceBulletProperNouns } from "./cv-antifab.ts";
import { normalizeCvDataBullets } from "./cv-master.ts";
import { EXPERIENCE_BUCKETS } from "./cv-schema.ts";
import {
  cvHasHebrew,
  translateCvToEnglish,
  stripCvHebrew,
  type ChatFn,
} from "./cv-translate.ts";

type CvData = Record<string, any>;

export interface EnforceInvariantsOpts {
  // Override the proper-noun trace corpus (already lowercased). gtc passes its
  // richer source (stories / proof-signals / skills / projects), not just the
  // master cv_data. When omitted, it is derived from `master` (JSON-stringified,
  // lowercased) — the master cv_data is the user's own verified content, so a
  // token absent from it is a fabrication.
  sourceHaystackLower?: string;
  // Override the no-empty restore source (expKey -> that experience's master
  // bullets). When omitted, derived from `master`'s four experience buckets.
  masterBulletsByKey?: Map<string, string[]>;
  // Key an experience by (title, company). Must match how masterBulletsByKey was
  // built. Defaults to the same title@@company scheme gtc uses.
  expKeyOf?: (title: unknown, company: unknown) => string;
  // Hebrew gate: when Hebrew remains and a translate fn is provided, translate to
  // English; otherwise strip deterministically (no model). Callers whose path has
  // already translated upstream can omit this — the deterministic strip is the
  // safety net that still guarantees no Hebrew ships. Omit in tests (no network).
  translate?: ChatFn;
  // For the one-line telemetry the caller logs. Not used for behavior.
  path?: string;
}

export interface EnforceInvariantsResult {
  cv_data: CvData;
  // bullets dropped for an unsourced proper-noun token (telemetry)
  bulletsEnforced: number;
  // experiences restored to master because enforcement emptied them (no-empty)
  experiencesRestored: number;
  // unsourced NUMBER tokens: flagged for user review, NEVER removed
  flags: { bucket: string; bullet: string; tokens: string[] }[];
  // bullets whose text changed under the voice/caps normalizer (telemetry)
  bulletsRevoiced: number;
  // what the Hebrew gate did
  hebrew: "none" | "translated" | "stripped";
  // whether a JD was in play (reserved: JD-widened summary tracing is a later
  // step; surfaced here so the flip is observable per-path).
  jdPresent: boolean;
}

const DEFAULT_EXP_KEY = (t: unknown, c: unknown): string =>
  `${String(t ?? "").trim().toLowerCase()}@@${
    String(c ?? "").trim().toLowerCase()
  }`;

// Build expKey -> master bullets from a master cv_data object (the four
// experience buckets). Used only for the no-empty restore, so a fabricating
// bullet that empties an experience is replaced by that experience's real master
// bullets instead of leaving the section blank.
function deriveMasterBulletsByKey(
  master: any,
  expKeyOf: (t: unknown, c: unknown) => string,
): Map<string, string[]> {
  const map = new Map<string, string[]>();
  if (!master || typeof master !== "object") return map;
  for (const b of EXPERIENCE_BUCKETS) {
    const list = (master as any)[b.cvKey];
    if (!Array.isArray(list)) continue;
    for (const entry of list) {
      const bullets = Array.isArray(entry?.bullets)
        ? entry.bullets.map((x: unknown) => String(x ?? "").trim()).filter(
          Boolean,
        )
        : [];
      // enforceBulletProperNouns keys every bucket by (title, company); the org
      // field of non-professional buckets is undefined, so the key is title-only
      // there — consistent as long as BOTH sides use entry.company.
      map.set(expKeyOf(entry?.title, (entry as any)?.company), bullets);
    }
  }
  return map;
}

const BUCKET_KEYS = EXPERIENCE_BUCKETS.map((b) => b.cvKey);

// Count bullets whose text changed between two cv_data objects across the four
// experience buckets — used for the [cv-enforce] telemetry only.
function countRevoiced(before: CvData, after: CvData): number {
  let n = 0;
  for (const k of BUCKET_KEYS) {
    const a = Array.isArray(before?.[k]) ? before[k] : [];
    const b = Array.isArray(after?.[k]) ? after[k] : [];
    for (let i = 0; i < b.length; i++) {
      const ba = Array.isArray(a[i]?.bullets) ? a[i].bullets : [];
      const bb = Array.isArray(b[i]?.bullets) ? b[i].bullets : [];
      for (let j = 0; j < bb.length; j++) {
        if (String(ba[j] ?? "") !== String(bb[j] ?? "")) n++;
      }
    }
  }
  return n;
}

// Deterministic voice scrub: banned LLM-tell verbs -> plain verbs, and the em
// dash (U+2014) -> " - " (surrounding spaces collapsed, so "a — b" and "a—b"
// both become "a - b"). PRESERVES U+2013 (en dash) — the server-stamped
// date-range separator (reconcile.ts formatExperienceDates). Walks EVERY string
// field in cv_data recursively, mutating in place, and returns the same object.
// Idempotent: outputs contain none of the banned tokens. Extracted from gtc's
// post-LLM strip so refine-cv and edit-cv share the guarantee — their LLMs emit
// em dashes that otherwise reach the DB, and the Studio "Tailor" path (the main
// tailoring surface) runs through refine-cv, which had no scrub.
const BANNED_VERB_REPLACEMENTS: Array<[RegExp, (m: string) => string]> = [
  [/\b(U|u)tilized\b/g, (m) => (m[0] === "U" ? "Used" : "used")],
  [/\b(U|u)tilizes\b/g, (m) => (m[0] === "U" ? "Uses" : "uses")],
  [/\b(U|u)tilize\b/g, (m) => (m[0] === "U" ? "Use" : "use")],
  [/\b(U|u)tilizing\b/g, (m) => (m[0] === "U" ? "Using" : "using")],
  [/\b(L|l)everaged\b/g, (m) => (m[0] === "L" ? "Used" : "used")],
  [/\b(L|l)everages\b/g, (m) => (m[0] === "L" ? "Uses" : "uses")],
  [/\b(L|l)everage\b/g, (m) => (m[0] === "L" ? "Use" : "use")],
  [/\b(L|l)everaging\b/g, (m) => (m[0] === "L" ? "Using" : "using")],
  [/\b(M|m)ade use of\b/g, (m) => (m[0] === "M" ? "Used" : "used")],
  [/\b(S|s)pearheaded\b/g, (m) => (m[0] === "S" ? "Led" : "led")],
  [/\b(S|s)pearheading\b/g, (m) => (m[0] === "S" ? "Leading" : "leading")],
  [/\b(S|s)pearhead\b/g, (m) => (m[0] === "S" ? "Lead" : "lead")],
  [/\b(O|o)rchestrated\b/g, (m) => (m[0] === "O" ? "Led" : "led")],
  [/\b(O|o)rchestrating\b/g, (m) => (m[0] === "O" ? "Leading" : "leading")],
  [/\b(O|o)rchestrate\b/g, (m) => (m[0] === "O" ? "Lead" : "lead")],
  // em dash (U+2014) -> " - ". DO NOT touch U+2013 (en dash) — server-stamped.
  [/\s*—\s*/g, () => " - "],
];
function deBanish(text: string): string {
  let out = text;
  for (const [re, fn] of BANNED_VERB_REPLACEMENTS) out = out.replace(re, fn);
  return out;
}
export function scrubCvVoice<T>(obj: T): T {
  if (obj == null) return obj;
  if (typeof obj === "string") return deBanish(obj) as unknown as T;
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) obj[i] = scrubCvVoice(obj[i]);
    return obj;
  }
  if (typeof obj === "object") {
    for (const k of Object.keys(obj as Record<string, unknown>)) {
      (obj as Record<string, unknown>)[k] = scrubCvVoice(
        (obj as Record<string, unknown>)[k],
      );
    }
    return obj;
  }
  return obj;
}

// THE chokepoint. Normalize `cvData` to the project invariants and return a new
// object (input untouched). `master` is the trace/restore source (the master
// cv_data for gtc/refine; the PRE-EDIT cv_data for edit-cv). `jd` is the job
// description text or null. `opts` lets a caller inject a richer trace corpus and
// a translate fn.
export async function enforceCvInvariants(
  cvData: CvData,
  master: any,
  jd: unknown,
  opts: EnforceInvariantsOpts = {},
): Promise<EnforceInvariantsResult> {
  // Deep clone so the caller's object is never mutated (enforceBulletProperNouns
  // mutates entry.bullets in place). cv_data is JSON-serializable by contract
  // (it is persisted as JSON), so a JSON round-trip is a safe deep clone.
  const cloned: CvData = cvData && typeof cvData === "object"
    ? JSON.parse(JSON.stringify(cvData))
    : {};

  const expKeyOf = opts.expKeyOf ?? DEFAULT_EXP_KEY;
  const sourceHaystackLower = opts.sourceHaystackLower ??
    (master ? JSON.stringify(master).toLowerCase() : "");
  const masterBulletsByKey = opts.masterBulletsByKey ??
    deriveMasterBulletsByKey(master, expKeyOf);

  // 1. proper-noun / numbers / no-empty. Mutates `cloned` in place.
  const enf = enforceBulletProperNouns(
    cloned,
    sourceHaystackLower,
    masterBulletsByKey,
    expKeyOf,
  );

  // 2. voice / caps (returns a new object; never mutates its input).
  const voiced = normalizeCvDataBullets(cloned);
  const bulletsRevoiced = countRevoiced(cloned, voiced);

  // 3. English-only / Hebrew gate.
  let out: CvData = voiced;
  let hebrew: EnforceInvariantsResult["hebrew"] = "none";
  if (cvHasHebrew(out)) {
    if (opts.translate) {
      out = await translateCvToEnglish(out, opts.translate);
      hebrew = "translated";
    } else {
      out = stripCvHebrew(out);
      hebrew = "stripped";
    }
  }

  // 4. Deterministic voice scrub (banned verbs + em dash). LAST so it also
  // catches anything the Hebrew translate reintroduced. Mutates `out` in place;
  // `out` is always a fresh object here (clone -> normalize/translate output).
  scrubCvVoice(out);

  return {
    cv_data: out,
    bulletsEnforced: enf.bulletsEnforced,
    experiencesRestored: enf.experiencesRestored,
    flags: enf.flags,
    bulletsRevoiced,
    hebrew,
    jdPresent: !!(jd && String(jd).trim()),
  };
}
