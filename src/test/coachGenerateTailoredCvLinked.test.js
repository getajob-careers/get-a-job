// F1 / orphan-CV (QA2): a single coach turn can BOTH add a NEW tracked app and
// propose its CV. The CV proposal has no application_id yet (the app does not
// exist at emission), so a naive generate would produce an ORPHAN CV linked to
// nothing, and the app row would be born without its job_description. These
// tests prove generateTailoredCVLinked closes both gaps: the app is created
// FIRST (carrying the coach's JD), then the CV is generated against the REAL id.
import { describe, it, expect, vi, beforeEach } from "vitest";

const { invokeBodies, insertedRows } = vi.hoisted(() => ({
  invokeBodies: [],
  insertedRows: [],
}));

vi.mock("@/api/invokeWithAuthRetry", () => ({
  invokeWithAuthRetry: vi.fn(async (_fn, opts) => {
    invokeBodies.push(opts?.body);
    // Echo the sent application_id the way generate-tailored-cv does when it
    // links — so result.application_id reflects what the caller passed.
    return {
      data: {
        cv_url: "https://x/cv.pdf",
        application_id: opts?.body?.application_id ?? null,
      },
      error: null,
    };
  }),
}));

// supabase client: applications.insert(...).select("id").single() returns a new
// id; chat_messages persistence (update/eq) resolves empty.
vi.mock("@/api/supabaseClient", () => {
  const makeChain = (table) => {
    const chain = {
      insert(row) {
        insertedRows.push({ table, row });
        return chain;
      },
      update: () => chain,
      eq: () => chain,
      ilike: () => chain,
      select: () => chain,
      single: () =>
        Promise.resolve(
          table === "applications"
            ? { data: { id: "new-app-uuid-0001" }, error: null }
            : { data: {}, error: null },
        ),
      then: (r) => Promise.resolve({ data: {}, error: null }).then(r),
    };
    return chain;
  };
  return { supabase: { from: (t) => makeChain(t) } };
});

vi.mock("@/lib/analytics", () => ({ track: vi.fn(), EVENTS: {} }));
vi.mock("@/lib/scoreApplication", () => ({ scoreApplication: vi.fn() }));

import { generateTailoredCVLinked } from "@/lib/coachActionHandlers";

const user = { id: "user-1" };
const queryClient = { invalidateQueries: vi.fn() };
const JD =
  "We are hiring a Customer Support Engineer at Honeycomb Support Ltd. Requisition 2657.";

beforeEach(() => {
  invokeBodies.length = 0;
  insertedRows.length = 0;
});

describe("generateTailoredCVLinked (F1 / orphan-CV)", () => {
  it("creates the app FIRST with the coach's JD, then links the CV to the new id", async () => {
    // add_application carries NO job_description; the coach's JD lives only on
    // the CV proposal. The helper must inject it onto the created app row.
    const res = await generateTailoredCVLinked({
      user,
      queryClient,
      proposal: {
        target_role: "Customer Support Engineer",
        job_description: JD,
      },
      appActions: [
        {
          action: "add_application",
          company: "Honeycomb Support Ltd",
          role_title: "Customer Support Engineer",
        },
      ],
      messageId: "m1",
    });

    // App was created, and born WITH the coach's JD (dropped-field gap closed).
    expect(insertedRows).toHaveLength(1);
    expect(insertedRows[0].table).toBe("applications");
    expect(insertedRows[0].row.job_description).toContain(
      "Customer Support Engineer",
    );

    // The CV was generated against the REAL new app id — proving app-apply ran
    // BEFORE generation emission (the id only exists post-insert), so no orphan.
    expect(invokeBodies).toHaveLength(1);
    expect(invokeBodies[0].application_id).toBe("new-app-uuid-0001");

    expect(res.linkedNewApp).toBe(true);
    expect(res.applicationId).toBe("new-app-uuid-0001");
    expect(res.result.application_id).toBe("new-app-uuid-0001");
    // Real company supplied → not flagged as an Unknown/placeholder filing.
    expect(res.unknownCompany).toBe(false);
  });

  it("flags unknownCompany when the coach files the app without a real company (⑤)", async () => {
    // No company on the add_application, and a placeholder on a second variant:
    // both resolve to FALLBACK_COMPANY, so the caller can surface it visibly
    // instead of silently filing an "Unknown".
    for (const company of [undefined, "Unknown", "N/A"]) {
      insertedRows.length = 0;
      invokeBodies.length = 0;
      const res = await generateTailoredCVLinked({
        user,
        queryClient,
        proposal: { target_role: "Support", job_description: JD },
        appActions: [
          {
            action: "add_application",
            role_title: "Support",
            ...(company != null ? { company } : {}),
          },
        ],
        messageId: "m-unknown",
      });
      expect(res.linkedNewApp).toBe(true); // still linked — no orphan
      expect(res.unknownCompany).toBe(true); // but NOT silent
      expect(invokeBodies[0].application_id).toBe("new-app-uuid-0001");
    }
  });

  it("treats a garbage (non-UUID) application_id as absent and links via the new app", async () => {
    const res = await generateTailoredCVLinked({
      user,
      queryClient,
      proposal: {
        target_role: "Support",
        application_id: "2657",
        job_description: JD,
      },
      appActions: [
        {
          action: "add_application",
          company: "Honeycomb",
          role_title: "Support",
        },
      ],
      messageId: "m2",
    });
    expect(insertedRows).toHaveLength(1);
    expect(invokeBodies[0].application_id).toBe("new-app-uuid-0001");
    expect(res.linkedNewApp).toBe(true);
  });

  it("uses a valid application_id directly without creating a new app", async () => {
    const uuid = "b698af3d-0000-4000-8000-000000000000";
    const res = await generateTailoredCVLinked({
      user,
      queryClient,
      proposal: { target_role: "PM", application_id: uuid },
      appActions: [
        { action: "add_application", company: "X", role_title: "PM" },
      ],
      messageId: "m3",
    });
    expect(insertedRows).toHaveLength(0); // no double-create
    expect(invokeBodies[0].application_id).toBe(uuid);
    expect(res.linkedNewApp).toBe(false);
  });

  it("generates unlinked when there is no app id and no add_application action", async () => {
    const res = await generateTailoredCVLinked({
      user,
      queryClient,
      proposal: { target_role: "Data Analyst" },
      appActions: null,
      messageId: "m4",
    });
    expect(insertedRows).toHaveLength(0);
    expect("application_id" in invokeBodies[0]).toBe(false);
    expect(res.linkedNewApp).toBe(false);
  });
});
