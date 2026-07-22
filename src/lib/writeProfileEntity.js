// Client entry point for CV Studio Option-A write-through (#592 Requirement 2).
//
// Thin adapter: it backs the shared WriteDb interface with the browser supabase
// client and delegates EVERY decision (routing, concurrency, destructive-confirm,
// audit shape) to runMediatedWrite in _shared/write-mediation.ts. It owns nothing
// the edge path doesn't also own except "which client" — so audit/snapshot/
// concurrency behavior is identical across paths by construction (locked by the
// equivalence test). No anti-fab gate here: a user editing their OWN profile is
// the author, not a fabricator (the gate is the edge/LLM path's concern).
import {
  runMediatedWrite,
  routeFor,
  TABLE,
} from "../../supabase/functions/_shared/write-mediation.ts";

// Row entities the Studio can add/delete (whole rows, not single fields).
const ROW_ENTITIES = new Set(["experience", "education"]);

// Build the supabase-backed WriteDb. Profiles are keyed by id = userId (1:1 with
// auth.users); experiences/education are keyed by row id AND user_id (defense in
// depth alongside RLS).
function supabaseDb(supabase) {
  const ownershipEq = (q, entity, userId) =>
    entity === "profile" ? q : q.eq("user_id", userId);
  return {
    async readRow(table, rowId, userId, entity, column) {
      // select("*") not "${column}, updated_at": certifications / projects have
      // NO updated_at column (only profiles/experiences/education got it in the
      // foundation migration), so naming it would error the read and kill the
      // write. "*" reads the column + updated_at where it exists (version=null
      // otherwise, which optimistic concurrency treats as fail-open).
      let q = supabase.from(table).select("*").eq("id", rowId);
      q = ownershipEq(q, entity, userId);
      const { data, error } = await q.maybeSingle();
      if (error) return { found: false, error: error.message };
      if (!data) return { found: false };
      return {
        found: true,
        value: data[column],
        version: data.updated_at ?? null,
      };
    },
    async writeRow(table, rowId, userId, entity, column, value) {
      let q = supabase
        .from(table)
        .update({ [column]: value })
        .eq("id", rowId);
      q = ownershipEq(q, entity, userId);
      const { error } = await q;
      return { error: error?.message };
    },
    async insertAudit(row) {
      const { error } = await supabase.from("profile_edits").insert(row);
      return { error: error?.message };
    },
    // no gateContent: human writes are authored, not gated.
  };
}

// Write one Studio field through to its source row. Returns the shared
// MediateResult: { ok, error, conflict, needsConfirm, undo_token, audit_ok, ... }.
// Callers MUST surface error / conflict / needsConfirm — never a silent no-op.
export async function writeProfileEntity(supabase, opts) {
  if (!routeFor(opts.field))
    return {
      ok: false,
      error: `"${opts.field}" has no write route (it is a loud exception like dates/email, or unknown) - route it to its stated resolution, do not drop it.`,
    };
  return runMediatedWrite(supabaseDb(supabase), {
    userId: opts.userId,
    field: opts.field,
    entityId: opts.entityId ?? null,
    newValue: opts.newValue,
    baseVersion: opts.baseVersion ?? null,
    source: opts.source ?? "studio",
    confirmed: opts.confirmed ?? false,
    // Editor's pre-edit value (what the user saw), when the caller supplies it.
    // Kept `undefined` when absent so the mediation falls back to the source read.
    priorOverride: opts.priorOverride,
  });
}

// Reorder experiences (Studio drag-reorder write-through). A reorder is a
// MULTI-ROW structural write (it renumbers every experience's display_order), so
// it does not fit the single-field runMediatedWrite shape - there is no content
// to anti-fab-gate and no single per-field version to concurrency-check. It is a
// distinct, still-audited operation in this same shared layer: it writes
// display_order = position for each row (in the caller's new global order) and
// records ONE profile_edits row for the whole reorder (prior/new id order). Undo
// re-applies the prior order through the same helper.
export async function reorderExperiences(
  supabase,
  { userId, orderedIds, priorOrderedIds = null, source = "studio" },
) {
  if (!userId) return { ok: false, error: "Missing user." };
  const ids = (orderedIds || []).filter(Boolean);
  if (!ids.length) return { ok: false, error: "Nothing to reorder." };
  for (let i = 0; i < ids.length; i++) {
    const { error } = await supabase
      .from("experiences")
      .update({ display_order: i })
      .eq("id", ids[i])
      .eq("user_id", userId); // RLS belt-and-suspenders
    if (error) return { ok: false, error: error.message, writtenUpTo: i };
  }
  const { error: auditErr } = await supabase.from("profile_edits").insert({
    user_id: userId,
    entity_type: "experience",
    entity_id: null,
    field: "display_order",
    prior_value: priorOrderedIds,
    new_value: ids,
    source,
  });
  return {
    ok: true,
    audit_ok: !auditErr,
    error: auditErr
      ? `Reorder saved but the audit record failed: ${auditErr.message}`
      : undefined,
    undo_order: priorOrderedIds,
  };
}

