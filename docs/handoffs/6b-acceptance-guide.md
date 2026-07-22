# PR 6b in-flow acceptance guide (Eli) - launch-1 gate

Drive the Onboarding V2 flow end-to-end on the preview, both paths plus one
deliberate extraction failure, and confirm the entity rows land in the live DB.
This is the launch-1 gate: 6b (#683) holds until this passes.

## Preview

- Branch alias (stable, re-points to the latest push on `eli/cv-lane-6b`):
  `https://get-a-job-git-eli-cv-lane-6b-getajob-team.vercel.app`
- Flag-on entry (the `?onboarding_v2=1` override forces V2 anywhere, no env flag needed):
  `https://get-a-job-git-eli-cv-lane-6b-getajob-team.vercel.app/Onboarding?onboarding_v2=1`
- Flag-off control (byte-identical legacy flow):
  `https://get-a-job-git-eli-cv-lane-6b-getajob-team.vercel.app/Onboarding`

Deployment READY for sha `8fe9f84`.

## Get into the flow (Turnstile blocks automated signup)

Signup/login are Cloudflare-Turnstile-gated, so enter via an admin-created
`+test` user + magic link (the 6a technique):

1. `supabase projects api-keys -o json --project-ref ilmqmodklutztuybsvwd` -> grab `service_role`.
2. POST `/auth/v1/admin/users` (with `email_confirm: true`) to create a
   `elienglard34+6b-cv-<ts>@gmail.com` (and a `+6b-skip-<ts>` / `+6b-fail-<ts>`).
3. POST `/auth/v1/admin/generate_link` (`type: magiclink`) for that email.
   redirect_to is forced to prod SITE_URL, so curl the verify link no-follow,
   read `#access_token` / `#refresh_token` from the Location fragment.
4. Build a supabase-js session JSON, inject into the preview's localStorage
   under `sb-ilmqmodklutztuybsvwd-auth-token`, reload the flag-on URL.

The profiles row is pre-created at signup by the `handle_new_user` trigger
(#666), so a fresh `+test` user already has a profiles row (id = auth uid).

## Path A - real CV (happy path)

1. Screen 0 (upload): pick a situation card, drop a real CV (PDF or DOCX).
2. Watch the "reading your CV" affordance; Continue advances to review.
3. Screen 1 (review): extraction resolves on this screen's watch. On success:
   count-up reveal (roles / skills / degrees) + StepReview populated. Edit
   anything, then "Looks good".
   - This is where the profiles row + the `primary_domain_source='extracted'`
     stamp are written (unchanged from #679).
4. Screen 2 (direction): pick goal / location / work arrangement. Continue.
   - CV-first guard: because a domain was extracted, the direction inference
     is skipped (`skipped_reason: extracted_domain_present`).
5. Screen 3 (springboard): "You're all set." -> "Go to my workspace".
   - THIS is the 6b write: education via saveEducations, then
     experiences/projects/certifications + onboarding_complete via
     handleFinalise. Button shows "Setting up your workspace..." then hands
     off to `/Home?welcome=1`.

## Path B - skip via pickers (no CV)

1. Screen 0: pick a situation, then Skip (no file).
2. Screen 1 (review): "No CV yet" manual-entry floor. Fill education level +
   start date (pickers), institution + field (the two typed fields). "Looks good".
3. Screen 2 (direction): pick a goal. Continue.
   - No extracted domain -> inference runs and writes
     `primary_domain` + `primary_domain_source='inferred'` (server-guarded).
     6b backfills that inferred domain into shell state so the finalise write
     does NOT clobber it back to null.
4. Screen 3 (springboard): launch. Entity rows + onboarding_complete land.

## Deliberate extraction failure (one)

On screen 0, upload a file with no usable CV content:

- easiest: an image-only / scanned PDF (no text layer) -> `empty_text`, or
- a PDF/DOCX containing only a random sentence (no name, no experience) ->
  `extract_none`.

Expected on the review screen: the "We couldn't read your CV" failure banner

- "Try another file" retry + the manual-entry floor (marquee suppressed). Fill
  the essentials and complete as in Path B. `onboarding_cv_extract_failed` fires.

## Confirm the writes (live DB, via MCP execute_sql or SQL editor)

For the test user's uid, after the springboard launch:

```sql
-- profiles: completion + provenance
select onboarding_complete, primary_domain, primary_domain_source,
       five_year_goal_role_id, array_length(skills_canonical,1) as canon,
       last_reality_check_date
from profiles where id = '<uid>';

-- entity rows (should match what you reviewed)
select count(*) from experiences   where user_id = '<uid>';
select count(*) from education     where user_id = '<uid>';
select count(*) from projects      where user_id = '<uid>';
select count(*) from certifications where user_id = '<uid>';
select count(*) from tasks         where user_id = '<uid>';
```

Pass criteria:

- Path A: `onboarding_complete=true`; `primary_domain_source='extracted'`;
  experiences/education/projects/certs match the reviewed CV; tasks populated
  (real or the 2 onboarding fallbacks).
- Path B: `onboarding_complete=true`; `primary_domain_source='inferred'` (goal
  mapped) or null (unmapped/no goal); `primary_domain` NOT null when source is
  `inferred`.
- Failure path: same as B; nothing lost (profiles row already existed).

## Known gap to weigh before flipping the flag live (NOT a 6b blocker)

V2 runs no career analysis, and handleFinalise stamps
`last_reality_check_date=now`, which suppresses Home's roadmap self-heal
(`Home.jsx:292` returns early if `qualification_level` OR
`last_reality_check_date` is set). So a V2 user lands with NO career roadmap
and Home will not self-heal one. This needs a V2 career-analysis trigger before
the flag flips to real signups. Out of 6b scope (entity persistence).

## Cleanup

Test users are `+6b-*` on the live DB. Purge before flipping the flag (derive
the kill set by query: `email LIKE '%+6b-%'`, never a hand-copied list).

---

## Post-drive log (2026-07-22/23)

**Gate + screen-0 fixes shipped to #683 (both verified on the deployed preview):**
- `bccb85c` — `pages.lazy.js` routed `/Onboarding` through raw V1, not OnboardingEntry, so the V2 flag was dead code since #670. Fixed; flag-on now renders V2, flag-off byte-identical V1.
- `79a90ed` — V2 screen 0 embedded StepResumeUpload's full V1 page (banner + eyebrow/heading + its own situation row) under the V2 shell + orphan spinner. Fixed via additive `chromeless` prop on StepResumeUpload (V1 byte-identical without it) + removed the orphan ReadingAffordance + mapped V2 situation to `employment_status`. Label-leak sweep: screen 0 was the only leak; screens 1-3 clean.

**Path A (real CV) — FULL PASS (hub-verified on dc078bc4):** onboarding_complete=true, primary_domain_source='extracted', employment_status=['looking_for_job'], skills_canonical=37, exp=7 edu=1 proj=1 cert=0 tasks=3. No persist drops. Console clean.

**OPEN — self-heal / roadmap gap (flip gate; follow-up PR after #683):** V1 writes career_roles in handleSurveyNext (client calls generate-career-analysis then the replace_career_roles RPC). V2 has no survey step, so no career_roles. Home self-heal (Home.jsx:292) only heals qualification_level (it never calls replace_career_roles) — so NOT stamping last_reality_check_date is INSUFFICIENT (roadmap stays empty). Roadmap page does not auto-generate (manual Generate button). RECOMMENDATION: option (b) — fire generate-career-analysis + replace_career_roles in the BACKGROUND at V2 finalise (mirror handleSurveyNext), non-blocking; extract the analysis-invocation (duplicated in handleSurveyNext + Roadmap.jsx) into one helper. Own PR + its own drive (land on Home, confirm career_roles populate).

**OPEN — situation single-select vs V1 XOR (Eli merge-gate ruling):** V1 employment_status permits multi with XOR (unemployed⊕employed, unemployed⊕looking_for_job, employed⊕looking_for_job; student/freelance stack). Common lost combo = student+looking_for_job. Consumed as a JOINED multi-value in career-analysis + generate-tasks prompts (soft LLM-context signal) + generate-tasks `.includes('employed')` staging. #683 improves employment_status from EMPTY to single (net positive); multi is a parity enhancement, not a #683 regression. LEAN: keep-single (V2 situation also feeds single-value primary_domain inference; clean one-tap UX; single is always a valid subset; loss is soft LLM context). Alternative: port XOR-multi. Eli rules.

**Pre-flip polish arc (punch list — DO NOT build now):**
1. Upload wait: needs a loading treatment between "Upload to continue" and the review screen.
2. Review screen: verify collapsed-by-default sections actually shipped (vs default-open); "what we found" needs stronger visual hierarchy; page far too long. Report + propose fix scope.
3. Direction screen: location input needs suggestions/autocomplete; check what V1 uses.
4. Overall feel (Eli): passes but barely, feels like V1 not V2 — deferred marquee/entrance-motion ruling RE-OPENED for this arc.
5. Tutorial absent from V2: parked by Eli; pre-flip open question.

Test accounts (purge pre-flip, kill set by `email LIKE '%+6b-%'`): +6b-cv (dc078bc4, PASS), +6b-skip (c558a4a2), +6b-fail (bbc03544).

**Inferred-path drive (Claude-driven) — FULL PASS (ea671626, +6b-infer):** primary_domain='product', primary_domain_source='inferred', five_year_goal_role_id='product_manager', employment_status=['student'], onboarding_complete=true, edu=1, tasks=3, career_roles=0 (roadmap gap reconfirmed). Precedence backfill held (domain not clobbered at finalise). All three paths (A extracted, B/infer inferred, failure) now DB-proven. #683 merge-evidence complete.

## Rulings + next-PR proposals (Eli to rule on the ask-marked ones)
- **R1 situation XOR multi (option B, ruled):** port V1 XOR (unemployed⊖{employed,looking}; employed⊖looking; student/freelance stack). Write employment_status as the mapped ARRAY. Inference `situation` is AUDIT-ONLY (domain is driven by goalRoleFamily), so feed it a single representative derived by fixed priority (looking>unemployed>employed>freelance>student). Lands: next PR (or fold into Phase-1 restyle of the situation row).
- **R2 goal required (ruled):** disable direction Continue until five_year_goal_role_id set; drop the "pick later" helper. Makes inference always fire. Lands: next PR (NOT #683).
- **Bug 5 completed-user guard:** V1 Onboarding.jsx:226 redirects onboarding_complete users to Home in checkExistingProfile; V2 has none. Add a mount guard in OnboardingV2 (profile.onboarding_complete -> navigate Home). Next PR.
- **Bug 6 degree Select:** StepReview.jsx:821 `value={degreeDropdownValue || undefined}` flips uncontrolled->controlled; init to a stable defined value (verify Radix placeholder still shows). Shared with V1 review. Next PR.
- **Self-heal option (b), APPROVED:** own PR after #683 — extract analysis-invocation (handleSurveyNext + Roadmap.jsx dupes) into one helper; V2 background-fires at finalise; Home shows building state; invalidate careerRoles on completion.

## Post-merge phased arc (Eli-set priority)
- Phase 1: restyle V2 in next-design canvas tokens (rd-primary, canvas ground, card treatment). R1's situation-row change can ride here.
- Phase 2: UX-optimize; review screen (screen 1) is the headline ("hard to get through, discouraging"). Folds the punch list: collapsed-default check, what-we-found hierarchy, page length, upload-wait loading, location autocomplete, entrance-motion (marquee re-opened).

## PR-1 (#688, HELD) — V2 correctness, all 4 items live-verified
Preview d3c97e21. R1 XOR-multi (browser: conflict/stack rules; DB: employment_status=['student','freelance','unemployed']) · R2 goal-required (Continue disabled->enabled on goal pick; helper replaced) · Bug 5 completed guard (completed user /Onboarding->/Home) · Bug 6 review Select (zero controlled-warnings on review). Flag-off byte-identity per file; StepReview bug-6 explicitly scoped as an unconditional V1+V2 fix. Gates green. Held for hub. Sequence: #683(merged) -> PR-1(#688 held) -> PR-2 -> Phase1 -> Phase2 -> flip.

## Tutorial investigation (Eli ruling: tutorial RETURNS for V2)
FINDING: V1 renders OnboardingTutorial as onboarding STEP 6 (in-flow, full-screen, before Home); its "Go to platform" sets has_seen_onboarding_tutorial=true then navigates. It is NOT a Home-mount trigger. V2 has no such step, so completions skip it (Path A account: has_seen=false, nothing on Home — expected, the trigger was never the flag). Renders under next-design: it inherits rd-* tokens (canvas palette flag-on) but is visually unverified.
PROPOSALS: (a) minimal — render the existing OnboardingTutorial after V2 finalise (springboard -> tutorial -> Home), reuse its has_seen persistence; V2-lane owns it; low risk, ships the teaching tool fast. (b) integrated — fold into the ?welcome=1 Home arrival (design-lane slice 2) as one first-landing experience; V2-lane emits ?welcome=1 (done), design-lane owns the arrival; bigger, cross-lane. (c) phased — (a) now + (b) at Phase 2.
LEAN: (c). Minimal (a) restores it quickly (its absence was accidental); rides with PR-2 (both touch V2 finalise/completion) or a small dedicated PR. Integrated (b) is the right long-term home, belongs with the design-lane arrival work at Phase 2. Open design Q for (a): does the tutorial REPLACE the springboard or FOLLOW it (springboard -> tutorial -> Home = 5 screens)? Eli/design-lane to rule.
