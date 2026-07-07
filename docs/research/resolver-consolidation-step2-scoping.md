---
title: Skill resolver consolidation — the English coverage fix (arc step 2, scoping)
status: DRAFT — HELD FOR ELI'S REVIEW
owner: eli
last_reviewed: 2026-07-07
consumes: docs/research/hebrew-extractor-language-routing-scoping.md
scope: SCOPING ONLY — paper, no code. Scoring Coverage Arc step 2 (English resolution).
code_paths:
  - supabase/functions/_shared/skill-aliases.ts
  - supabase/functions/extract-job-requirements/index.ts
  - src/lib/skillResolver.js
  - supabase/functions/_shared/libraries/01_skill_library.ts
  - src/lib/skillIdsGenerated.json
---

# Skill resolver consolidation — the English coverage fix (arc step 2)

> **What this is.** The paper scope for the **English** half of the coverage gap. The Hebrew fix
> (#510) is _emission_; this is _resolution_ — English JDs **emit** their skills fine (C4≡C1 proved a
> stronger model doesn't help), but the emitted phrases die at a **triplicated 4-step resolver** over
> the alias table. This doc maps the triplication, defines one shared resolver, and separates the two
> jobs: **(A) consolidate** (removes drift, zero coverage change) and **(B) grow the alias table** to
> cover real misses (the actual coverage lift). **No code.**
>
> **One blocked input:** the top-50 real-miss frequency table needs a live-DB query the MCP is
> currently refusing (§3). The doc is built to _require_ that data before build — it does **not** invent
> hypothetical misses.

---

## 0. The problem, quantified (live DB, Eli 2026-07-07)

English jobs average **4.5 unmapped skills/job**, `skill_coverage_ratio` **0.535**, and **1,747 of
4,224** English jobs have **5+ unmapped**. C4≡C1 in the Hebrew bake-off corroborates this is
**resolution, not emission**: a stronger model didn't raise English recall, so the phrases _are_
emitted — they just don't resolve to canonical `skill_library` IDs.

## 1. The triplication — the change-together set (one alias table, THREE resolvers, TWO ID sets)

**Shared data (already consolidated — not the problem):** `_shared/skill-aliases.ts` holds the one
`SKILL_ALIASES` table (`:25`) and a canonical `resolveSkillAliases` (`:1175`). The frontend already
imports the _table_ straight from the `.ts` (`skillResolver.js:17`, Vite tree-shakes it). So the alias
**data** is single-source.

**Triplicated logic (the problem) — the identical 4-step fallback re-implemented three times:**

| #   | Resolver                            | File:line                               | Runtime | ID-set source                    | Consumers                                                 |
| --- | ----------------------------------- | --------------------------------------- | ------- | -------------------------------- | --------------------------------------------------------- |
| 1   | `resolveSkillAliases`               | `_shared/skill-aliases.ts:1175`         | Deno    | (verify)                         | `generate-career-analysis/index.ts:13`                    |
| 2   | `resolveSkill`                      | `extract-job-requirements/index.ts:118` | Deno    | `01_skill_library.ts` (`:90`)    | extract call sites `:1114,:1117,:1194,:1199`              |
| 3   | `resolveSkill` / `resolveSkillList` | `src/lib/skillResolver.js:22,:55`       | Browser | `skillIdsGenerated.json` (`:18`) | `skillAggregation.js:13`, `internshipRuleScore.js`, tests |

All three implement the **same 4 steps** (direct alias → strip parentheticals → snake→space → snake-ID
match) and say so in their own comments (`extract:112` "mirrors the shared resolveSkillAliases helper";
`skillResolver.js:3` "Same 4-step fallback as the extractor's resolveSkill"). **Three hand-kept copies
that must change together** — the exact drift pattern #504 found with the CV anti-fab gate.

**Second drift axis — TWO skill-ID-set sources:** extract validates against `01_skill_library.ts`
directly (`:90`); the frontend validates against a **generated** `skillIdsGenerated.json` (`:20`). If
the JSON goes stale vs the library, the browser and the extractor resolve the _same phrase_ to
_different_ results. One source of truth is part of the fix.

## 2. Consolidation target — one resolver, where it lives

- **Logic:** a single `resolveSkill(label)` + `resolveSkillList(labels)` in **`_shared/skill-aliases.ts`**
  (or a new sibling `_shared/skill-resolver.ts`), validated against **one** ID set derived from
  `01_skill_library.ts`. Consumers:
  - `extract-job-requirements`: delete the private `resolveSkill` (`:118`), import the shared one.
  - `generate-career-analysis`: `resolveSkillAliases` folds into / delegates to the shared resolver.
  - `src/lib/skillResolver.js`: becomes a **thin re-export** of the shared `.ts` (the frontend already
    imports `SKILL_ALIASES` from it, so the import path is proven to bundle under Vite/esbuild).
- **ID set:** make `skillIdsGenerated.json` a **generated mirror** of `01_skill_library.ts` (or have the
  shared resolver read the library on both sides) so there is **one** ID-set source.
- **\_shared caveat:** `skill-aliases.ts` drives ≥2 edge functions (extract, career-analysis) + the
  frontend — a structural change here triggers the **cross-review rule** (CLAUDE.md _shared policy).

## 3. What the 4.5 unmapped skills ACTUALLY are — the fix target ⚠️ DATA REQUIRED (blocked)

The coverage lift comes from **growing `SKILL_ALIASES` to map the phrases that really miss** — not
hypotheticals. Source of truth already exists: `jd_unmapped_skill_counts` (global phrase→count table,
bumped at `extract:1216`) + `extraction_unmapped_skills` (per-job array, `:1262`).

**Run this and paste the top-50 into the table below before the build is scoped** (the Supabase MCP is
currently returning `OAuth token does not meet scope requirement user:mcp_servers`, so I could not pull
it — this is the one blocked input):

```sql
-- (a) global top-50 real misses
select * from jd_unmapped_skill_counts order by count desc nulls last limit 50;

-- (b) English-only view (the 4.5/job stat is English) — top unmapped phrases on en jobs
select lower(trim(u)) as phrase, count(*) as n
from jobs j, unnest(j.extraction_unmapped_skills) as u
where j.jd_language = 'en' and j.extraction_unmapped_skills is not null
group by 1 order by n desc limit 50;
```

_(verify column names — `count` on `jd_unmapped_skill_counts`, `jd_language`/`extraction_unmapped_skills` on `jobs`.)_

**Fill-in (the build targets these — leave blank until the query runs):**

| rank | unmapped phrase     | count | disposition (alias-to-ID / new skill_library ID / reject as non-skill) |
| ---- | ------------------- | ----- | ---------------------------------------------------------------------- |
| …    | _(pending live DB)_ | …     | …                                                                      |

**Disposition rule:** each top-50 phrase becomes either (i) a new `SKILL_ALIASES` entry pointing at an
existing `01_skill_library` ID, (ii) a genuine new skill ID (a **library** change → the stricter
cross-review path, and note the "never auto-mutate canonical libraries" rule — emit to a draft), or
(iii) an explicit reject (contentless / non-skill). No blanket additions.

## 4. Migration / reprocess — re-resolution is cheap and needs NO re-extraction

**Key answer to your question:** growing aliases changes what resolves, so stored `req_skills_core` +
`skill_coverage_ratio` (computed at extraction time) go stale — but fixing them is a **pure
re-resolution over the STORED raw phrases** (`req_skills_core_raw`), **not** a re-extraction. **No LLM
call.**

- The raw emitted phrases are already persisted; re-resolution = run the (new, shared) resolver over
  them → rewrite `req_skills_core` / `req_skills_nice` / `skill_coverage_ratio` / `extraction_unmapped_skills`.
- **Can it be pure DB-side (SQL)?** Only if the 4-step resolver + alias table were reimplemented in
  plpgsql — that would be a **4th copy** of the exact thing we're consolidating (anti-goal). **Recommend
  instead a lightweight re-resolution pass** (an edge-fn/`force`-style path or a one-off script) that
  reads stored raw phrases and applies the shared resolver — cheap, fast, LLM-free, and reuses the one
  canonical resolver. This is **distinct from #510's Hebrew re-_extraction_** (which does need the LLM).
- **Scope:** re-resolve **all** jobs once after the alias grow (cheap — no model cost), not just English;
  coverage_ratio recomputes everywhere.

## 5. Acceptance criteria

- **Consolidation correctness (part A):** a single fixture test asserts the shared resolver returns
  **identical** IDs to all three legacy copies across a corpus of phrases (proves no behavior change from
  de-duplication) — then the legacy copies are deleted.
- **Coverage lift (part B):** English avg `skill_coverage_ratio` rises from **0.535** to a target set
  from the top-50 data (propose **≥ 0.70**, confirm once §3 is filled), and **avg unmapped/English-job
  drops from 4.5** to a target (propose **≤ 2.0**). Every top-50 phrase is dispositioned (aliased / new
  ID / rejected).
- **No cross-runtime drift:** the frontend and extractor resolve an identical fixture set identically
  (one ID-set source verified).

## 6. Rollback

- **Consolidation:** keep the legacy copies until the shared resolver is baked; revert imports to roll
  back — no data hazard.
- **Alias growth:** additive `SKILL_ALIASES` rows; a bad alias is a one-row revert. Re-resolution is
  **idempotent** — re-run with the prior table to restore prior `req_skills_core`/coverage. **No
  re-extraction, so nothing LLM-costly to undo.**

## 7. File-overlap check (explicit — as requested)

- **vs #509 (CV chokepoint):** ✅ **no overlap.** #509's authoring/renderer set (gtc, refine-cv,
  edit-cv, render-cv, cv-antifab, cv-master, CVStudioLive) imports **none** of the resolver set
  (grep-verified). Disjoint.
- **vs #510 (Hebrew routing):** ⚠️ **OVERLAP on `extract-job-requirements/index.ts`.** #510 edits the
  model call / routing (`:31` MODEL const, `:504` call); step 2 deletes `resolveSkill` (`:118`) and
  rewires its call sites (`:1114,:1117,:1194,:1199`). Different regions, **same file** → the two build
  PRs will conflict if built in parallel. **Sequence them:** land one, rebase the other. (Recommend
  #510 first — it's smaller and its region is far from the resolver block — then step 2 rebases.)
- **Shared-lib note:** step 2 restructures `_shared/skill-aliases.ts` (used by extract +
  generate-career-analysis + frontend) → **cross-review required**; any new `01_skill_library` IDs use
  the draft-then-promote path (never auto-mutate the canonical library).

---

_Scoping only. HELD for Eli's review. The top-50 real-miss table (§3) is the one blocked input — build
is gated on it. No code changed._
