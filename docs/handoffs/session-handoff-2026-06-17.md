# Session handoff: 2026-06-17

Continuation of the long pair-programming session (Eli + Claude.ai as architect/verifier over Claude Code in the terminal). Live pilot. Supabase ref `ilmqmodklutztuybsvwd`, repo `getajob-careers/get-a-job`. Eli's profile id `4b243f3a-5035-474e-a89d-aff13fe06cc2`.

Standing rules in force: independently verify CC claims against the live DB before any merge or production action (never trust CC self-reports alone); never paste the service-role key into CC chat (pull it inline so it never prints); no em dashes anywhere; surface decisions before locking them; investigate-before-build; `db push` is broken in this repo, so migrations go through `apply_migration` or manual SQL; edge functions do not auto-deploy, each needs `supabase functions deploy <slug> --project-ref ilmqmodklutztuybsvwd`; squash-merge and delete the branch; mind deploy coupling (apply schema before the frontend that reads it goes live).

---

## DONE AND CLOSED THIS SESSION

### 1. /jobs to /career consolidation (PRs #338 to #343) — all merged and live, linear on main

The unified two-tab jobs feed is now the body of `/career`. What changed:
- The 3 track-card selector tiles (Sweet spot / Detour / Growth) are gone. "Track" survives only as a Search-tab filter chip plus the "How tracks work" explainer.
- Matched Roles is now flat and track-agnostic, ordered by fit-quality TIER (sweet spot, then growth, then detour) with match_score within tier. NOT sorted by raw match_score (verified against live data: a 0.92 detour would otherwise outrank a 0.847 sweet-spot; across 27 real users 23 lead sweet-spot, 3 growth, 1 detour-only). Chips show the track NAME, not the taglines.
- Cards are responsive single-column in the narrower /career column with break-words so role and company names never clip.
- `/jobs` is retired as a destination: hard redirect to `/career`; the legacy track-tabs feed and the `?flag=legacy_track_tabs` escape hatch are fully removed (real fallback is git revert). RoleCard "See {role} jobs" opens the Search tab prefilled via `/Career?role=<title>`.

PRs: #338 flip (unified default, superseded #329); #339 extract `<UnifiedJobsFeed>` (also fixed a career_roles cache-projection poison via canonical `useCareerRolesQuery`, the #336/#178 pattern), merged 1da63ad; #340 mount in /career + retire track-card model + track-agnostic Matched Roles, merged 14752b1 (note: #340 also narrowed the on-page agent's context, it no longer surfaces visible job ids, only matched-role ids plus open-drawer); #341 polish (single-column + no-clip + track-name chips), merged b3562fc; #342 redirect + retire escape hatch, merged cb9183e; #343 docs changelog, merged e73bc18. Consolidation documented in PROJECT_INSTRUCTIONS.md.

### 2. Story Bank to experience-bullets refactor, Phase 1a (PRs #344 + #345) — fully shipped and verified

The standalone Story Bank is being retired. The new model: the agent writes STAR-disciplined bullets directly into the profile's experiences (where the CV already authors from), so one achievement source feeds the CV and all agents. Phase 1a is the additive core, zero output risk (nothing reads bullets for output yet).

