# Components

Key components, their purpose, and what props they accept.

---

## Pages

Pages live in `src/pages/` and are registered in `src/pages.config.js`. They are wrapped by `Layout.jsx` automatically.

| Page | Route | Purpose |
|------|-------|---------|
| `Home` | `/Home` | Dashboard — qualification level, tier 1 role, skill match, execution stats |
| `CareerRoadmap` | `/CareerRoadmap` | Tier-classified role list + progress visualisation + learning paths |
| `Tracker` | `/Tracker` | Application tracker with 7-step workflow per application |
| `Calendar` | `/Calendar` | Interview and deadline calendar |
| `Tasks` | `/Tasks` | AI-generated weekly action item list with category filter |
| `Subagents` | `/Subagents` | AI subagent selector (CV Agent, Interview Coach, etc.) |
| `CareerAgent` | `/CareerAgent` | Direct chat with the Career Coach agent |
| `Resources` | `/Resources` | Static accordion guides on job searching |
| `AddInformation` | `/AddInformation` | Add/edit experiences, certifications, projects |
| `JobSuggestions` | `/JobSuggestions` | Job board suggestions |
| `Onboarding` | `/Onboarding` | Multi-step profile setup wizard (8 steps) |
| `Login` | `/login` | Email/password auth |

---

## Layout

### `Layout.jsx`

The persistent sidebar wrapper rendered around every page except Onboarding.

- Sidebar with nav links defined in `NAV_ITEMS`
- Mobile hamburger menu with overlay
- `TopLoadingBar` that fires on route change
- Hides itself entirely on the Onboarding page

**Props:** `children`, `currentPageName` (string — used to highlight active nav item)

---

## Tracker Components

The Application Tracker is the most complex feature. An `ApplicationRow` expands into 9 tabs.

### `ApplicationRow`

**Props:** `app` (application row object), `onUpdate` (callback to invalidate React Query cache)

Renders a collapsible row. Tabs:

| Tab | Component | Purpose |
|-----|-----------|---------|
| Steps | `ApplicationChecklist` | 7-step checklist |
| Target Role | inline | Role info + job description textarea |
| CV | `CVManagement` | CV name, status, AI generation |
| Skills | `SkillsRequired` | Skill gap tracking for the role |
| Projects | `ProjectsProof` | Projects linked to skill gaps |
| Networking | `NetworkingReferrals` | Contact tracking for referrals |
| Application | inline | Applied date, CV version, referral checkbox |
| Interview | `InterviewPrep` | Interview notes and prep |
| Follow-Up | `FollowUp` | Post-interview follow-up tracking |

### `CVManagement`

**Props:** `app`, `onUpdate`

Manages CV version name and status. The "Generate CV" button calls the `generateTailoredCV` Edge Function with `target_role`, `job_description`, and `application_id`. On success, the `cv_url` and `cv_status` fields on the application row are updated, and a signed download URL is returned.

### `NetworkingReferrals`

**Props:** `app`, `onUpdate`

CRUD for networking contacts tied to an application. Saves to `applications.networking_contacts` (jsonb).

### `ProjectsProof`

**Props:** `app`, `onUpdate`

CRUD for projects that prove skills required by the application. Saves to `applications.projects_proof` (jsonb).

---

## Dashboard Components

### `JobMatchChecker`

**Props:** `profile`, `experiences`

Returns match score and skill analysis based on a pasted job description or URL. Calls the `analyze-job-match` Edge Function.

### `SkillGapCourses`

**Props:** `skillGaps` (string[])

Displays course recommendations for identified skill gaps by calling the `generate-learning-paths` Edge Function.

---

## Roadmap Components

### `RoleCard`

**Props:** `role` (career_roles row), `onTrack` (callback)

Displays a single career role with tier badge, readiness score, skill gap summary, and a "Track This Role" button that creates an application entry.

### `ProgressVisualization`

**Props:** `profile`, `roles`, `experiences`, `courses`, `certifications`

Card showing overall career readiness percentage and per-track readiness bars. Calculated client-side from existing data.

### `LearningPaths`

**Props:** `skillGaps` (string[]), `targetRole` (string)

Displays a learning path for closing skill gaps. Calls the `generate-learning-paths` Edge Function.

