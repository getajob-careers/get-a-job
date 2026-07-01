// Hebrew -> English enforcement for generated CVs. Product rule: a generated CV
// is ALWAYS English (understand Hebrew input, execute in English output). Any
// Hebrew in the CV-bound cv_data is translated to English before tailoring and
// render, so Hebrew never reaches the renderer. Gated on Hebrew detection: an
// all-English CV returns the SAME object with no model call (zero-cost no-op).
//
// This module is pure (no network import) so it unit-tests without a live model:
// the caller injects a ChatFn. The strict anti-fabrication contract lives in the
// prompt below and is the single source of truth for translation behavior.

const HEBREW = /[֐-׿יִ-ﭏ]/;

export function cvHasHebrew(value: unknown): boolean {
  if (typeof value === "string") return HEBREW.test(value);
  if (Array.isArray(value)) return value.some(cvHasHebrew);
  if (value && typeof value === "object")
    return Object.values(value as Record<string, unknown>).some(cvHasHebrew);
  return false;
}

function collect(value: unknown, out: Set<string>): void {
  if (typeof value === "string") {
    if (HEBREW.test(value)) out.add(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const v of value) collect(v, out);
    return;
  }
  if (value && typeof value === "object") {
    for (const v of Object.values(value as Record<string, unknown>))
      collect(v, out);
  }
}

function replaceDeep(value: any, map: Map<string, string>): any {
  if (typeof value === "string")
    return map.has(value) ? map.get(value)! : value;
  if (Array.isArray(value)) return value.map((v) => replaceDeep(v, map));
  if (value && typeof value === "object") {
    const out: Record<string, any> = {};
    for (const k of Object.keys(value)) out[k] = replaceDeep(value[k], map);
    return out;
  }
  return value;
}

export type ChatMessage = { role: string; content: string };
export type ChatFn = (messages: ChatMessage[]) => Promise<string>;

// The anti-fabrication contract. Translation ONLY converts language; it must not
// change, add, or strengthen any claim.
export const TRANSLATE_SYSTEM_PROMPT = `You are a professional translator localizing a job CV into English. You receive JSON {"strings": [ ... ]}. Translate EACH string to natural, professional English and return JSON {"translations": [ ... ]} with EXACTLY the same number of items in the SAME order.

CRITICAL RULES:
- Translate faithfully and literally. Preserve every fact, number, metric, percentage, date, duration, and scope EXACTLY. A translated line must make the SAME claim as the source and nothing stronger.
- Do NOT embellish, add accomplishments, inflate numbers, upgrade titles, or invent context. Add no words that were not present or directly implied by the source.
- If a string is already fully English (contains no Hebrew), return it UNCHANGED.
- For company, organization, and institution names, use the established English name when one exists (e.g. "מכבי שירותי בריאות" -> "Maccabi Healthcare Services"; "אוניברסיטת תל אביב" -> "Tel Aviv University"; "צה\\"ל" -> "IDF"). Otherwise transliterate.
- Transliterate a person's name (do not translate it into an English word).
- Keep tone and length close to the source; concise and professional.
- Output JSON only, no markdown.`;

const HEBREW_GLOBAL = new RegExp(HEBREW.source, "g");

// Last-resort scrub for a string we could not translate (a failed batch, or the
// model echoed Hebrew back). Product rule: a generated CV is ALWAYS English, so
// we DROP the Hebrew rather than leak it. Any Latin/number fragments survive;
// a pure-Hebrew string collapses to "" (an empty bullet the renderer omits).
// Losing that fragment is strictly better than shipping Hebrew to the PDF.
function stripHebrew(s: string): string {
  return s.replace(HEBREW_GLOBAL, " ").replace(/\s+/g, " ").trim();
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// Translate every Hebrew-containing string in cv_data to English via the injected
// chat function. Returns a new cv_data.
//
// Robustness (why this is chunked, not one call): a large Hebrew CV can carry
// dozens of long strings; a single translate call can then blow the output-token
// budget or come back the wrong length, and the OLD behavior was to return the
// source unchanged, which LEAKED Hebrew into the render. Now:
//   - the strings are chunked so no single call is oversized;
//   - each batch retries on model error / malformed / wrong-length output;
//   - a batch that still fails after retries has its Hebrew DROPPED (stripHebrew),
//     never leaked. Batches are independent, so one bad batch cannot sink the rest.
// The guarantee: the returned cv_data contains NO Hebrew. No fabrication either:
// dropping removes content, it never invents a claim.
export async function translateCvToEnglish(
  cvData: any,
  chat: ChatFn,
  opts: { batchSize?: number; retries?: number } = {},
): Promise<any> {
  if (!cvHasHebrew(cvData)) return cvData; // no-op for all-English CVs
  const set = new Set<string>();
  collect(cvData, set);
  const strings = [...set];
  if (strings.length === 0) return cvData;

  const batchSize = Math.max(1, opts.batchSize ?? 40);
  const retries = Math.max(0, opts.retries ?? 2);

  // One batch -> same-length string[] on success, or null when the model errors
  // or returns malformed / wrong-length output on every attempt.
  const translateBatch = async (batch: string[]): Promise<string[] | null> => {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const raw = await chat([
          { role: "system", content: TRANSLATE_SYSTEM_PROMPT },
          { role: "user", content: JSON.stringify({ strings: batch }) },
        ]);
        const cleaned = String(raw ?? "")
          .replace(/```json|```/g, "")
          .trim();
        const arr = JSON.parse(cleaned)?.translations;
        if (Array.isArray(arr) && arr.length === batch.length) {
          return arr.map((t) => String(t ?? ""));
        }
      } catch {
        // fall through to the next attempt
      }
    }
    return null;
  };

  const map = new Map<string, string>();
  for (const batch of chunk(strings, batchSize)) {
    const out = await translateBatch(batch);
    batch.forEach((src, i) => {
      const t = out ? out[i].trim() : "";
      // Never ship Hebrew: an empty translation (failed batch) or one that still
      // contains Hebrew (model echoed the source) is dropped to its non-Hebrew
      // remainder. A clean English translation is used as-is.
      map.set(src, t && !cvHasHebrew(t) ? t : stripHebrew(src));
    });
  }
  return replaceDeep(cvData, map);
}

// Deterministic, no-LLM Hebrew scrub. Drops every Hebrew string to its non-Hebrew
// remainder (the same last-resort rule translateCvToEnglish uses on a failed
// batch). Used by the render chokepoint when no model is available, so a CV is
// NEVER rendered with Hebrew even without a translate call. No-op (same object)
// for an all-English cv_data. Removes content, never invents a claim.
export function stripCvHebrew(cvData: any): any {
  if (!cvHasHebrew(cvData)) return cvData;
  const set = new Set<string>();
  collect(cvData, set);
  const map = new Map<string, string>();
  for (const s of set) map.set(s, stripHebrew(s));
  return replaceDeep(cvData, map);
}
