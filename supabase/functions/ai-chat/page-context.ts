// Page-context helper for ai-chat (PR-B2). The drawer surface on the
// frontend hands the edge function a `page_context` object describing
// what the user is currently looking at: which route they're on, plus
// the IDs of any entities currently selected (an application, a
// matched role, a job, a company target, a track). The server fetches
// every entity authoritatively by ID under the caller's auth and
// injects structured blocks into the system prompt — mirrors the
// existing TARGET APPLICATION pattern verbatim (same trust model: IDs
// in, scoped fetch, LLM sees only DB-truth content).
//
// Trust model contract (LOCKED):
//   - Client sends route name + UUIDs ONLY. No titles, no entity content.
//   - Server validates the UUIDs match, fetches each entity scoped to
//     auth.uid(), and renders structured prompt blocks from the fetched
//     data. Unknown / foreign IDs silently drop (never errored to the
//     LLM).
//   - If page_context is absent or empty, prompt assembly is byte-
//     identical to today — verified by the `prompt-byte-equivalence` test.

import { stripHtml } from "../_shared/strip-html.ts";

const VALID_PAGES = new Set([
  "Today",
  "Career",
  "Calendar",
  "Internship",
  "Profile",
]);
const VALID_TRACKS = new Set(["track_1", "track_2", "track_3"]);
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// B3 visible-list contract. The client sends the ORDERED ids of the items
// currently rendered on a list surface so the agent can answer "which one on
// this page is best" without guessing. Cap rule (B3): exactly 15 ids per list,
// at most 2 lists per turn. Over-cap keeps the first 15 in render order; `total`
// preserves the original length so the render can note "(+N more on screen)".
const VISIBLE_ITEM_TYPES = new Set([
  "job",
  "role",
  "company_target",
  "application",
]);
const MAX_IDS_PER_LIST = 15;
const MAX_LISTS = 2;

export interface VisibleListInput {
  type: "job" | "role" | "company_target" | "application";
  ids: string[];
  total: number; // original count before the 15-id cap (for the truncation note)
}

export interface PageContextInput {
  page?: string;
  application_id?: string;
  job_id?: string;
  role_id?: string;
  track?: string;
  company_target_id?: string;
  visible_items?: VisibleListInput[];
}

export interface FetchedRole {
  id: string;
  title: string;
  track: string | null;
  readiness_score: number | null;
  goal_alignment_score: number | null;
  matched_skills: string[] | null;
  missing_skills: string[] | null;
}

export interface FetchedJob {
  id: string;
  title: string;
  company_name: string | null;
  location_city: string | null;
  req_skills_core: string[] | null;
  req_skills_nice: string[] | null;
  req_years_min: number | null;
  req_years_max: number | null;
  seniority: string | null;
  description: string | null;
}

export interface FetchedCompanyTarget {
  id: string;
  status: string;
  pitched_role: string | null;
  company_name: string | null;
  company_sector: string | null;
}

// A hydrated visible list: each item is a compact, render-ready row (NO full
// JDs). `shown` is the number rendered (≤15); `total` is what the client sent.
export interface FetchedVisibleItem {
  // Union of the compact per-type fields; only the relevant ones are set.
  title: string;
  company?: string | null;
  track?: string | null;
  readiness_score?: number | null;
  goal_alignment_score?: number | null;
  matched_skills?: string[] | null;
  missing_skills?: string[] | null;
  seniority?: string | null;
  req_years_min?: number | null;
  req_years_max?: number | null;
  req_skills_core?: string[] | null;
  sector?: string | null;
  pitched_role?: string | null;
  status?: string | null;
}

export interface FetchedVisibleList {
  type: "job" | "role" | "company_target" | "application";
  items: FetchedVisibleItem[];
  total: number;
}

export interface FetchedPageContext {
  page?: string;
  track?: string;
  role?: FetchedRole;
  job?: FetchedJob;
  companyTarget?: FetchedCompanyTarget;
  visibleLists?: FetchedVisibleList[];
}