---

## Chat Components

### `ChatInterface`

**Props:** `agentName`, `title`, `description`

Reusable chat UI with message history, typing indicator, and send button. Calls the `ai-chat` Edge Function via `supabase.functions.invoke`. The full conversation history including the current user message is captured before the API call — the `updatedMessages` array is built from state before `setMessages` is called, so the Edge Function always receives the complete and current history.

```js
const userMsg = { role: "user", content: text };
const updatedMessages = [...messages, userMsg];
setMessages(updatedMessages);
// updatedMessages (not messages) is sent to the Edge Function
```

### `MessageBubble`

**Props:** `message` (object with `role`, `content`)

Renders a single chat message. Supports markdown via `react-markdown`. If the message content looks like a CV (contains specific headings), shows a "Download CV as PDF" button using `jsPDF`.

---

## Onboarding Components

The onboarding wizard is managed by `src/pages/Onboarding.jsx`. Steps are 0-indexed. Each step is a separate component in `src/components/onboarding/`.

| Component | Step | Collects |
|-----------|------|---------|
| `StepResumeUpload` | 0 | CV file upload (parsed via `ai-chat`), LinkedIn URL, employment status |
| `StepEducation` | 1 | Degree, field of study, GPA, relevant coursework |
| `StepExperience` | 2 | Work history entries |
| `StepSkills` | 3 | Skills categorised by type (hard, tools, technical, analytical, communication, leadership) |
| `StepCareerDirection` | 4 | Target job titles, 5-year goal, target industries, work environment preferences |
| `StepConstraints` | 5 | Location, work type, salary expectation, available start date |
| `StepSurvey` | 6 | Additional context for AI analysis (biggest challenge, job search efforts, etc.) |
| `StepTierReveal` | 7 | AI-generated track analysis reveal + platform initialisation (tasks generated here) |

### StepResumeUpload notes

- The CV upload parses the file and sends it to the `ai-chat` Edge Function to extract structured profile data, which pre-fills subsequent steps.
- The "Connect with LinkedIn" button is intentionally non-functional. The UI is preserved for a future LinkedIn OAuth integration.
- JSON extraction from the AI response uses a guarded two-attempt parse: direct parse first, then a double-escape unescape only if the JSON looks double-escaped (detected by `/\{\s*\\"/.test(...)`).

### StepTierReveal notes

This step triggers two sequential operations:

1. `generate-career-analysis` Edge Function — generates track-classified roles, writes them to `career_roles`, and updates `qualification_level`, `overall_assessment`, `skill_gaps` on the profile.
2. `generate-tasks` Edge Function — called inside `handleFinalise`, generates the initial weekly task plan and writes it to `tasks`.

Both use the insert-before-delete pattern to avoid data loss mid-write.

### `OnboardingShell`

Wrapper component providing the progress bar and step navigation chrome. Step components render inside it.

---

## UI Components (`src/components/ui/`)

These are **shadcn/ui** components — generated wrappers around Radix UI primitives. Do not edit them manually. To add a new shadcn component:

```bash
npx shadcn@latest add [component-name]
```

Key components in use: `Button`, `Input`, `Textarea`, `Select`, `Dialog`, `Card`, `Badge`, `Checkbox`, `Progress`, `Tabs`.

---

## GlobalErrorBoundary

`src/components/GlobalErrorBoundary.jsx` wraps the entire app in `main.jsx`. Catches unhandled React render errors and shows a fallback UI with an error message. Logs to `console.error`.

---

## Error State Conventions

Pages must distinguish between three distinct states and render each differently:

| State | Cause | Correct UI |
|-------|-------|------------|
| Loading | Query in flight | Spinner / skeleton |
| Error | Query threw (network failure, server error) | Full error screen or banner with "Refresh" prompt |
| Empty | Query succeeded, returned zero rows | Empty state prompt (e.g., "Generate your roadmap to get started") |

**Never render an empty state when `isError` is true.** The following pages implement this correctly:

- `Home.jsx` — shows a red banner if `career_roles` or `applications` query fails
- `Tasks.jsx` — shows a full error screen (not the empty state) if the tasks query fails
- `CareerRoadmap.jsx` — shows a full error screen if the roles query fails
