# Page port — kickoff proposal (2026-07-17)

The design system is locked (`canvas-tokens.md`: Yishai palette, greige+grain
ground, always-on MEDIUM treatment, scales, elevation). This is the **investigation

- proposal** for moving the real product onto it. **Nothing is restyled here.**
  Eli approves the order and answers the open questions (end of doc) before any
  restyle begins.

Inventory enumerated from **code** (router, `src/components/`, `supabase/functions/`),
not memory — six parallel sweeps. The feasibility-first rule governs the port:
read the real implementation of each surface before restyling it; restyle the real
thing, never reinterpret from the name.

**Design-state legend** (what each surface is on TODAY):

- **CANVAS** — a Yishai reskin already exists as a `_preview/canvas/*` clone.
- **RD** — on the current `--rd-*` token system (ports via the token swap; the old
  cream/coral values, not Yishai — a token swap re-skins it globally).
- **LEGACY** — hardcoded hex / slate / inline styles; NOT even on `--rd-*`. Needs a
  real restyle, not just a token swap.
- **STATIC** — content page, minimal chrome.

---

# PART A — FULL SURFACE INVENTORY

Every user-visible surface, from code. Admin/internal surfaces are listed but
flagged out-of-scope. Sizes: S <150 / M 150–400 / L 400–900 / XL >900 lines.

## A1. App shell / Layout (wraps every authenticated page)

| Surface                           | File                                                        | Size    | State     | Notes                                                                                                                                                                                                                          |
| --------------------------------- | ----------------------------------------------------------- | ------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Layout shell + sidebar**        | `src/Layout.jsx`                                            | L (463) | RD        | Nav tree: **Today**→Home, **Career**, **Chat** group (Career Agent / CV Agent / Interview Coach / Skill Advisor), **Internship** (conditional on `practicum_path`), **Profile**. No desktop topbar. Active = coral dot + tint. |
| **Sidebar footer**                | `components/layout/SidebarFooter.jsx`                       | S (84)  | RD        | Avatar (→ Settings, NOT a menu), name/email, logout, "About" → /Landing.                                                                                                                                                       |
| **Coach dock**                    | `components/agent/CoachDock.jsx`                            | S (83)  | RD→CANVAS | Inset card in sidebar dead-space; expand → AgentDrawer. Canvas clone exists (`CanvasCoachDock`).                                                                                                                               |
| **Agent drawer (expanded coach)** | `components/agent/AgentDrawer.jsx`                          | M (110) | RD        | Desktop right panel 520px / mobile bottom sheet 85vh. `CoachThread` (~large) + `CoachInput`.                                                                                                                                   |
| **Mobile header + coach trigger** | in `Layout.jsx` + `components/agent/MobileCoachTrigger.jsx` | S (26)  | RD        | `lg:hidden` header: hamburger + coral "Coach" chip + centered BrandMark.                                                                                                                                                       |

**Shell findings that correct the handoff:**

- The production nav is **already slimmed** (Today / Career / Chat-group / Internship / Profile) — it is NOT the old full nav, and NOT the canvas toolkit-rail. The canvas's 8-tool carousel is a **different IA** that must be reconciled (Q3).
- **Mobile coach already exists** (MobileCoachTrigger chip → AgentDrawer bottom sheet). The handoff's "mobile coach missing" is stale; what's missing is a _persistent_ mobile dock, not a coach. There's a **breakpoint inconsistency**: sidebar/header use `lg` (1024px), AgentDrawer uses 768px — 768–1024px shows the mobile header but the desktop drawer.
- **Latent nav bug:** the conditional Internship section targets a `pipeline` section id that no longer exists, so it appends _after_ Profile instead of between Career and Profile. Flag for the shell port.

## A2. Onboarding (front door) — a 7-index machine (0–6), shown as "of 6"

