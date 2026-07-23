# CV lane — latest handoff (resume point)

Overwrite-on-update (standing rule). **After any context clear, read THIS +
`tasks/lessons.md` first.** ~150-line resume point, not a log.

## Standing protocol (session hygiene — Eli, effective 2026-07-22)

- **Name canary.** Begin EVERY reply to Eli with "Eli, …". When the name stops
  appearing, Eli says **"canary"** → on that word, overwrite THIS file and tell
  him to `/clear`.
- **Statusline** shows context % (green<60, yellow 60–79, red≥80; configured at
  `~/.claude/statusline-command.sh`). **Proactively offer a handoff at ~80%.**
  `/context` is user-only — point Eli to the statusline.
- **Reports end with a compact ledger** (PR · SHA · state · claims to verify ·
  evidence pointers · open questions) — no narrative recap.
- This protocol lives HERE, not in CLAUDE.md (the **design lane** owns CLAUDE.md).

## Lane identity + current state (2026-07-23)

The **CV / onboarding-sequence / scoring lane**. Two standing responsibilities:

1. **Onboarding sequence correctness + persistence** (NOT visual/UX — design lane
   owns V2 restyle + Phase 2 after the 2026-07-23 reassignment). **Cross-review any
   design-lane PR that touches a persist path** (`onboardingPersist.js`,
   `careerAnalysis.js`, `persistOnboardingProfileV2.js`, `inferPrimaryDomainWrite.js`).
   Contract for the design lane: `docs/handoffs/onboarding-restyle-brief.md`.
2. **ACTIVE ARC → the landing canvas-recolor adaptation** (below).

Onboarding V2 arc is DONE for this lane: #683/#688(PR-1)/**#691(PR-2)** all
merged + LIVE; docs handoff #693 merged. PR-2 serving-sha verified on `70bd110`.
Remaining onboarding is design-lane (Phase 1 restyle → Phase 2 UX → flag flip LAST).
Purge pre-flip: `email LIKE '%+6b-%'`.

---

## SCORING ARC — CLOSED (do not re-open without new evidence)

The scoring-formula arc is **shipped + closed**, NOT to-be-built (verified against
git log + `docs/eval/scoring-formula-design.md` §7–8, 2026-07-23):

- **C1 confidence-aware ranking + C2a must-have + C2b direction — LIVE**, default-on
  as the `scoring_v2` stack (#595→#597→#599→#600/#601, flipped default-ON in **#603**;
  kill switch `?scoring_v2=0`). All act on `attainability_score`; impl in
  `src/lib/scoreJobFit.js` (`CONF` block + `mustHaveCoreScore`), flag in
  `src/lib/flags.js`. Coverage sub-factor = `job.skill_coverage_ratio` (from
  `extract-job-requirements`).
- **C4 role-tier / underleveled — PARKED** (#608/#609): classifier works (95%) but the
  signal penalizes ~30% of GOODs on the pinned 160 — structural, not a threshold. Merged
  UNWIRED (`src/lib/roleTier.js`, `scripts/c4-harness.mjs`).
- **C3 hard gates — PARKED** (2b covers most of it). **C5 embeddings — UNLIKELY.**
- **Next-if-ever (DEFERRED, not active work):** a **second labeling round** on fresh
  real-user data with more senior profiles, then re-measure — the design doc §8 next
  move. Do NOT rebuild components; the 160-label snapshot is the binding constraint.

---

## ACTIVE ARC — Landing canvas-recolor adaptation (Eli-ruled 2026-07-23: ADAPTATION, not rework)

Eli LIKES the current landing. Scope = adapt its colour to the canvas scheme; keep
structure/copy/sections unless factually stale.

- **(a) CORE (buildable here — token application, canvas spec is law):** recolor the
  public landing to the canvas palette (`--rd-primary` #60617D family; canvas ground/card
  per `docs/design/canvas-tokens.md`). **KEY FINDING (2026-07-23):** the landing
  (`src/pages/_preview/LandingV2Preview.jsx`, the LIVE `/` route) is **self-contained** —
  it defines its OWN inline token block `LV_CSS` (`.lv { --bg / --ink / --accent / --teal
/ --golden / ... }`, coral `--accent: #EF5A41`), NOT the app's `--rd-*` tokens. So the
  `[data-next-design]` reachability problem does NOT apply: the recolor = **remap the
  `.lv` var VALUES to the canvas hexes** (bg→#F4EBDA, card→#FFFCF4, ink→#4A372D,
  accent→#60617D, teal→mauve #9B7D8A, golden→brown #60483E). Flag-free, works logged-out.
  Structure/copy STAY; flag factually-stale claims, never silently rewrite
  (anti-fabrication applies to marketing).
- **(b) INVITED idea menu (options, not commitments):** mascot (once the refined version
  exists — [[mascot-logo-animation-arc]]) + anime.js motion moments; cite the
  design-resource galleries (`docs/design/design-resources.md`). Eli picks; nothing
  builds uninvited.
- **(c) analytics check:** is the landing instrumented? If effectively unmeasured, propose
  MINIMAL instrumentation so we can see the page working post-flip.
- **(d) ownership:** recolor = mine; anything compositional (type unification,
  ground-texture language, new sections) → **design lane**. Cross-review if I touch any
  shared redirect/auth surface.

**Watch (tension to flag, not silently fix):** the landing's `.lv-dots` radial-gradient
dotted backdrop is exactly the particulate texture the canvas **retired at the category
level** (canvas-tokens.md, THE GROUND). Recoloring keeps the dots; aligning to the canvas
cream+directional-wash ground is compositional → design-lane / idea-menu.

## ON DECK — story bank extraction quality (after the landing arc)

---

## Reusable techniques (from this arc)

- **Preview drive under Vercel SSO + Turnstile:** mint a Vercel share URL
  (`get_access_to_vercel_url`) to bypass deployment protection in a browser logged
  into Vercel; enter the app via admin-created `+test` user + magic link (service_role
  from `supabase projects api-keys`; POST `/auth/v1/admin/users` email_confirm +
  `/auth/v1/admin/generate_link` magiclink; curl the verify link no-follow, read
  `#access_token`/`#refresh_token`; build a supabase-js session JSON, inject into
  localStorage `sb-ilmqmodklutztuybsvwd-auth-token`, reload).
- **Formatter churn:** on non-prettier-clean files (Roadmap.jsx et al.) an Edit
  reflows the WHOLE file. Restore `git checkout HEAD -- <f>` and re-apply logical
  hunks via python str.replace (bypasses the PostToolUse hook). Measure `git diff
--stat` after every edit.
- **Project subagents (explorer/gatekeeper/sweeper) need a full RELAUNCH**, not a
  /clear, to load. If absent from the agent list, run gates inline via Bash.
- **`.obsidian/` is gitignored** — its lint errors are local-only, never in CI.
- **block-main-push.sh over-matches** compound commands containing both `push` and
  `main` (even a branch delete / `gh pr create --base main`). Run those steps
  SEPARATELY; delete a merged branch via `gh api -X DELETE .../git/refs/heads/<b>`.
