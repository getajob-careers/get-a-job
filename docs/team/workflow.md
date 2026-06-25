---
title: How we work
status: living
owner: shared
last_reviewed: 2026-06-25
code_paths:
  - CLAUDE.md
  - .github/pull_request_template.md
---

# How we work

The team is small — two developers, Eli and Isaac, working closely and shipping fast, with heavy use of AI assistance (Claude Code). This is the rhythm.

## Branches and PRs

- **Never commit directly to `main`.** Work on a branch named `eli/<topic>`, `isaac/<topic>`, or `feature/<topic>`.
- Open a **pull request** against `main`, fill out the template (what, why, test plan), and get **one approval** from the other developer.
- **Squash-merge** so `main` stays a clean, linear history.
- Whoever opens the PR resolves any conflicts before merge.

## Before you push

Run the full check locally — it matches CI:

```bash
npm run lint && npm run typecheck && npm run build && npm test
```

CI runs all four on every PR. Keep them green. If you're picking up someone else's branch, run the build and tests before trusting it — "it worked on their machine" isn't enough.

## Special care areas

Some parts of the codebase are higher-stakes and have extra rules:

- **The domain libraries** (roles, skills, mappings) — changes need cross-review by the other developer, because a bad edit quietly corrupts matching across six features. A validator checks them before they ship. See [roles, skills & tracks](../domain/roles-skills-tracks.md).
- **Edge functions** — aren't fully validated until they deploy (Deno's bundler is stricter than the frontend build). See [AI & edge functions](../engineering/ai-and-edge-functions.md).
- **Scoring and LLM prompts** — read the [lessons log](../../tasks/lessons.md) before non-trivial work here; these areas have repeat failure patterns.

## The reflection loop

When a correction takes several tries to land, or a bug surfaces that an earlier lesson should have prevented, we write it down in [`tasks/lessons.md`](../../tasks/lessons.md) — a short, append-only entry: what went wrong and the rule for next time. It's read at the start of work in the relevant area. This is how the team avoids repeating mistakes, and it's genuinely one of the most valuable docs in the repo.

## Keeping docs current

Documentation is part of "done." If your change makes a doc wrong, fixing it is part of your PR — not a separate chore. The [documentation guide](../meta/documentation-guide.md) explains the (lightweight) freshness system that makes staleness visible.

## Claude Code

The team works heavily with Claude Code. [`CLAUDE.md`](../../CLAUDE.md) at the repo root holds the conventions Claude reads every session — it's the machine-facing version of this page. Keep the two consistent.

### How we work with it

A few habits keep the AI productive and safe:

- **Ask, don't tell.** For anything that changes scope, locks in a design, is hard to reverse, or is visible to others (pushing branches, opening PRs, deploying, destructive SQL), surface the options with a recommendation and wait for a decision rather than acting unilaterally. Approval for one step is not approval for the next.
- **Investigate before building.** For non-trivial work, produce a short numbered investigation first: existing tests, regression risk, shared code that touches this, the rollback path, and a live-data check for anything touching schema, RLS, or counts (verify against the live DB, never transcribe a number). Then build once the direction is confirmed.
- **Decision checkpoints.** Treat each phase as a gate: report what changed, hold for review, and let the reviewer authorize the next step. This keeps large multi-file work on track.

### Recommended skills to use

A curated recommendation for getting the most out of Claude Code on this repo, not a claim about what is installed in any one environment:

- **schema-validator** (project-local, `.claude/skills/schema-validator/`): structural checker for the role and skill libraries. Run it after any library edit.
- **role-research** (project-local, `.claude/skills/role-research/`): research-grade enrichment for the role library.
- A **multi-agent dev workflow** (for example the superpowers toolkit): TDD, code review, planning, and subagent execution.
- **Document authoring** (docx, pdf, pptx, xlsx) and frontend-design helpers when producing artifacts.
- **Context7** for current library docs (React, Tailwind, shadcn, Supabase, Deno) instead of relying on training data.

---

*Related: [the roadmap](../../ROADMAP.md) (what's happening now) · [decisions](../decisions/README.md) (why things are the way they are).*
