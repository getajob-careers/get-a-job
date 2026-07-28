// Regression guard for the job-match digest selection. The retired
// attainability-lite proxy scored every under-specified job ~1.0 (missing
// requirement => axis defaults to 1.0), so its top-5 was a constant 1.0
// distribution that surfaced the LEAST-extracted jobs to every user
// (185/190 picks at exactly 1.0, avg 0.9984 — see the arc handoff). These
// tests fail if selection ever regresses to that saturating behavior.

import { describe, it, expect } from "vitest";
import {
  selectTopJobsForUser,
  DIGEST_SCORING_OPTS,
  GOOD_TIER_BAR,
} from "@/lib/selectDigestJobs.js";
import { scoreJobFit } from "@/lib/scoreJobFit.js";

const userInput = {
  profile: {
    skills_canonical: ["financial_modeling", "excel", "sql", "valuation"],
    qualification_level: "junior",
    education_level: "bachelors",
    primary_domain: "finance",
  },
  experiences: [
    {
      type: "full_time",
      start_date: "2023",
      end_date: "present",
      title: "Analyst",
    },
  ],
  educations: [{ education_level: "bachelors", is_current: false }],
};

// Three under-specified jobs (no extracted requirements) + one strong on-domain
// match + one weak generic. Under the old proxy the three under-specified jobs
// would all score ~1.0 and win the top slots.
const strongMatch = {
  id: "strong",
  title: "Financial Analyst",
  function_family: "Finance",
  req_skills_core: ["financial_modeling", "valuation", "excel"],
  req_skills_nice: ["sql"],
  req_years_min: 1,
  req_education_levels: ["bachelor"],
  req_seniority: "entry",
  extraction_confidence: 0.9,
  skill_coverage_ratio: 0.9,
};
const underspecified = (n) => ({
  id: `under_${n}`,
  title: `Vague Role ${n}`,
  function_family: null,
  req_skills_core: [],
  req_skills_nice: [],
  req_years_min: null,
  req_education_levels: [],
  req_seniority: null,
});
// A second PRIMARY (Finance) match, weaker than strongMatch, so the primary-only
// selection still has a real (non-constant) spread to rank.
const secondFinance = {
  id: "finance2",
  title: "Junior FP&A Analyst",
  function_family: "Finance",
  req_skills_core: [
    "financial_modeling",
    "excel_advanced_finance",
    "budget_forecasting",
  ],
  req_skills_nice: [],
  req_years_min: 1,
  req_education_levels: ["bachelor"],
  req_seniority: "entry",
  extraction_confidence: 0.8,
  skill_coverage_ratio: 0.5,
};
// Adjacent (Operations ∈ finance adjacency) — admitted by the FEED but NOT the
// digest under the primary-only policy.
const adjacentWeak = {
  id: "adjacent",
  title: "Ops Coordinator",
  function_family: "Operations",
  req_skills_core: ["analytical_thinking"],
  req_skills_nice: [],
  req_years_min: 3,
  req_education_levels: ["bachelor"],
  req_seniority: "mid",
  extraction_confidence: 0.3,
  skill_coverage_ratio: 0.1,
};
const candidates = [
  underspecified(1), // unknown family — dropped by primary-only
  underspecified(2),
  underspecified(3),
  strongMatch, // Finance — primary
  secondFinance, // Finance — primary
  adjacentWeak, // Operations — adjacent, dropped by primary-only
];

describe("selectDigestJobs — anti-saturation", () => {
  it("does NOT return a constant score distribution", () => {
    const selected = selectTopJobsForUser(userInput, candidates);
    expect(selected.length).toBeGreaterThan(1);
    const scores = selected.map((s) => s.attainability_score);
    // The saturation signature was every pick at the same value (1.0). A healthy
    // selection spreads across the candidates' real fit.
    expect(new Set(scores).size).toBeGreaterThan(1);
    // And nothing may saturate at a perfect 1.0 the way the proxy did.
    expect(Math.max(...scores)).toBeLessThan(1);
  });

  it("ranks the stronger primary match first, and returns only primary jobs", () => {
    const selected = selectTopJobsForUser(userInput, candidates);
    expect(selected[0].job.id).toBe("strong");
    // primary-only: every returned job is a Finance (primary) match; the
    // under-specified (unknown) and Operations (adjacent) candidates are gone.
    const ids = selected.map((s) => s.job.id).sort();
    expect(ids).toEqual(["finance2", "strong"]);
  });

  it("scores an under-specified job at the neutral prior (0.5), not 1.0", () => {
    // This is the exact bug attainability-lite had: missing requirements read as
    // a perfect match. The real scorer gives the skill axis a 0.5 neutral.
    const r = scoreJobFit(userInput, underspecified(9), DIGEST_SCORING_OPTS);
    expect(r.attainability_score).toBe(0.5);
    expect(r.attainability_score).toBeLessThan(0.9);
  });

  it("applies the GOOD-tier bar and never pads beyond topN", () => {
    const selected = selectTopJobsForUser(userInput, candidates, { topN: 3 });
    expect(selected.length).toBeLessThanOrEqual(3);
    for (const s of selected) {
      expect(s.attainability_score).toBeGreaterThanOrEqual(GOOD_TIER_BAR);
    }
  });

  it("keeps ONLY primary-direction roles — drops off, adjacent, and unknown", () => {
    // Digest policy (Eli 2026-07-24) is stricter than the feed: primary only.
    const offDirection = {
      id: "off",
      title: "Backend Engineer",
      function_family: "Software_Engineering", // off for a finance user
      req_skills_core: ["python", "kubernetes", "go"],
      req_skills_nice: ["aws"],
      req_years_min: 4,
      req_education_levels: ["bachelor"],
      req_seniority: "senior",
      extraction_confidence: 0.9,
      skill_coverage_ratio: 0.9,
    };
    // off + adjacent (Operations) + unknown (null family) all excluded; only the
    // two Finance (primary) jobs survive.
    const selected = selectTopJobsForUser(userInput, [
      offDirection,
      adjacentWeak,
      underspecified(9),
      strongMatch,
      secondFinance,
    ]);
    const ids = selected.map((s) => s.job.id).sort();
    expect(ids).toEqual(["finance2", "strong"]);
  });

  it("returns fewer than topN when few primary picks clear the bar — never pads", () => {
    // Only one primary job available => exactly one pick, not padded to topN.
    const selected = selectTopJobsForUser(
      userInput,
      [strongMatch, adjacentWeak, underspecified(9)],
      { topN: 5 },
    );
    expect(selected.length).toBe(1);
    expect(selected[0].job.id).toBe("strong");
  });
});
