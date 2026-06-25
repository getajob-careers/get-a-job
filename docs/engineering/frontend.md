---
title: Frontend
status: living
owner: shared
last_reviewed: 2026-06-25
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
| `Career` | `/Career` | The live jobs page: real open roles filtered to the user's tracks, each with a match score (the Jobs to Career consolidation). |
| `Jobs` | `/Jobs` | Legacy jobs listing, superseded by Career. |
| `Roadmap` | `/Roadmap` | Track-classified role list (`track_1` / `track_2` / `track_3` in a 3-track quadrant view) + learning paths. |
| `Tracker` | `/Tracker` | Collapsible cards for job applications, expanding into 9 detailed workflow tabs. |
| `Calendar` | `/Calendar` | Interview and application deadlines calendar scheduler. |
| `Tasks` | `/Tasks` | Weekly task planner with category filters and AI regeneration triggers. |
| `Profile` | `/Profile` | Interactive, drag-and-drop and inline editor for education, work experience, certifications, and portfolio projects. |
| `StoryBank` | `/StoryBank` | STAR method portfolio builder for converting experiences into structured metrics narratives. |
| `Linkedin` | `/Linkedin` | LinkedIn hub featuring post draft generators, outreach draft coaches, and comments optimizers. |
| `Internship` | `/Internship` | Internship outreach pipeline using a drag-and-drop Kanban interface (formerly Practicum). |
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
| `AdminLaunch` | `/AdminLaunch` | Admin launch and utility console. |
| `Privacy` | `/privacy` | Public privacy policy (auth-bypass). |
| `Terms` | `/terms` | Public terms of service (auth-bypass). |
| `TrackerRedirect` | n/a | Redirect helper for legacy tracker routes. |

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

## Internship / Kanban Components

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

The onboarding wizard runs 7 steps (0-indexed), driven by `STEP_NAMES` in `src/pages/Onboarding.jsx`. Steps 0 to 5 capture data inside `OnboardingShell`; step 6 is a post-flow tutorial rendered full-screen outside the shell, so it is not counted as a data-capture step. The flow was shortened from an earlier, longer version: the separate education, experience, and skills steps were consolidated into one review step, and the old "Your Roles" reveal page was replaced by the tutorial.

| Component | Step | Focus / Inputs |
|-----------|------|----------------|
| `StepResumeUpload` | 0 | CV upload. Text extraction is server-side via the `extract-cv-text` edge function. Also captures employment status. |
| `StepReview` | 1 | Review and edit the profile parsed from the CV: education, experience, skills, projects, and certifications, in one consolidated screen. |
| `StepInternship` | 2 | Internship path choice (faculty-provided, self-sourced, or none). |
| `StepCareerDirection` | 3 | Five-year target role, target titles, industries, and work environment. |
| `StepConstraints` | 4 | Location, start date, and work type. |
| `StepSurvey` | 5 | Self-assessment questions. Triggers the career analysis. |
| `OnboardingTutorial` | 6 | Post-flow tutorial carousel (full-screen, with a skip gate). Not a data-capture step. |

---

## UI Components (`src/components/ui/`)

Pre-configured shadcn/ui components wrapper built on Radix UI headless structures. Styled with Vanilla Tailwind classes. Do not modify these files manually; generate additions via:
```bash
npx shadcn@latest add [component-name]
```
Key components: `Button`, `Dialog`, `Progress`, `Input`, `Textarea`, `Tabs`, `Card`, `Checkbox`, `Badge`.
