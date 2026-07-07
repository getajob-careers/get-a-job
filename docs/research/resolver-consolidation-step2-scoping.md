---
title: Skill resolver consolidation — the English coverage fix (arc step 2, scoping)
status: SIGNED (2026-07-07) — as-is; top-50 classified, build order #510→#511
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

## 3. What the 4.5 unmapped skills ACTUALLY are — the top-50, classified

**Pulled live 2026-07-07** (Eli's re-authed Supabase MCP; mine still needs its own re-auth). Source of
truth: `jd_unmapped_skill_counts` (global phrase→count) + `extraction_unmapped_skills` (per-job array,
`:1262`). Query used:

```sql
-- (a) global top-50 real misses
select * from jd_unmapped_skill_counts order by count desc nulls last limit 50;

-- (b) English-only view (the 4.5/job stat is English) — top unmapped phrases on en jobs
select lower(trim(u)) as phrase, count(*) as n
from jobs j, unnest(j.extraction_unmapped_skills) as u
where j.jd_language = 'en' and j.extraction_unmapped_skills is not null
group by 1 order by n desc limit 50;
```

**Classified into three lanes** so the fix targets real misses only:

- **A — alias bug** (maps to an existing `skill_library` ID under a different spelling/spacing/snake
  form) → **part B of THIS PR** (add `SKILL_ALIASES` rows). Resolver-side, no library change.
- **M — genuinely missing library entry** (no canonical ID yet) → **feeds arc step 3** (role/skill
  library expansion, draft-then-promote — NOT built here; cross-referenced).
- **G — too generic to map** (not a discrete skill) → **intentional drop**, added to a resolver
  drop-list and **EXCLUDED from the coverage denominator** (§5). Never counts as a miss.

`(review)` = a class I inferred rather than one Eli named — confirm before build.

| phrase                        | count | class      | disposition                                                                    |
| ----------------------------- | ----- | ---------- | ------------------------------------------------------------------------------ |
| technical_support             | 27    | A          | alias → support ID; de-dupes with `technical support`                          |
| verification                  | 27    | G          | generic — drop-list                                                            |
| data science | 25 | M | MANDATORY step-3 lib entry — no `data_science` ID exists (orphan, deferred from #517) |
| ai_ml                         | 22    | A          | alias → ai/ml ID                                                               |
| erp                           | 21    | A          | alias → `erp_systems`                                                          |
| orchestration                 | 20    | G          | generic — drop-list (confirmed; no bare-word ID)                               |
| reporting                     | 20    | G          | generic — drop-list                                                            |
| communication protocols       | 19    | M (review) | networking/embedded → step 3                                                   |
| security research | 19 | M | MANDATORY step-3 lib entry — no `security_research` ID exists (orphan, deferred from #517) |
| technical support             | 19    | A          | alias → support ID (spacing twin of `technical_support`)                       |
| computer architecture         | 18    | M (review) | systems/chip cluster → step 3                                                  |
| optimization                  | 18    | G          | generic — drop-list                                                            |
| object-oriented design        | 18    | A          | alias → OOP ID                                                                 |
| system verilog                | 18    | A          | alias → `systemverilog` (whitespace)                                           |
| lookers                       | 18    | A          | alias → Looker (typo/plural)                                                   |
| synthesis                     | 18    | M          | chip-design cluster → step 3                                                   |
| data_science | 17 | M | MANDATORY step-3 lib entry — no `data_science` ID (orphan, deferred from #517) |
| windows internals             | 17    | M          | OS-internals cluster → step 3                                                  |
| simulation                    | 16    | M (review) | EDA/chip cluster → step 3                                                      |
| scaling                       | 16    | G          | generic — drop-list                                                            |
| integration                   | 16    | G          | generic — drop-list                                                            |
| storage                       | 16    | G          | generic — drop-list (confirmed)                                                |
| security_research | 16 | M | MANDATORY step-3 lib entry — no `security_research` ID (orphan, deferred from #517) |
| grpc                          | 15    | M          | new gRPC entry → step 3                                                        |
| manufacturing                 | 15    | M (review) | hardware/manufacturing → step 3                                                |
| os internals                  | 15    | M          | OS-internals cluster → step 3                                                  |
| robotics                      | 15    | M (review) | new entry → step 3                                                             |
| solidworks                    | 15    | M          | CAD/mechanical → step 3                                                        |
| embedded software development | 15    | A          | alias → `embedded_systems`                                                     |
| groovy                        | 14    | M          | new Groovy entry → step 3                                                      |
| interpersonal skills          | 14    | G (review) | soft-skill filler — drop-list                                                  |
| ui_design                     | 14    | A          | alias → `ui_visual_design`                                                     |
| signal processing             | 13    | M (review) | DSP → step 3                                                                   |
| validation                    | 13    | G (review) | generic (twin of `verification`) — drop-list                                   |
| full stack development        | 13    | A          | alias → [`frontend_development`,`backend_development`] (composite)             |
| dagster                       | 13    | M          | new Dagster entry → step 3                                                     |
| performance                   | 13    | G          | generic — drop-list                                                            |
| azure_devops                  | 13    | A          | alias → `cloud_platforms_devops`                                               |
| system engineering            | 13    | A          | alias → `system_design` (broader than `system_architecture`)                   |
| routing                       | 13    | G          | generic — drop-list (confirmed; lib has `place_and_route`/`tcp_ip_networking`) |
| analog circuits               | 13    | M          | chip-design cluster → step 3                                                   |
| writing                       | 13    | G          | generic — drop-list                                                            |
| cad                           | 12    | M (review) | mechanical/CAD (with solidworks) → step 3                                      |
| .net core                     | 12    | M          | new .NET Core entry → step 3                                                   |
| priority_erp                  | 12    | A          | alias → `erp_systems` (Priority = specific IL ERP → generic)                   |
| assembly                      | 12    | M (review) | low-level programming → step 3                                                 |
| object_oriented_programming   | 12    | A          | alias → OOP ID (snake twin of `object-oriented design`)                        |
| authentication                | 12    | A          | alias → `jwt_oauth_auth`                                                       |
| unity                         | 12    | M          | new Unity entry → step 3                                                       |
| timing closure                | 12    | M          | chip-design cluster → step 3                                                   |

**Tallies (post-corpus check):** **A = 19** (alias-bug → part B, HERE) · **M = 19** (missing → step 3) · **G = 12** (generic drop, excluded from the coverage denominator). Five phrases flipped **M→A** against existing canonical IDs: system verilog→`systemverilog`, erp/priority_erp→`erp_systems`, authentication→`jwt_oauth_auth`, system engineering→`system_design`; and ui_design→`ui_visual_design`, azure_devops→`cloud_platforms_devops`, full stack development→`frontend_development`+`backend_development` were confirmed A. Remaining **M** is a coherent step-3 expansion: the **chip-design cluster** (synthesis, timing closure, analog circuits, simulation, computer architecture, signal processing), **OS-internals** (windows/os internals), **CAD/mechanical** (solidworks, cad), plus grpc/dagster/.net core/unity/groovy/robotics/assembly/manufacturing/communication protocols — **cross-referenced to arc step 3**.

**Disposition rule:** class A → a `SKILL_ALIASES` row to an existing `01_skill_library` ID (built here).
Class M → a genuine new skill ID = a **library** change on the draft-then-promote path (never
auto-mutate the canonical library) — **deferred to step 3**. Class G → an explicit drop-list entry. No
blanket additions.

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
- **Coverage lift (part B) — measured on the MAPPABLE denominator.** Redefine the target
  `skill_coverage_ratio` over **mappable** skills only: class-G generic phrases (verification,
  validation, reporting, optimization, integration, performance, scaling, storage, routing,
  orchestration, writing, interpersonal skills, …) are **excluded from BOTH numerator and denominator**
  — a G phrase is never counted as a miss. On that denominator, target English avg **≥ 0.70** (from the
  current all-in **0.535**) and avg unmapped/English-job **≤ 2.0** (from 4.5). Aliasing every class-A
  phrase (part B, here) is the lever; class-M phrases raise it further only after step 3 lands the
  library IDs. Every top-50 phrase must be dispositioned (A alias / M deferred-to-step-3 / G drop-list).
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
  PRs will conflict if built in parallel. **BUILD-ORDER RULE: #510 builds FIRST; #511 rebases onto it.**
  Shared file `extract-job-requirements/index.ts`, different regions (#510 the model call/routing ~`:31`/
  `:504`; #511 the resolver block ~`:118`/`:1114–1199`), so the rebase is mechanical. Do **not** build
  the two against this file in parallel.
- **Shared-lib note:** step 2 restructures `_shared/skill-aliases.ts` (used by extract +
  generate-career-analysis + frontend) → **cross-review required**; any new `01_skill_library` IDs use
  the draft-then-promote path (never auto-mutate the canonical library).

---

_**SIGNED by Eli 2026-07-07** as-is. Top-50 pulled + classified (§3, A=19/M=19/G=12); coverage target on
the mappable denominator (§5); build order #510→#511. Build gated on Eli's separate go. No code changed._
