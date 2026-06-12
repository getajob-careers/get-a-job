// Tests for the shared fence-tolerant JSON parser. The fixtures here are the
// formal contract for what generate-tailored-cv Pass 2 / Pass 3 must accept
// from Sonnet via OpenRouter. Two failures on 2026-06-10 (user 4b243f3a,
// `error_code=json_parse`, ~30s latency, 1500/1845 tokens out — well under
// the 4096 max, ruling out truncation) escaped the original three-tier
// inline parser; the canonical fixture below shows the most plausible cause
// (Sonnet emits valid JSON whose STRING VALUES contain triple-backticks,
// and the old non-greedy fence regex terminated at the first internal ```).

import { describe, it, expect } from "vitest";
import { parseLlmJsonObject } from "./json-parse.ts";

describe("parseLlmJsonObject — Tier 1 (bare JSON)", () => {
  it("parses a bare JSON object (gpt-4o + response_format fast path)", () => {
    const raw = `{"about_me":"Driven analyst","experiences":[]}`;
    const r = parseLlmJsonObject(raw, "pass2", "stop") as Record<string, unknown>;
    expect(r.about_me).toBe("Driven analyst");
    expect(r.experiences).toEqual([]);
  });

  it("parses a bare JSON array", () => {
    const raw = `[{"x":1},{"x":2}]`;
    const r = parseLlmJsonObject(raw, "pass1", "stop") as Array<{ x: number }>;
    expect(r).toEqual([{ x: 1 }, { x: 2 }]);
  });
});

describe("parseLlmJsonObject — Tier 2 (fenced)", () => {
  it("parses ```json\\n{...}\\n``` (canonical Sonnet shape)", () => {
    const payload = { about_me: "X", skills: ["a", "b"] };
    const raw = "```json\n" + JSON.stringify(payload) + "\n```";
    expect(parseLlmJsonObject(raw, "pass2", "stop")).toEqual(payload);
  });

  it("parses ```jsonc fence (Sonnet-variant)", () => {
    const payload = { a: 1 };
    const raw = "```jsonc\n" + JSON.stringify(payload) + "\n```";
    expect(parseLlmJsonObject(raw, "pass2", "stop")).toEqual(payload);
  });

  it("parses ``` fence with no language tag", () => {
    const payload = { a: 1 };
    const raw = "```\n" + JSON.stringify(payload) + "\n```";
    expect(parseLlmJsonObject(raw, "pass2", "stop")).toEqual(payload);
  });

  // THE REGRESSION FIXTURE.
  // Sonnet returns valid JSON whose string values contain triple-backticks
  // (it describes code idioms in CV bullets, or echoes a JD code sample).
  // The OLD non-greedy regex (/```(?:json)?\s*\n?([\s\S]*?)```/i)
  // terminates at the FIRST internal ``` it sees — the one INSIDE the JSON
  // string — capturing a truncated payload that fails JSON.parse. The new
  // quote-aware balanced scan never confuses a triple-backtick inside a
  // JSON string with a fence close.
  it("parses fenced JSON whose string values contain triple-backticks (the 2026-06-10 failure shape)", () => {
    const raw = [
      "```json",
      '{',
      '  "experiences": [',
      '    {',
      '      "title": "Data Analyst",',
      '      "bullets": [',
      '        "Built ETL using ```python\\nimport pandas as pd\\n```"',
      '      ]',
      '    }',
      '  ]',
      '}',
      "```",
    ].join("\n");
    const r = parseLlmJsonObject(raw, "pass2", "stop") as Record<string, any>;
    expect(r.experiences).toHaveLength(1);
    expect(r.experiences[0].title).toBe("Data Analyst");
    expect(r.experiences[0].bullets[0]).toContain("import pandas");
  });
});

describe("parseLlmJsonObject — Tier 3 (last resort: balanced from anywhere)", () => {
  it("parses JSON with a prose preamble (no fence)", () => {
    const raw = `Here's your CV draft:\n\n{"about_me":"Eng","skills":["js"]}`;
    const r = parseLlmJsonObject(raw, "pass2", "stop") as Record<string, any>;
    expect(r.about_me).toBe("Eng");
  });

  it("parses JSON followed by a prose suffix", () => {
    const raw = `{"a":1}\n\nLet me know if you'd like edits!`;
    expect(parseLlmJsonObject(raw, "pass2", "stop")).toEqual({ a: 1 });
  });

  it("parses fenced JSON wrapped in prose on both sides", () => {
    const payload = { a: 1, b: [2, 3] };
    const raw =
      "Sure, here's the CV:\n\n```json\n" +
      JSON.stringify(payload) +
      "\n```\n\nGood luck!";
    expect(parseLlmJsonObject(raw, "pass2", "stop")).toEqual(payload);
  });

  it("picks the largest balanced region when multiple JSON objects appear", () => {
    const small = { x: 1 };
    const large = { a: 1, b: 2, c: 3, nested: { d: 4, e: 5 } };
    const raw =
      "First a small object: " +
      JSON.stringify(small) +
      "\n\nNow the real one:\n" +
      JSON.stringify(large);
    expect(parseLlmJsonObject(raw, "pass2", "stop")).toEqual(large);
  });

  it("recovers when the fence-close is missing (unclosed fence)", () => {
    const payload = { a: 1 };
    // No trailing ``` — Tier 2 fence regex matches the opener; balanced
    // extraction still completes because depth returns to 0 within the
    // payload itself.
    const raw = "```json\n" + JSON.stringify(payload);
    expect(parseLlmJsonObject(raw, "pass2", "stop")).toEqual(payload);
  });
});

describe("parseLlmJsonObject — failure modes (must throw, never silently fabricate)", () => {
  it("throws on pure prose (no JSON anywhere)", () => {
    const raw = `I'm sorry, but I cannot help with that request.`;
    expect(() => parseLlmJsonObject(raw, "pass2", "stop")).toThrowError(
      /unparseable response/,
    );
  });

  it("throws on truncated JSON (no closing brace anywhere)", () => {
    const raw = `{"about_me":"X","experiences":[{"title":"`;
    expect(() => parseLlmJsonObject(raw, "pass2", "length")).toThrowError(
      /unparseable response/,
    );
  });

  it("includes label + finish_reason + preview in the thrown error message", () => {
    const raw = "totally not JSON, sorry";
    try {
      parseLlmJsonObject(raw, "pass2:sonnet", "stop");
      throw new Error("expected throw");
    } catch (e) {
      const msg = (e as Error).message;
      expect(msg).toContain("label=pass2:sonnet");
      expect(msg).toContain("finish_reason=stop");
      expect(msg).toContain("totally not JSON");
    }
  });

  it("treats empty input as unparseable (does not silently return {})", () => {
    expect(() => parseLlmJsonObject("", "pass2", "stop")).toThrowError(
      /unparseable response/,
    );
  });
});

describe("parseLlmJsonObject — string-quote awareness (no false closes)", () => {
  it("ignores a `}` inside a JSON string value", () => {
    const raw = `{"note":"a closing brace } in a string","x":1}`;
    expect(parseLlmJsonObject(raw, "pass2", "stop")).toEqual({
      note: "a closing brace } in a string",
      x: 1,
    });
  });

  it("respects escaped quotes inside strings", () => {
    const raw = `{"q":"he said \\"hi\\" and left","x":1}`;
    expect(parseLlmJsonObject(raw, "pass2", "stop")).toEqual({
      q: 'he said "hi" and left',
      x: 1,
    });
  });
});
