---
title: Design idea menu — canvas iteration 2, Stage B
status: menu (research only — nothing built past Stage A)
owner: eli
created: 2026-07-15
source: canvas /_preview/home-3tab · worktree getajob-design
---

# Design idea menu

A menu of **specific, individually addable** things for Get A Job — not directions,
not themes. Mined from freefaces, grainient, supahero, motion.dev, gsap, anime.js,
react-spring, motion-primitives, kokonutui, iconsax, jitter, rive, lottie(lab/files),
spline, godly, dribbble, reactbits, opensesh, manus, and the current AI-product tier
(Linear, Vercel, Perplexity, Arc, Raycast).

Each idea: **WHAT** · **SEEN AT** · **WHY US** · **COST** (S = hours / M = a day / L = multi-day).
Our surfaces referenced throughout: Tracker (kanban), Browse Jobs (scored match cards),
CV studio, Coach dock, sidebar feature tiles, funnel tiles.

---

## MOTION & FEEL

**1. Kanban cards tilt ~2° while dragging, land with a spring settle**

- SEEN AT: Linear (issue drag), react-spring physics demos
- WHY US: the Tracker is the daily loop — a physical settle makes each pipeline move feel deliberate and earned, not a silent DB write
- COST: M

**2. Match-score badge counts up (0 → 88%) on card entrance**

- SEEN AT: Vercel dashboards, motion.dev number tickers
- WHY US: the score is the emotional payload of Browse Jobs; a count-up makes every match feel calculated _for you_
- COST: S

**3. Staggered list reveal — cards fade + rise 8px, ~40ms stagger, on tab/list mount**

- SEEN AT: Linear list mount, motion-primitives "stagger"
- WHY US: Browse Jobs / Tracker currently pop in; a stagger makes the whole workspace feel alive on every switch
- COST: S

**4. Coach replies stream token-by-token with a soft shimmer cursor**

- SEEN AT: Perplexity, Arc answers, manus.im agent log
- WHY US: Coach is our AI face — streaming reads as a _thinking agent_, not a chat form; sells the intelligence
- COST: M

**5. Shared-element morph: a match card expands into its detail modal (position + size animate)**

- SEEN AT: Arc, motion.dev layout animations (`layoutId`)
- WHY US: keeps context between grid and detail; the single most "premium app" gesture we could add
- COST: L

**6. Funnel tiles animate the number + a thin fill-bar whenever pipeline counts change**

- SEEN AT: Linear cycle stats, Vercel usage meters
- WHY US: turns every card move into visible forward progress at the top of the Tracker
- COST: S

**7. Lenis-style smooth momentum scroll on the long surfaces (CV doc, jobs feed)**

- SEEN AT: godly.website (nearly universal there), our own landing already uses Lenis
- WHY US: cheap, and instantly reads "designed" vs native scroll; consistent with the live landing
- COST: S

---

## BUTTONS & INTERACTIONS

**8. Command-K palette for everything (switch tab, add application, tailor CV, ask coach, jump to a company)**

- SEEN AT: Linear, Raycast, Vercel, kokonutui command menus
- WHY US: we're a multi-surface OS; ⌘K signals "serious tool," speeds power users, and demos beautifully
- COST: L

**9. Track button → spring-scale + checkmark draw-on, then a ghost chip flies to the Tracker tab**

- SEEN AT: Vercel deploy button, Rive micro-interactions
- WHY US: makes "Track" a real capture and _teaches_ where the pipeline lives — onboarding by motion
- COST: M

**10. Magnetic primary CTAs (button nudges toward the cursor within a small radius)**

- SEEN AT: godly.website, reactbits "magnet"
- WHY US: extends the tile cursor-magnet to CTAs → one coherent "responds-to-you" interaction language
- COST: S

**11. Segmented toggle with a sliding coral pill (Top Matches / Search All; seniority chips)**

- SEEN AT: Linear toggles, Arc segmented controls
- WHY US: replaces our two flat buttons with one satisfying control; the sliding pill is a signature small delight
- COST: S

**12. Suggested-prompt chips fill coral left-to-right on hover (wipe, not a color swap)**

- SEEN AT: Raycast, motion-primitives hover fills
- WHY US: the coach prompts are the most-clicked affordance in the sidebar — reward the hover
- COST: S

---

## VISUAL IDENTITY (type · color · texture · tile-logos)

**13. Grain-textured warm gradient on the coach panel (subtle noise over cream → peach)**

- SEEN AT: grainient.supply, Linear/Vercel noise overlays
- WHY US: gives the AI surface a warm, tactile "product" feel and visually separates it from flat-cream content
- COST: S

