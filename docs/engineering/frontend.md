---
title: Frontend
status: living
owner: shared
last_reviewed: 2026-06-24
code_paths:
  - src/pages
  - src/components
  - src/lib/queries
---

> Carried over from the previous docs/ layout. Content is broadly accurate; a line-by-line review against current code is still pending (see the freshness note at the bottom).

# Component Documentation

Key components, their purpose, and what props they accept across the application.

---

## Active Views and Pages

Pages in `src/pages/` are registered in `src/pages.config.js` and wrapped by `Layout.jsx` automatically (with the exception of auth-bypass pages like `Landing`, `Login`, and `ResetPassword`).

| Page | Route | Purpose |
|------|-------|---------|
| `Home` | `/Home` | User dashboard — showing qualification levels, Track 1 primary roles, missing skill metrics, and execution cards. |
| `Landing` | `/` or `/Landing` | High-converting portal landing page for visitors (auth-bypass). |
| `Jobs` | `/Jobs` | Search listings from direct-ATS scraping, showing match/fit scores computed via local/LLM algorithms. |
| `Roadmap` | `/Roadmap` | Track-classified role list (`track_1` / `track_2` / `track_3` in a 3-track quadrant view) + learning paths. |
| `Tracker` | `/Tracker` | Collapsible cards for job applications, expanding into 9 detailed workflow tabs. |
| `Calendar` | `/Calendar` | Interview and application deadlines calendar scheduler. |
| `Tasks` | `/Tasks` | Weekly task planner with category filters and AI regeneration triggers. |
| `Profile` | `/Profile` | Interactive, drag-and-drop and inline editor for education, work experience, certifications, and portfolio projects. |
| `StoryBank` | `/StoryBank` | STAR method portfolio builder for converting experiences into structured metrics narratives. |
| `Linkedin` | `/Linkedin` | LinkedIn hub featuring post draft generators, outreach draft coaches, and comments optimizers. |
| `Practicum` | `/Practicum` | Faculty and self-sourced internship placement pipeline using a drag-and-drop Kanban interface. |
| `Subagents` | `/Subagents` | Roster dashboard for choosing specialized AI subagents (Interview Coach, CV Agent, etc.). |
| `CareerAgent` | `/CareerAgent` | Direct messaging with the general-purpose Career Coach AI agent. |
| `CVAgent` | `/CVAgent` | Chat with the dedicated AI CV Tailoring subagent. |
| `InterviewCoach` | `/InterviewCoach` | Chat with the specialized Interview Preparation subagent. |
| `SkillDevelopmentAdvisor` | `/SkillDevelopmentAdvisor` | Chat with the dedicated Skill Gaps and learning path AI advisor. |
| `Onboarding` | `/Onboarding` | Multi-step interactive wizard completing profile setups. |
| `Login` | `/login` | Email/password sign-in and sign-up form. |
| `ResetPassword` | `/reset-password` | Two-step password recovery workflow. |
| `Settings` | `/Settings` | User configuration settings, password changes, data resets, and account deletions. |
| `Admin` | `/Admin` | Administrative portal for checking observability costs, metrics, and chat log audits. |

---

## Layout Components

### `Layout.jsx`
The persistent layout container rendered around every view except `Onboarding`, `Landing`, `Login`, and `ResetPassword`.
- Persistent sidebar with main navigation routes.
- Renders user full name directly from cached `profiles` details.
- Hides the sidebar on mobile views, replacing it with an overlay hamburger drawer.

---

## Application Tracker Components

The **Tracker** page uses collapsible application rows which expand to reveal 9 custom workflows.

### `ApplicationRow`
Collapsible application details container.
- **Props:** `app` (application row data object), `onUpdate` (callback to invalidate TanStack Query cache).

| Tab | Component | Purpose |
|-----|-----------|---------|
| Steps | `ApplicationChecklist` | 7-step checklist of milestones. |
| Target Role | Inline | Job details editor + Job Description text area. |
| CV | `CVManagement` | CV name, draft status, and button to trigger `generate-tailored-cv`. |
| Skills | `SkillsRequired` | Compares required JD skills against user skills. |
| Projects | `ProjectsProof` | CRUD list to bind user portfolio projects as proof for required skills. |
| Networking | `NetworkingReferrals` | Referrals contact lists saved to JSONB columns. |
| Application | Inline | Triggers applied date, CV version used, and referral checkboxes. |
| Interview | `InterviewPrep` | Interview questions and preparation notes. |
| Follow-Up | `FollowUp` | Follow-up tracking dates and reminders. |

---

## Practicum / Kanban Components

### `CompanyTargetsKanban`
Renders target internship applications across five workflow columns (`Wishlist`, `Contacted`, `Interviewing`, `Placed`, `Rejected`) using drag-and-drop.
- Utilizes `@hello-pangea/dnd` for smooth reordering.
- Employs optimistic React Query mutations and automatic cache rollbacks if database writes fail.

### `CompanyTargetDrawer`
Sliding Sheet sidebar presenting internship details. Includes an **"Open in Outreach Coach"** trigger that seeds outreach query parameters (`?prefillCompany=&prefillRole=`) to the LinkedIn page.

---

## Story Bank Components

### `StoryEditor`
Form interface for editing STAR narratives (Situation, Task, Action, Result) with an active AI reviewer button that verifies metric outcomes and extracts demonstrated skills.

---

## Onboarding Wizard Components (`src/components/onboarding/`)

The onboarding wizard is a 9-step wizard (0-indexed). It tracks local wizard state and upserts details to `profiles` and child tables (such as `education` and `experiences`) using the `cleanProfilePayload` method to filter client-only variables.

| Component | Step | Focus / Inputs |
|-----------|------|----------------|
| `StepResumeUpload` | 0 | Parser for PDF uploads, extracting profile structures using `ai-chat`. |
| `StepEducation` | 1 | Academic degrees, institution names, GPAs, and modules. |
| `StepPracticum` | 2 | Faculty-provided vs self-sourced placement track choice. |
| `StepExperience` | 3 | Historical employment, internship, and military positions. |
| `StepSkills` | 4 | Categorized skills inputs using autocomplete inputs. |
| `StepCareerDirection`| 5 | Stated five-year roles, preferred environments, and GTM scopes. |
| `StepConstraints` | 6 | Desired locations, salary ranges, and start dates. |
| `StepSurvey` | 7 | Qualitative challenges and job search effort contexts. |
| `OnboardingTutorial` | 8 | Paced 6-slide overview carousels displaying tool walkthroughs (skip gate included). |

---

## UI Components (`src/components/ui/`)

Pre-configured shadcn/ui components wrapper built on Radix UI headless structures. Styled with Vanilla Tailwind classes. Do not modify these files manually; generate additions via:
```bash
npx shadcn@latest add [component-name]
```
Key components: `Button`, `Dialog`, `Progress`, `Input`, `Textarea`, `Tabs`, `Card`, `Checkbox`, `Badge`.
