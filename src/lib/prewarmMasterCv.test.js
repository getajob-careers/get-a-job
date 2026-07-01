// prewarmMasterCv — the onboarding background master pre-warm (speed regression
// fix). These tests pin the contract that makes a new user's first tailor warm:
// a master row is authored once for a fresh user, and NEVER double-authored when
// one already exists or a concurrent self-heal races us.

import { describe, it, expect, vi, beforeEach } from "vitest";

// Stub the deterministic builder — this test is about orchestration (skip / build
// / race), not cv_data shape (that is cvMaster.deterministic.test.js).
vi.mock("@/lib/cvDataAdapter", () => ({
  buildMasterCvData: vi.fn(() => ({ header: { name: "Test User" } })),
}));

import { prewarmMasterCv } from "@/lib/prewarmMasterCv";
import { buildMasterCvData } from "@/lib/cvDataAdapter";

// Minimal chainable supabase fake. from(table) returns a builder whose terminal
// methods resolve per-table from `cfg`; insert() records the payload.
function makeSupabase(cfg) {
  const inserts = [];
  const from = (table) => {
    const b = {
      select: () => b,
      eq: () => b,
      order: () => b,
      maybeSingle: () => Promise.resolve(cfg.master ?? { data: null }),
      single: () => Promise.resolve(cfg.profile ?? { data: null }),
      insert: (row) => {
        inserts.push({ table, row });
        return Promise.resolve(cfg.insert ?? { error: null });
      },
      // experiences / education / projects / certifications are awaited directly
      // off the chain
      then: (resolve) =>
        Promise.resolve(
          table === "experiences"
            ? (cfg.experiences ?? { data: [] })
            : table === "projects"
              ? (cfg.projects ?? { data: [] })
              : table === "certifications"
                ? (cfg.certifications ?? { data: [] })
                : (cfg.education ?? { data: [] }),
        ).then(resolve),
    };
    return b;
  };
  return { from, _inserts: inserts };
}

const USER = { id: "u1", email: "u1@example.com" };

beforeEach(() => {
  buildMasterCvData.mockClear();
});

describe("prewarmMasterCv", () => {
  it("authors a master once for a fresh user (makes first tailor warm)", async () => {
    const sb = makeSupabase({
      master: { data: null }, // no master yet
      profile: { data: { id: "u1", full_name: "Test User" } },
      experiences: { data: [{ id: "e1", title: "Analyst", company: "Acme" }] },
      education: { data: [{ id: "ed1", degree: "BSc" }] },
      insert: { error: null },
    });

    const res = await prewarmMasterCv({ supabase: sb, user: USER });

    expect(res.status).toBe("built");
    // exactly one master row inserted, flagged is_master
    expect(sb._inserts).toHaveLength(1);
    expect(sb._inserts[0].table).toBe("application_cvs");
    expect(sb._inserts[0].row).toMatchObject({
      user_id: "u1",
      is_master: true,
      application_id: null,
    });
    // built from the persisted rows (experience id is what refine-cv needs),
    // now with projects/certifications extras sourced in parallel.
    expect(buildMasterCvData).toHaveBeenCalledWith(
      { id: "u1", full_name: "Test User" },
      [{ id: "e1", title: "Analyst", company: "Acme" }],
      [{ id: "ed1", degree: "BSc" }],
      "u1@example.com",
      { projects: [], certifications: [] },
    );
  });

  it("does NOT double-author when a master already exists", async () => {
    const sb = makeSupabase({ master: { data: { id: "m1" } } });
    const res = await prewarmMasterCv({ supabase: sb, user: USER });
    expect(res.status).toBe("skipped_exists");
    expect(sb._inserts).toHaveLength(0);
    expect(buildMasterCvData).not.toHaveBeenCalled();
  });

  it("treats a concurrent unique-violation (23505) as a harmless no-op", async () => {
    const sb = makeSupabase({
      master: { data: null },
      profile: { data: { id: "u1" } },
      experiences: { data: [] },
      education: { data: [] },
      insert: { error: { code: "23505", message: "duplicate key" } },
    });
    const res = await prewarmMasterCv({ supabase: sb, user: USER });
    expect(res.status).toBe("raced"); // refine-cv self-heal beat us; no throw
  });

  it("skips cleanly when the profile row is missing", async () => {
    const sb = makeSupabase({
      master: { data: null },
      profile: { data: null },
    });
    const res = await prewarmMasterCv({ supabase: sb, user: USER });
    expect(res.status).toBe("skipped_no_profile");
    expect(sb._inserts).toHaveLength(0);
  });

  it("returns error (never throws) when user is missing", async () => {
    const res = await prewarmMasterCv({
      supabase: makeSupabase({}),
      user: null,
    });
    expect(res.status).toBe("error");
  });
});
