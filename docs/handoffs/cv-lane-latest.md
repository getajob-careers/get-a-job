# CV lane — latest handoff (resume point)

Overwrite-on-update (standing rule). **After any context clear, read THIS +
`tasks/lessons.md` first.** ~150-line resume point, not a log.

## Standing protocol (session hygiene — Eli, effective 2026-07-22)

- **Name canary.** Begin EVERY reply to Eli with "Eli, …". When the name stops
  appearing, Eli says **"canary"** → on that word, overwrite THIS file and tell
  him to `/clear`.
- **Statusline** shows context % (green<60, yellow 60–79, red≥80; already
  configured at `~/.claude/statusline-command.sh`). **Proactively offer a
  handoff at ~80%.** At each checkpoint, note the context breakdown (`/context`
  is a user-only command — Claude can't self-invoke it; point Eli to the
  statusline).
- **Reports end with a compact ledger** (PR · SHA · state · claims to verify ·
  evidence pointers · open questions) — no narrative recap.
- This protocol lives HERE, not in CLAUDE.md (the **design lane** owns any
  CLAUDE.md edit — don't touch it from this lane).

## Lane identity

The **onboarding-V2 / CV lane**. Owns the onboarding redesign flow, its
persistence, and `primary_domain` provenance. **NOT** the canvas/Home design
lane — separate terminal; coordinate, don't build there.

Owned paths: `src/pages/Onboarding.jsx` (V1), `OnboardingV2.jsx`,
`OnboardingEntry.jsx`; `src/components/onboarding/**`; `src/lib/`
→ `onboardingPersist.js` (shared persist helper, NEW in 6a), `persistOnboardingProfileV2.js`,
`inferPrimaryDomainWrite.js`, `mapExtractedToOnboarding.js`, `onboardingPayload.js`,
`flags.js`, `analytics.js`; `supabase/functions/_shared/infer-primary-domain.ts`.

## PR states

- **#670/#671/#672/#674/#675/#677/#679** — MERGED (scaffold → inference → screen0
  → order-revert → direction → `rd-coral`→`rd-primary` rename → review screen).
  Use **`rd-primary`** for all new work; `rd-coral` utility no longer exists.
