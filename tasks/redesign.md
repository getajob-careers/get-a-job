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
| 3A | Shell (Layout + SidebarFooter) | simple | ☐ | Cream sidebar + coral active. NO IA change. |
| 3B | Home | complex | ☐ | Inventory landed in PR 3A investigation. Preview = pre-seeded QueryClient. |
| 4  | Roadmap | complex | ☐ | Tracks 1/2/3 cards, track scoring, refresh flow. |
| 5  | Jobs | complex | ☐ | Search RPC, filters, JobCard fork. |
| 6  | Tracker | complex | ☐ | Pipeline kanban, DnD, status badges. |
| 7  | Profile | complex | ☐ | EducationTab, CertificationsSection, experiences accordion. |
| 8  | Story Bank | simple | ☐ | Capture + library. |
| 9  | Tasks | simple | ☐ | Checklist + filters. |
| 10 | Calendar | simple | ☐ | Event view. |
| 11 | LinkedIn | complex | ☐ | ProfileTab + Posts + Outreach + Optimization. |
| 12 | Chat agents | complex | ☐ | All 4 agent surfaces share the SSE streaming wrapper. |
| 13 | Internship | complex | ☐ | Browse + Pipeline + DetailDrawer + match_score. |
| 14 | Resources | simple | ☐ | Static-content page. |
| 15 | Settings | simple | ☐ | Account + delete. |
| 16 | Landing | simple | ☐ | Public marketing page — final pass. |

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
