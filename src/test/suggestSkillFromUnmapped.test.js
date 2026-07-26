import { describe, it, expect } from "vitest";
import { suggestSkillsFromUnmapped } from "../lib/suggestSkillFromUnmapped";

// Sanity-floor contract (Eli ruling 2026-07-26): suggest ONLY when a canonical
// display name is within Levenshtein distance 2 AND shares the same first
// character. Otherwise return nothing so the UI shows the honest "No close
// match" copy instead of an absurd guess.

describe("suggestSkillsFromUnmapped - sanity floor", () => {
  it("returns ZERO suggestions for 'vercel' (the Perl collision is gone)", () => {
    const out = suggestSkillsFromUnmapped("vercel");
    expect(out).toEqual([]);
    // and, defensively, Perl can never appear (different first char anyway)
    expect(out.some((s) => /perl/i.test(s.name))).toBe(false);
  });

  it("returns ZERO for other genuinely-absent tools (supabase, tailwind css)", () => {
    expect(suggestSkillsFromUnmapped("supabase")).toEqual([]);
    expect(suggestSkillsFromUnmapped("tailwind css")).toEqual([]);
  });

  it("still catches a genuine typo within distance 2, same first char", () => {
    const out = suggestSkillsFromUnmapped("leadershp"); // missing 'i', d=1
    expect(out.map((s) => s.name)).toContain("Leadership");
    const sf = suggestSkillsFromUnmapped("salesforse"); // s->c sub, d=1
    expect(sf.map((s) => s.name)).toContain("Salesforce");
  });

  it("matches an exact name (case-insensitive, distance 0)", () => {
    const out = suggestSkillsFromUnmapped("coaching");
    expect(out[0]).toMatchObject({ name: "Coaching", distance: 0 });
  });

  it("drops a within-distance match that fails the first-char guard", () => {
    // "eadership" is Levenshtein 1 from "Leadership" but starts with 'e', so the
    // first-char guard rejects it (this is what stops cross-family collisions).
    const out = suggestSkillsFromUnmapped("eadership");
    expect(out.map((s) => s.name)).not.toContain("Leadership");
  });

  it("returns nothing for a long descriptive phrase (edit distance is huge - honest no-match)", () => {
    // Documents the real behavior: pure Levenshtein never mapped this to
    // "Leadership" (distance ~19), contrary to the old docstring's claim.
    expect(suggestSkillsFromUnmapped("leadership & team management")).toEqual(
      [],
    );
  });

  it("never returns more than the limit, sorted by distance ascending", () => {
    const out = suggestSkillsFromUnmapped("leadershp", { limit: 3 });
    expect(out.length).toBeLessThanOrEqual(3);
    for (let i = 1; i < out.length; i++)
      expect(out[i].distance).toBeGreaterThanOrEqual(out[i - 1].distance);
  });
});
