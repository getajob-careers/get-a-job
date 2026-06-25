---
title: The Israeli market
status: living
owner: shared
last_reviewed: 2026-06-25
code_paths:
  - supabase/functions/_shared/libraries/companies_il.json
  - scripts/lib/ats-fetchers.ts
  - scripts/refresh-jobs.ts
---

# The Israeli market

Why Get A Job is built specifically for the Israeli tech market, and what that means in practice. This is context everyone on the team should understand — it's the reason the product can do things a generic tool can't.

## Why Israel, why now

The product is built for career seekers in the **Israeli tech market**. That focus is deliberate:

- It's a concentrated, high-density tech ecosystem — a large number of startups, scale-ups, and multinational R&D centers in a small geography.
- Hiring there has its own norms, companies, and channels that a global tool gets wrong.
- The first real users are two pilot cohorts that launched together in June 2026: one sourced through Reichman and a wider invite-based group, both using the product as real-world testers (not for academic credit). The pilot has no fixed end date.

Being narrow is the advantage. A tool that knows *these* companies, *this* ATS landscape, and *these* market norms is more useful to a career seeker in Tel Aviv than any global product.

## The job database

A live "jobs that fit you" board is only possible if we have a fresh, real catalog of open jobs. We build one ourselves:

- We maintain a **registry of Israeli companies** — hundreds of them — each tagged with which applicant-tracking system (ATS) it uses.
- A **nightly job** reads open positions directly from those companies' career systems across roughly ten different ATS platforms (Greenhouse, Lever, Ashby, Comeet, Workday, SmartRecruiters, SuccessFactors, and others).
- The result is a database of **thousands of active, real Israeli jobs**, refreshed every night, that the product filters to each job seeker's tracks.

This pipeline is a real moat — it's a lot of work to assemble and keep working, and it's why the product can show genuinely relevant openings instead of a generic feed. (For how it's built and where it breaks, see [the job pipeline section of engineering](../engineering/architecture.md) and [runbooks](../operations/runbooks.md).)

## Market-specific intelligence

The Israeli focus shows up throughout the product, not just in the job list:

- **Location understanding** — the product knows Israeli cities and can tell a real "Israel" job from a US town that happens to share a name (a genuine bug we had to fix).
- **Language** — many Israeli job descriptions mix Hebrew and English; the product accounts for that.
- **Local norms** — things like Israeli compensation perks and benefit structures are recognized.

## A note on the data

The market data — the company registry, the role and skill libraries — is **curated, canonical data** that the whole product depends on. It's treated carefully: changes are reviewed, and there are validation checks to catch drift. See [roles, skills & tracks](roles-skills-tracks.md) for the taxonomy, and the [engineering data model](../engineering/data-model.md) for how it's stored.

---

*Related: [roles, skills & tracks](roles-skills-tracks.md) — the career taxonomy that matching is built on.*
