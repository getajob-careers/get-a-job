import { describe, it, expect } from "vitest";
import {
  normalizeDomain,
  hostFromUrl,
  snippetMatchesCompany,
  validateFoundedYear,
  validateStage,
  validateSize,
  validateString,
  validateUrl,
  isCredibleHost,
  isCredibleFor,
  extractJsonObject,
  ALLOWED_STAGES,
  ALLOWED_SIZES,
} from "./enrichmentValidation";

describe("normalizeDomain", () => {
  it("lowercases + strips www + protocol", () => {
    expect(normalizeDomain("https://WWW.Acme.com/about")).toBe("acme.com");
    expect(normalizeDomain("Acme.IO")).toBe("acme.io");
  });
  it("returns null for empty/nullish", () => {
    expect(normalizeDomain(null)).toBeNull();
    expect(normalizeDomain("")).toBeNull();
  });
});

describe("hostFromUrl", () => {
  it("extracts host from a full URL", () => {
    expect(hostFromUrl("https://www.crunchbase.com/organization/acme")).toBe("crunchbase.com");
  });
  it("returns null on garbage", () => {
    expect(hostFromUrl("not a url")).toBeNull();
    expect(hostFromUrl(null)).toBeNull();
  });
});

describe("snippetMatchesCompany — E1 same-name-confusion guard", () => {
  it("matches when snippet contains company name", () => {
    expect(snippetMatchesCompany("Acme is a security company...", "Acme", "acme.com")).toBe(true);
  });
  it("matches when snippet contains the domain", () => {
    expect(snippetMatchesCompany("Visit acme.com for more info", "Acme", "acme.com")).toBe(true);
  });
  it("matches the domain root word alone (e.g. 'cohere' for 'cohere.com')", () => {
    expect(snippetMatchesCompany("Cohere raised a Series C...", "Cohere", "cohere.com")).toBe(true);
  });
  it("rejects when snippet mentions a same-named different company", () => {
    // Same-name confusion case — snippet mentions a totally unrelated topic,
    // doesn't mention Acme or acme.com at all.
    expect(
      snippetMatchesCompany(
        "Beta Corp announced a new product line in 2024.",
        "Acme",
        "acme.com",
      ),
    ).toBe(false);
  });
  it("returns false on empty snippet", () => {
    expect(snippetMatchesCompany(null, "Acme", "acme.com")).toBe(false);
    expect(snippetMatchesCompany("", "Acme", "acme.com")).toBe(false);
  });
  it("is case-insensitive on the name match", () => {
    expect(snippetMatchesCompany("ACME Corp", "acme", "acme.com")).toBe(true);
  });
  it("does not match on a 2-char root (false-positive risk too high)", () => {
    // Domain 'ai.com' → root 'ai'. We don't want 'ai' alone to count.
    expect(snippetMatchesCompany("Building products with ai", "Foo", "ai.com")).toBe(false);
  });
});

describe("validateFoundedYear", () => {
  it("accepts plausible years", () => {
    expect(validateFoundedYear(2018)).toBe(2018);
    expect(validateFoundedYear(1989)).toBe(1989);
  });
  it("rejects pre-1850 and future years", () => {
    expect(validateFoundedYear(1700)).toBeNull();
    expect(validateFoundedYear(2200)).toBeNull();
  });
  it("rejects non-numbers", () => {
    expect(validateFoundedYear("2020")).toBeNull();
    expect(validateFoundedYear(null)).toBeNull();
    expect(validateFoundedYear(undefined)).toBeNull();
  });
});

describe("validateStage", () => {
  it("accepts every allowed value", () => {
    for (const s of ALLOWED_STAGES) {
      expect(validateStage(s)).toBe(s);
    }
  });
  it("rejects lowercase / unknown variants", () => {
    expect(validateStage("series a")).toBeNull();   // wrong case
    expect(validateStage("Series D")).toBeNull();   // not in vocab (collapsed to Growth)
    expect(validateStage("scale-up")).toBeNull();
    expect(validateStage(null)).toBeNull();
  });
});

describe("validateSize", () => {
  it("accepts every existing DB string", () => {
    for (const s of ALLOWED_SIZES) {
      expect(validateSize(s)).toBe(s);
    }
  });
  it("rejects invented bucket strings", () => {
    expect(validateSize("11-50")).toBeNull();
    expect(validateSize("51-200")).toBeNull();
    expect(validateSize("250-999")).toBeNull();
    expect(validateSize("approximately 100")).toBeNull();
  });
});

