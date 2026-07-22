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
