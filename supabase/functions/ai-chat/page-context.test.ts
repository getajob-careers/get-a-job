// Unit tests for the page-context helper (PR-B2). Covers:
//   - sanitizePageContext rejects malformed input, invalid UUIDs, invalid
//     pages / tracks, and returns null on no usable fields.
//   - renderPageContextBlocks returns "" on empty input (the
//     byte-identical-prompt contract — see ai-chat/index.ts userContext
//     assembly; appending "" is a no-op).
//   - each entity block renders only when its entity is present, and the
//     order matches the index.ts append sequence.
//   - fetchPageContextEntities silently drops rows the user-scoped query
//     can't find (foreign IDs, missing rows, RLS denials).

import { describe, it, expect } from "vitest";
import {
  sanitizePageContext,
  renderPageContextBlocks,
  fetchPageContextEntities,
  type FetchedPageContext,
  type SupabaseLike,
} from "./page-context";

const VALID_UUID = "11111111-2222-3333-4444-555555555555";
const ANOTHER_UUID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

describe("sanitizePageContext", () => {
  it("returns null for non-object / null / empty inputs", () => {
    expect(sanitizePageContext(null)).toBeNull();
    expect(sanitizePageContext(undefined)).toBeNull();
    expect(sanitizePageContext("string")).toBeNull();
    expect(sanitizePageContext(42)).toBeNull();
    expect(sanitizePageContext({})).toBeNull();
  });

  it("accepts a valid page name + drops unknown ones", () => {
    expect(sanitizePageContext({ page: "Career" })).toEqual({ page: "Career" });
    expect(sanitizePageContext({ page: "AdminLaunch" })).toBeNull();
    expect(sanitizePageContext({ page: 42 })).toBeNull();
  });

  it("accepts the three valid tracks + drops unknown ones", () => {
    expect(sanitizePageContext({ track: "track_1" })).toEqual({ track: "track_1" });
    expect(sanitizePageContext({ track: "track_4" })).toBeNull();
    expect(sanitizePageContext({ track: 1 })).toBeNull();
  });

  it("accepts valid UUIDs in each UUID field", () => {
    expect(
      sanitizePageContext({
        application_id: VALID_UUID,
        job_id: VALID_UUID,
        role_id: VALID_UUID,
        company_target_id: VALID_UUID,
      }),
    ).toEqual({
      application_id: VALID_UUID,
      job_id: VALID_UUID,
      role_id: VALID_UUID,
      company_target_id: VALID_UUID,
    });
  });

  it("drops invalid UUIDs (wrong format, wrong type, empty)", () => {
    expect(sanitizePageContext({ role_id: "not-a-uuid" })).toBeNull();
    expect(sanitizePageContext({ role_id: 42 })).toBeNull();
    expect(sanitizePageContext({ role_id: "" })).toBeNull();
  });

  it("ignores extraneous keys (whitelist behavior)", () => {
    const out = sanitizePageContext({
      page: "Career",
      track: "track_1",
      extra_evil_key: "<script>",
      another_unknown: 99,
    });
    expect(out).toEqual({ page: "Career", track: "track_1" });
  });

  it("preserves only the valid subset when mixed valid + invalid present", () => {
    const out = sanitizePageContext({
      page: "Career",
      track: "track_9",
      role_id: VALID_UUID,
      job_id: "bad",
    });
    expect(out).toEqual({ page: "Career", role_id: VALID_UUID });
  });
});

