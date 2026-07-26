---
title: Skill-library coverage gap + "did you mean" suggester sanity floor
owner: cv-lane
last_reviewed: 2026-07-26
status: research (measurement only - NO code/library changes; HELD for Eli)
code_paths:
  - supabase/functions/_shared/skill-aliases.ts
  - supabase/functions/_shared/libraries/01_skill_library.ts
  - src/lib/skillResolver.js
  - src/lib/suggestSkillFromUnmapped.js
  - src/lib/skillIdsGenerated.json
  - supabase/functions/extract-job-requirements/index.ts
  - src/pages/Profile.jsx
---

# Skill coverage + suggester sanity floor (investigation, HELD for Eli)

Two defects from Eli's live Profile-skills walkthrough. Report-only; no build.
Evidence tiers: **VERIFIED** = checked this session; **INFERRED** = reasoned; **REPORTED** = stated, not yet confirmed.

## Population (VERIFIED, scrubbed real users only)

Scrub = `scrubbed-usage` real-users CTE (confirmed signups, internal/test/demo excluded). Source: live query on `ilmqmodklutztuybsvwd`, `profiles.skills_unmapped` unnested, lowercased.

| Metric                        | Value                           |
| ----------------------------- | ------------------------------- |
| Real users (scrub)            | 60                              |
| Users with >=1 unmapped skill | **41 (68%)**                    |
| Total unmapped occurrences    | **1,165**                       |
| Distinct unmapped labels      | **1,067**                       |
| Labels appearing >=2 times    | 78                              |
| Canonical skill library IDs   | **618** (`01_skill_library.ts`) |

Long tail: 1,067 distinct / 1,165 occurrences means ~92% of labels appear once. The signal is in the repeated head + the semantic clusters, not raw frequency. ~28 unmapped labels per affected user - the resolver misses a lot.

## Resolution pipeline (VERIFIED) + a correction to the triplication premise

`resolveSkill(label)` in `skill-aliases.ts:1272` runs a 7-step fallback: direct `SKILL_ALIASES` lookup -> strip parens -> snake_case normalize -> snake-id direct hit -> hyphen/ampersand normalize -> strip trailing descriptors -> depluralize. Fails all -> the label lands in `profiles.skills_unmapped`.

**Correction (VERIFIED, was REPORTED):** the alias map is NOT triplicated. `SKILL_ALIASES` is defined ONCE (`skill-aliases.ts:25`). Both consumers import the shared `resolveSkill`: `src/lib/skillResolver.js:18` re-exports it, `extract-job-requirements/index.ts:25` imports it. This was consolidated in #511. The genuine sync surface is:

- **Alias addition** (map a label to an EXISTING id): single edit to `SKILL_ALIASES` in `skill-aliases.ts`. Server + browser both pick it up (shared import); the target id is already in the browser's id set. **One file.**
- **New library ID** (`01_skill_library.ts`): MUST regenerate `src/lib/skillIdsGenerated.json` via `node scripts/regen-skill-ids.mjs`, or the browser resolver (which validates against `SKILL_ID_SET` from that generated JSON, `skillResolver.js:26`) will silently drop the new id. **Two files + regen step.**

So aliases are cheap (1 file); new IDs are 2 files + a generator run. Cheaper than the "change all three together" premise. Disconfirming check run: grepped for a second `SKILL_ALIASES` definition or a local alias map in the other two files - none found (only the shared import).

---

## PART 1 - Coverage: scoped library-expansion PR series

Every cluster is triaged into **[A] alias-only** (id exists, wire the label), **[L] new library ID** (genuine skill, no id), or **[N] noise** (not a portable skill; leave unmapped). Counts are occurrences across the 41 affected real users; tail sizes marked **[est]**.

### Batch 1 - AI tools & LLMs (HIGHEST value, mostly ALIAS)

The canonical `ai_tool_fluency` id EXISTS (`01_skill_library.ts`, "AI Tool Fluency: ChatGPT, Claude, Copilot, AI agents"). The common tool names are simply not wired as aliases.

