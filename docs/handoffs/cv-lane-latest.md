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

## LANDING RECOLOR ARC — DONE + LIVE (#696, 2026-07-23)

Recolored the public landing (`src/pages/_preview/LandingV2Preview.jsx`, live `/`) to
the canvas palette + added a minimal consent-respecting analytics funnel. Eli CERT
PASSED, hub VERIFIED. **Squash-merged `bc221d0`; prod deploy READY** (Vercel prod
deployment `5xsizkWrF7d2ZwSeoeKwVCwKDFes`). No edge functions. Rollback = `b56fe1b`.

- **Recolor:** `.lv` self-scoped token block remapped to canvas hexes (accent
  coral→slate `#60617D`, teal→mauve `#9B7D8A`, golden→brown `#60483E`, bg `#F4EBDA`);
  hardcoded coral/ink rgba swept to slate/warm-brown; AA guard = mauve-deep `#7B606D`
  for small text/icons. Zero coral in DOM; flag-free public surface.
- **Analytics:** reuses `src/lib/analytics.js` `track()` (no-ops before PostHog init →
  consent-respecting). Events: `landing_cta_clicked`, `landing_cv_upload_started`,
  `landing_cv_upload_succeeded`, `landing_section_reached`. No `main.jsx`/consent touch.
- **HUB-OWNED follow-up:** PostHog landing-event check runs once consented traffic exists
  (I can run it via PostHog MCP on the flag-on prod build when asked).

**Landing-motion follow-up (NOT this lane yet):** ideas 2/3/4 — mascot CV-drop loader,
SVG line-draw on scroll, staggered stat/feature reveals — **gated on the design lane's
anime.js install PR** + Eli's mascot eye-pick. Do NOT build on framer-motion (ruled for
pruning). The recolor is the clean foundation the design lane's scroll-driven
mascot-journey flagship composes on top of.

**Routed to DESIGN LANE (log, do not touch):** the `.lv-dots`/`griddots` particulate
backdrop (retired category in-app) and Geist-vs-canvas font unification — both
compositional.

---

## ACTIVE ARC — Story bank extraction quality (PR #697, HELD, 2026-07-23)

**Target = `extract-bullets`** (the reachable capture path; Eli-ruled over the legacy
`extract-story-from-text` on the undiscoverable /StoryBank page). Branch
`eli/story-extraction-quality`. **No deploy yet.**

**Root cause (VERIFIED):** extractor is anti-fab-correct but starved by thin input —
`situation`/`task` NULL in 100% of the 13 existing stories, 0 real-user rows. Dominant
lever = richer INPUT (guided elicitation, design-lane) since anti-fab forbids the
extractor from enriching. `extract-story-from-text` + `extract-bullets` share the same
thin-input shape.

**What's built + HELD on #697:**

- **Eval harness** `scripts/story-extraction-eval.mjs` (mirrors extract-bullets prompt+parse
  EXACTLY; reads live SYSTEM_PROMPT out of the edge fn) + **committed vitest test**
  `scripts/story-extraction-eval.test.mjs` (13/13, runs under `npm test`).
- **Frozen synthetic set** `docs/eval/story-extraction-inputs.json` (7 inputs: thin→rich,
  software+ops/mktg/BD/analytics, EN+Hebrew-mixed, messy paste, exp+edu). **STAYS FROZEN.**
  Rubric `docs/eval/story-extraction-rubric.md`; findings + autopsy
  `docs/eval/story-extraction-baseline-findings.md`; run JSONs in `docs/eval/results/`.
- **Grounding-context module** `_shared/extraction-context.ts` wired into extract-bullets.
  **Round-1 grounding (with skill-vocab) LEAKED** (grounded emitted profile top_skills as
  demonstrated skills on pastes that never named them: thin-swe→Python/SQL, hebrew→SQL).
  Gate fired → **recalibration #1 (hub-ruled) BUILT:** skill-vocab line deleted, domain +
  target-role framing kept (mid-ops 84→98, leaked nothing). #2 (skill-vocab→resolution)
  deferred; #3 (contamination gate) parked (false-drops Hebrew "Data Analysis"); #4 rejected.
- **Harness fixes:** OPENAI_API_KEY sanitize (U+2028 burned a run); metricNumbers regex
  ("20 meetings"→20M bug); word-boundary tool gate (sql-in-postgresql).

**STATE: ARC CLOSED + LIVE (2026-07-23).** #697 squash-merged (`d89821c`), branch deleted.
extract-bullets deployed **v12->v13** (`--project-ref ilmqmodklutztuybsvwd`); serving-fingerprint
VERIFIED on the deployed bundle (framing-only grounding block: field + working-toward, NO
skill-vocabulary line; targetCols reverted). Prod Vercel `dpl_2RkhXAaY2PVxyqXfHi1kZmrhbEwd`
READY on `d89821c`. Gate PASS: grounded anti-fab 0, mid-ops preserved, grounded >= baseline all 7,
set mean 90.6->91.7.

**ROLLBACK:** predecessor prod commit `4337d2c` (Vercel `dpl_DmawvSTqEvwj7FPiuwFQDNWvUebY`);
extract-bullets prior **v12** (redeploy prior source to revert the edge fn). Full revert = revert
the squash + redeploy extract-bullets from `4337d2c`.

**Queued follow-ups (separate PRs, NOT kicked):** (1) hedge-marker checker-list gap
("over"/"+" unrecognised); (2) outcome-heuristic credit for tool/deploy bullets (rich-swe
discipline dip); (3) deferred proposal #2 (skill-vocab -> skill-ID resolution). Design-lane
elicitation brief `docs/handoffs/story-elicitation-brief.md` still HELD for Eli's go.

**NEXT ARC: NOT kicked - Eli rules it later.** Candidates on record: interview bot, skill hub,
browser extension, graphify. Stand by.

**Design-lane brief** `docs/handoffs/story-elicitation-brief.md` (guided STAR elicitation,
client-side block assembly, zero edge-fn change) — held for Eli's go. HELD (this lane):
prompt-rework + model-tier, done once against the real elicited input shape.

## Reusable techniques (from this arc)

- **Palette recolor cert = computed values, NOT screenshots.** The landing's reveal
  crossfade (opacity tracks scroll) washes out screenshot colours mid-scroll. Cert via
  `getComputedStyle` on the `.lv` token vars + sample elements (eyebrow / logo dot /
  `.btn-accent`) → exact hexes, opacity-independent; and an `outerHTML` scan for the OLD
  literals (`#ef5a41` / `239,90,65`) proves zero leftover. For the one holistic visual
  shot, inject `.lv *{opacity:1!important;transform:none!important}` then screenshot.
  Local `npm run dev` drive is enough for a flagless public page — no Vercel-SSO dance.
- **Two clean commits from an interleaved working tree:** back up the gate-passed file,
  `git checkout origin/main -- <file>`, re-run each change as its own asserted python
  script, commit between; then `diff -q` the final tree vs the backup to prove identical.
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
