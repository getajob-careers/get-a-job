# Current live landing page — audit

**Source file:** `src/pages/_preview/LandingV2Preview.jsx`
**Confirmed mounted at `/`:** `src/App.jsx:165` — `<Route path="/" element={<LandingV2Preview />} />`, an exact-path match inside the outer (unauthenticated) `<Routes>` block, which React Router matches ahead of the `<Route path="/*" element={<AuthenticatedApp />} />` catch-all at `src/App.jsx:300`. The file's own header comment confirms: *"the LIVE public homepage (the / route in App.jsx)."*
**Last changed:** `7d792d250ecca75a912ff9b84371f7d06a503748` — 2026-06-29 03:50:03 +0300 — `feat(landing): make landing-v2 the live homepage (#428)`
**Branch state at time of audit:** `main`, fast-forwarded to `origin/main` (`ebe049b`) before reading; no unpulled commits.

## Production-match confirmation

**Confirmed live**, verified two ways against `https://getajob.careers`:

1. Static HTML/`WebFetch` was **not sufficient** — this is a client-rendered SPA, so the raw HTML shell always shows the static `<title>Get A Job</title>` from `index.html` regardless of which route/component actually mounts. This did not confirm anything either way.
2. Loaded the live site in a real browser (already-authenticated session, so `/` auto-bounced to `/Home` per this file's own logged-in-redirect logic — expected behavior, not a problem). Fetched the production JS bundle directly (`https://www.getajob.careers/assets/index-A1bwrSGF.js`, `credentials: 'omit'`, no session state touched) and searched it for a fingerprint string unique to this file: the `console.info` build marker at line 573.
   - **Local file (line 573):** `console.info("[landing-v2] motion build 2026-06-27d — per-block reveals");`
   - **Production bundle:** contains the exact string `landing-v2] motion build 2026-06-27d`

The exact match confirms the deployed production bundle ships this file's code. This doesn't rule out later untracked local edits to *other* files, but for `LandingV2Preview.jsx` specifically, `git status` shows it clean (not in the working-tree diff), so the committed content read below is what's live.

---

## Design system note (non-obvious)

This page is **not** built with Tailwind/shadcn despite the rest of the app being a Tailwind + shadcn/ui codebase. It's fully self-contained: a template-literal `<style>` block (`LV_CSS`, lines 23–383) scoped under a `.lv` root class, with its own CSS custom-property token set and hand-rolled `lv-*` class names. Grepping the file for Tailwind utility patterns (`flex`, `grid`, `text-`, `bg-`, `px-`, `rounded-`, `font-`) returns zero real hits (the 4 regex hits are false positives — substrings of custom names like `lv-griddots`, `lv-diff-grid`, `lv-wrap`). Icons come from Tabler Icons, loaded via a CDN `<link>` injected into `<head>` at runtime (`useLandingV2Head`, lines 386–413), not an npm icon package.

### Color tokens (`--` custom properties, lines 26–41)
| Token | Value | Use |
|---|---|---|
| `--bg` | `#FBF8F1` | page background (warm off-white) |
| `--bg-warm` | `#F4EEE2` | secondary panel background |
| `--ink` | `#1C1815` | primary text |
| `--ink-soft` | `#6B6258` | secondary text |
| `--ink-faint` | `#A39A8C` | tertiary/meta text |
| `--ink-deep` | `#181410` | near-black surfaces (dark cards, footer-style blocks) |
| `--accent` | `#EF5A41` | primary coral accent (CTAs, links, highlight) |
| `--accent-deep` | `#C7461F` | accent hover/pressed state |
| `--accent-tint` | `#FCE6DF` | accent background tint |
| `--teal` | `#2E7C6B` | secondary accent (checks, "strong match" states) |
| `--teal-tint` | `#DBEEE5` | teal background tint |
| `--golden` | `#B8841C` | tertiary accent ("good match", "coming soon" tags) |
| `--golden-tint` | `#F7ECCF` | golden background tint |
| `--line` / `--line-soft` | `#E7DECE` / `#EFE8DA` | borders/dividers |
| `--card` | `#FFFFFF` | card surfaces |

### Type tokens (lines 42–46)
- `--font-d` (display): `'Geist'` — used for all headings (h1/h2/h3, stat numbers)
- `--font-b` (body): `'Geist'` — body copy, buttons
- `--font-m` (mono): `'Geist Mono'` — eyebrows, labels, URLs, pills, tags (all-caps/letter-spaced)
- Both Geist weights loaded via Google Fonts `@import` at the top of `LV_CSS` (weights 400/500/600/700/800/900 for Geist, 400/500 for Geist Mono)
- Radius tokens: `--r-sm: 10px`, `--r: 16px`, `--r-lg: 24px`, `--r-pill: 999px`

### Orphaned CSS (defined, never rendered)
Grepping class usage against the JSX shows several rule-blocks with no matching `className` anywhere in the render tree — leftover from an earlier design iteration, superseded by the current markup:
- `.lv-mock*` (lines 205–240) — an old "dashboard mockup" treatment, replaced by the `lv-ws-*` / `FeatureExplorer` screenshots
- `.lv-fx-tab`, `.lv-fx-list`, `.lv-fx-screen` (lines 244–252) — an old tabbed feature-list layout, replaced by `lv-ws-item`
- `.lv-cred*` (lines 176–181) — a "credibility strip" component that no longer exists in the page
- `.lv-orbit` (line 368, inside a media query) — referenced nowhere else

---

## Page sections, in render order

Render tree (`export default function LandingV2Preview`, line 1979): `Nav → Hero → FeatureExplorer → Differentiator → HowItWorks → DropSection → FAQSection → FinalCTA → Footer`.

### 1. Nav (`Nav`, lines 663–701) — fixed header
- **Logo:** "getajob" + a small coral dot (`.lv-logo .dot`, `background: var(--accent)`)
- **Nav links:** "Features" → `#features`, "How it works" → `#how`, "FAQ" → `#faq` (all smooth-scroll via a shared Lenis helper, `lvScrollTo`)
- **Right side:** "Log in" (text button, only shown when logged out) and a primary pill button reading **"Start"** (logged out) or **"Dashboard"** (logged in)
- **Visual:** becomes a blurred, bordered pill nav on scroll (`.lv-nav.scrolled` adds a `--line`-colored bottom border via a `scrolled` state watching `window.scrollY > 8`)
- No stats/data here.

### 2. Hero (`Hero`, lines 861–944) — `<header className="lv-hero lv-dots">`
- **Headline (verbatim):**
  > Your whole job search.
  > **One place that knows you.** *(coral `.accent` span)*
- **Subhead (verbatim):**
  > A ranked roadmap, CVs tailored to each job, and live matches, all built from one profile and **kept in sync**.
- **CTA buttons:**
  - Primary: **"Start here"** + arrow-up-right icon (`ti-arrow-up-right`) — `btn btn-accent`
  - Secondary (text link): **"See how it works"** + arrow-down icon, scrolls to `#features`
- **Visual content:** four dashed/blurred decorative shapes (a dashed ring, a dotted-grid square, two blurred color blobs — coral and teal) positioned absolutely and parallax-driven via `data-parallax` attributes read by `useMotion`'s scroll loop; a dotted-grid background (`.lv-dots`) behind the whole header.
- **Stats row (`HERO_STATS`, lines 791–809) — hardcoded literals, not API-driven.** The array comment is explicit: *"Static literals tied to the IL-only job corpus... must be updated BY HAND when the corpus expands... (the queued `landing_stats` RPC follow-up)"* — i.e., there's a known-future intent to wire these to a live endpoint, but as shipped they are not:
  1. **"4,000+"** (odometer count-up animation from 0) — "live roles in Israel" — icon `ti-briefcase`
  2. **"350+"** (odometer count-up) — "companies hiring now" — icon `ti-building-skyscraper`
  3. Text-only, no number: **"Sourced direct from company career pages"** — icon `ti-plug-connected`
  4. Text-only, no number: **"Refreshed every night"** — icon `ti-moon`
  - The first two animate via a custom `Odometer` component (lines 815–859): each digit is a vertical reel of 0–9 rendered twice, rolling up to its final value on mount (mechanical-counter effect), respecting `prefers-reduced-motion`.

### 3. FeatureExplorer (`FeatureExplorer`, lines 1561–1666) — `id="features"`, scroll-pinned tool tour
- **Section eyebrow/head (verbatim):**
  - Eyebrow: "Everything in one place"
  - H2: "One workspace. It all knows you."
  - Subhead: "Six tools, one shared memory of your background, keep scrolling to move through them."
- **Mechanism:** a tall spacer (`lv-pin-outer`, `height: 460vh`) with a `position: sticky` inner pane; scroll progress through that spacer maps to an `active` index (0–5) via `useStickyProgress` (own `requestAnimationFrame` loop, no IntersectionObserver), swapping which tool's mock screenshot and copy show. Clicking a tool in the left list jumps the scroll position instantly (no smooth-scroll, to avoid flicking through intermediate tools).
- **Six tools (`FEATURES`, lines 998–1525), each with an icon, name, one-line description, a fake in-app "URL" shown in a browser-chrome mock, and a hand-built mock screenshot (all inline JSX/hardcoded strings, not live data or real screenshots):**
  1. **Career roadmap** (`ti-route`) — "Every role ranked against your real profile." — mock URL `getajob.careers/Roadmap` — screenshot: 4 hardcoded role rows (Associate PM 72%, Business Analyst 64%, Growth Marketing 53%, Operations Lead 39%) each tagged Sweet spot/Detour/Growth
  2. **Tailored CVs** (`ti-file-text`) — "Rewritten per job from your real experience, never invented." — mock URL `getajob.careers/CVAgent` — screenshot: a fake CV card for "Maya Levi, Product" with two highlighted rewritten-bullet strings
  3. **Live job matches** (`ti-briefcase`) — "Thousands of openings, matched to your fit." — mock URL `getajob.careers/Career` — screenshot: 3 hardcoded job rows (Tavor, Keshet Labs, Nimbus IL) with match-strength pills
  4. **Pipeline** (`ti-layout-kanban`) — "Track every application from saved to offer." — mock URL `getajob.careers/Career` — screenshot: a 4-column kanban (Saved/Applied/Interview/Offer) with hardcoded fake company cards
  5. **Your coach** (`ti-message-chatbot`) — "An assistant that does the next step, not just talks." — mock URL `getajob.careers/CareerAgent` — screenshot: a fake chat exchange plus a "Confirm" action-add-to-tasks card
  6. **In your browser** (`ti-browser`) — "Tailor a CV on any job posting, without leaving the page." — mock URL `careers.tavor.com` — marked `soon: true`, renders a **"Soon"** pill in the tool list and a **"Coming soon"** tag next to its heading; screenshot: a fake Tavor careers page with a docked "Get A Job" extension side panel showing a paste-JD box and a "Generate tailored CV" button
- Each tool's right-hand copy comes from a parallel `FEATURE_POINTS` array (lines 1528–1559) — three bullet points per tool, all hardcoded strings, e.g. tool 1: "Ranked against your real profile", "Sweet spot, Detour and Growth tracks", "Re-scores as you log new wins".
- No CTA button in this section (browsing/informational only).

### 4. Differentiator (`Differentiator`, lines 1668–1790)
- **Headline (verbatim):** "One memory across your entire job search."
- **Body copy (verbatim, two paragraphs):**
  - "Generic AI starts from zero every session: re-explain yourself, get a different answer, end up back at your old draft."
  - "**Get A Job remembers.** Every win, every job, every chat builds on what it knows about you. The more you use it, the sharper it gets."
- **Visual:** an inline hand-drawn SVG diagram — a center "Your profile" circle with dashed animated flow-lines radiating out to four labeled pill nodes: CV, Roadmap, Matches, Coach. Pure decoration, no data.
- No CTA button.

### 5. HowItWorks (`HowItWorks`, lines 1815–1849) — `id="how"`
- **Eyebrow:** "From upload to first application"
- **H2:** "Four steps."
- **Steps (`STEPS`, lines 1792–1813), hardcoded, numbered 01–04:**
  1. "Upload your CV" — "We read your skills, experience, and education. No skills to retype."
  2. "See your roadmap" — "Every role in the library, ranked against you."
  3. "Tailor and apply" — "Pick a live job; your CV is rewritten from your real, matching wins."
  4. "Track and improve" — "Watch your pipeline, capture wins, and get a fresh move every morning."
- **Visual:** two decorative outline/dotted shapes (a ring, a dot-grid square), parallax-driven; no icons on the step cards themselves, just numbered badges.
- No CTA button.

### 6. DropSection (`DropSection`, lines 948–996) — `id="start"`
- **Eyebrow:** "Start in minutes"
- **H2:** "Drop your CV. We'll build the rest."
- **Subhead:** "Your roadmap, tailored resumes, and live matches, from a single upload."
- **CTA:** the drop-zone itself (`DropZone`, lines 703–783) — a real (non-decorative) drag-and-drop / click-to-browse file upload for `.pdf,.doc,.docx`. Idle state reads **"Drag your CV here"** / "or **browse files** · PDF or DOCX" with a pill button **"Upload & see your roadmap"** + arrow icon. On drag-over: **"Drop to start"**. While processing: **"Saved to this browser"** / "Taking you to sign up. Your CV carries over." — this is a real handoff: the file is saved to IndexedDB client-side (`savePendingCv`, no server call, no parsing) before routing into signup, so onboarding can auto-consume it.
- **Trust row below the drop zone (verbatim, three items, each with a check icon):** "No card required", "Roadmap in minutes", "Delete anytime"
- **Visual:** a dashed ring and a coral blob, parallax-driven decoration.

### 7. FAQSection (`FAQSection`, lines 1870–1901) — `id="faq"`
- **Eyebrow:** "Good questions"
- **H2:** "The honest answers."
- **Four accordion FAQs (`FAQS`, lines 1851–1868), first one open by default, verbatim:**
  1. **Q:** "What data do you collect, and where does it go?" **A:** "Your profile and CV data power the AI features, so it goes to our AI providers (OpenAI and Anthropic) to generate your roadmap, CVs, and matches. We don't sell your data and we don't run ads. The full detail of what's shared and where is in our privacy policy."
  2. **Q:** "Will the AI make things up on my CV?" **A:** "No. The CV agent works only from your real profile: your experience, education, skills, and the accomplishments you've captured. If you didn't provide a metric or achievement, it won't invent one. Every output is editable before you send it."
  3. **Q:** "Do I need to be a designer or a writer?" **A:** "No. Upload your CV and the platform does the heavy lifting: roadmap, tailoring, job matching. You stay in control and edit anything."
  4. **Q:** "Can I delete my account?" **A:** "Yes. From Settings, type a confirmation phrase and your account plus every record is permanently deleted. Not a soft-delete."
- No CTA button (accordion only, uses a rotating `+`/`×` icon per item).

### 8. FinalCTA (`FinalCTA`, lines 1903–1952)
- **Eyebrow:** "Start in minutes"
- **H2:** "Your next role is in there. Let's find it."
- **Subhead:** "Upload your CV and watch your roadmap, matches, and first tailored resume come together."
- **CTA button:** **"Upload your CV, free"** (logged out) or **"Open your dashboard"** (logged in) + arrow-up-right icon — larger `btn btn-accent`, on a near-black (`--ink-deep`) rounded card
- **Visual:** two blurred parallax color blobs (coral top-left, teal bottom-right) on the dark card.

### 9. Footer (`Footer`, lines 1954–1976)
- Logo ("getajob" + dot), "© 2026 Get A Job", and link row: Features (`#features`), FAQ (`#faq`), Privacy (`/privacy`), Terms (`/terms`)
- No stats, no CTA button.

---

## Behavioral notes relevant to "what's live"

- **Auth-aware redirect:** logged-in visitors landing on `/` are bounced to `/Home` immediately (`useEffect` at lines 1992–1996) — this is why the browser check above had to inspect the production JS bundle rather than the rendered page, since the authenticated session in this browser profile redirected before the marketing page could render.
- **Every CTA on this page** (nav "Start", hero "Start here", the drop zone, the final CTA) routes to `/Login?mode=signup` when logged out, or `/Home` when logged in — there is no separate "pricing" or "demo" destination.
- Motion is driven by a custom scroll-linked reveal/parallax system plus optional Lenis smooth-scroll (loaded dynamically, falls back to native scroll if it fails); all animation is disabled under `prefers-reduced-motion: reduce`.
