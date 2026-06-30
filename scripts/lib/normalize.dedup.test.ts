// Tests for dedupByExternalId — the guard against the JoVE/Workable failure
// where a board lists the same external_id twice and the batch upsert
// (ON CONFLICT ats_source,external_id) is rejected by Postgres with
// "ON CONFLICT DO UPDATE command cannot affect row a second time", losing
// every IL role for that company.

import { describe, it, expect } from "vitest";
import { dedupByExternalId } from "./normalize";
import type { NormalizedJob } from "./normalize";

const job = (external_id: string, title: string): NormalizedJob =>
  ({ external_id, title }) as NormalizedJob;

describe("dedupByExternalId", () => {
  it("collapses duplicate external_ids and keeps the last occurrence (fresher copy wins)", () => {
    const rows = [job("a", "First A"), job("b", "B"), job("a", "Updated A")];
    const out = dedupByExternalId(rows);
    expect(out).toHaveLength(2);
    expect(out.map((r) => r.external_id).sort()).toEqual(["a", "b"]);
    expect(out.find((r) => r.external_id === "a")!.title).toBe("Updated A");
  });

  it("is a no-op when every external_id is unique", () => {
    const rows = [job("1", "x"), job("2", "y"), job("3", "z")];
    expect(dedupByExternalId(rows)).toHaveLength(3);
  });

  it("the JoVE case: same external_id listed twice yields one row, so the upsert can no longer hit the conflict target twice", () => {
    const rows = [job("J1", "Role"), job("J1", "Role"), job("J2", "Other")];
    const out = dedupByExternalId(rows);
    expect(out).toHaveLength(2);
    expect(out.filter((r) => r.external_id === "J1")).toHaveLength(1);
  });

  it("collapses empty external_ids together (consistent with the unique constraint) and handles empty input", () => {
    expect(dedupByExternalId([])).toEqual([]);
    const out = dedupByExternalId([job("", "no id 1"), job("", "no id 2")]);
    expect(out).toHaveLength(1);
  });
});
