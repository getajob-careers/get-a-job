// Unit coverage for the desynced-session recovery helper (investigation
// 2026-07-12). Two behaviors matter: (1) classifying an auth-shaped read error,
// and (2) the flag-gated, one-shot refresh-or-signout — it must NEVER loop.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const refreshSession = vi.fn();
const signOut = vi.fn();

vi.mock("@/api/supabaseClient", () => ({
  supabase: {
    auth: { refreshSession: () => refreshSession(), signOut: () => signOut() },
  },
}));

async function freshImport() {
  vi.resetModules();
  return import("@/lib/authRecovery.js");
}

describe("isAuthError", () => {
  it("matches PostgREST JWT rejections and 401s, not ordinary errors", async () => {
    vi.stubEnv("VITE_FLAG_AUTH_DESYNC_RECOVERY", "off");
    const { isAuthError } = await freshImport();
    expect(isAuthError({ code: "PGRST301" })).toBe(true);
    expect(isAuthError({ status: 401 })).toBe(true);
    expect(isAuthError({ message: "No suitable key or wrong key type" })).toBe(
      true,
    );
    expect(isAuthError({ message: "JWT expired" })).toBe(true);
    expect(isAuthError({ code: "PGRST116", message: "no rows" })).toBe(false);
    expect(isAuthError(null)).toBe(false);
  });
});

describe("recoverFromAuthError — flag-gated, one-shot", () => {
  beforeEach(() => {
    refreshSession.mockReset();
    signOut.mockReset();
  });
  afterEach(() => vi.unstubAllEnvs());

  it("is a no-op when the flag is OFF (default) — never touches auth", async () => {
    vi.stubEnv("VITE_FLAG_AUTH_DESYNC_RECOVERY", "off");
    const { recoverFromAuthError } = await freshImport();
    expect(await recoverFromAuthError({ code: "PGRST301" })).toBe(false);
    expect(refreshSession).not.toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
  });

  it("refreshes once and returns true when the session recovers (flag ON)", async () => {
    vi.stubEnv("VITE_FLAG_AUTH_DESYNC_RECOVERY", "on");
    refreshSession.mockResolvedValue({
      data: { session: { access_token: "new" } },
      error: null,
    });
    const { recoverFromAuthError } = await freshImport();
    expect(await recoverFromAuthError({ code: "PGRST301" })).toBe(true);
    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(signOut).not.toHaveBeenCalled();
  });

  it("signs out when the refresh fails, and never attempts twice (no loop)", async () => {
    vi.stubEnv("VITE_FLAG_AUTH_DESYNC_RECOVERY", "on");
    refreshSession.mockResolvedValue({
      data: { session: null },
      error: { message: "refresh failed" },
    });
    const { recoverFromAuthError } = await freshImport();
    expect(await recoverFromAuthError({ status: 401 })).toBe(false);
    expect(signOut).toHaveBeenCalledTimes(1);
    // Second call must be a no-op — the one-shot guard prevents a refresh loop.
    expect(await recoverFromAuthError({ status: 401 })).toBe(false);
    expect(refreshSession).toHaveBeenCalledTimes(1);
  });

  it("ignores non-auth errors even when the flag is ON", async () => {
    vi.stubEnv("VITE_FLAG_AUTH_DESYNC_RECOVERY", "on");
    const { recoverFromAuthError } = await freshImport();
    expect(await recoverFromAuthError({ code: "PGRST116" })).toBe(false);
    expect(refreshSession).not.toHaveBeenCalled();
  });
});
