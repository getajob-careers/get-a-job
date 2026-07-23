# Design lane - resume point

**After any context clear, read THIS + tasks/lessons.md first. Never reconstruct from scratch.**
Overwrite this file each breakpoint (PR held / merged / ruling) and before ending a session. Resume point, not a log.

## Standing protocols (verbatim)

- **Canary:** begin every reply to Eli with "Eli, ...". Context canary - when the name stops appearing Eli says **"canary"**, and on that word: overwrite THIS file with a fresh resume point and tell him to `/clear`.
- **Statusline:** context-usage % shows first. Proactively offer a handoff at ~80%.
- **Ledger reports:** end every report with a compact ledger (PR, SHA, state, claims to verify, evidence pointers, open questions).
- **Delegate:** searches -> `explorer`, gate runs -> `gatekeeper`, sweeps/counts -> `sweeper` (haiku subagents in `.claude/agents/`). Newly-added/edited agents need a full quit+relaunch (`/clear` does NOT re-scan). For design-JUDGMENT fan-out (audits), use `general-purpose` agents, not the haiku search subagents.
- **Reporting discipline ([[report-gated-means-flag-off-unreachable]]):** "gated" means EVERY changed line is unreachable flag-off. Shared components get an explicit UNCONDITIONAL-with-reason call-out. PR bodies for coach/canvas work lead with a FLAG SCOPE block.
- **Merge ritual gotcha:** `gh pr merge --delete-branch` FAILS in this worktree (local `main` is checked out in the sibling `getajob-eval` worktree). Merge WITHOUT `--delete-branch`, confirm `merged:true` via `gh pr view`, then delete the remote branch via `gh api -X DELETE repos/getajob-careers/get-a-job/git/refs/heads/<branch>`.

## Identity

- The DESIGN lane, one terminal, persists across context clears. ALL redesign / canvas / CV-surface / token / onboarding-V2-surface work is this lane's. Design lane OWNS V2 onboarding Phase 1 + Phase 2. CV lane keeps sequence/persistence correctness + cross-reviews any of our PRs touching persist paths.
- The "hub" (Eli) verifies claims, applies migrations, rules on merges. One writer per path.

## Owned paths

- CV Studio: `src/components/cv-studio/*`; `src/lib/{writeProfileEntity,serializedWriteThrough,revertCvDataField,cvDataAdapter,useSeededCvModel}`; `supabase/functions/_shared/write-mediation.ts`.
- Coach/agents: `src/components/agent/*` (CoachDock, AgentDrawer, CoachInput, CoachThread, AgentComposer, coachPrompts.js); `src/lib/{CoachConversationContext,AgentDrawerContext}`; `src/components/chat/*` (ChatInterface, MessageBubble).
- Redesign surface: `src/components/redesign/*` (shell + ground + home); `src/pages/_preview/*` canvas previews.
- Mascot: `src/components/redesign/mascot/*`, `src/pages/_preview/MascotPreview.jsx`, `docs/design/mascot-*`, `.claude/skills/character-craft/`.
- Onboarding V2: `src/pages/Onboarding*.jsx` / `OnboardingV2*` + screens 0-3 + SpringboardScreenV2 + ReviewScreenV2 + OnboardingTutorial + `src/lib/onboardingPersist` (persist paths = CV-lane cross-review). READ `docs/handoffs/onboarding-restyle-brief.md` + `docs/design/onboarding-v2-phase1-plan.md` BEFORE any onboarding work.
- Tokens/palette: `src/index.css` (`--rd-*` vars + keyframes), `tailwind.config.js` (`rd-*`), the `design-craft` skill doc.

## Flag + smoke facts (verbatim)

- Real flag param is `?next=1` (index.html bootstrap reads `URLSearchParams.get("next")`; "nextDesign" is the localStorage KEY, NOT a URL param). Flag-on reveal: `/Home?next=1`; `?next=0` clears. Flag-off editor: `/CVAgent`. CSS gate = `:root[data-next-design]`.
- `CanvasShell` (Layout.jsx `if (isNextDesign()) return <CanvasShell>`) is FLAG-ON only in prod; flag-off returns legacy Layout. **PROD DEFAULT IS FLAG-OFF - most real users never see canvas work until the flip.**
- FLAG-OFF BYTE-IDENTITY: edit shared components via python text-surgery (bypasses the PostToolUse formatter). Add imports WITH usage in the SAME edit, then grep+lint. Two flag token blocks in index.css: flag-OFF `:root` primary `#d6421f` coral / tertiary `#5e584e`; flag-ON `:root[data-next-design]` primary `#60617d` slate / tertiary `#a6957f` (self-documented sub-AA).
- **Playwright is NOT installed.** Vitest render tests for flag-on; browser smoke via claude-in-chrome needs a dev server + auth.
- **Vercel:** project `prj_dOCEyCOxIvtrgralB5uUdJlUDYMz`, team `getajob-team`, prod alias `getajob.careers`. Verify serving-sha via `get_deployment getajob.careers`.

## STATE AS OF 2026-07-23 (this session)

### MERGED + LIVE this session