| Idx | Step                   | File                                 | Size     | State | Collects                                                                                                               |
| --- | ---------------------- | ------------------------------------ | -------- | ----- | ---------------------------------------------------------------------------------------------------------------------- |
| 0   | Resume upload          | `onboarding/StepResumeUpload.jsx`    | XL (811) | RD    | CV PDF/DOCX upload → server extract → pre-fill. LinkedIn path.                                                         |
| 1   | **Review**             | `onboarding/StepReview.jsx`          | XL (894) | RD    | One page collapsing Education/Experience/Projects/Certs/Skills. **Structured dates live here** (Education hard-gated). |
| 2   | Internship gate        | `onboarding/StepInternship.jsx`      | M (144)  | RD    | `practicum_path` (faculty/self/none).                                                                                  |
| 3   | Career direction       | `onboarding/StepCareerDirection.jsx` | L (396)  | RD    | Structured role pick (183-role library).                                                                               |
| 4   | Constraints            | `onboarding/StepConstraints.jsx`     | M (122)  | RD    | Location autocomplete + work_type multi-select.                                                                        |
| 5   | Reality check (survey) | `onboarding/StepSurvey.jsx`          | M (273)  | RD    | 3 self-assessment questions.                                                                                           |
| 6   | Tutorial               | `onboarding/OnboardingTutorial.jsx`  | L (564)  | RD    | 6-slide carousel, rendered OUTSIDE the shell; drives finalise pipeline.                                                |
| —   | Shell/progress         | `onboarding/OnboardingShell.jsx`     | S (103)  | RD    | Chrome + progress bar.                                                                                                 |

Steps already consume the `redesign/Rd*` primitives (RdSkillTagInput, RdButton,
RdAutocompleteInput…), so onboarding reskins largely _through_ the shared-primitive
port. Heavy write logic (debounced auto-save, snapshot-rollback inserts) — **restyle
is presentational-only; do not touch the write paths** (multiple past data-loss
incidents live in this file per `tasks/lessons.md`).

## A3. Core product pages

| Page               | File                                                    | Size      | State     | What the user sees / composes                                                                                                                                                              |
| ------------------ | ------------------------------------------------------- | --------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Home** ("Today") | `pages/Home.jsx`                                        | XL (1024) | RD        | Dashboard: progress ring, stat blocks, today's plan, quick tiles, **funnel tiles + pipeline exceptions**, coach band. Full skeleton + self-heal.                                           |
| **Career**         | `pages/Career.jsx`                                      | XL (1011) | RD→CANVAS | Job-search tab (`UnifiedJobsFeed` + matched-roles panel) / Pipeline tab (funnel + kanban + drawers). The **canvas Home3Tab is a redesign of this surface**. Custom md+ fixed-shell scroll. |
| **Jobs**           | `pages/Jobs.jsx`                                        | S (24)    | —         | Pure redirect → /Career. No surface.                                                                                                                                                       |
| **Roadmap**        | `pages/Roadmap.jsx`                                     | L (650)   | RD        | Qualification band + track tabs + `RoleCard` list + `TrackQuadrantGrid`. The **matched-roles panel** (canvas `?roadmap=lab`, PENDING Eli) is the same data.                                |
| **Profile**        | `pages/Profile.jsx`                                     | XL (1383) | RD        | 6-tab editor (Profile/Education/Goals/Self-assessment/Projects/Experience). **Structured dates** (experience/education). Skill aggregation — cache-poisoning risk (see lessons).           |
| **Story bank**     | `pages/StoryBank.jsx`                                   | L (559)   | RD        | Filter chips + `StoryCard` list + create/edit modals + FAB.                                                                                                                                |
| **CV studio**      | `pages/CVAgent.jsx` (12) → `cv-studio/CVStudioLive.jsx` | XL (950)  | RD        | Editable CV studio: master + tailored CVs, inline edit/autosave, chat-edit, PDF render. The real surface is the child.                                                                     |
| **Career agent**   | `pages/CareerAgent.jsx`                                 | M (143)   | RD        | `AgentIntro` + app-scope picker + `ChatInterface`.                                                                                                                                         |

## A4. Toolkit tools + secondary user pages

