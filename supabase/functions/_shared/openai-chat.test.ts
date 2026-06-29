// Tests for the timeout/abort classification in openaiChatCompletionWithRetry.
//
// Root cause this pins: every caller passes { signal: AbortSignal.timeout(N) },
// and a fired timeout signal rejects fetch with a DOMException whose name is
// 'TimeoutError' (NOT 'AbortError'). Before the fix the retry loop only
// short-circuited on 'AbortError', so a timeout fell through and "retried" on
// the already-aborted signal: each retry failed instantly and only burned
// backoff against the ~100s platform wall before throwing anyway. The fix
// treats 'TimeoutError' like 'AbortError' and re-throws immediately.
//
// Test runner: vitest (same as the other _shared tests). openai-chat.ts reads
// Deno.env at module load, so we stub Deno (all undefined => Langfuse disabled)
// BEFORE importing it, via a top-level dynamic import.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.stubGlobal("Deno", { env: { get: () => undefined } });
const { openaiChatCompletionWithRetry } = await import("./openai-chat.ts");

const PAYLOAD = { model: "gpt-4o", messages: [] };
const TRACE = { traceName: "test" };
// Tiny backoff so the control tests (which DO retry) stay fast.
const FAST = { retries: 3, baseBackoffMs: 1, maxBackoffMs: 2 };

let calls = 0;
beforeEach(() => {
  calls = 0;
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("openaiChatCompletionWithRetry timeout/abort classification", () => {
  it("re-throws a TimeoutError immediately, with no retry on the dead signal", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        calls++;
        throw new DOMException("Signal timed out.", "TimeoutError");
      }),
    );
    await expect(
      openaiChatCompletionWithRetry(PAYLOAD, "key", TRACE, FAST),
    ).rejects.toMatchObject({ name: "TimeoutError" });
    expect(calls).toBe(1);
  });

  it("re-throws an AbortError immediately (pre-existing behavior, unchanged)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        calls++;
        throw new DOMException("Aborted.", "AbortError");
      }),
    );
    await expect(
      openaiChatCompletionWithRetry(PAYLOAD, "key", TRACE, FAST),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(calls).toBe(1);
  });

  it("still retries on a retryable HTTP status (control: fix did not disable retry)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        calls++;
        return new Response("upstream error", { status: 500 });
      }),
    );
    const res = await openaiChatCompletionWithRetry(
      PAYLOAD,
      "key",
      TRACE,
      FAST,
    );
    expect(res.status).toBe(500);
    expect(calls).toBe(4); // retries:3 => 4 total attempts
  });

  it("still retries a generic network error then throws (only timeout/abort short-circuit)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        calls++;
        throw new TypeError("network down");
      }),
    );
    await expect(
      openaiChatCompletionWithRetry(PAYLOAD, "key", TRACE, FAST),
    ).rejects.toThrow("network down");
    expect(calls).toBe(4);
  });
});
