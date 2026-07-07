// Tests for shapeOpenAIPayload — the gpt-5 reasoning-param shaping added to the
// shared wrapper (spec §2). The hard invariant: the NON-gpt-5 path is byte-
// identical (same object reference) so gpt-4o-mini and every other caller are
// unaffected. NO live LLM calls.
//
// openai-chat.ts reads Deno.env at module load, so we stub Deno (all undefined
// => Langfuse disabled) BEFORE importing it, exactly like openai-chat.test.ts.

import { describe, it, expect, vi } from "vitest";

vi.stubGlobal("Deno", { env: { get: () => undefined } });
const { shapeOpenAIPayload, GPT5_MIN_COMPLETION_TOKENS } = await import("./openai-chat.ts");

describe("shapeOpenAIPayload — non-gpt-5 path is byte-identical", () => {
  it("returns the SAME object reference for gpt-4o-mini (zero behavior change)", () => {
    const p = { model: "gpt-4o-mini", temperature: 0, max_tokens: 3000, messages: [] };
    const out = shapeOpenAIPayload(p);
    expect(out).toBe(p); // reference equality — the exact same object
    expect(JSON.stringify(out)).toBe(JSON.stringify(p)); // and byte-identical body
  });

  it("leaves temperature + max_tokens untouched for gpt-4o", () => {
    const p = { model: "gpt-4o", temperature: 0.4, max_tokens: 1200, messages: [] };
    const out = shapeOpenAIPayload(p);
    expect(out).toEqual({ model: "gpt-4o", temperature: 0.4, max_tokens: 1200, messages: [] });
    expect("max_completion_tokens" in out).toBe(false);
  });

  it("does not treat a non-string or missing model as gpt-5", () => {
    const p1 = { messages: [] } as Record<string, unknown>;
    expect(shapeOpenAIPayload(p1)).toBe(p1);
    const p2 = { model: 5, max_tokens: 100 } as Record<string, unknown>;
    expect(shapeOpenAIPayload(p2)).toBe(p2);
  });
});

describe("shapeOpenAIPayload — gpt-5 path reshapes reasoning params", () => {
  it("drops temperature, converts max_tokens -> max_completion_tokens (>= 8000)", () => {
    const p = {
      model: "gpt-5.4-mini",
      temperature: 0,
      max_tokens: 3000,
      response_format: { type: "json_object" },
      messages: [{ role: "system", content: "x" }],
    };
    const out = shapeOpenAIPayload(p);
    expect("temperature" in out).toBe(false);
    expect("max_tokens" in out).toBe(false);
    expect(out.max_completion_tokens).toBe(GPT5_MIN_COMPLETION_TOKENS);
    expect(out.max_completion_tokens as number).toBeGreaterThanOrEqual(8000);
    // Non-reasoning fields are preserved untouched.
    expect(out.model).toBe("gpt-5.4-mini");
    expect(out.response_format).toEqual({ type: "json_object" });
    expect(out.messages).toEqual([{ role: "system", content: "x" }]);
    // Original object is not mutated.
    expect(p.temperature).toBe(0);
    expect(p.max_tokens).toBe(3000);
  });

  it("honors a caller-requested budget larger than the floor", () => {
    const out = shapeOpenAIPayload({ model: "gpt-5.4-mini", max_tokens: 12000, messages: [] });
    expect(out.max_completion_tokens).toBe(12000);
  });

  it("respects an explicit max_completion_tokens above the floor", () => {
    const out = shapeOpenAIPayload({ model: "gpt-5.4-mini", max_completion_tokens: 9001, messages: [] });
    expect(out.max_completion_tokens).toBe(9001);
  });

  it("matches any gpt-5* variant, case-insensitively", () => {
    for (const model of ["gpt-5", "gpt-5-mini", "GPT-5.4-MINI"]) {
      const out = shapeOpenAIPayload({ model, temperature: 0, max_tokens: 100, messages: [] });
      expect("temperature" in out).toBe(false);
      expect(out.max_completion_tokens).toBe(GPT5_MIN_COMPLETION_TOKENS);
    }
  });
});
