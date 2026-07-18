// Shared write-mediation core (CV Studio Option-A write-through, #592 Requirement 2).
//
// This is the SINGLE decision-maker both physical write entry points delegate to:
//   - the client wrapper  src/lib/writeProfileEntity.js  (human Studio writes)
//   - the edge function   supabase/functions/write-profile-entity  (coach/LLM writes)
//
// Everything that must be IDENTICAL regardless of path lives here — the field
// routing, the audit-row shape, the concurrency decision, and the destructive
// classification. A write that audits/snapshots/concurrency-checks differently by
// path is the exact dual-source bug this arc exists to kill, so the two wrappers
// own only their environment-specific parts (which DB client, whether anti-fab
// runs) and call THIS for every decision. Kept pure + isomorphic (no Deno or
// browser APIs) so both a Deno edge function and a Vite browser bundle import it.

export type EntityType = "profile" | "experience" | "education";
export type WriteSource = "studio" | "coach";

// A route maps a logical CV field to its source-of-truth destination. `scope`
// distinguishes the single profile row (entity_id = the user) from a specific
// experience/education row (entity_id = that row's id). `content` marks
// content-bearing fields: anti-fab enforcement applies to them when the writer is
// an LLM, and honors/awards additionally stay deterministic-from-stored.
export interface FieldRoute {
  entity: EntityType;
  column: string;
  content: boolean;
  scope: "profile" | "row";
}

export const FIELD_ROUTES: Record<string, FieldRoute> = {
  // profile-scoped (one row per user)
  summary: { entity: "profile", column: "summary", content: true, scope: "profile" },
  headline: { entity: "profile", column: "headline", content: false, scope: "profile" },
  full_name: { entity: "profile", column: "full_name", content: false, scope: "profile" },
  location: { entity: "profile", column: "location", content: false, scope: "profile" },
  linkedin: { entity: "profile", column: "linkedin_url", content: false, scope: "profile" },
  phone: { entity: "profile", column: "phone_number", content: false, scope: "profile" },
  languages: { entity: "profile", column: "languages", content: false, scope: "profile" },
  skills: { entity: "profile", column: "skills", content: false, scope: "profile" },
  // experience-row-scoped
  exp_title: { entity: "experience", column: "title", content: false, scope: "row" },
  exp_company: { entity: "experience", column: "company", content: false, scope: "row" },
  exp_bullets: { entity: "experience", column: "bullets", content: true, scope: "row" },
  exp_awards: { entity: "experience", column: "awards", content: true, scope: "row" },
  // education-row-scoped
  edu_institution: { entity: "education", column: "institution", content: false, scope: "row" },
  edu_degree: { entity: "education", column: "degree_type", content: false, scope: "row" },
  edu_field: { entity: "education", column: "field_of_study", content: false, scope: "row" },
  edu_honors: { entity: "education", column: "honors", content: true, scope: "row" },
};

// LOUD EXCEPTIONS — deliberately absent from FIELD_ROUTES so a write is never a
// silent no-op (the exact bug class this arc kills). The caller must route these
// to their stated resolution, never a silent drop:
//   - dates: cv_data holds free-text strings, source rows hold structured
//     start_date/end_date; parsing back is lossy (the "never fabricate a month"
//     onboarding rule). Master dates are READ-ONLY-FROM-SOURCE this PR, with a UI
//     pointer to edit them in the profile; a structured date affordance on the
//     Studio is the named resolution on the design-port work list.
//   - email: no profiles column (auth-owned); not a profile write.
export const LOUD_EXCEPTION_FIELDS = ["dates", "email"] as const;

export function routeFor(field: string): FieldRoute | null {
  return Object.prototype.hasOwnProperty.call(FIELD_ROUTES, field)
    ? FIELD_ROUTES[field]
    : null;
}

export function isContentField(field: string): boolean {
  return routeFor(field)?.content ?? false;
}

// The audit row written to profile_edits for EVERY mediated write. One builder so
// the shape can never drift between the client and edge paths. entity_id is null
// for profile-scoped fields (the "row" is the user's own profile).
export interface AuditInput {
  user_id: string;
  field: string;
  entity_id: string | null;
  prior_value: unknown;
  new_value: unknown;
  source: WriteSource;
}
export interface ProfileEditRow {
  user_id: string;
  entity_type: EntityType;
  entity_id: string | null;
  field: string;
  prior_value: unknown;
  new_value: unknown;
  source: WriteSource;
}
export function buildAuditRow(input: AuditInput): ProfileEditRow {
  const route = routeFor(input.field);
  if (!route) throw new Error(`write-mediation: no route for field "${input.field}"`);
  return {
    user_id: input.user_id,
    entity_type: route.entity,
    entity_id: route.scope === "profile" ? null : input.entity_id,
    field: input.field,
    prior_value: input.prior_value ?? null,
    new_value: input.new_value ?? null,
    source: input.source,
  };
}

// Optimistic concurrency (Requirement 4, "never a silent clobber"). The writer
// carries the updated_at it loaded; the write proceeds only if the row has not
// changed since. A null base version means "first write / caller did not load a
// version" and is accepted (fail-open on absence, never a silent overwrite of a
// KNOWN-newer row). Equality is string-compared on the ISO timestamp the DB
// returns, so both paths decide identically without date parsing.
export type ConcurrencyDecision = "ok" | "conflict";
export function concurrencyDecision(
  baseVersion: string | null | undefined,
  currentVersion: string | null | undefined,
): ConcurrencyDecision {
  if (baseVersion == null) return "ok";
  if (currentVersion == null) return "ok";
  return String(baseVersion) === String(currentVersion) ? "ok" : "conflict";
}

