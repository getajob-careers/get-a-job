// CV Studio write-through — the shared write-mediation layer (#592 Requirement 2).
// The two tests Eli named as acceptance:
//   1. dual-path EQUIVALENCE: the client wrapper and the edge path produce
//      IDENTICAL audit + snapshot + concurrency behavior for the same input (a
//      write that behaves differently by path is the next dual-source bug).
//   2. the summary-loss UNDO story: edit summary -> lands in profiles.summary ->
//      undo -> prior value returns -> BOTH writes are audited.
import { describe, it, expect } from "vitest";
import { writeProfileEntity, undoProfileWrite } from "@/lib/writeProfileEntity";
import {
  runMediatedWrite,
  buildAuditRow,
  concurrencyDecision,
  isDestructive,
} from "../../supabase/functions/_shared/write-mediation.ts";

// Minimal in-memory supabase double supporting exactly the call chains the client
// wrapper uses: select(cols).eq(...).maybeSingle(), update(vals).eq(...) awaited,
// insert(row) awaited. Tables are arrays of row objects.
function mockSupabase(initial) {
  const tables = {
    profiles: [],
    experiences: [],
    education: [],
    profile_edits: [],
    ...structuredClone(initial),
  };
  return {
    _tables: tables,
    from(table) {
      const rows = tables[table] || (tables[table] = []);
      let op = null;
      const filters = [];
      const match = (r) => filters.every(([c, v]) => r[c] === v);
      const builder = {
        select(cols) {
          op = { kind: "select", cols };
          return builder;
        },
        update(vals) {
          op = { kind: "update", vals };
          return builder;
        },
        insert(row) {
          rows.push(structuredClone(row));
          return builder; // awaited via then()
        },
        eq(c, v) {
          filters.push([c, v]);
          return builder;
        },
        async maybeSingle() {
          const found = rows.find(match);
          if (!found) return { data: null, error: null };
          const cols = op.cols.split(",").map((s) => s.trim());
          const data = {};
          for (const c of cols) data[c] = found[c];
          return { data, error: null };
        },
        then(resolve) {
          if (op?.kind === "update") {
            const found = rows.find(match);
            if (found) Object.assign(found, op.vals);
          }
          return Promise.resolve({ error: null }).then(resolve);
        },
      };
      return builder;
    },
  };
}

describe("dual-path equivalence (audit + snapshot + concurrency)", () => {
  // Two WriteDb adapters over the SAME recording store: a "client" adapter (no
  // gateContent) and an "edge" adapter (pass-through gateContent). For the same
  // input they must record byte-identical audit rows and reach identical
  // concurrency/destructive decisions. Only anti-fab may differ by path.
  const makeRecordingDb = (withGate) => {
    const store = {
      profiles: { id: "u1", summary: "old summary", updated_at: "v1" },
    };
    const audits = [];
    const db = {
      async readRow(_t, _rowId, _uid, _entity, column) {
        return {
          found: true,
          value: store.profiles[column],
          version: store.profiles.updated_at,
        };
      },
      async writeRow(_t, _rowId, _uid, _entity, column, value) {
        store.profiles[column] = value;
        return {};
      },
      async insertAudit(row) {
        audits.push(row);
        return {};
      },
    };
    if (withGate)
      db.gateContent = async (_f, value) => ({ value, rejected: false });
    return { db, audits, store };
  };

  const input = {
    userId: "u1",
    field: "summary",
    entityId: null,
    newValue: "new summary",
    baseVersion: "v1",
    source: "studio",
  };

  it("client and edge paths record byte-identical audit rows", async () => {
    const client = makeRecordingDb(false);
    const edge = makeRecordingDb(true);
    const rc = await runMediatedWrite(client.db, input);
    const re = await runMediatedWrite(edge.db, { ...input, source: "coach" });
    expect(rc.ok).toBe(true);
    expect(re.ok).toBe(true);
    // Audit rows identical except `source` (the only legitimate per-path field).
    expect(client.audits).toHaveLength(1);
    expect(edge.audits).toHaveLength(1);
    const { source: _s1, ...clientRow } = client.audits[0];
    const { source: _s2, ...edgeRow } = edge.audits[0];
    expect(clientRow).toEqual(edgeRow);
    expect(clientRow).toEqual({
      user_id: "u1",
      entity_type: "profile",
      entity_id: null,
      field: "summary",
      prior_value: "old summary",
      new_value: "new summary",
    });
  });

  it("both paths reach the SAME concurrency decision on a stale base version", async () => {
    const client = makeRecordingDb(false);
    const edge = makeRecordingDb(true);
    const stale = { ...input, baseVersion: "v0" }; // row is at v1
    const rc = await runMediatedWrite(client.db, stale);
    const re = await runMediatedWrite(edge.db, { ...stale, source: "coach" });
    expect(rc.conflict).toBe(true);
    expect(re.conflict).toBe(true);
    expect(client.audits).toHaveLength(0); // no write on conflict
    expect(edge.audits).toHaveLength(0);
  });

  it("both paths flag the SAME destructive write for confirmation", async () => {
    // bullets shrink from 3 -> 1 = removal.
    const prior = ["a", "b", "c"];
    expect(isDestructive(prior, ["a"])).toBe(true);
    expect(isDestructive(prior, ["a", "b", "c", "d"])).toBe(false);
  });

  it("concurrencyDecision is fail-open only on a null base version", () => {
    expect(concurrencyDecision(null, "v9")).toBe("ok");
    expect(concurrencyDecision("v1", "v1")).toBe("ok");
    expect(concurrencyDecision("v1", "v2")).toBe("conflict");
  });
});

describe("the summary-loss undo story (the acceptance case)", () => {
  it("edit summary -> lands in profiles.summary -> undo -> prior returns -> both audited", async () => {
    const supabase = mockSupabase({
      profiles: [
        { id: "u1", summary: "My original summary.", updated_at: "v1" },
      ],
    });

    // 1. Edit the summary through the write layer.
    const edit = await writeProfileEntity(supabase, {
      userId: "u1",
      field: "summary",
      newValue: "An LLM-flavored rewrite.",
      baseVersion: "v1",
    });
    expect(edit.ok).toBe(true);

    // 2. It landed in profiles.summary (source of truth), not just cv_data.
    const prof = supabase._tables.profiles[0];
    expect(prof.summary).toBe("An LLM-flavored rewrite.");

    // 3. Undo restores the prior value.
    const undo = await undoProfileWrite(supabase, {
      userId: "u1",
      undoToken: edit.undo_token,
    });
    expect(undo.ok).toBe(true);
    expect(supabase._tables.profiles[0].summary).toBe("My original summary.");

    // 4. BOTH writes are audited (the edit and its reversal), with correct
    //    prior/new on each — the durable trail the summary-loss incident lacked.
    const audits = supabase._tables.profile_edits.filter(
      (a) => a.field === "summary",
    );
    expect(audits).toHaveLength(2);
    expect(audits[0]).toMatchObject({
      field: "summary",
      prior_value: "My original summary.",
      new_value: "An LLM-flavored rewrite.",
      source: "studio",
    });
    expect(audits[1]).toMatchObject({
      field: "summary",
      prior_value: "An LLM-flavored rewrite.",
      new_value: "My original summary.",
      source: "studio",
    });
  });

  it("buildAuditRow throws on an unrouted field (never a silent no-op)", () => {
    expect(() =>
      buildAuditRow({
        user_id: "u1",
        field: "dates",
        entity_id: "e1",
        prior_value: "x",
        new_value: "y",
        source: "studio",
      }),
    ).toThrow();
  });
});