| Page                          | File                                | Size    | State | Notes                                                                                                                                                  |
| ----------------------------- | ----------------------------------- | ------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Interview coach** (toolkit) | `pages/InterviewCoach.jsx`          | S (124) | RD    | AgentIntro + picker + ChatInterface.                                                                                                                   |
| **Skill hub** (toolkit)       | `pages/SkillDevelopmentAdvisor.jsx` | S (39)  | RD    | Thin ChatInterface wrapper. Copy caveat (feasibility audit): descriptor oversells.                                                                     |
| **Tasks** (toolkit)           | `pages/Tasks.jsx`                   | L (518) | RD    | Task rows + inline **due-date picker** + generate. Full states.                                                                                        |
| **LinkedIn** (toolkit)        | `pages/Linkedin.jsx`                | S (95)  | RD    | 3 sub-tabs (Profile/Posts/Networking) — each a `components/linkedin/*` component with its own surface (large; not separately enumerated — a sub-port). |
| **Calendar**                  | `pages/Calendar.jsx`                | L (641) | RD    | Month/Week/Day grids + `AddEventDialog` (**native date input**).                                                                                       |
| **Internship**                | `pages/Internship.jsx`              | L (408) | RD    | Pipeline/Browse; company kanban + drawers + browse panel + dedicated empty-states. Gated to practicum users.                                           |
| **Settings**                  | `pages/Settings.jsx`                | M (219) | RD    | Password (`PasswordCard`), reset-onboarding, delete-account (typed-phrase).                                                                            |
| **Resources**                 | `pages/Resources.jsx`               | M (309) | RD    | Static accordion of 8 guides + `NetworkingPrinciples`.                                                                                                 |

## A5. Auth & public surfaces (the front door — seen logged-out)

| Surface                      | File                                    | Size     | State      | Notes                                                                                                                                                                                                                                                                         |
| ---------------------------- | --------------------------------------- | -------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Login / Signup / Forgot**  | `pages/Login.jsx`                       | XL (527) | RD         | ONE component, `mode` = signin/signup/forgot (URL-driven). No separate signup route. States: Google OAuth, email form, password checklist, consent, Turnstile, **"check your email"** confirm banner, forgot-success, deleted/oauth-error banners, loading/verifying-captcha. |
| **Reset password** (set new) | `pages/ResetPassword.jsx`               | M (102)  | **LEGACY** | Set-new-password only. **No expired-link state** (stuck on "Verifying…"). Un-ported hex.                                                                                                                                                                                      |
| **OAuth callback**           | `pages/AuthCallback.jsx`                | S (74)   | RD         | Full-screen spinner; all outcomes redirect.                                                                                                                                                                                                                                   |
| **Change password**          | `account/PasswordCard.jsx`              | L (216)  | RD         | 3-step (compose/verify-OTP/done) inside Settings.                                                                                                                                                                                                                             |
| **Password requirements**    | `account/PasswordRequirements.jsx`      | S (37)   | RD         | Shared 5-rule checklist.                                                                                                                                                                                                                                                      |
| **Privacy**                  | `pages/Privacy.jsx`                     | L (270)  | RD/STATIC  | Renders `content/privacy-policy.md`.                                                                                                                                                                                                                                          |
| **Terms**                    | `pages/Terms.jsx`                       | L (224)  | RD/STATIC  | Hand-authored, 15 sections.                                                                                                                                                                                                                                                   |
| **404**                      | `lib/PageNotFound.jsx`                  | M (66)   | **LEGACY** | slate-*; catch-all. Admin sub-note.                                                                                                                                                                                                                                           |
| **Route/chunk fallback**     | `components/RouteFallback.jsx`          | M (116)  | **MIXED**  | Skeleton = RD; "couldn't load, reload" error UI = LEGACY hex.                                                                                                                                                                                                                 |
| **App-crash boundary**       | `components/GlobalErrorBoundary.jsx`    | M (120)  | **LEGACY** | Inline-style dark-slate/indigo. Wraps the whole app.                                                                                                                                                                                                                          |
| **Access restricted**        | `components/UserNotRegisteredError.jsx` | S (31)   | **LEGACY** | **0 imports — likely dead** (Q6).                                                                                                                                                                                                                                             |
| **Cookie consent**           | `consent/CookieConsentBanner.jsx`       | —        | RD?        | On every route.                                                                                                                                                                                                                                                               |
| **Feedback widget**          | `feedback/FeedbackWidget.jsx`           | —        | RD         | Floating, all authed routes.                                                                                                                                                                                                                                                  |

## A6. Shared components (ported before the pages that compose them)

- **Cards:** `jobs/JobCard` (x4), `jobs/JobGridCard` (x4), `roadmap/RoleCard`,
  `storyBank/StoryCard`, `profile/EntityCard`, `internship/CompanyTargetCard` +
  browse card, `redesign/RdCard` (base surface, x4), `redesign/RdFunnelTile` (x3),
  chat save-cards (`AddSkillCard`/`BulletSaveCard`/`StorySaveCard`). **Canvas clones
  exist** for job card, funnel tile, score ring, chip.
