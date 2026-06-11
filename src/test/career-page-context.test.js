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
    expect(
      buildCareerPageContext({ selectedTrack: "track_1" }),
    ).toEqual({ page: "Career", track: "track_1" });
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
    const before = buildCareerPageContext({ selectedTrack: "track_1", roleId: ROLE_ID });
    const after = buildCareerPageContext({ selectedTrack: "track_3", roleId: ROLE_ID });
    expect(before.track).toBe("track_1");
    expect(after.track).toBe("track_3");
    expect(before).not.toBe(after);
  });
});
