// Unit tests for the deterministic scorer in story-extraction-eval.mjs.
// Picked up by `npm test` (vitest default globs). Importing the harness runs
// only module-level setup — main() is guarded behind a direct-invocation check,
// so no OpenAI call fires here.
import { describe, it, expect } from "vitest";
import {
  metricNumbers,
  scoreLayer1,
  composite,
} from "./story-extraction-eval.mjs";

describe("metricNumbers — metric-shaped extraction + regex guards", () => {
  it("captures %/magnitude/currency figures", () => {
    const n = metricNumbers("cut alerts by 40% across 29 tables");
    expect(n.has(40)).toBe(true);
    expect(n.has(29)).toBe(true);
  });

  it("expands attached k/m/bn suffixes", () => {
    expect(metricNumbers("~15k arr").has(15000)).toBe(true);
    expect(metricNumbers("raised $2m seed").has(2000000)).toBe(true);
    expect(metricNumbers("$48K up from $30K").has(48000)).toBe(true);
    expect(metricNumbers("$48K up from $30K").has(30000)).toBe(true);
  });

  it("ignores bare small integers (not metric-shaped)", () => {
    expect(metricNumbers("a 3-person team").has(3)).toBe(false);
  });

  // Regression: the 2026-07-23 bug where a number followed by a space + a word
  // starting with k/m/b absorbed that letter as a magnitude suffix.
  it("does NOT read '20 meetings' as 20,000,000", () => {
    const n = metricNumbers(
      "booking over 20 meetings in Q3, resulting in 3 closed deals",
    );
    expect(n.has(20)).toBe(true);
    expect(n.has(20000000)).toBe(false);
  });

  it("does NOT absorb a spaced unit word ('5 kilometers')", () => {
    expect(metricNumbers("ran 5 kilometers").has(5000)).toBe(false);
  });

  // Ordinal guard: the (?![a-z]) lookahead blocks "29th" from matching "29".
  it("ordinal guard: '29th place' yields no metric number", () => {
    expect(metricNumbers("finished 29th place").size).toBe(0);
  });
});

describe("scoreLayer1 — anti-fab gate", () => {
  const richIn = {
    text: "cut false-positive alerts by 40% across all 29 Postgres tables using Python and SQLAlchemy on a nightly cron",
    known_metrics: ["40%", "29"],
    known_tools: ["Python", "SQLAlchemy", "Postgres", "cron"],
    richness: "rich",
  };

  it("passes a clean grounded rich output", () => {
    const out = {
      bullets: [
        "Built a Python churn-scoring fetcher across all 29 Postgres tables that cut false-positive alerts by 40% using SQLAlchemy",
      ],
      skills: ["Python", "SQLAlchemy", "PostgreSQL"],
    };
    const s = scoreLayer1(richIn, out);
    expect(s.anti_fab_pass).toBe(true);
    expect(s.metric_fidelity).toBe(1);
    expect(s.tool_coverage).toBeGreaterThanOrEqual(0.75);
    expect(composite(s, null)).toBeGreaterThan(0);
  });

  it("fails on an invented number and forces composite 0", () => {
    const out = {
      bullets: ["Built a fetcher that cut alerts by 55% and saved $120K"],
      skills: ["Python"],
    };
    const s = scoreLayer1(richIn, out);
    expect(s.anti_fab_pass).toBe(false);
    expect(s.invented_numbers).toContain(55);
    expect(composite(s, null)).toBe(0);
  });

  it("fails on an invented tool (Figma not in source)", () => {
    const s = scoreLayer1(richIn, {
      bullets: ["Built a churn dashboard"],
      skills: ["Figma", "Python"],
    });
    expect(s.anti_fab_pass).toBe(false);
    expect(s.invented_tools).toContain("figma");
  });

  it("does not flag a spelling alias (Postgres vs PostgreSQL)", () => {
    const s = scoreLayer1(
      {
        text: "queried our Postgres tables",
        known_metrics: [],
        known_tools: ["Postgres"],
        richness: "mid",
      },
      {
        bullets: ["Queried the team's PostgreSQL tables to surface gaps"],
        skills: ["PostgreSQL"],
      },
    );
    expect(s.anti_fab_pass).toBe(true);
  });

  // The round-1 leak the recalibration removes: profile skills emitted as
  // demonstrated skills on a paste that never mentioned them.
  it("catches profile-vocabulary leakage as invented tools", () => {
    const thinIn = {
      text: "I wrote a script to clean up our database.",
      known_metrics: [],
      known_tools: [],
      richness: "thin",
    };
    const clean = scoreLayer1(thinIn, {
      bullets: ["Wrote a script to clean up and standardise the team database"],
      skills: ["Database Management", "Scripting"],
    });
    expect(clean.anti_fab_pass).toBe(true);
    const leaked = scoreLayer1(thinIn, {
      bullets: ["Wrote a script to clean up the database"],
      skills: ["Python", "SQL"],
    });
    expect(leaked.anti_fab_pass).toBe(false);
    expect(leaked.invented_tools).toEqual(
      expect.arrayContaining(["python", "sql"]),
    );
  });
});

describe("scoreLayer1 — fidelity + language", () => {
  it("metric_fidelity is 1 when the input has no metrics", () => {
    const s = scoreLayer1(
      {
        text: "I wrote a script to clean up our database.",
        known_metrics: [],
        known_tools: [],
        richness: "thin",
      },
      {
        bullets: ["Wrote a script to clean up the team database"],
        skills: ["Data Cleaning"],
      },
    );
    expect(s.metric_fidelity).toBe(1);
  });

  it("detects Hebrew output vs English output", () => {
    const hebIn = {
      text: "הורדנו את ה-churn ב-12%",
      known_metrics: ["12%"],
      known_tools: [],
      richness: "rich",
    };
    expect(
      scoreLayer1(hebIn, {
        bullets: ["הורדתי את שיעור הנטישה ב-12% תוך רבעון"],
        skills: [],
      }).output_language_en,
    ).toBe(false);
    expect(
      scoreLayer1(hebIn, {
        bullets: ["Reduced customer churn by 12% within a quarter"],
        skills: ["Data Analysis"],
      }).output_language_en,
    ).toBe(true);
  });
});
