# Get A Job — Design & UX Strategy

**Generated:** 2026-05-08
**Context:** Pre-launch design planning conversation between Eli and Claude
**Purpose:** Reference doc for Week 6 visual redesign + ongoing UX decisions

---

## 1. The Overwhelm Problem

The platform has 28 features accessible simultaneously in the active job search phase. After onboarding (resume upload → career analysis → track reveal), users see a sidebar with 10+ pages and no priority signal. A first-time job seeker (say, a 22-year-old Reichman student looking for their first BD/PM/CSM role) doesn't know where to start.

**The problem isn't too many features — it's no guided path through them.**

---

## 2. Information Architecture — Collapsible Sidebar

Collapse from 10+ sidebar pages to **5 top-level sections**. Each section expands on click to reveal its sub-pages.

### Proposed structure:

**Home** (no sub-items — it's the dashboard)

**Career** (expands to):
- Career Analysis (tier roadmap)
- Story Bank
- Learning Paths
- Skills & Profile Editor

**Applications** (expands to):
- Application Tracker
- Job Suggestions
- Job Scout (when shipped)

**LinkedIn** (expands to):
- Profile Optimizer
- Posts
- Networking (Comments + Outreach)

**Chat** (expands to):
- Career Agent
- CV Agent
- Interview Agent
- Skill Advisor
- Practice Interview (when shipped)

### Design behavior:
- Sidebar shows 5 items by default, collapsed
- Clicking a section expands it to show sub-pages
- Only one section expanded at a time (accordion)
- Current page highlighted within expanded section
- Everything is always one click away — nothing is hidden or locked

---

## 3. Home Dashboard as Mission Control

Home is the screen users return to every session. It's not a static dashboard — it's a dynamic surface that changes based on where the user is in their journey.

### Key components:
- **Daily action card** (top, prominent) — one action, Done/Snooze/Dismiss
- **Continue where you left off** — most recent activity with resume link
- **Application status summary** — pipeline at a glance
- **Contextual nudges** — "You have 3 stories — enough to generate a LinkedIn post"
- **Career roadmap summary** — Track 1/2/3 roles

### The daily action card is the heartbeat:
The mental model becomes: "Open app → see what to do today → do it → explore if I want to."

---

## 4. Display Principles — Making Features Feel Clickable

### 4.1 Show the output, not the input form
When a user opens the CV section, they should see their most recent CV rendered beautifully, with a button to tailor it to a new role. When they open LinkedIn Profile, they should see their current optimized sections displayed like an actual LinkedIn profile, with "Regenerate" on each section. Lead with the result, not the process. The form is a modal or side panel that appears when they want to create something new.

### 4.2 Cards over pages
Every piece of output the platform generates — a CV, a LinkedIn post, a story, an outreach message, a job suggestion, a comment option — should be a card. Cards are scannable, skimmable, and feel like objects you can interact with. A card has a clear visual hierarchy: title, key info, and 1-2 actions.

### 4.3 Inline actions, not navigation
When a user sees a job suggestion card, the actions should be right there on the card — "Apply," "Save," "Tailor CV for this role." Clicking "Tailor CV" shouldn't navigate them to a different page. It should open a panel or modal that already has the job description pre-loaded. The fewer page transitions, the more fluid the experience feels.

### 4.4 State and progress should be visible
Story Bank should show "12 stories captured, 8 used in CVs, 4 unused" with visual indicators. LinkedIn Profile should show section-by-section completion — "5 of 7 sections optimized." These aren't gamification — they're orientation signals.

### 4.5 Preview before commit
Every AI-generated output should render as a preview that the user can edit, refine, or regenerate before it saves. The post composer (compose → preview) and outreach coach (editable bubbles) already do this. Make it the universal pattern.

### 4.6 Contextual connections between features
When looking at a job in the tracker, show "3 stories match this role" and "Your Track 1 role 'BD Analyst' aligns with this JD." When writing a LinkedIn post, the Story Bank sidebar surfaces relevant stories. When on the Career page, show which applications map to which tier. Make the data connections visible.

### 4.7 Reduce visual density
Generous whitespace, clear section breaks, one primary action per view. If a component has more than 3 buttons visible at once, it's too dense. Most important action = filled button with primary color. Secondary actions = outline or text link.

---

## 5. The North Star Test

Every screen should answer two questions within 2 seconds:
1. **"What am I looking at?"**
2. **"What should I do next?"**

If a screen doesn't answer both, it needs work.

---

## 6. Design Pass Priority Order

1. **Home dashboard** — most-seen screen, sets the tone
2. **Application tracker** — highest engagement feature
3. **LinkedIn hub** — 3 tabs, complex but already well-structured
4. **CV management** — show output first, form second
5. **Career analysis** — the "wow" moment, needs to land visually

---

## 7. Platform Simplicity Philosophy

**Do NOT lock features behind progression gates.** All features are valuable from day one. The solution to overwhelm is not restriction — it's navigation.

The collapsible sidebar reduces visual noise. The Home dashboard highlights what's relevant right now. The daily action card guides users who don't want to explore. But everything is always accessible for users who want to browse directly.

The goal: 28 features that feel like one coherent experience, not 28 separate tools.

---

## 8. Pre-Launch Checklist (from strategy conversation)

### Must-have before June 15:
- [ ] Landing page at getajob.careers (value prop, how it works, signup CTA)
- [ ] Privacy policy + Terms of Service + AI disclaimer (Noms can draft)
- [ ] Consent checkbox at signup
- [ ] Sentry error tracking (free tier, React + edge functions)
- [ ] Vercel deployment + DNS + env vars
- [ ] In-app feedback button → feedback table
- [ ] OpenAI Track 2 rate limits (check/upgrade)
- [ ] End-to-end test with realistic Reichman student profile
- [ ] Founders' agreement (Eli, Isaac 18%, Sammy TBD%) — before launch

### Nice-to-have before June 15:
- [ ] Supabase Pro plan for daily backups
- [ ] Simple Slack/email alert on edge function error spikes
- [ ] Load test: 20 concurrent career analysis calls

---

## 9. Competitive Positioning

### Where Get A Job wins:
1. **Story Bank** — no competitor has structured story capture
2. **Career OS depth** — 3-track roadmap with 170+ role library
3. **Anti-fabrication** — 3-layer guards, verbatim metric binding
4. **LinkedIn networking suite** — comment coach + outreach coach with multi-turn
5. **Israeli market vertical** — military service, 8200 signals, local ecosystem
6. **Price** — not monetized for job seekers and no subscription (the earlier $12/month positioning is retired; future revenue is expected from the recruiter side)

### Key risk:
The gap between "special product" and "successful product" is execution on onboarding, retention, and making 28 features feel simple.

---

## 10. Founder Equity (Discussion Notes)

- Eli: 65-70% (full-time founder, product, GTM, development)
- Isaac: 18% (co-founder, confirmed)
- Sammy: 5-8% (executive assistant, finances — TBD based on ongoing role)
- Option pool: ~5-10% for future hires
- All should vest over 4 years with 1-year cliff
- Need founders' agreement before launch
- Israeli Ltd. entity needed (₪3-5K setup)
- Noms can draft basics, startup lawyer to review
