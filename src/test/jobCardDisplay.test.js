// Covers the shared display derivation that the compact JobGridCard and the
// JobDetailModal both render from — so a change to one can't silently drift
// the badge / strengths / gaps / chips between the card and the popup.

import { describe, it, expect } from "vitest";
import { deriveJobDisplay } from "@/lib/jobCardDisplay";

const JOB = {
  title: "Product Analyst",
  company_name: "Riskified",
  location_city: "Tel Aviv",
  is_remote: false,
  seniority: "entry",
  years_experience_min: 0,
  years_experience_max: 2,
  date_posted: new Date(Date.now() - 3 * 86400000).toISOString(),
};

const SCORE = {
  fit_score: 0.84,
  track: "track_1",
  attainability_band: "strong",
  attainability_score: 0.82,
  signals: { matched_skills: ["sql", "data_analysis"], missing_core_skills: ["ab_testing"] },
  reasoning: { strengths: ["Strong skills match", "Right seniority"] },
};

describe("deriveJobDisplay", () => {
  it("converts the 0-1 fit_score to a percent and humanizes skills", () => {
    const d = deriveJobDisplay(JOB, SCORE, { trackColor: "coral" });
    expect(d.scored).toBe(true);
    expect(d.score).toBe(84);
    expect(d.matchedSkills).toHaveLength(2);
    expect(d.missingCoreSkills).toHaveLength(1);
    // humanizeSkillId turns the id into a readable label (not the raw id).
    expect(d.matchedSkills[0]).not.toBe("sql_raw_id");
    expect(d.reasonText).toBe("Strong skills match · Right seniority");
  });

  it("surfaces the attainability band only when unified", () => {
    expect(deriveJobDisplay(JOB, SCORE, { showAttainabilityBand: false }).attainBand).toBeNull();
    const d = deriveJobDisplay(JOB, SCORE, { showAttainabilityBand: true });
    expect(d.attainBand).toBe("strong");
    expect(d.attainPct).toBe(82);
    expect(d.bandMeta.label).toBe("Strong match");
  });

  it("builds the meta chips from work type, experience, and posted date", () => {
    const d = deriveJobDisplay(JOB, SCORE);
    expect(d.chips).toContain("On-site");
    expect(d.chips).toContain("0-2 yrs");
    expect(d.chips).toContain("3d ago");
  });

  it("handles an unscored job (keyword mode) without crashing", () => {
    const d = deriveJobDisplay(JOB, null);
    expect(d.scored).toBe(false);
    expect(d.score).toBeNull();
    expect(d.matchedSkills).toEqual([]);
    expect(d.chips.length).toBeGreaterThan(0);
  });

  // Component 2b direction axis (shared seam the live card + canvas port read).
  it("derives the direction axis from relevance_match, band-independently", () => {
    const primary = deriveJobDisplay(JOB, { ...SCORE, relevance_match: "primary" });
    expect(primary.direction.label).toBe("On your goal path");
    expect(primary.direction.tone).toBe("primary");
    const adjacent = deriveJobDisplay(JOB, { ...SCORE, relevance_match: "adjacent" });
    expect(adjacent.direction.label).toBe("Adjacent field");
    expect(adjacent.direction.tone).toBe("adjacent");
    // a primary role in the Stretch band still reads on-direction (the TPM case)
    const s = deriveJobDisplay(
      JOB,
      { ...SCORE, attainability_band: "stretch", relevance_match: "primary" },
      { showAttainabilityBand: true },
    );
    expect(s.attainBand).toBe("stretch");
    expect(s.direction.tone).toBe("primary");
  });

  it("has no direction for unknown/off relevance or an unscored job", () => {
    expect(deriveJobDisplay(JOB, { ...SCORE, relevance_match: "unknown" }).direction).toBeNull();
    expect(deriveJobDisplay(JOB, { ...SCORE, relevance_match: "off" }).direction).toBeNull();
    expect(deriveJobDisplay(JOB, SCORE).direction).toBeNull();
    expect(deriveJobDisplay(JOB, null).direction).toBeNull();
  });

  it("flags aboveCeiling only when the seniority signal is above_ceiling", () => {
    const above = deriveJobDisplay(JOB, {
      ...SCORE,
      signals: { ...SCORE.signals, seniority_match: "above_ceiling" },
    });
    expect(above.aboveCeiling).toBe(true);

    expect(
      deriveJobDisplay(JOB, {
        ...SCORE,
        signals: { ...SCORE.signals, seniority_match: "stretch" },
      }).aboveCeiling,
    ).toBe(false);
    // no signal, and an unscored job, both read as not-above-ceiling
    expect(deriveJobDisplay(JOB, SCORE).aboveCeiling).toBe(false);
    expect(deriveJobDisplay(JOB, null).aboveCeiling).toBe(false);
  });
});
