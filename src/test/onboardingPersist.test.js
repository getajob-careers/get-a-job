import { describe, it, expect, vi, beforeEach } from "vitest";

// PR 6a behavior-identity tests. The four persist functions were lifted
// VERBATIM out of Onboarding.jsx into @/lib/onboardingPersist; these tests
// pin the exact DB call sequence + payload shapes they emit so any drift from
// V1's live signup behavior fails loudly. The live +test signup drive on the
// preview is the other half of the proof (see PR body); these guard the shape.

// --- Recording supabase client ------------------------------------------
// Every .from(table) opens a "call" record; chain methods stamp it; awaiting
// the chain resolves via the test-supplied responder. This lets each test
// assert precisely which table got which method with which payload, in order.
// Everything the vi.mock factory touches lives in vi.hoisted so it is defined
// before the hoisted factory runs (avoids the TDZ that a plain const hits).
const h = vi.hoisted(() => {
  const state = { calls: [], responder: null };

  function makeChain(rec) {
    const chain = {
      insert(payload) {
        rec.method = "insert";
        rec.payload = payload;
        return chain;
      },
      update(payload) {
        rec.method = "update";
        rec.payload = payload;
        return chain;
      },
      delete() {
        rec.method = "delete";
        return chain;
      },
      select(sel) {
        rec.select = sel ?? "*";
        return chain;
      },
      eq(k, v) {
        rec.filters.push(["eq", k, v]);
        return chain;
      },
      in(k, v) {
        rec.filters.push(["in", k, v]);
        return chain;
      },
      order() {
        return chain;
      },
      single() {
        rec.single = true;
        return Promise.resolve(state.responder(rec));
      },
      then(onF, onR) {
        return Promise.resolve(state.responder(rec)).then(onF, onR);
      },
    };
    return chain;
  }

  const rpcSpy = vi.fn();
  const invokeSpy = vi.fn();
  const refreshSessionSpy = vi.fn();

  const supabase = {
    from(table) {
      const rec = {
        table,
        method: "select",
        payload: null,
        filters: [],
        select: null,
      };
      state.calls.push(rec);
      return makeChain(rec);
    },
    rpc: (...a) => {
      rpcSpy(...a);
      return Promise.resolve({ data: null, error: null });
    },
    functions: {
      invoke: (...a) => {
        invokeSpy(...a);
        return Promise.resolve({ data: {}, error: null });
      },
    },
    auth: {
      refreshSession: (...a) => {
        refreshSessionSpy(...a);
        return Promise.resolve({
          data: { session: { access_token: "tok-123" } },
          error: null,
        });
      },
    },
  };

  return { state, supabase, rpcSpy, invokeSpy, refreshSessionSpy };
});

const { rpcSpy, invokeSpy, refreshSessionSpy } = h;

vi.mock("@/api/supabaseClient", () => ({ supabase: h.supabase }));
vi.mock("@/lib/prewarmMasterCv", () => ({ prewarmMasterCv: vi.fn() }));
vi.mock("@/lib/analytics", () => ({
  track: vi.fn(),
  EVENTS: {
    ONBOARDING_STEP_COMPLETED: "onboarding_step_completed",
    ONBOARDING_COMPLETED: "onboarding_completed",
  },
}));

import {
  saveEducations,
  saveProgress,
  handleFinalise,
  handleSurveyNext,
} from "@/lib/onboardingPersist";

const USER = {
  id: "user-1",
  user_metadata: { invite_code: "PILOT7", cohort_label: "reichman-2026" },
};

// Default responder: every read returns empty, every write returns a stub id.
function defaultResponder(rec) {
  if (rec.method === "insert" && rec.single)
    return { data: { id: "new-id" }, error: null };
  if (rec.method === "insert") return { data: [{ id: "ins-1" }], error: null };
  return { data: [], error: null };
}

