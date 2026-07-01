// Per-bullet reword resolution for refine-cv assembly, split out so it is
// unit-testable without the edge-function's top-level Deno.serve. A bullet is
// reworded toward the JD only when the model returned a REAL replacement that
// passes the anti-fab gate; otherwise the ORIGINAL bullet is kept whole. In
// particular a stripped/punctuation-only fragment (a failed reword that keeps the
// connectors but drops the words) must never replace the bullet.
import { tokensTraceToMaster } from "../_shared/cv-antifab.ts";

const REWORD_WORD_RE = /[A-Za-zÀ-ɏ֐-׿]{2,}/g;
const REWORD_LETTER_RE = /[A-Za-zÀ-ɏ֐-׿]/g;

// True when a reword is not a real bullet but the punctuation scaffolding of one
// (", , - .", "SQL — ; .", "VIP — , ."). Such fragments pass the anti-fab gate
// (they introduce no new quantified/proper-noun token) and would replace the real
// bullet with garble. Real prose always has >= 2 words, >= 8 letters, and at least
// one 4+ letter word; punctuation / acronym-only scaffolds do not.
export function isDegenerateReword(s: string): boolean {
  const t = (s ?? "").trim();
  const words = t.match(REWORD_WORD_RE) || [];
  const letters = (t.match(REWORD_LETTER_RE) || []).length;
  const hasRealWord = /[A-Za-zÀ-ɏ֐-׿]{4,}/.test(t);
  return words.length < 2 || letters < 8 || !hasRealWord;
}

// Resolve one experience's bullets. `rewordById` maps `${expId}#${i}` -> new_text.
// Returns the resolved bullets (same count as masterBullets, never dropped) and a
// count of rejected rewordings (degenerate or anti-fab failures) for telemetry.
export function resolveBullets(
  masterBullets: string[],
  expId: string | null,
  rewordById: Map<string, string>,
  expHaystack: string,
): { bullets: string[]; rejected: number } {
  let rejected = 0;
  const bullets = masterBullets.map((orig, i) => {
    if (!expId) return orig; // no addressable id -> keep verbatim
    const reword = rewordById.get(`${expId}#${i}`);
    if (reword == null) return orig;
    // A stripped/punctuation-only reword must NEVER replace the bullet with
    // scaffolding -> keep the original words whole.
    if (isDegenerateReword(reword)) {
      rejected++;
      return orig;
    }
    // Anti-fab gate: a reword may only re-phrase; every quantified / proper-noun
    // token must already exist in THIS experience's master content.
    if (tokensTraceToMaster(reword, expHaystack)) return reword;
    rejected++;
    return orig;
  });
  return { bullets, rejected };
}
