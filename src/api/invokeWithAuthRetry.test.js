// Tests for the auth-retry wrapper. The 2026-06-10 retry storms produced
// six 401 rows in function_metrics where the same stale JWT was re-fired
// against generate-tailored-cv (3x in 3s) and generate-career-analysis
// (2x in 15s). The wrapper turns that pattern into a single refresh +
// retry; this test pins the exact branch table.

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the supabase client BEFORE importing the wrapper so the wrapper
// picks up the mock at module load. Module path matches the wrapper's
// import: "./supabaseClient".
const mockInvoke = vi.fn();
const mockRefresh = vi.fn();
const mockSignOut = vi.fn();
vi.mock("./supabaseClient", () => ({
  supabase: {
    functions: { invoke: (...args) => mockInvoke(...args) },
    auth: {
      refreshSession: (...args) => mockRefresh(...args),
      signOut: (...args) => mockSignOut(...args),
    },
  },
}));

import { invokeWithAuthRetry } from "./invokeWithAuthRetry";

beforeEach(() => {
  mockInvoke.mockReset();
  mockRefresh.mockReset();
  mockSignOut.mockReset();
});

describe("invokeWithAuthRetry — happy path", () => {
  it("returns the invoke result unchanged on first-call success", async () => {
    mockInvoke.mockResolvedValueOnce({ data: { ok: true }, error: null });
    const r = await invokeWithAuthRetry("generate-tailored-cv", { body: {} });
    expect(r).toEqual({ data: { ok: true }, error: null });
    expect(mockInvoke).toHaveBeenCalledTimes(1);
    expect(mockRefresh).not.toHaveBeenCalled();
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it("does NOT retry on non-401 errors (e.g. 500 from json_parse)", async () => {
    const error = { context: { status: 500 }, message: "json_parse" };
    mockInvoke.mockResolvedValueOnce({ data: null, error });
    const r = await invokeWithAuthRetry("generate-tailored-cv", { body: {} });
    expect(r.error).toBe(error);
    expect(r.error.isAuthExpired).toBeUndefined();
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it("does NOT retry on 400 / 403 / 404 — only 401 triggers refresh", async () => {
    for (const status of [400, 403, 404, 429]) {
      mockInvoke.mockResolvedValueOnce({
        data: null,
        error: { context: { status }, message: `http_${status}` },
      });
      mockRefresh.mockReset();
      const r = await invokeWithAuthRetry("generate-tailored-cv", { body: {} });
      expect(r.error.context.status).toBe(status);
      expect(mockRefresh).not.toHaveBeenCalled();
    }
  });
});

describe("invokeWithAuthRetry — 401 → refresh → retry", () => {
  it("on 401: refreshes once, retries once, returns success on the second call", async () => {
    mockInvoke
      .mockResolvedValueOnce({ data: null, error: { context: { status: 401 } } })
      .mockResolvedValueOnce({ data: { ok: true }, error: null });
    mockRefresh.mockResolvedValueOnce({ error: null });

    const r = await invokeWithAuthRetry("generate-tailored-cv", { body: { x: 1 } });

    expect(mockInvoke).toHaveBeenCalledTimes(2);
    expect(mockInvoke).toHaveBeenNthCalledWith(1, "generate-tailored-cv", { body: { x: 1 } });
    expect(mockInvoke).toHaveBeenNthCalledWith(2, "generate-tailored-cv", { body: { x: 1 } });
    expect(mockRefresh).toHaveBeenCalledTimes(1);
    expect(mockSignOut).not.toHaveBeenCalled();
    expect(r).toEqual({ data: { ok: true }, error: null });
  });

  it("retries ONLY ONCE — refresh + 2 invoke calls max, never 3", async () => {
    // The original storm shape: 3 invoke attempts in 3 seconds. With the
    // wrapper, even a perpetually-broken auth path must stop at 2.
    mockInvoke
      .mockResolvedValueOnce({ data: null, error: { context: { status: 401 } } })
      .mockResolvedValueOnce({ data: null, error: { context: { status: 401 } } });
    mockRefresh.mockResolvedValueOnce({ error: null });

    await invokeWithAuthRetry("generate-tailored-cv", { body: {} });

    expect(mockInvoke).toHaveBeenCalledTimes(2);
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });
});

describe("invokeWithAuthRetry — refresh failure / persistent 401 → signOut", () => {
  it("signs the user out + flags isAuthExpired on real auth rejection (4xx) from refresh", async () => {
    const original401 = { context: { status: 401 }, message: "Unauthorized" };
    mockInvoke.mockResolvedValueOnce({ data: null, error: original401 });
    // AuthApiError shape: explicit 4xx status = the auth backend rejected
    // the refresh-token grant (revoked, user deleted, etc.). Real
    // unrecoverable auth failure — signOut + redirect is the right call.
    mockRefresh.mockResolvedValueOnce({
      error: { name: "AuthApiError", status: 400, message: "Invalid Refresh Token" },
    });
    mockSignOut.mockResolvedValueOnce({ error: null });

    const r = await invokeWithAuthRetry("generate-career-analysis", { body: {} });

    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(r.data).toBeNull();
    expect(r.error.isAuthExpired).toBe(true);
    expect(r.error).toBe(original401); // same reference, marked
    // Invoke is NOT retried when refresh fails — would be wasted call.
    expect(mockInvoke).toHaveBeenCalledTimes(1);
  });

  // The amendment-to-#305 branch. The wrapper must NOT sign a user out
  // when refresh fails due to a network blip — the JWT is probably still
  // valid, the user just couldn't reach Supabase. Signing them out kicks
  // an authenticated user to /login mid-flight, which is the UX hazard
  // Eli forbade. We surface the original 401 unmarked so the caller's
  // normal toast fires; the user can retry once their connection is back.
  it("treats network-blip refresh errors as transient: no signOut, no isAuthExpired", async () => {
    const original401 = { context: { status: 401 }, message: "Unauthorized" };
    mockInvoke.mockResolvedValueOnce({ data: null, error: original401 });
    // AuthRetryableFetchError has no status — the auth-API request never
    // reached the backend (offline, DNS, TLS handshake fail).
    mockRefresh.mockResolvedValueOnce({
      error: { name: "AuthRetryableFetchError", message: "Failed to fetch" },
    });

    const r = await invokeWithAuthRetry("generate-tailored-cv", { body: {} });

    expect(mockSignOut).not.toHaveBeenCalled();
    expect(mockInvoke).toHaveBeenCalledTimes(1); // no wasted retry either
    expect(r.data).toBeNull();
    expect(r.error).toBe(original401);
    expect(r.error.isAuthExpired).toBeUndefined();
  });

  it("treats 5xx upstream refresh errors as transient: no signOut", async () => {
    const original401 = { context: { status: 401 } };
    mockInvoke.mockResolvedValueOnce({ data: null, error: original401 });
    // 5xx from Supabase auth = backend problem, not user's session.
    mockRefresh.mockResolvedValueOnce({
      error: { name: "AuthApiError", status: 503, message: "Service Unavailable" },
    });

    const r = await invokeWithAuthRetry("anything", { body: {} });

    expect(mockSignOut).not.toHaveBeenCalled();
    expect(r.error.isAuthExpired).toBeUndefined();
  });

  it("signs the user out + flags isAuthExpired when retry STILL returns 401", async () => {
    const first401 = { context: { status: 401 }, message: "Unauthorized" };
    const second401 = { context: { status: 401 }, message: "Unauthorized" };
    mockInvoke
      .mockResolvedValueOnce({ data: null, error: first401 })
      .mockResolvedValueOnce({ data: null, error: second401 });
    mockRefresh.mockResolvedValueOnce({ error: null });
    mockSignOut.mockResolvedValueOnce({ error: null });

    const r = await invokeWithAuthRetry("generate-tailored-cv", { body: {} });

    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(r.data).toBeNull();
    expect(r.error.isAuthExpired).toBe(true);
    expect(r.error).toBe(second401);
  });

  it("does not crash if signOut itself throws (already-signed-out case)", async () => {
    mockInvoke.mockResolvedValueOnce({ data: null, error: { context: { status: 401 } } });
    // 4xx auth rejection so we actually reach the signOut path.
    mockRefresh.mockResolvedValueOnce({ error: { status: 400, message: "refresh failed" } });
    mockSignOut.mockRejectedValueOnce(new Error("already signed out"));

    const r = await invokeWithAuthRetry("anything", { body: {} });
    expect(r.data).toBeNull();
    expect(r.error.isAuthExpired).toBe(true);
  });
});

describe("invokeWithAuthRetry — argument forwarding", () => {
  it("forwards the same options object on both attempts (no shape mutation)", async () => {
    const options = { body: { target_role: "Data Analyst", cv_model: "sonnet" } };
    mockInvoke
      .mockResolvedValueOnce({ data: null, error: { context: { status: 401 } } })
      .mockResolvedValueOnce({ data: { cv_url: "x" }, error: null });
    mockRefresh.mockResolvedValueOnce({ error: null });

    await invokeWithAuthRetry("generate-tailored-cv", options);

    expect(mockInvoke).toHaveBeenNthCalledWith(1, "generate-tailored-cv", options);
    expect(mockInvoke).toHaveBeenNthCalledWith(2, "generate-tailored-cv", options);
  });
});