- **[A] -> `ai_tool_fluency`:** chatgpt (9, the #1 unmapped), gemini (3), google gemini, gpt-4o, microsoft copilot, github co-pilot, perplexity, perplexity llm, midjourney, adobe firefly, notebooklm, custom gems, gem. **~22 occ [est].**
- **[A/L] agentic/prompt:** "ai agent & agentic workflow development" (2), multi-agent orchestration, mcp servers, fastmcp, cloudflare mcp, google adk, function calling, structured outputs, human-in-the-loop, llm integration, prompt & context engineering, prompt libraries, הנדסת פרומפטים. Check whether `prompt_engineering` / `llm_integration` ids exist (alias) vs need a new `agentic_ai_development` id. **~14 occ [est].**
- Why it leads: highest frequency, mostly single-file alias edits, zero new-id risk for the `ai_tool_fluency` set.

### Batch 2 - Office / collaboration / SaaS tools (ALIAS-heavy)

- **[A]** office suites: ms office (3), ms office suite, microsoft suite, office365, g-suite, gsuite, google suite (2), google drive/calendar/forms/spreadsheet, outlook, word. Wire to the existing office/workspace id(s) if present, else one `office_productivity_suite` [L].
- **[A/L]** collab/PM tools: clickup (2), trello (2), zoom (2), asana (exists?), monday (exists?), notion (exists?), docusign, dropbox, ms project, atlassian, telegram, skype. **Batch 1+2 together ~50 occ [est].**

### Batch 3 - Finance & accounting (functions + SaaS) [mostly NEW IDs]

Classic functions with no id - a genuine coverage hole for the finance cohort.

- **[L] functions:** accounts payable (3), accounts receivable (2), payroll (2), cash management (2), journal entries, month-end close, general ledger, reconciliation / account reconciliations, accruals, gaap compliance, variance analysis, budget vs actual, invoice processing, expense management, consolidated financial statements, fixed asset schedules. **~20 occ [est].**
- **[L/A] SaaS:** quickbooks (2), xero, sage intacct, sage mas 500, great plains, microsoft dynamics, priority erp, chashavshevet, netsuite. Consider one `accounting_software` id with tool aliases vs per-tool ids.

### Batch 4 - HR / people / comp&ben (functions + HRIS/ATS SaaS) [NEW IDs]

- **[L] HRIS/ATS:** hris (2), ats (2), bamboohr, hibob, greenhouse (+ ats), comeet ats, lever, rippling, workday, paycom, paycor, peoplesoft, ultipro, trinet, justworks, lattice, culture amp, mercer, radford, comptryx, zviran. Likely one `hris_ats_platforms` id + aliases.
- **[L] comp&ben functions:** compensation strategy/architecture/philosophy, total rewards (+ redesign), benefits (medical/dental/flexible), pay equity, job architecture, headcount forecasting, succession planning, global mobility, employee relations. **~25 occ [est]** (one senior HR user drives much of this; mark LOW-CONFIDENCE per-cluster n).

### Batch 5 - Modern web / cloud / data-eng tooling [NEW IDs + a few alias]

- **[L]** infra/web: supabase, vercel, tailwind css, cloudflare, dynamodb, oracledb, openshift, azure cloud, azure devops, gitlab ci/cd, bitbucket, laravel, spring, streamlit, firebase.
- **[L/A]** BI/data: advanced sql ([A]->sql), python for data (3) ([A]->python_data), dax (2), power query (2), power pivot, amazon quicksight, polars, seaborn, scikit, scipy, keras, faiss, apache flink, web scraping (2), etl design.

### Batch 6 - No-code / CMS / site builders [NEW IDs]

- **[L]** wordpress (4), wix (2), squarespace, sanity.io, dreamweaver, base44 (3), lovable, figma make, appsheet.

### Batch 7 - Security & hardware (verify against the prior HW/Security PRs first)

Likely partly covered by the earlier HW/Architect/Systems + Security batches - re-resolve first, add only the residual.

- **[L]** security tools: crowdstrike, sentinelone, palo alto xsiam/xdr/xsoar, cisco, nist csf, cissp, grc frameworks, endpoint security, group policy.
- **[L]** hardware: solidworks (+ advanced), mocvd, optoelectronics, semiconductor lasers, injection moulding, smt/pcba, bom, dfm, thermodynamics, fluid mechanics, materials engineering.

### Alias gaps hiding behind existing ids (fold into the batches, all [A])

Ids exist but the common label snake-normalizes to a near-miss:

- "customer support" -> `customer_support_operations` exists (VERIFIED: label present in the walkthrough profile's canonical set), bare "customer_support" is not an id -> add alias.
- "quality assurance" / "qa" -> check the qa id and alias it.
- "ux/ui design" (2), "ux/ui", "ux/ui direction" -> the `ux_ui_design`-family id.
- "advanced sql" -> `sql`; "python for data" -> `python_data`; "git & version control" -> version-control id.

### Do NOT add (noise - leave unmapped)

- Generic soft skills (already largely in `GENERIC_SKILLS`): teamwork (4), planning (3), analysis (2), discipline (2), decision-making (2), innovation, entrepreneurship, writing, execution, delivery, coordination, resilience, work ethic, detail-oriented.
- Military: military service (2), combat service/engineering/training, search and rescue (2), reserve duty, border defence, commanders course, radio operation. (Optional: one `military_leadership` alias; otherwise noise for the tech market.)
- Sports/hobbies: soccer coaching, dance instruction, fitness instruction, physical fitness (2), painting, drawing, photography, gaming, surfing.
- Vague fragments / proper-noun products: business, product, technology, web, it, push, foil, gem, drift; niche SaaS (allvue, axys, envoy, samplead, favikon, leadfeeder, trendemon, smartico, optimove, clevertap, onesignal).

### Hebrew cluster (SEPARATE effort - flag, do not fold in)

~40 Hebrew labels are unmapped (אוטומציה=automation, ניהול מוצר=product management, מחקר=research, פיתוח=development, עיצוב ux/ui, הנדסת פרומפטים=prompt engineering, פתרון תקלות=troubleshooting...). These need a Hebrew->id alias layer, the same gap the role-library analysis found on the job side. This is its own arc, not part of the English batches.

### PR-series shape (mirrors the HW/Security propose-then-batch pattern)

1. **Propose-list first** (this doc = the raw material). Each label triaged A/L/N by Eli before any edit (mis-resolution risk = the class-G concern from the prior arc).
2. **Alias-first batches (1, 2, and the alias-gaps)** - single-file edits to `SKILL_ALIASES`, no new ids, no regen. Cheapest, highest recovery (AI tools + office + the customer_support-style gaps). Held PR per batch.
3. **New-ID batches (3-7)** - add to `01_skill_library.ts`, run `scripts/regen-skill-ids.mjs`, `library-changes` dup-grep + `schema-validator`. Held PR per cluster.
4. **Cheap re-resolve after each batch:** recompute `skills_unmapped` for real profiles and re-measure recovered coverage (occurrences resolved / 1,165) so each batch's payoff is a number, not a guess.
5. **Never auto-mutate `01_skill_library.ts`** (canonical) - emit drafts, human promotion (CLAUDE.md).

---

## PART 2 - "Did you mean" suggester sanity floor

**Mechanism (VERIFIED, `src/lib/suggestSkillFromUnmapped.js` read end-to-end):** for each unmapped label, compute Levenshtein distance to all 618 canonical display names, reject any where `distance / max(len) > 0.5`, return the top 3 by ascending distance. **No absolute-distance floor, no token/prefix guard.**

**The "Perl" for "vercel" trace (VERIFIED):** `levenshtein("vercel","perl") = 3` (sub v->p, keep e,r, delete c, delete e, keep l); `maxLen = 6`; ratio `3/6 = 0.5`. The gate rejects only `> 0.5`, so **exactly one-half slips through**. "Perl" is offered. The `>` (not `>=`) boundary plus the permissive 0.5 ratio is the whole bug.

Deeper mismatch (INFERRED, from the mechanism): pure Levenshtein-ratio is the wrong tool for a "did you mean" over user labels. It only catches near-spellings. The function's own docstring claims it maps "leadership & team management" -> "Leadership", but `levenshtein` of a long phrase to a short name is huge (many deletions) -> ratio well above 0.5 -> that case is actually REJECTED today. So the suggester helps typos and hurts on genuinely-absent tools (vercel, supabase) where the honest answer is "no suggestion."

### What a minimum-confidence floor looks like (REPORT, do not build)

Options, cheapest first; all preserve real typo-catches:

1. **Absolute-distance cap (simplest).** Require `distance <= 2` in addition to the ratio. "vercel"/"perl" (d=3) -> rejected. Real typos ("langfuse"/"langchain"? no; "figma"/"figma" d=0; "tailwind"/"tailwindcss") stay. A cap of 2 (maybe 3 for names >= ~12 chars) is a hard floor against absurd short-word collisions.
2. **Tighten the ratio to ~0.3** (`d / maxLen >= 0.34 -> reject`). "vercel"/"perl" 0.5 -> rejected. Slightly blunter than the absolute cap; can still pass a coincidental 0.3 short-word match, so weaker alone.
3. **First-char / shared-prefix guard.** Require the label and candidate to share the first character (or a >=2-char prefix). "vercel" vs "perl" differ at char 1 -> rejected outright. Cheap, kills cross-family absurdities, and composes with (1).
4. **Recommended combination:** `distance <= 2 AND shared first char`, ratio kept as a secondary guard. Suggests nothing rather than something absurd - which is exactly Eli's ask. (A token-overlap or embedding suggester is the "real" fix for long descriptive labels, but that is a build, out of scope here.)

Whatever the floor, the honest end state for a genuinely-missing tool (vercel) is **zero suggestions + the existing "No close match ... remove or leave as-is" copy** (`Profile.jsx:1363`), NOT a wrong guess.

---

## Ledger

- **Defect 1 (coverage):** VERIFIED - 41/60 real users have unmapped skills; 1,165 occ / 1,067 distinct; 618 lib ids. Clusters + A/L/N triage + 7-batch PR shape above. Alias map single-source (triplication premise corrected). HELD for Eli's A/L/N ruling before any batch.
- **Defect 2 (suggester):** VERIFIED - Levenshtein, reject `d/maxLen > 0.5`, no absolute floor; "vercel"->"Perl" is d=3/maxLen=6=0.5, passes the `>` boundary. Floor options above. HELD, report-only.
- **Disconfirming checks run:** grepped for a 2nd alias map (none -> single source); computed the exact vercel/perl distance (confirms the boundary); confirmed `ai_tool_fluency` id exists (chatgpt is alias-gap, not missing).
- **Open (needs Eli):** A/L/N triage of the clusters; whether to build a Hebrew alias layer; suggester floor choice.
- **No code changed. No formula work. No email work.**
