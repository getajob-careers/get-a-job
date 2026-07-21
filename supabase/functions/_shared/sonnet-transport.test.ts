// Tests for resolveSonnetTransport — the two-flag OpenRouter<->Anthropic
// selector. Runner: vitest. The module (and its transport imports) read
// Deno.env, so stub a MUTABLE env map before importing.

import { describe, it, expect, vi, beforeEach } from "vitest";

const env: Record<string, string | undefined> = {};
vi.stubGlobal("Deno", { env: { get: (k: string) => env[k] } });
const { resolveSonnetTransport } = await import("./sonnet-transport.ts");

beforeEach(() => {
  for (const k of Object.keys(env)) delete env[k];
  env.OPENROUTER_API_KEY = "or-key";
  env.ANTHROPIC_API_KEY = "an-key";
});

describe("resolveSonnetTransport", () => {
  it("defaults to OpenRouter when no flag is set", () => {
    const r = resolveSonnetTransport("cv");
    expect(r.name).toBe("openrouter");
    expect(r.key).toBe("or-key");
    expect(r.model).toBe("anthropic/claude-sonnet-4.6");
  });

  it("routes to Anthropic when SONNET_TRANSPORT_CV=anthropic", () => {
    env.SONNET_TRANSPORT_CV = "anthropic";
    const r = resolveSonnetTransport("cv");
    expect(r.name).toBe("anthropic");
    expect(r.key).toBe("an-key");
    expect(r.model).toBe("claude-sonnet-4-6");
  });

  it("keeps the two surfaces independent (CV flip does not move chat)", () => {
    env.SONNET_TRANSPORT_CV = "anthropic";
    expect(resolveSonnetTransport("cv").name).toBe("anthropic");
    expect(resolveSonnetTransport("chat").name).toBe("openrouter");
  });

  it("honors a per-request override above the env flag (both directions)", () => {
    env.SONNET_TRANSPORT_CV = "openrouter";
    expect(resolveSonnetTransport("cv", "anthropic").name).toBe("anthropic");
    env.SONNET_TRANSPORT_CV = "anthropic";
    expect(resolveSonnetTransport("cv", "openrouter").name).toBe("openrouter");
  });

  it("treats any non-'anthropic' value as OpenRouter (safe default)", () => {
    env.SONNET_TRANSPORT_CV = "garbage";
    expect(resolveSonnetTransport("cv").name).toBe("openrouter");
  });

  it("respects the ANTHROPIC_SONNET_MODEL override", () => {
    env.SONNET_TRANSPORT_CV = "anthropic";
    env.ANTHROPIC_SONNET_MODEL = "claude-sonnet-4-6-20990101";
    expect(resolveSonnetTransport("cv").model).toBe("claude-sonnet-4-6-20990101");
  });
});
