// BUG 1 — near-duplicate bullet detection. The old dedupe only caught exact
// normalized matches, so paraphrases accumulated on repeated "add to CV". These
// tests pin the conservative threshold: clear paraphrases are caught, distinct
// bullets are never merged, and the ambiguous band is flagged (not dropped).

import { describe, it, expect } from "vitest";
import {
  bulletSimilarity,
  findNearDuplicate,
  classifyBullets,
  BULLET_NEAR_THRESHOLD,
  BULLET_BORDERLINE_THRESHOLD,
} from "@/lib/bulletDedup";

describe("bulletSimilarity", () => {
  it("scores identical bullets 1.0 and disjoint bullets 0", () => {
    expect(
      bulletSimilarity(
        "Led a team of five engineers",
        "Led a team of five engineers",
      ),
    ).toBe(1);
    expect(
      bulletSimilarity(
        "Led a team of engineers",
        "Increased quarterly revenue",
      ),
    ).toBe(0);
  });

  it("does not let a short generic phrase match a long distinct bullet", () => {
    // "managed the team" (2 content words) sits inside the longer bullet, but the
    // containment guard (shorter side must be >= 4 words) keeps this well below
    // the borderline threshold so the two are treated as distinct.
    const sim = bulletSimilarity(
      "Managed the team",
      "Managed a large engineering team across three offices",
    );
    expect(sim).toBeLessThan(BULLET_BORDERLINE_THRESHOLD);
  });
});

describe("findNearDuplicate", () => {
  const existing = [
    "Redesigned the social media auto-moderation system",
    "Grew the newsletter list from 200 to 5,000 subscribers",
  ];

  // 1. CLEAR paraphrase (near tier) — the reported bug: same bullet, reworded +
  //    an added clause. Must be caught.
  it("catches a clear paraphrase of an existing bullet (near)", () => {
    const hit = findNearDuplicate(
      "Redesigned the social-media auto moderation system to reduce spam",
      existing,
    );
    expect(hit).not.toBeNull();
    expect(hit.tier).toBe("near");
    expect(hit.similarity).toBeGreaterThanOrEqual(BULLET_NEAR_THRESHOLD);
    expect(hit.match).toBe(
      "Redesigned the social media auto-moderation system",
    );
  });

  // 2. DISTINCT bullets must NOT be merged — returns null.
  it("does not flag a genuinely distinct bullet", () => {
    const hit = findNearDuplicate(
      "Ran the Q3 campus recruiting drive",
      existing,
    );
    expect(hit).toBeNull();
  });

  // 3. EXACT dupe is caught (exact tier), even with only casing/whitespace/HTML
  //    differences.
  it("catches an exact duplicate (tier=exact)", () => {
    const hit = findNearDuplicate(
      "  Redesigned the social media   auto-moderation system  ",
      existing,
    );
    expect(hit).not.toBeNull();
    expect(hit.tier).toBe("exact");
    expect(hit.similarity).toBe(1);
  });

  // 4. BORDERLINE — same shape, one meaningful word differs ("support" vs
  //    "success"). Could be two real bullets, so it is FLAGGED for the user, not
  //    auto-merged and not silently appended.
  it("flags a borderline near-match for the user to decide", () => {
    const hit = findNearDuplicate("Managed the customer support team", [
      "Managed the customer success team",
    ]);
    expect(hit).not.toBeNull();
    expect(hit.tier).toBe("borderline");
    expect(hit.similarity).toBeGreaterThanOrEqual(BULLET_BORDERLINE_THRESHOLD);
    expect(hit.similarity).toBeLessThan(BULLET_NEAR_THRESHOLD);
  });
});

describe("classifyBullets", () => {
  it("appends clean bullets, flags near/borderline, and drops exact no-ops", () => {
    const existing = ["Redesigned the social media auto-moderation system"];
    const incoming = [
      "Redesigned the social media auto-moderation system", // exact -> dropped
      "Redesigned the social-media auto moderation system to reduce spam", // near -> flagged
      "Launched the referral program that added 1,200 users", // distinct -> appended
    ];
    const { append, flagged } = classifyBullets(existing, incoming);

    expect(append).toEqual([
      "Launched the referral program that added 1,200 users",
    ]);
    expect(flagged).toHaveLength(1);
    expect(flagged[0].tier).toBe("near");
    expect(flagged[0].bullet).toContain("reduce spam");
  });

  it("catches a near-duplicate that appears twice within the SAME incoming batch", () => {
    // Repeated "add to CV" is how the dupes accumulated; a batch that carries two
    // paraphrases of a not-yet-saved bullet must flag the second against the first.
    const { append, flagged } = classifyBullets(
      [],
      [
        "Built an internal analytics dashboard for the sales team",
        "Built the internal analytics dashboard used by the sales team",
      ],
    );
    expect(append).toHaveLength(1);
    expect(flagged).toHaveLength(1);
  });
});
