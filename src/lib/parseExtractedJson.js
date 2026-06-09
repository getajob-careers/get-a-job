// Hardened JSON parser for the resume-extractor reply. Extracted from
// StepResumeUpload.jsx into a standalone module so the unit tests at
// src/test/resume.extraction.test.js can import without transitively
// loading supabaseClient.js (which throws in CI when VITE_SUPABASE_*
// env vars aren't set).
//
// The four passes in order:
//   1. Direct JSON.parse — clean JSON (response_format=json_object route)
//   2. ```json``` fence strip
//   3. Balanced-brace walk from first `{` to its matching `}` — stops
//      at the first balanced close so trailing-prose objects can't
//      pollute the captured slice (the production failure that lost
//      4 of 19 pilot users to silent dropped experiences)
//   4. Legacy double-escape pass for backwards-compat
//
// Returns the parsed object on success, null on total failure.

export function parseExtractedJson(replyText) {
  if (typeof replyText !== "string" || !replyText.trim()) return null;

  // 1. direct parse
  try {
    const direct = JSON.parse(replyText);
    if (direct && typeof direct === "object") return direct;
  } catch { /* fall through */ }

  // 2. ```json fence strip
  const fenceMatch = replyText.match(/```(?:json)?\s*\n?([\s\S]*?)```/i);
  if (fenceMatch) {
    try {
      const fenced = JSON.parse(fenceMatch[1]);
      if (fenced && typeof fenced === "object") return fenced;
    } catch { /* fall through */ }
  }

  // 3. balanced-brace match. Walk from first `{` tracking depth, ignoring
  //    braces inside strings (with escape-awareness). Stops at the matching
  //    `}`, so trailing prose or a second object can't break the parse.
  const first = replyText.indexOf("{");
  if (first >= 0) {
    let depth = 0;
    let inString = false;
    let escape = false;
    let end = -1;
    for (let i = first; i < replyText.length; i++) {
      const ch = replyText[i];
      if (escape) { escape = false; continue; }
      if (ch === "\\") { escape = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (ch === "{") depth++;
      else if (ch === "}") { depth--; if (depth === 0) { end = i; break; } }
    }
    if (end > first) {
      const slice = replyText.slice(first, end + 1);
      try {
        const braced = JSON.parse(slice);
        if (braced && typeof braced === "object") return braced;
      } catch { /* fall through */ }
      // 4. legacy double-escape pass against the balanced slice
      if (/\{\s*\\"/.test(slice)) {
        try {
          const unescaped = slice.replace(/\\"/g, '"').replace(/\\n/g, "\n").replace(/\\t/g, "\t");
          const fixed = JSON.parse(unescaped);
          if (fixed && typeof fixed === "object") return fixed;
        } catch { /* fall through */ }
      }
    }
  }
  return null;
}
