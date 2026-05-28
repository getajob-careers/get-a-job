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
});
