// Tests for the CV server-driven experience reconciliation.
//
// The contract these tests lock:
//   1. One output entry per source experience — no entry is ever dropped.
//   2. title / org / dates are stamped from the source, never the LLM.
//   3. Index-based bullet attachment separates same-dated entries cleanly.
//   4. Out-of-range LLM indices fall back to positional attachment + log.
//   5. Missing bullets fall back to source.responsibilities so the
//      experience still renders content.
//   6. Date rendering uses real end-dates for past roles ("Mon YYYY –
//      Mon YYYY") and "Present" only when is_current is true.

import { describe, it, expect, vi } from "vitest";
import {
  fillFromSource,
  formatExperienceDates,
  bulletCoveredBy,
  type ReconcileWarning,
  type SourceExperience,
  resolveAuthoringRole,
} from "./reconcile";

const src = (overrides: Partial<SourceExperience> = {}): SourceExperience => ({
  title: "Engineer",
  company: "Acme",
  start_date: "Jan 2024",
  end_date: "",
  is_current: true,
  responsibilities: "",
  ...overrides,
});

describe("fillFromSource — server-driven CV reconciliation", () => {
  it("case 1 — two experiences correctly resolved by index, no cross-contamination", () => {
    const sources = [
      src({ title: "Engineer", company: "Wiz", start_date: "Jan 2024", is_current: true }),
      src({ title: "Manager", company: "Monday", start_date: "Jun 2022", end_date: "Dec 2023", is_current: false }),
    ];
    const llm = [
      { index: 0, bullets: ["built Wiz feature"] },
      { index: 1, bullets: ["led Monday team"] },
    ];

    const result = fillFromSource(sources, llm, "company");

    expect(result).toHaveLength(2);
    expect(result[0].title).toBe("Engineer");
    expect(result[0].company).toBe("Wiz");
    expect(result[0].bullets).toEqual(["built Wiz feature"]);
    expect(result[1].title).toBe("Manager");
    expect(result[1].company).toBe("Monday");
    expect(result[1].bullets).toEqual(["led Monday team"]);
  });

  it("case 2 — out-of-range LLM index falls back to positional attachment, no experience lost", () => {
    const sources = [
      src({ title: "Soldier", company: "IDF", start_date: "Aug 2018", end_date: "Aug 2021", is_current: false, responsibilities: "Trained recruits." }),
    ];
    const llm = [
      { index: 99, bullets: ["civilian-readable bullet"] },
    ];
    const logger = vi.fn();

    const result = fillFromSource(sources, llm, "unit", { logger });

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Soldier");
    expect(result[0].unit).toBe("IDF");
    expect(result[0].bullets).toEqual(["civilian-readable bullet"]);
    expect(logger).toHaveBeenCalledWith(expect.stringContaining("out-of-range index=99"));
  });

  it("case 3 — two current experiences with identical 'Present' dates separated by index", () => {
    const sources = [
      src({ title: "Founder", company: "Startup A", start_date: "Jan 2024", is_current: true }),
      src({ title: "Advisor", company: "Startup B", start_date: "Mar 2025", is_current: true }),
    ];
    const llm = [
      { index: 0, bullets: ["A bullet"] },
      { index: 1, bullets: ["B bullet"] },
    ];

    const result = fillFromSource(sources, llm, "company");

    expect(result).toHaveLength(2);
    expect(result[0].company).toBe("Startup A");
    expect(result[0].bullets).toEqual(["A bullet"]);
    expect(result[0].dates).toBe("Jan 2024 – Present");
    expect(result[1].company).toBe("Startup B");
    expect(result[1].bullets).toEqual(["B bullet"]);
    expect(result[1].dates).toBe("Mar 2025 – Present");
  });

  it("case 4 — DB title that looks like a sentence passes through verbatim (no sanitizer clobber)", () => {
    const sources = [
      src({
        title: "Supervised and trained teams of soldiers",
        company: "IDF — Combat Engineering Corps",
        start_date: "Aug 2018",
        end_date: "Aug 2021",
        is_current: false,
      }),
    ];
    const llm = [{ index: 0, bullets: ["bullet"] }];

    const result = fillFromSource(sources, llm, "unit");

    expect(result[0].title).toBe("Supervised and trained teams of soldiers");
    expect(result[0].unit).toBe("IDF — Combat Engineering Corps");
  });

  it("case 5 — past role with real end_date renders as 'Mar 2020 – Nov 2022', not 'Present'", () => {
    const sources = [
      src({
        title: "Analyst",
        company: "Bank",
        start_date: "Mar 2020",
        end_date: "Nov 2022",
        is_current: false,
      }),
    ];
    const llm = [{ index: 0, bullets: ["bullet"] }];

    const result = fillFromSource(sources, llm, "company");

    expect(result[0].dates).toBe("Mar 2020 – Nov 2022");
    expect(result[0].dates).not.toMatch(/present/i);
  });

  it("case 6 — server-driven fill produces one output per source even with out-of-order / omitted LLM entries; responsibilities fallback when no bullets", () => {
    const sources = [
      src({ title: "Role A", company: "Co A", start_date: "Jan 2024", is_current: true }),
      src({
        title: "Role B",
        company: "Co B",
        start_date: "Jun 2022",
        end_date: "Dec 2023",
        is_current: false,
        responsibilities: "Ran B operations.\nManaged B team of 4.",
      }),
      src({ title: "Role C", company: "Co C", start_date: "Mar 2021", end_date: "May 2022", is_current: false }),
    ];
    // LLM returns C and A (out of order) and omits B entirely.
    const llm = [
      { index: 2, bullets: ["C bullet"] },
      { index: 0, bullets: ["A bullet"] },
    ];

    const result = fillFromSource(sources, llm, "company");

    expect(result).toHaveLength(3);
    expect(result[0].company).toBe("Co A");
    expect(result[0].bullets).toEqual(["A bullet"]);
    expect(result[1].company).toBe("Co B");
    expect(result[1].bullets).toEqual(["Ran B operations.", "Managed B team of 4."]);
    expect(result[2].company).toBe("Co C");
    expect(result[2].bullets).toEqual(["C bullet"]);
  });
});

