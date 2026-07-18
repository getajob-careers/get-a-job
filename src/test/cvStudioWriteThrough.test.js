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
import {
  reorderExperiences,
  createProfileRow,
  deleteProfileRow,
  restoreProfileRow,
} from "@/lib/writeProfileEntity";

// Minimal supabase double for the row helpers: insert(row).select("*").single(),
// select("*").eq().eq().maybeSingle(), delete().eq().eq() awaited, and a bare
// insert(row) awaited (audit).
function mockRowDb(initial) {
  const tables = {
    experiences: [],
    education: [],
    profile_edits: [],
    ...initial,
  };
  let idSeq = 0;
  return {
    _tables: tables,
    from(table) {
      const rows = tables[table] || (tables[table] = []);
      let op = null;
      const filters = [];
      let pending = null;
      const match = (r) => filters.every(([c, v]) => r[c] === v);
      const b = {
        insert(row) {
          pending = { ...row };
          if (!("id" in pending)) pending.id = `gen-${++idSeq}`;
          rows.push(pending);
          op = { kind: "insert" };
          return b;
        },
        delete() {
          op = { kind: "delete" };
          return b;
        },
        select() {
          return b;
        },
        eq(c, v) {
          filters.push([c, v]);
          return b;
        },
        async single() {
          return { data: pending, error: null };
        },
        async maybeSingle() {
          const f = rows.find(match);
          return { data: f ? { ...f } : null, error: null };
        },
        then(resolve) {
          if (op?.kind === "delete") {
            const i = rows.findIndex(match);
            if (i >= 0) rows.splice(i, 1);
          }
          return Promise.resolve({ error: null }).then(resolve);
        },
      };
      return b;
    },
  };
}

describe("PR-B: experience/education entry add + delete row helpers", () => {
  it("createProfileRow inserts a row + audits field=create", async () => {
    const db = mockRowDb({ experiences: [] });
    const res = await createProfileRow(db, {
      userId: "u1",
      entity: "experience",
      values: { title: "", company: "" },
    });
    expect(res.ok).toBe(true);
    expect(db._tables.experiences).toHaveLength(1);
    expect(db._tables.experiences[0].user_id).toBe("u1");
    expect(res.id).toBe(db._tables.experiences[0].id);
    expect(db._tables.profile_edits[0]).toMatchObject({
      entity_type: "experience",
      field: "create",
      source: "studio",
    });
  });

  it("deleteProfileRow snapshots the FULL row (awards incl.) then deletes + audits", async () => {
    const db = mockRowDb({
      experiences: [
        {
          id: "e1",
          user_id: "u1",
          title: "Eng",
          awards: ["Dean's List", "MVP"],
        },
      ],
    });
    const res = await deleteProfileRow(db, {
      userId: "u1",
      entity: "experience",
      rowId: "e1",
    });
    expect(res.ok).toBe(true);
    expect(db._tables.experiences).toHaveLength(0); // deleted
    expect(res.snapshot.awards).toEqual(["Dean's List", "MVP"]); // cascade captured
    expect(db._tables.profile_edits[0]).toMatchObject({
      entity_type: "experience",
      field: "delete",
    });
    expect(db._tables.profile_edits[0].prior_value.awards).toEqual([
      "Dean's List",
      "MVP",
    ]);
  });

  it("restoreProfileRow re-inserts the snapshot exactly (awards restored) + audits", async () => {
    const db = mockRowDb({ experiences: [] });
    const snapshot = {
      id: "e1",
      user_id: "u1",
      title: "Eng",
      awards: ["Dean's List"],
    };
    const res = await restoreProfileRow(db, {
      userId: "u1",
      entity: "experience",
      snapshot,
    });
    expect(res.ok).toBe(true);
    expect(db._tables.experiences[0]).toMatchObject({
      id: "e1",
      awards: ["Dean's List"],
    });
    expect(db._tables.profile_edits[0].field).toBe("restore");
  });

  it("rejects add/delete for unsupported entities (e.g. profile)", async () => {
    const db = mockRowDb({});
    expect(
      (await createProfileRow(db, { userId: "u1", entity: "profile" })).ok,
    ).toBe(false);
    expect(
      (
        await deleteProfileRow(db, {
          userId: "u1",
          entity: "certification",
          rowId: "x",
        })
      ).ok,
    ).toBe(false);
  });
});
import { fromCvData, toCvData } from "@/lib/cvDataAdapter";
import {
  routeFor,
  FIELD_ROUTES,
  TABLE,
} from "../../supabase/functions/_shared/write-mediation.ts";

describe("S7: cert/project write-through wiring", () => {
  it("buildMasterCvData stamps certification_id + project_id from source rows", () => {
    const master = buildMasterCvData(
      { full_name: "T", skills: [] },
      [],
      [],
      "e@x.co",
      {
        projects: [
          { id: "proj-1", name: "Sidebar", url: "u", description: "d" },
        ],
        certifications: [{ id: "cert-1", name: "AWS SAA", issuer: "Amazon" }],
      },
    );
    expect(master.projects[0].project_id).toBe("proj-1");
    expect(master.certifications[0].certification_id).toBe("cert-1");
  });

  it("cert/project field routes point at the right table + column", () => {
    expect(routeFor("cert_name")).toMatchObject({
      entity: "certification",
      column: "name",
      scope: "row",
    });
    expect(routeFor("cert_issuer")?.column).toBe("issuer");
    expect(routeFor("cert_date")?.column).toBe("date_earned");
    expect(routeFor("project_name")).toMatchObject({
      entity: "project",
      column: "name",
    });
    expect(routeFor("project_url")?.column).toBe("url");
    expect(TABLE.certification).toBe("certifications");
    expect(TABLE.project).toBe("projects");
    // project BULLETS are cv_data-only: no route (loud exception, never a write).
    expect(routeFor("project_bullets")).toBeNull();
    expect(FIELD_ROUTES.project_bullets).toBeUndefined();
  });

  it("cert/project round-trip preserves the stamped ids through the editor model", () => {
    const cv = {
      certifications: [
        {
          name: "AWS",
          issuer: "Amazon",
          date_earned: "2024",
          certification_id: "cert-1",
        },
      ],
      projects: [
        { name: "Sidebar", url: "u", description: "d", project_id: "proj-1" },
      ],
    };
    const model = fromCvData(cv);
    expect(model.certifications[0].__src.certification_id).toBe("cert-1");
    expect(model.projects[0].__src.project_id).toBe("proj-1");
    const out = toCvData(model);
    expect(out.certifications[0].certification_id).toBe("cert-1");
    expect(out.projects[0].project_id).toBe("proj-1");
    // an edit to the name overlays onto __src, id intact
    model.certifications[0].name = "AWS SAA";
    expect(toCvData(model).certifications[0]).toMatchObject({
      name: "AWS SAA",
      certification_id: "cert-1",
    });
  });
});

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
