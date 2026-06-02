# Visual redesign — standing rules + status

The full visual redesign of `getajob.careers` rolls forward page by page in
funnel order. Login is first. These two rules apply to every page rebuild,
not just the first one.

---

## Standing rules (every redesign PR)

### 1. RESTYLE-ONLY ON BEHAVIOR

Apply the new visual system, but preserve every required section, state,
and behavior the page already has.

- The LIVE page/component is the source of truth for what must be preserved.
- The mockups in `docs/design/redesign/` are visual style ONLY, never a
  functional spec.
- Before any redesign PR touches a page, inventory the live file first
  (every section, state, query param, error mode, edge function call,
  analytics event, loading/disabled state). Then map each inventory item
  into the new design. Lose nothing.

### 2. SHIP A VISUAL PREVIEW

Every page rebuild produces a preview artifact so the result can be
reviewed without running the app.

- Public routes: render the built page in headless Playwright; export a
  multi-screenshot PDF (desktop + mobile widths, every distinct visual
  state of the page).
- Auth-gated pages: propose the preview approach (test session vs.
  component harness in a sandbox route) BEFORE building, since neither
  is automatic.
- Save the preview at `docs/design/redesign/previews/<page>.pdf` and link
  it in the PR body.

---

## Typecheck baseline (locked)

