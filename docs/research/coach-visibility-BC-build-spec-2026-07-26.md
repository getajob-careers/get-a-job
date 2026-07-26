---
title: Coach visibility B+C - build spec (locked)
owner: cv-lane
last_reviewed: 2026-07-26
status: build spec for the ONE backend item (Pieces B+C), per coach-job-context-lookup-2026-07-26.md
code_paths:
  - supabase/functions/ai-chat/index.ts
  - supabase/functions/ai-chat/prompt-lib.ts
  - supabase/functions/ai-chat/page-context.ts
  - supabase/functions/ai-chat/job-name-lookup.ts
---

# Coach visibility B+C - locked build spec

Grounded, schema-verified 2026-07-26. Implements the Eli ruling in
`coach-job-context-lookup-2026-07-26.md`: Piece B (capped JD on the pinned TARGET
JOB) + Piece C (STRICT-MATCH name lookup, ask-on-ambiguity, no fuzzy, no tool loop).
Piece A (frontend job_id wiring) is the design lane's; B+C must be **safe dead-ish
code**: Piece B only renders when the frontend passes `job_id` (it does NOT today -
`Career.jsx:443 visibleJobIds:[]`), so B is inert until Piece A lands. Piece C is
live-useful now (reads the user's chat message, not page_context).

## Verified schema facts (live, 2026-07-26)

- `jobs.description` (text) holds full JD prose (4k-6k chars typical). Omitted from
  the current page-context job select on purpose.
- `jobs.is_il` (bool), `jobs.is_active` (bool), `jobs.company_name` (text),
  `jobs.title` (text) all present.
- The corpus has **duplicate rows** (e.g. "Senior Account Executive - Israel" x2 at
  one company). Matcher MUST dedup by normalized (title, company_name).
- Walkthrough fixture: "Intelligence Analyst at Chainalysis" is **AMBIGUOUS** - TWO
  live roles ("Intelligence Analyst - Fraud Researcher", "Intelligence Analyst -
  Threat Hunter"). Correct behavior = ASK which, never guess.

## The 2000-char JD cap (mirror verbatim)

Existing app-JD pattern - `prompt-lib.ts:888-891`:

```
const cleanedJd = stripHtml(String(appData.job_description)) ?? "";
if (cleanedJd) userContext += `\n- Job Description:\n${cleanedJd.slice(0, 2000)}`;
```

Reuse `stripHtml` (from `../_shared/strip-html.ts`) + `.slice(0,2000)` for BOTH B and C.

---

## PIECE B - capped JD on pinned TARGET JOB (`page-context.ts`)

1. `FetchedJob` interface (`page-context.ts:71-81`): add field `description: string | null;`.
2. Job select (`page-context.ts:403-404`): append `, description` to the select column list.
3. Import `stripHtml` at top of page-context.ts if not already imported (check first;
   `_shared/strip-html.ts`). page-context.ts is imported by prompt-lib.ts which is
   Node-importable - `stripHtml` must be Node-safe (it is; it's a pure string fn).
4. Render in the TARGET JOB block (`page-context.ts:290-296`, after the req_skills_nice
   line, still inside `if (fetched.job)`):
   ```
   if (fetched.job.description) {
     const jd = stripHtml(String(fetched.job.description)) ?? "";
     if (jd) out += `\n- Job Description:\n${jd.slice(0, 2000)}`;
   }
   ```
5. Do NOT change the trust model: still an ID-driven fetch of a row the user can see.

## PIECE C - strict-match name lookup (new `job-name-lookup.ts` + `index.ts` pre-pass)

New file `supabase/functions/ai-chat/job-name-lookup.ts`. ALL decision logic is PURE
(unit-testable without DB); only `lookupNamedJob` touches the DB.

### Types

```
export interface NamedJobRow { id: string; title: string; company_name: string | null; description: string | null; }
export type NamedJobResult =
  | { kind: "none" }
  | { kind: "match"; job: NamedJobRow }
  | { kind: "ambiguous"; company: string | null; options: { title: string; company_name: string | null }[] };
```

### detectJobReference(message: string): { title: string | null; company: string | null } (PURE)

Deterministic anchor extraction. NO fuzzy resolution. Rules (first match wins):

- Company anchor: capture the proper-noun phrase after a job-reference preposition.
  Regex (case-sensitive on the captured company, which must start uppercase):
  `/\b(?:at|@|for|with|from)\s+([A-Z][A-Za-z0-9&.'\-]*(?:\s+[A-Z][A-Za-z0-9&.'\-]*){0,3})/`
  -> `company` = trimmed group.
- Dash pattern "<Company> - <Title>" or "<Title> - <Company>": if the message contains
  `X - Y` where one side matches a known-company shape, treat the Capitalized side as
  company and the other as title. Keep it simple: split on " - "; if company anchor
  already found, the OTHER segment (minus stopwords) is the title.
- Title anchor: the role phrase. Prefer text BEFORE the "at/for/with/from" preposition,
  stripped of leading fillers ("the", "that", "a", "this", "role", "position", "job",
  "opening", "listing" as trailing/leading noise) -> `title`. Trim to <= 60 chars.
- If neither a company anchor nor a >=2-word / >=8-char title anchor is found -> both null.

### decideMatch(rows: NamedJobRow[], ref): NamedJobResult (PURE)

- Dedup `rows` by normalized key `lower(trim(title))||'�'||lower(trim(company_name||''))`.
- Let `titleTokens` = significant tokens of `ref.title` (lowercase words, len>=3, minus
  stopwords: the,and,for,with,role,position,job,at,a,an,of,to,in,on).
- Filter rows to `titleHits` = rows whose lower(title) CONTAINS EVERY titleToken
  (AND-match). If `ref.title` is null/empty -> titleHits = all deduped rows.
- Decision:
  - titleHits.length === 1 -> { kind:"match", job: that row }.
  - titleHits.length > 1 -> { kind:"ambiguous", company: ref.company ?? that-rows'-common-company, options: titleHits (title+company) capped 6 }.
  - titleHits.length === 0:
    - if deduped.length === 1 AND ref.title is null -> match that one (company named, single role).
    - else -> { kind:"none" } (title given but no strict title agreement; do NOT guess).
- NEVER return match on a fuzzy/partial single-token generic hit unless titleTokens all present.

### lookupNamedJob(supabase, message): Promise<NamedJobResult> (IMPURE, thin)

- `ref = detectJobReference(message)`. If ref.company null AND ref.title null -> return {kind:"none"} (NO query).
- Build query on `jobs`, filter `is_il=true, is_active=true`, select `id,title,company_name,description`, limit 25:
  - If ref.company: `.ilike("company_name", "%"+ref.company+"%")`.
  - Else (title only, ref.company null but title present & specific): `.ilike("title","%"+ref.title+"%")`.
    Title-only path is allowed ONLY if ref.title has >=2 tokens OR >=8 chars (guard set in detect).
- `decideMatch(rows, ref)`; return it.
- Use the SAME `supabase` (user-authed) client the page-context job fetch uses (jobs are
  public-read to authed users). Do NOT use serviceClient.

### renderNamedJobBlock(result): string (PURE)

- kind none -> "".
- kind match:
  ```
  \n\nLOOKED-UP JOB (a live job posting the user NAMED in their message; you looked it up in the active jobs list - you MAY summarize or quote this, grounded ONLY in the fields below):
  \n- Title: <title>
  [\n- Company: <company_name> when present]
  [\n- Job Description:\n<stripHtml(description).slice(0,2000)> when present]
  ```
- kind ambiguous:
  ```
  \n\nNAMED-JOB LOOKUP - AMBIGUOUS (the user referenced a job by name, but it matched more than one live posting[ at <company>]). Do NOT assume which one; ASK the user which of these they mean before answering about the posting:
  \n  1. <title> - <company_name>
  \n  2. ...
  ```

### index.ts wiring

- After `const userContext = await buildUserContext(...)` (`index.ts:241`) and BEFORE
  `assembleSystemPrompt` (`index.ts:248`), add - ONLY for the coach agent
  (`agent === "career_agent"`; confirm the exact agent id used for the coach):
  ```
  let namedJobBlock = "";
  try {
    const r = await lookupNamedJob(supabase, message);
    namedJobBlock = renderNamedJobBlock(r);
  } catch (_e) { /* lookup is best-effort; never block a chat turn */ }
  const userContextPlus = userContext + namedJobBlock;
  ```
  Pass `userContextPlus` to `assembleSystemPrompt`. (If `message` is empty/non-string,
  skip.) The try/catch guarantees a lookup failure never degrades the chat turn.
- Import `lookupNamedJob, renderNamedJobBlock` from `./job-name-lookup.ts`.
- Gate on `agent === "career_agent"` (the coach). Verify that literal against index.ts.

## PROMPT rule (`prompt-lib.ts` CONTEXT_HONESTY_RULES, near :935-945)

Add one item (hyphens, no em dashes), consistent with existing item numbering:

> LOOKED-UP JOB / NAMED-JOB LOOKUP. When a "LOOKED-UP JOB" block is present, the user
> named that job and you looked it up - you MAY summarize or quote its Job Description,
> grounded ONLY in the fields given; never invent details not present. When a
> "NAMED-JOB LOOKUP - AMBIGUOUS" block is present, do NOT pick a row - ASK the user
> which of the listed postings they mean, then answer from that one next turn. If
> neither block is present and the user names a job you have no context for, say you
> don't have that posting's details and offer to look/ask - never fabricate a JD.

## TESTS

- `page-context.test.ts` (extend): TARGET JOB render now includes a capped `- Job
Description:` line when `description` present; ABSENT when null; byte-equivalence
  path (no job_id) unchanged. Add `description` to any FetchedJob test fixtures.
- `job-name-lookup.test.ts` (NEW, colocated): pure tests over detectJobReference /
  decideMatch / renderNamedJobBlock. MUST include:
  - Chainalysis 2-role AMBIGUOUS ("Intelligence Analyst at Chainalysis" -> ambiguous, 2 options).
  - Single strict match ("Threat Hunter at Chainalysis" -> match that row).
  - Duplicate-row dedup (two identical title+company rows -> treated as ONE -> match, not ambiguous).
  - Generic title, no company, single generic token -> NONE (no wrong-row).
  - No anchor at all -> NONE (and lookupNamedJob issues no query - assert via a mock that .from is never called).
  - Company matched, title given but zero title agreement -> NONE.
  - Company matched, no title -> single company job -> match; multiple -> ambiguous.
- `prompt-lib.test.ts` (extend): the new CONTEXT_HONESTY_RULES item text is present in
  the assembled career_agent system prompt; byte-equivalence for agents that don't get
  CONTEXT_HONESTY_RULES is unchanged.

## EVAL / mirror alignment

- `scripts/lib/ai-chat-prompt-mirror.ts` is a thin `export *` re-export of prompt-lib.ts
  - Piece B flows through automatically (renderPageContextBlocks -> buildUserContext).
    No mirror edit needed; just confirm it still compiles.
- `scripts/test-ai-chat-bakeoff.ts` imports the mirror + page-context.sanitizePageContext.
  Piece C is index.ts-level, NOT in the paid bakeoff path - do NOT add Piece C to the
  paid eval. Just confirm the bakeoff still typechecks/imports after the page-context
  change (new `description` field is additive).

## GATE / deploy

- `npm run lint && npm run typecheck && npm run build && npm test` all green (gatekeeper).
- `deno check` on the three edge files + the new module.
- Post-merge (HELD until hub batch): `supabase functions deploy ai-chat
--project-ref ilmqmodklutztuybsvwd` + fingerprint (grep the DEPLOYED body for
  "LOOKED-UP JOB (a live job posting the user NAMED").
- HELD PR with a VERIFICATION block (spec verifier / QA breaker / gatekeeper; no
  flag-scope auditor - this item is not flag-gated, it is additive context the coach
  only sees when a job is pinned (B, inert until Piece A) or named (C)).
