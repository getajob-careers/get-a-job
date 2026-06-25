---
title: How it works
status: living
owner: shared
last_reviewed: 2026-06-25
code_paths:
  - src/pages/Onboarding.jsx
  - src/pages/Home.jsx
  - src/pages/Career.jsx
---

# How it works

The whole journey, in plain English — what a job seeker actually experiences, from the first sign-up to landing interviews. No code here; for the technical version, see [engineering](../engineering/architecture.md).

## 1. Sign up and onboard

A new job seeker signs up (the pilot uses invite codes, so access is gated to the cohort). Onboarding is where the product learns who they are:

- They upload a CV (or fill in their experience by hand). The app reads it and extracts their roles, skills, education, and accomplishments.
- They answer a few questions about what they're aiming for — their direction and their longer-term goal.
- Behind the scenes, the app analyzes all of this and builds their **career roadmap**: a scored, ranked set of roles that fit them.

By the end, the job seeker has a profile that reflects their real history and a first read on which roles they should be chasing.

## 2. See the truth about fit (the roadmap & tracks)

The product sorts every relevant role into one of three **tracks**:

- **Track 1 — the sweet spot:** roles they're qualified for *and* that move them toward their goal. Apply here first.
- **Track 2 — the detour:** roles they're qualified for but that are off their ideal path. A reasonable fallback.
- **Track 3 — the stretch:** roles on their path but that they're not ready for yet. Something to grow into.

Each role shows *why* it's matched — how qualified they are now, how well it aligns with their goal, and which skills they have versus still need. This is the honest core of the product: it doesn't flatter, it tells them where they actually stand.

## 3. Find live jobs that fit

The app maintains a fresh database of real open jobs at Israeli companies (thousands of them, refreshed nightly from company career systems). The **Career** page shows live jobs filtered to the job seeker's tracks, each with a match score, so they're applying to real, relevant openings — not scrolling a generic board.

## 4. Build strong materials

When a job seeker targets a role, the product helps them prepare:

- **Tailored CV** — a CV rewritten for that specific job, drawing on the job seeker's own captured stories so the achievements are real, not invented.
- **Story Bank** — a place to capture accomplishments once and reuse them everywhere (CVs, LinkedIn, interviews).
- **LinkedIn tools** — profile optimization, post drafting, and networking outreach help.
- **Interview prep** — practice and preparation tied to the specific role.

A guiding rule runs through all of it: **nothing is fabricated.** The AI only uses what the job seeker has actually told it.

## 5. Run the hunt

- **Tracker** — every application, its status, and what needs doing next, on a board the job seeker manages.
- **Daily focus** — each day the product surfaces the single most important next action ("follow up with this company — it's been quiet a week").
- **Tasks** — a running list of concrete next steps, generated from their roadmap and pipeline.

## 6. Get coached

An **AI career agent** sits across the whole product. It knows the job seeker's pipeline, roadmap, and stories, and answers questions, drafts messages, and recommends what to focus on — like a career coach who has read everything and never gets tired.

## The loop

The product is designed as a momentum loop: *see where you stand → find what fits → prepare → apply → track → get nudged → repeat.* Every screen pushes toward the next concrete action, because the hardest part of a job hunt isn't information — it's sustained momentum.

---

*Next: the [feature tour](../product/features.md) for a closer look at each piece, or the [glossary](glossary.md) for the terms.*
