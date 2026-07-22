# Design lane - resume point

**After any context clear, read THIS + tasks/lessons.md first. Never reconstruct from scratch.**
Overwrite this file each breakpoint (PR held / merged / ruling) and before ending a session. Resume point, not a log.

## Standing protocols (verbatim)

- **Canary:** begin every reply to Eli with "Eli, ...". It is a context canary - when the name stops appearing, Eli says **"canary"**, and on that word: overwrite THIS file with a fresh resume point and tell him to `/clear`. (Full protocol text also in the root `CLAUDE.md`, both lanes.)
- **Statusline:** `~/.claude/settings.json` runs `~/.claude/statusline-command.sh`, showing context-usage % first (green `<60`, yellow `60-79`, bold red `>=80`), then model / branch / dir. Proactively offer a handoff at ~80%.
- **Ledger reports:** end every report with a compact ledger (PR, SHA, state, claims to verify, evidence pointers, open questions) - no narrative recap.
- **Token tiering (HANDOFF-ONLY, per Eli):** for preview scaffolds + variant iteration, drop a model tier via `/model`; step back up for token-level implementation commits and craft-critical work. `/model` is Eli-driven. Do NOT mirror into CLAUDE.md.
- **Delegate:** searches -> `explorer`, gate runs -> `gatekeeper`, sweeps/counts -> `sweeper` (haiku subagents in `.claude/agents/`, loaded + smoked OK this session). NOTE: newly-added/edited agents need a full quit+relaunch to load (a `/clear` does NOT re-scan `.claude/agents/`).
- **Reporting discipline (Eli ruling, memory [[report-gated-means-flag-off-unreachable]]):** "gated" means EVERY changed line is unreachable flag-off. Shared components (render in both flag states) get an explicit UNCONDITIONAL-with-reason call-out. PR bodies for coach/canvas work lead with a FLAG SCOPE block.

## Identity

- The DESIGN lane, one terminal, persists across context clears. There is NO other design terminal - all redesign / canvas / CV-surface / token / onboarding-V2-surface work is this lane's.
- The "hub" (Eli) verifies claims, applies migrations, rules on merges. One writer per path. Merge ritual = CI-green -> squash -> delete branch after merged:true -> verify prod READY + serving SHA == squash SHA -> state edge-fn touch (none, for all frontend work).

## Owned paths

- CV Studio: `src/components/cv-studio/*` (CVStudioView, CVStudioLive); `src/lib/{writeProfileEntity,serializedWriteThrough,revertCvDataField,cvDataAdapter,useSeededCvModel}`; `supabase/functions/_shared/write-mediation.ts`.
- Coach/agents: `src/components/agent/*` (CoachDock, AgentDrawer, CoachInput, CoachThread); `src/lib/{CoachConversationContext,AgentDrawerContext}`; `src/components/chat/*` (ChatInterface, MessageBubble).
- Redesign surface: `src/components/redesign/*` (home: ThreeTabHome, CvMatchedRolesRail, useTopMatches; shell: CanvasShell/CanvasSidebar; ground: DepthField/GroundWash); `src/pages/_preview/*` canvas previews (incl. `canvas/CanvasCoachDock.jsx` = AgentComposer reference).
- Tokens/palette: `src/index.css` (`--rd-*` vars + coach polish keyframes), `tailwind.config.js` (`rd-*`), the `design-craft` skill doc.
- Home owns the `?welcome=1` arrival moment.

## Current arc: canvas Phase 2 - coach surface hardened, CV-document + AgentComposer next

**Merged + LIVE this session (all frontend, no edge fns, all serving-SHA verified on getajob.careers):**

- **#684** GroundWash rename (`GrainGround`->`GroundWash`, names-can't-lie) - squash `5dc42a6`.
- **#685** CV Studio: "Generate a job-specific version" filled `rd-primary` button + flag-on header-collision fix - squash `c2f635f`.
- **#686** Coach: expand button now mounts `AgentDrawer` in `CanvasShell` (was flag-off-only); textarea auto-grow (dock 160px fixed / panel 40vh) + `rounded-lg` rectangle - squash `e8ee108`.
- **#687** Coach polish bundle: spring-easing expand, message entrance, honest thinking-shimmer (coach is request-response not streaming - shimmer on the in-flight dots), scroll-pin - squash `2b7de0a` (dpl `B2zSjv8c...`).
- Prior (earlier sessions): #659 CV RED Ph1, #675/#683 onboarding V2, #677 rd-coral->rd-primary, #678 Slice 1 ground, #681 subagents, #682 handoff.