function baseCtx(overrides = {}) {
  return {
    user: USER,
    profileData: { full_name: "Dana", skills: ["SQL", "SQL", "Excel"] },
    experiences: [],
    educations: [],
    projects: [],
    certifications: [],
    existingProfileId: "profile-1",
    setExistingProfileId: vi.fn(),
    setEducations: vi.fn(),
    generatingRoles: false,
    setGeneratingRoles: vi.fn(),
    setStep: vi.fn(),
    finalising: false,
    setFinalising: vi.fn(),
    setFinaliseError: vi.fn(),
    setSetupComplete: vi.fn(),
    mountedRef: { current: true },
    queryClient: { invalidateQueries: vi.fn(), removeQueries: vi.fn() },
    STEP_NAMES: [
      "cv",
      "review",
      "internship",
      "career_direction",
      "constraints",
      "survey",
      "tier_reveal",
    ],
    ...overrides,
  };
}

const calls = () => h.state.calls;

beforeEach(() => {
  h.state.calls = [];
  h.state.responder = defaultResponder;
  rpcSpy.mockClear();
  invokeSpy.mockClear();
  refreshSessionSpy.mockClear();
  vi.stubGlobal("localStorage", {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  });
});

const setResponder = (fn) => {
  h.state.responder = fn;
};

const on = (table, method) =>
  h.state.calls.filter((c) => c.table === table && c.method === method);

describe("saveProgress", () => {
  it("updates the profiles row for an existing profile (deduped skills, onboarding_step)", async () => {
    await saveProgress(baseCtx(), 3);
    const upd = on("profiles", "update");
    expect(upd).toHaveLength(1);
    expect(upd[0].payload.onboarding_step).toBe(3);
    expect(upd[0].payload.skills).toEqual(["SQL", "Excel"]);
    expect(upd[0].filters).toContainEqual(["eq", "id", "profile-1"]);
  });

  it("inserts a new profiles row (id, invite/cohort stamp, full_name fallback) + fires welcome email", async () => {
    const setExistingProfileId = vi.fn();
    await saveProgress(
      baseCtx({
        existingProfileId: null,
        setExistingProfileId,
        profileData: { skills: [] },
      }),
      0,
    );
    const ins = on("profiles", "insert");
    expect(ins).toHaveLength(1);
    expect(ins[0].payload.id).toBe("user-1");
    expect(ins[0].payload.invite_code).toBe("PILOT7");
    expect(ins[0].payload.cohort_label).toBe("reichman-2026");
    expect(ins[0].payload.full_name).toBe("User"); // fallback when profileData/full_name absent
    expect(setExistingProfileId).toHaveBeenCalledWith("ins-1");
    expect(invokeSpy).toHaveBeenCalledWith("send-welcome-email", { body: {} });
  });

  it("propagates a profiles-update error (throws)", async () => {
    setResponder((rec) =>
      rec.table === "profiles" && rec.method === "update"
        ? { data: null, error: new Error("boom") }
        : defaultResponder(rec),
    );
    await expect(saveProgress(baseCtx(), 2)).rejects.toThrow("boom");
  });

  it("persists education AFTER the profile write", async () => {
    const ctx = baseCtx({
      educations: [{ institution: "Reichman", education_level: "bachelors" }],
    });
    await saveProgress(ctx, 1);
    const profIdx = calls().findIndex((c) => c.table === "profiles");
    const eduIdx = calls().findIndex((c) => c.table === "education");
    expect(profIdx).toBeGreaterThanOrEqual(0);
    expect(eduIdx).toBeGreaterThan(profIdx);
  });
});

describe("saveEducations", () => {
  it("skips institution-less rows", async () => {
    await saveEducations(
      baseCtx({ educations: [{ institution: "   ", degree_type: "BA" }] }),
    );
    expect(on("education", "insert")).toHaveLength(0);
    expect(on("education", "update")).toHaveLength(0);
  });

  it("inserts a row without an id and writes the new id back to state", async () => {
    const setEducations = vi.fn();
    await saveEducations(
      baseCtx({ educations: [{ institution: "Reichman" }], setEducations }),
    );
    expect(on("education", "insert")).toHaveLength(1);
    expect(setEducations).toHaveBeenCalledTimes(1);
    // The updater maps index 0 to the returned id.
    const updater = setEducations.mock.calls[0][0];
    expect(updater([{ institution: "Reichman" }])[0].id).toBe("new-id");
  });

  it("updates a row that already has an id (no state writeback)", async () => {
    const setEducations = vi.fn();
    await saveEducations(
      baseCtx({
        educations: [{ id: "edu-9", institution: "Reichman" }],
        setEducations,
      }),
    );
    const upd = on("education", "update");
    expect(upd).toHaveLength(1);
    expect(upd[0].filters).toContainEqual(["eq", "id", "edu-9"]);
    expect(upd[0].filters).toContainEqual(["eq", "user_id", "user-1"]);
    expect(setEducations).not.toHaveBeenCalled();
  });
});

