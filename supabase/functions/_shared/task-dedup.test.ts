// Unit tests for the task-dedup helpers (normalize / dedupe / cap /
// prompt block). Locks the contract that generate-tasks consumes:
//   - stopword-stripped lowercase+trim normalization catches realistic
//     noun-phrase variants ("Define target roles" ≡ "Define your
//     target roles") observed in live duplication data 2026-06-04
//   - dedup no-ops cleanly on empty history (onboarding first-run path)
//   - hard cap preserves high-priority tasks even when LLM lists low
//     priority first
//   - prompt-history block returns empty when no history (no extra
//     prompt cruft on first-run)

import { describe, it, expect } from "vitest";
import {
  normalizeTaskTitle,
  dedupeAgainstHistory,
  capTasksByPriority,
  buildCompletedHistoryBlock,
  MAX_TASKS,
  TASK_TITLE_STOPWORDS,
} from "./task-dedup";

describe("normalizeTaskTitle", () => {
  it("lowercases + trims", () => {
    expect(normalizeTaskTitle("  Update CV  ")).toBe("update cv");
  });

  it("strips the explicit stopword list", () => {
    expect(normalizeTaskTitle("Define your target roles")).toBe("define target roles");
    expect(normalizeTaskTitle("Apply to a job")).toBe("apply job");
    expect(normalizeTaskTitle("Tailor your CV for product roles")).toBe("tailor cv product roles");
  });

  it("treats the canonical live-data collision as equivalent", () => {
    // The actual pair from the 2026-06-04 live audit.
    expect(normalizeTaskTitle("Define target roles"))
      .toBe(normalizeTaskTitle("Define your target roles"));
  });

  it("collapses internal whitespace", () => {
    expect(normalizeTaskTitle("Update    your   CV")).toBe("update cv");
  });

  it("returns empty string for non-string / empty input", () => {
    expect(normalizeTaskTitle("")).toBe("");
    expect(normalizeTaskTitle(null as any)).toBe("");
    expect(normalizeTaskTitle(undefined as any)).toBe("");
    expect(normalizeTaskTitle(42 as any)).toBe("");
  });

  it("does NOT collapse genuinely distinct tasks (no false positives on stopword list)", () => {
    // "Apply by Friday" vs "Apply Friday" — stopword list intentionally
    // excludes "by" so these stay distinct.
    expect(normalizeTaskTitle("Apply by Friday"))
      .not.toBe(normalizeTaskTitle("Apply Friday"));
    // Different verbs stay distinct.
    expect(normalizeTaskTitle("Update your CV"))
      .not.toBe(normalizeTaskTitle("Enhance your CV"));
  });

  it("stopword list is the documented small set, not arbitrarily long", () => {
    // Lock the list — accidental additions risk false-positive collapses.
    expect([...TASK_TITLE_STOPWORDS].sort()).toEqual(
      ["a", "an", "the", "your", "my", "for", "to", "of"].sort(),
    );
  });
});

describe("dedupeAgainstHistory", () => {
  const mk = (title: string, priority = "medium") => ({ title, priority });

  it("drops exact-match titles", () => {
    const generated = [mk("Update CV"), mk("Network with PMs")];
    const history = ["Update CV"];
    expect(dedupeAgainstHistory(generated, history)).toEqual([mk("Network with PMs")]);
  });

  it("drops stopword-variant matches (the live-data pattern)", () => {
    const generated = [mk("Define target roles"), mk("Apply to 3 jobs")];
    const history = ["Define your target roles"];
    expect(dedupeAgainstHistory(generated, history)).toEqual([mk("Apply to 3 jobs")]);
  });

  it("no-ops cleanly on empty history (onboarding first-run path)", () => {
    const generated = [mk("Anything"), mk("Else")];
    expect(dedupeAgainstHistory(generated, [])).toEqual(generated);
    expect(dedupeAgainstHistory(generated, null as any)).toEqual(generated);
  });

  it("returns [] on empty generated", () => {
    expect(dedupeAgainstHistory([], ["history"])).toEqual([]);
    expect(dedupeAgainstHistory(null as any, ["history"])).toEqual([]);
  });

  it("both empty → []", () => {
    expect(dedupeAgainstHistory([], [])).toEqual([]);
  });

  it("preserves stable order for surviving tasks", () => {
    const generated = [mk("A"), mk("B"), mk("C"), mk("D")];
    const history = ["B"];
    expect(dedupeAgainstHistory(generated, history).map((t) => t.title))
      .toEqual(["A", "C", "D"]);
  });

  it("keeps tasks with empty/non-string titles (downstream validators reject them)", () => {
    const generated = [{ title: "", priority: "low" } as any, mk("Real task")];
    expect(dedupeAgainstHistory(generated, ["Real task"])).toEqual([generated[0]]);
  });
});

