// Component 4: role-tier underleveled penalty, wired into scoreJobFit behind
// ?scoring_c4=1. Locks (a) flag-off byte-identity with the v2 stack (the penalty
// ships dark), (b) the penalty fires on a tier mismatch in BOTH directions,
// (c) abstain (null tier either side) => no penalty, (d) it moves the canonical
// attainability_score only, never fit_score, and complements — does not replace —
// the seniority band. Penalty MAGNITUDE (penaltyPerStep) is tuned separately on
// the pinned 160; these tests pin behaviour, not the constant.
import { describe, it, expect } from "vitest";
import { scoreJobFit } from "@/lib/scoreJobFit";

// A user targeting a MANAGER path (P10 shape: mixed IC + manager titles → MAX
// = manager), with skills that match the job so the mismatch is the only lever.
const managerTargetInput = {
  profile: {
    skills_canonical: ["financial_analysis", "budgeting", "forecasting"],
    primary_domain: "finance",
    target_job_titles: [
      "Senior Accountant",
      "Accounting Manager",
      "AP Manager",
    ],
  },
  experiences: [],
  educations: [],
};

// An IC job (title classifies "ic") the user's skills match. Below a manager
// target => underleveled => penalty fires when the flag is on.
const icJob = {
  title: "FP&A Analyst",
  req_skills_core: ["financial_analysis", "budgeting"],
  req_skills_nice: [],
  skill_coverage_ratio: 0.6,
  extraction_confidence: 0.8,
  req_seniority: "Mid",
  function_family: "Finance",
};

describe("scoreJobFit role-tier flag (C4)", () => {
  it("is byte-identical with the flag off (default + explicit false)", () => {
    const v2 = { confidenceAware: true, mustHave: true, directionBlend: true };
    const base = scoreJobFit(managerTargetInput, icJob, v2);
    const explicitOff = scoreJobFit(managerTargetInput, icJob, {
      ...v2,
      roleTier: false,
    });
    expect(explicitOff.attainability_score).toBe(base.attainability_score);
    expect(explicitOff.rank_score).toBe(base.rank_score);
    expect(explicitOff.signals.role_tier).toBeNull();
    expect(explicitOff.signals.target_tier).toBeNull();
  });

  it("penalizes an underleveled (IC job, manager target) match", () => {
    const off = scoreJobFit(managerTargetInput, icJob, {});
    const on = scoreJobFit(managerTargetInput, icJob, { roleTier: true });
    expect(on.attainability_score).toBeLessThan(off.attainability_score);
    // C4 acts on the canonical number only; fit_score (Search tab) is untouched.
    expect(on.fit_score).toBe(off.fit_score);
    // Attribution the harness reads.
    expect(on.signals.role_tier).toBe("ic");
    expect(on.signals.target_tier).toBe("manager");
    expect(on.signals.tier_gap).toBe(-2); // ic(0) - manager(2)
  });

  it("penalizes over-leveled too (manager job, IC target) - both directions", () => {
    const icTargetInput = {
      ...managerTargetInput,
      profile: {
        ...managerTargetInput.profile,
        target_job_titles: ["Senior Accountant", "Internal Auditor"], // MAX = ic
      },
    };
    const managerJob = { ...icJob, title: "Finance Manager" };
    const off = scoreJobFit(icTargetInput, managerJob, {});
    const on = scoreJobFit(icTargetInput, managerJob, { roleTier: true });
    expect(on.attainability_score).toBeLessThan(off.attainability_score);
    expect(on.signals.tier_gap).toBe(2); // manager(2) - ic(0)
  });

  it("does NOT penalize an on-tier match (manager job, manager target)", () => {
    const managerJob = { ...icJob, title: "Finance Manager" };
    const off = scoreJobFit(managerTargetInput, managerJob, {});
    const on = scoreJobFit(managerTargetInput, managerJob, { roleTier: true });
    expect(on.attainability_score).toBe(off.attainability_score);
    expect(on.signals.tier_gap).toBe(0);
  });

  it("abstains (no penalty) when the JOB tier is unknown", () => {
    const keywordlessJob = { ...icJob, title: "Rockstar Ninja" };
    const off = scoreJobFit(managerTargetInput, keywordlessJob, {});
    const on = scoreJobFit(managerTargetInput, keywordlessJob, {
      roleTier: true,
    });
    expect(on.attainability_score).toBe(off.attainability_score);
    expect(on.signals.role_tier).toBeNull();
  });

  it("abstains (no penalty) when the user has no target titles", () => {
    const noTargetInput = {
      ...managerTargetInput,
      profile: { ...managerTargetInput.profile, target_job_titles: [] },
    };
    const off = scoreJobFit(noTargetInput, icJob, {});
    const on = scoreJobFit(noTargetInput, icJob, { roleTier: true });
    expect(on.attainability_score).toBe(off.attainability_score);
    expect(on.signals.target_tier).toBeNull();
  });

  it("penaltyPerStep is sweepable via a params object (harness path)", () => {
    const gentle = scoreJobFit(managerTargetInput, icJob, {
      roleTier: { penaltyPerStep: 0.05 },
    });
    const harsh = scoreJobFit(managerTargetInput, icJob, {
      roleTier: { penaltyPerStep: 0.25 },
    });
    expect(harsh.attainability_score).toBeLessThan(gentle.attainability_score);
  });
});
