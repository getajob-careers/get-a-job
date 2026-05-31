// strip-html.ts — Deno-runtime mirror of scripts/lib/normalize.ts stripHtml.
//
// Why a duplicate: scripts/lib/* is Node TypeScript (used by tsx CLI +
// Vitest); edge functions are Deno (ESM via https-imports, no
// node_modules). Cross-runtime imports would need a build step we don't
// have. Two copies, kept in lockstep by src/test/stripHtmlParity.test.js
// which asserts identical output on a fixed corpus and fails CI on drift.
//
// PARITY CONTRACT: this implementation MUST byte-match
// scripts/lib/normalize.ts stripHtml(). Any change here must be made
// there too.
//
// Used at LLM-input boundaries (generate-tailored-cv,
// analyze-job-match, extract-job-requirements, ai-chat) as a defense-
// in-depth strip. The primary cleaning happens at ingestion
// (refresh-jobs) and at user-paste write sites; this guards against
// dirty data slipping through either of those.

export function stripHtml(input: string | null): string | null {
  if (input == null) return null;
  return input
    // STEP 1 (load-bearing): decode entities FIRST. Greenhouse + SAP
    // SuccessFactors return HTML that's been ENCODED for transport
    // (`&lt;p&gt;...&lt;/p&gt;`). If entity-decode runs LAST (the
    // original ordering), the tag-strip regexes below see no literal
    // `<` and pass through — then the final decode turns `&lt;p&gt;`
    // into real `<p>` tags in the output. Bug surfaced on 2026-05-31
    // (greenhouse 1147/1147 + SF 299/301 dirty in jobs.description).
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&hellip;/g, "…")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&#(\d+);/g, (_, n: string) => {
      const code = parseInt(n, 10);
      return code > 0 && code < 0x10000 ? String.fromCharCode(code) : " ";
    })
    // STEP 2: drop scripts/styles wholesale before tag stripping (their
    // contents are JS/CSS, not human text)
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/(?:script|style)>/gi, " ")
    // STEP 3: convert <br> and block-level closing tags to newlines for readability
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, "\n")
    // STEP 4: strip all remaining tags (including data-* attributes via
    // the catch-all)
    .replace(/<[^>]*>/g, " ")
    // STEP 5: decode the entities that appear inside plaintext content
    // (after tags are gone). Also catches anything that was originally
    // double-encoded (&amp;lt; → &lt; after step 1 → < here).
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&hellip;/g, "…")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&#(\d+);/g, (_, n: string) => {
      const code = parseInt(n, 10);
      return code > 0 && code < 0x10000 ? String.fromCharCode(code) : " ";
    })
    // STEP 6: collapse whitespace runs (but keep paragraph breaks readable)
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