- **Modals / drawers:** `jobs/JobDetailModal` (x6 — most-reused), `agent/AgentDrawer`
  (x5), `tracker/ApplicationDetailDrawer` (x5), `tracker/AddApplicationDialog`,
  `internship/*Drawer`/`AddOwnCompanyModal`, `calendar/AddEventDialog`.
- **Toasts / banners:** shadcn toaster + sonner (App-level), `CookieConsentBanner`,
  `FeedbackWidget`, **`ui/GeneratingBanner` (x4) — FLAG: raw amber, not `rd-*`**,
  `ui/alert`.
- **Empty / loading / error:** `internship/EmptyStates` (the only dedicated empty-
  state module — everything else inlines), `ui/skeleton` (widely consumed),
  `ui/TopLoadingBar`, `cv-studio/CvGenerationProgress`, the 3 error boundaries.
- **Chips / badges — FLAG: not centralized.** 6+ bespoke inline chip/pill helpers
  (`JobCard.MetaChip`, `RoleCard.TrackBadge`, `CompanyBrowseCard.ScoreChip`, …);
  `jobs/AgencyBadge` (self-deferred styling); `ui/badge` barely used. The canvas
  already has a shared `CanvasChip` primitive to generalize from.
- **Forms / inputs:** `ui/*` primitives; skill/autocomplete/preset inputs exist as
  BOTH `onboarding/*` and `redesign/Rd*` variants. **No shared date component** —
  native `<input type="date">` in StepReview, ApplicationRow, AddEventDialog.
- **51 shadcn `ui/*` primitives** (button, dialog, select, table, tabs, …) — these
  read `--rd-*` where themed; the token swap carries most of them.

## A7. Edge-function user-visible output (outside the React app)

| Output                      | Function(s)                                                               | State                             | Port implication                                                                                                                                                         |
| --------------------------- | ------------------------------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Welcome email**           | `send-welcome-email` (Resend)                                             | plain-text, minimal branding      | Optional: upgrade to branded HTML — a _new_ deliverable, not a restyle.                                                                                                  |
| **Generated CV PDF**        | `generate-tailored-cv`, `render-cv` → `_shared/cv-templates/build-pdf.ts` | **heavily branded, own identity** | Dark-slate banner + cream page + **5 accent templates**. **Dual-sourced** (mirrors `cv-studio/cvTemplates.js`, harness-gated) — any change hits both. **Decision (Q2).** |
| Auth emails (reset/confirm) | Supabase Dashboard templates                                              | not in codebase                   | Configured in Supabase console, not portable from code. Note for completeness.                                                                                           |

No HTML responses, no hosted pages, no other user-visible edge output.

## A8. Landing (special case)

`src/pages/_preview/LandingV2Preview.jsx` — **XL (3783)**, LIVE at `/`. A
self-contained marketing site: its own inline CSS system (`lv-*`), own font/color
vars, a 70px scroll-receding hero, Lenis smooth-scroll + snap, an interactive
drop-zone, an orbit/cycle animation, SEO schema (Organization + FAQ), canonical
URL. **Its own visual identity, deliberately not app chrome.** Decision (Q1).

## A9. Internal / admin (OUT of the user-facing port scope — listed for completeness)

`pages/Admin.jsx` (XL, admin-gated), `pages/AdminLaunch.jsx` (L, admin-gated),
`pages/Subagents.jsx` (legacy off-nav router). All on **hardcoded hex**, self-
contained, admin/internal. Recommend: leave as-is or a minimal token pass only.

---

# PART B — PORT PROPOSAL

## B1. Recommended order (what unblocks what)

The port is a dependency graph: **foundation → shell chrome → shared components →
front-door surfaces → pages → system/auth → decisions**. Reasoning after each.

**Phase 0 — Foundation (tokens + CSS + ground).** _Unblocks everything._
Swap `index.css` `:root` from the old cream/coral to the **Yishai greige base with
the MEDIUM values baked in** (the canvas applies them as a separate always-on
layer; production just merges them into `:root` — one set of final values, no
"amplitude layer" concept). Adopt `scale.css` / `elevation.css` / `amplitude.css`
(grain + the kanban-label bump), load **Archivo** for the logotype, and apply the
**grain + `isolate` ground** to the app-shell root. **Risk: the `isolate` stacking-
context requirement** (canvas-tokens.md ground spec) — the shell's ground layers
silently vanish without it; verify by pixel-diff, per the recorded trick. Lowest
risk, highest leverage: every downstream surface inherits the reskin.