`npm run typecheck`: **434 errors** as of 2026-06-02 (after PR #212).

**Rule:** no redesign PR may increase this count. Each redesign PR runs
`npm run typecheck`, diffs against 434, and reports the delta in its PR
body. If a PR would raise the count, fix the regression in the same PR
or scope-cut.

| PR | Date | TS errors | Δ vs baseline |
|---|---|---|---|
| Baseline | 2026-06-02 | 434 | — |
| `eli/redesign-foundation-login` (foundation + Login) | 2026-06-02 | 432 | −2 |
| `eli/redesign-onboarding-2a` (foundation + first 3 onboarding steps) | 2026-06-02 | 432 | 0 |
| `eli/redesign-onboarding-2b` (mid-flow: Experience / RoleSkills / Skills / CareerDirection + 3 input forks) | 2026-06-02 | 431 | −1 |
| `eli/redesign-onboarding-2c` (Constraints + Survey + Tutorial + onb-style cleanup) | 2026-06-01 | 429 | −5 |
| `eli/redesign-shell` (Layout + SidebarFooter — shared app chrome only) | 2026-06-02 | 428 | −6 |
| `eli/redesign-home` (Home body + live-matches RPC + hero stat) | 2026-06-02 | 421 | −13 |
| `eli/redesign-roadmap` (Roadmap restyle: 4 tabs, clickable quadrant, track-color rd palette) | 2026-06-02 | 419 | −15 |
| `eli/redesign-jobs` (Jobs restyle: warm palette, RdCard, track-rdColor pills) | 2026-06-02 | 419 | −15 |
| `eli/redesign-tracker` (Tracker restyle: row-list rd-tokens, grouped 7-step checklist, track-rdColor) | 2026-06-02 | 419 | −15 |
| `eli/redesign-profile` (Profile restyle: 6 tabs rd-tokens, SkillTagInput modify-in-place, EntityCard rd-tints) | 2026-06-02 | 419 | −15 |
| `eli/redesign-storybank` (Story Bank restyle + profileStyles.js teardown — `.p-*` classes retired) | 2026-06-02 | 413 | −15 |
| `eli/redesign-tasks` (Tasks restyle: rd tokens + Tasks-side ACT_CSS injection drop; activityStyles.js kept for Calendar + Internship) | 2026-06-02 | 413 | −15 |

---

## App-wide rollout checklist

After the onboarding restyle (2A + 2B + 2C) shipped, the remaining
authenticated surfaces roll in funnel order — each its own scoped PR
with its own Vercel preview + preview PDF. No bundling, no auto-merge.
Tick boxes here as each PR merges.

**Process split:**

- **Complex pages** keep the full investigate-first checkpoint:
  inventory + preview-approach + design questions + my review BEFORE
  the build PR opens.
- **Simple pages** may investigate + build + preview in one pass.

| PR | Page | Process | Status | Notes |
|---|---|---|---|---|
| 3A | Shell (Layout + SidebarFooter) | simple | ☑ | Merged. Cream sidebar + coral active. NO IA change. |
| 3B | Home | complex | ☑ | Body restyle + live-matches RPC + hero stat. Preview = pre-seeded QueryClient. |
| 3C | Roadmap | complex | ☑ | 4-tab layout (How tracks work / Track 1 / 2 / 3), clickable quadrant, rd track colors. |
| 3D | Jobs | complex | ☑ | Search RPC + seniority filter preserved. JobCard restyled with track-rdColor avatars. |
| 3E | Tracker | complex | ☑ | Row-list restyled on rd-tokens; grouped 7-step checklist; track-rdColor migration complete. NO kanban / drilldown (post-launch). |
| 3F | Profile | complex | ☑ | All 6 tabs restyled on rd-tokens. SkillTagInput modified-in-place (Profile-area scope-exclusive). EntityCard rd-tint per entity family. PROFILE_CSS carried-forward (StoryBank still consumes). Deferred: 5-tab IA, Profile Strength card, Languages tab. |
| 3G | Story Bank | simple | ☑ | StoryBank + StoryCard + StoryEditor restyled on rd-tokens. **profileStyles.js + PROFILE_CSS retired** — gated audit confirmed zero remaining consumers; Profile.jsx injection dropped; 1 dead `p-tabs` className stripped from Internship.jsx. |
| 3H | Tasks | simple | ☑ | Tasks restyled on rd-tokens (categories teal/coral/golden/neutral by tone; due-chip tri-state coral/golden/soft). All write paths byte-equivalent: handleGenerate, optimistic toggleComplete/deleteTask/setDueDate. ACT_CSS injection dropped Tasks-side ONLY — `activityStyles.js` stays for Calendar + Internship + 6 internship sub-components. Tasks/Calendar tab merger DECLINED (deferred — see backlog). |
| 7  | Calendar | simple | ☐ | Event view. |
| 8  | LinkedIn | complex | ☐ | ProfileTab + Posts + Outreach + Optimization. |
| 9  | Chat agents | complex | ☐ | All 4 agent surfaces share the SSE streaming wrapper. |
| 10 | Internship | complex | ☐ | Browse + Pipeline + DetailDrawer + match_score. |
| 11 | Resources | simple | ☐ | Static-content page. |
| 12 | Settings | simple | ☐ | Account + delete. |
| 13 | Landing | simple | ☐ | Public marketing page — final pass. |

---

## Foundation (PR #1 — `eli/redesign-foundation-login`)

Ships additively. Nothing reads `--rd-*` until a page opts in, so all
live pages keep working untouched.

- `src/index.css` — `--rd-*` tokens inlined inside `@layer base { :root { … } }`
  (additive; the existing shadcn `:root` block stays untouched). The
  tokens were briefly kept in `src/styles/redesignTokens.css` and pulled
  in via `@import`, but CSS spec requires `@import` to precede every
  other rule — placing it after the `@tailwind` directives meant PostCSS
  silently dropped it and every `--rd-*` resolved to its fallback.
  Inlining is the safest pattern; edits go to `index.css` directly.
- `tailwind.config.js` — `theme.extend.colors.rd.*` + `fontFamily.display`
  added (existing entries untouched).
- `index.html` — `<link>` for Rokkitt weights 500/600/700/800.
- `src/components/redesign/RdButton.jsx` — coral pill primary.
- `src/components/redesign/RdCard.jsx` — white card, radius 18px, soft
  warm shadow.

Deferred to later PRs: `RdTabs`, `RdPill`, `RdBadge`, and any retro of
existing Direction-3 surfaces. `src/lib/trackConfig.js` is NOT touched.

---

## Login restyle (PR #1, same branch as foundation)

First page-by-page rebuild — public, auth-funnel entry. Restyle-only on
behavior: every section / state / behavior from the live Login.jsx is
preserved (URL-driven modes, ?deleted=1 toast, invite-code redemption →
inline waitlist, full Turnstile gating, PasswordRequirements, post-signup
PostHog flag). Direction 3 scoped `.login` styles fully replaced with
`--rd-*` tokens + RdButton / RdCard.

**Things added (not pure restyle but in-scope):**
- `/privacy` + `/terms` route shells (`src/pages/Privacy.jsx`,
  `src/pages/Terms.jsx`) so the new consent checkbox links resolve.
  Real content lands in a follow-up PR.
- Required Terms & Privacy consent checkbox on signup; gates submit.
- `?preview=waitlist` URL hatch — initializes `waitlistMode=true` so
  the preview pipeline can capture this branch without hitting the
  live `redeem_invite_code` RPC. Harmless in production.

**Things intentionally deferred:**
- "Email not confirmed" resend button (backlog).
- Real Terms / Privacy copy.

**Preview pipeline:** `scripts/preview-login.mjs`. Headless Chromium
(Playwright) renders `/login` in the 4 states × 2 viewports (1280×900 +
390×844), blocks `challenges.cloudflare.com` so Turnstile's iframe
doesn't churn capture, then `pdf-lib` assembles 8 pages →
`docs/design/redesign/previews/login.pdf`.

## Onboarding restyle — PR 2A (`eli/redesign-onboarding-2a`)

First slice of the 10-step onboarding flow. Behaviour preserved 1:1 —
the autosave dependency array (Onboarding.jsx:164, Eli-incident PR
2026-05-28) and every `useQuery` key/`select()` were left untouched.
Restyle-only on behaviour, per the standing rule.

**Files restyled in place (none of these have non-onboarding consumers):**
- `OnboardingShell.jsx` — peach outer frame (signature pattern across
  all onboarding mockups), 4-dot brand mark, "Step X of 9" eyebrow,
  coral progress fill, white inner card.
- `StepResumeUpload.jsx` — coral CTA pill, --rd-* surfaces, employment
  status 5-card grid with coral-tint selected state, dashed dropzone
  with coral hover, restyled LinkedIn URL collapse / banner / error
  states.
- `StepEducation.jsx` — restyled inputs/grid cards, swapped
  `SkillTagInput` → `RdSkillTagInput` for coursework + academic
  projects (both still use `suggestionType="none"` per the original).
- `StepInternship.jsx` — restyled OptionCards + cohort card.
- `Onboarding.jsx` — chrome only (page bg, hydration spinner,
  finalising loader, saveError + finaliseError banners). Wrapper
  logic untouched.

**Shared input scoping decision: FORK.** Created
`src/components/redesign/RdSkillTagInput.jsx` (behaviour-identical to
the canonical `SkillTagInput` — same `suggestionType` modes, same
canonical-library suggestion source from `skillIdsGenerated.json`,
same dedupe + keyboard handling; styling only changes). Old
`SkillTagInput` remains untouched so non-redesigned consumers
(Profile / Education / Certifications) keep their Direction-3 look.
PR 2B will fork `AutocompleteInput`, `PresetBubbleInput`, and
`SkillChipBank` the same way.

**Preview harness (auth-gated decision — Option A from the forward
note below):** `/_preview/onboarding/:state` route, registered ONLY
when `import.meta.env.DEV` is true. The constant folds to false at
prod build time → the route block becomes dead code → React Router
never matches `/_preview/*` → unauthenticated visitors fall through
to AuthenticatedApp → /login. Verified end-to-end by
`scripts/preview-onboarding.mjs:verifyProd404` — every run boots a
production `vite preview`, visits `/_preview/onboarding/shared-skill-picker`,
and asserts the preview-only heading ("Skill picker — autocomplete +
suggestions") is absent from the body. Captures don't proceed unless
that check passes.

The harness mounts each restyled step inside the real `OnboardingShell`
with fixture data from `src/pages/_preview/fixtures/onboarding.js`.
Parent callbacks (`onChange`, `onNext`, `onBack`, `onExtracted`)
become no-ops. No Supabase, no edge functions, no DB. Preserves the
full app CSS chain (`index.css` + Tailwind output) so screenshots
reflect production rendering.

**Skill-picker proof (per user spec):** the `shared-skill-picker`
fixture mounts `RdSkillTagInput` standalone with
`suggestionType="library_skills"` and pre-populated tags. The runner
clicks into the input, fills it with `data`, waits for the dropdown
to render, then screenshots. The PDF includes both desktop + mobile
captures showing the autocomplete dropdown with real canonical
library suggestions visible.

**Fixtures captured (9 × 2 viewports = 18 PDF pages):**
- `resume-empty`, `resume-employment-selected`
- `education-empty`, `education-prefilled`
- `internship-empty`, `internship-faculty`, `internship-self`,
  `internship-none`
- `shared-skill-picker` (autocomplete dropdown open)

Note: StepResumeUpload's internal `uploading`/`extracting`/`done`/
`error` states aren't externally settable from the harness, so the
preview only shows the idle layout. Adding a `presetStepState` prop
would require step-component changes; deferred unless review surfaces
a need.

The Experience-multiple-entries fixture (user-requested in 2A) lands
with PR 2B — `StepExperience` isn't restyled until then.

---

## Onboarding restyle — PR 2B (`eli/redesign-onboarding-2b`)

Second slice of the 10-step flow. Restyles 4 step files in place and
forks the 3 remaining shared-input primitives. Same restyle-only-on-
behaviour rule — autosave dep array, every `useQuery` key/`select()`,
the accordion behaviour in StepRoleSkills (no scroll-into-view
change), and every analytics event are preserved 1:1.

**Files restyled in place:**
- `StepExperience.jsx` — multi-entry form. SkillTagInput → RdSkillTagInput.
  The 8-value `type` dropdown (incl. PR #211's `founder`) and the
  Edit / Add / Delete + "currently / managed / cross-functional" flags
  are byte-equivalent.
- `StepRoleSkills.jsx` — per-card accordion (1 expanded at a time,
  first expanded by default). SkillTagInput + SkillChipBank → Rd forks;
  RoleSuggestions section (the per-role library-skill pre-fills, the
  one Eli flagged as TOP-PRIORITY) preserved verbatim with its same
  `suggestSkillsForTitle()` source + `humanizeSkillId` rendering.
  **Accordion auto-scroll bug deferred** (no scroll-into-view change
  in this PR) per the standing deferral.
- `StepSkills.jsx` — catch-all. SkillTagInput + SkillChipBank → Rd
  forks. `matchesSkill` helper unchanged.
- `StepCareerDirection.jsx` — five_year_role autocomplete (debounced
  350ms against the 183-role library) restyled with rd tokens;
  PresetBubbleInput / SkillTagInput → Rd forks; lateral / outside-
  degree booleans preserved.

**Files forked (Rd variants, originals untouched):**
- `RdAutocompleteInput.jsx` — same `LOCATION_SUGGESTIONS` source,
  same `suggestionType="location"` API.
- `RdPresetBubbleInput.jsx` — same toggle / custom-add / shared text[]
  array semantics. Active state in coral.
- `RdSkillChipBank.jsx` — **skill guarantee surface.** Reads
  `SKILL_BANK` from `@/components/onboarding/skillBank` (same 6
  categories × 18 chips); same `matchesSkill` helper; same compact
  mode. Chips render in rd tokens with a coral selected state.
- `RdSkipFooter.jsx` — Back / Skip / Continue. Coral CTA via RdButton.

**Fixtures added** (preview PDF: `onboarding-2b.pdf`, all 9 fixtures
× 2 viewports + the 7 carried from 2A = 16 fixtures × 2 = 32 pages):
- `experience-empty` + `experience-multi` (3-entry sample CV data)
- `roleskills-prefilled` (first accordion card expanded → SkillTagInput
  + RoleSuggestions + RdSkillChipBank all visible in one capture)
- `skills-empty` (chip bank visible on the catch-all)
- `skills-with-chips` (chips selected, coral state visible)
- `direction-empty` / `direction-prefilled`
- `shared-skill-picker` (carried — autocomplete dropdown open)

**Skill guarantee (proof state in PDF):**
1. RdSkillTagInput autocomplete dropdown OPEN with library suggestions
   (`shared-skill-picker` fixture, runner types "data" then captures).
2. RdSkillChipBank visible with all 6 categories rendered
   (`skills-empty` fixture).
3. RdSkillChipBank with chips selected (`skills-with-chips` fixture
   — coral state captured).
4. Per-role suggestion section + per-card SkillTagInput + per-card
   SkillChipBank, all rendered together inside the first expanded
   accordion (`roleskills-prefilled` fixture).

If a reviewer can't see skills to pick from in the PDF, that's a fail —
the four states above are designed so the failure mode is impossible
to miss.

**Prod 404 still verified:** `scripts/preview-onboarding.mjs:verifyProd404`
boots `vite preview` over the production build at every run and asserts
the preview-only heading is absent from `/_preview/onboarding/shared-skill-picker`.

**Out of scope (per spec):**
- Carded bugs (`split work-arrangement from employment-type`,
  `accordion auto-scroll`) — both deferred to a focused follow-up
  after the restyle ships.
- `onboardingStyles.js` — kept intact (still consumed by 2B/2C
  step files). To be deleted at the end of 2C only if a grep
  confirms no external consumers (e.g. CV PDF builder).

---

## Onboarding restyle — PR 2C (`eli/redesign-onboarding-2c`)

Final slice of the 10-step flow. Restyles the last 3 step files in
place + closes out the onboarding chrome cleanup. Same restyle-only-on-
behaviour rule — the finalise pipeline (`generate-career-analysis`
trigger, `replace_career_roles` RPC, `function_cache` dedup, the
`generate-tasks` fallback, the snapshot-insert-delete rollback), the
autosave dep array, and every analytics event are preserved 1:1. The
wrapper's `handleSurveyNext` → `handleFinalise` chain is the terminal
call into setup; `StepSurvey.onNext` still hits it. `StepConstraints`
keeps calling its `onSubmit` handler (the wrapper continues to forward
that to the next step → `handleSurveyNext` continues to trigger
`generate-career-analysis` at survey submit, the actual fan-out point).

**Files restyled in place:**
- `StepConstraints.jsx` — location autocomplete + earliest-start-date
  input + 4-card work-arrangement multi-select. Coral selected state
  with coral-tint ring on the cards. AutocompleteInput → RdAutocompleteInput;
  CTA via RdButton.
- `StepSurvey.jsx` — reality-check survey. All 5 question groups
  preserved verbatim (multi-select challenges, CV / LinkedIn / referral
  single-selects via the internal SingleSelect helper, 5-button clarity
  row). Custom-value shapes + commit-on-blur/Enter behaviour untouched
  so stored stable identifiers (`reichman_practicum`, `always`, etc.)
  don't drift.
- `OnboardingTutorial.jsx` — 6-slide carousel + 4 render states.
  Preserves: returning-user skip gate, `skipFiredRef` double-fire
  guard, `useFakeProgress(EXPECTED_SETUP_MS = 80_000)`, 4 analytics
  events (`STARTED`, `SLIDE_VIEWED`, `COMPLETED`, `SKIPPED`), the 6
  slides 1:1 (product copy — restyle only), `TRACKS` cards on the
  Browse Jobs slide, the LinkedIn data export link on the LinkedIn
  Hub slide, and the `has_seen_onboarding_tutorial` write that lives
  in the parent. FullScreenShell rebuilt with the peach outer frame
  + 4-dot brand logo matching `docs/design/redesign/getajob_onboarding_tutorial_carousel.html`.

**Final-handoff chrome (already on rd tokens from PR 2A — verified):**
- `Onboarding.jsx` hydration spinner (`checkingProfile` branch).
- `Onboarding.jsx` finalising loader ("Initialising your platform…").
- `Onboarding.jsx` `finaliseError` banner (step 9 + main shell paths).
- `Onboarding.jsx` `saveError` banner (main shell).

**Cleanup landed in this PR:**
- `src/components/onboarding/onboardingStyles.js` — **deleted.**
  Grep confirmed only `Onboarding.jsx` consumed `ONB_CSS`; the
  CV PDF builder under `supabase/functions/_shared/cv-templates/`
  does not reference any `--onb-*` token or `.onb-*` class. The
  four `<style>{ONB_CSS}</style>` injections in `Onboarding.jsx`
  were removed at the same time.
- `src/components/onboarding/SkipFooter.jsx` — **deleted.** Legacy
  pre-redesign primitive whose only call sites had been migrated to
  `RdSkipFooter` in PR 2B; the file was the last live consumer of
  the `.onb-btn*` classes.

**Fixtures added** (preview PDF: `onboarding-2c.pdf`, 24 fixtures
× 2 viewports = 48 pages — carries 16 from 2A+2B and adds 8 new):
- `constraints-empty` / `constraints-filled` (Hybrid+Remote multi-select,
  Tel Aviv location, 2026-09-01 start date).
- `survey-empty` / `survey-filled` (challenges multi-select + 4 single-
  selects + free-text "what have you tried" populated).
- `tutorial-gate` (returning-user skip-gate render state).
- `tutorial-slide-1` (Browse Jobs slide — sample job card + 3 track
  cards visible together).
- `tutorial-slide-6` (final slide w/ "Go to platform" enabled because
  `setupComplete=true`).
- `tutorial-completion` (returning user + setupComplete combo → "Setup
  complete" handoff view).

**Preview runner fix:** `scripts/preview-onboarding.mjs` fixture-ID
regex was `[a-z-]+` and silently dropped any fixture whose ID
contained a digit. Loosened to `[a-z0-9-]+` so `tutorial-slide-1` /
`tutorial-slide-6` get picked up. Output filename moved to
`onboarding-2c.pdf` for slice compare against the 2B PDF.

**Prod 404 still verified:** runner boots `vite preview` over the
production build at every run and asserts the preview-only heading is
absent from `/_preview/onboarding/shared-skill-picker`.

**Onboarding restyle complete:** PRs 2A + 2B + 2C cover all 10 steps
+ shell + final-handoff chrome. The legacy `.onb-*` chrome is gone,
all step files render via `--rd-*` tokens, and the 4 redesign-fork
inputs (`RdAutocompleteInput`, `RdPresetBubbleInput`, `RdSkillChipBank`,
`RdSkillTagInput`, `RdSkipFooter`, `RdButton`) are the canonical
primitives onboarding consumes. Non-onboarding consumers of the
original inputs (e.g. `Profile`, `EducationTab`, `CertificationsSection`)
remain on Direction-3 styling until their own retros.

---

## Shared shell — PR 3A (`eli/redesign-shell`)

First app-wide PR. Restyles the dashboard chrome (`Layout` +
`SidebarFooter`) in place — no page bodies, no fork. The new chrome
applies to every authenticated route at once (16+ pages), so the rest
of the rollout can restyle page bodies without re-touching shell code.

**Files restyled in place:**

- `src/Layout.jsx` — cream sidebar (`--rd-bg-sidebar`) with the warm
  border, 4-dot brand mark + serif "Get A Job" wordmark, coral-tint
  active row (replaces the legacy dark gradient `from-[#0A0A0A] to-
  [#1a1a2e]`), small coral dot indicator on the active item, warm
  border-l on the sub-item rail, font-display section labels.
  Mobile-drawer overlay uses `bg-rd-text/20`. `<main>` now has the
  `legacy-body` class + `bg-rd-bg-page` so any not-yet-restyled page
  body paints against the warm page background instead of clashing
  against the cream sidebar.
- `src/components/layout/SidebarFooter.jsx` — peach-on-cream avatar
  with white initials, serif full_name + muted email, coral-leaning
  logout hover, eyebrow-style "About Get A Job" footer link.

**Behaviour preserved (non-negotiable — verified with the existing
test selectors + the live Layout source):**

- Collapsible sections: Career, Activity, Chat (`SidebarSection` keeps
  its ChevronRight + `aria-expanded`).
- Active-section auto-expand + lock-open (`findActiveSectionId` +
  `toggleSection`'s "don't allow collapsing the active section" guard).
- Internship section conditional insertion when
  `profiles.practicum_path != null`, between Activity and LinkedIn.
- All 4 Chat sub-items + Story Bank + Calendar + Tasks + Resources.
- The 3-field projection on `useProfileQuery` (`practicum_path`,
  `onboarding_complete`, `full_name`).
- Profile-chrome gating: Layout returns bare children when
  `currentPageName === "Onboarding"` OR `!onboardingComplete`. The
  redesigned onboarding (PRs 2A–2C) keeps rendering without the
  sidebar.
- Mobile drawer (`sidebarOpen`, `Menu` toggle, overlay click-to-close)
  and `TopLoadingBar` 600ms route-change pulse.

**Decorative `BrandMark` helper** added inline at the top of Layout.jsx
(4-dot logo + serif wordmark) — same mark the onboarding shell uses.
Not extracted to a shared module yet; first cross-shell consumer can
hoist it.

**Preview harness (new):**

- `src/pages/_preview/ShellPreview.jsx` — DEV-only route at
  `/_preview/shell/:state`. Wraps the real Layout in a fresh
  `QueryClient` pre-seeded with a fixture profile + an
  `AuthContext.Provider` stub user. The harness drives extra
  expanded-section state + the mobile drawer via URL params
  (`?expand=chat,profile`, `?mobile=1`) and a post-mount DOM-click
  effect — Layout's `expandedSections` + `sidebarOpen` state live
  inside the component and can't be passed in, so the harness clicks
  the same buttons a user would.
- `src/pages/_preview/fixtures/shell.js` — 9 fixtures: home active,
  Roadmap active (auto-expanded Career), Tracker active (auto-expanded
  Activity), Jobs active + Chat manually expanded, Internship section
  visible, legacy-body reset proof, sidebar-hidden on Onboarding,
  sidebar-hidden on `!onboardingComplete`, and mobile-drawer-open.
- `src/lib/AuthContext.jsx` — `AuthContext` is now exported (was
  module-private). Only the harness consumes it; production code still
  reads through the `useAuth` hook.
- `src/App.jsx` — route registration gated on `import.meta.env.DEV`,
  identical pattern to the onboarding harness route.
- `scripts/preview-shell.mjs` — sister runner to the onboarding one.
  Same prod-404 verification flow (boots `vite preview` over the
  production bundle, asserts the harness's `"shell preview · "`
  marker is absent from `/_preview/shell/shell-home-active`).
  Output: `docs/design/redesign/previews/shell-3a.pdf` (9 fixtures ×
  desktop + mobile = 18 pages).

**`data-section-id` on collapsible section headers** — added to
`Layout.jsx`'s `SidebarSection` button so the harness can drive
multi-expanded state from the URL. Inert in production; consumers
that want to drive other behaviour off section ids can read it too.

**Out of scope (next PRs):**

- Page bodies. Home is the first body restyle in PR 3B; the rest
  follow the rollout checklist above.

---

## Home body — PR 3B (`eli/redesign-home`)

First page-body restyle under the new shell. Hero + 6 bento cards +
both banners + `HomeSkeleton` rebuilt on rd tokens + RdCard +
font-display + coral. Reference mockup:
`docs/design/redesign/getajob_home_locked_crowz_style.html` (look
reference; the live IA stays). The page renders inside the existing
RdLayout (cream sidebar from 3A) — no shell changes.

**One new stat surfaced (per spec):** "Live job matches" — an uncapped
count of currently-active IL jobs whose title trigram-matches any of
the user's Track-1 `career_roles` titles via `pg_trgm` similarity ≥
0.3 (same match logic as `search_jobs_by_role_titles`, no 7-day
filter, no limit). Computed server-side via a new
`count_active_jobs_by_role_titles(TEXT[], REAL)` RPC, surfaced as the
standout number in the hero ("X live job matches for you"), linking
to /Jobs. Graceful zero-state for users with no Track-1 roles yet:
"Matches incoming — generate your roadmap to see them" (also links
to /Jobs).

**Approach picked for the count:** new RPC migration
(`supabase/migrations/20260603_count_active_jobs_by_role_titles.sql`).
Rationale: cheaper than calling `search_jobs_by_role_titles` with a
high `p_limit` (which still does diversification + ORDER BY work),
and there's no risk of accidentally clamping the surfaced number at a
ceiling. Mirrors the search RPC's match clauses verbatim
(`is_il = TRUE`, `is_active = TRUE`, `similarity(j.title, role) >=
threshold`), uses `COUNT(DISTINCT j.id)`, SECURITY INVOKER so RLS
applies, GRANTED to authenticated.

**SKIPPED from the mockup, per spec:**

- Weekly chart (no time-series data captured yet).
- Tracks-ranked-by-fit block (overlaps with the existing Roadmap card
  + would duplicate the track pills already shown there).
- Bell / notifications icon (no notifications system).
- All other stat tiles besides Live job matches.

**Self-heal stays silent.** No new banner; the focus-card CTA still
flips to "Building your daily focus…" when `selfHealing=true`. The
self-heal `useEffect` itself is byte-identical to the prior version.

**Preserved 1:1 from the prior Direction-3 Home:**

- Redirect-to-Onboarding `useEffect` (lines 598-610 in the prior file).
  Fails open to Onboarding on profile-query errors.
- Self-heal `useEffect` — single-fire via `selfHealRanRef`, `force:
  true` on the analysis call, 45s timeout, persist + cache invalidation
  via `invalidateAfterCareerAnalysis`.
- Daily-action query: `staleTime: 30 * 60 * 1000`, `retry: false`,
  date-keyed cache key (`new Date().toDateString()`).
- `withDbTimeout` wrappers on profile/roles/applications (30s ceiling).
- New_jobs_home inline-titles non-waterfall — the inner `from("career_roles").select("title")` fetch fires in parallel with the
  outer roles query, no gating.
- Memoised `activeApps` + `recentApps` BEFORE the early returns so the
  hook order stays stable across `willRedirect` / `isLoading` branches.
- All 6 card destinations: focusDestination (4 sub-branches),
  /Roadmap, /Tracker, /Jobs, /StoryBank, /Linkedin?tab=…
- `pickHeadline` rule ladder thresholds (≥5 active apps, ≥3 T1, ≥1 T1,
  0 roles).
- `hadRolesPreviously` localStorage write.

**New live-matches query (added — 11th query)** —
`["live_matches_home", uid]`, gated on `!!user?.id`, inline-titles
non-waterfall pattern, returns `null` (NOT 0) when the user has no
Track-1 roles so the hero renders the graceful "Matches incoming"
zero-state instead of "0 live job matches". 5-minute staleTime to
keep the hero stable across navigation.

**Self-heal preview hook:** the self-heal `useState` initializer
accepts a `?preview-selfheal=1` URL flag so the harness can paint the
"Building your daily focus…" focus-card state without invoking the
real edge function. Flag is inert in prod (no harness mount;
useEffect short-circuits when conditions don't match).

**Preview harness (new):**

- `src/pages/_preview/HomePreview.jsx` — DEV-only route at
  `/_preview/home/:state`. Wraps the real Home in a fresh
  `QueryClient` whose cache is seeded SYNCHRONOUSLY inside the
  `useMemo` factory (NOT in `useEffect`) — the redirect-to-Onboarding
  effect fires on the first render before any effect runs, so the
  seed has to land before that. Stub `AuthContext.Provider` overrides
  the outer real AuthProvider for the harness subtree only.
- `src/pages/_preview/fixtures/home.js` — 6 fixtures: empty (post-
  onboarding, no roles, live-matches-incoming), partial (6 roles, no
  apps, LI baseline set, count=42), active (12 roles, 7 apps, LI post
  3d ago, daily action populated, count=174), stale-banner
  (experience created_at > last_reality_check_date), error-banner
  (forced error state on careerRoles + applications), self-healing
  (?preview-selfheal=1 URL flag).
- Error-banner forcing technique: the harness writes to the QueryCache
  directly via `query.setState({ status: "error", error: ... })` after
  the initial seed, which drives React Query's `isError` flag without
  any real network call. Used to capture the rolesError/appsError red
  banner.
- `scripts/preview-home.mjs` — same prod-404 verification flow (boots
  `vite preview` over the production bundle, asserts the
  `"live job matches for you"` / `"Matches incoming"` Home markers
  are absent from `/_preview/home/home-empty` in prod). Output:
  `docs/design/redesign/previews/home-3b.pdf` (6 fixtures × desktop +
  mobile = 12 pages).

**Migration:**

`supabase/migrations/20260603_count_active_jobs_by_role_titles.sql`
adds the count RPC. Apply via the existing migration flow before the
Vercel deploy so the new query has somewhere to land — the frontend
gracefully degrades to `null` (zero-state copy) if the RPC errors, so
a brief out-of-sequence window is non-fatal.

---

## Roadmap — PR 3C (`eli/redesign-roadmap`)

Roadmap restyled on rd tokens. Reference mockup:
`docs/design/redesign/getajob_roadmap_tracks_quadrant.html`. Live IA
re-shaped per the 3C spec: the Overview tab is dropped, the quadrant
becomes the default landing tab AND a clickable jump-to-track widget,
and the page leans on the cream + warm-palette identity established
in PRs 3A + 3B.

**Structural changes (per the 3C spec):**

- **TAB_ORDER → `["why", "track_1", "track_2", "track_3"]`** — 4 tabs.
  Default tab flipped from `"overview"` to `"why"`. Legacy
  `?tab=overview` URLs fall through to the default (no breakage).
- **Overview tab dropped.** Its Track-1-preview card and Live-Track-1-
  matches card are not reproduced — Track 1 tab covers the role
  preview, and Home's new live-matches hero stat covers the bridge to
  /Jobs.
- **Qualification + Assessment relocated** to a compact band directly
  under the header. Visible on every tab so the user's anchor context
  travels with them. Reads from `profile.qualification_level` +
  `profile.overall_assessment` exactly as before — no shape change.

**WhyTab — clickable quadrant + intro sentence:**

`TrackQuadrantGrid` accepts two new optional props:
- `onTrackClick(trackId)` — invoked when a populated cell is tapped.
  Roadmap wires it to `setTab(trackId)` so the user jumps from the
  quadrant to the corresponding track tab.
- `counts: { track_1, track_2, track_3 }` — when present, each
  populated cell renders `"N roles ›"`. No per-track job counts and
  no extra RPC, per the spec.

The separate colored description rows (live's "Track N · name — description" list at the bottom of WhyTab) are dropped, replaced by a single intro sentence above the quadrant: "Every role is placed by two things — how qualified you are now, and how well it moves you toward your goal." Mockup-faithful microcopy "Tap a track to see your suggested roles." sits below the grid. If this turns out to be too sparse in real use, condensed descriptions can be added back.

**Track-color rd palette (CALL-OUT — cross-page impact):**

`TRACK_CONFIG` gains a canonical `rdColor` field alongside the legacy `color`:

| Track | legacy `color` | new `rdColor` |
|---|---|---|
| Track 1 | green | **coral** |
| Track 2 | gray  | **teal**  |
| Track 3 | amber | **golden** |

- Roadmap (PR 3C) reads `rdColor` everywhere — quadrant cells, RoleCard tints + badges, per-track tab header card.
- Home's `TrackPill` (under the Roadmap card) is RE-ALIGNED in this PR — was T1=teal / T2=golden / T3=coral, now T1=coral / T2=teal / T3=golden to match Roadmap. The shell sidebar's active-dot stays coral as a generic brand signal, not a track signal.
- Legacy `color` field stays in place for non-redesigned surfaces (JobCard, Tracker) until each gets its own restyle PR. No cascading breakage.

**RoleCard — restyle, behaviour preserved:**

- Chevron-expand preserved (collapsed → header only; expanded → 4-7 sections).
- Track-color tint reads from `rdColor` via a `RD_TRACK_STYLES` lookup; the card surface stays white but each track has its own badge + accent identity.
- **Weakest-axis cue** preserved — but the muted "needs-work" fill is now `var(--rd-text-tertiary)` (a muted ink tone), NOT coral. Coral is now Track 1's identity color; reusing it for "weak axis" would create visual collisions with the badge.
- `humanizeSkillId` (P16) preserved on every skill pill.
- "See <title> jobs available now" deep-link (`/Jobs?role=<encoded>`) preserved verbatim.

**Header treatment (per the 3C spec):**

- Eyebrow "Roadmap" (mono uppercase, rd-text-eyebrow) → serif "Career roadmap" h1.
- Subtitle dropped.
- Last-updated stamp preserved (`profile.last_reality_check_date`, formatted with `toLocaleDateString`). Only shown when both timestamp AND `roles.length > 0` exist.
- Refresh button preserved as the sole re-run path (top-right, three states: spinner / Refresh / Generate roadmap).

**Behaviour preserved 1:1 (P1–P17 contract):**

- P1 `handleGenerate` flow byte-equivalent — `refreshSession` →
  POST `generate-career-analysis` with `force: true` → defensive
  `cached: true` branch → `replace_career_roles` RPC with 12-field
  payload → profile stamp (`last_reality_check_date,
  qualification_level, overall_assessment, skill_gaps`) → `await
  invalidateAfterCareerAnalysis`.
- P4 URL-driven tab state preserved; only the default changed.
- P6/P7 stale-banner trigger + gating preserved (`isAnalysisStale` +
  `roles.length > 0` + `!generating`).
- P8 client reads `r.track` directly — no client-side re-tracking.
- P9 `TRACK_CONFIG` remains the single source of truth (now with
  parallel `rdColor` for restyled consumers).
- P10–P13 canonical query hooks (`useProfileQuery`,
  `useExperiencesQuery`, `useEducationQuery`) + `invalidateAfterCareerAnalysis` helper untouched.
- P14 `RoleCard` chevron-expand local state preserved.
- P15 weakest-axis cue preserved (muted-ink fill instead of coral —
  noted above).
- P17 `RoleCard onTrack` back-compat slot preserved with a default
  value (`onTrack = null`) so JS/TS prop-validation doesn't trip.

**Preview harness:**

- DEV-only `/_preview/roadmap/:state` route (gated on
  `import.meta.env.DEV`, identical pattern to Shell/Home).
- Wraps real Roadmap in a fresh QueryClient seeded SYNCHRONOUSLY inside
  the `useMemo` factory (avoids the redirect-to-Onboarding race that
  Home's harness already worked around).
- 9 fixtures: `roadmap-empty-no-profile`, `roadmap-empty-no-roles`,
  `roadmap-why` (default, populated), `roadmap-track-1`,
  `roadmap-track-2`, `roadmap-track-3`, `roadmap-stale`,
  `roadmap-generating` (driven by `?preview-generating=1` URL flag —
  inert in prod), `roadmap-error` (forced via direct
  `QueryCache.setState`).
- `scripts/preview-roadmap.mjs` runner — same prod-404 verification
  flow. Output: `docs/design/redesign/previews/roadmap-3c.pdf` (9
  fixtures × desktop + mobile = 18 pages).
- Prod `/_preview/roadmap/*` verified unreachable.

**Out of scope (carry-forward):**

- `roadmapStyles.js` still exists but is no longer consumed by
  `Roadmap.jsx` (the new file uses Tailwind + inline rd-token styles).
  Deletion is a follow-up cleanup pass — leaving it in place for now
  in case any test selector still grabs at the old `.rm-*` classes.
- JobCard / Tracker still read `TRACK_CONFIG.color` (legacy
  green/gray/amber). They flip to `rdColor` when each gets its own
  restyle PR.

---

## Jobs — PR 3D (`eli/redesign-jobs`)

Jobs restyled on rd tokens. Reference mockup:
`docs/design/redesign/getajob_jobs_page.html`. Live Jobs is authoritative
for behavior. JobCard flips to `rdColor` for its track-tinted avatar +
match badge — completes the color migration started in PR 3C for one
more surface. (Tracker still reads legacy `color`; its restyle PR is
next.)

**Files restyled in place:**

- `src/pages/Jobs.jsx` — dropped the inline `JOBS_CSS` injection;
  swapped to Tailwind + rd tokens. New layout:
  - Serif "Live roles, scored against your tracks." hero (replaces
    the legacy "Live jobs / Real roles, refreshed nightly" header).
  - Full-width search bar (cream RdCard with magnifier icon + clear-x
    button when a keyword is applied).
  - 3 track filter pills in coral / teal / golden (the new `rdColor`
    palette), with hover lift + selected solid state + dimmed
    opacity when in keyword mode.
  - "X roles on Track N" count row with seniority chip on the right.
  - 2-column responsive job grid, Load more button, empty/loading/
    error states all restyled.
- `src/components/jobs/JobCard.jsx` — track-tinted avatar (first
  letter of company), serif title, meta chips (work_type / seniority
  / posted), match-percentage pill colored to the track tint band:
    - 75+ → track-tint badge (coral/teal/golden tint + dark accent)
    - 50–74 → same track tint, slightly muted
    - <50 → neutral `--rd-bg-soft` + low-fit warning line
  Strengths + skill-gaps preserved as rd-token pill rows. JD preview
  toggle preserved verbatim. Footer: Track button (neutral pill,
  flips to teal-tint "Tracked" on success) + coral Apply pill linking
  to `apply_url` external.

**Track-color: completes Jobs's switch to `rdColor`:**

| Track | legacy `color` | Jobs now reads |
|---|---|---|
| Track 1 | green | **coral** (`rdColor`) |
| Track 2 | gray  | **teal**  (`rdColor`) |
| Track 3 | amber | **golden** (`rdColor`) |

`Jobs.jsx` passes `TRACK_CONFIG[track].rdColor` to `JobCard` via the
existing `trackColor` prop. JobCard's `RD_TRACK_STYLES` lookup
accepts both the new names AND the legacy `green/gray/amber` aliases
as a defensive fallback — protects against a stale cache surface
passing the old names during the partial rollout window.

**Wording preserved:** "See Job Posting" stays as the apply button
label (mockup says "Apply" but live wording is more accurate for the
external-link semantic). The coral pill styling is the mockup-faithful
treatment; the label is intentionally unchanged.

**Behaviour preserved 1:1:**

- `search_jobs_by_role_titles` RPC + the full 6-param signature
  (`p_role_titles`, `p_limit`, `p_offset`, `p_similarity_threshold`,
  `p_max_seniority`, `p_work_types`) called byte-equivalent.
- Seniority filter (`seniorityFilterFor`) — Track 3 still bypasses
  the strict cap per PR #76/#77.
- `work_type` filter — null-when-empty pass-through preserved.
- Keyword search via direct `from("jobs").ilike("title", "%kw%")`.
- Pagination via `offset` + `BROWSE_PAGE_SIZE=20` + Load more.
- `?role=` deep-link from Roadmap RoleCards (`linkedRole` →
  keyword-mode pre-fill).
- `defaultedRef` one-shot mode flip from keyword → track after
  `careerRoles` resolves.
- `requestSeqRef` race protection on out-of-order responses.
- `scoredById` useMemo with the exact dep array preserved (PR-G fix).
- `displayedJobs` per-job track filter (PR-G).
- `?debug=1` verbose console dump (PR-G1 TDZ fix preserved — `mode`
  read directly, not via the lifted `inTrackMode` binding).
- `addJobToTracker` idempotent insert with `score_source:
  "deterministic"` write-path preserved verbatim.

**Preview hatches added (DEV-only, inert in prod):**

- `?preview-force-empty=<reason>` — short-circuits the `fetchJobs`
  effect so the harness can paint the empty states without any
  RPC/REST call. Two values used: `no_roles`, `no_matches`.

**Preview harness (new):**

- `src/pages/_preview/JobsPreview.jsx` — DEV-only route at
  `/_preview/jobs/:state`. Wraps Jobs in a fresh QueryClient seeded
  with the canonical keys + a stub `AuthContext.Provider`. Jobs.jsx
  stores its jobs list in `useState` (not React Query), so the
  harness also monkey-patches `supabase.from("jobs")` +
  `supabase.rpc("search_jobs_by_role_titles")` to return fixture
  rows. The patch runs synchronously inside `useMemo` before Jobs
  mounts. Each Playwright fixture is its own page load so no cleanup
  is needed.
- 7 fixtures: loading, populated (4 cards across match bands),
  keyword-mode (`?role=Product Manager`), empty-no-roles
  (`?preview-force-empty=no_roles`), empty-no-matches
  (`?preview-force-empty=no_matches`), stale-banner, no-profile.
- `scripts/preview-jobs.mjs` — same prod-404 verification flow.
  Output: `docs/design/redesign/previews/jobs-3d.pdf` (7 fixtures ×
  desktop + mobile = 14 pages).
- Prod `/_preview/jobs/*` verified unreachable.

**Out of scope (carry-forward):**

- `src/components/jobs/jobsStyles.js` still exists but is no longer
  consumed by `Jobs.jsx`. Deletion is a follow-up cleanup pass —
  leaving it for now in case any test selector still grabs at the
  old `.jb-*` classes.

---

## Tracker — PR 3E (`eli/redesign-tracker`)

Restyle-only on the existing row-list Tracker per the Q1 ruling. NO
kanban + NO drilldown route — those are post-launch feature work. The
mockup-3 grouped 7-step layout is carried over visually inside the
in-row Steps tab; everything else (status filter pills, inline
expand-in-place, 9 tabs, 6 sub-components, all writes + audit
behaviour) is preserved 1:1.

**Files restyled in place:**

- `src/pages/Tracker.jsx` — Tailwind + rd tokens directly. Serif
  "Tracker" wordmark, coral "Add application" pill, restyled
  "How to use" tile with 4 phase-coloured tiles
  (golden / teal / coral / golden+star), 8 status filter pills
  (selected→solid `--rd-text`), restyled empty state + loading
  skeleton + Add dialog. The page-root `<style>{TRACKER_CSS}</style>`
  injection is **kept here as the SINGLE source** so the six per-tab
  subcomponents (CVManagement / SkillsRequired / ProjectsProof /
  NetworkingReferrals / InterviewPrep / FollowUp) that still consume
  `.tk-*` classes keep rendering. NO duplicate injection from
  ApplicationRow.
- `src/components/tracker/ApplicationRow.jsx` — collapsed-header
  restyle (status badge → warm tints per status, AI confidence chip
  → teal-dark or muted), track pill switches to `track.rdColor`
  (coral / teal / golden), delete confirm + chevron preserved.
  Expanded body: status row + tab bar + tab-panel container chrome
  on rd tokens. Tab CONTENTS (CV / Skills / Projects / Networking /
  Interview / Follow-up) untouched per the spec — only the panel
  wrapper changed. `data-app-id={app.id}` added to the row-header
  button so the preview harness can drive expand state by id.
- `src/components/tracker/ApplicationChecklist.jsx` — rebuilt as a
  three-phase grouped layout from
  `docs/design/redesign/getajob_tracker_seven_step_guide.html`:
  **Know the role** (steps 1–2, golden), **Build your case**
  (steps 3–5, teal), **Apply & prep** (steps 6–7, coral). New
  progress bar (`completedCount / 7` × `--rd-coral`). Same 7
  checklist keys (P15), same lock rule on step 6, same
  referral-star "High Impact" highlight on step 5. The
  optimistic-update + rollback (P5) lives in the parent and is
  untouched.

**Track-color migration completes here:** `ApplicationRow` was the
last surface reading `TRACK_CONFIG.color` (legacy green/gray/amber);
it now reads `TRACK_CONFIG.rdColor` (coral/teal/golden), matching
Home + Roadmap + Jobs. After this PR the legacy `color` field on
`TRACK_CONFIG` is unused by any restyled surface (Internship still
uses it pending its own restyle PR).

**Preservation contract — verified preserved 1:1:**

- **P1** `Tracker.handleAdd` — insert payload + analytics event +
  cache invalidate + `scoreApplication` chain when JD present.
- **P2** `ApplicationRow.handleStatusChange` — `applications.status`
  UPDATE only. `trg_log_application_status_change` Postgres trigger
  writes the audit row; client never touches `status_changes` (RLS
  denies INSERT to users).
- **P3** `ApplicationRow.handleDelete` — two-step confirm
  (`confirmingDelete` ref).
- **P4** `ApplicationRow.handleSaveJobDescription` — `stripHtml` at
  the paste-boundary → UPDATE → chain `scoreApplication`
  (analyze-job-match) when cleaned JD is non-empty. PR #351
  sanitization fix preserved.
- **P5** `ApplicationRow.handleChecklistChange` — optimistic
  `setChecklist(updated)` then UPDATE; rollback to previous + toast
  on error. Pattern byte-equivalent.
- **P6** `ApplicationRow.handleSaveApplicationDetails` — applied_date
  + cv_version_used + referral_attached written together.
- **P9** Tab lock semantics — `INTERVIEW_UNLOCK_STATUSES` =
  {interviewing, offer, accepted, rejected}; `FOLLOWUP_UNLOCK_STATUSES`
  = {offer, accepted, rejected}.
- **P11** Unsaved-changes guard — `hasUnsavedChanges` + `window.confirm`
  on collapse.
- **P14** `applications.status` 7-value enum untouched.
- **P15** `applications.checklist` JSONB shape — same 7 keys,
  same lock rules.
- **P16** `status_changes` audit trigger — never written by client.
- **P17** Typecheck baseline — Tracker-area errors still at 6
  (pre-existing); total at 419 (unchanged vs main).

**Preview harness:**

- DEV-only `/_preview/tracker/:state` route, gated on
  `import.meta.env.DEV`.
- Fresh QueryClient seeded synchronously inside `useMemo` for
  `["userProfile", uid]`, `["applications", uid]`, and
  `["trackedJobsActiveStatus", uid, linkedCount]`. For the loading
  fixture, applications cache is intentionally left empty so the
  query reads as "pending" and Tracker's `isLoading` drives the
  skeleton.
- `AuthContext.Provider` stub overrides the outer AuthProvider for
  the harness subtree only.
- **URL-flag-driven view state**: filter pill / row expand / tab
  click / Add dialog open are local `useState` in production code —
  the harness uses `<Navigate replace>` to set the search params,
  then a post-mount `useEffect` clicks the corresponding DOM
  affordances by text/data-attribute. No production-code preview
  hatch. Per the design constraint, Tracker.jsx contains NO
  preview-only logic.
- 9 fixtures: empty / loading / populated (5 apps across statuses
  + tracks) / filtered-applied / expanded-steps / expanded-target /
  expanded-locked-interview / add-dialog / inactive-listing.
- `scripts/preview-tracker.mjs` — same prod-404 verification flow.
  Captions in the assembled PDF strip non-ASCII chars (pdf-lib's
  WinAnsi font can't encode emoji like 📋); screenshots themselves
  carry the full UI. Output:
  `docs/design/redesign/previews/tracker-3e.pdf` (9 × desktop+mobile
  = 18 pages).
- Prod `/_preview/tracker/*` verified unreachable.

**Out of scope (carry-forward):**

- `src/components/tracker/trackerStyles.js` is kept and still
  injected from `Tracker.jsx` page-root because the 6 per-tab
  subcomponents consume `.tk-*` classes inside their bodies. Those
  bodies are intentionally untouched in this PR (per the spec) —
  deleting the styles file plus restyling those 6 components is a
  follow-up cleanup PR.
- Kanban + drag-drop + drilldown route — deferred per the Q1 ruling.
- "P2 default-sort-by-tier" — confirmed OUT.

---

**Auth-gated previews (forward note):** PR 2 onward will need a
different strategy. Pick before building each page:
1. **Test-session via Supabase auth admin API** — script creates a
   throwaway user, signs them in, drives the page in their session,
   tears down. Higher fidelity (real layout chrome, real data shape)
   at the cost of side effects on prod data.
2. **Component harness on a `/_preview/<page>` route gated to
   `import.meta.env.DEV`** — renders the target page in isolation with
   hand-mocked props/queries. Cheaper, isolated from auth + DB, but
   risks drift if the harness mocks don't track the live page's
   contract.
Recommendation written in each PR's investigation step.

---

## Profile — PR 3F (`eli/redesign-profile`)

Restyle-only — every write path, RLS guard, and the
`recomputeProfileSkillsCanonical` invariant (PR #178 narrow-projection
fix) is preserved byte-for-byte across the 6 live tabs. Live file is
authoritative; the mockup's 5-tab IA + Profile Strength card + Languages
tab are explicitly out of scope (deferred — see backlog below).

**Files touched:**

- `src/pages/Profile.jsx` — Tailwind + rd tokens directly. `.profile`
  wrapper dropped (Tracker precedent); `<style>{PROFILE_CSS}</style>`
  kept at page root so StoryBank's deferred restyle can drop the
  stylesheet cleanly. All 6 tabs reuse a tight set of rd-token class
  constants (RD_CARD, RD_INPUT, RD_LABEL, RD_BTN_*) defined at the top
  of the file. UnmappedSkillsSection moved to a warm golden-tint hint
  card.
- `src/components/profile/EducationTab.jsx` — restyled (form + list
  cards + Certifications section header). `handleSave`/`handleDelete`
  + recompute call sequence unchanged.
- `src/components/profile/CertificationsSection.jsx` — restyled. Writes
  + recompute unchanged. EntityCard usage updated to pass `iconBg`
  (golden tint for cert family).
- `src/components/profile/EntityCard.jsx` — rd-token surface, lighter
  border, configurable icon-chip tint per entity family. Pure render.
- `src/components/onboarding/SkillTagInput.jsx` — modify-in-place
  (re-confirmed at PR time: 3 Profile-area consumers only; the 5
  onboarding step files all import the separate `RdSkillTagInput`).
  Suggestion list, dedup, keyboard handling all untouched — chrome only.
- `src/components/profile/profileStyles.js` — UNTOUCHED. StoryBank
  still consumes `.p-*` classes; deletion is a follow-up PR.

**Preservation contract (verified by structured diff):**

- **P1** `saveProfile` — entity_spine fresh-fetch read switch, full
  23-field UPDATE on `profiles`, RLS `.eq("id", user.id)` guard.
- **P2** resume upload — two-step (Storage upload → URL persist); a
  mid-step failure throws BEFORE the profiles update, so existing
  `resume_url` is preserved.
- **P3** education writes (EducationTab.handleSave / handleDelete) +
  recompute follow-up; both writes are RLS-scoped with explicit
  `.eq("user_id", user.id)` belt + the implicit policy suspenders.
- **P4** certifications writes (CertificationsSection.handleSave /
  handleDelete) + recompute follow-up; same RLS pattern.
- **P5** goals — shares `saveProfile`; field diff preserved.
- **P6** self-assessment — save-on-commit via `saveProfile`, no
  autosave loop.
- **P7** projects — insert → invalidate → toast; delete RLS-scoped.
- **P8** experiences — upsert keyed on id+user_id → invalidate →
  recompute → toast; delete RLS-scoped and resets the in-form state
  when the deleted row is the one being edited.
- **P9** recompute invariant — `recomputeProfileSkillsCanonical` is
  called AFTER every entity write, never before; the helper fetches
  fresh from `entity_spine`. Verified across saveProfile, addExperience,
  EducationTab.handleSave, CertificationsSection.handleSave.
- **P10** dirty tracking — controlled inputs per tab, no
  `beforeunload`, no autosave.
- **P11** PROFILE_CSS — ONE injection at Profile page root.
  StoryBank coupling documented in the Profile header comment.

**Preview harness:** `/_preview/profile/:state` (DEV-only via
`import.meta.env.DEV`). 11 fixtures × 2 viewports = 22 PDF pages →
`docs/design/redesign/previews/profile-3f.pdf`. Fresh QueryClient
seeded synchronously in `useMemo` on the 6 canonical keys (userProfile,
projects, experiences, stories, education, certifications). Synchronous
`<Navigate replace>` for `?tab=` flags; post-mount DOM click for
`?edit=<id>` (experience-row Edit button is local useState, not
URL-driven, so a click is the only way to drive it).

**Fixtures:**

1. `profile-empty`
2. `profile-loading`
3. `profile-populated`
4. `profile-tab-education`
5. `profile-tab-goals`
6. `profile-tab-self-assessment`
7. `profile-tab-projects`
8. `profile-tab-experience`
9. `profile-experience-edit-mode`
10. `profile-unmapped-skills`
11. `profile-resume-uploaded`

**Deferred backlog (out of PR 3F, captured here — PR 3G retired profileStyles.js in the same wave):**

- **5-tab IA consolidation** (mockup proposes Experience / Education /
  Skills / Career / Languages). Live IA has Profile / Education /
  Goals / Self-assessment / Projects / Experience. Goals +
  Self-assessment feed scoring/alignment — collapsing them is a
  product-level decision, not a restyle.
- **Profile Strength card** (mockup shows an 82% completeness meter
  near the header). New feature; needs a completeness scorer + write
  semantics. Out of scope for restyle.
- **Languages tab** (mockup has a standalone Languages tab). Live
  schema keeps `profiles.languages` JSON; no separate table, no
  separate write path. Adding the tab is a new feature.
- **Tasks + Calendar tab merger** (mockup proposes a Tasks/Calendar
  tab bar on `/Tasks` — see `docs/design/redesign/getajob_tasks.html`).
  Live keeps separate routes. Revisit at the Calendar restyle (page 7):
  if we adopt the merger, it's a routing change + shared tab state +
  Calendar render refactor — a product/IA decision, not a restyle.

---

## Story Bank — PR 3G (`eli/redesign-storybank`)

Simple-page rollout (investigate + build in one pass). Restyle-only —
every CRUD path, the `extract-story-from-text` edge function call, the
`daily_actions.status='done'` mark-done handoff, and the RLS
`.eq("user_id", user.id)` guards on update/delete preserved
byte-for-byte.

**Files touched:**

- `src/pages/StoryBank.jsx` — Tailwind + rd tokens directly. `.profile`
  wrapper dropped; PROFILE_CSS injection removed (teardown — see below).
  Filter pills swapped to the coral-selected / soft-tint pattern.
  Floating quick-add restyled to a coral pill with rd-shadow.
- `src/components/storyBank/StoryCard.jsx` — rd-token surface. Source
  chips now coral-tint (linked) / soft-gray (general) per mockup.
  Tag families: skill = teal-tint, tool = golden-tint, metric =
  coral-tint, relevance_tag = neutral.
- `src/components/storyBank/StoryEditor.jsx` — rd-token dialog +
  inputs. Save / Cancel buttons restyled to rd primary / ghost.
- **NOT touched:** `src/components/chat/StorySaveCard.jsx` — zero
  `.p-*` usage; keeps its violet "chat-captured" visual language so
  the create-flow stays consistent with the (not-yet-restyled) chat
  agent surfaces where the same component is embedded.

**profileStyles.js / PROFILE_CSS teardown — bundled in this PR (audit-gated):**

After restyling the 3 storyBank-tree files off `.p-*`, a repo-wide grep
confirmed the audit assumption: the only remaining `.p-*` className was
the 1 inert `p-tabs` on `src/pages/Internship.jsx:187` (which never
applied any styles — Internship doesn't inject PROFILE_CSS and the
className was sitting next to an inline `style={{display:'flex',gap:6}}`
that already covered its job). Teardown executed:

- Removed dead `p-tabs` className from `src/pages/Internship.jsx:187`.
- Dropped PROFILE_CSS import + `<style>` injection from
  `src/pages/Profile.jsx`. Profile's outer fragment becomes a plain
  `<div>` wrapper.
- Dropped PROFILE_CSS import + `<style>` injection + `.profile` wrapper
  from `src/pages/StoryBank.jsx`.
- Deleted `src/components/profile/profileStyles.js`.

Post-teardown grep returned zero className/import consumers — only
descriptive comments referencing the historical name remain.

**Preservation contract (verified byte-equivalent):**

- `extract-story-from-text` edge function call: unchanged signature,
  unchanged error handling.
- `stories` INSERT (create flow): all 11 fields, including the
  `Array.isArray(...) ? x : []` defensive coercion on metrics /
  skills_demonstrated / tools_used / relevance_tags.
- `stories` UPDATE (edit flow): direct patch shape, RLS guard.
- `stories` DELETE: RLS guard, query invalidation.
- `daily_actions.status='done'` mark-done sequence: fires only when
  `dailyActionCtx?.id` is set; failure is non-fatal (console.warn,
  not toast).
- `experience_id` nullable: `capture?.experience_id || null` and the
  `__general__` sentinel handling preserved.
- Filter modes: `all` / `linked` / `general` / `experience_id=<uuid>`,
  all URL-driven via `?filter=`.
- Floating quick-add: only renders when ≥1 story (avoids competing
  with the empty-state primary CTA).
- Location-state Daily Action handoff: pre-opens quick-add with the
  prompt as framing.

**Preview harness:** `/_preview/storybank/:state` (DEV-only via
`import.meta.env.DEV`). 11 fixtures × 2 viewports = 22 PDF pages →
`docs/design/redesign/previews/storybank-3g.pdf`. Fresh QueryClient
seeded synchronously on `["stories", uid]` + `["experiences", uid]`.
Synchronous `<Navigate replace>` for `?filter=` flags; post-mount DOM
driver clicks for card-expand / delete-confirm / Add-dialog / Edit-
dialog states (each of which lives in local useState inside StoryBank
or StoryCard).

**Fixtures (11):**

1. `storybank-empty-no-experiences`
2. `storybank-empty-with-experiences`
3. `storybank-loading`
4. `storybank-populated`
5. `storybank-filter-linked`
6. `storybank-filter-general`
7. `storybank-filter-by-experience`
8. `storybank-card-expanded`
9. `storybank-delete-confirm`
10. `storybank-add-dialog`
11. `storybank-edit-dialog`

---

## Tasks — PR 3H (`eli/redesign-tasks`)

Simple-page rollout (investigate + build in one pass). Restyle-only —
every write path is byte-equivalent. ACT_CSS injection dropped on the
Tasks side only; `activityStyles.js` stays alive for the unfinished
Calendar + Internship surfaces (full teardown is a future cleanup PR
after BOTH ship).

**Files touched:**

- `src/pages/Tasks.jsx` — Tailwind + rd tokens directly. `<style>{ACT_CSS}</style>`
  injection + `.act` wrapper removed; `ACT_CSS` import dropped. Category
  + priority + due chips moved to inline rd-token CSS-var backgrounds
  (so the dynamic CATEGORY_LABELS lookup keeps working without
  hand-coded hex). Filter pills follow the StoryBank pattern
  (coral-selected, soft-tint unselected). DueChip extracted as a tiny
  local helper for the three rd-toned states.
- `src/components/activity/activityStyles.js` — **untouched.** Calendar
  + Internship + 6 internship sub-components still consume `.act-*`
  classes; full retirement is gated on those pages restyling first.

**Audit-gated injection drop:** before removing the `<style>{ACT_CSS}</style>`
from Tasks.jsx, the user-mandated grep confirmed zero remaining
`act-*` / `ACT_CSS` / `className="act"` references in Tasks.jsx (only
comments referencing the migration remain). Calendar.jsx + Internship.jsx
still import + inject ACT_CSS — verified.

**Preservation contract (verified byte-equivalent):**

- `handleGenerate` — fresh-read incomplete IDs → `supabase.functions.invoke("generate-tasks", { body: { context: "weekly action plan" } })`
  → PRIORITY_MAP / CATEGORY_MAP normalization → INSERT generated tasks
  → DELETE old incomplete (RLS-scoped on user_id + is_complete=false)
  → invalidate. Error surfaces via `generateError` state for inline
  retry banner, not toast.
- `toggleComplete` — optimistic `queryClient.setQueryData(["tasks", uid], …)`
  then `supabase.from("tasks").update({ is_complete }).eq("id", task.id)`.
  Rollback via `invalidateQueries` on error. `togglingIds` set tracks
  in-flight per-row so double-click is a no-op.
- `deleteTask` — optimistic filter-out via setQueryData, then
  `supabase.from("tasks").delete().eq("id", taskId)`. Rollback via
  invalidate. `deletingIds` set tracks in-flight.
- `setDueDate` — `validateDueDate` guard (today → ~6mo, null on clear),
  optimistic setQueryData, then `supabase.from("tasks").update({ due_date }).eq("id", task.id)`,
  rollback via invalidate on error. Toast on out-of-range input.
- RLS user_id scoping — implicit on tasks (via RLS policy), explicit
  on the handleGenerate incomplete-IDs read (`.eq("user_id", user.id)`).
- `onboardingFallbackTasks` helper + `resolveDueDate`/`validateDueDate`
  helpers — NOT touched.
- `daily_actions` table — NOT touched. Tasks does not interact with
  daily_actions; that's the StoryBank + Home turf.

**Preview harness:** `/_preview/tasks/:state` (DEV-only via
`import.meta.env.DEV`). 9 fixtures × 2 viewports = 18 PDF pages →
`docs/design/redesign/previews/tasks-3h.pdf`. Fresh QueryClient seeded
synchronously on `["tasks", uid]` + `["userProfile", uid]` +
`["careerRoles", uid]`. All view-state flags (filter pill, date-editor
open, generate-error) are post-mount DOM-clicked since Tasks doesn't
expose URL params for them.

**Fixtures (9):**

1. `tasks-loading`
2. `tasks-empty-no-roles`
3. `tasks-empty-with-roles`
4. `tasks-populated`
5. `tasks-filter-skill`
6. `tasks-filter-networking`
7. `tasks-onboarding-fallback-banner`
8. `tasks-generate-error`
9. `tasks-date-editor-open`

---

## Token reference (`--rd-*`, locked palette)

| Token | Value | Role |
|---|---|---|
| `--rd-bg-page` | `#FAF6F0` | warm cream page background |
| `--rd-bg-card` | `#FFFFFF` | card surfaces |
| `--rd-bg-sidebar` | `#EFE7DB` | sidebar/brand-panel background |
| `--rd-bg-soft` | `#F3ECE0` | filter pills, secondary fills |
| `--rd-border` | `#F0E7D8` | card/input borders |
| `--rd-border-subtle` | `#EDE7DD` | hairlines, tab separators |
| `--rd-border-hover` | `#E0D6C4` | card hover state |
| `--rd-text` | `#211D18` | primary text |
| `--rd-text-secondary` | `#928C80` | metadata, captions |
| `--rd-text-tertiary` | `#857F74` | nav inactive |
| `--rd-text-eyebrow` | `#A38E6F` | overlines |
| `--rd-coral` | `#EF5A41` | primary CTA accent |
| `--rd-coral-dark` | `#C7461F` | coral hover / emphasis |
| `--rd-coral-tint` | `#FCE6DF` | coral-on-cream backgrounds |
| `--rd-teal` | `#54B5A2` | success / progress |
| `--rd-teal-dark` | `#2E7C6B` | teal text emphasis |
| `--rd-teal-tint` | `#DBEEE8` | teal backgrounds |
| `--rd-golden` | `#EFB23E` | stats / info accent |
| `--rd-golden-dark` | `#7A5408` | golden text emphasis |
| `--rd-golden-tint` | `#FBEBC9` | golden backgrounds |
| `--rd-peach` | `#E79B7D` | decorative |
| `--rd-shadow` | `0 10px 28px rgba(40,25,10,.07)` | elevated card |
| `--rd-font-display` | `'Rokkitt', Georgia, serif` | headings (body stays system stack) |