describe("fillFromSource — reconcile warnings (additive instrumentation, no behavior change)", () => {
  it("emits a positional_fallback warning when an out-of-range index is rescued by slot-j attachment", () => {
    const sources = [src({ title: "Soldier", company: "IDF", responsibilities: "Trained recruits." })];
    const llm = [{ index: 99, bullets: ["civilian-readable bullet"] }];
    const warnings: ReconcileWarning[] = [];

    const result = fillFromSource(sources, llm, "unit", { warnings, bucket: "military_experiences" });

    // Behavior is unchanged — slot 0 still attaches the bullet via positional rescue.
    expect(result[0].bullets).toEqual(["civilian-readable bullet"]);
    // And a structured warning was recorded for the caller to surface.
    expect(warnings).toEqual([
      { bucket: "military_experiences", kind: "positional_fallback", entry_position: 0, llm_index: 99, source_index: 0 },
    ]);
  });

  it("emits an unclaimed_entry warning when an out-of-range index has no positional slot (the agamf123 shape)", () => {
    // The bake-off failure shape: misrouted bucket has zero sources, the LLM's
    // bullets vanish silently from this bucket's render.
    const sources: SourceExperience[] = [];
    const llm = [{ index: 4, bullets: ["Led a team of 6 soldiers in the Tavor Battalion"] }];
    const warnings: ReconcileWarning[] = [];

    const result = fillFromSource(sources, llm, "unit", { warnings, bucket: "military_experiences" });

    // Render: empty bucket (no sources). LLM bullets dropped.
    expect(result).toEqual([]);
    // Warning recorded so the caller can flag the silent drop.
    expect(warnings).toEqual([
      { bucket: "military_experiences", kind: "unclaimed_entry", entry_position: 0, llm_index: 4 },
    ]);
  });

  it("emits an unclaimed_entry warning when the LLM emits a duplicate index (only first claims)", () => {
    const sources = [
      src({ title: "Role A", company: "Co A" }),
      src({ title: "Role B", company: "Co B" }),
    ];
    const llm = [
      { index: 0, bullets: ["first A bullet"] },
      { index: 0, bullets: ["second A bullet — should be lost"] },
    ];
    const warnings: ReconcileWarning[] = [];

    const result = fillFromSource(sources, llm, "company", { warnings });

    // Render: slot 0 has the first claim's bullets; slot 1 falls back to its
    // own (empty) responsibilities. The second LLM entry's bullets are dropped.
    expect(result[0].bullets).toEqual(["first A bullet"]);
    expect(result[1].bullets).toEqual([]);
    // Warning recorded for the silently-dropped duplicate.
    expect(warnings).toEqual([
      { bucket: "company", kind: "unclaimed_entry", entry_position: 1, llm_index: 0 },
    ]);
  });
});