- **#695** `eli/mascot-prototype` squash `22fa5425` - mascot Round 1 + character-craft skill + reference board. Preview-gated (zero live change). MERGED, branch deleted.
- **#698** `eli/canvas-visit-homepage` squash `4337d2cd` - sidebar footer "Visit homepage" (Option A), UNCONDITIONAL both flag states. MERGED, branch deleted. **This is the one live-visible delta.**
- **origin/main HEAD = `4337d2cd`.** Prod serving `dpl_DmawvSTqEvwj7FPiuwFQDNWvUebY` (READY, verified on getajob.careers alias). Zero edge fns in either.
- **Rollback target:** `bc221d0` (#696) / `dpl_5xsizkWrF7d2ZwSeoeKwVCwKDFes`.

### MASCOT: Round 1 = MISS -> COMMISSIONED SHEET (Eli ruled 2026-07-23)

- **Verdict:** MISS. Motion doesn't read (sip/typing unconvincing), laptop doesn't read as a laptop, figure not seated on the chair, appeal missed. **NO further in-house figure attempts.**
- **Ruled fallback taken:** commissioned character sheet. **The A-frame concept STAYS** (character seated at an A-frame desk that genuinely reads as the logotype's "A", per the storyboard spine).
- **Artist brief WRITTEN:** `docs/design/mascot-artist-brief.md` - commission-ready (character desc, A-frame-reads-as-A requirement matched to CanvasLogo MarkFullChair, 6-pose vocabulary [rest-in-A / working / drinking / reading / celebrating / horizon], separable-parts + pivot rigging spec, palette->hex token table, deliverables/turnaround). Reference board + motion registers indexed for the illustrator.
- **NEXT on mascot:** Eli sources an illustrator / hands the brief out. On sheet delivery -> rig it (layered SVG + anime.js) -> drops into the already-built sign-up idle + queued slots. governed by `character-craft` skill.
- **CV-gen theater DECOUPLED from the mascot (Eli ruled):** when its queue slot arrives it ships MASCOT-LESS (ring / staged honest-progress standing alone); the character drops in later as an upgrade once the sheet lands + is rigged. DO NOT build the theater now.

### FULL DESIGN AUDIT: DELIVERED -> `docs/design/audit-2026-07.md`

- Every registered page + 2 shells + public landing, both flag states, against the 9-rule design-craft bar. V2 onboarding EXCLUDED from deep-dive (one-line note only - about to be rebuilt).
- **127 findings: 6 blockers / 66 degraded / 55 polish.** Findings only, no fixes. **Eli triages before ANY fix PR.**
- Method: 7 parallel general-purpose domain agents; all live-visible blockers spot-verified against source by the synthesizer (Profile reorder, landing AA + dropzone, Subagents AA, Career/Tasks empty-states, coral-AA recalc = borderline-pass not fail).
- **6 blockers (triage roll-up at doc tail):** (1) Profile Projects reorder-on-edit [flag-off LIVE, Eli's flagged hazard - CONFIRMED, `Profile.jsx:325` no ORDER BY]; (2) Subagents AA `#A3A3A3` [flag-off LIVE]; (3) Landing AA `--ink-faint`/golden pills [public LIVE]; (4) Landing dropzone no validation/error [public LIVE]; (5) Career Pipeline false-empty flash [flag-on]; (6) Tasks category-filter void [both].
- **6 cross-cutting themes (highest-leverage fix PRs, each retires a class):** (1) shared focus-visible utility; (2) `--rd-error-*` token trio (coral retired -> no error/danger color -> save-failed pills, delete buttons, error cards all mis-color); (3) darken sub-AA greys (`#A3A3A3`/`#A39A8C`/flag-on tertiary); (4) token/type scale (biggest volume, lowest severity - the "vibe-coded tell"); (5) 44px touch targets; (6) one tab component.

## Queue (post-audit)

1. **>> AWAITING ELI: audit triage.** Eli picks which findings -> fix PRs + priority order. NOTHING fixed until he triages. The 6 cross-cutting themes are the nominated high-leverage batches.
2. **V2 Onboarding Phase 1** - PLAN at `docs/design/onboarding-v2-phase1-plan.md`. Gated on BOTH audit triage AND Eli's option-pair picks from that plan. Palette basis = **0A RULED** (stamp `data-next-design` on the V2 shell mount; V1 flag-off byte-identity invariant STANDS - scope the stamp, never global). Fold the audit's error-token + focus-ring themes into this rebuild rather than patch V2 separately.
3. **V2 Onboarding Phase 2** (review rework, upload-wait loading, location autocomplete, entrance motion, thin-profile nudge). Mascot acting-slots land here (additive, work empty until the sheet is rigged).
4. **Mascot commissioned sheet** - brief out; on delivery rig + adopt.
5. **CV-gen ring/theater** - build MASCOT-LESS when its slot arrives (character is a later upgrade).
6. **AgentComposer Phase 2** (ChatInterface agent pages) -> Phase 3 (CVStudioView chips). Independent; interleavable.
7. **(c) tab-consistency** - nominate approach before building (audit theme 6).

- **FLIP = LAST**, after onboarding Phase 2 (Eli confirmed).

## Rulings locked (do not re-litigate)

- **CTA = Option A** (landed #690). **Landing-link = Option C** (landed). **Visit-homepage = Option A** (landed #698).
- **Mascot Round 1 = MISS -> commissioned sheet; A-frame stays; no more in-house figures** (2026-07-23, above). CV-gen theater decoupled, ships mascot-less.
- **Motion = anime.js v4 per-submodule** (installed v4.5.0) for timelines/orchestration; CSS for simple loops. framer-motion being pruned. reduced-motion->static + canvas-only + honest UI bind all motion work.
- **Onboarding palette = 0A** (stamp data-next-design on V2 shell mount, scoped).
- **Dead deps** (framer-motion/three/canvas-confetti in 0 src files) - prune-PR LOGGED, Eli's call, not built.

## Open questions for the hub

- Audit triage: which of the 127 findings -> fix PRs, and in what order? (6 cross-cutting themes nominated as the batches.)
- Onboarding Phase 1: Eli's option-pair picks from the phase1-plan doc.
- Mascot: illustrator sourcing / who receives the brief.
- coral white-text AA (flag-off primary buttons): synth calc = ~4.5:1 borderline-pass; confirm with a real checker before treating as a fix item.
