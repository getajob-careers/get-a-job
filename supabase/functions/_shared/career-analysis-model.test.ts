import { describe, it, expect } from "vitest";
import {
  selectAnalysisModel,
  buildAnalysisPayload,
  REASONING_MODEL,
  DEFAULT_MODEL,
  REASONING_MAX_COMPLETION_TOKENS,
  DEFAULT_MAX_TOKENS,
} from "./career-analysis-model.ts";

describe("generate-career-analysis model selection (gpt-5.4-mini swap)", () => {
  it("defaults to gpt-4o when neither flag is set", () => {
    expect(selectAnalysisModel(undefined, undefined)).toBe(DEFAULT_MODEL);
    expect(selectAnalysisModel(null, null)).toBe("gpt-4o");
    expect(selectAnalysisModel("gpt-4o", null)).toBe("gpt-4o");
    expect(selectAnalysisModel("something-else", "")).toBe("gpt-4o");
  });

  it("opts into gpt-5.4-mini via the request body field", () => {
    expect(selectAnalysisModel(REASONING_MODEL, null)).toBe(REASONING_MODEL);
  });

  it("opts into gpt-5.4-mini via the env override", () => {
    expect(selectAnalysisModel(undefined, REASONING_MODEL)).toBe(
      REASONING_MODEL,
    );
  });
});

describe("generate-career-analysis payload shape", () => {
  it("gpt-5.4-mini uses the reasoning budget and CANNOT take max_tokens", () => {
    const p = buildAnalysisPayload(REASONING_MODEL, "sys", "user") as any;
    // Reasoning models bill hidden thinking against max_completion_tokens and
    // reject max_tokens; 16000 prevents the 15-role truncation (~4600 visible).
    expect(p.max_completion_tokens).toBe(REASONING_MAX_COMPLETION_TOKENS);
    expect(p.max_completion_tokens).toBe(16000);
    expect(p.reasoning_effort).toBe("none");
    expect("max_tokens" in p).toBe(false);
    expect(p.temperature).toBe(0.2);
    expect(p.response_format).toEqual({ type: "json_object" });
    expect(p.model).toBe("gpt-5.4-mini");
  });

  it("gpt-4o uses max_tokens 4500 and no reasoning params", () => {
    const p = buildAnalysisPayload(DEFAULT_MODEL, "sys", "user") as any;
    expect(p.max_tokens).toBe(DEFAULT_MAX_TOKENS);
    expect(p.max_tokens).toBe(4500);
    expect("max_completion_tokens" in p).toBe(false);
    expect("reasoning_effort" in p).toBe(false);
    expect(p.temperature).toBe(0.4);
    expect(p.model).toBe("gpt-4o");
  });

  it("both carry the system + user messages verbatim", () => {
    const p = buildAnalysisPayload(REASONING_MODEL, "SYS", "USR") as any;
    expect(p.messages).toEqual([
      { role: "system", content: "SYS" },
      { role: "user", content: "USR" },
    ]);
  });
});