- Migration `20260722_profiles_primary_domain_source.sql` — APPLIED live.
- **PR 6a — MERGED** (squash `25ff5a2`, #680, 2026-07-22). Persist-helper
  extraction: V1's four inline fns (`saveEducations`/`saveProgress`/
  `handleSurveyNext`/`handleFinalise`) lifted VERBATIM into
  `src/lib/onboardingPersist.js` (ctx-bag; bodies char-identical; V1 delegates
  via 3 wrappers + `buildPersistCtx`). Zero behavior change. Proven: lint/build/
  typecheck-baseline + structural cross-check (1:1 vs main's moved region) + 12
  behavior-identity tests + **live 3-run preview drive, hub-verified against the
  live DB** (skip-pickers, real-CV extraction→persist seam, deliberate failure
  floor). **Prod-deploy READY on `25ff5a2` = hub's gate (live signup path).**
  Onboarding-V2 lane is post-6b. Sequence (Eli-ruled): #683 → PR-1 → **PR-2** →
  Phase 1 restyle → Phase 2 UX → FLAG FLIP LAST (new-signups-only, after Phase 2).

- **PR 6b — MERGED (#683, squash `49d7847`, prod deploy READY).** V2 gate-routing
  fix (pages.lazy.js → OnboardingEntry) + screen-0 chromeless fix + entity persist
  - springboard + `?welcome=1`. Acceptance: 4 live-DB drives (extracted / inferred /
    inferred-noop / failure), all hub-verified.
- **PR-1 — MERGED (#688, squash `bb9dc6e5`, prod deploy READY).** Situation
  XOR-multi + `situations` audit; goal required; completed-user guard; review
  degree-Select uncontrolled→controlled fix (shared V1+V2). All 4 items live-verified.
- **PR-2 — MERGED + LIVE (#691, squash `70bd110`, 2026-07-23).** Serving-sha
  VERIFIED: `getajob.careers` READY on `githubCommitSha 70bd110`, target=production.
  Rollback target = `f82b99d`. Base-cut confirmed clean (merge-base `2b7de0a`, 3
  design-lane commits behind, ZERO file overlap, merge-tree conflict-free).
  Commit A `cbddee2` self-heal (b) — `src/lib/careerAnalysis.js`
  `runCareerAnalysisAndReplaceRoles(...)`; 3 callers (handleSurveyNext w/
  shouldContinue-abort, Roadmap handleGenerate, V2 finalise background-fire +
  careerRoles invalidate). Commit B `788388c` tutorial after springboard +
  has_seen persist + always-visible "Skip tour" (UNCONDITIONAL, shared w/ V1).
  No edge-fn deploy. Acceptance (all 3 PASS): tutorial+skip→/Home?welcome=1
  (has_seen=true); situations=["student","looking"] on the inferred event
  (PostHog flow=v2); producer proven — thin skip-path → 0 roles BY FUNCTION
  DESIGN, enriched profile + live Roadmap generate wrote 5 career_roles.
- Test accounts to purge pre-flip: `email LIKE '%+6b-%'` (incl.
  `+6b-selfheal-1784763814` uid `0e940208-a6f7-47f8-8c12-4c6b24a9526e`).

## HUB REASSIGNMENT (Eli-ruled 2026-07-23) — onboarding ownership split

- **Design lane** now owns ALL V2 onboarding **visual + UX** (Phase 1 restyle AND
  Phase 2 UX composition). Handoff brief written +committed:
  `docs/handoffs/onboarding-restyle-brief.md` (flow map · restyle-safe vs
  do-not-alter files · behavior invariants · Phase-2 backlog · acceptance
  invariants).
- **This lane (CV/onboarding-sequence)** owns functional correctness, persistence,
  and any data/behavior change Phase 2 needs, and **cross-reviews any design-lane
  PR that touches a persist path** (`onboardingPersist`, `careerAnalysis`,
  `persistOnboardingProfileV2`, `inferPrimaryDomainWrite`).
- **STANDING BY on onboarding.** No onboarding build work queued for this lane.

## NEXT ARC (do NOT start — gated) — scoring formula implementation

- Gated on **Eli reviewing the held `docs/eval/scoring-formula-design.md`**. Do not
  begin implementation until Eli signs off that design.

## PR 6b spec (BUILT — #683; acceptance guide `docs/handoffs/6b-acceptance-guide.md`)

Three parts, held-for-review, browser-tested on the preview. All three BUILT: entity
persist via saveEducations+handleFinalise (part 1), SpringboardScreenV2 + `?welcome=1`
(part 2), rd-coral→rd-primary as its own commit (part 3):

1. **V2 entity persist via the SAME helper.** Wire the V2 flow
   (`OnboardingV2.jsx` / `ReviewScreenV2.jsx` / springboard) to call
   `src/lib/onboardingPersist.js` — build a `ctx` bag and reuse `saveProgress`/
   `saveEducations`/`handleFinalise` rather than duplicating the entity writes.
   V2's `persistReviewProfile` already does the profiles-row + `extracted` stamp;
   6b adds the entity-table rows (experiences/education/projects/certifications)
   through the shared helper so V1 and V2 write identically.
2. **Springboard = screen 3.** Build the springboard per the scaffold; `?welcome=1`
   handoff to Home on completion.
3. **ReviewScreenV2 `rd-coral`→`rd-primary` — its OWN commit** (Eli ruling):
   rename-only, **occurrence count in the commit message** so the hub verifies it
   separately from the persistence diff. `src/components/onboarding/ReviewScreenV2.jsx`
   currently has inert `rd-coral` classes (utility gone); this fixes them.

After 6a+6b: HOLD everything; hand Eli the in-flow **acceptance guide** (exact
preview links; both paths — real CV + skip-via-pickers — + one deliberate
extraction failure). **That drive is the launch-1 gate.** **No new tooling enters
this lane until 6b + acceptance are done.**

## Standing rulings (honor verbatim)

- **Mockup order** `0 cv_upload · 1 review · 2 internship · 3 direction/springboard`;
  extraction resolves on the review watch.
- **Precedence invariant** — extraction-derived `primary_domain` NEVER overwritten
  by inference (DB guard `WHERE primary_domain IS NULL OR primary_domain_source=
'inferred'` + client CV-first guard). CLOSED (#679 stamps `extracted` on review).
- **Failure UX** — one screen: wait → count-up on success / manual-entry floor on
  failure. anime.js marquee DEFERRED (post-acceptance polish).
- **rd-primary** for all new work.

## Test users (Eli ruling: KEEP all three until 6b merges; purge queued pre-flip)

Live DB `ilmqmodklutztuybsvwd`, exclude by `+6a-` email:
`+6a-skip-1784737130` (afd99cae…), `+6a-cv-1784738125` (3c07b28b…),
`+6a-fail-1784738528` (3a874b3b…). The 6b acceptance drive will add `+6b-*`
users (guide names cv/skip/fail) — purge both `+6a-*` and `+6b-*` pre-flip,
kill set derived by query (`email LIKE '%+6a-%' OR email LIKE '%+6b-%'`).

## Reusable techniques + gotchas (from the 6a drive)

- **Preview drive under Turnstile:** signup + login are Cloudflare-Turnstile-gated,
  so automated UI signup is blocked. Enter via **admin-created `+test` user +
  magic link**: `supabase projects api-keys -o json` → service_role; POST
  `/auth/v1/admin/users` (email_confirm) + `/auth/v1/admin/generate_link`
  (magiclink); the redirect_to is forced to prod SITE_URL, so **curl the verify
  link (no-follow), grab the `#access_token`/`#refresh_token` from the Location
  fragment, build a supabase-js session JSON, inject into preview localStorage
  under `sb-ilmqmodklutztuybsvwd-auth-token`, reload.** `SUPABASE_ACCESS_TOKEN`
  env is empty; the CLI uses the macOS keychain (`supabase projects …` works).
- **`handle_new_user` trigger (#666)** pre-creates the `profiles` row at auth-user
  creation → `saveProgress` takes its **UPDATE** branch, not INSERT. So the
  invite/cohort-stamp + welcome-email INSERT branch is unit-tested but not
  drive-exercised.
- **Onboarding.jsx prettier churn:** the repo isn't prettier-clean, so the
  PostToolUse formatter reflows the WHOLE file on any edit → noisy diff. Verify
  logic via the new helper file + structural cross-check, not the line diff.
- Known pre-existing race: post-finalise debounced auto-save can clobber
  `qualification_level`/`last_reality_check_date` to null (Home self-heals). Not
  a 6a regression; the auto-save effect is untouched.
