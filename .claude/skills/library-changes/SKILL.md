---
name: library-changes
description: Checklist for adding/editing skill IDs or aliases in the domain libraries (_shared/libraries/01_skill_library.ts, _shared/skill-aliases.ts). Use before any library-expansion or alias batch. Prevents duplicate-concept IDs that split job-side vs role-side resolution.
---

# library-changes

The skill library drives 6 edge functions and both sides of scoring (job extraction resolves to skill IDs; role mappings reference the same IDs). A **duplicate-concept ID** — a new ID for a concept an existing ID already covers under a different surface form — silently breaks matching: jobs resolve to the new ID, roles keep the old one, and they never meet. This checklist exists because that shipped once (#575: `model_fine_tuning` dup of `model_training_finetuning`, `llm_agents` dup of `ai_agent_development` — the triage grepped snake _stems_ that missed the existing IDs' surface forms).

## Before adding any new skill ID

1. **Concept-grep, not stem-grep.** For each proposed ID, search the existing library by **concept across names AND descriptions**, not just the snake stem:
   ```
   grep -iE 'fine.?tun|finetun|<synonyms>' 01_skill_library.ts   # names + descriptions + ids
   ```
   Check synonyms and reworded forms (`agents` ↔ `ai_agent_development`, `embeddings` ↔ `vector_databases`/`rag_systems`). If an existing ID covers the concept → **alias the phrase to it, do not mint a new ID.** Only mint when the concept is genuinely distinct (co-occurring but different competency, e.g. `embeddings` vs `vector_databases`).
2. **Alias-collision check.** Confirm the phrase doesn't already resolve elsewhere, and that the new alias target is a real ID (`grep -qx "<id>" <id-list>`).
3. **Cross-ref check.** Every `related_skills` / mapping reference must point to an existing (or same-batch) ID — no dangling refs.

## Applying

4. **schema-validator — no regression.** Run `python3 .claude/skills/schema-validator/validate.py`; the error set must be **byte-identical to baseline** (swap in `git show origin/main:<file>` to compare). New skill entries should use `common_roles:[]` so they add none of the pre-existing role-xref noise.
5. **`deno check`** both edited shared files.
6. **Bulk aliases are PROPOSE-ONLY** for human review (class-G discipline: a missed map beats a wrong one; never auto-map to an existing ID unless unambiguous).
7. **Canonical files are protected** (`_shared/libraries/*`). Edits land on a **held PR** (human merge = the promotion gate); never mutate `main` directly.

## After merge

8. **Re-resolve.** Run `scripts/reresolve-corpus.ts` (NO LLM) — `--dry` first, verify the movement (zero-core %, resolved/job, coverage) against the live DB, then `--write`. Delete any `scripts/.bakeoff.env` key file in the same turn the write completes.

## Review discipline

Data-row adds (new skill entries, alias rows) merge on one dev's review with a clean schema-validator run. Structural changes (new fields, shape changes, role↔skill graph edits) still warrant a second look, but the "mandatory Isaac cross-review" line was retired after #571 — Eli is the approval gate.
