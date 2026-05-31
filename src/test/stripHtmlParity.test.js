import { describe, it, expect } from "vitest";
import { stripHtml as stripHtmlNode } from "../../scripts/lib/normalize.ts";
import { stripHtml as stripHtmlDeno } from "../../supabase/functions/_shared/strip-html.ts";

// Parity test: scripts/lib/normalize.ts stripHtml and
// supabase/functions/_shared/strip-html.ts stripHtml are byte-mirrored
// copies (Node and Deno can't share the same file). This test asserts
// they produce identical output on a representative corpus so they
// can't drift silently.
//
// CORPUS sources:
//   - greenhouse-encoded: live raw_payload.content shape, the bug that
//     prompted this whole PR. Greenhouse returns content as
//     HTML-encoded for transport.
//   - sf-encoded: same shape, SAP SuccessFactors RSS description field.
//   - plain-html: standard <p><br><strong> markup with no encoding.
//   - word-confluence: data-contrast, data-ccp, weird inline styles —
//     the markup users paste into the Tracker textarea.
//   - text-with-entities: plaintext with embedded &amp; / &nbsp; / &#39;.
//   - mixed-whitespace: tests the paragraph-break preservation contract
//     (don't collapse to one blob).
//   - null + empty.

const CORPUS = {
  "greenhouse-encoded": `&lt;div class=&quot;content-intro&quot;&gt;&lt;p&gt;&lt;strong data-stringify-type=&quot;bold&quot;&gt;Level Up Your Career with Zynga!&lt;/strong&gt;&lt;/p&gt;\n&lt;p&gt;At Zynga, we bring people together through the power of play.&lt;/p&gt;`,
  "sf-encoded": `&lt;p&gt;&lt;strong&gt;Job Description&lt;/strong&gt;&lt;/p&gt;\n&lt;div class=&quot;content&quot;&gt;\n&lt;p&gt;Hebrew + English mixed: שלום and Hello&lt;/p&gt;\n&lt;/div&gt;`,
  "plain-html": `<p><strong>Realize your potential</strong></p>\n<p>As a Software Engineer on the team, you'll&nbsp;ship code &amp; review PRs.</p>`,
  "word-confluence": `<div><div style="padding:10.0px 0.0px;border:1.0px solid transparent" data-ccp-charstyle="None"><div style="word-wrap:break-word" data-contrast="auto"><H2 style="margin:0.0px"><b>LOCATION</b></H2>\n</div><div><p>This is a remote position that must be flexible.</p></div></div></div>`,
  "text-with-entities": `AT&amp;T &amp; Verizon team up &mdash; &#39;hello world&#39; said the dev. Read at https://example.com&nbsp;today.`,
  "mixed-whitespace": `<p>Line one.</p>\n\n\n\n\n<p>Line two.</p>\n\n<br/><br/>\n\n<p>Line three.</p>`,
  "scripts-and-styles": `<style>body { color: red }</style><script>alert(1)</script><p>Only this should survive.</p>`,
  "numeric-entities": `&#8211; em-dash test &#8212; and copyright &#169; symbol`,
  "null": null,
  "empty": "",
};

describe("stripHtml — Node ↔ Deno parity", () => {
  for (const [name, input] of Object.entries(CORPUS)) {
    it(`produces identical output for: ${name}`, () => {
      const nodeOut = stripHtmlNode(input);
      const denoOut = stripHtmlDeno(input);
      expect(denoOut).toEqual(nodeOut);
    });
  }
});

describe("stripHtml — bug regression (PR jd-html-sanitization)", () => {
  it("removes tags from Greenhouse-style entity-encoded HTML (the core bug)", () => {
    const input = `&lt;p&gt;&lt;strong&gt;Hello&lt;/strong&gt;&lt;/p&gt;`;
    const out = stripHtmlNode(input);
    expect(out).not.toMatch(/<\/?[a-z]/i);
    expect(out).toContain("Hello");
  });

  it("removes tags from plain HTML", () => {
    const out = stripHtmlNode(`<p>Hello</p>`);
    expect(out).not.toMatch(/<\/?[a-z]/i);
    expect(out).toContain("Hello");
  });

  it("strips Word/Confluence data-* attributes", () => {
    const out = stripHtmlNode(`<div data-contrast="auto" data-ccp="123"><p>Content</p></div>`);
    expect(out).not.toContain("data-contrast");
    expect(out).not.toContain("data-ccp");
    expect(out).toContain("Content");
  });

  it("preserves paragraph breaks (doesn't collapse to one blob)", () => {
    const out = stripHtmlNode(`<p>One</p><p>Two</p><p>Three</p>`);
    expect(out).toMatch(/One[\s\S]*\n[\s\S]*Two[\s\S]*\n[\s\S]*Three/);
  });

  it("is idempotent (re-running on already-clean output is a no-op)", () => {
    const dirty = `&lt;p&gt;Hello&lt;/p&gt;`;
    const once = stripHtmlNode(dirty);
    const twice = stripHtmlNode(once);
    expect(twice).toEqual(once);
  });

  it("returns null for null input", () => {
    expect(stripHtmlNode(null)).toBeNull();
  });
});
