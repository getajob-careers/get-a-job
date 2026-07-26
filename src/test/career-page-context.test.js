// Unit tests for Career.jsx's PR-B2 page-context shape builder. Proves
// the drawer wiring emits the right IDs per state combination — the
// three Career-specific IDs the spec calls out (selected track,
// expanded matched-role id, open detail-drawer application_id). The
// builder is intentionally pure + decoupled from the page-tree render
// so the assertion stays focused on the wire shape.

import { describe, it, expect } from "vitest";
import { buildCareerPageContext } from "../lib/buildCareerPageContext";

const ROLE_ID = "11111111-2222-3333-4444-555555555555";
const APP_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

describe("buildCareerPageContext (PR-B2)", () => {
  it("always sets page: 'Career'", () => {
    expect(buildCareerPageContext({}).page).toBe("Career");
  });

  it("emits {page: 'Career', track} on a fresh visit with no role expanded + no detail drawer open", () => {
    expect(buildCareerPageContext({ selectedTrack: "track_1" })).toEqual({
      page: "Career",
      track: "track_1",
    });
  });

  it("emits all three Career-spec IDs together when the user has a track + expanded role + open detail drawer", () => {
    expect(
      buildCareerPageContext({
        selectedTrack: "track_2",
        roleId: ROLE_ID,
        applicationId: APP_ID,
      }),
    ).toEqual({
      page: "Career",
      track: "track_2",
      role_id: ROLE_ID,
      application_id: APP_ID,
    });
  });

  it("omits the role_id key entirely when no role is expanded (server sanitizer doesn't have to filter undefined)", () => {
    const out = buildCareerPageContext({
      selectedTrack: "track_3",
      roleId: null,
    });
    expect(out.role_id).toBeUndefined();
    expect(Object.keys(out).sort()).toEqual(["page", "track"]);
  });

  it("omits the application_id key when the detail drawer is closed", () => {
    const out = buildCareerPageContext({
      selectedTrack: "track_1",
      roleId: ROLE_ID,
    });
    expect(out.application_id).toBeUndefined();
    expect(Object.keys(out).sort()).toEqual(["page", "role_id", "track"]);
  });

  it("omits falsy entity ids (empty strings, null) — not just undefined", () => {
    expect(
      buildCareerPageContext({
        selectedTrack: "",
        roleId: "",
        applicationId: null,
      }),
    ).toEqual({ page: "Career" });
  });

  it("switches to a different track without leaking the old one", () => {
    const before = buildCareerPageContext({
      selectedTrack: "track_1",
      roleId: ROLE_ID,
    });
    const after = buildCareerPageContext({
      selectedTrack: "track_3",
      roleId: ROLE_ID,
    });
    expect(before.track).toBe("track_1");
    expect(after.track).toBe("track_3");
    expect(before).not.toBe(after);
  });
});

// B3 visible-list ids — the producer emits visible_items as an array of typed
// lists (job + role), and memoizes that array behind a stable ids key so the
// shared setPageContext shallow-equal guard doesn't thrash on every render.
describe("buildCareerPageContext — visible_items (B3)", () => {
  const J1 = "11111111-0000-0000-0000-000000000001";
  const J2 = "11111111-0000-0000-0000-000000000002";
  const R1 = "22222222-0000-0000-0000-000000000001";

  it("emits a typed visible_items array for jobs + roles, in render order", () => {
    const ctx = buildCareerPageContext({
      selectedTrack: "track_2",
      visibleJobIds: [J1, J2],
      visibleRoleIds: [R1],
    });
    expect(ctx.visible_items).toEqual([
      { type: "job", ids: [J1, J2] },
      { type: "role", ids: [R1] },
    ]);
  });

  it("omits visible_items entirely when both id lists are empty", () => {
    const ctx = buildCareerPageContext({
      selectedTrack: "track_1",
      visibleJobIds: [],
      visibleRoleIds: [],
    });
    expect(ctx.visible_items).toBeUndefined();
  });

  it("returns a STABLE visible_items reference while the ids are unchanged (thrash fix)", () => {
    const a = buildCareerPageContext({
      selectedTrack: "track_2",
      visibleJobIds: [J1, J2],
      visibleRoleIds: [R1],
    });
    const b = buildCareerPageContext({
      selectedTrack: "track_2",
      visibleJobIds: [J1, J2],
      visibleRoleIds: [R1],
    });
    // identity stability — same content ⇒ same array reference ⇒ no thrash
    expect(b.visible_items).toBe(a.visible_items);
  });

  it("returns a NEW visible_items reference when the ids (content or order) change", () => {
    const a = buildCareerPageContext({
      selectedTrack: "track_2",
      visibleJobIds: [J1, J2],
    });
    const reordered = buildCareerPageContext({
      selectedTrack: "track_2",
      visibleJobIds: [J2, J1],
    });
    const added = buildCareerPageContext({
      selectedTrack: "track_2",
      visibleJobIds: [J1, J2],
      visibleRoleIds: [R1],
    });
    expect(reordered.visible_items).not.toBe(a.visible_items);
    expect(added.visible_items).not.toBe(a.visible_items);
  });
});

// job_id - the open detail-modal job the feed reports up. The ai-chat sanitizer
// already accepts + fetches job_id; the producer just needs to emit it and omit
// it when no modal is open.
describe("buildCareerPageContext - job_id (open detail modal)", () => {
  const JOB_ID = "99999999-0000-0000-0000-000000000009";

  it("emits job_id when a job detail modal is open", () => {
    const ctx = buildCareerPageContext({ jobId: JOB_ID });
    expect(ctx.job_id).toBe(JOB_ID);
  });

  it("omits job_id when no modal is open (null / undefined)", () => {
    expect(buildCareerPageContext({ jobId: null }).job_id).toBeUndefined();
    expect(buildCareerPageContext({}).job_id).toBeUndefined();
  });
});
