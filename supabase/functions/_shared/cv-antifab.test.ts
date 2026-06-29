import { describe, it, expect } from "vitest";
import { applyAntiFabGate, tokensTraceToMaster } from "./cv-antifab.ts";

// The pre-edit cv_data is the trace corpus. Two professional entries so we can
// show per-entry revert: one entry's edit is legit (kept), another's introduces
// fabrication (its whole bullet list reverts).
const ORIGINAL = {
  header: { name: "Dana Cohen", subtitle: "Data Analyst" },
  summary: "Analyst with three years in fintech, focused on reporting.",
  professional_experiences: [
    {
      title: "Analyst",
      company: "Acme",
      dates: "2023 – Present",
      bullets: [
        "Built dashboards used across teams",
        "Cut reporting time by automating the pipeline",
      ],
    },
    {
      title: "Intern",
      company: "Beta",
      dates: "2022",
      bullets: ["Supported the analytics team"],
    },
  ],
  education: [
    {
      institution: "Tel Aviv University",
      degree: "B.A.",
      field_of_study: "Economics",
      dates: "2021",
    },
  ],
  skills: { domain: ["Excel"], tools: [], technical: [] },
};

describe("applyAntiFabGate", () => {
  it("reverts an entry that invents a metric, keeps a legit rephrase in another", () => {
    const edited = JSON.parse(JSON.stringify(ORIGINAL));
    // entry 0 — legit rephrase, no new numbers/tools → KEEP
    edited.professional_experiences[0].bullets = [
      "Built executive dashboards used across the team",
      "Reduced reporting time by automating the pipeline",
    ];
    // entry 1 — invents a metric "40%" not in the source → that entry reverts
    edited.professional_experiences[1].bullets = [
      "Supported the analytics team, increasing output by 40%",
    ];

    const r = applyAntiFabGate(ORIGINAL, edited);
    // legit rephrase survived
    expect(r.cv_data.professional_experiences[0].bullets).toEqual([
      "Built executive dashboards used across the team",
      "Reduced reporting time by automating the pipeline",
    ]);
    // fabricated entry reverted to pre-edit bullets verbatim
    expect(r.cv_data.professional_experiences[1].bullets).toEqual([
      "Supported the analytics team",
    ]);
    expect(r.bulletsReverted).toBe(1);
  });

  it("reverts an entry that invents a tool (ALLCAPS proper noun)", () => {
    const edited = JSON.parse(JSON.stringify(ORIGINAL));
    edited.professional_experiences[0].bullets = [
      "Built dashboards used across teams on AWS", // AWS not in source
      "Cut reporting time by automating the pipeline",
    ];
    const r = applyAntiFabGate(ORIGINAL, edited);
    expect(r.cv_data.professional_experiences[0].bullets).toEqual(
      ORIGINAL.professional_experiences[0].bullets,
    );
    expect(r.bulletsReverted).toBe(1);
  });

  it("facts-immutable: reverts seniority inflation (Analyst -> Senior Analyst)", () => {
    const edited = JSON.parse(JSON.stringify(ORIGINAL));
    edited.professional_experiences[0].title = "Senior Analyst";
    edited.professional_experiences[0].company = "Acme Corp"; // employer rewrite
    const r = applyAntiFabGate(ORIGINAL, edited);
    expect(r.cv_data.professional_experiences[0].title).toBe("Analyst");
    expect(r.cv_data.professional_experiences[0].company).toBe("Acme");
    expect(r.factsReverted).toBeGreaterThan(0);
  });

  it("reverts a summary that invents a number", () => {
    const edited = JSON.parse(JSON.stringify(ORIGINAL));
    edited.summary = "Analyst who boosted revenue 25% across the team."; // 25% not in source
    const r = applyAntiFabGate(ORIGINAL, edited);
    expect(r.cv_data.summary).toBe(ORIGINAL.summary);
    expect(r.summaryReverted).toBe(true);
  });

  it("passes a fully legit edit untouched (no fabrication, facts unchanged)", () => {
    const edited = JSON.parse(JSON.stringify(ORIGINAL));
    edited.professional_experiences[0].bullets = [
      "Designed dashboards used across the team",
      "Automated the pipeline to speed up reporting",
    ];
    edited.summary = "Data analyst focused on reporting in fintech.";
    const r = applyAntiFabGate(ORIGINAL, edited);
    expect(r.bulletsReverted).toBe(0);
    expect(r.factsReverted).toBe(0);
    expect(r.summaryReverted).toBe(false);
    expect(r.cv_data.professional_experiences[0].bullets).toEqual(
      edited.professional_experiences[0].bullets,
    );
    expect(r.cv_data.summary).toBe(edited.summary);
  });

  it("primitive: tokensTraceToMaster catches an untraceable number/tool", () => {
    const hay = "built dashboards used across teams".toLowerCase();
    expect(tokensTraceToMaster("built dashboards", hay)).toBe(true);
    expect(tokensTraceToMaster("grew revenue 40%", hay)).toBe(false);
    expect(tokensTraceToMaster("deployed on AWS", hay)).toBe(false);
  });
});
