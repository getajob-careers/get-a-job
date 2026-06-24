---
title: Feature tour
status: living
owner: shared
last_reviewed: 2026-06-24
code_paths:
  - src/pages
  - src/Layout.jsx
---

# Feature tour

Every major feature, what it does, and why it exists. Plain-language; for how any of it is built, see [engineering](../engineering/architecture.md).

## Onboarding

**What:** The guided first-run where the product learns who a student is — CV upload (read and parsed automatically), experience capture, and a few questions about direction and goals.
**Why:** Everything downstream — scoring, matching, materials — depends on an accurate picture of the person. Onboarding is where that picture is built.

## Today (the home page)

**What:** The command center a student lands on. A daily focus card (the single most important next action), key stats (live matches, applications in motion, tasks done), a short plan for today, a pipeline snapshot, and quick links.
**Why:** The hardest part of a job hunt is momentum. Today answers "what should I do right now?" the moment they open the app.

## Career (roadmap + jobs)

**What:** The student's tracks, the roles they match (with the *why* — qualification and goal-alignment bars, matched and missing skills), and a live feed of real open jobs filtered to their fit. Tracking a job moves it into their pipeline.
**Why:** This is the honest core — where a student sees what they're realistic for and finds real openings to act on, in one place.

## Tracker

**What:** A board of every application and its status (saved → applied → interviewing → offer), manageable by drag-and-drop, with a detail view per application and next-step prompts.
**Why:** Replaces the chaotic spreadsheet. Keeps the whole hunt visible and moving.

## Tasks & Calendar

**What:** Concrete next steps generated from the student's roadmap and pipeline, with due dates and a calendar view.
**Why:** Turns "I should do something" into a specific, finishable list.

## CV Agent

**What:** Generates a CV tailored to a specific job, drawing on the student's captured stories so the achievements are real and relevant. Produces a polished, downloadable document.
**Why:** A tailored CV beats a generic one — but only if it's grounded in truth. The anti-fabrication rule is central here.

## Story Bank

**What:** A place to capture accomplishments once ("led a project that cut churn 23%") and reuse them across CVs, LinkedIn, and interviews.
**Why:** Students undersell themselves because they forget what they've done. Captured stories become the raw material for every piece of writing the product generates.

## LinkedIn tools

**What:** Profile optimization, post drafting (several post types), comment coaching, and networking outreach help — all tuned to research on what actually performs.
**Why:** LinkedIn presence and networking are how many early-career roles are found; most students do it badly or not at all.

## Chat / AI Career Agent

**What:** A conversational career coach that knows the student's pipeline, roadmap, and stories. It answers questions, drafts messages, suggests tasks, and recommends what to focus on. (There are specialized modes — career strategy, CV help, interview prep, skill advice.)
**Why:** A coach who has read everything and is always available is the product's promise made personal.

## Internship / Practicum

**What:** A surface focused on internship outreach for the practicum program — matching students to companies and helping them pitch themselves for an internship rather than a posted job.
**Why:** The Aug–Nov 2026 pilot is practicum-based; many students will pursue internships, which are won by outreach, not by applying to listings.

## Resources

**What:** Curated guides and reference material for the job hunt.
**Why:** Some help is evergreen and doesn't need AI — just good, accessible guidance.

## Behind the scenes

Two things power most of the above and are worth knowing about even from the product side:

- **The job database.** A fresh catalog of real open jobs at Israeli companies, rebuilt nightly by reading company career systems. Without it, "live jobs that fit you" wouldn't be possible. See [the Israeli market](../domain/israeli-market.md).
- **The scoring engine.** The math that decides fit and tracks. See [the matching philosophy](matching-philosophy.md).

---

*Next: [the matching philosophy](matching-philosophy.md) — how the product decides what fits.*