// Add a new experience/education ROW (Studio "add entry"). A row add is a
// multi-field insert, not a single-field write, so it is a distinct audited
// helper (like reorderExperiences). Returns the new row (incl. id) so the caller
// stamps it into the editor model. Undo = deleteProfileRow(the new id).
export async function createProfileRow(
  supabase,
  { userId, entity, values = {}, source = "studio" },
) {
  if (!userId || !ROW_ENTITIES.has(entity))
    return { ok: false, error: "Unsupported entity for add." };
  const { data, error } = await supabase
    .from(TABLE[entity])
    .insert({ ...values, user_id: userId })
    .select("*")
    .single();
  if (error) return { ok: false, error: error.message };
  const { error: auditErr } = await supabase.from("profile_edits").insert({
    user_id: userId,
    entity_type: entity,
    entity_id: data.id,
    field: "create",
    prior_value: null,
    new_value: data,
    source,
  });
  return {
    ok: true,
    id: data.id,
    row: data,
    audit_ok: !auditErr,
    error: auditErr
      ? `Added, but the change history couldn't be recorded: ${auditErr.message}`
      : undefined,
  };
}

// Delete an experience/education ROW (destructive). Snapshots the FULL row
// FIRST so undo can re-insert it exactly - including awards / honors (the S4
// cascade: those feed the CV Honors section and would otherwise be lost).
// Audited (prior_value = the whole row). Returns { snapshot } for undo.
export async function deleteProfileRow(
  supabase,
  { userId, entity, rowId, source = "studio" },
) {
  if (!userId || !ROW_ENTITIES.has(entity) || !rowId)
    return { ok: false, error: "Unsupported delete." };
  const table = TABLE[entity];
  const { data: snapshot, error: readErr } = await supabase
    .from(table)
    .select("*")
    .eq("id", rowId)
    .eq("user_id", userId)
    .maybeSingle();
  if (readErr) return { ok: false, error: readErr.message };
  if (!snapshot) return { ok: false, error: "That entry was already removed." };
  const { error: delErr } = await supabase
    .from(table)
    .delete()
    .eq("id", rowId)
    .eq("user_id", userId);
  if (delErr) return { ok: false, error: delErr.message };
  const { error: auditErr } = await supabase.from("profile_edits").insert({
    user_id: userId,
    entity_type: entity,
    entity_id: rowId,
    field: "delete",
    prior_value: snapshot,
    new_value: null,
    source,
  });
  return {
    ok: true,
    snapshot,
    audit_ok: !auditErr,
    error: auditErr
      ? `Removed, but the change history couldn't be recorded: ${auditErr.message}`
      : undefined,
  };
}

// Re-insert a full-row snapshot (undo of a delete). Re-inserts with the SAME id
// so ordering / references stay valid. Audited.
export async function restoreProfileRow(
  supabase,
  { userId, entity, snapshot, source = "studio" },
) {
  if (!userId || !ROW_ENTITIES.has(entity) || !snapshot?.id)
    return { ok: false, error: "Nothing to restore." };
  const { error } = await supabase.from(TABLE[entity]).insert(snapshot);
  if (error) return { ok: false, error: error.message };
  const { error: auditErr } = await supabase.from("profile_edits").insert({
    user_id: userId,
    entity_type: entity,
    entity_id: snapshot.id,
    field: "restore",
    prior_value: null,
    new_value: snapshot,
    source,
  });
  return { ok: true, audit_ok: !auditErr };
}

// Session-scoped undo (Requirement 1). Restores the prior value captured in the
// write's undo_token via ANOTHER mediated write, so the undo is itself audited
// (both the edit and its reversal land in profile_edits) and re-uses the same
// destructive/concurrency machinery. Restoring a prior value is additive, so it
// is pre-confirmed. Returns the mediate result of the restore.
export async function undoProfileWrite(
  supabase,
  { userId, undoToken, source = "studio" },
) {
  if (!undoToken?.field) return { ok: false, error: "Nothing to undo." };
  return writeProfileEntity(supabase, {
    userId,
    field: undoToken.field,
    entityId: undoToken.entityId,
    newValue: undoToken.prior,
    source,
    confirmed: true,
  });
}