// Whitelist the incoming shape — drops unknown keys, invalid UUIDs,
// invalid enums. Returns null on no usable fields so the caller can
// skip the fetch round-trip entirely on the absent-context path.
export function sanitizePageContext(raw: unknown): PageContextInput | null {
  if (!raw || typeof raw !== "object") return null;
  const ctx = raw as Record<string, unknown>;
  const out: PageContextInput = {};
  if (typeof ctx.page === "string" && VALID_PAGES.has(ctx.page)) {
    out.page = ctx.page;
  }
  if (typeof ctx.track === "string" && VALID_TRACKS.has(ctx.track)) {
    out.track = ctx.track;
  }
  const uuidFields = [
    "application_id",
    "job_id",
    "role_id",
    "company_target_id",
  ] as const;
  for (const key of uuidFields) {
    const v = ctx[key];
    if (typeof v === "string" && UUID_RE.test(v)) {
      out[key] = v;
    }
  }
  // B3 visible_items: array of typed lists. Cap rule — keep at most MAX_LISTS
  // (2) well-formed lists, each capped at MAX_IDS_PER_LIST (15) UUID-valid ids
  // in the client's render order; `total` preserves the pre-cap length. A list
  // with an invalid type or zero valid ids is dropped entirely.
  if (Array.isArray(ctx.visible_items)) {
    const lists: VisibleListInput[] = [];
    for (const raw of ctx.visible_items) {
      if (lists.length >= MAX_LISTS) break;
      if (!raw || typeof raw !== "object") continue;
      const r = raw as Record<string, unknown>;
      if (typeof r.type !== "string" || !VISIBLE_ITEM_TYPES.has(r.type))
        continue;
      if (!Array.isArray(r.ids)) continue;
      const valid = (r.ids as unknown[]).filter(
        (id): id is string => typeof id === "string" && UUID_RE.test(id),
      );
      if (valid.length === 0) continue;
      lists.push({
        type: r.type as VisibleListInput["type"],
        ids: valid.slice(0, MAX_IDS_PER_LIST),
        total: valid.length,
      });
    }
    if (lists.length > 0) out.visible_items = lists;
  }
  return Object.keys(out).length > 0 ? out : null;
}

const VISIBLE_LIST_LABELS: Record<string, string> = {
  role: "ROLES",
  job: "JOBS",
  company_target: "COMPANIES",
  application: "APPLICATIONS",
};

// One compact line per visible item. Score vocabulary stays entity-bound:
// roles carry readiness/goal; jobs NEVER do (CONTEXT_HONESTY_RULES item 3).
function renderVisibleItemLine(
  type: FetchedVisibleList["type"],
  it: FetchedVisibleItem,
): string {
  if (type === "role") {
    const parts = [it.title];
    if (it.track) parts.push(it.track);
    if (it.readiness_score != null)
      parts.push(`readiness ${Math.round(Number(it.readiness_score) * 100)}%`);
    if (it.goal_alignment_score != null)
      parts.push(`goal ${Math.round(Number(it.goal_alignment_score) * 100)}%`);
    if (it.missing_skills?.length)
      parts.push(`gaps: ${it.missing_skills.slice(0, 3).join(", ")}`);
    return parts.join(" · ");
  }
  if (type === "job") {
    let s = it.title;
    if (it.company) s += ` — ${it.company}`;
    const tail: string[] = [];
    if (it.seniority) tail.push(it.seniority);
    if (it.req_years_min != null) {
      tail.push(
        it.req_years_max != null && it.req_years_max > it.req_years_min
          ? `${it.req_years_min}-${it.req_years_max} yrs`
          : `${it.req_years_min}+ yrs`,
      );
    }
    if (it.req_skills_core?.length)
      tail.push(`core: ${it.req_skills_core.slice(0, 5).join(", ")}`);
    return tail.length ? `${s} · ${tail.join(" · ")}` : s;
  }
  if (type === "company_target") {
    const parts = [it.title];
    if (it.sector) parts.push(it.sector);
    if (it.status) parts.push(`status: ${it.status}`);
    if (it.pitched_role) parts.push(`pitched: ${it.pitched_role}`);
    return parts.join(" · ");
  }
  // application
  let s = it.title;
  if (it.company) s += ` @ ${it.company}`;
  const tail: string[] = [];
  if (it.status) tail.push(it.status);
  if (it.track) tail.push(it.track);
  return tail.length ? `${s} · ${tail.join(" · ")}` : s;
}

