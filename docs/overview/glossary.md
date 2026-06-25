---
title: Glossary
status: living
owner: shared
last_reviewed: 2026-06-25
---

# Glossary

The vocabulary of Get A Job, in plain terms. When a doc, a screen, or a teammate uses one of these words, this is what it means.

## Core concepts

**Track** — How a role is classified for a given job seeker, based on two things: how qualified they are now, and how well the role moves them toward their goal.
- **Track 1 (Sweet spot):** qualified *and* on-path. Apply here first.
- **Track 2 (Detour):** qualified but off-path. A doable fallback.
- **Track 3 (Stretch / Growth):** on-path but not yet qualified. Grow into these.

**Qualification (qualification level)** — How far along a person is in their career, derived from the depth of their experience (not just how many jobs they've had). Drives what seniority of role is realistic for them.

**Fit / match score** — How well a specific job matches a job seeker, scored from their skills, experience, education, and the role's requirements. Shown as a percentage on job cards.

**Goal alignment** — How well a role moves a job seeker toward their stated longer-term goal (their "five-year role"). One of the two axes behind track assignment.

**Roadmap** — The job seeker's personalized, scored set of career roles, sorted into tracks. The output of the career analysis.

**Proof signals** — Concrete evidence of a skill or achievement pulled from a person's history (e.g., "shipped a feature used by 60,000 people"). Used to ground CVs and avoid generic claims.

**Story / Story Bank** — A captured accomplishment, written once and reused across CVs, LinkedIn, and interview prep. The Story Bank is the collection of them. The anti-fabrication rule means materials are built from these real stories, not invented.

**Daily action / daily focus** — The single most important next step the product surfaces each day, chosen by the AI agent from the job seeker's pipeline and roadmap.

## The domain

**Role library** — The canonical catalog of career roles the product understands, with their skills and progression. The taxonomy that scoring is built on.

**Skill library** — The canonical catalog of skills, each with a stable ID, that roles and people are described in terms of.

**Role–skill mapping** — Which skills each role requires; the bridge between the role and skill libraries.

**ATS (Applicant Tracking System)** — The software companies use to post jobs and receive applications (Greenhouse, Lever, Comeet, Workday, etc.). Our job database is built by reading jobs from these systems.

**Company registry** — Our catalog of Israeli companies, tagged with which ATS they use and other details. Drives the nightly job refresh.

## The pilot

**Practicum / internship** — A feature surface in the app focused on internship outreach: matching users to companies and helping them pitch for an internship rather than a posted job. ("Practicum" is the name kept for the internship flow.)

**Cohort** — A group of users admitted to the pilot together, gated by invite codes. The June 2026 launch had two: one sourced through Reichman, one a wider invite-based group.

**Pilot gate** — The invite-code system that limits sign-ups to the intended cohort, with a waitlist when the cohort is full.

## The build

**Edge function** — A small piece of server-side code (running on Supabase) that handles AI features — the things a browser can't do safely on its own, like calling a language model.

**RLS (Row-Level Security)** — Database rules that ensure each user can only read and write their own data. The backbone of data privacy here.

**Voice rules** — The writing-style guidelines the AI follows when generating CVs, LinkedIn content, and outreach — what *to* write, so the output sounds human and specific rather than generic.

**The redesign / `rd` tokens** — The current warm, editorial visual language ("Crowz" style). `rd` design tokens (colors, fonts) are the building blocks; see the [design folder](../design/).

---

*Missing a term? Add it here — it's part of keeping the handbook useful.*