What landed on `eli/phase1-experience-bullets` (squash 62f9939, branch deleted):
- Schema: `experiences.bullets text[]`, additive, confirmed live as NOT NULL default `'{}'`. Existing row-level RLS covers it (RLS is row-level, a new column needs no new policy). `responsibilities` stays as the CV fallback, not migrated, so the eventual CV rewire is a precedence swap, not a data cutover.
- `composeBullet.js`: pure fold of a STAR story into one bullet, metric verbatim, merges skills/tools into `experiences.skills`. +10 unit tests locking verbatim figure survival.
- `extract-experience-bullets` edge fn: anti-fab-gated bullet writer, requires `experience_id`, never writes itself (it is the propose-don't-write review seam, same pattern as extract-story-from-text). Deployed.
- `coachActionHandlers`: extract / append-with-undo-snapshot / set / restore helpers.
- Profile bullets editor: add / edit / reorder / delete plus AI-assist, one-line mount.
- Backfill script: dry-run default, confirm-phrase gated, idempotent, handles the unlinked-row owner-check per decision #2.
- #345: 3-line types patch regenerating database.types.ts for the new column, merged 62e6de7, branch deleted, typecheck note cleared.

Deploy sequence executed in the safe order: migration applied first (column live before frontend), then #344 squash-merged and deployed, then edge fn deployed, then #345 types, then backfill.

Backfill verified live by Claude.ai independently (not on CC's report): exactly 4 experiences carry bullets, all on Eli's profile, counts Guardio 13 / Get a Job (Creator) 3 / Heseg Tzair (Program Coordinator) 2 / Heseg Tzair (Volunteer Educator) 1 = 19 total. Nothing else in the table was touched. Every backfilled figure traces to a real source `metrics[]` entry or action/result prose, nothing invented. The single unlinked story belongs to `yishailieser+demo3` (a `+` test alias), correctly left for Phase 5 drop-with-backup, not attached (the attach exception is real-pilot-only and correctly did not fire). There are zero real-pilot stories in this fold; it is all Eli's own profile plus one test row, so the stakes were minimal.

One real finding beyond CC's "stylistically rough" note: the Heseg curriculum story has an internal source contradiction (action prose says "8 volunteers", its `metrics[]` says "10 volunteers"), and composeBullet faithfully preserved both, so the bullet reads "8 volunteers ... 10 volunteers". Not a fold bug, a source-data inconsistency surfaced into one line. See Editing TODO.

---

## STORY BANK REFACTOR: the full plan (context for the remaining phases)

Design decisions, all settled:
1. Storage = `experiences.bullets text[]` (each entry one STAR-disciplined line, metric/tool in-line); skills_demonstrated and tools_used dedupe into `experiences.skills`; `responsibilities` coexists as fallback. (text[] chosen over jsonb-with-ids because the old story-attach feature has zero usage.)
2. Unlinked story = drop-with-backup (full stories export first), EXCEPT if its owner is a real pilot user, attach to their most-recent experience instead. (In practice the one unlinked row was a test alias, so drop-with-backup.)
3. `linkedin_posts.story_id` and the story-attach feature = drop (verified 0/10 usage, zero impact).
4. No per-bullet metrics sidecar. The figure lives in the bullet text; the validator checks emitted figures against the bullet text.

Anti-fab binding rule flips from "echo `metrics[]`" to "preserve every figure and named tool in the bullet exactly, never alter, round, combine, or invent." Validator swaps the story-array haystack for `bullets[]`. CV_VOICE_RULES and LINKEDIN_VOICE_RULES update accordingly.

Blast radius (the reason for strict phasing): `stories` feeds 7 edge functions, not the ~2 first assumed: generate-tailored-cv (story-bank precedence; the live Sonnet path OPTION_A_OVERLAY already treats responsibilities PRIMARY and stories enrichment), generate-internship-profile, generate-linkedin-content, generate-linkedin-comment, generate-linkedin-outreach-message, generate-linkedin-post (story_id FK), and `_shared/daily-action-core.ts` (count). Plus ~8 frontend surfaces and the linkedin_posts.story_id FK. The 5 LinkedIn surfaces all bind story metrics verbatim, so they inherit the anti-fab concern.

Phase plan, additive-first, CV last, each its own HOLD PR:
- Phase 1a (DONE): additive schema + write path + backfill. Zero output risk.
- Phase 1b (NEXT, held): the chat-capture rewire. See below.
- Phase 2: internship-profile + daily-action nudge read bullets.
- Phase 3: the 5 LinkedIn surfaces read bullets; resolve story_id.
- Phase 4: CV (highest risk, last). Keep stories as a live fallback so revert is a precedence flip; validate against the CV bake-off harness before flipping default.
- Phase 5: retire stories (frontend, drop table, backup; also drops the test-alias unlinked row).

---

## HELD / QUEUED

### Phase 1b: chat-capture rewire (held for Eli's go-ahead)

Scope: `SUGGESTED_STORY_CAPTURE_JSON` to `SUGGESTED_BULLET_CAPTURE_JSON` (now requires `experience_id`, has undo). It is a ~45-reference coordinated rename across `prompt-lib.ts` (6 agent branches + parser + markers + honesty rules + follow-up), `ai-chat/index.ts`, `ChatInterface.jsx`, `CoachThread.jsx`, a new `BulletSaveCard`, and `prompt-lib.test.ts`. CC has mapped the full contract surface. This is the fragile chat surface the lessons file repeatedly flags, which is exactly why it was split out of Phase 1a for focused review and independent rollback.

Claude.ai review gates committed for 1b: treat `prompt-lib.test.ts` as the contract net for the rename (all 45 references must stay in sync), and require a live end-to-end round-trip before merge (capture something in chat, confirm the bullet lands on the right experience), the same way PR #330 was proven rather than trusting the rename looked complete.

Phase 1a gate met: Eli confirmed he can see the bullets on /profile ("i see it").

---

## REENGAGEMENT EMAIL: scoped, parked (copy drafted, send infra not built)

Full draft copy for all four segments exists from the earlier session. Remaining path to send (given to Eli this session):

1. Run the practicum matcher FIRST. Segment B (the 3 INTERNSHIPGETAJOB users: Adi Burshan, Ido Dagan, Ofri Raichelson) references specific matched companies, so `match-internship-companies` must run for them to fill `{company_1}`/`{company_2}` before their email exists. This is the one true prerequisite.
2. Build the send script (not started). On the welcome-resend harness, with dry-run default, per-segment recipient cap and confirm-count, a Resend idempotency key, function_metrics logging, and `replyTo` set to Eli's real inbox.
3. Final copy lock. Drafts written, factual claims verified: lead with "over 4,000 live roles" (the "~1,500 added" figure was NOT supported), no model SKUs, no pricing or trial language, all links to /career (now correct since consolidation shipped), Dan Sonnenblick's extra "re-upload CV as a PDF not a scanned image" line, Segment C with no apology and the "onboarding rebuilt and shortened by ~5 steps" framing, Segment D light nudge plus shortened-onboarding. The AI-capability line uses the honest "an assistant that knows your matched roles and can talk through which fit and why" (accurate after #340 narrowed the agent's job-listing view; do not promise the fuller "reference any job" capability, it is not built).
4. Dry-run plus Eli's name-by-name review. CC produces the full per-segment recipient list, counts refreshed live (signups have drifted from the last count of roughly 19 / 3 / 2 / 8), Eli approves each bucket, then the real send.
5. Decision Eli owes: the send date. The slot is 10am Israel = 07:00 UTC; date is his call.

Segment recap: A = onboarded GETAJOBPILOT (pilot-week + matches, grounded in {top_role}); B = 3 practicum INTERNSHIPGETAJOB; C = 2 stalled (Ella Galer / redheadeg@gmail.com, Yonah Bar-Shain / ybarshain@gmail.com); D = cold-no-profile (the funnel leak). The 14 failed-welcome resend never ran, so the welcome is folded into each segment's email as a belated first touch.

Separate, not part of the 4 segments, do not let it block: the 3 never-confirmed accounts (rachelimiller24, jenna@bettear.com, gulicheric) need a confirmation-email resend, a different action from reengagement.

---

## ON-PAGE AGENT "reference any job": investigation prompt pending (not built)

PR #340 removed the agent's view of feed listings on /career. Eli wants users to reference any job and have the agent know about it, plus a broader vision of agents doing more for the user. The mechanism is retrieval-on-reference, not preloading (cannot fit 4,200 jobs in context): (a) a bounded proactive baseline (Top Matches ~20 lifted into buildCareerPageContext); (b) an "ask the agent about this" affordance on every job card that injects that listing's real details into the conversation (the backlog "entity-scoped chat context"; the open-application-drawer pattern is the model). Anti-fab guardrail: the agent only speaks about a job whose real data is injected, never invents. A read-only investigate-first prompt covering all of this was handed to Eli but not yet sent or run.

---

## NEXT ACTIONS (the live choice for tomorrow)

Two ready threads; Eli picks the order. Claude.ai asked which to start and is holding.

1. Phase 1b chat-capture rewire (build + the two review gates above), OR
2. Reengagement email: start with the practicum matcher run, then the send script, then dry-run for Eli's review.

Neither blocks the other. Both are independent of the rest of the backlog.

---

## EDITING TODO (Eli, non-blocking, on /profile)

- Prune the Guardio cluster: 13 bullets with a few near-duplicates (two QA-pipeline variants, two social-media-moderation variants) from overlapping source stories. The near-dupes may carry different metrics, so prune knowingly rather than auto-merging.
- Fix the 8-vs-10 volunteers contradiction on the Heseg curriculum bullet (pick the true number).
- Smooth the two rough trailing-metric appends where the figure was not already in the prose.

All editable in the Profile bullets editor; all on Eli's own profile.

---

## KEY IDS / FACTS

- Supabase project ref `ilmqmodklutztuybsvwd`. Eli profile id `4b243f3a-5035-474e-a89d-aff13fe06cc2`.
- Invite codes: GETAJOBPILOT (regular pilot), INTERNSHIPGETAJOB (practicum, 3 users), TEAMGETAJOB (team), VIPGETAJOB (hand-picked).
- Backfill confirm phrase: `CONFIRM=APPLY-BULLET-BACKFILL` (already applied this session; do not re-run).
- experiences.bullets is live: text[], NOT NULL, default `'{}'`. 4 experiences populated (all Eli), 19 bullets total.
- Corpus floor for email copy: "over 4,000 live roles" (re-confirm at dry-run; grows nightly via cron).
- Deploy edge fn: `supabase functions deploy <slug> --project-ref ilmqmodklutztuybsvwd`.

---

## RECURRING LESSON (session through-line)

The split-PR call on Phase 1 paid off: landing the additive core (1a) at zero risk and isolating the fragile chat rename (1b) gave each its own clean review and rollback, matching the iterative-scoped-PR cadence and the chat-fragility lessons. And the independent live verification caught what a report alone would not have framed: the "rough" Heseg bullet is a genuine source-data contradiction, and confirming the unlinked row's owner (a test alias, not a real user) is what made the drop-with-backup decision safe. Believe the live DB over the snapshot; verify before every production write, never trust CC reports alone.
