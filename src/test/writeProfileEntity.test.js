// CV Studio write-through — the shared write-mediation layer (#592 Requirement 2).
// The two tests Eli named as acceptance:
//   1. dual-path EQUIVALENCE: the client wrapper and the edge path produce
//      IDENTICAL audit + snapshot + concurrency behavior for the same input (a
//      write that behaves differently by path is the next dual-source bug).
//   2. the summary-loss UNDO story: edit summary -> lands in profiles.summary ->
//      undo -> prior value returns -> BOTH writes are audited.
import { describe, it, expect } from "vitest";
import { writeProfileEntity, undoProfileWrite } from "@/lib/writeProfileEntity";
import { createSerializedWriter } from "@/lib/serializedWriteThrough";
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
          if (op.cols.trim() === "*")
            return { data: { ...found }, error: null };
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

// The CV RED write-layer fix. The Studio's source row can be drifted LEANER than
// the editor's cv_data (the master build enriches cv_data beyond the source
// row), so baselining the undo token / destructive-confirm on the SOURCE READ
// mints an undo token that would restore the stale leaner source (silent data
// loss) and mis-classifies deletions. priorOverride baselines on the editor's
// pre-edit value (what the user saw) instead. Plus per-key serialization so two
// commits to one field can't race and last-write-wins can't clobber the edit.
describe("CV RED write-layer fix (drift baseline + serialization)", () => {
  const drifted = () =>
    mockSupabase({
      // Source row is drifted EMPTY while the editor holds ["A", "B"] in cv_data.
      experiences: [{ id: "e1", user_id: "u1", bullets: [], updated_at: "v1" }],
    });

  it("undo restores the editor's pre-edit cv_data value, NOT the drifted source", async () => {
    const supabase = drifted();
    const edit = await writeProfileEntity(supabase, {
      userId: "u1",
      field: "exp_bullets",
      entityId: "e1",
      newValue: ["A (edited)", "B"],
      priorOverride: ["A", "B"], // what the user saw (pre-edit cv_data)
    });
    expect(edit.ok).toBe(true);
    // The undo token carries the pre-edit cv_data, never the drifted-empty read.
    expect(edit.undo_token.prior).toEqual(["A", "B"]);
    expect(supabase._tables.experiences[0].bullets).toEqual([
      "A (edited)",
      "B",
    ]);

    const undo = await undoProfileWrite(supabase, {
      userId: "u1",
      undoToken: edit.undo_token,
    });
    expect(undo.ok).toBe(true);
    // Undo lands the pre-edit cv_data value, not the stale [] the source held.
    expect(supabase._tables.experiences[0].bullets).toEqual(["A", "B"]);
  });

  it("never mints an empty-prior undo token off a drifted source", async () => {
    const supabase = drifted();
    const edit = await writeProfileEntity(supabase, {
      userId: "u1",
      field: "exp_bullets",
      entityId: "e1",
      newValue: ["A (edited)", "B"],
      priorOverride: ["A", "B"],
    });
    // If this were [] a fired undo would wipe the row -> the exact silent loss.
    expect(edit.undo_token.prior).not.toEqual([]);
    expect(edit.undo_token.prior).toEqual(["A", "B"]);

    // Contrast: WITHOUT priorOverride the token carries the empty source read -
    // the pre-fix hazard this override exists to close.
    const bare = drifted();
    const editBare = await writeProfileEntity(bare, {
      userId: "u1",
      field: "exp_bullets",
      entityId: "e1",
      newValue: ["A (edited)", "B"],
    });
    expect(editBare.undo_token.prior).toEqual([]);
  });

  it("destructive-confirm fires relative to what the user saw, not the source", async () => {
    const supabase = drifted();
    // User clears both visible bullets. Against the empty source this looks
    // additive ([] -> []); against priorOverride it is a removal -> confirm.
    const cleared = await writeProfileEntity(supabase, {
      userId: "u1",
      field: "exp_bullets",
      entityId: "e1",
      newValue: [],
      priorOverride: ["A", "B"],
    });
    expect(cleared.needsConfirm).toBe(true);
    expect(cleared.prior_value).toEqual(["A", "B"]);
    // Nothing was written (it awaits confirmation).
    expect(supabase._tables.experiences[0].bullets).toEqual([]);
  });

  it("a concurrent double-write to one field serializes and cannot clobber the edit", async () => {
    const run = createSerializedWriter();
    const db = { value: null };
    const order = [];
    let active = 0;
    let maxActive = 0;
    const task = (label, val, delay) => async () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((r) => setTimeout(r, delay));
      db.value = val;
      order.push(label);
      active -= 1;
      return { label };
    };
    // Same key, fired without awaiting: a stale re-commit then the user's newest
    // edit. The stale one (superseded) must be skipped, the edit must win.
    const p1 = run("exp_bullets:e1", task("stale", ["orig"], 20));
    const p2 = run("exp_bullets:e1", task("user-edit", ["edited"], 5));
    const [r1] = await Promise.all([p1, p2]);
    expect(maxActive).toBe(1); // never overlapped (no concurrent prior-read race)
    expect(r1).toEqual({ skipped: true }); // stale write coalesced away
    expect(order).toEqual(["user-edit"]); // only the edit touched the DB
    expect(db.value).toEqual(["edited"]); // and it is the final value
  });

  it("sequential writes to one field each apply (coalescing never eats a real edit)", async () => {
    const run = createSerializedWriter();
    const order = [];
    await run("k", async () => order.push("first"));
    await run("k", async () => order.push("second"));
    expect(order).toEqual(["first", "second"]);
  });

  it("different fields/entities run independently (keys don't block each other)", async () => {
    const run = createSerializedWriter();
    let bStarted = false;
    const a = run("exp_bullets:e1", async () => {
      await new Promise((r) => setTimeout(r, 20));
      return "a-done";
    });
    const b = run("summary:profile", async () => {
      bStarted = true;
      return "b-done";
    });
    await b;
    expect(bStarted).toBe(true); // b did not wait on a's unrelated key
    await a;
  });
});
