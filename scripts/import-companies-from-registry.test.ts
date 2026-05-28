// Tests for import-companies-from-registry helpers. Co-located per repo
// convention (vitest picks up *.test.ts anywhere).

import { describe, it, expect } from "vitest";
import {
  normalizeDomain,
  nameKey,
  dedupeByDomain,
  buildUpdatePatch,
  buildInsertRow,
  findNameOnlyMatches,
  RegistryEntry,
} from "./import-companies-from-registry";

const reg = (overrides: Partial<RegistryEntry>): RegistryEntry => ({
  name: "Acme",
  type: "israeli_founded",
  industry: "Cybersecurity",
  domain: "acme.com",
  careers_url: "https://acme.com/careers",
  ats: "greenhouse",
  slug: "acme",
  api_url: "https://boards-api.greenhouse.io/v1/boards/acme/jobs",
  verified: true,
  notes: "",
  ...overrides,
});

describe("normalizeDomain", () => {
  it("lowercases and strips www.", () => {
    expect(normalizeDomain("WWW.Acme.com")).toBe("acme.com");
    expect(normalizeDomain("acme.com")).toBe("acme.com");
  });
  it("returns null for empty / nullish", () => {
    expect(normalizeDomain(null)).toBeNull();
    expect(normalizeDomain("")).toBeNull();
    expect(normalizeDomain("   ")).toBeNull();
  });
  it("preserves multi-part TLDs (co.il, ai/io)", () => {
    expect(normalizeDomain("Foo.co.il")).toBe("foo.co.il");
    expect(normalizeDomain("bar.ai")).toBe("bar.ai");
  });
});

describe("nameKey", () => {
  it("lowercases and collapses whitespace", () => {
    expect(nameKey("  Acme   Corp ")).toBe("acme corp");
  });
});

describe("dedupeByDomain", () => {
  it("collapses same-domain entries, preferring verified=true", () => {
    const out = dedupeByDomain([
      reg({ name: "Acme Old", domain: "acme.com", verified: false }),
      reg({ name: "Acme New", domain: "acme.com", verified: true }),
    ]);
    expect(out.unique).toHaveLength(1);
    expect(out.unique[0].name).toBe("Acme New");
    expect(out.duplicates).toEqual([
      { normDomain: "acme.com", kept: "Acme New", dropped: ["Acme Old"] },
    ]);
  });
  it("keeps the first entry when none are verified", () => {
    const out = dedupeByDomain([
      reg({ name: "First", domain: "x.com", verified: false }),
      reg({ name: "Second", domain: "x.com", verified: false }),
    ]);
    expect(out.unique[0].name).toBe("First");
    expect(out.duplicates[0].dropped).toEqual(["Second"]);
  });
  it("skips entries with missing/blank domain", () => {
    const out = dedupeByDomain([reg({ domain: "" }), reg({ domain: "x.com" })]);
    expect(out.unique).toHaveLength(1);
    expect(out.unique[0].normDomain).toBe("x.com");
  });
  it("normalizes domain before dedupe", () => {
    const out = dedupeByDomain([
      reg({ name: "A", domain: "Acme.com", verified: true }),
      reg({ name: "B", domain: "www.acme.com", verified: false }),
    ]);
    expect(out.unique).toHaveLength(1);
    expect(out.unique[0].normDomain).toBe("acme.com");
  });
});

