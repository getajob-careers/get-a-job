// job-name-lookup.ts - Piece C of the coach visibility B+C build (see
// docs/research/coach-visibility-BC-build-spec-2026-07-26.md).
//
// STRICT-MATCH lookup of a job the user NAMED in their chat message. All
// decision logic is PURE (detectJobReference / decideMatch / renderNamedJobBlock)
// and unit-testable without a DB; only lookupNamedJob touches supabase, as a
// thin best-effort pre-pass wired into index.ts for the coach agent.
//
// No fuzzy resolution, no tool loop (both are post-flip). The AND-match over
// every significant title token is the correctness guard: a conversational or
// generic phrase almost never has all its tokens present in a real posting, so
// it resolves to `none` rather than a wrong row. On >1 strict hit we return
// `ambiguous` so the coach ASKS which posting the user means.

import { stripHtml } from "../_shared/strip-html.ts";

export interface NamedJobRow {
  id: string;
  title: string;
  company_name: string | null;
  description: string | null;
}

export type NamedJobResult =
  | { kind: "none" }
  | { kind: "match"; job: NamedJobRow }
  | {
      kind: "ambiguous";
      company: string | null;
      options: { title: string; company_name: string | null }[];
    };

// A job-reference preposition followed by a Capitalized proper-noun phrase
// (1-4 words). Case-sensitive on the captured company so lowercase objects
// ("for me", "at a startup") do NOT read as a company.
const REF_COMPANY =
  /\b(?:at|@|for|with|from)\s+([A-Z][A-Za-z0-9&.'\-]*(?:\s+[A-Z][A-Za-z0-9&.'\-]*){0,3})/;
// First job-reference preposition (any object case) - marks where the title
// phrase ends, even when no company follows it.
const REF_PREPOSITION = /\b(?:at|@|for|with|from)\b/;

// Leading/trailing noise stripped off a title candidate so "the Data Analyst
// role" -> "Data Analyst".
const LEADING_FILLERS = new Set([
  "the",
  "that",
  "a",
  "an",
  "this",
  "my",
  "your",
  "about",
]);
const EDGE_NOISE = new Set([
  "role",
  "roles",
  "position",
  "positions",
  "job",
  "jobs",
  "opening",
  "openings",
  "listing",
  "listings",
  "posting",
  "postings",
]);
// Stopwords excluded from the significant-token AND-match.
const TITLE_STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "role",
  "position",
  "job",
  "at",
  "a",
  "an",
  "of",
  "to",
  "in",
  "on",
]);

function cleanTitle(raw: string): string {
  let words = raw.trim().split(/\s+/).filter(Boolean);
  while (
    words.length &&
    (LEADING_FILLERS.has(words[0].toLowerCase()) ||
      EDGE_NOISE.has(words[0].toLowerCase()))
  ) {
    words.shift();
  }
  while (words.length && EDGE_NOISE.has(words[words.length - 1].toLowerCase())) {
    words.pop();
  }
  let out = words.join(" ").trim();
  if (out.length > 60) out = out.slice(0, 60).trim();
  return out;
}

function significantTokens(title: string | null): string[] {
  if (!title) return [];
  return title
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3 && !TITLE_STOPWORDS.has(t));
}

