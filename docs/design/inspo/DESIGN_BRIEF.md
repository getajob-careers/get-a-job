# Home Page Redesign — Design Brief

## Context

We're redesigning `src/pages/Home.jsx`. The current Home page is a basic stacked layout. We want it to feel designed, warm, and personal — like a real product, not an AI-generated dashboard.

**Before anything else:** Look at every image in `docs/design/inspo/` — view each one. These are the design references. This brief describes what I like about each one, but the images are the source of truth.

**After reviewing the images and this brief, come back to me with:**
1. What design patterns you see in the inspos that you'd carry over
2. Your proposed layout structure (rough description, not code)
3. Which existing components/queries you'd reuse vs. what's new
4. Any design decisions you're unsure about — surface them as numbered options with your lean
5. What you'd put in the hero vs. the card grid below it

**Do not start building until I confirm your plan.**

## Design direction

**Primary inspo (Home page layout):** `01_invision_freehand_hero.png` / `02_invision_freehand_full.png`
- Bold headline as the centerpiece of the page
- Stat cards flanking the headline on left and right
- Warm, light background (cream/blush tone) for the hero area
- Two clear CTAs below the headline (primary filled + secondary outlined)
- The page has ENERGY — it doesn't feel like a spreadsheet
- But it's NOT scattered/random — the elements are intentionally placed in a grid

**Secondary inspo (card style):** `04_outcrowd_banking_dashboard.png`
- Bento grid of mixed-size cards, each a self-contained data widget
- Some cards are colored (the red Statistics card, the blue Visa card) — accent cards break up the white
- Clean typography with big numbers
- Each card has a clear purpose and action

**What to AVOID:**
- Random floating/rotated elements (that's the #1 AI-generated dashboard tell)
- Gradient mesh backgrounds
- Purple-on-white color schemes
- Generic fonts (Inter, Roboto, Arial)
- Making it look like a Dribbble concept instead of a real product
- Overusing shadows, blurs, or glows

## Color direction

The landing page (already built, see `src/pages/Landing.jsx`) uses:
- Warm cream background: `#FAF7F2`
- Fraunces serif for display headings
- Dark text on warm surfaces
- Accent colors: teal for success, amber for warnings, muted earth tones

The Home page should feel like a natural continuation of that warmth once you're logged in. Not identical — it's a dashboard, not a marketing page — but the same family.

## Layout direction (not prescriptive — propose your own)

We explored a few concepts in Claude.ai. The rough direction that felt right:
- Hero section with warm background, bold personalized headline, stat cards flanking it, two CTAs
- Below: bento-style card grid with real data (roles, applications, job matches, LinkedIn, stories)

But this is a starting point, not a spec. If you see a better way to organize it after looking at the inspos, propose it.

The key principle: **every card shows real data and has a real action.** No decorative cards.

## Data sources (all already queryable)

These are the real data points to show. Use the existing queries/hooks — don't invent new ones.

| Card | Data source | What to show |
|------|------------|--------------|
| Today's focus | `daily_actions` (generate-daily-action) | Action title + short description + CTA button |
| Applications | `applications` table | Count + "X in progress" |
| Skill match | From `career_roles` + skill scoring | Percentage across Tier 1 roles |
| Stories | `stories` table | Count + "X this week" |
| Your roles | `career_roles` table | Tier 1/2/3 counts with color dots |
| Recent applications | `applications` table, last 3 | Company — Role + status badge |
| New job matches | `jobs` table, last 24h matching user's tier 1 roles | Count + company names |
| LinkedIn | `linkedin_posts` + `linkedin_optimizations` | Last post date + optimization status |

## Onboarding inspos (for future reference, not this PR)

The remaining inspo images (`05_messimo_onboarding.png` through `09_health_assessment_mobile.png`) are for the onboarding redesign — a separate PR. Key patterns to carry forward later:
- One question per screen
- Big bold heading per step
- Visual selection cards (not form dropdowns)
- Progress indicator (step dots or bar)
- Generous whitespace
- Friendly illustrations where possible

## Tech constraints

- React 18 + Tailwind + shadcn/ui
- TanStack Query for data fetching (already set up)
- No new dependencies unless truly needed
- Mobile responsive (students open from WhatsApp on phones)
- Must work with existing sidebar layout (`Layout.jsx`)
- Keep the warm cream tone but don't make the sidebar or other pages look broken — scope to Home only

## Questions for you to answer in your plan

- Should the warm cream background apply to just the hero area, or the full page?
- The landing page uses Fraunces serif for headings — should the Home dashboard use it too, or keep it dashboard-clean with a sans-serif?
- Which cards are most important to show above the fold on mobile?
- Are there any existing Home.jsx queries/components worth keeping, or is this a full rebuild?
- Should the Daily Action card be the most prominent element, or the personalized greeting?
