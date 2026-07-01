// Near-duplicate bullet detection for "add to CV".
//
// BUG 1: the old dedupe (appendBullets -> dedupeAppend) only caught EXACT
// normalized matches, so a paraphrase of an existing bullet ("Redesigned the
// social media auto-moderation system" saved twice with minor wording) slipped
// through and accumulated every time the user hit "add to CV".
//
// This module is a CONSERVATIVE token-overlap detector: the threshold is set high
// enough to catch clear paraphrases but low enough that it never collapses two
// genuinely-distinct bullets. On a hit we FLAG (never silently drop) so the UI can
// ask "this looks similar to an existing bullet — add anyway, replace, or skip?".
// The user stays in control and can say "these are different, keep both".
//
// Pure functions only (no Supabase / network) so the thresholds are unit-tested
// in isolation. coachActionHandlers.appendBullets consumes classifyBullets.

import { stripHtml } from "../../scripts/lib/normalize.ts";

// Function words carry no dedup signal and inflate overlap on short bullets, so we
// drop them before comparing. Deliberately small — over-stripping makes distinct
// bullets look alike.
const BULLET_STOPWORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "to",
  "of",
  "for",
  "in",
  "on",
  "with",
  "by",
  "at",
  "as",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "this",
  "that",
  "it",
  "its",
  "i",
  "my",
  "our",
  "we",
  "their",
  "his",
  "her",
  "from",
  "into",
  "than",
]);

// Content tokens: html-stripped, lowercased, split on punctuation, stopwords
// dropped, and a trailing plural "s" folded ("systems" -> "system") so a
// plural/singular paraphrase still matches. Returns a Set of unique tokens.
export const bulletTokens = (s) => {
  const clean = String(stripHtml(String(s ?? "")) ?? "").toLowerCase();
  const set = new Set();
  for (let w of clean.split(/[^a-z0-9]+/)) {
    if (!w || BULLET_STOPWORDS.has(w)) continue;
    if (w.length > 3 && w.endsWith("s")) w = w.slice(0, -1);
    set.add(w);
  }
  return set;
};

// Whole-string normalization for the exact-match short-circuit (mirrors the old
// dedupeAppend key: html-stripped, lowercased, whitespace-collapsed).
export const bulletNormExact = (s) =>
  String(stripHtml(String(s ?? "")) ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

// 0..1 similarity. max(Jaccard, containment), where containment only counts when
// the SHORTER bullet is substantial (>= 4 content words). That guard is what keeps
// the check conservative: a short generic phrase ("managed the team") sitting
// inside a long distinct bullet has containment 1.0 but is NOT a duplicate, so we
// ignore containment for tiny bullets and fall back to Jaccard (which penalizes
// the length gap). A real paraphrase-with-extra-clause keeps a substantial shorter
// side and is caught via containment.
export const bulletSimilarity = (a, b) => {
  const A = bulletTokens(a);
  const B = bulletTokens(b);
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  const union = A.size + B.size - inter;
  const jaccard = inter / union;
  const smaller = Math.min(A.size, B.size);
  const containment = smaller >= 4 ? inter / smaller : 0;
  return Math.max(jaccard, containment);
};

// NEAR: clear paraphrase, high confidence duplicate. BORDERLINE: the "ask the
// user" band (e.g. "customer support team" vs "customer success team" — same
// shape, one word differs, could be two real bullets). Below BORDERLINE we treat
// bullets as distinct and append with no prompt.
export const BULLET_NEAR_THRESHOLD = 0.8;
export const BULLET_BORDERLINE_THRESHOLD = 0.65;

// Best duplicate of `bullet` within `existingList`, or null when nothing crosses
// the borderline threshold (genuinely distinct). Exact match short-circuits.
export const findNearDuplicate = (bullet, existingList) => {
  const exact = bulletNormExact(bullet);
  let best = null;
  for (const cand of existingList || []) {
    if (bulletNormExact(cand) === exact) {
      return { match: cand, similarity: 1, tier: "exact" };
    }
    const sim = bulletSimilarity(bullet, cand);
    if (!best || sim > best.similarity) best = { match: cand, similarity: sim };
  }
  if (!best) return null;
  if (best.similarity >= BULLET_NEAR_THRESHOLD)
    return { ...best, tier: "near" };
  if (best.similarity >= BULLET_BORDERLINE_THRESHOLD)
    return { ...best, tier: "borderline" };
  return null;
};

// Split incoming bullets against the existing set (and against each other) into
// { append } (clean, safe to add now) and { flagged } (near/borderline dupes the
// UI must resolve). Exact dupes are a silent no-op — re-adding byte-identical text
// loses nothing and needs no decision. Near/borderline are NEVER dropped: they go
// to `flagged` with the matched existing bullet so the UI can prompt.
export const classifyBullets = (existing, incoming) => {
  const append = [];
  const flagged = [];
  const pool = [...(existing || [])]; // grows as we accept, so a duplicated
  // incoming bullet in the same batch is caught against an earlier one too.
  for (const raw of incoming || []) {
    const v = String(raw ?? "").trim();
    if (!v) continue;
    const hit = findNearDuplicate(v, pool);
    if (!hit) {
      append.push(v);
      pool.push(v);
      continue;
    }
    if (hit.tier === "exact") continue;
    flagged.push({
      bullet: v,
      match: hit.match,
      similarity: hit.similarity,
      tier: hit.tier,
    });
  }
  return { append, flagged };
};
