import { describe, it, expect } from "vitest";
import { pickReusableCompany, isDuplicateKeyError } from "@/lib/addOwnCompanyHelpers";

describe("pickReusableCompany", () => {
  it("returns null when no candidates", () => {
    expect(pickReusableCompany([])).toBeNull();
    expect(pickReusableCompany(undefined)).toBeNull();
    expect(pickReusableCompany(null)).toBeNull();
  });

  it("returns the single candidate when only one match", () => {
    const row = { id: "a", source: "manual", created_at: "2026-01-01T00:00:00Z" };
    expect(pickReusableCompany([row])).toBe(row);
  });

  it("prefers source=registry over source=research", () => {
    const research = { id: "r", source: "research", created_at: "2025-01-01T00:00:00Z" };
    const registry = { id: "g", source: "registry", created_at: "2026-05-01T00:00:00Z" };
    expect(pickReusableCompany([research, registry])).toBe(registry);
  });

  it("prefers source=research over source=manual", () => {
    const manual = { id: "m", source: "manual", created_at: "2025-01-01T00:00:00Z" };
    const research = { id: "r", source: "research", created_at: "2026-05-01T00:00:00Z" };
    expect(pickReusableCompany([manual, research])).toBe(research);
  });

  it("tiebreaks on oldest created_at within the same source", () => {
    const newer = { id: "n", source: "registry", created_at: "2026-05-30T00:00:00Z" };
    const older = { id: "o", source: "registry", created_at: "2025-01-01T00:00:00Z" };
    expect(pickReusableCompany([newer, older])).toBe(older);
  });

  it("Guardio/guardio dup scenario — picks the canonical registry row over the manual duplicate", () => {
    const manualDup = { id: "dup", source: "manual", created_at: "2026-05-15T00:00:00Z" };
    const canonical = { id: "canon", source: "registry", created_at: "2025-09-01T00:00:00Z" };
    expect(pickReusableCompany([manualDup, canonical])).toBe(canonical);
  });

  it("handles missing source / created_at fields without crashing", () => {
    const noFields = { id: "x" };
    const canonical = { id: "c", source: "registry", created_at: "2026-01-01T00:00:00Z" };
    expect(pickReusableCompany([noFields, canonical])).toBe(canonical);
  });

  it("falls back to first row when nothing matches the preference list", () => {
    const a = { id: "a", source: "other", created_at: "2026-01-01T00:00:00Z" };
    const b = { id: "b", source: "other", created_at: "2026-02-01T00:00:00Z" };
    expect(pickReusableCompany([a, b])).toBe(a); // older created_at wins
  });
});

describe("isDuplicateKeyError", () => {
  it("returns true for PostgREST-shaped 23505", () => {
    expect(isDuplicateKeyError({ code: "23505", message: "duplicate key value" })).toBe(true);
  });

  it("returns true for wrapped 23505 in details.code", () => {
    expect(isDuplicateKeyError({ details: { code: "23505" } })).toBe(true);
  });

  it("returns false for other postgres error codes", () => {
    expect(isDuplicateKeyError({ code: "23503" })).toBe(false); // FK violation
    expect(isDuplicateKeyError({ code: "42501" })).toBe(false); // permission denied
  });

  it("returns false for null / undefined / empty", () => {
    expect(isDuplicateKeyError(null)).toBe(false);
    expect(isDuplicateKeyError(undefined)).toBe(false);
    expect(isDuplicateKeyError({})).toBe(false);
  });
});
