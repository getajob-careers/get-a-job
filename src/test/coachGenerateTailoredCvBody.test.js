// ADD 1 (P0): the coach CV-gen path must NOT send application_id: null to
// generate-tailored-cv (its validation 400s on null before the not-found
// fallthrough). This test captures the exact request body coachActionHandlers
// sends: the key is OMITTED for a non-tracked role, and present for a tracked one.
// This is the deterministic proof that auto-fire acceptance can no longer drive
// into the 400. (The server also now treats null as "no app" - belt-and-suspenders.)
import { describe, it, expect, vi, beforeEach } from "vitest";

const { invokeBodies } = vi.hoisted(() => ({ invokeBodies: [] }));

vi.mock("@/api/invokeWithAuthRetry", () => ({
  invokeWithAuthRetry: vi.fn(async (_fn, opts) => {
    invokeBodies.push(opts?.body);
    return {
      data: { cv_url: "https://x/cv.pdf", application_id: null },
      error: null,
    };
  }),
}));
// generateTailoredCV persists the result back to chat_messages; stub the client.
vi.mock("@/api/supabaseClient", () => {
  const chain = {
    update: () => chain,
    eq: () => chain,
    select: () => chain,
    single: () => Promise.resolve({ data: {}, error: null }),
    then: (r) => Promise.resolve({ data: {}, error: null }).then(r),
  };
  return { supabase: { from: () => chain } };
});
vi.mock("@/lib/analytics", () => ({ track: vi.fn(), EVENTS: {} }));

import { generateTailoredCV } from "@/lib/coachActionHandlers";

const queryClient = { invalidateQueries: vi.fn() };

beforeEach(() => {
  invokeBodies.length = 0;
});

describe("generateTailoredCV request body (no null application_id)", () => {
  it("OMITS application_id for a non-tracked role (proposal.application_id null)", async () => {
    await generateTailoredCV({
      queryClient,
      proposal: { target_role: "AI Adoption Specialist", application_id: null },
      messageId: "m1",
    });
    expect(invokeBodies).toHaveLength(1);
    const body = invokeBodies[0];
    expect(body).not.toHaveProperty("application_id"); // key omitted, not null
    expect("application_id" in body).toBe(false);
    expect(body.target_role).toBe("AI Adoption Specialist");
  });

  it("OMITS application_id when the proposal has none at all (undefined)", async () => {
    await generateTailoredCV({
      queryClient,
      proposal: { target_role: "Data Analyst" },
      messageId: "m2",
    });
    expect("application_id" in invokeBodies[0]).toBe(false);
  });

  it("INCLUDES application_id for a tracked role", async () => {
    await generateTailoredCV({
      queryClient,
      proposal: { target_role: "PM", application_id: "app-uuid-123" },
      messageId: "m3",
    });
    expect(invokeBodies[0].application_id).toBe("app-uuid-123");
  });
});