// Renders the prompt blocks from already-fetched entities. Pure — no
// supabase dep, no async, no side effects. Tests target this function
// directly.
//
// Empty input returns "" so callers can unconditionally concatenate
// onto userContext without conditional guards (and the byte-identical
// test passes trivially).
export function renderPageContextBlocks(fetched: FetchedPageContext): string {
  let out = "";
  if (fetched.page) {
    out += `\n\nCURRENT PAGE: ${fetched.page}`;
  }
  if (fetched.track) {
    const TRACK_LABELS: Record<string, string> = {
      track_1: "Track 1 (Your Move)",
      track_2: "Track 2 (Plan B)",
      track_3: "Track 3 (Work Toward)",
    };
    out += `\n\nCURRENT TRACK: ${TRACK_LABELS[fetched.track] || fetched.track}`;
  }
  if (fetched.role) {
    out += `\n\nTARGET ROLE (the matched role the user is currently expanded on in their roadmap):`;
    out += `\n- role_id: ${fetched.role.id}`;
    out += `\n- Title: ${fetched.role.title}`;
    if (fetched.role.track) out += `\n- Track: ${fetched.role.track}`;
    if (fetched.role.readiness_score != null) {
      out += `\n- Readiness: ${Math.round(Number(fetched.role.readiness_score) * 100)}%`;
    }
    if (fetched.role.goal_alignment_score != null) {
      out += `\n- Goal alignment: ${Math.round(Number(fetched.role.goal_alignment_score) * 100)}%`;
    }
    if (fetched.role.matched_skills?.length) {
      out += `\n- Matched skills: ${fetched.role.matched_skills.slice(0, 5).join(", ")}`;
    }
    if (fetched.role.missing_skills?.length) {
      out += `\n- Skill gaps: ${fetched.role.missing_skills.slice(0, 5).join(", ")}`;
    }
  }
  if (fetched.job) {
    out += `\n\nTARGET JOB (a live job posting the user is currently viewing in the live-jobs pane):`;
    out += `\n- job_id: ${fetched.job.id}`;
    out += `\n- Title: ${fetched.job.title}`;
    if (fetched.job.company_name)
      out += `\n- Company: ${fetched.job.company_name}`;
    if (fetched.job.location_city)
      out += `\n- Location: ${fetched.job.location_city}`;
    if (fetched.job.seniority) out += `\n- Seniority: ${fetched.job.seniority}`;
    if (fetched.job.req_years_min != null) {
      const range =
        fetched.job.req_years_max != null &&
        fetched.job.req_years_max > fetched.job.req_years_min
          ? `${fetched.job.req_years_min}-${fetched.job.req_years_max} yrs`
          : `${fetched.job.req_years_min}+ yrs`;
      out += `\n- Experience required: ${range}`;
    }
    if (fetched.job.req_skills_core?.length) {
      out += `\n- Required skills: ${fetched.job.req_skills_core.slice(0, 8).join(", ")}`;
    }
    if (fetched.job.req_skills_nice?.length) {
      out += `\n- Nice-to-haves: ${fetched.job.req_skills_nice.slice(0, 6).join(", ")}`;
    }
    if (fetched.job.description) {
      const jd = stripHtml(String(fetched.job.description)) ?? "";
      if (jd) out += `\n- Job Description:\n${jd.slice(0, 2000)}`;
    }
  }
  if (fetched.companyTarget) {
    out += `\n\nTARGET COMPANY (the internship pipeline row the user is currently viewing):`;
    out += `\n- company_target_id: ${fetched.companyTarget.id}`;
    if (fetched.companyTarget.company_name)
      out += `\n- Company: ${fetched.companyTarget.company_name}`;
    if (fetched.companyTarget.company_sector)
      out += `\n- Sector: ${fetched.companyTarget.company_sector}`;
    out += `\n- Status: ${fetched.companyTarget.status}`;
    if (fetched.companyTarget.pitched_role) {
      out += `\n- Pitched role: ${fetched.companyTarget.pitched_role}`;
    }
  }
  // B3 visible lists — numbered so ordinal references ("the second one")
  // resolve to render order. The agent CAN answer from these (see the
  // CONTEXT_HONESTY_RULES exception).
  if (fetched.visibleLists?.length) {
    out += `\n\nVISIBLE ON SCREEN (the exact ordered list the user is currently looking at — you CAN reference these by position, e.g. "the second one", and answer "which is best"):`;
    for (const list of fetched.visibleLists) {
      out += `\n${VISIBLE_LIST_LABELS[list.type] || list.type} (ranked, as shown on screen):`;
      list.items.forEach((it, i) => {
        out += `\n  ${i + 1}. ${renderVisibleItemLine(list.type, it)}`;
      });
      if (list.total > list.items.length) {
        out += `\n  (+${list.total - list.items.length} more visible on screen, not listed here — if the user means one of those, ask them to name it)`;
      }
    }
  }
  return out;
}