describe("renderPageContextBlocks", () => {
  it("returns empty string on empty input — preserves byte-identical prompt assembly", () => {
    expect(renderPageContextBlocks({})).toBe("");
  });

  it("renders only the page block when only page is set", () => {
    const out = renderPageContextBlocks({ page: "Career" });
    expect(out).toBe("\n\nCURRENT PAGE: Career");
  });

  it("renders the track block with the human-readable label", () => {
    const out = renderPageContextBlocks({ track: "track_1" });
    expect(out).toContain("CURRENT TRACK: Track 1 (Your Move)");
    expect(renderPageContextBlocks({ track: "track_2" })).toContain("Track 2 (Plan B)");
    expect(renderPageContextBlocks({ track: "track_3" })).toContain("Track 3 (Work Toward)");
  });

  it("renders a TARGET ROLE block with the role's metadata + percent-scaled scores", () => {
    const fetched: FetchedPageContext = {
      role: {
        id: VALID_UUID,
        title: "Associate Product Manager",
        track: "track_1",
        readiness_score: 0.84,
        goal_alignment_score: 0.95,
        matched_skills: ["stakeholder_management", "user_research"],
        missing_skills: ["product_roadmapping"],
      },
    };
    const out = renderPageContextBlocks(fetched);
    expect(out).toContain("TARGET ROLE");
    expect(out).toContain(`role_id: ${VALID_UUID}`);
    expect(out).toContain("Title: Associate Product Manager");
    expect(out).toContain("Readiness: 84%");
    expect(out).toContain("Goal alignment: 95%");
    expect(out).toContain("Matched skills: stakeholder_management, user_research");
    expect(out).toContain("Skill gaps: product_roadmapping");
  });

  it("renders a TARGET JOB block with experience range when both min and max present", () => {
    const out = renderPageContextBlocks({
      job: {
        id: VALID_UUID,
        title: "Senior Product Manager",
        company_name: "Wix",
        location_city: "Tel Aviv",
        seniority: "senior",
        req_skills_core: ["ab_testing", "stakeholder_management"],
        req_skills_nice: ["sql"],
        req_years_min: 5,
        req_years_max: 8,
      },
    });
    expect(out).toContain(`job_id: ${VALID_UUID}`);
    expect(out).toContain("Experience required: 5-8 yrs");
    expect(out).toContain("Required skills: ab_testing, stakeholder_management");
    expect(out).toContain("Nice-to-haves: sql");
  });

  it("renders a TARGET JOB experience as N+ yrs when max is null", () => {
    const out = renderPageContextBlocks({
      job: {
        id: VALID_UUID,
        title: "Junior Analyst",
        company_name: null,
        location_city: null,
        seniority: null,
        req_skills_core: null,
        req_skills_nice: null,
        req_years_min: 0,
        req_years_max: null,
      },
    });
    expect(out).toContain("Experience required: 0+ yrs");
  });

  it("renders a TARGET COMPANY block with joined company + sector + pitched role", () => {
    const out = renderPageContextBlocks({
      companyTarget: {
        id: VALID_UUID,
        status: "outreach_sent",
        pitched_role: "Customer Success Intern",
        company_name: "Lemonade",
        company_sector: "Insurance",
      },
    });
    expect(out).toContain(`company_target_id: ${VALID_UUID}`);
    expect(out).toContain("Company: Lemonade");
    expect(out).toContain("Sector: Insurance");
    expect(out).toContain("Status: outreach_sent");
    expect(out).toContain("Pitched role: Customer Success Intern");
  });

  it("renders blocks in the canonical order: page → track → role → job → companyTarget", () => {
    const out = renderPageContextBlocks({
      page: "Career",
      track: "track_1",
      role: {
        id: VALID_UUID,
        title: "APM",
        track: "track_1",
        readiness_score: 0.8,
        goal_alignment_score: 0.9,
        matched_skills: null,
        missing_skills: null,
      },
      job: {
        id: ANOTHER_UUID,
        title: "SPM",
        company_name: "Wix",
        location_city: null,
        seniority: null,
        req_skills_core: null,
        req_skills_nice: null,
        req_years_min: null,
        req_years_max: null,
      },
      companyTarget: {
        id: VALID_UUID,
        status: "exploring",
        pitched_role: null,
        company_name: "Gong",
        company_sector: null,
      },
    });
    const pageIdx = out.indexOf("CURRENT PAGE:");
    const trackIdx = out.indexOf("CURRENT TRACK:");
    const roleIdx = out.indexOf("TARGET ROLE");
    const jobIdx = out.indexOf("TARGET JOB");
    const companyIdx = out.indexOf("TARGET COMPANY");
    expect(pageIdx).toBeGreaterThan(-1);
    expect(trackIdx).toBeGreaterThan(pageIdx);
    expect(roleIdx).toBeGreaterThan(trackIdx);
    expect(jobIdx).toBeGreaterThan(roleIdx);
    expect(companyIdx).toBeGreaterThan(jobIdx);
  });
});