describe("handleFinalise", () => {
  it("no-ops when already finalising", async () => {
    const setFinalising = vi.fn();
    await handleFinalise(baseCtx({ finalising: true, setFinalising }));
    expect(setFinalising).not.toHaveBeenCalled();
    expect(calls()).toHaveLength(0);
  });

  it("marks complete with the analysis fields stripped and freshness stamped", async () => {
    const ctx = baseCtx({ setSetupComplete: vi.fn(), setFinalising: vi.fn() });
    await handleFinalise(ctx);
    // Final profiles update is the last profiles write.
    const profUpdates = on("profiles", "update");
    const finalUpdate = profUpdates[profUpdates.length - 1];
    expect(finalUpdate.payload.onboarding_complete).toBe(true);
    expect(finalUpdate.payload.onboarding_step).toBe(6);
    expect(typeof finalUpdate.payload.last_reality_check_date).toBe("string");
    // The step-7 analysis writes must never be clobbered by stale React state.
    expect(finalUpdate.payload).not.toHaveProperty("qualification_level");
    expect(finalUpdate.payload).not.toHaveProperty("skill_gaps");
    expect(finalUpdate.payload).not.toHaveProperty("overall_assessment");
    expect(ctx.setSetupComplete).toHaveBeenCalledWith(true);
    expect(ctx.setFinalising).toHaveBeenLastCalledWith(false);
  });

  it("sanitises experience inserts to the whitelisted columns", async () => {
    const ctx = baseCtx({
      experiences: [
        {
          title: "Intern",
          company: "Acme",
          type: "internship",
          start_date: "2025-01",
          end_date: "2025-06",
          is_current: false,
          responsibilities: "did things",
          skills: ["SQL"],
          _uiOnlyField: "should-not-persist",
        },
      ],
    });
    await handleFinalise(ctx);
    const ins = on("experiences", "insert");
    expect(ins).toHaveLength(1);
    expect(ins[0].payload[0]).not.toHaveProperty("_uiOnlyField");
    expect(ins[0].payload[0].user_id).toBe("user-1");
    expect(ins[0].payload[0].managed_people).toBe(false);
  });
});

describe("handleSurveyNext", () => {
  it("early-returns while roles are already generating", async () => {
    const setStep = vi.fn();
    await handleSurveyNext(baseCtx({ generatingRoles: true, setStep }));
    expect(setStep).not.toHaveBeenCalled();
    expect(calls()).toHaveLength(0);
  });

  it("runs analysis, replaces career roles via RPC, and chains to handleFinalise", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            roles: [
              {
                title: "Data Analyst",
                track: "track_1",
                readiness_score: 0.7,
                missing_skills: ["Tableau"],
                matched_skills: ["SQL"],
              },
            ],
            qualification_level: "Junior",
            skill_gaps: ["Tableau"],
            input_hash: "hash-abc",
          }),
      })),
    );
    vi.stubGlobal("import.meta", undefined); // env read is defensive; fetch is stubbed
    const ctx = baseCtx({
      setSetupComplete: vi.fn(),
      profileData: { skills: ["SQL"], five_year_role: "Analyst" },
    });
    await handleSurveyNext(ctx);

    expect(refreshSessionSpy).toHaveBeenCalled();
    expect(rpcSpy).toHaveBeenCalledWith(
      "replace_career_roles",
      expect.objectContaining({
        p_user_id: "user-1",
        p_input_hash: "hash-abc",
        p_roles: expect.arrayContaining([
          expect.objectContaining({
            title: "Data Analyst",
            readiness_score: 0.7,
            skills_gap: ["Tableau"],
          }),
        ]),
      }),
    );
    // Chained through to completion.
    expect(ctx.setSetupComplete).toHaveBeenCalledWith(true);
  });
});