**Phase 1 — Constraints re-verify.** Re-run the band-AA + ring low-fill floor
against the ported tokens (`audit-palettes` logic, now Yishai). Cheap, high-value.

**Phase 2 — App-shell VISUAL reskin.** The sidebar, coach dock, mobile header,
footer. _Every authenticated page immediately sits in the new chrome_, so this goes
before the pages. **Split from the IA restructure** (the toolkit-rail question,
Q3) — do the low-risk visual reskin now; defer the nav-model change until Eli
decides. Fix the two shell bugs found (Internship append-order; 768/1024
breakpoint split).

**Phase 3 — Shared components.** _Before the pages that compose them._ In canvas
order: **chip primitive** (centralize the 6 bespoke chips), **job card**, **kanban**,
**funnel tile**, **score ring**, **coach dock/drawer**, **GeneratingBanner** (kill
the amber), the **NEW shared structured-date component** (see B5), badges. Most are
already cloned in the canvas. Pages downstream get most of their reskin for free.

**Phase 4 — Onboarding (front door, EARLY).** After foundation + shared primitives
(it consumes `Rd*`). Presentational-only — do not touch the write paths. The
structured-date component lands in StepReview here.

**Phase 5 — Auth + system surfaces (front door, seen logged-out).** Login reskin,
and **port-from-legacy** the un-ported ones: ResetPassword, 404, RouteFallback
error UI, GlobalErrorBoundary. These need _real_ restyles (not token swaps) and
are seen by everyone — worth doing before the deep app pages. Add the missing
expired-link state on ResetPassword while there.

**Phase 6 — Core pages.** Home, Career, Roadmap, Profile, StoryBank, CV studio,
chat agent pages. Career + Home are the biggest (they compose funnel/kanban/feed/
cards from Phase 3, so they largely inherit); the matched-roles panel (`?roadmap=lab`,
PENDING) integrates into Career's right rail here.

**Phase 7 — Toolkit tools + secondary.** Tasks, LinkedIn (a sub-port — 3 tab
components), Interview coach, Skill hub, Calendar, Internship, Settings, Resources.

**Phase 8 — Decisions & specials (parallel, not blocking):** Landing (Q1), CV PDF
(Q2), IA restructure to toolkit rail (Q3), mobile surface (Q4).

**Where the shell fits vs pages:** visual-shell BEFORE pages (Phase 2), IA-restructure
AFTER/parallel (Phase 8). **Where shared components fit vs pages:** BEFORE (Phase 3
before Phase 6). **Onboarding:** early (Phase 4), per the handoff.

## B2. Landing — DECISION (Q1)

`LandingV2Preview` is a 3,783-line bespoke marketing page with its own complete
design language, deliberately untouched during canvas work. **My read: keep its
marketing identity; reconcile only the palette anchor** (it already claims to
anchor to platform tokens — point those at Yishai so the CTA/accent colors match,
no more). Restyling it onto Yishai chrome would (a) be a multi-week rebuild of a
working, SEO-tuned, animation-heavy page, and (b) flatten a hero that _should_ look
distinct from the app. Marketing front doors routinely differ from app chrome; the
app system is for the logged-in product. **Question: keep-identity-reconcile-palette
(rec) vs full port?**

## B3. CV PDF — DECISION (Q2)

The generated CV is a **branded document** (dark-slate banner, cream page, 5 accent
templates), rendered in `build-pdf.ts` and **mirrored** in `cvTemplates.js` (harness-
gated — changes must land in both). This is a second "own-identity vs port" call,
parallel to the landing. **My read: keep the document's editorial structure; decide
narrowly whether the banner/accent should shift toward Yishai** (blue/mauve/greige)
or stay slate — a CV is an artifact the _user_ sends to employers, so its identity
is arguably theirs, not ours, and ATS-safety constraints already shape it. Low
urgency; not on the critical path. **Question: retune the CV accent/banner to Yishai,
or leave the document identity as-is?**

