---
title: Get A Job — Handbook
status: living
owner: shared
last_reviewed: 2026-06-25
---

# Get A Job — Handbook

Welcome. This is the home for everything about **Get A Job** — what it is, who it's for, how it works, and how we build it. It's written to be read by anyone on the team, not just engineers. If you're new, start at the top and read down; if you're looking for something specific, use the map below.

> Get A Job is an AI career operating system for any career seeker, whether you are just starting out, hunting a new role, between jobs, or working to strengthen where you already stand. It adapts to you: it turns your real experience into a structured, momentum-driven job hunt, scores roles you can actually land, tailors a CV per job, keeps everything in one place, and coaches you with AI in your corner. The pilot launched in June 2026 with its first cohorts of real users, the beachhead for a product built to fit anyone.

---

## Where do I start?

**👋 New to the project (any role)**
[What Get A Job is](overview/what-is-getajob.md) → [How it works](overview/how-it-works.md) → [Glossary](overview/glossary.md). Twenty minutes and you'll understand the whole product.

**🧑‍💻 Picking up the code**
The above, then [Engineering → Setup](engineering/setup.md) and [Engineering → Architecture](engineering/architecture.md). The whole technical section lives under [`engineering/`](engineering/).

**🧭 Working on the product / strategy side**
[How it works](overview/how-it-works.md) → [Feature tour](product/features.md) → [The matching philosophy](product/matching-philosophy.md) → [The Israeli market](domain/israeli-market.md).

**🤝 Joining the team as a contributor**
[How we work](team/workflow.md) covers branches, reviews, and the rhythm. [The roadmap](../ROADMAP.md) is what's happening now.

---

## The map

### Overview — the big picture, in plain English

| Doc                                              | What it covers                                                      |
| ------------------------------------------------ | ------------------------------------------------------------------- |
| [What Get A Job is](overview/what-is-getajob.md) | The product, who it's for, the problem it solves, where it is today |
| [How it works](overview/how-it-works.md)         | The full user journey, start to finish, no jargon                   |
| [The Israeli market](domain/israeli-market.md)   | Why this market, the pilot, the domain context                      |
| [Glossary](overview/glossary.md)                 | Every term we use — tracks, proof signals, qualification, and more  |

### Product — how each piece works

| Doc                                                       | What it covers                                            |
| --------------------------------------------------------- | --------------------------------------------------------- |
| [Feature tour](product/features.md)                       | Every feature, what it does, and why it exists            |
| [The matching philosophy](product/matching-philosophy.md) | How we decide which jobs fit — the thinking, not the code |

### Domain — the knowledge base

| Doc                                                     | What it covers                           |
| ------------------------------------------------------- | ---------------------------------------- |
| [Roles, skills & tracks](domain/roles-skills-tracks.md) | The career taxonomy that drives matching |
| [The Israeli market](domain/israeli-market.md)          | Companies, ATS landscape, market context |

### Engineering — the technical section (contained)

| Doc                                                         | What it covers                            |
| ----------------------------------------------------------- | ----------------------------------------- |
| [Setup](engineering/setup.md)                               | Get it running locally                    |
| [Architecture](engineering/architecture.md)                 | The stack and how the pieces connect      |
| [Data model](engineering/data-model.md)                     | The database, key tables, RLS             |
| [Auth](engineering/auth.md)                                 | Sign-in, sessions, the pilot gate         |
| [Frontend](engineering/frontend.md)                         | Pages, components, data-fetching patterns |
| [AI & edge functions](engineering/ai-and-edge-functions.md) | The LLM layer, prompts, model routing     |
| [Scoring internals](engineering/scoring-internals.md)       | How the matching math actually works      |

### Team — how we work

| Doc                                     | What it covers                      |
| --------------------------------------- | ----------------------------------- |
| [Workflow](team/workflow.md)            | Branches, PRs, reviews, the cadence |
| [Decisions (ADRs)](decisions/README.md) | Why we built things the way we did  |
| [Lessons](../tasks/lessons.md)          | Hard-won lessons, append-only       |

### Operations — running & fixing it

| Doc                                    | What it covers                                       |
| -------------------------------------- | ---------------------------------------------------- |
| [Deployment](operations/deployment.md) | Shipping frontend, edge functions, migrations        |
| [Runbooks](operations/runbooks.md)     | When something breaks: known failure modes and fixes |

### Meta — keeping these docs honest

| Doc                                                | What it covers                                                    |
| -------------------------------------------------- | ----------------------------------------------------------------- |
| [Documentation guide](meta/documentation-guide.md) | How docs stay current (owners, review dates, the freshness check) |

### Reference library — deeper background (slow-changing)

| Where                                                                                           | What                                                                                      |
| ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| [`design/`](design/)                                                                            | The visual design system, locked page mockups, and preview PDFs                           |
| [`research/`](research/)                                                                        | Source-of-truth research: LinkedIn performance, CV & chat bake-offs, job-channel research |
| [`strategy/`](strategy/)                                                                        | Design strategy and tooling/installation roadmaps                                         |
| [`testing.md`](testing.md) · [`libraries-integration-guide.md`](libraries-integration-guide.md) | Standalone technical references                                                           |
| [`archive/`](archive/)                                                                          | Old session notes — historical, never updated                                             |

---

## Top-level docs (at the repo root)

A few docs live at the root because tools and habits expect them there:

- **[README.md](../README.md)** — the 60-second project readme (setup, scripts).
- **[CLAUDE.md](../CLAUDE.md)** — conventions and rules, read by Claude Code every session.
- **[ROADMAP.md](../ROADMAP.md)** — what's done, in progress, and next.
- **[PROJECT_INSTRUCTIONS.md](../PROJECT_INSTRUCTIONS.md)** — legacy long-form notes, being folded into this handbook and slated for retirement.

---

_Every living doc here shows an owner and a "last reviewed" date, and is checked for staleness by `npm run docs:check`. See the [documentation guide](meta/documentation-guide.md) for how that works. If you find something out of date, fixing it is part of the change that made it stale — not a separate chore._