// supabase-js's generated SupabaseClient type is excessively deep when
// re-narrowed through a structural interface (TS2589 in the consumer).
// We type the parameter as `unknown` and use a tiny inline cast at each
// chain head — the helper is consumed by the edge function (passing a
// real supabase-js client) and by the test suite (passing a hand-rolled
// mock), and both expose the same `.from().select().eq()...` chain.
// Documented shape for reviewers (the chain we actually call):
//   supabase
//     .from(table)
//     .select(cols)
//     .eq(col, val)
//     [.eq(col, val)]?
//     .maybeSingle() → { data, error }
//
// We deliberately don't constrain the return rows here either — the
// caller down-casts to the FetchedRole / FetchedJob / FetchedCompanyTarget
// shapes when assigning to `out`.
type AnySupabaseChain = {
  from: (table: string) => {
    select: (cols: string) => {
      eq: (
        col: string,
        val: unknown,
      ) => {
        eq?: (
          col: string,
          val: unknown,
        ) => {
          maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
        };
        maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
      };
    };
  };
};

// Re-exported for the test suite — tests mock the chain manually, and
// `as unknown as SupabaseLike` keeps the test code clean.
export type SupabaseLike = AnySupabaseChain;

// Fetches each present entity scoped to the user's auth. Returns a
// FetchedPageContext with only the keys that resolved successfully —
// foreign IDs (mismatched user_id) and missing rows silently drop.
export async function fetchPageContextEntities(
  // `unknown` to dodge supabase-js's deep generic types; we down-cast at
  // each chain head below. The call still type-checks at consumers.
  supabaseRaw: unknown,
  userId: string,
  ctx: PageContextInput,
): Promise<FetchedPageContext> {
  const supabase = supabaseRaw as AnySupabaseChain;
  const out: FetchedPageContext = {};
  if (ctx.page) out.page = ctx.page;
  if (ctx.track) out.track = ctx.track;

  // Career role — scoped to user (career_roles.user_id).
  if (ctx.role_id) {
    const roleQ = supabase
      .from("career_roles")
      .select(
        "id, title, track, readiness_score, goal_alignment_score, matched_skills, missing_skills",
      )
      .eq("id", ctx.role_id);
    const { data: role } = await (roleQ
      .eq?.("user_id", userId)
      ?.maybeSingle?.() ?? roleQ.maybeSingle());
    if (role) out.role = role as FetchedRole;
  }

  // Job — public read (jobs are visible to all authenticated users on
  // the browse / career pages); no user_id filter, but we still validate
  // the row exists. No content the user couldn't already see on the
  // /Career or /Jobs surfaces.
  if (ctx.job_id) {
    const { data: job } = await supabase
      .from("jobs")
      .select(
        "id, title, company_name, location_city, req_skills_core, req_skills_nice, req_years_min, req_years_max, seniority, description",
      )
      .eq("id", ctx.job_id)
      .maybeSingle();
    if (job) out.job = job as FetchedJob;
  }

  // Company target — scoped to user (company_targets.user_id) + joined
  // to companies for name + sector. Same join the practicum context
  // block uses (index.ts:741).
  if (ctx.company_target_id) {
    const ctQ = supabase
      .from("company_targets")
      .select("id, status, pitched_role, companies(name, sector)")
      .eq("id", ctx.company_target_id);
    const { data: ct } = await (ctQ.eq?.("user_id", userId)?.maybeSingle?.() ??
      ctQ.maybeSingle());
    if (ct) {
      const row = ct as {
        id: string;
        status: string;
        pitched_role: string | null;
        companies: { name: string; sector: string | null } | null;
      };
      out.companyTarget = {
        id: row.id,
        status: row.status,
        pitched_role: row.pitched_role,
        company_name: row.companies?.name ?? null,
        company_sector: row.companies?.sector ?? null,
      };
    }
  }

  // B3 visible lists — batch-fetch each typed list, re-ordered to render order.
  if (ctx.visible_items?.length) {
    const lists: FetchedVisibleList[] = [];
    for (const list of ctx.visible_items) {
      const items = await fetchVisibleList(supabaseRaw, userId, list);
      if (items.length > 0) {
        lists.push({ type: list.type, items, total: list.total });
      }
    }
    if (lists.length > 0) out.visibleLists = lists;
  }

  return out;
}