## B4. IA / nav + mobile — DECISION (Q3, Q4)

- **Q3 (nav model):** the canvas designed a **toolkit-rail carousel** (8 soft-3D
  tool objects); production ships a **slimmed sidebar** (Today / Career / Chat-group
  / Internship / Profile). These are different IAs. The handoff's orphan rulings
  (Today=trash, Internship=trash, Chat=a tool) were written against the _canvas_ IA,
  but the _shipped_ nav already differs. **Does the port adopt the toolkit rail, or
  reskin the existing sidebar?** This gates the shell IA-restructure (Phase 8). The
  visual reskin (Phase 2) is safe either way.
- **Q4 (mobile):** mobile users already get a coach (MobileCoachTrigger →
  AgentDrawer bottom sheet). The canvas has a `CanvasMobileRail` **prototype**
  (bottom icon rail + coach sheet) that is not shipped. **Adopt the bottom-rail
  pattern, or keep the current slide-in sidebar + coach chip?** Either way, fix the
  768/1024 breakpoint split.

## B5. Structured-date affordance — placement

The CV-arc structured-date affordance (onboarding lesson: native date inputs drop
silently / fabricate a month → use structured text). There is **no shared date
component** today — native `<input type="date">` in **StepReview** (onboarding),
**ApplicationRow** (tracker), **AddEventDialog** (calendar), plus page-level date
UI in Tasks. **Build it once in Phase 3** (shared components) as a real structured
month/year affordance, then apply in StepReview (Phase 4), the tracker + calendar
(Phase 6/7). This also closes the GeneratingBanner-style "one primitive, many
inconsistent inlinings" gap for dates.

## B6. Fixture-shape drifts (fix before/during the relevant page port)

From the feasibility audit + this sweep — fixtures that don't yet mirror real shapes:

- `CANVAS_APPLICATIONS`: `date_applied` → real `applied_date`; `note` → real
  `notes`; missing `url` / `track` / `goal_alignment_score` the real card uses.
- Roadmap fixture (`CanvasRoadmapMock`): 0–100 integers + invented field names vs
  real 0–1 fractions + `readiness_score`/`match_score`/`matched_skills`/…
- (Coach thread fixtures already mirror `conversations` shape — added this session.)

## B7. Cross-cutting risks to carry into every phase

- **Stacking-context / `-z-10` bugs** (the grain lesson): any surface with layered
  backgrounds, portaled overlays, or the depth field needs the `isolate` context or
  the layer silently vanishes. Verify visual changes by **pixel-diff, not computed
  style**.
- **Shared-cache poisoning** (`tasks/lessons.md`): several pages share TanStack keys
  (`["experiences", uid]`, `["applications", uid]`) with _different_ select
  projections; a restyle that touches a query must not change its projection.
- **Onboarding + Profile write paths**: past data-loss incidents — restyle is
  presentational-only.
- **CV template dual-source**: any CV visual change hits both `cvTemplates.js` and
  `build-pdf.ts` (harness-gated).
- **Legacy surfaces need real restyles**, not token swaps (ResetPassword, 404,
  error boundaries, GeneratingBanner, Admin) — budget accordingly.

## B8. Open questions for Eli (answer before restyle begins)

1. **Landing** — keep marketing identity + reconcile palette (rec), or full port to Yishai?
2. **CV PDF** — retune the banner/accent toward Yishai, or keep the document's slate identity?
3. **Nav model** — adopt the canvas toolkit-rail, or reskin the existing slimmed sidebar? (Gates the shell IA-restructure.)
4. **Mobile** — adopt the `CanvasMobileRail` bottom-rail, or keep the current slide-in sidebar + coach chip? (Either way, fix the 768/1024 breakpoint.)
5. **Admin / AdminLaunch / Subagents** — confirm out of the user-facing port (leave as-is), or a minimal token pass?
6. **`UserNotRegisteredError`** — 0 imports; confirm dead so it can be deleted rather than ported.
7. **Order sign-off** — approve Phases 0→8, or reprioritize (e.g., auth/front-door earlier, a specific page first)?

---

_Companion docs: `canvas-tokens.md` (the locked system + ground spec),
`feasibility-audit.md` (per-surface backend reality), `port-plan-input.md`
(canvas↔prod component map), `component-audit.md` (the round-3 component diagnosis)._
