// Shared fence-tolerant JSON parser for LLM responses.
//
// Used by edge functions whose model output cannot be assumed to be bare JSON
// — chiefly the Sonnet-via-OpenRouter branch of generate-tailored-cv, which
// failed twice in production on 2026-06-10 with `error_code = 'json_parse'`
// despite the function having a three-tier defensive parser inline. The old
// inline Tier 2 (`/```(?:json)?\s*\n?([\s\S]*?)```/i`) is a non-greedy regex
// that terminates at the first ``` it sees — which is fine for clean fenced
// output but breaks if the JSON's STRING VALUES contain triple-backticks
// (Sonnet legitimately does this when describing code or pasting examples).
// The old inline Tier 3 (`/\{[\s\S]*\}/`) is a greedy regex that is not
// quote-aware, so a JSON-string-internal `{` followed by a JSON-string-
// internal `}` could be matched out of context. Both tiers degrade
// silently — the function returns error_code='json_parse' with no raw
// dump, leaving us unable to triage from the metric row alone.
//
// This module replaces both fragile regex tiers with a single
// string/escape-aware brace-balanced scan. The algorithm mirrors
// ai-chat/prompt-lib.ts's extractJsonBlock but without the marker prefix
// (the chat agent block-extractor was already fixed in PR #298; this is the
// non-marker shape the CV pipeline needs). The same module is unit-tested
// here so any future regression is caught before deploy.
//
// Public surface:
//   parseLlmJsonObject(raw, label, finishReason) — returns the parsed
//     object on first success; throws a structured Error (with label,
//     finish_reason, and a 120-char preview) when all tiers fail. NEVER
//     returns null/{} on failure — the caller's catch branch maps the
//     thrown Error into the user-facing 500 + function_metrics.error_code.
//
// Tier order (each tier no-ops the next on success):
//   1. bare JSON.parse — gpt-4o + response_format: json_object hits this.
//   2. fence-open + balanced extraction from the first `{`/`[` after the
//      fence opener — Sonnet's ```json\n{...}\n``` shape.
//   3. balanced extraction scanned from EVERY `{`/`[` in the entire
//      string, taking the longest parseable result — handles prose
//      preamble/suffix, missing fence-close, and multi-object responses
//      where the largest balanced region is the intended payload.

export interface ParseResult {
  parsed: unknown;
}

const FENCE_OPENER_RE = /```(?:json|jsonc|json5)?\s*\n?/i;

// Returns the slice from `start` covering the first balanced JSON region
// ({...} or [...]) considering JSON string quoting + escapes — so a `}`
// inside a "string value" doesn't close the outer brace. Returns null when
// no balanced region exists (no opener, or unterminated payload).
function extractBalancedJsonSlice(s: string, start: number): string | null {
  let i = start;
  while (i < s.length && s[i] !== "{" && s[i] !== "[") i++;
  if (i >= s.length) return null;

  const openChar = s[i];
  const closeChar = openChar === "{" ? "}" : "]";
  const sliceStart = i;
  let depth = 0;
  let inString = false;
  let escape = false;

  for (; i < s.length; i++) {
    const ch = s[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\" && inString) {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === openChar) depth++;
    else if (ch === closeChar) {
      depth--;
      if (depth === 0) return s.slice(sliceStart, i + 1);
    }
  }
  return null;
}

// All balanced JSON slices starting at each opener position, sorted by
// length descending. Used as the Tier 3 last resort — longest is the most
// likely intended payload (an outer object containing nested objects has
// the largest length).
function allBalancedSlices(s: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "{" || ch === "[") {
      const slice = extractBalancedJsonSlice(s, i);
      if (slice) out.push(slice);
    }
  }
  return out.sort((a, b) => b.length - a.length);
}

function tryParse(s: string): unknown | null {
  try {
    const v = JSON.parse(s);
    return v;
  } catch {
    return null;
  }
}

const isObjectLike = (v: unknown): boolean =>
  v !== null && typeof v === "object";

export function parseLlmJsonObject(
  rawContent: string,
  label: string,
  finishReason: string,
): unknown {
  const raw = String(rawContent ?? "");

  // Tier 1: bare JSON. gpt-4o + response_format: json_object always lands
  // here. Default branch fast path stays unchanged from the original
  // inline parser.
  let parsed = tryParse(raw);
  if (isObjectLike(parsed)) return parsed;

  // Tier 2: fence opener + balanced extraction. Handles ```json\n{...}\n```
  // and the variants ```jsonc / ```json5 / bare ``` with optional language
  // tag. The extraction is quote-aware, so a triple-backtick INSIDE a JSON
  // string value (the failure mode the old non-greedy regex hit) is not
  // treated as a fence close.
  const fenceMatch = raw.match(FENCE_OPENER_RE);
  if (fenceMatch && fenceMatch.index != null) {
    const afterFence = fenceMatch.index + fenceMatch[0].length;
    const slice = extractBalancedJsonSlice(raw, afterFence);
    if (slice) {
      parsed = tryParse(slice);
      if (isObjectLike(parsed)) return parsed;
    }
  }

  // Tier 3: take the largest balanced region from anywhere in the string.
  // Catches prose preamble + bare JSON, JSON + trailing prose, fence
  // present but malformed, multiple top-level JSON objects (pick the
  // largest — most likely the intended payload).
  for (const slice of allBalancedSlices(raw)) {
    parsed = tryParse(slice);
    if (isObjectLike(parsed)) return parsed;
  }

  const preview = raw.trim().slice(0, 120).replace(/\s+/g, " ");
  throw new Error(
    `AI returned unparseable response (label=${label}, finish_reason=${finishReason || "unknown"}, preview="${preview}"). Please try again.`,
  );
}
