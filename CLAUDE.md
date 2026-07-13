# Get A Job — project conventions

This is a React + Vite + Supabase career operating system for business students entering the Israeli tech market. The product is LIVE with real users (pilots launched June 2026); treat severity accordingly (P0 = hurting live users now).

## Skills

Before starting any task, check whether an installed skill covers it, and prefer the skill's procedure over improvising. Skills live in three places: project (`.claude/skills/`, checked into this repo), user (`~/.claude/skills/`), and plugins. Project skills encode getajob-specific procedure - use them rather than reinventing the steps.

Directly relevant to our work (project skills):

- **`deploy-edge-fn`** - deploying a Supabase edge function and verifying the change shipped in the DEPLOYED source (deployed does not equal merged). Use after any merged PR touching `supabase/functions/*`.
- **`scrubbed-usage`** - the real-user scrub for ANY analytics / usage / cost query. Never report raw numbers.
- **`schema-validator`** - validate the `_shared/libraries/*` files after edits.
- **`design-craft`** - the getajob design bar; applies to any `.jsx` / `.css` / Tailwind edit.
- **`role-research`** - grounded enrichment when extending a role's library content.
- `cognitive-walkthrough`, `nielsen-heuristics-audit` - UX task / heuristic evaluation.

**Precedence when they conflict: Eli's explicit prompt > CLAUDE.md > skill.** A skill never overrides a direct instruction or a rule in this file; it fills in the how when neither has spoken.

## Architecture pointers

- **Frontend:** React 18 + Vite + Tailwind + shadcn/ui + TanStack Query. Pages live in `src/pages/`. `src/pages.config.js` is **hand-maintained** (per PR #67) — the "AUTO-GENERATED" header in that file is stale; add new page imports + the `PAGES` map entry by hand when registering a new route.
- **Backend:** Supabase (Postgres + Auth + Edge Functions in Deno + Storage + RLS). Project ref `ilmqmodklutztuybsvwd`.
- **Edge functions:** in `supabase/functions/<slug>/index.ts`. Deploy via `supabase functions deploy <slug> --project-ref ilmqmodklutztuybsvwd`.
- **Domain libraries** (Israeli market context, role/skill graphs): `supabase/functions/_shared/libraries/00_role_library.ts` (195 roles), `01_skill_library.ts` (610 unique skill IDs), `04_role_skill_mapping.ts`, plus 13 logic / mapping files (16 .ts total + `companies_il.json` with 908 Israeli companies (655 tagged with an ATS, 253 unknown) for the job cache). Consolidated to `_shared/libraries/` in Wk 5; each edge function imports its specific subset via `../_shared/libraries/X.ts`. Validate with `python3 .claude/skills/schema-validator/validate.py` after edits.
- **Track scoring:** `src/lib/scoreApplication.js` (`trackFromScores`) mirrors the goal-aware logic in `generate-career-analysis` (`assignTrackWithGoal`). LLM-derived alignment uses tighter thresholds than the deterministic path.

## Conventions

- Tests: `npm test` (Vitest). Build: `npm run build`. Lint: `npm run lint`. Typecheck: `npm run typecheck`. CI runs all four on every PR — keep green.
- Commits: conventional-commit style (`fix(tracker): …`, `feat(cv): …`). End with `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`.
- Never commit secrets. `.env.local` is gitignored and stays that way. Never embed credentials (PATs, API keys) in URLs or git remotes.
- Never auto-mutate canonical source-of-truth files (e.g., `00_role_library.ts`) — emit to drafts, require human promotion.
- Default to writing no comments. When you do, explain WHY (hidden constraint, subtle invariant), not WHAT.

## Team workflow (Eli + Isaac)

- **Branches:** work on `eli/<topic>` or `isaac/<topic>` (or `feature/<topic>`). Never push directly to `main`.
- **PRs:** open against `main`, fill out the template at `.github/pull_request_template.md`, get one approval from the other dev, squash-merge to keep `main` linear.
- **Conflicts:** the dev who opens the PR resolves conflicts before merge.
- **Picking up someone else's branch:** run `npm test && npm run build` before any commit. Don't trust that "it worked on their machine."
- **Domain libraries** (`supabase/functions/_shared/libraries/*`): **Eli is the approval gate** (the mandatory Isaac cross-review was retired after #571). **Schema/structural** changes (new fields, shape changes, renamed keys, role/skill graph edits) warrant extra care — a clean schema-validator run and, for skill/alias edits, the `library-changes` skill's concept-grep dup check — before merge. **Data-row** changes (registry entries, ATS tokens, tags) merge on Eli's review with live-validation evidence + a clean schema-validator run (amended 2026-06-12, PR #310). These libraries drive 6 edge functions; the schema-validator skill at `.claude/skills/schema-validator/` catches structural drift + cross-reference breaks before they ship.
- **`ROADMAP.md`:** keep updated. Move items between Done / In Progress / Up Next as work moves. If it's not in the roadmap, it's not happening.

## Documentation

The project handbook lives in `docs/` (start at `docs/README.md`). It's a plain-language handbook — overview, product, domain, a contained engineering section, team, operations, decisions.

- **Docs are part of "done."** If a change makes a doc wrong, fix the doc in the same PR. Don't leave it for later.
- Living docs carry frontmatter (`owner`, `last_reviewed`, `code_paths`). When you edit a system, update its doc and bump `last_reviewed` to today.
- `npm run docs:check` flags docs whose `code_paths` changed after their `last_reviewed` date — run it if you've touched a documented system.
- Architectural decisions get a short ADR in `docs/decisions/`. See `docs/meta/documentation-guide.md` for the (lightweight) conventions.

## Lessons (reflection loop)

After any correction from the user that took **multiple attempts to land**, or any bug that surfaced because I missed something an earlier interaction should have taught me, append an entry to `tasks/lessons.md` with this format:

```
---
YYYY-MM-DD — short title
Trigger: what surfaced the lesson (1 sentence)
What I did wrong: the specific misstep — not a generalisation
Rule for next time: actionable rule, written so future-me can follow it
---
```

Keep entries to ~5 lines. The file is for me to read at the start of any session that touches the relevant area, not exhaustive documentation.

Read `tasks/lessons.md` before starting non-trivial work in: track scoring, LLM prompt engineering, edge-function deploys, role/skill library edits, onboarding flow, chat streaming, or any change that raises concurrent OpenAI fan-out (streaming/parallelization/prefetch).

## Verification before completion

For any P0 claim about security (RLS, auth, data integrity), indexes, or schema correctness — **verify against the live system** (`pg_class`, `pg_indexes`, `information_schema`) before treating it as actionable. Two parallel agent audits this session reported "missing RLS on 9 tables"; ground-truth showed all 12 tables had RLS enabled with policies. Trust but verify.
