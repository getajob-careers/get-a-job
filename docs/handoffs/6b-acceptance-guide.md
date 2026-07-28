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

---

## PR-1 (#688) MERGED (squash bb9dc6e5, 2026-07-22). Prod deploy dpl_Hu3wcc3b READY, sha=bb9dc6e5. NO edge-fn deploy needed (hub: infer-primary-domain.ts has zero function consumers; client-consumed only). Deferred: confirm the `situations` array on onboarding_primary_domain_inferred in PostHog on the first completed post-merge drive.

## PR-2 KICKOFF (ready to build — full design below). Branch cut: eli/onboarding-v2-selfheal-tutorial (from origin/main, no commits yet). ONE PR, TWO separate commits (A self-heal, B tutorial). HELD for hub + a full acceptance drive.

### Commit A — self-heal option (b): shared analysis helper + V2 background-fire
NEW file `src/lib/careerAnalysis.js`, export `runCareerAnalysisAndReplaceRoles({ userId, dreamRoles, force=false, shouldContinue })`:
- supabase.auth.refreshSession() -> accessToken (throw "Session expired..." if none).
- fetch `${VITE_SUPABASE_URL}/functions/v1/generate-career-analysis` POST {dream_roles, ...(force?{force:true}:{})}, headers Authorization+apikey. Parse responseText (JSON.parse; throw on !ok / data.error).
- CONSERVATION: `if (shouldContinue && !shouldContinue()) return {data, rolesWritten:0, aborted:true}` BEFORE the RPC — this preserves handleSurveyNext's `if(!mountedRef.current) return` skip-the-RPC-on-unmount behavior.
- if !data.cached && data.roles?.length>0: map the IDENTICAL 12-field rolesPayload (title, track, match_score:readiness_score, readiness_score, goal_alignment_score:??null, matched_skills, missing_skills, skills_gap:missing_skills, alignment_to_goal, alignment_reason, reasoning, action_items) -> supabase.rpc("replace_career_roles",{p_user_id:userId,p_roles,p_input_hash:data.input_hash||null}); throw on rpcError. Return {data, rolesWritten}.
WIRE 3 callers (keep each behavior-identical — #680 care; each keeps its OWN profiles update + events):
- handleSurveyNext (onboardingPersist.js ~336-423): replace inline refresh+fetch+parse+RPC with the helper; pass shouldContinue:()=>mountedRef.current; after helper, keep the mountedRef check via result.aborted, then its existing profiles update (qualification_level/skill_gaps/overall_assessment/onboarding_step:6) + chain to handleFinalise. dreamRoles: profileData.five_year_role?[profileData.five_year_role]:[].
- Roadmap.jsx handleGenerate (151-215): replace inline with helper (force:true); keep its cached warn + CAREER_ANALYSIS_REFRESHED events + its profiles update (last_reality_check_date + qualification...). dreamRoles: profile?.five_year_role?[profile.five_year_role]:[].
- OnboardingV2 finaliseAndLaunch: AFTER handleFinalise resolves, fire the helper in BACKGROUND (non-blocking, .catch logged): runCareerAnalysisAndReplaceRoles({userId:user.id, dreamRoles:profileData.five_year_role?[profileData.five_year_role]:[], force:true}); on success invalidate careerRoles (queryClient.invalidateQueries({queryKey:["careerRoles"]}) — confirm exact key, Home uses "career_roles" query id at Home.jsx:139/232). Home's existing building-your-roadmap state shows while it runs (self-heal UI); if it fails, backstops unchanged (self-heal number fix + Roadmap manual Generate). NOTE the last_reality_check_date/self-heal interaction: since handleFinalise already stamps last_reality_check_date, Home self-heal won't fire — the V2 background helper IS the roadmap producer now, so this is fine (roadmap comes from the helper, not self-heal).

### Commit B — tutorial minimal return (ruling: option c, minimal now)
OnboardingTutorial contract: props {isReturningUser, setupComplete, onTutorialEnd({skipped})}; it renders full-screen and calls onTutorialEnd (parent persists has_seen + navigates). V1 handleTutorialEnd (Onboarding.jsx:511): update profiles has_seen_onboarding_tutorial=true; if(skipped && !setupComplete && !finalising) await handleFinalise; navigate(Home). V1 renders it at step===6 full-screen.
V2 integration in OnboardingV2:
- add `const [showTutorial,setShowTutorial]=useState(false)`.
- finaliseAndLaunch: fire STEP_COMPLETED{3}; setShowTutorial(true) (tutorial renders immediately, shows setup progress while finalise runs); await saveEducations+handleFinalise (sets setupComplete).
- REMOVE the setupComplete->navigate useEffect's navigation; setupComplete now only enables the tutorial's "go to platform".
- new handleTutorialEnd: update profiles has_seen_onboarding_tutorial=true; track LAUNCHED_TO_HOME; navigate("/Home?welcome=1",{replace:true}).
- render: `if(showTutorial) return <><finaliseError banner+retry/><OnboardingTutorial isReturningUser={false} setupComplete={setupComplete} onTutorialEnd={handleTutorialEnd}/></>` BEFORE the 4-screen shell return.
SKIP AFFORDANCE CHECK (hub requires a clearly visible skip for fresh users): OnboardingTutorial's Skip is currently the RETURNING-USER gate (handleSkipGate/fireSkip, reason:"returning_user_skip_gate"). For isReturningUser=false, gateAcknowledged=true and the returning-user skip gate is bypassed — VERIFY whether a fresh user sees a visible Skip on the slides; if NOT, add a small always-visible "Skip tour" that calls onTutorialEnd({skipped:true}) (guarded, and if !setupComplete it should hold like handleSkipGate). Report a screenshot of the tutorial under canvas tokens flag-on; if visually broken there, DO NOT restyle — log it as the Phase-2 integrated-redesign item (design lane).

### Acceptance drive (fresh +6b account, end-to-end) must show:
(1) career_roles>0 in DB (or the building state resolving into it), (2) tutorial appears after springboard with a working visible skip, (3) onboarding_primary_domain_inferred carries the situations array (PostHog — hub). Report DB + event evidence. Held for hub verification before merge.
Gates: lint/typecheck/build/test + deno check; NO edge-fn deploy (generate-career-analysis untouched). Flag-off byte-identity per file; handleSurveyNext + Roadmap are SHARED/live — call out that they're touched and behavior-preserved.

### Accounts to purge pre-flip (queued): +6b-cv dc078bc4, +6b-skip c558a4a2, +6b-fail bbc03544, +6b-infer ea671626, +6b-pr1 32fa764c (kill set: email LIKE '%+6b-%').
