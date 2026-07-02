import { describe, it, expect } from "vitest";
import {
  applyAntiFabGate,
  enforceBulletProperNouns,
  filterToolsToSource,
  tokensTraceToMaster,
} from "./cv-antifab.ts";

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

  // Rider 2 regression guard (single-capitalized brand hole, QA Pass 2 P1):
  // fabricated tools die, legitimately-owned tools survive, and normal reworded
  // prose is not over-reverted. This class of hole must never reopen silently.
  it("single-cap: fabricated brand/tool names die (Zendesk/Intercom/Slack/Salesforce)", () => {
    const hay =
      "handled vip clients and documented cases to improve retention".toLowerCase();
    expect(
      tokensTraceToMaster("Managed customer cases end-to-end in Zendesk", hay),
    ).toBe(false);
    expect(
      tokensTraceToMaster("Coordinated support across Intercom and Slack", hay),
    ).toBe(false);
    expect(
      tokensTraceToMaster("Ran campaigns in Salesforce and HubSpot", hay),
    ).toBe(false);
  });

  it("single-cap: a legitimately-owned tool survives; a co-mentioned fabrication still dies", () => {
    const hay =
      "managed customer cases in zendesk and slack for vip clients".toLowerCase();
    expect(
      tokensTraceToMaster("Managed customer cases end-to-end in Zendesk", hay),
    ).toBe(true);
    // Slack is owned, Intercom is not -> the bullet still fails on Intercom.
    expect(
      tokensTraceToMaster("Coordinated support across Intercom and Slack", hay),
    ).toBe(false);
  });

  it("single-cap: does NOT over-revert verb-led or common capitalized prose", () => {
    const hay =
      "works with vip clients; customer success for a cybersecurity company".toLowerCase();
    expect(
      tokensTraceToMaster(
        "Handled VIP clients and improved their satisfaction",
        hay,
      ),
    ).toBe(true);
    expect(
      tokensTraceToMaster(
        "Supported Senior Managers across the Customer Success team",
        hay,
      ),
    ).toBe(true);
    expect(
      tokensTraceToMaster(
        "Collaborated with the Marketing and Product teams in Israel",
        hay,
      ),
    ).toBe(true);
  });

  it("single-cap: end-to-end gate reverts a bullet that invents a brand tool", () => {
    const edited = JSON.parse(JSON.stringify(ORIGINAL));
    // legit rephrase in entry 0, invented "Zendesk" in entry 1's bullets
    edited.professional_experiences[0].bullets = [
      "Designed dashboards used across the team",
    ];
    edited.professional_experiences[1].bullets = [
      "Supported the analytics team using Zendesk",
    ];
    const r = applyAntiFabGate(ORIGINAL, edited);
    expect(r.bulletsReverted).toBe(1);
    expect(r.cv_data.professional_experiences[1].bullets).toEqual(
      ORIGINAL.professional_experiences[1].bullets,
    );
    expect(r.cv_data.professional_experiences[0].bullets).toEqual(
      edited.professional_experiences[0].bullets,
    );
  });
});