describe("formatExperienceDates", () => {
  it("formats start + Present for current roles", () => {
    expect(formatExperienceDates("Jan 2024", "", true)).toBe("Jan 2024 – Present");
  });
  it("formats start + end for past roles", () => {
    expect(formatExperienceDates("Mar 2020", "Nov 2022", false)).toBe("Mar 2020 – Nov 2022");
  });
  it("normalises long month names", () => {
    expect(formatExperienceDates("October 2025", "December 2025", false)).toBe("Oct 2025 – Dec 2025");
  });
  it("normalises numeric MM/YYYY", () => {
    expect(formatExperienceDates("3/2020", "11/2022", false)).toBe("Mar 2020 – Nov 2022");
  });
  it("year-only passes through", () => {
    expect(formatExperienceDates("2020", "2022", false)).toBe("2020 – 2022");
  });
  it("empty inputs render empty", () => {
    expect(formatExperienceDates("", "", false)).toBe("");
  });
});

describe("fillFromSource curated bullets source preference (PR #321 Phase-4 read side)", () => {
  it("bullets populated, LLM omits the slot - output bullets come from source.bullets, NOT responsibilities", () => {
    const sources = [
      src({
        title: "CS Specialist",
        company: "Guardio",
        responsibilities: "Generic VIP support prose.",
        bullets: ["Built a QA pipeline for the AI voice bot", "Redesigned the social-media auto-moderation system"],
      }),
    ];
    // LLM returns nothing, forcing the no-LLM-bullets fallback.
    const result = fillFromSource(sources, [], "company");

    expect(result).toHaveLength(1);
    expect(result[0].company).toBe("Guardio");
    expect(result[0].bullets).toEqual([
      "Built a QA pipeline for the AI voice bot",
      "Redesigned the social-media auto-moderation system",
    ]);
  });

  it("bullets empty, LLM omits the slot - falls back to responsibilitiesToBullets(responsibilities) as before", () => {
    const sources = [
      src({ title: "Role B", company: "Co B", bullets: [], responsibilities: "Ran B operations.\nManaged B team of 4." }),
    ];
    const result = fillFromSource(sources, [], "company");

    expect(result[0].bullets).toEqual(["Ran B operations.", "Managed B team of 4."]);
  });

  it("mixed sources - each experience uses its own correct source (bullets vs responsibilities)", () => {
    const sources = [
      src({ title: "Curated", company: "HasBullets", bullets: ["curated bullet one", "curated bullet two"], responsibilities: "ignored prose." }),
      src({ title: "Legacy", company: "NoBullets", responsibilities: "legacy line one\nlegacy line two" }),
    ];
    // LLM omits both, so each falls back to its own preferred source.
    const result = fillFromSource(sources, [], "company");

    expect(result[0].company).toBe("HasBullets");
    expect(result[0].bullets).toEqual(["curated bullet one", "curated bullet two"]);
    expect(result[1].company).toBe("NoBullets");
    expect(result[1].bullets).toEqual(["legacy line one", "legacy line two"]);
  });

  it("LLM-emitted bullets still win over curated source bullets (tailoring path unchanged)", () => {
    const sources = [
      src({ title: "CS Specialist", company: "Guardio", bullets: ["raw curated bullet"], responsibilities: "prose" }),
    ];
    const llm = [{ index: 0, bullets: ["JD-tailored bullet"] }];
    const result = fillFromSource(sources, llm, "company");

    expect(result[0].bullets).toEqual(["JD-tailored bullet"]);
  });

  it("blank/whitespace curated bullets are dropped before the fallback decision", () => {
    const sources = [
      src({ title: "Role", company: "Co", bullets: ["  ", ""], responsibilities: "real line" }),
    ];
    const result = fillFromSource(sources, [], "company");

    // All curated entries were blank, so it falls through to responsibilities.
    expect(result[0].bullets).toEqual(["real line"]);
  });
});

