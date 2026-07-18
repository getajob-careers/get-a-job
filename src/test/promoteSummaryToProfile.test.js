// F2 regression: the studio-edited MASTER summary must persist to
// profiles.summary. The bug was a fully silent no-op: no code path wrote
// profiles.summary from the studio, so a new summary "wouldn't save" and
// reverted on the next tailor. This locks the write + its error surfacing.
import { describe, it, expect } from "vitest";
import { promoteSummaryToProfile } from "@/lib/promoteBulletsToProfile";

// Minimal chainable mock: supabase.from(t).update(payload).eq(col,val)
function mockSupabase({ error = null } = {}) {
  const calls = { from: null, update: null, eqs: [] };
  // .update(payload).eq(col,val) -> resolves { error }
  const eqChain = {
    eq(col, val) {
      calls.eqs.push([col, val]);
      return Promise.resolve({ error });
    },
  };
  return {
    calls,
    from(t) {
      calls.from = t;
      return {
        update(payload) {
          calls.update = payload;
          return eqChain;
        },
      };
    },
  };
}

const user = { id: "user-123" };

describe("promoteSummaryToProfile (F2)", () => {
  it("writes the trimmed summary to profiles scoped to the user", async () => {
    const sb = mockSupabase();
    const res = await promoteSummaryToProfile({
      supabase: sb,
      user,
      summary: "  Builder and operator.  ",
    });
    expect(res.ok).toBe(true);
    expect(sb.calls.from).toBe("profiles");
    expect(sb.calls.update).toEqual({ summary: "Builder and operator." });
    expect(sb.calls.eqs).toContainEqual(["id", "user-123"]);
  });

  it("surfaces a write error (ok:false) instead of failing silently", async () => {
    const sb = mockSupabase({ error: { message: "rls denied" } });
    const res = await promoteSummaryToProfile({
      supabase: sb,
      user,
      summary: "X",
    });
    expect(res.ok).toBe(false);
    expect(res.error).toBeTruthy();
  });

  it("never wipes the profile with a blank/whitespace summary (no write issued)", async () => {
    const sb = mockSupabase();
    const res = await promoteSummaryToProfile({
      supabase: sb,
      user,
      summary: "   ",
    });
    expect(res.ok).toBe(false);
    expect(sb.calls.from).toBe(null); // no write attempted
  });

  it("no-ops without a user id", async () => {
    const sb = mockSupabase();
    const res = await promoteSummaryToProfile({
      supabase: sb,
      user: {},
      summary: "X",
    });
    expect(res.ok).toBe(false);
    expect(sb.calls.from).toBe(null);
  });
});
