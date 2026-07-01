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

// Translate every Hebrew-containing string in cv_data to English via the injected
// chat function. Returns a new cv_data. On any failure (model error, malformed
// or wrong-length output) the ORIGINAL cv_data is returned unchanged: worst case
// the Hebrew renders via the David Libre safety-net font instead of being lost,
// never a crash and never a fabricated claim.
export async function translateCvToEnglish(
  cvData: any,
  chat: ChatFn,
): Promise<any> {
  if (!cvHasHebrew(cvData)) return cvData; // no-op for all-English CVs
  const set = new Set<string>();
  collect(cvData, set);
  const strings = [...set];
  if (strings.length === 0) return cvData;

  let translations: unknown;
  try {
    const raw = await chat([
      { role: "system", content: TRANSLATE_SYSTEM_PROMPT },
      { role: "user", content: JSON.stringify({ strings }) },
    ]);
    const cleaned = String(raw ?? "")
      .replace(/```json|```/g, "")
      .trim();
    translations = JSON.parse(cleaned)?.translations;
  } catch {
    return cvData; // model/parse failure -> keep source (non-fatal, no fabrication)
  }
  if (!Array.isArray(translations) || translations.length !== strings.length) {
    return cvData; // shape mismatch -> keep source
  }
  const map = new Map<string, string>();
  strings.forEach((src, i) => {
    const t = String((translations as unknown[])[i] ?? "").trim();
    map.set(src, t || src); // empty translation -> keep source
  });
  return replaceDeep(cvData, map);
}
