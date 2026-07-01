// FIX 2b: promoting studio-edited master bullets back to the source experiences
// (by experience_id) so they survive the tailor-time master rebuild.

import { describe, it, expect } from "vitest";
import { promoteBulletsToProfile } from "@/lib/promoteBulletsToProfile";

function makeSupabase() {
  const updates = [];
  const supabase = {
    from() {
      const filter = { id: null, user_id: null };
      const b = {
        _payload: null,
        update(payload) {
          this._payload = payload;
          return b;
        },
        eq(col, val) {
          filter[col] = val;
          if (col === "user_id") {
            updates.push({ ...filter, bullets: b._payload.bullets });
            return Promise.resolve({ error: null });
          }
          return b;
        },
      };
      return b;
    },
  };
  return { supabase, updates };
}

const USER = { id: "u1" };

describe("promoteBulletsToProfile", () => {
  it("writes each experience's bullets back to its source row by experience_id", async () => {
    const { supabase, updates } = makeSupabase();
    const cvData = {
      professional_experiences: [
        { experience_id: "e1", bullets: ["Led GTM", "Owned roadmap"] },
        { experience_id: "e2", bullets: ["Shipped feature"] },
      ],
      leadership_experiences: [
        { experience_id: "e3", bullets: ["Ran the team"] },
      ],
    };
    const res = await promoteBulletsToProfile({ supabase, user: USER, cvData });
    expect(res).toEqual({ updated: 3, skipped: 0 });
    expect(updates).toContainEqual({
      id: "e1",
      user_id: "u1",
      bullets: ["Led GTM", "Owned roadmap"],
    });
    expect(updates).toContainEqual({
      id: "e3",
      user_id: "u1",
      bullets: ["Ran the team"],
    });
  });

  it("ignores experiences with no experience_id (cannot be mapped to a row)", async () => {
    const { supabase, updates } = makeSupabase();
    const cvData = {
      professional_experiences: [
        { bullets: ["orphan, no id"] },
        { experience_id: "e9", bullets: ["Real one"] },
      ],
    };
    const res = await promoteBulletsToProfile({ supabase, user: USER, cvData });
    expect(res.updated).toBe(1);
    expect(updates).toHaveLength(1);
    expect(updates[0].id).toBe("e9");
  });

  it("no-op for empty / missing cv_data or user", async () => {
    const { supabase } = makeSupabase();
    expect(
      await promoteBulletsToProfile({ supabase, user: null, cvData: {} }),
    ).toEqual({ updated: 0, skipped: 0 });
    expect(
      await promoteBulletsToProfile({ supabase, user: USER, cvData: {} }),
    ).toEqual({ updated: 0, skipped: 0 });
  });
});
