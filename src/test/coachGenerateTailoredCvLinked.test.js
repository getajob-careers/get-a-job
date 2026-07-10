// F1 / orphan-CV (QA2): a single coach turn can BOTH add a NEW tracked app and
// propose its CV. The CV proposal has no application_id yet (the app does not
// exist at emission), so a naive generate would produce an ORPHAN CV linked to
// nothing, and the app row would be born without its job_description. These
// tests prove generateTailoredCVLinked closes both gaps: the app is created
// FIRST (carrying the coach's JD), then the CV is generated against the REAL id.
import { describe, it, expect, vi, beforeEach } from "vitest";

const { invokeBodies, insertedRows, updatedRows, cfg } = vi.hoisted(() => ({
  invokeBodies: [],
  insertedRows: [],
  updatedRows: [],
  // existingDup: id returned by the add_application dedup lookup (null = none).
  cfg: { appAlreadyHasJd: false, existingDup: null },
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
      update(patch) {
        updatedRows.push({ table, patch });
        return chain;
      },
      eq: () => chain,
      ilike: () => chain,
      select: () => chain,
      limit: () => chain,
      // add_application dedup lookup terminates on maybeSingle: null = no
      // duplicate (default, so the insert path is unchanged), or an existing id.
      maybeSingle: () =>
        Promise.resolve({
          data:
            table === "applications" && cfg.existingDup
              ? { id: cfg.existingDup }
              : null,
          error: null,
        }),
      single: () =>
        Promise.resolve(
          table === "applications"
            ? {
                data: {
                  id: "new-app-uuid-0001",
                  // JD-backfill read: empty by default (the ask-flow regression),
                  // present when cfg.appAlreadyHasJd is set (the don't-clobber case).
                  job_description: cfg.appAlreadyHasJd
                    ? "existing JD text"
                    : null,
                },
                error: null,
              }
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
  updatedRows.length = 0;
  cfg.appAlreadyHasJd = false;
  cfg.existingDup = null;
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

  it("ask-flow path: backfills the JD onto a PRE-EXISTING linked app that has none", async () => {
    // Regression: the app was created earlier (ask-for-company flow) with no
    // job_description; the CV is generated later against its valid id. Without a
    // backfill the tracker's own "AI Generate CV" refuses on that empty-JD row.
    const uuid = "d8927a4e-0000-4000-8000-000000000000";
    const res = await generateTailoredCVLinked({
      user,
      queryClient,
      proposal: {
        target_role: "Customer Support Specialist",
        application_id: uuid,
        job_description: JD,
      },
      appActions: null,
      messageId: "m-askflow",
    });
    expect(insertedRows).toHaveLength(0); // no new app — links to the existing one
    expect(res.linkedNewApp).toBe(false);
    // The empty-JD app row got the coach's JD written to it.
    const jdWrite = updatedRows.find(
      (u) => u.table === "applications" && u.patch?.job_description,
    );
    expect(jdWrite).toBeTruthy();
    expect(jdWrite.patch.job_description).toContain(
      "Customer Support Engineer",
    );
    // And the CV still generated against the real id.
    expect(invokeBodies[0].application_id).toBe(uuid);
  });

  it("ask-flow path: does NOT clobber a JD that is already present", async () => {
    cfg.appAlreadyHasJd = true;
    const uuid = "d8927a4e-0000-4000-8000-000000000000";
    await generateTailoredCVLinked({
      user,
      queryClient,
      proposal: {
        target_role: "Support",
        application_id: uuid,
        job_description: JD,
      },
      appActions: null,
      messageId: "m-noclobber",
    });
    const jdWrite = updatedRows.find(
      (u) => u.table === "applications" && u.patch?.job_description,
    );
    expect(jdWrite).toBeUndefined(); // existing JD left untouched
  });

  it("dedup: an existing app for the same company+role is REUSED, not re-added (DriveNets)", async () => {
    // The bug: the coach proposed adding DriveNets even though a tracked app
    // (any status) already existed, and applying it filed a duplicate row. Now
    // the add_application dedup lookup finds it and the CV links to the existing
    // application — no second row, no "new app added".
    cfg.existingDup = "drivenets-existing-uuid";
    const res = await generateTailoredCVLinked({
      user,
      queryClient,
      proposal: {
        target_role: "AI Operations Assistant",
        job_description: JD,
      },
      appActions: [
        {
          action: "add_application",
          company: "DriveNets",
          role_title: "AI Operations Assistant",
        },
      ],
      messageId: "m-dedup",
    });
    // No duplicate application row was inserted.
    expect(insertedRows.filter((r) => r.table === "applications")).toHaveLength(
      0,
    );
    // The CV linked to the EXISTING application, and it's not reported as new.
    expect(res.applicationId).toBe("drivenets-existing-uuid");
    expect(res.linkedNewApp).toBe(false);
    expect(invokeBodies[0].application_id).toBe("drivenets-existing-uuid");
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
