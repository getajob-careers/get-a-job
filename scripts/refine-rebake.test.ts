import { describe, it, expect, beforeAll } from "vitest";

// refine-rebake.mjs builds a Supabase client at module load, so give it a dummy
// service-role key before importing (no network call happens at construction).
// main() is guarded behind a direct-invocation check, so importing does not run
// the harness. We import dynamically inside beforeAll so the env var is set first.
let assertSeedOnly: (ids: string[]) => void;
let SEED_ACCOUNTS: Set<string>;

beforeAll(async () => {
  process.env.SUPABASE_SERVICE_ROLE_KEY ||= "test-dummy-service-role-key";
  const mod = await import("./refine-rebake.mjs");
  assertSeedOnly = mod.assertSeedOnly;
  SEED_ACCOUNTS = mod.SEED_ACCOUNTS;
});

describe("refine-rebake seed-account gate (PR #385 fix)", () => {
  const SEED = "42d8133f-302f-4b75-99a0-d3b6d322b8fa"; // isaacselig+demo seed
  const ELI = "4b243f3a-5035-474e-a89d-aff13fe06cc2"; // Eli's real id, NOT a seed
  const REAL_PILOT = "83e8115b-41a8-41c3-852a-13e8ba6be77a"; // nevo.liani, real pilot

  it("rejects a non-seed user_id and names it (Eli's real account)", () => {
    expect(() => assertSeedOnly([ELI])).toThrow(/SEED GATE/);
    expect(() => assertSeedOnly([ELI])).toThrow(/4b243f3a/);
  });

  it("rejects when a real pilot user is mixed in with a valid seed", () => {
    expect(() => assertSeedOnly([SEED, REAL_PILOT])).toThrow(/83e8115b/);
  });

  it("allows the dedicated seed accounts", () => {
    expect(() => assertSeedOnly([SEED])).not.toThrow();
    expect(() => assertSeedOnly([...SEED_ACCOUNTS])).not.toThrow();
  });

  it("does not list Eli's real id as a seed", () => {
    expect(SEED_ACCOUNTS.has(ELI)).toBe(false);
  });
});
