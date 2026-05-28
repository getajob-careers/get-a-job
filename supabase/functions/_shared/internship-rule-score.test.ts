// Tests for the shared rule scorer. Locks the contract both
// match-internship-companies (pre-filter) and the React browse page
// depend on. If you change weights or matching logic, edit these tests
// in the same commit — drift here means the pre-filter and the per-card
// chip will silently disagree.

import { describe, it, expect } from "vitest";
import {
  ruleScore,
  W_BASE,
  W_STAGE,
  W_SECTOR,
  W_SIGNAL,
  W_GEO,
  type ScorableCompany,
  type ScorableInternshipProfile,
} from "./internship-rule-score";

const company = (overrides: Partial<ScorableCompany> = {}): ScorableCompany => ({
  name: "Acme",
  description: "An enterprise SaaS for cybersecurity teams.",
  industry: "Cybersecurity",
  sector: "Application Security",
  stage: "Series B",
  hq_country: "Israel",
  ...overrides,
});

const profile = (
  overrides: Partial<ScorableInternshipProfile> = {},
): ScorableInternshipProfile => ({
  realistic_company_stages: [],
  realistic_sectors: [],
  realistic_signal_filters: [],
  ...overrides,
});

describe("ruleScore — baseline + structure", () => {
  it("gives every company the W_BASE floor (no profile signal)", () => {
    expect(ruleScore(company({ hq_country: null }), profile())).toBe(W_BASE);
  });

  it("returns W_BASE for fully null company data", () => {
    const blank: ScorableCompany = {
      name: null, description: null, industry: null, sector: null,
      stage: null, hq_country: null,
    };
    expect(ruleScore(blank, profile())).toBe(W_BASE);
  });

  it("never throws on profile with empty arrays + IL company", () => {
    // Confirms the empty-array short-circuits skip cleanly.
    expect(ruleScore(company(), profile())).toBe(W_BASE + W_GEO);
  });
});

describe("ruleScore — stage match", () => {
  it("adds W_STAGE on exact case-insensitive match", () => {
    const c = company({ hq_country: null });
    const p = profile({ realistic_company_stages: ["series b"] });
    expect(ruleScore(c, p)).toBe(W_BASE + W_STAGE);
  });

  it("does not match when stages disagree", () => {
    const p = profile({ realistic_company_stages: ["Series A"] });
    expect(ruleScore(company({ hq_country: null }), p)).toBe(W_BASE);
  });

  it("requires an exact match — substring does not count", () => {
    // 'Series B' is not equal to 'B' even though it contains it.
    const p = profile({ realistic_company_stages: ["B"] });
    expect(ruleScore(company({ hq_country: null }), p)).toBe(W_BASE);
  });
});

describe("ruleScore — sector match (loose substring, both directions)", () => {
  it("matches when company.sector contains a realistic_sector token", () => {
    const c = company({ sector: "Application Security", industry: null, hq_country: null });
    const p = profile({ realistic_sectors: ["security"] });
    expect(ruleScore(c, p)).toBe(W_BASE + W_SECTOR);
  });

  it("matches when realistic_sector contains a company token (inverse direction)", () => {
    const c = company({ sector: "InsurTech", industry: null, hq_country: null });
    const p = profile({ realistic_sectors: ["B2B InsurTech platforms"] });
    expect(ruleScore(c, p)).toBe(W_BASE + W_SECTOR);
  });

  it("falls back to industry when sector is null", () => {
    const c = company({ sector: null, industry: "Cybersecurity", hq_country: null });
    const p = profile({ realistic_sectors: ["cyber"] });
    expect(ruleScore(c, p)).toBe(W_BASE + W_SECTOR);
  });

  it("caps at W_SECTOR even when many tokens match", () => {
    const c = company({ sector: "AI ML cyber dev", industry: "Cybersecurity", hq_country: null });
    const p = profile({ realistic_sectors: ["ai", "ml", "cyber"] });
    expect(ruleScore(c, p)).toBe(W_BASE + W_SECTOR);
  });
});

describe("ruleScore — realistic_signal_filters", () => {
  it("scans across name + description + industry + sector", () => {
    const c = company({
      name: "Acme Customer Support OS",
      description: null,
      industry: null,
      sector: null,
      hq_country: null,
    });
    const p = profile({ realistic_signal_filters: ["customer support"] });
    // 1 hit × W_SIGNAL / 2 = 7.5, capped under W_SIGNAL.
    expect(ruleScore(c, p)).toBe(W_BASE + W_SIGNAL / 2);
  });

  it("two hits cap at W_SIGNAL (one hit = half, two hits = full)", () => {
    const c = company({
      description: "We build customer-facing tools for billing operations.",
      hq_country: null,
    });
    const p = profile({ realistic_signal_filters: ["customer", "billing"] });
    expect(ruleScore(c, p)).toBe(W_BASE + W_SIGNAL);
  });

  it("three hits still cap at W_SIGNAL", () => {
    const c = company({
      description: "Customer billing ops automation",
      hq_country: null,
    });
    const p = profile({
      realistic_signal_filters: ["customer", "billing", "ops"],
    });
    expect(ruleScore(c, p)).toBe(W_BASE + W_SIGNAL);
  });
});

describe("ruleScore — geography", () => {
  it("gives the full W_GEO to IL companies", () => {
    expect(ruleScore(company({ hq_country: "Israel" }), profile())).toBe(W_BASE + W_GEO);
  });

  it("accepts 'IL' as an alias for Israel", () => {
    expect(ruleScore(company({ hq_country: "IL" }), profile())).toBe(W_BASE + W_GEO);
  });

  it("gives half W_GEO to US-HQ companies (TLV office assumption)", () => {
    expect(ruleScore(company({ hq_country: "United States" }), profile())).toBe(W_BASE + W_GEO / 2);
    expect(ruleScore(company({ hq_country: "USA" }), profile())).toBe(W_BASE + W_GEO / 2);
    expect(ruleScore(company({ hq_country: "US" }), profile())).toBe(W_BASE + W_GEO / 2);
  });

  it("gives no geo points to other countries", () => {
    expect(ruleScore(company({ hq_country: "Germany" }), profile())).toBe(W_BASE);
  });
});

describe("ruleScore — composition", () => {
  it("sums every band when everything matches", () => {
    const c = company({
      name: "Acme Security",
      description: "Customer-facing security platform",
      industry: "Cybersecurity",
      sector: "Cybersecurity",
      stage: "Series B",
      hq_country: "Israel",
    });
    const p = profile({
      realistic_company_stages: ["Series B"],
      realistic_sectors: ["cyber"],
      realistic_signal_filters: ["customer", "platform"],
    });
    // base + stage + sector + signal(cap) + geo
    expect(ruleScore(c, p)).toBe(W_BASE + W_STAGE + W_SECTOR + W_SIGNAL + W_GEO);
  });
});
