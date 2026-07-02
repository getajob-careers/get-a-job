// Anti-fabrication guard for the coach CV path (ai-chat honesty rule 5e enforced
// deterministically). When ai-chat did NOT emit a cv-generation action this turn,
// any "generating your CV now" claim is a false promise and must be stripped before
// it ships. This protects both the website and extension regardless of client
// wiring. Offers ("I can generate a CV, want me to?") are NOT claims and must
// survive. Pure function, imported directly.
import { describe, it, expect } from "vitest";
import { stripUnbackedCvGenerationClaim } from "../../supabase/functions/ai-chat/prompt-lib.ts";

describe("stripUnbackedCvGenerationClaim (honesty rule 5e enforcement)", () => {
  it("strips the gerund 'Generating your CV ... now' false promise, keeps the rest", () => {
    const out = stripUnbackedCvGenerationClaim(
      "Generating your CV for the Data Analyst role at Acme now… I'll surface your SQL work.",
    );
    expect(out).toBe("I'll surface your SQL work.");
    expect(out.toLowerCase()).not.toContain("generating your cv");
  });

  it("strips 'Creating your CV now.' and 'I'm tailoring your CV ...'", () => {
    expect(stripUnbackedCvGenerationClaim("Creating your CV now.")).toBe("");
    expect(
      stripUnbackedCvGenerationClaim(
        "I'm tailoring your CV for you right now.",
      ),
    ).toBe("");
  });

  it("strips 'I'll generate your CV now'", () => {
    expect(
      stripUnbackedCvGenerationClaim("Sure. I'll generate your CV now."),
    ).toBe("Sure.");
  });

  it("PRESERVES offers (not claims) - the coach may still offer", () => {
    for (const offer of [
      "I can generate a tailored CV for you — want me to?",
      "Would you like me to generate a tailored CV for this role?",
      "Want me to generate a CV for the KPMG role?",
    ]) {
      expect(stripUnbackedCvGenerationClaim(offer)).toBe(offer);
    }
  });

  it("PRESERVES generic CV advice (no generation claim)", () => {
    const advice =
      "Your CV should lead with a strong summary and quantified bullets.";
    expect(stripUnbackedCvGenerationClaim(advice)).toBe(advice);
  });

  it("is a no-op for text with no CV-generation claim", () => {
    const t = "You're a strong fit for this role. You may lack SQL depth.";
    expect(stripUnbackedCvGenerationClaim(t)).toBe(t);
  });

  it("idempotent", () => {
    const input =
      "Generating your CV now… Here is a quick read on your fit: strong analytics.";
    const once = stripUnbackedCvGenerationClaim(input);
    expect(stripUnbackedCvGenerationClaim(once)).toBe(once);
    expect(once).toBe("Here is a quick read on your fit: strong analytics.");
  });
});