describe("fillFromSource — A1 attribution verification (cv_reconcile_verify)", () => {
  const getajob = src({ title: "Creator", company: "Get A Job", responsibilities: "Built the platform solo" });
  const guardio = src({ title: "CSS VIP", company: "Guardio", responsibilities: "Handled VIP users" });

  it("swapped indices: wrong bullets do NOT land under the wrong title + warning emitted", () => {
    const warnings: ReconcileWarning[] = [];
    // entry 0 describes Get A Job but points at index 1 (Guardio); entry 1 the reverse.
    const result = fillFromSource(
      [getajob, guardio],
      [
        { index: 1, company_check: "Get A Job", bullets: ["Built the platform solo, 50+ users"] },
        { index: 0, company_check: "Guardio", bullets: ["VIP users, cybersecurity startup"] },
      ],
      "company",
      { warnings, verifyAttribution: true },
    );
    // slot 0 (Get A Job) must NOT carry the Guardio bullet — falls back to its own responsibilities.
    expect(result[0].company).toBe("Get A Job");
    expect(result[0].bullets.join(" ")).not.toContain("VIP users");
    expect(result[0].bullets).toEqual(["Built the platform solo"]);
    // slot 1 (Guardio) must NOT carry the Get A Job bullet.
    expect(result[1].company).toBe("Guardio");
    expect(result[1].bullets.join(" ")).not.toContain("Built the platform solo, 50+");
    expect(result[1].bullets).toEqual(["Handled VIP users"]);
    // exactly the two mismatches flagged, nothing else.
    expect(warnings.filter((w) => w.kind === "attribution_mismatch")).toHaveLength(2);
    expect(warnings.every((w) => w.kind === "attribution_mismatch")).toBe(true);
  });

  it("honest case (stub matches index, paraphrased) unchanged — bullets attach, no warning", () => {
    const warnings: ReconcileWarning[] = [];
    const result = fillFromSource(
      [getajob, guardio],
      [
        { index: 0, company_check: "Get a Job", bullets: ["Built the platform solo, 50+ users"] }, // case-paraphrase
        { index: 1, company_check: "Guardio", bullets: ["VIP users, cybersecurity startup"] },
      ],
      "company",
      { warnings, verifyAttribution: true },
    );
    expect(result[0].bullets).toEqual(["Built the platform solo, 50+ users"]);
    expect(result[1].bullets).toEqual(["VIP users, cybersecurity startup"]);
    expect(warnings).toHaveLength(0);
  });

  it("flag OFF: mismatched stubs ignored — byte-identical to today (bullets attach by index)", () => {
    const warnings: ReconcileWarning[] = [];
    const result = fillFromSource(
      [getajob, guardio],
      [
        { index: 0, company_check: "Guardio", bullets: ["VIP users"] }, // stub disagrees, but flag OFF
        { index: 1, company_check: "Get A Job", bullets: ["Built the platform"] },
      ],
      "company",
      { warnings }, // verifyAttribution undefined → OFF
    );
    expect(result[0].bullets).toEqual(["VIP users"]);
    expect(result[1].bullets).toEqual(["Built the platform"]);
    expect(warnings.filter((w) => w.kind === "attribution_mismatch")).toHaveLength(0);
  });

  it("no stub echoed: verification is a no-op (fail open) even when ON", () => {
    const warnings: ReconcileWarning[] = [];
    const result = fillFromSource(
      [getajob, guardio],
      [
        { index: 0, bullets: ["A"] },
        { index: 1, bullets: ["B"] },
      ],
      "company",
      { warnings, verifyAttribution: true },
    );
    expect(result[0].bullets).toEqual(["A"]);
    expect(result[1].bullets).toEqual(["B"]);
    expect(warnings).toHaveLength(0);
  });

  it("title-only echo (no company_check/company) is accepted — a title is not an org", () => {
    const warnings: ReconcileWarning[] = [];
    const result = fillFromSource(
      [getajob, guardio],
      [
        { index: 0, title: "Anything At All", bullets: ["kept"] }, // title echoed, NO company stub, correct index
        { index: 1, bullets: ["also kept"] },
      ],
      "company",
      { warnings, verifyAttribution: true },
    );
    expect(result[0].bullets).toEqual(["kept"]);
    expect(result[1].bullets).toEqual(["also kept"]);
    expect(warnings).toHaveLength(0);
  });
});


describe("resolveAuthoringRole — A5 (gtc_author_from_app)", () => {
  it("fromApp + differing app role → authors from the app role, overridden flagged", () => {
    expect(resolveAuthoringRole("Data Analyst", "Product Manager", true))
      .toEqual({ role: "Product Manager", overridden: true });
  });
  it("fromApp + matching app role (case-insensitive) → app role, NOT flagged", () => {
    expect(resolveAuthoringRole("product manager", "Product Manager", true))
      .toEqual({ role: "Product Manager", overridden: false });
  });
  it("flag OFF → caller role unchanged (byte-identical)", () => {
    expect(resolveAuthoringRole("Data Analyst", "Product Manager", false))
      .toEqual({ role: "Data Analyst", overridden: false });
  });
  it("fromApp but no app role → caller role (no app to author from)", () => {
    expect(resolveAuthoringRole("Data Analyst", "", true))
      .toEqual({ role: "Data Analyst", overridden: false });
  });
});