// Deterministic anchor extraction. NO fuzzy resolution. Returns the company
// proper noun and/or the role phrase the user named, or nulls when the message
// carries no strict-enough anchor.
export function detectJobReference(message: string): {
  title: string | null;
  company: string | null;
} {
  if (typeof message !== "string" || !message.trim()) {
    return { title: null, company: null };
  }
  let company: string | null = null;
  let title: string | null = null;

  const prep = message.match(REF_PREPOSITION);
  if (prep && prep.index != null) {
    const companyMatch = message.match(REF_COMPANY);
    if (companyMatch) company = companyMatch[1].trim();
    const cleaned = cleanTitle(message.slice(0, prep.index));
    if (cleaned) title = cleaned;
  }

  // Dash pattern fallback ("<Company> - <Title>" / "<Title> - <Company>") when
  // no preposition company anchor was found. The company side must be a single
  // Capitalized token; anything else is too ambiguous to split on (kept strict
  // so a role title that itself contains " - " does not get mis-split).
  if (!company) {
    const parts = message.split(" - ");
    if (parts.length === 2) {
      const left = parts[0].trim();
      const right = parts[1].trim();
      const isCompanyToken = (s: string) =>
        /^[A-Z][A-Za-z0-9&.'\-]*$/.test(s) && !/\s/.test(s);
      if (isCompanyToken(left) && right) {
        company = left;
        title = cleanTitle(right) || null;
      } else if (isCompanyToken(right) && left) {
        company = right;
        title = cleanTitle(left) || null;
      }
    }
  }

  // Guard: a title-only reference (no company) must carry >= 2 significant
  // tokens. A single word - even a long one like "Marketing" - is not a strict
  // enough anchor to name a posting on its own without a company, so we drop it
  // rather than fire a spurious lookup ("Marketing for now" must resolve to no
  // reference, not a match).
  if (!company && title) {
    if (significantTokens(title).length < 2) title = null;
  }

  return { title, company };
}

function normKey(title: string, company: string | null): string {
  return `${title.trim().toLowerCase()}${(company ?? "").trim().toLowerCase()}`;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
// Whole-word company match: the anchor must appear as a distinct word/phrase in
// the row's company_name, NOT a mid-word substring - so "Meta" does not match
// "Metadata Inc". The DB ilike uses a loose %substring% for recall; this is the
// precision gate that stops a substring collision from injecting a wrong row.
function companyWordMatch(companyName: string | null, anchor: string): boolean {
  if (!companyName) return false;
  try {
    return new RegExp(`\\b${escapeRegex(anchor)}\\b`, "i").test(companyName);
  } catch {
    return false;
  }
}

// PURE strict matcher. Dedups the corpus rows, AND-matches every significant
// title token, and decides match / ambiguous / none. Never returns a match on
// a partial single-token generic hit unless every title token is present.
export function decideMatch(
  rows: NamedJobRow[],
  ref: { title: string | null; company: string | null },
): NamedJobResult {
  const deduped: NamedJobRow[] = [];
  const seen = new Set<string>();
  for (const r of rows) {
    const key = normKey(r.title ?? "", r.company_name);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(r);
  }

  // Company precision: when the user named a company, keep only rows whose
  // company_name contains it as a WHOLE WORD. The DB ilike fetched a loose
  // %substring% for recall; this gate prevents a substring collision (e.g.
  // "Meta" -> "Metadata Inc") from surfacing as a match.
  const scoped = ref.company
    ? deduped.filter((r) => companyWordMatch(r.company_name, ref.company as string))
    : deduped;

  const titleTokens = significantTokens(ref.title);
  const titleHits =
    titleTokens.length === 0
      ? scoped
      : scoped.filter((r) => {
          const t = (r.title ?? "").toLowerCase();
          return titleTokens.every((tok) => t.includes(tok));
        });

  if (titleHits.length === 1) {
    return { kind: "match", job: titleHits[0] };
  }
  if (titleHits.length > 1) {
    const companies = new Set(titleHits.map((r) => r.company_name ?? ""));
    const common =
      companies.size === 1 ? (titleHits[0].company_name ?? null) : null;
    return {
      kind: "ambiguous",
      company: ref.company ?? common,
      options: titleHits.slice(0, 6).map((r) => ({
        title: r.title,
        company_name: r.company_name,
      })),
    };
  }
  // titleHits.length === 0
  if (scoped.length === 1 && !ref.title) {
    return { kind: "match", job: scoped[0] };
  }
  return { kind: "none" };
}

// Minimal supabase query-builder shape we call. Typed narrowly (rather than
// pulling supabase-js's deep generic client type) so both the real client and
// the test mock satisfy it. The builder is thenable at .limit().
type LookupFilter = {
  eq: (col: string, val: unknown) => LookupFilter;
  ilike: (col: string, val: string) => LookupFilter;
  limit: (n: number) => Promise<{ data: unknown; error: unknown }>;
};
type LookupChain = {
  from: (table: string) => { select: (cols: string) => LookupFilter };
};

// IMPURE, thin. Detects a named job in the user's message and runs ONE scoped
// query on the public jobs list (is_il + is_active). Issues NO query when the
// message carries no anchor. Uses the caller's user-authed client (jobs are
// public-read to authed users) - never the service client.
export async function lookupNamedJob(
  supabaseRaw: unknown,
  message: string,
): Promise<NamedJobResult> {
  const ref = detectJobReference(message);
  if (!ref.company && !ref.title) return { kind: "none" };

  const supabase = supabaseRaw as LookupChain;
  let q = supabase
    .from("jobs")
    .select("id, title, company_name, description")
    .eq("is_il", true)
    .eq("is_active", true);
  if (ref.company) {
    q = q.ilike("company_name", `%${ref.company}%`);
  } else {
    // Title-only path (company null but a specific title present). The detect
    // guard already ensured ref.title is >= 2 tokens OR >= 8 chars.
    q = q.ilike("title", `%${ref.title}%`);
  }
  const { data } = await q.limit(25);
  const found = Array.isArray(data) ? (data as NamedJobRow[]) : [];
  return decideMatch(found, ref);
}

// PURE. Renders the prompt block the coach sees. Grounds any summary/quote in
// ONLY the fields below; the AMBIGUOUS block tells the coach to ASK, not guess.
export function renderNamedJobBlock(result: NamedJobResult): string {
  if (result.kind === "none") return "";
  if (result.kind === "match") {
    const job = result.job;
    let out =
      `\n\nLOOKED-UP JOB (a live job posting the user NAMED in their message; you looked it up in the active jobs list - you MAY summarize or quote this, grounded ONLY in the fields below):` +
      `\n- Title: ${job.title}`;
    if (job.company_name) out += `\n- Company: ${job.company_name}`;
    if (job.description) {
      const jd = stripHtml(String(job.description)) ?? "";
      if (jd) out += `\n- Job Description:\n${jd.slice(0, 2000)}`;
    }
    return out;
  }
  // ambiguous
  const at = result.company ? ` at ${result.company}` : "";
  let out = `\n\nNAMED-JOB LOOKUP - AMBIGUOUS (the user referenced a job by name, but it matched more than one live posting${at}). Do NOT assume which one; ASK the user which of these they mean before answering about the posting:`;
  result.options.forEach((o, i) => {
    out += o.company_name
      ? `\n  ${i + 1}. ${o.title} - ${o.company_name}`
      : `\n  ${i + 1}. ${o.title}`;
  });
  return out;
}
