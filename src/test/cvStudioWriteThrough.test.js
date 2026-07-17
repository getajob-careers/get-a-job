// CV Studio Option-A write-through spine (#592). Locks the pure logic the Studio
// wiring depends on: skills bucket-preservation (Eli's named acceptance test),
// languages proficiency preservation, experience reorder (display_order + audit
// + undo), and the education_id stamp that lets an edu edit attribute to its row.
import { describe, it, expect } from "vitest";
import {
  masterSkillsFlat,
  rebuildLanguages,
  buildMasterCvData,
} from "@/lib/cvDataAdapter";
import { reorderExperiences } from "@/lib/writeProfileEntity";

describe("masterSkillsFlat — editing one bucket never drops another", () => {
  it("merges the edited domain with the preserved tools + technical buckets", () => {
    const flat = masterSkillsFlat({
      domain: ["Sales", "Marketing"],
      tools: ["Figma", "Notion"],
      technical: ["SQL"],
    });
    expect(flat).toEqual(["Sales", "Marketing", "Figma", "Notion", "SQL"]);
  });

  it("editing bucket A (domain) does not drop bucket B (tools/technical)", () => {
    // The user removes "Marketing" from the domain line. Tools + technical MUST
    // survive - the whole reason the write merges rather than overwrites.
    const flat = masterSkillsFlat({
      domain: ["Sales"], // Marketing removed
      tools: ["Figma", "Notion"],
      technical: ["SQL"],
    });
    expect(flat).toContain("Figma");
    expect(flat).toContain("Notion");
    expect(flat).toContain("SQL");
    expect(flat).not.toContain("Marketing");
  });

  it("dedups case-insensitively, first-seen casing wins, blanks dropped", () => {
    const flat = masterSkillsFlat({
      domain: ["SQL", "  ", "Sales"],
      tools: ["sql"], // dup of SQL (case-insensitive)
      technical: ["Sales "], // dup of Sales (trim)
    });
    expect(flat).toEqual(["SQL", "Sales"]);
  });

  it("tolerates missing buckets", () => {
    expect(masterSkillsFlat({ domain: ["A"] })).toEqual(["A"]);
    expect(masterSkillsFlat({})).toEqual([]);
  });
});

describe("rebuildLanguages — names edit preserves stored proficiency", () => {
  it("keeps each matched language's proficiency; new names become bare strings", () => {
    const out = rebuildLanguages(
      ["English", "French"],
      [
        { language: "English", proficiency: "Native" },
        { language: "Hebrew", proficiency: "Fluent" },
      ],
    );
    expect(out).toEqual([
      { language: "English", proficiency: "Native" },
      "French",
    ]);
  });
});

describe("buildMasterCvData — education_id stamp (enables edu write-through)", () => {
  it("stamps education_id from the source row id, mirroring experience_id", () => {
    const master = buildMasterCvData(
      { full_name: "T", skills: [] },
      [],
      [
        {
          id: "edu-1",
          institution: "Reichman University",
          degree_type: "BA",
          field_of_study: "Business",
          start_date: "2023",
          is_current: true,
        },
      ],
    );
    expect(master.education[0].education_id).toBe("edu-1");
  });

  it("omits education_id when the source row has no id (older masters)", () => {
    const master = buildMasterCvData(
      { full_name: "T", skills: [] },
      [],
      [{ institution: "X", degree_type: "BA", field_of_study: "Y" }],
    );
    expect(master.education[0].education_id).toBeUndefined();
  });
});

// Minimal supabase double for the reorder path: .from(t).update(v).eq().eq()
// awaited, and .from("profile_edits").insert(row) awaited.
function mockReorderDb(experiences) {
  const tables = { experiences, profile_edits: [] };
  return {
    _tables: tables,
    from(table) {
      const rows = tables[table];
      let op = null;
      const filters = [];
      const match = (r) => filters.every(([c, v]) => r[c] === v);
      const b = {
        update(vals) {
          op = { kind: "update", vals };
          return b;
        },
        insert(row) {
          rows.push(structuredClone(row));
          return b;
        },
        eq(c, v) {
          filters.push([c, v]);
          return b;
        },
        then(resolve) {
          if (op?.kind === "update")
            for (const r of rows) if (match(r)) Object.assign(r, op.vals);
          return Promise.resolve({ error: null }).then(resolve);
        },
      };
      return b;
    },
  };
}

describe("reorderExperiences — display_order write + audit + undo", () => {
  const seed = () => [
    { id: "a", user_id: "u1", display_order: null },
    { id: "b", user_id: "u1", display_order: null },
    { id: "c", user_id: "u1", display_order: null },
  ];

  it("writes display_order = position for each row in the new order", async () => {
    const db = mockReorderDb(seed());
    const res = await reorderExperiences(db, {
      userId: "u1",
      orderedIds: ["c", "a", "b"],
      priorOrderedIds: ["a", "b", "c"],
    });
    expect(res.ok).toBe(true);
    const byId = Object.fromEntries(
      db._tables.experiences.map((r) => [r.id, r.display_order]),
    );
    expect(byId).toEqual({ c: 0, a: 1, b: 2 });
  });

  it("records exactly one audit row capturing prior + new id order", async () => {
    const db = mockReorderDb(seed());
    await reorderExperiences(db, {
      userId: "u1",
      orderedIds: ["c", "a", "b"],
      priorOrderedIds: ["a", "b", "c"],
    });
    const audits = db._tables.profile_edits;
    expect(audits).toHaveLength(1);
    expect(audits[0]).toMatchObject({
      user_id: "u1",
      entity_type: "experience",
      field: "display_order",
      prior_value: ["a", "b", "c"],
      new_value: ["c", "a", "b"],
      source: "studio",
    });
  });

  it("undo (re-apply prior order) restores the original ordering", async () => {
    const db = mockReorderDb(seed());
    await reorderExperiences(db, {
      userId: "u1",
      orderedIds: ["c", "a", "b"],
      priorOrderedIds: ["a", "b", "c"],
    });
    // The undo re-applies the prior order through the same helper.
    await reorderExperiences(db, {
      userId: "u1",
      orderedIds: ["a", "b", "c"],
      priorOrderedIds: ["c", "a", "b"],
    });
    const byId = Object.fromEntries(
      db._tables.experiences.map((r) => [r.id, r.display_order]),
    );
    expect(byId).toEqual({ a: 0, b: 1, c: 2 });
    expect(db._tables.profile_edits).toHaveLength(2); // both the edit and its reversal audited
  });

  it("rejects an empty reorder rather than a silent no-op", async () => {
    const db = mockReorderDb(seed());
    const res = await reorderExperiences(db, { userId: "u1", orderedIds: [] });
    expect(res.ok).toBe(false);
  });
});