describe("buildUpdatePatch", () => {
  const existingBlank = {
    id: "id-1", name: "Acme", domain: "acme.com",
    ats: null, ats_slug: null, api_url: null, verified: null, origin: null,
  };
  it("fills every NULL slot from the registry entry", () => {
    const patch = buildUpdatePatch(existingBlank, reg({}));
    expect(patch).toEqual({
      ats: "greenhouse",
      ats_slug: "acme",
      api_url: "https://boards-api.greenhouse.io/v1/boards/acme/jobs",
      verified: true,
      origin: "israeli_founded",
    });
  });
  it("never overwrites a hand-curated value", () => {
    const curated = { ...existingBlank, ats: "lever", ats_slug: "custom-slug" };
    const patch = buildUpdatePatch(curated, reg({}));
    expect(patch).not.toHaveProperty("ats");
    expect(patch).not.toHaveProperty("ats_slug");
    expect(patch.api_url).toBeTruthy();
    expect(patch.verified).toBe(true);
    expect(patch.origin).toBe("israeli_founded");
  });
  it("omits keys when the registry side is null/empty", () => {
    const sparse = reg({ slug: null, api_url: null });
    const patch = buildUpdatePatch(existingBlank, sparse);
    expect(patch).not.toHaveProperty("ats_slug");
    expect(patch).not.toHaveProperty("api_url");
    expect(patch.ats).toBe("greenhouse");
  });
  it("returns an empty patch when nothing to do (a no-op)", () => {
    const fullyHydrated = {
      ...existingBlank, ats: "x", ats_slug: "y", api_url: "z",
      verified: false, origin: "israeli_founded",
    };
    const patch = buildUpdatePatch(fullyHydrated, reg({}));
    expect(patch).toEqual({});
  });
  it("treats existing verified=false as set (does not overwrite)", () => {
    const withVerifiedFalse = { ...existingBlank, verified: false };
    const patch = buildUpdatePatch(withVerifiedFalse, reg({ verified: true }));
    expect(patch).not.toHaveProperty("verified");
  });
});

describe("buildInsertRow", () => {
  it("maps registry fields to insert columns + source='registry'", () => {
    const e = { ...reg({}), normDomain: "acme.com" };
    const row = buildInsertRow(e);
    expect(row).toEqual({
      name: "Acme",
      domain: "acme.com",
      industry: "Cybersecurity",
      careers_url: "https://acme.com/careers",
      ats: "greenhouse",
      ats_slug: "acme",
      api_url: "https://boards-api.greenhouse.io/v1/boards/acme/jobs",
      verified: true,
      origin: "israeli_founded",
      source: "registry",
    });
  });
  it("turns falsy registry fields into nulls (not empty strings)", () => {
    const e = { ...reg({ careers_url: "", slug: null, api_url: null, industry: "" }), normDomain: "acme.com" };
    const row = buildInsertRow(e);
    expect(row.careers_url).toBeNull();
    expect(row.ats_slug).toBeNull();
    expect(row.api_url).toBeNull();
    expect(row.industry).toBeNull();
  });
});

describe("findNameOnlyMatches", () => {
  const unique = [
    { ...reg({ name: "Monday", domain: "monday.com" }), normDomain: "monday.com" },
    { ...reg({ name: "Acme", domain: "acme.io" }), normDomain: "acme.io" },
    { ...reg({ name: "Brand New", domain: "brandnew.com" }), normDomain: "brandnew.com" },
  ];
  const existing = [
    { id: "db1", name: "monday.com", domain: "monday.com", ats: null, ats_slug: null, api_url: null, verified: null, origin: null },
    { id: "db2", name: "Acme", domain: "acme.com", ats: null, ats_slug: null, api_url: null, verified: null, origin: null },
  ];
  it("flags name matches when domain differs (likely rebrand or alternate domain)", () => {
    const out = findNameOnlyMatches(unique, existing);
    // "monday.com" matches by domain → not a fuzzy match.
    // "Acme" matches by name only (db domain acme.com, json acme.io) → flagged.
    // "Brand New" has no match → not flagged.
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ json_name: "Acme", json_domain: "acme.io", db_id: "db2" });
  });
  it("returns empty when no name overlap exists", () => {
    const noOverlap = [{ ...reg({ name: "Zzz", domain: "zzz.com" }), normDomain: "zzz.com" }];
    expect(findNameOnlyMatches(noOverlap, existing)).toEqual([]);
  });
});