describe("capTasksByPriority", () => {
  const mk = (title: string, priority: string) => ({ title, priority });

  it("preserves all high-priority tasks when LLM orders low-first", () => {
    const tasks = [
      mk("low-1", "low"), mk("low-2", "low"), mk("low-3", "low"),
      mk("low-4", "low"), mk("low-5", "low"), mk("low-6", "low"),
      mk("high-1", "high"), mk("high-2", "high"),
    ];
    const out = capTasksByPriority(tasks, 8);
    expect(out.length).toBe(8);
    // Both high-priority must survive.
    expect(out.filter((t) => t.priority === "high").map((t) => t.title))
      .toEqual(["high-1", "high-2"]);
  });

  it("truncates low-priority first when over the cap", () => {
    const tasks = [
      mk("low-1", "low"), mk("low-2", "low"), mk("low-3", "low"),
      mk("low-4", "low"), mk("low-5", "low"),
      mk("high-1", "high"), mk("high-2", "high"), mk("high-3", "high"),
      mk("medium-1", "medium"), mk("medium-2", "medium"),
    ];
    const out = capTasksByPriority(tasks, 8);
    expect(out.length).toBe(8);
    expect(out.filter((t) => t.priority === "high").length).toBe(3);
    expect(out.filter((t) => t.priority === "medium").length).toBe(2);
    expect(out.filter((t) => t.priority === "low").length).toBe(3); // 5 → 3 (2 dropped)
  });

  it("no-ops when under or at cap", () => {
    const tasks = [mk("a", "high"), mk("b", "medium"), mk("c", "low")];
    expect(capTasksByPriority(tasks, 8)).toEqual(tasks);
    expect(capTasksByPriority(tasks, 3)).toEqual(tasks);
  });

  it("stable within priority band (preserves LLM ordering)", () => {
    const tasks = [
      mk("h-first", "high"), mk("h-second", "high"), mk("h-third", "high"),
    ];
    const out = capTasksByPriority(tasks, 8);
    expect(out.map((t) => t.title)).toEqual(["h-first", "h-second", "h-third"]);
  });

  it("unknown priority values stay at the bottom (not thrown out, but lowest rank)", () => {
    const tasks = [
      mk("unknown-1", "bogus"),
      mk("high-1", "high"),
      mk("low-1", "low"),
    ];
    const out = capTasksByPriority(tasks, 2);
    expect(out.map((t) => t.title)).toEqual(["high-1", "low-1"]);
  });

  it("handles [] / non-array safely", () => {
    expect(capTasksByPriority([])).toEqual([]);
    expect(capTasksByPriority(null as any)).toEqual([]);
  });

  it("MAX_TASKS default matches spec (8)", () => {
    expect(MAX_TASKS).toBe(8);
    const tasks = Array.from({ length: 12 }, (_, i) => mk(`t-${i}`, "medium"));
    expect(capTasksByPriority(tasks).length).toBe(8);
  });
});

describe("buildCompletedHistoryBlock", () => {
  it("returns '' on empty / null / non-array history", () => {
    expect(buildCompletedHistoryBlock([])).toBe("");
    expect(buildCompletedHistoryBlock(null as any)).toBe("");
    expect(buildCompletedHistoryBlock([""])).toBe("");
    expect(buildCompletedHistoryBlock([null as any, ""])).toBe("");
  });

  it("renders the prompt block with bullet list + critical-do-not-repeat directive", () => {
    const block = buildCompletedHistoryBlock(["Update CV", "Network with PMs"]);
    expect(block).toContain("TASKS THE USER HAS ALREADY COMPLETED");
    expect(block).toContain("- Update CV");
    expect(block).toContain("- Network with PMs");
    expect(block).toContain("CRITICAL");
    expect(block).toContain("do NOT regenerate");
  });

  it("caps the injected list at 50 entries (token-bound)", () => {
    const big = Array.from({ length: 80 }, (_, i) => `Task ${i}`);
    const block = buildCompletedHistoryBlock(big);
    expect(block).toContain("up to 50");
    expect(block).toContain("- Task 0");
    expect(block).toContain("- Task 49");
    expect(block).not.toContain("- Task 50");
    expect(block).not.toContain("- Task 79");
  });

  it("filters empty / non-string entries before counting", () => {
    const block = buildCompletedHistoryBlock(["", null as any, "Real", undefined as any]);
    expect(block).toContain("up to 1");
    expect(block).toContain("- Real");
  });
});