// generate-tailored-cv enforcement (QA2 P1, Option A): fabricated tools die via
// removal, legitimately-owned tools survive, numbers stay flag-only, and NO
// experience is ever emptied (#437 regression class -> restore master bullets).
describe("enforceBulletProperNouns (generate-tailored-cv path)", () => {
  const key = (t: unknown, c: unknown) =>
    `${String(t ?? "")
      .trim()
      .toLowerCase()}@@${String(c ?? "")
      .trim()
      .toLowerCase()}`;

  it("drops a bullet inventing a tool, keeps clean bullets, numbers stay flag-only (kept)", () => {
    const cv: any = {
      professional_experiences: [
        {
          title: "Analyst",
          company: "Acme",
          bullets: [
            "Built dashboards used across the team",
            "Managed customer cases in Zendesk",
            "Improved reporting turnaround by 40%",
          ],
        },
      ],
    };
    const hay =
      "built dashboards used across the team; improved reporting turnaround".toLowerCase();
    const master = new Map([
      ["analyst@@acme", ["Built dashboards used across the team"]],
    ]);
    const r = enforceBulletProperNouns(cv, hay, master, key);
    const bullets = cv.professional_experiences[0].bullets;
    expect(r.bulletsEnforced).toBe(1);
    expect(bullets.some((b: string) => /Zendesk/.test(b))).toBe(false);
    expect(bullets).toContain("Built dashboards used across the team");
    expect(bullets.some((b: string) => /40%/.test(b))).toBe(true); // number kept
    expect(r.flags.some((f) => f.tokens.includes("40"))).toBe(true); // and flagged
  });

  it("a legitimately-owned tool survives (traces to source)", () => {
    const cv: any = {
      professional_experiences: [
        {
          title: "CS",
          company: "Guardio",
          bullets: ["Resolved VIP tickets in Zendesk"],
        },
      ],
    };
    const hay = "customer success using zendesk for vip clients".toLowerCase();
    const master = new Map([["cs@@guardio", ["Handled VIP clients"]]]);
    const r = enforceBulletProperNouns(cv, hay, master, key);
    expect(r.bulletsEnforced).toBe(0);
    expect(cv.professional_experiences[0].bullets).toEqual([
      "Resolved VIP tickets in Zendesk",
    ]);
  });

  it("NEVER empties an experience; restores master bullets (#437)", () => {
    const cv: any = {
      professional_experiences: [
        {
          title: "Analyst",
          company: "Acme",
          bullets: ["Managed customer cases in Zendesk"], // only bullet, fabricated
        },
      ],
    };
    const hay = "worked with clients on reporting".toLowerCase();
    const master = new Map([
      [
        "analyst@@acme",
        ["Worked with clients on reporting", "Built internal reports"],
      ],
    ]);
    const r = enforceBulletProperNouns(cv, hay, master, key);
    const bullets = cv.professional_experiences[0].bullets;
    expect(r.bulletsEnforced).toBe(1);
    expect(r.experiencesRestored).toBe(1);
    expect(bullets.length).toBeGreaterThan(0); // invariant: never empty
    expect(bullets.some((b: string) => /Zendesk/.test(b))).toBe(false);
    expect(bullets).toEqual([
      "Worked with clients on reporting",
      "Built internal reports",
    ]);
  });

  it("projects are not subject to the no-empty restore (may end empty)", () => {
    const cv: any = {
      projects: [{ name: "Side", bullets: ["Built with Salesforce"] }],
    };
    const r = enforceBulletProperNouns(
      cv,
      "unrelated content".toLowerCase(),
      new Map(),
      key,
    );
    expect(r.bulletsEnforced).toBe(1);
    expect(r.experiencesRestored).toBe(0);
    expect(cv.projects[0].bullets).toEqual([]);
  });
});

// skills.tools enforcement (QA2 Rider 1 promoted, Option A): unsourced JD tools
// filtered, owned tools kept, section never empty when the user has owned tools.
describe("filterToolsToSource (skills.tools)", () => {
  it("removes unsourced JD tools, keeps owned tools", () => {
    const hay =
      "customer success using zendesk and cursor ai for vip clients".toLowerCase();
    const r = filterToolsToSource(
      ["Zendesk", "Freshdesk", "Gorgias", "Cursor AI"],
      hay,
      ["Zendesk", "Cursor AI"],
    );
    expect(r.removed).toBe(2);
    expect(r.tools).toEqual(["Zendesk", "Cursor AI"]);
    expect(r.tools).not.toContain("Freshdesk");
    expect(r.tools).not.toContain("Gorgias");
  });

  it("never-empty: if all tools are unsourced, falls back to the user's owned tools", () => {
    const r = filterToolsToSource(
      ["Freshdesk", "Gorgias"],
      "no matching tools in this source".toLowerCase(),
      ["Excel", "Zendesk", "Excel"],
    );
    expect(r.removed).toBe(2);
    expect(r.tools).toEqual(["Excel", "Zendesk"]); // owned fallback, deduped
  });

  it("a user with genuinely no owned tools keeps an empty list (honest)", () => {
    const r = filterToolsToSource(["Freshdesk"], "no tools".toLowerCase(), []);
    expect(r.tools).toEqual([]);
    expect(r.removed).toBe(1);
  });
});
