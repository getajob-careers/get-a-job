// Tests for the OpenAI<->Anthropic payload/response translation in
// anthropic-chat.ts. Runner: vitest. anthropic-chat imports openai-chat, which
// reads Deno.env at module load, so stub Deno (Langfuse disabled) BEFORE import.

import { describe, it, expect, vi } from "vitest";

vi.stubGlobal("Deno", { env: { get: () => undefined } });
const { toAnthropicRequest, toOpenAIShape } = await import("./anthropic-chat.ts");

const bigSystem = "x".repeat(5000); // >1024 tokens (~4 chars/token)

describe("toAnthropicRequest", () => {
  it("lifts the system message to a top-level system block", () => {
    const req: any = toAnthropicRequest({
      model: "claude-sonnet-4-6",
      messages: [
        { role: "system", content: "You are helpful." },
        { role: "user", content: "Hi" },
      ],
      max_tokens: 500,
    });
    expect(Array.isArray(req.system)).toBe(true);
    expect(req.system[0].text).toBe("You are helpful.");
    expect(req.messages).toEqual([{ role: "user", content: "Hi" }]);
    expect(req.max_tokens).toBe(500);
  });

  it("attaches cache_control only when the system prefix clears the 1024-token minimum", () => {
    const small: any = toAnthropicRequest({
      model: "claude-sonnet-4-6",
      messages: [{ role: "system", content: "short" }, { role: "user", content: "hi" }],
      max_tokens: 100,
    });
    expect(small.system[0].cache_control).toBeUndefined();

    const large: any = toAnthropicRequest({
      model: "claude-sonnet-4-6",
      messages: [{ role: "system", content: bigSystem }, { role: "user", content: "hi" }],
      max_tokens: 100,
    });
    expect(large.system[0].cache_control).toEqual({ type: "ephemeral" });
  });

  it("forces the emit_json tool when response_format is json_object", () => {
    const req: any = toAnthropicRequest({
      model: "claude-sonnet-4-6",
      messages: [{ role: "system", content: "s" }, { role: "user", content: "u" }],
      response_format: { type: "json_object" },
      max_tokens: 100,
    });
    expect(req.tools?.[0]?.name).toBe("emit_json");
    expect(req.tool_choice).toEqual({ type: "tool", name: "emit_json" });
  });

  it("does not add tools when no json_object is requested, and forwards temperature", () => {
    const req: any = toAnthropicRequest({
      model: "claude-sonnet-4-6",
      messages: [{ role: "user", content: "u" }],
      temperature: 0.2,
      max_tokens: 100,
    });
    expect(req.tools).toBeUndefined();
    expect(req.temperature).toBe(0.2);
  });

  it("seeds a user turn if the caller passed only a system message", () => {
    const req: any = toAnthropicRequest({
      model: "claude-sonnet-4-6",
      messages: [{ role: "system", content: "s" }],
      max_tokens: 100,
    });
    expect(req.messages).toEqual([{ role: "user", content: "Proceed." }]);
  });
});

describe("toOpenAIShape", () => {
  it("maps a forced-tool JSON result to choices[0].message.content as a JSON string", () => {
    const out: any = toOpenAIShape({
      id: "msg_1",
      model: "claude-sonnet-4-6",
      stop_reason: "tool_use",
      content: [{ type: "tool_use", name: "emit_json", input: { bullets: ["a", "b"] } }],
      usage: { input_tokens: 100, output_tokens: 20 },
    });
    expect(out.choices[0].message.content).toBe(JSON.stringify({ bullets: ["a", "b"] }));
    expect(JSON.parse(out.choices[0].message.content)).toEqual({ bullets: ["a", "b"] });
  });

  it("concatenates text blocks when there is no tool_use", () => {
    const out: any = toOpenAIShape({
      content: [{ type: "text", text: "hello " }, { type: "text", text: "world" }],
      usage: { input_tokens: 5, output_tokens: 2 },
    });
    expect(out.choices[0].message.content).toBe("hello world");
  });

  it("translates usage with cache tokens folded into prompt_tokens and surfaced", () => {
    const out: any = toOpenAIShape({
      content: [{ type: "text", text: "x" }],
      usage: {
        input_tokens: 100,
        output_tokens: 30,
        cache_read_input_tokens: 800,
        cache_creation_input_tokens: 200,
      },
    });
    // prompt_tokens = regular(100) + cache_read(800) + cache_write(200)
    expect(out.usage.prompt_tokens).toBe(1100);
    expect(out.usage.completion_tokens).toBe(30);
    expect(out.usage.cache_read_input_tokens).toBe(800);
    expect(out.usage.cache_creation_input_tokens).toBe(200);
  });
});
