import { describe, it, expect } from "vitest";
import {
  isSuspiciousCompany,
  sanitizeCompany,
  FALLBACK_COMPANY,
} from "@/lib/applyHandlerValidation";

describe("sanitizeCompany / isSuspiciousCompany", () => {
  it("flags the known scraped-garbage value and falls back (never null)", () => {
    expect(isSuspiciousCompany("AnyRMFlowtoXprien")).toBe(true);
    expect(sanitizeCompany("AnyRMFlowtoXprien")).toBe(FALLBACK_COMPANY);
  });

  it("flags embedded nav / boilerplate phrases and falls back", () => {
    for (const bad of [
      "About Us Careers Contact Us",
      "Back to Positions",
      "Apply for this job",
      "All Rights Reserved 2026",
      "Full-time Netanya",
    ]) {
      expect(isSuspiciousCompany(bad)).toBe(true);
      expect(sanitizeCompany(bad)).toBe(FALLBACK_COMPANY);
    }
  });

  it("keeps legitimate single-token camelCase brands", () => {
    for (const ok of [
      "SentinelOne",
      "MazeBolt",
      "MongoDB",
      "CommBox",
      "DealHub",
      "NetApp",
      "LayerX",
      "ZeroPort",
    ]) {
      expect(isSuspiciousCompany(ok)).toBe(false);
      expect(sanitizeCompany(ok)).toBe(ok);
    }
  });

  it("keeps normal multi-word company names (spaces protect them)", () => {
    for (const ok of [
      "Bank Hapoalim",
      "Check Point Software",
      "Wix",
      "Reichman University",
      "Ernst & Young",
    ]) {
      expect(isSuspiciousCompany(ok)).toBe(false);
      expect(sanitizeCompany(ok)).toBe(ok);
    }
  });

  it("trims, and falls back (never null) for empty / non-string", () => {
    expect(sanitizeCompany("  Wix  ")).toBe("Wix");
    expect(sanitizeCompany("")).toBe(FALLBACK_COMPANY);
    expect(sanitizeCompany("   ")).toBe(FALLBACK_COMPANY);
    expect(sanitizeCompany(null)).toBe(FALLBACK_COMPANY);
    expect(sanitizeCompany(undefined)).toBe(FALLBACK_COMPANY);
    expect(sanitizeCompany(42)).toBe(FALLBACK_COMPANY);
  });

  it("never returns null/empty — protects the NOT NULL company column", () => {
    for (const input of [
      "AnyRMFlowtoXprien",
      "About Us Careers",
      "",
      null,
      undefined,
      42,
      "Wix",
    ]) {
      const out = sanitizeCompany(input);
      expect(typeof out).toBe("string");
      expect(out.length).toBeGreaterThan(0);
    }
  });

  it("does not flag a long but space-separated name", () => {
    expect(isSuspiciousCompany("International Business Machines Corp")).toBe(
      false,
    );
  });
});
