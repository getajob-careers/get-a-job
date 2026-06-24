---
title: Roles, skills & tracks
status: living
owner: shared
last_reviewed: 2026-06-24
code_paths:
  - supabase/functions/_shared/libraries/00_role_library.ts
  - supabase/functions/_shared/libraries/01_skill_library.ts
  - supabase/functions/_shared/libraries/04_role_skill_mapping.ts
  - src/lib/trackConfig.js
---

# Roles, skills & tracks

The career taxonomy at the heart of the product. Everything — matching, the roadmap, CV tailoring — is built on this shared vocabulary of roles and skills.

## The three libraries

The product's understanding of careers lives in three curated, canonical datasets (the "domain libraries"):

- **Role library** — the catalog of career roles the product understands (a couple hundred of them), each with its responsibilities, progression, and Israeli-market context. This is the taxonomy of "jobs that exist."
- **Skill library** — the catalog of skills (several hundred), each with a stable ID. People and roles are both described in terms of these skills, which is what makes them comparable.
- **Role–skill mapping** — which skills each role needs. The bridge between the two libraries.

There are also supporting libraries (skill-transfer relationships, location context, goal-alignment logic, and more). Together they're the knowledge base the scoring engine reads.

Why curated and not AI-generated on the fly: stable, reviewed data means stable, fair, debuggable matching. A role means the same thing every time it's scored.

## How they fit together

```
A student's profile          A job posting
   (their skills)               (required skills)
        \                         /
         \                       /
          →  compared via the shared skill vocabulary  ←
                        |
                  fit / match score
                        |
              combined with goal alignment
                        |
                     a TRACK
```

A person is described as a set of skills (extracted from their CV and experience). A job is described as a set of required skills (extracted from its description). Because both use the same skill IDs, they can be compared directly — that comparison, plus experience and education, produces the fit score.

## Tracks

The fit score (are you qualified now?) combined with goal alignment (does this move you toward your goal?) produces a **track** — see [the matching philosophy](../product/matching-philosophy.md) for the full thinking. The track vocabulary and its colors are defined in one place (`src/lib/trackConfig.js`):

- **Track 1 — Sweet spot** (coral) — qualified and on-path.
- **Track 2 — Detour** (teal) — qualified, off-path.
- **Track 3 — Growth/Stretch** (golden) — on-path, not yet qualified.

## Why this is treated carefully

These libraries drive six different AI features. A bad edit — a broken skill ID, a role pointing at a skill that doesn't exist — can quietly corrupt matching everywhere. So:

- Changes to the canonical libraries get **cross-reviewed** by the other developer.
- A **validator** checks the libraries for structural problems (bad IDs, broken cross-references, duplicates) before changes ship.
- Canonical source-of-truth files are never auto-mutated by tooling — changes go through a human.

For the storage details and the validation tooling, see the [engineering data model](../engineering/data-model.md).

---

*Related: [the matching philosophy](../product/matching-philosophy.md) · [scoring internals](../engineering/scoring-internals.md).*
