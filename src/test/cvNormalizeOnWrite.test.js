// PIECE 5: normalize-on-write. The profile bullet-write paths (coachActionHandlers
// setBullets / appendBullets, which BulletsEditor routes through) now run bullets
// through the same deterministic voice/caps normalizer the CV builder uses, so the
// STORED experiences.bullets are clean at the source. These tests capture the DB
// write payload and assert the persisted bullets are normalized.
import { describe, it, expect, vi, beforeEach } from "vitest";

// Shared, hoisted capture + config for the supabase mock.
const { updatePayloads, state } = vi.hoisted(() => ({
  updatePayloads: [],
  state: { prevBullets: [] },
}));

vi.mock("@/api/supabaseClient", () => {
  const chain = {
    select: () => chain,
    eq: () => chain,
    update: (payload) => {
      updatePayloads.push(payload);
      return chain;
    },
    maybeSingle: () =>
      Promise.resolve({
        data: { bullets: state.prevBullets, skills: [] },
        error: null,
      }),
    // awaiting the update().eq().eq() chain resolves to { error: null }
    then: (resolve) => Promise.resolve({ error: null }).then(resolve),
  };
  return { supabase: { from: () => chain } };
});
vi.mock("@/api/invokeWithAuthRetry", () => ({ invokeWithAuthRetry: vi.fn() }));
vi.mock("@/lib/analytics", () => ({ track: vi.fn(), EVENTS: {} }));

import { setBullets, appendBullets } from "@/lib/coachActionHandlers";

beforeEach(() => {
  updatePayloads.length = 0;
  state.prevBullets = [];
});

describe("normalize-on-write (stored bullets stay clean at the source)", () => {
  it("setBullets normalizes voice + caps before writing", async () => {
    const res = await setBullets({
      user: { id: "u1" },
      targetType: "experience",
      targetId: "e1",
      bullets: [
        "wrote a fetcher in Python",
        "I am comparing Claude",
        "analyzed the funnel",
      ],
    });
    expect(res.ok).toBe(true);
    expect(updatePayloads).toHaveLength(1);
    expect(updatePayloads[0].bullets).toEqual([
      "Wrote a fetcher in Python",
      "Comparing Claude",
      "Analyzed the funnel",
    ]);
  });

  it("appendBullets normalizes the merged set (and heals a legacy raw prev bullet)", async () => {
    state.prevBullets = ["led the migration"]; // legacy raw bullet already stored
    const res = await appendBullets({
      user: { id: "u1" },
      targetType: "experience",
      targetId: "e1",
      bullets: ["I am shipping the redesign"],
      force: true, // skip dedup classification for a deterministic write
    });
    expect(res.ok).toBe(true);
    expect(updatePayloads).toHaveLength(1);
    // legacy prev bullet healed + new bullet normalized
    expect(updatePayloads[0].bullets).toEqual([
      "Led the migration",
      "Shipping the redesign",
    ]);
  });

  it("preserves numbers/tools while normalizing (content-preserving)", async () => {
    const res = await setBullets({
      user: { id: "u1" },
      targetType: "experience",
      targetId: "e1",
      bullets: ["We built 15 dashboards used by 200 users in Tableau"],
    });
    expect(res.ok).toBe(true);
    expect(updatePayloads[0].bullets[0]).toBe(
      "Built 15 dashboards used by 200 users in Tableau",
    );
  });

  it("is idempotent: already-clean bullets are written unchanged", async () => {
    await setBullets({
      user: { id: "u1" },
      targetType: "experience",
      targetId: "e1",
      bullets: ["Led a team of 8", "Built 15 dashboards"],
    });
    expect(updatePayloads[0].bullets).toEqual([
      "Led a team of 8",
      "Built 15 dashboards",
    ]);
  });
});
