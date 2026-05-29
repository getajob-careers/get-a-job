import { describe, it, expect } from "vitest";
import {
  bandForRuleScore,
  bandForLlmScore,
  RULE_BAND_THRESHOLDS,
  LLM_BAND_THRESHOLDS,
  BAND_LABELS,
  BAND_LABELS_SHORT,
} from "./scoreHelpers";

describe("bandForLlmScore — drawer + kanban surfaces (0-100 scale)", () => {
  it("classifies at the configured thresholds", () => {
    expect(bandForLlmScore(100)).toBe("high");
    expect(bandForLlmScore(85)).toBe("high");
    expect(bandForLlmScore(LLM_BAND_THRESHOLDS.high)).toBe("high");
    expect(bandForLlmScore(LLM_BAND_THRESHOLDS.high - 1)).toBe("med");
    expect(bandForLlmScore(LLM_BAND_THRESHOLDS.med)).toBe("med");
    expect(bandForLlmScore(LLM_BAND_THRESHOLDS.med - 1)).toBe("low");
    expect(bandForLlmScore(0)).toBe("low");
  });

  it("maps the matcher rubric correctly: 85+ obvious → High, 70+ real → High, 50-69 stretch → Med, <50 weak → Low", () => {
    // From _shared/internship-pitch.ts rubric (PR6 single-score):
    expect(bandForLlmScore(95)).toBe("high"); // obvious
    expect(bandForLlmScore(75)).toBe("high"); // real
    expect(bandForLlmScore(60)).toBe("med");  // stretch
    expect(bandForLlmScore(30)).toBe("low");  // weak
  });

  it("returns 'none' for null / NaN / undefined", () => {
    expect(bandForLlmScore(null)).toBe("none");
    expect(bandForLlmScore(undefined)).toBe("none");
    expect(bandForLlmScore(NaN)).toBe("none");
  });
});

describe("bandForRuleScore — browse card chip (5-85 scale)", () => {
  it("classifies at the configured thresholds (different cutoffs than LLM)", () => {
    expect(bandForRuleScore(85)).toBe("high");
    expect(bandForRuleScore(RULE_BAND_THRESHOLDS.high)).toBe("high");
    expect(bandForRuleScore(RULE_BAND_THRESHOLDS.high - 1)).toBe("med");
    expect(bandForRuleScore(RULE_BAND_THRESHOLDS.med)).toBe("med");
    expect(bandForRuleScore(RULE_BAND_THRESHOLDS.med - 1)).toBe("low");
    expect(bandForRuleScore(5)).toBe("low");
  });

  it("maps representative rule-score compositions", () => {
    // _shared/internship-rule-score.ts weights:
    //   W_BASE=5 W_STAGE=30 W_SECTOR=25 W_SIGNAL=15 W_GEO=10
    // Realistic scenarios:
    expect(bandForRuleScore(5)).toBe("low");   // floor only
    expect(bandForRuleScore(15)).toBe("low");  // floor + IL
    expect(bandForRuleScore(35)).toBe("med");  // floor + stage
    expect(bandForRuleScore(45)).toBe("med");  // floor + IL + stage
    expect(bandForRuleScore(60)).toBe("high"); // floor + stage + sector
    expect(bandForRuleScore(85)).toBe("high"); // perfect
  });

  it("uses different thresholds than the LLM scale (high requires more, not less)", () => {
    expect(RULE_BAND_THRESHOLDS.high).toBe(60);
    expect(LLM_BAND_THRESHOLDS.high).toBe(70);
    // A score of 65 lands differently on each scale on purpose:
    expect(bandForRuleScore(65)).toBe("high"); // rule scale: high
    expect(bandForLlmScore(65)).toBe("med");   // LLM scale: med
  });

  it("returns 'none' for null / NaN / undefined", () => {
    expect(bandForRuleScore(null)).toBe("none");
    expect(bandForRuleScore(undefined)).toBe("none");
    expect(bandForRuleScore(NaN)).toBe("none");
  });
});

describe("BAND_LABELS expose UI-ready strings", () => {
  it("provides High / Med / Low strings (and an em-dash for none)", () => {
    expect(BAND_LABELS.high).toContain("High");
    expect(BAND_LABELS.med).toContain("Medium");
    expect(BAND_LABELS.low).toContain("Low");
    expect(BAND_LABELS_SHORT.high).toBe("High");
    expect(BAND_LABELS_SHORT.med).toBe("Med");
    expect(BAND_LABELS_SHORT.low).toBe("Low");
    expect(BAND_LABELS_SHORT.none).toBe("—");
  });
});
