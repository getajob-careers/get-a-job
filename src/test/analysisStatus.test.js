// Pins the "analysis pending" predicate that drives Career's cold-start
// "building your matches" state — must agree with Home's self-heal trigger
// (Home.jsx:266-270) so the two surfaces classify a just-signed-up user the
// same way.

import { describe, it, expect } from "vitest";
import { isAnalysisPending } from "../lib/analysisStatus";

describe("isAnalysisPending", () => {
  it("true: onboarded but analysis never persisted (the Barabi-on-signup window)", () => {
    expect(
      isAnalysisPending({
        onboarding_complete: true,
        qualification_level: null,
        last_reality_check_date: null,
      }),
    ).toBe(true);
  });

  it("false once analysis has persisted (qualification_level set → genuinely-zero, not building)", () => {
    expect(
      isAnalysisPending({
        onboarding_complete: true,
        qualification_level: "Mid-Level",
        last_reality_check_date: null,
      }),
    ).toBe(false);
    expect(
      isAnalysisPending({
        onboarding_complete: true,
        qualification_level: null,
        last_reality_check_date: "2026-06-12T00:00:00Z",
      }),
    ).toBe(false);
  });

  it("false before onboarding completes, and on null profile", () => {
    expect(
      isAnalysisPending({
        onboarding_complete: false,
        qualification_level: null,
        last_reality_check_date: null,
      }),
    ).toBe(false);
    expect(isAnalysisPending(null)).toBe(false);
    expect(isAnalysisPending(undefined)).toBe(false);
  });
});