// ── CV Excellence Arc P1 — retention floor ────────────────────────────────
// Eval gate encoded from the 2026-07-08 6-CV set: the LLM under-emitted bullets
// for full-profile experiences (Get a Job 5→2, Guardio 7→5) and reconcile kept
// the subset. The floor restores every dropped stored bullet and flags it
// deprioritized, without doubling reworded ones. Eli's rule: all stored bullets
// appear by default; AI never silently drops.
describe("fillFromSource — retention floor (P1)", () => {
  // "Get a Job" analog: 5 stored, model emits 2 (rewords of #1 and #3).
  const GETAJOB = [
    "Built the platform solo end to end React Tailwind frontend Supabase Postgres backend",
    "Took the platform from zero to fifty activated users through a Reichman student cohort",
    "Built an automated job sourcing pipeline integrating Greenhouse Lever Ashby Workday",
    "Scoped requirements through discovery sessions and launched two pilot cohorts",
    "Conducted career coaching sessions that led to building and presenting the MVP",
  ];

  it("restores the dropped stored bullets to 5/5 (before: 2) and flags 3 deprioritized", () => {
    const sources = [src({ title: "Creator", company: "Get a Job", bullets: GETAJOB })];
    // Model emitted rewords of bullets 0 and 2 only — 3 were dropped.
    const llm = [
      {
        index: 0,
        bullets: [
          "Built the entire platform end-to-end: React Tailwind frontend, Supabase Postgres backend",
          "Built an automated job-sourcing pipeline integrating Greenhouse, Lever, Ashby and Workday",
        ],
      },
    ];
    const result = fillFromSource(sources, llm, "company");
    expect(result[0].bullets).toHaveLength(5); // 2 reworded + 3 restored
    expect(result[0].deprioritized_bullets).toHaveLength(3);
    // the two reworded stored bullets are NOT duplicated (covered)
    expect(result[0].deprioritized_bullets).not.toContain(GETAJOB[0]);
    expect(result[0].deprioritized_bullets).not.toContain(GETAJOB[2]);
    // the three genuinely-dropped stored bullets are restored verbatim
    expect(result[0].bullets).toContain(GETAJOB[1]);
    expect(result[0].bullets).toContain(GETAJOB[3]);
    expect(result[0].bullets).toContain(GETAJOB[4]);
  });

  it("Guardio analog: 7 stored, model emits 5 rewords → floor restores to 7/7", () => {
    const stored = [
      "Managed high touch relationships with VIP cybersecurity users handling technical support",
      "Analyzed VIP user journeys identifying systemic authorization charge issues driving policy changes",
      "Designed an AI assistant bot with Cursor and Claude giving agents real time analytics",
      "Led quality assurance for AI customer service bots with the product growth team",
      "Enhanced social media response relevance ninety eight percent through smart keyword triggers",
      "Compared AI models to improve customer response quality across support channels",
      "Developed a Python fetcher proactively identifying customers likely to face platform issues",
    ];
    const sources = [src({ title: "CS Specialist", company: "Guardio", bullets: stored })];
    // rewords of 0,1,2,3,4 — bullets 5 and 6 dropped
    const llm = [{ index: 0, bullets: stored.slice(0, 5).map((b) => b + " (reworded for the role)") }];
    const result = fillFromSource(sources, llm, "company");
    expect(result[0].bullets).toHaveLength(7);
    expect(result[0].deprioritized_bullets).toEqual([stored[5], stored[6]]);
  });

  it("no-op when the model already emitted every stored bullet (no false duplicates, no flag)", () => {
    const sources = [src({ company: "Acme", bullets: GETAJOB })];
    const llm = [{ index: 0, bullets: GETAJOB.map((b) => b + " tailored") }];
    const result = fillFromSource(sources, llm, "company");
    expect(result[0].bullets).toHaveLength(5);
    expect(result[0].deprioritized_bullets).toBeUndefined();
  });

  it("does not touch experiences with no stored bullets (legacy responsibilities path unchanged)", () => {
    const sources = [src({ company: "Acme", bullets: [], responsibilities: "Did a thing.\nDid another." })];
    const llm = [{ index: 0, bullets: ["One emitted bullet"] }];
    const result = fillFromSource(sources, llm, "company");
    expect(result[0].bullets).toEqual(["One emitted bullet"]);
    expect(result[0].deprioritized_bullets).toBeUndefined();
  });

  it("bulletCoveredBy treats a reword as covered but a distinct bullet as not", () => {
    const stored = "Built an automated job sourcing pipeline integrating Greenhouse Lever Ashby Workday";
    expect(bulletCoveredBy(stored, ["Built an automated job-sourcing pipeline across Greenhouse, Lever, Ashby, Workday"])).toBe(true);
    expect(bulletCoveredBy(stored, ["Managed VIP customer relationships and technical support"])).toBe(false);
  });
});