**14. Pair Rokkitt (display) with a characterful grotesque for eyebrows/labels**

- SEEN AT: freefaces.gallery (e.g. a distinctive mono/grotesk), Vercel Geist pairing
- WHY US: our mono eyebrows are generic; a signature label face sharpens brand without touching body legibility
- COST: S

**15. Define a real type scale — paired size/line-height/tracking tokens (kills ad-hoc `text-[Npx]`)**

- SEEN AT: Vercel Geist, Linear
- WHY US: our known design-craft debt; the scale is the backbone every other visual idea sits on
- COST: M

**16. Company tile-logos: brand-tinted monogram tiles (dominant-color tint) instead of gray letter tiles**

- SEEN AT: Raycast, Arc favicons, Linear workspace avatars
- WHY US: makes Browse Jobs + Kanban scannable by brand at a glance; far more alive than gray initials
- COST: M

**17. Iconsax duotone for the feature tiles (filled coral accent) in place of lucide line icons**

- SEEN AT: iconsax
- WHY US: the tiles are a brand surface; duotone-with-coral reads more product-grade than uniform hairlines
- COST: S

**18. Soft coral focus/selection glow (outer glow) instead of the hard focus ring**

- SEEN AT: Linear, Arc selection states
- WHY US: warmer accessibility floor that fits the cream palette while staying WCAG-visible
- COST: S

---

## SIGNATURE MOMENTS (the peaks — worth crafting)

**19. CV-generated: a Rive/Lottie "document assembling" build animation, then the CV slides in**

- SEEN AT: rive.app, lottiefiles loaders
- WHY US: CV generation is our flagship payoff and takes ~80s — a crafted moment earns the wait instead of a spinner
- COST: M

**20. Offer-received: full-screen warm confetti + an "OFFER" stamp on the card, coach drops a congrats line**

- SEEN AT: Duolingo/Rive celebrations, LottieFiles confetti
- WHY US: the emotional peak of the entire product — make it unforgettable and screenshot-worthy (organic sharing)
- COST: M

**21. Onboarding-complete: sidebar/feature tiles light up one-by-one (fill + icon pop) as your profile unlocks them**

- SEEN AT: Linear onboarding, Arc first-run
- WHY US: turns setup from a chore into a reveal of the workspace you just earned
- COST: M

**22. First-match-found: the top card does a one-time glow + score count-up with a coach caption ("this one's a strong fit")**

- SEEN AT: Perplexity first-answer emphasis
- WHY US: the "aha, it actually works for me" — the moment that converts a trial user into a believer
- COST: S

---

## PROMO-VIDEO TOOLING (separate track — for later, not in-app build)

- **Rive** — interactive/looping micro-animations (CV assembling, tile light-up). Best pick because assets are reusable **both** in-app (ideas 19/21) and in promos.
- **LottieFiles / LottieLab** — lightweight vector celebrations + loaders; author in LottieLab or export from After Effects, ship as JSON.
- **Jitter** — fast no-code motion for social/promo clips: animate real app screenshots + captions. Lowest effort for marketing cuts.
- **Spline** — a 3D hero object (floating CV / orb) for the landing. Heavier; optional, landing-only.
- **GSAP** — if we script promo sequences over recorded app footage (timeline control). Overkill for in-app; handy for a polished sizzle reel.

---

## TOP-5 SHORTLIST — max forward-feeling impact per effort

Chosen for the biggest "this feels like a 2026 AI product" jump per build-hour. Four are S/M;
the one bigger bet (⌘K) is called out because its tier-signal is worth the L.

1. **Match-score count-up (#2, S)** — tiny build, hits the core emotional beat of Browse Jobs every single card. Highest impact-per-hour on the list.
2. **Staggered list reveal (#3, S)** — one utility, applied to jobs + kanban + matches; instantly makes the whole app feel animated and intentional.
3. **Grain-textured coach gradient (#13, S)** — one panel restyle that makes our AI surface look crafted and warm, not like a flat chat box.
4. **Track → spring + chip-fly-to-Tracker (#9, M)** — delights _and_ teaches the pipeline; turns the product's key verb into a moment.
5. **CV-generated signature moment (#19, M)** — our flagship payoff currently ends in a spinner; a crafted reveal is the single biggest perceived-quality upgrade for one surface.

**Bigger bet worth it:** **Command-K (#8, L)** — the clearest "serious tool" signal we can add; transforms navigation across our multi-surface OS and is the thing that makes demos feel Linear/Raycast-tier.