// A write is destructive (needs confirm-on-destructive, Requirement 2b) when it
// REMOVES committed content: a delete (new value empty on a non-empty prior) or
// an array write that drops items. Pure structural edits (retitle, relocate) and
// additive array writes are not destructive. Same rule both paths.
export function isDestructive(prior: unknown, next: unknown): boolean {
  const priorEmpty = isEmptyValue(prior);
  const nextEmpty = isEmptyValue(next);
  if (!priorEmpty && nextEmpty) return true; // clear/delete
  if (Array.isArray(prior) && Array.isArray(next)) {
    return next.length < prior.length; // array shrink = removal
  }
  return false;
}

function isEmptyValue(v: unknown): boolean {
  if (v == null) return true;
  if (typeof v === "string") return v.trim() === "";
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

export const TABLE: Record<EntityType, string> = {
  profile: "profiles",
  experience: "experiences",
  education: "education",
};

// The injected data interface. The client wrapper backs it with the browser
// supabase client (RLS-scoped to the user); the edge function backs it with the
// service-role client + the anti-fab gate. runMediatedWrite calls ONLY these, so
// the read/concurrency/destructive/audit ALGORITHM is identical across paths and
// only the backing store (and whether gateContent is present) differs.
export interface ReadResult {
  found: boolean;
  value?: unknown;
  version?: string | null;
  error?: string;
}
export interface WriteDb {
  readRow(table: string, rowId: string, userId: string, entity: EntityType, column: string): Promise<ReadResult>;
  writeRow(table: string, rowId: string, userId: string, entity: EntityType, column: string, value: unknown): Promise<{ error?: string }>;
  insertAudit(row: ProfileEditRow): Promise<{ error?: string }>;
  // Content gate (anti-fab), injected ONLY on the edge/LLM path. Absent on the
  // human client path — a user editing their OWN profile is the author, not a
  // fabricator, so anti-fab must not block them. This asymmetry is deliberate and
  // is the ONE thing allowed to differ between paths; audit/snapshot/concurrency
  // may not.
  gateContent?(field: string, value: unknown, route: FieldRoute): Promise<{ value: unknown; rejected: boolean; reason?: string }>;
}

export interface UndoToken {
  field: string;
  entityId: string | null;
  prior: unknown;
}
export interface MediateInput {
  userId: string;
  field: string;
  entityId: string | null;
  newValue: unknown;
  baseVersion?: string | null;
  source: WriteSource;
  confirmed?: boolean;
}
export interface MediateResult {
  ok: boolean;
  error?: string;
  conflict?: boolean;
  needsConfirm?: boolean;
  prior_value?: unknown;
  new_value?: unknown;
  current_value?: unknown;
  current_version?: string | null;
  undo_token?: UndoToken;
  audit_ok?: boolean;
}

// The one write algorithm both entry points run. Order is load-bearing: read
// (snapshot + version) -> concurrency -> content gate -> destructive-confirm ->
// write -> audit. Both paths produce the SAME audit row and the SAME
// concurrency/destructive decisions for the same input, because both run THIS.
export async function runMediatedWrite(db: WriteDb, input: MediateInput): Promise<MediateResult> {
  const route = routeFor(input.field);
  if (!route)
    return { ok: false, error: `No write route for field "${input.field}" (loud exception or unknown).` };
  const table = TABLE[route.entity];
  const rowId = route.scope === "profile" ? input.userId : input.entityId;
  if (!rowId) return { ok: false, error: `Missing entity id for "${input.field}".` };

  const read = await db.readRow(table, rowId, input.userId, route.entity, route.column);
  if (read.error) return { ok: false, error: read.error };
  if (!read.found) return { ok: false, error: `Row not found for "${input.field}".` };
  const prior = read.value;

  if (concurrencyDecision(input.baseVersion, read.version ?? null) === "conflict")
    return {
      ok: false,
      conflict: true,
      error: "This changed since you started editing.",
      current_value: prior,
      current_version: read.version ?? null,
    };

  let valueToWrite = input.newValue;
  if (route.content && db.gateContent) {
    const gate = await db.gateContent(input.field, input.newValue, route);
    if (gate.rejected)
      return { ok: false, error: gate.reason || "Content rejected by the anti-fabrication gate." };
    valueToWrite = gate.value;
  }

  if (!input.confirmed && isDestructive(prior, valueToWrite))
    return { ok: false, needsConfirm: true, prior_value: prior, new_value: valueToWrite };

  const w = await db.writeRow(table, rowId, input.userId, route.entity, route.column, valueToWrite);
  if (w.error) return { ok: false, error: w.error };

  const auditRow = buildAuditRow({
    user_id: input.userId,
    field: input.field,
    entity_id: route.scope === "profile" ? null : rowId,
    prior_value: prior,
    new_value: valueToWrite,
    source: input.source,
  });
  const a = await db.insertAudit(auditRow);

  return {
    ok: true,
    undo_token: { field: input.field, entityId: route.scope === "profile" ? null : rowId, prior },
    audit_ok: !a.error,
    // Audit failure never fails the write (write already committed) but is NEVER
    // silent — the caller surfaces it. Client audit is best-effort by design
    // (migration trust boundary); the edge/LLM path treats an audit failure as a
    // hard error before enabling coach writes (rule 6).
    error: a.error ? `Write succeeded but the audit record failed: ${a.error}` : undefined,
  };
}