// Minimal supabase mock — chains .from().select().eq().eq().maybeSingle() —
// returns whatever the test fixture sets per (table, idCol, idVal,
// userCol, userVal) tuple. Foreign IDs / wrong user simulate as null
// data.
function makeMockSupabase(
  rows: Record<string, Record<string, unknown>>,
): SupabaseLike {
  return {
    from(table: string) {
      return {
        select(_cols: string) {
          return {
            eq(col1: string, val1: unknown) {
              const baseKey = `${table}:${col1}=${String(val1)}`;
              const directRow = rows[baseKey];
              const chain = {
                eq(col2: string, val2: unknown) {
                  const key = `${baseKey},${col2}=${String(val2)}`;
                  const row = rows[key];
                  return {
                    async maybeSingle() {
                      return { data: row ?? null, error: null };
                    },
                  };
                },
                async maybeSingle() {
                  return { data: directRow ?? null, error: null };
                },
              };
              return chain;
            },
          };
        },
      };
    },
  };
}

describe("fetchPageContextEntities", () => {
  const USER = "user-1";
  const OTHER_USER = "user-2";

  it("returns empty fetched on empty input", async () => {
    const supabase = makeMockSupabase({});
    const out = await fetchPageContextEntities(supabase, USER, {});
    expect(out).toEqual({});
  });

  it("passes through page + track without fetching", async () => {
    const supabase = makeMockSupabase({});
    const out = await fetchPageContextEntities(supabase, USER, {
      page: "Career",
      track: "track_1",
    });
    expect(out).toEqual({ page: "Career", track: "track_1" });
  });

  it("fetches a role scoped to the user and includes it when found", async () => {
    const supabase = makeMockSupabase({
      [`career_roles:id=${VALID_UUID},user_id=${USER}`]: {
        id: VALID_UUID,
        title: "APM",
        track: "track_1",
        readiness_score: 0.8,
        goal_alignment_score: 0.9,
        matched_skills: ["s1"],
        missing_skills: ["s2"],
      },
    });
    const out = await fetchPageContextEntities(supabase, USER, {
      role_id: VALID_UUID,
    });
    expect(out.role?.title).toBe("APM");
  });

  it("silently drops a role row that belongs to a different user", async () => {
    const supabase = makeMockSupabase({
      [`career_roles:id=${VALID_UUID},user_id=${OTHER_USER}`]: {
        id: VALID_UUID,
        title: "Foreign role",
        track: "track_1",
        readiness_score: 0.5,
        goal_alignment_score: 0.5,
        matched_skills: null,
        missing_skills: null,
      },
    });
    const out = await fetchPageContextEntities(supabase, USER, {
      role_id: VALID_UUID,
    });
    expect(out.role).toBeUndefined();
  });

  it("silently drops a missing job (no row returned)", async () => {
    const supabase = makeMockSupabase({});
    const out = await fetchPageContextEntities(supabase, USER, {
      job_id: VALID_UUID,
    });
    expect(out.job).toBeUndefined();
  });

  it("fetches a company target scoped to the user with joined company data", async () => {
    const supabase = makeMockSupabase({
      [`company_targets:id=${VALID_UUID},user_id=${USER}`]: {
        id: VALID_UUID,
        status: "outreach_sent",
        pitched_role: "CS Intern",
        companies: { name: "Lemonade", sector: "Insurance" },
      },
    });
    const out = await fetchPageContextEntities(supabase, USER, {
      company_target_id: VALID_UUID,
    });
    expect(out.companyTarget).toEqual({
      id: VALID_UUID,
      status: "outreach_sent",
      pitched_role: "CS Intern",
      company_name: "Lemonade",
      company_sector: "Insurance",
    });
  });
});

describe("prompt-byte-equivalence — absent context = today's prompt", () => {
  it("renderPageContextBlocks on no-context input produces a no-op string", () => {
    // The contract: if page_context is absent from the request body,
    // userContext is byte-identical to the pre-PR-B2 assembly.
    // Concretely: userContext += renderPageContextBlocks({}) must be
    // a no-op. The empty-input test above asserts "". This test docs
    // the contract.
    const userContextBefore = "USER PROFILE:\n- Name: Eli";
    const appended = userContextBefore + renderPageContextBlocks({});
    expect(appended).toBe(userContextBefore);
  });
});