describe("validateString", () => {
  it("trims and truncates to max length", () => {
    expect(validateString("  hello  ")).toBe("hello");
    expect(validateString("x".repeat(500), 10)).toBe("xxxxxxxxxx");
  });
  it("returns null for empty/non-strings", () => {
    expect(validateString("")).toBeNull();
    expect(validateString("   ")).toBeNull();
    expect(validateString(null)).toBeNull();
    expect(validateString(42)).toBeNull();
  });
});

describe("validateUrl", () => {
  it("accepts well-formed http(s) URLs", () => {
    expect(validateUrl("https://crunchbase.com/foo")).toBe("https://crunchbase.com/foo");
    expect(validateUrl("http://example.com/")).toBe("http://example.com/");
  });
  it("rejects non-http schemes + garbage", () => {
    expect(validateUrl("file:///etc/passwd")).toBeNull();
    expect(validateUrl("not a url")).toBeNull();
    expect(validateUrl(null)).toBeNull();
  });
});

describe("isCredibleHost", () => {
  it("matches exact credible hosts", () => {
    expect(isCredibleHost("https://www.crunchbase.com/x")).toBe(true);
    expect(isCredibleHost("https://en.globes.co.il/foo")).toBe(true);
  });
  it("matches subdomains of credible hosts (en.wikipedia.org)", () => {
    expect(isCredibleHost("https://en.wikipedia.org/wiki/Foo")).toBe(true);
  });
  it("rejects random aggregators", () => {
    expect(isCredibleHost("https://random-blog.example.com")).toBe(false);
    expect(isCredibleHost("https://leadiq.com/c/foo")).toBe(false);
  });
  it("accepts Forbes / CB Insights / Growjo / The Muse / Built In after round-2 expansion", () => {
    expect(isCredibleHost("https://forbes.com/companies/x")).toBe(true);
    expect(isCredibleHost("https://www.cbinsights.com/company/x")).toBe(true);
    expect(isCredibleHost("https://growjo.com/company/x")).toBe(true);
    expect(isCredibleHost("https://www.themuse.com/profiles/x")).toBe(true);
    expect(isCredibleHost("https://builtin.com/x")).toBe(true);
  });
});

describe("isCredibleFor — host equals stored domain → credible", () => {
  it("accepts when source URL host equals the stored domain", () => {
    expect(isCredibleFor("https://acme.com/about", "acme.com")).toBe(true);
  });
  it("accepts when source URL host is a subdomain of stored domain", () => {
    expect(isCredibleFor("https://about.acme.com/team", "acme.com")).toBe(true);
    expect(isCredibleFor("https://careers.acme.com/openings", "www.acme.com")).toBe(true);
  });
  it("normalizes the stored domain (www stripped, lowercased)", () => {
    expect(isCredibleFor("https://acme.com/x", "WWW.Acme.COM")).toBe(true);
  });
  it("falls back to the curated host list when domains don't match", () => {
    expect(isCredibleFor("https://forbes.com/companies/acme", "acme.com")).toBe(true);
  });
  it("rejects when host neither matches stored domain nor curated list", () => {
    expect(isCredibleFor("https://random-blog.example.com/acme", "acme.com")).toBe(false);
  });
  it("rejects when company has no stored domain and host is uncurated", () => {
    expect(isCredibleFor("https://random-blog.example.com/acme", null)).toBe(false);
  });
});

describe("extractJsonObject — Fix B (stock-widget stripper)", () => {
  it("returns the JSON object unchanged when input is already clean", () => {
    expect(extractJsonObject('{"a":1}')).toBe('{"a":1}');
  });
  it("strips a stock-widget markdown preamble (Accenture/Adobe/etc. case)", () => {
    const raw = '## Stock market information for Accenture plc (ACN)\n- Price 178 USD\n\n{"description":{"value":"..."}}';
    expect(extractJsonObject(raw)).toBe('{"description":{"value":"..."}}');
  });
  it("strips ```json fences", () => {
    expect(extractJsonObject("```json\n{\"a\":1}\n```")).toBe('{"a":1}');
  });
  it("strips trailing commentary after the JSON", () => {
    expect(extractJsonObject('{"a":1}\n\nHope that helps!')).toBe('{"a":1}');
  });
  it("returns null when no braces are present at all", () => {
    expect(extractJsonObject("hello no JSON here")).toBeNull();
    expect(extractJsonObject("")).toBeNull();
  });
  it("handles nested braces by taking outermost from first '{' to last '}'", () => {
    expect(extractJsonObject('{"a":{"b":1}}')).toBe('{"a":{"b":1}}');
  });
});