**Rollback target (unchanged all session):** promote `dpl_BUowG3s1rn6FEC2Kes2v8pfHfRSk` (commit `543420f`, #682).

## Standing rulings / constraints (verbatim)

- FLAG-OFF BYTE-IDENTITY: every flag-on change gated on isNextDesign()/rightRail; flag-off output byte-identical. Preserve EXACT Tailwind class strings (no class-sorter; token order matters). Edit shared components via text-surgery (python) to bypass the format hook, not Edit/Write.
- ONE WRITER PER PATH.
- Real flag param is `?next=1` (index.html bootstrap reads URLSearchParams.get("next"); "nextDesign" is the localStorage KEY, not a URL param). Flag-on reveal: `/Home?next=1`; `?next=0` clears. Flag-off editor: `/CVAgent`.
- NO whole-model persists in the CV write layer - per-field mediated writes only.
- TOKEN: primary #60617d (slate/indigo) is the KEEPER. #D6421F coral is RETIRED (survives only as the flag-OFF pre-reveal value). `trackColor` EXCEPTED from the rd-coral sweep.
- Canvas palette (live): `--rd-bg-card #FFFCF4` (chrome cards), `--rd-bg-page #F4EBDA` (ground), `--rd-primary #60617d`.
- **CV DOCUMENT paper = WHITE (Eli, this session): supersedes the cream-card ruling FOR THE DOCUMENT ONLY.** Proposed `#FFFFFF` for the paper vs ground `#F4EBDA` (chrome cards stay cream). Not yet built - in the quick-fix split below.
- GROUND: directional wash (shipped). Cream + wash only. ALL particulate texture retired at the category level. Canonical: `docs/design/canvas-tokens.md` + `phase2-canvas-arrival-plan.md`.
- Coach auto-grow is UNCONDITIONAL (bug fix, both flag states); coach visual/motion polish is flag-on only. Idea 4 = thinking-shimmer accepted by hub as the honest impl (coach doesn't stream).
- Browser smoke for auth'd surfaces: Playwright + `e2e/helpers/mockSupabase.js` (`injectFakeSession` + `mockSupabaseRoutes` + `MOCK_PROFILE_COMPLETE`); run a runner from INSIDE the repo (bare `playwright` import needs repo node_modules). Flag-off dock smoke pattern proven this session.

## Queue (HELD - next work arrives via separate hub kickoffs)

- **AgentComposer redesign (item 3): Phase 1 APPROVED, one PR, HELD until hub kickoff.** Build shared `<AgentComposer>` = rd-well bar (icon+textarea+send) + focus/empty pop-up suggestions (staggered reveal, keyboard nav) from `src/pages/_preview/canvas/CanvasCoachDock.jsx`. Rollout: **P1 CoachInput (dock+panel)**, P2 ChatInterface (CareerAgent/InterviewCoach/SkillDevelopmentAdvisor), P3 CVStudioView (may keep its chips). Gating: canvas visual flag-on only, flag-off keeps current look, auto-grow stays unconditional. Suggestions v1 = static per-surface starters (reuse DEFAULT_DOCK_PROMPTS / CANVAS_COACH_PROMPTS) + a `suggestions` prop for context-aware v2. Reuse CanvasCommandItem + stagger from _preview. One design decision to surface: pop-up supersedes the thread empty-state chips (avoid dup). Absorbs held idea 6 (prompt chips).
- **Eli feedback batch 1-8 (live pass, split PROPOSED, awaiting Eli's pick + hub kickoff):**
  1. CV paper WHITE (`#FFFFFF`) - QUICK-FIX.
  2. CV header "messy"/too low - composition rework - DESIGN (propose mock/options first; pairs with 1 as a CV-document design PR).
  3. Reach landing page from inside app (logo link shape) - QUICK-FIX **with gotcha**: `/` (LandingV2Preview) redirects authed users back to /Home (2026-07-19 loop lesson); needs a bypass (e.g. `/?stay=1` honored by the landing guard). Its own small PR (touches shared redirect graph).
  4. "Generate a job-specific version" weak CTA - 4a copy+treatment QUICK-FIX (bring options); 4b better pop-up/flow DESIGN (folds into AgentComposer pop-up + CV-gen ring).
  5. Chat toolkit tile missing its duotone back-bubble (other tiles have it) - QUICK-FIX (find toolkit-rail icon / toolColors.js).
  6. CV-gen ring/theater (loading design Eli loved) - STANDING queued design item, do not drop.
  7. AUDIT scope widened to EVERY page incl. legacy (Profile called out: pressing edit on an experience silently reorders it to top with no indication) - hunt this "disorienting silent state change" class everywhere.
  8. AUDIT quality bar (verbatim intent): errors/transitions/feedback states feel like a real product, "not a student who vibe coded a project." The audit doc is graded against this.
  - Suggested grouping: quick-fix PR = {5, 1, 4a}; item 3 = own PR (redirect graph); {2, 4b} = CV-document design pass.
- **(c) tab-consistency** - move CV/Browse/Tracker tabs UP to fill empty space (Eli ruling stands unless a competing use is nominated). Nominate approach before building (ask-don't-tell).
- **Slice 2 (arrival moment)** - phase-2 queue; sequencing with hub.

## Open questions for the hub

- Eli's pick from the 1-5 quick-fix vs design split; hub kickoff for AgentComposer Phase 1.
- Slice 2 vs the quick-fix/design/audit work ordering.
- Competing use for the space freed by moving tabs up in (c)?
