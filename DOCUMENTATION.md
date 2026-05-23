# DOCUMENTATION — Repo index

**Where to find what.** Every meaningful doc in this repo, with a one-line description and the right reading order for the situation you're in.

If you're new to the project: read `README.md` → `PROJECT_INSTRUCTIONS.md` → `CLAUDE.md`. That covers 90% of what you need.

---

## Track 1 — Read these first

| Doc | When to read | What it gives you |
|---|---|---|
| `README.md` | Setting up locally | Env vars, install, run dev / test / build |
| `PROJECT_INSTRUCTIONS.md` | Anything non-trivial | Living source of truth — architecture, edge functions, schema, sprint state, conventions |
| `CLAUDE.md` | Before opening any PR | Branch + commit + cross-review rules, hooks, lessons doctrine |
| `ROADMAP.md` | When planning work | Week-by-week sprint plan, v1/v2 cut table, risk register |

---

## Track 2 — Reference (consult as needed)

| Doc | When to read |
|---|---|
| `tasks/lessons.md` | Before track scoring / LLM prompt / edge-fn deploy / role-skill library / onboarding work — append-only "took multiple attempts" log |
| `docs/research/linkedin-post-performance.md` | Touching any LinkedIn surface (Posts, Comments, Outreach) — ~430 lines of source-of-truth research |
| `docs/strategy/installation-checklist.md` | When installing new tools / MCPs / skills — prioritized roadmap |
| `docs/strategy/design-strategy.md` | Frontend visual + UX work — sidebar architecture, display philosophy, pre-launch checklist |
| `.github/pull_request_template.md` | Every PR — fill out What/Why, Test Plan, Notes |

---

## Track 3 — Session history (skim only if context is needed)

These are point-in-time snapshots, not living docs. They explain how the codebase got to its current shape but aren't authoritative on current behavior — always check the code or `PROJECT_INSTRUCTIONS.md` first.

| Doc | What it covers |
|---|---|
| `SESSION_13_SUMMARY.md` | Mid-Wk-3 work log (May 8 area) |
| `SESSION_14_SUMMARY.md` | Bug audit + IL job API migration (Active Jobs DB → Techmap → direct ATS); ⚠️ contains action items including PAT rotation |
| `NEXT_SESSION_PLAN.md` | Pre-demo stabilization plan from end of Session 14 — some items now done |
| `DEMO_BUG_LIST.md` | Live-test bug list (Isaac's 6 + Eli's batch) — most resolved as of PR #69 |
| `SKILLS_AUDIT_FINDINGS.md` | Skill library audit (historical) |
| `CLAUDE_AI_BRIEF.md` | High-level project brief for handing off to a fresh Claude.ai session |

---

## Track 4 — Code-adjacent reference

These live in the codebase itself and are best read in context:

| Path | What |
|---|---|
| `supabase/functions/_shared/voice-rules.ts` | 5 voice-rule constants (CV / LinkedIn / Post / Comment / Outreach). Anti-fluff registers, banned-vocab is dead, positive rules are the law |
| `supabase/functions/_shared/libraries/00_role_library.ts` | 183 roles, v2.0 schema. Canonical taxonomy |
| `supabase/functions/_shared/libraries/01_skill_library.ts` | 387 unique skill IDs |
| `supabase/functions/_shared/libraries/companies_il.json` | 831 Israeli companies, ATS-tagged. Drives `scripts/refresh-jobs.ts` |
| `supabase/functions/_shared/skill-aliases.ts` | 170-entry alias map mapping free-text labels (chips + variants) to library skill IDs |
| `supabase/migrations/*.sql` | Schema history — each file has a docstring explaining intent, RLS policies, indexes |
| `.claude/skills/schema-validator/` | Read-only structural checker for the libraries. Source of truth for canonical enums |
| `.claude/skills/role-research/` | Slash-command-driven role enrichment skill |
| `.claude/settings.json` + `.claude/scripts/` | Production Claude Code hooks — auto-format, file protection, dangerous-command blocking |

---

## How to keep this map current

When you add a doc, add a row here. When you delete a doc, remove the row. When a Track 1/2 doc starts feeling stale, fix it in your next PR (don't just flag it).

Track 3 docs are explicitly **not** kept current — they are historical snapshots. If a Session N summary contradicts current code, the code wins.