// Batch chain shape: from().select().in()  (jobs, public) OR
// from().select().eq('user_id',uid).in()  (user-scoped types). Modeled
// loosely so the production client + the test mock both satisfy it.
type BatchChain = {
  from: (t: string) => {
    select: (c: string) => {
      in: (col: string, vals: string[]) => Promise<{ data: unknown }>;
      eq: (
        col: string,
        val: unknown,
      ) => { in: (col: string, vals: string[]) => Promise<{ data: unknown }> };
    };
  };
};

// Fetches ONE visible list, scoped to the user (jobs are public), and returns
// compact items re-ordered to the client's render order. Foreign / missing ids
// silently drop. NO full JDs — only the compact reasoning columns.
async function fetchVisibleList(
  supabaseRaw: unknown,
  userId: string,
  list: VisibleListInput,
): Promise<FetchedVisibleItem[]> {
  const supabase = supabaseRaw as BatchChain;
  const spec: Record<
    VisibleListInput["type"],
    { table: string; cols: string; scoped: boolean }
  > = {
    job: {
      table: "jobs",
      cols: "id, title, company_name, seniority, req_years_min, req_years_max, req_skills_core",
      scoped: false,
    },
    role: {
      table: "career_roles",
      cols: "id, title, track, readiness_score, goal_alignment_score, missing_skills",
      scoped: true,
    },
    company_target: {
      table: "company_targets",
      cols: "id, status, pitched_role, companies(name, sector)",
      scoped: true,
    },
    application: {
      table: "applications",
      cols: "id, role_title, company, status, track",
      scoped: true,
    },
  };
  const { table, cols, scoped } = spec[list.type];
  const sel = supabase.from(table).select(cols);
  let res: { data: unknown };
  try {
    res = scoped
      ? await sel.eq("user_id", userId).in("id", list.ids)
      : await sel.in("id", list.ids);
  } catch {
    return [];
  }
  const rows = Array.isArray(res?.data)
    ? (res.data as Record<string, unknown>[])
    : [];
  const byId = new Map<string, Record<string, unknown>>();
  for (const r of rows) {
    if (typeof r.id === "string") byId.set(r.id, r);
  }
  // Re-order to the client's render order; drop ids that didn't resolve.
  const items: FetchedVisibleItem[] = [];
  for (const id of list.ids) {
    const r = byId.get(id);
    if (!r) continue;
    items.push(mapVisibleRow(list.type, r));
  }
  return items;
}

function mapVisibleRow(
  type: VisibleListInput["type"],
  r: Record<string, unknown>,
): FetchedVisibleItem {
  const arr = (v: unknown): string[] | null =>
    Array.isArray(v) ? (v as string[]) : null;
  const num = (v: unknown): number | null => (typeof v === "number" ? v : null);
  if (type === "role") {
    return {
      title: String(r.title ?? "(role)"),
      track: (r.track as string) ?? null,
      readiness_score: num(r.readiness_score),
      goal_alignment_score: num(r.goal_alignment_score),
      missing_skills: arr(r.missing_skills),
    };
  }
  if (type === "job") {
    return {
      title: String(r.title ?? "(job)"),
      company: (r.company_name as string) ?? null,
      seniority: (r.seniority as string) ?? null,
      req_years_min: num(r.req_years_min),
      req_years_max: num(r.req_years_max),
      req_skills_core: arr(r.req_skills_core),
    };
  }
  if (type === "company_target") {
    const companies = r.companies as {
      name?: string;
      sector?: string | null;
    } | null;
    return {
      title: companies?.name ?? "(company)",
      sector: companies?.sector ?? null,
      status: (r.status as string) ?? null,
      pitched_role: (r.pitched_role as string) ?? null,
    };
  }
  // application
  return {
    title: String(r.role_title ?? "(application)"),
    company: (r.company as string) ?? null,
    status: (r.status as string) ?? null,
    track: (r.track as string) ?? null,
  };
}
