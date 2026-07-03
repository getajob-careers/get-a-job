# Deep QA Pass 2 - Fix Manifest (Batch 1)

Plain-English plan for the first fix wave coming out of Deep QA Pass 2. Read top to bottom. Nothing here is coded yet; this is the document Eli approves before execution starts. Isaac and Yishai should be able to read it cold.

Scope of Batch 1: two launch-gating items (G1, G2), the ship-with list (Home arrow, CV Studio copy, Profile messaging, dock coach View, F1 server fix, accessibility batch), and decision D1 (seniority floor). The full queue is listed at the end, unchanged from triage.

Severity framing: there is NO active data-damage incident. The anti-fab item is a proven latent risk that fires under launch traffic, so it leads the queue by ordering, not because users are harmed today.

---

## G1 (LAUNCH-GATING) - Anti-fabrication gate misses ordinary tool and brand names

**1. What was wrong (user terms).** When the coach or CV Studio tailors a CV to a job, it can insert tools the person never used, pulled straight from the job description. In a live test, a profile that listed no tools plus a job asking for "Zendesk and Intercom" produced the bullet "Managed customer cases end-to-end in Zendesk" under the person's real job. A student who sends that CV is now claiming Zendesk experience they do not have, and will be caught in an interview. This breaks the core promise of the product: turn your real experience into stronger applications.

**2. Root cause (one paragraph).** The anti-fabrication gate lives in one shared file, `supabase/functions/_shared/cv-antifab.ts`, used by all three CV functions (generate-tailored-cv, refine-cv, edit-cv). Its token detector, `QUANT_TOKEN_RE`, only recognizes CamelCase proper nouns (PostgreSQL, ZoomInfo) and ALLCAPS ones (SQL, API). Ordinary single-capitalized brand names (Zendesk, Intercom, Salesforce, Slack, Notion, Jira, Figma, Excel, Tableau) do not match the pattern, so `tokensTraceToMaster` never checks them against the user's own content, never reverts them, and they survive into bullets. Verified deterministically against the exact deployed regex.

**3. The fix.** Widen `QUANT_TOKEN_RE` to also catch single-capitalized proper nouns, add a curated allowlist of common capitalized English words that are not brands (Customer, Israel, Team, Manager, place and role words, months, etc.) so we do not revert legitimate rewording, and keep the existing softer treatment for proper nouns that come from the JD keyword set (summary-style provenance). For the user, tailored CVs will stop asserting tools they never listed; a JD tool with no basis in the profile gets dropped or reverted instead of authored in. One regex change in one shared file repairs all three CV functions and the extension paths that call them.

**4. What could break, and the guard.** Risk: over-reverting. A widened regex could start reverting legitimate reworded bullets that mention a capitalized word the master also contains, or mangle names the user does have. The allowlist plus the JD-provenance soft path keeps false reverts down. The hard guard is a bundled regression test (rider 2): feed a JD containing Zendesk, Intercom, and Slack against a profile that lacks them and assert zero unsourced brand tokens survive in the output bullets, plus a companion assertion that a profile that DOES list a tool keeps it. This locks the hole so it cannot silently reopen.

**5. Verify live after deploy.** Redeploy all three edge functions (see extension/deploy note; cv-antifab is shared so generate-tailored-cv, refine-cv, and edit-cv all rebundle). Grep the deployed source of each to confirm the new regex shipped. Then rerun the exact live repro: seeded demo profile with no tools, JD mentioning Zendesk/Intercom, generate a tailored CV, and confirm the DB `cv_data` bullets contain no Zendesk/Intercom. Re-run the blast-radius scan and confirm it stays at zero real-user bullet fabrications.

---

## G2 (LAUNCH-GATING) - After onboarding the user has a roadmap but no first CV

**1. What was wrong (user terms).** A first-time student uploads their CV during signup, answers the onboarding questions, and finishes. The mental model is "I gave you my CV, give me a tailored CV." Instead they land on a page of matched roles (a roadmap) with no CV and no obvious next step to get one. The first CV is real but hidden behind either Jobs then Track then Generate, or the Coach. At a 100-student launch this is a cohort-wide "where is my CV" moment.

**2. Root cause (one paragraph).** Onboarding (`src/pages/Onboarding.jsx`) ends by generating the career analysis (matched roles and tasks) and dropping the user on Home/Career. There is no call-to-action that routes a freshly onboarded user into their first CV generation; CV generation is only reachable from the tracker checklist or the coach, both of which the user has to discover on their own.

**3. The fix (minimal, per decision D2).** Add a single clear call-to-action at the end of onboarding or on the first Home view for a user with zero CVs, for example "Generate your first tailored CV" that routes into the existing CV pipeline for a top matched role or a chosen job. No changes to the CV generation pipeline itself. For the user, finishing onboarding now points straight at the payoff. The larger "generate a starter CV automatically during onboarding" redesign is explicitly queued, not in this batch, to avoid pipeline surgery days before launch.

**4. What could break, and the guard.** Risk is low because this is a navigation and copy addition, not a pipeline change. The main risk is routing into CV generation for a user who has no usable target yet; guard by only showing the CTA when there is at least one matched role or by letting it open the role picker, and by reusing the existing generate path (which already handles its own error and loading states).

**5. Verify live after deploy.** Walk a fresh onboarding on the demo (reset onboarding, upload the resume, finish), confirm the new CTA appears, click it, and confirm a tailored CV is produced and reachable. Confirm the CTA disappears once the user has a CV.

---

## SHIP-WITH 1 - Home "Today's Focus" arrow does not go anywhere (Suspect A)

**1. What was wrong (user terms).** The main card on the Home page shows today's focus with a big coral right-pointing arrow. A right arrow means "go / do this," so users click it expecting to be taken to the task. Instead it just draws a line through the title for the day and does nothing else. It neither opens the task nor marks any real task complete; it flips a cosmetic per-day flag stored only in the browser.

**2. Root cause (one paragraph).** In `src/pages/Home.jsx:673-690`, the arrow button's onClick calls `e.stopPropagation()` then `toggleHeroDone()`. The stopPropagation deliberately blocks the card body's navigate. `toggleHeroDone` (Home.jsx:391-405) only writes a localStorage done-flag because, per the code comment, no daily_actions completion column exists. So the visually primary control neither navigates nor completes anything real.

**3. The fix.** Make the arrow navigate to the focus destination (what the card body already does), and move the done-toggle to a distinct, clearly-labeled control (for example a checkbox or a check icon that does not read as "proceed"). For the user, clicking the arrow now takes them to the task, which is what the affordance promises. As a side benefit this also resolves the axe nested-interactive violation on Home (a button nested inside a clickable card).

**4. What could break, and the guard.** Risk: users who had learned to use the arrow as "mark done" lose that. Mitigated because that behavior was cosmetic and browser-local only, not real completion, so nothing of value is lost. Keep the done-toggle available on the new control. Verify the card body and the arrow now both navigate and the keyboard path still works.

**5. Verify live after deploy.** On the demo Home, click the arrow and confirm navigation to the focus destination; click the new done control and confirm the done state toggles without navigating; run axe on Home and confirm nested-interactive is gone.

---

## SHIP-WITH 2 - CV Studio claims a step it does not do (Suspect C)

**1. What was wrong (user terms).** When tailoring a CV in the Studio, the progress indicator says "Selecting your strongest material..." That tells the user the system is picking their best bullets. It is not; the tailoring engine keeps every experience by design and only rewords. The copy describes work that never happens, which is both misleading and, given the honesty focus of the product, the wrong message.

**2. Root cause (one paragraph).** `src/components/cv-studio/CVStudioLive.jsx` shows a fixed, time-based stage sequence that includes "Selecting your strongest material..." (lines 418 and 424). The deployed refine-cv engine explicitly never selects or drops experiences (its prompt: every experience is always kept; the ops_variant parameter is a dead no-op). So the stage label asserts a selection step that does not exist. Separately the stage estimates end at about 9 seconds while the real call runs about 15.5 seconds, so the bar sits on the last stage during the tail.

**3. The fix.** Relabel the stage to describe what actually runs, for example "Reframing your experience for this role..." Optionally lengthen the final estimate to reduce the visible desync. For the user, the progress text now tells the truth. No engine change.

**4. What could break, and the guard.** Minimal risk; this is copy in one file. Guard by keeping the stage count and timing structure intact and only changing text (and optionally one timing constant).

**5. Verify live after deploy.** Run a tailor in the Studio on the demo and confirm the new stage text; confirm the tailor still completes and the outcome card renders.

---

## SHIP-WITH 3 - Profile "Upload resume" says success but fills in nothing (Decision D3)

**1. What was wrong (user terms).** On the Profile page there is an "Upload resume" button. After uploading, it shows a green "Resume uploaded" check, but the name, experience, and skills fields stay empty. A first-time user reasonably expects uploading their CV to fill in their experience; the success check makes it worse by implying something happened. They are left confused about why their information did not populate.

**2. Root cause (one paragraph).** The Profile upload (`src/pages/Profile.jsx`) only attaches the file and stores its URL; it does not run extraction. Extraction lives in the onboarding flow, not the Profile page. So the Profile upload is attach-only, but its success feedback reads like it parsed the CV.

**3. The fix (honest messaging now, per D3).** Change the feedback so it does not imply parsing, for example "Resume attached. We use it when generating your CVs. To fill in your experience, add it below or re-run onboarding." For the user, the message now matches reality and points them to where their experience actually gets entered. Real Profile-side extraction is a larger change and is explicitly queued, not in this batch.

**4. What could break, and the guard.** Very low risk; this is copy and possibly a small helper link. Guard by not touching the upload/storage path, only the success message and any adjacent hint text.

**5. Verify live after deploy.** On the demo Profile, upload the resume and confirm the new honest message, and confirm the file still attaches (resume_url set) and nothing else changed.

---

## SHIP-WITH 4 - Dock coach "View" does not open the CV you just made (F6/F7)

**1. What was wrong (user terms).** In the coach dock (the small coach panel on the side), when a CV finishes generating the card shows a "View" link. Clicking it does not open the CV. The person made a CV and cannot get to it from the dock. On the full website coach the equivalent "Download CV (.pdf)" button works, so this is specific to the dock.

**2. Root cause (one paragraph).** In `src/components/agent/CoachThread.jsx`, the CV-done row's "View" is wired to `onExpand`, and `expandPanel` (line 373) calls `drawer.open({})` with empty arguments. It opens the coach panel but passes nothing, so it never opens the generated `result.cv_url`, which is a live, downloadable PDF. The website coach instead calls `triggerBlobDownload(cv_url)` and works.

**3. The fix.** Wire the dock "View" to open or download `result.cv_url` (mirroring the website coach), or pass the result into the drawer so the expanded panel surfaces the download. For the user, "View" now retrieves the CV they just generated.

**4. What could break, and the guard.** Low risk; scoped to the dock CV-done card. Guard by reusing the same `triggerBlobDownload` helper the website coach already uses, so behavior is consistent across surfaces, and by keeping the expand-panel path for the non-CV suggestion rows unchanged.

**5. Verify live after deploy.** Generate a CV via the dock coach on the demo, click "View", and confirm the CV opens or downloads; confirm the website coach Download still works.

---

## SHIP-WITH 5 - Coach sends a job number as an application id and CV generation fails (F1)

**1. What was wrong (user terms).** In one real coach session, a student pasted a Hebrew job description that contained a job requisition number ("job number: 2657"), then asked for a CV. The system tried to generate against "2657" as if it were a tracked application, could not find it, and the CV generation failed. The user asked for a CV and got nothing (on the published extension they would see a raw error string).

**2. Root cause (one paragraph, source pinned).** The source is ai-chat, not the extension. The coach prompt (`supabase/functions/ai-chat/prompt-lib.ts:410`) tells the model to put an exact application UUID in the generation request, or null if there is no linked application. The model instead lifted the requisition number "2657" from the job text and put it in the `application_id` field. The parser that reads the model output (`prompt-lib.ts:1211-1213`) accepts any string as `application_id` with no format check, so "2657" passed straight through into `suggested_cv_generation.application_id`, and refine-cv then returned app_not_found (confirmed live in function_metrics). Logged: F1 true source = ai-chat model emission plus a missing UUID validation on parse; NOT extension currentApplicationId injection.

**3. The fix (defensive, server-side).** Validate `application_id` as a UUID at the ai-chat parse boundary (prompt-lib.ts:1211): if it is not a well-formed UUID, drop it to null rather than pass it through. Add the same UUID guard defensively in refine-cv / generate-tailored-cv so a bad id can never reach the lookup regardless of caller. For the user, a CV request that references a JD with a stray number now generates correctly (as a non-tracked CV) instead of failing. This fix makes the currently published extension safe immediately once ai-chat is redeployed, because it removes the failure at the source.

**4. What could break, and the guard.** Risk: dropping a legitimately-passed application_id if it is not UUID-shaped. Guard: the platform's real application ids are UUIDs, so a strict UUID check only ever drops malformed values; keep genuine tracked-application flows (which pass real UUIDs) working, and add a test that a real UUID passes and "2657" becomes null.

**5. Verify live after deploy.** Redeploy ai-chat (and refine-cv/generate-tailored-cv if the belt-and-suspenders guard lands there), grep deployed source to confirm the UUID validation shipped, then reproduce the coach flow with a JD containing a bare number and confirm the CV generates as non-tracked (no app_not_found in function_metrics).

---

## SHIP-WITH 6 - Accessibility: every route fails, some critically

**1. What was wrong (user terms).** An accessibility scan of all seven core routes at desktop and mobile found that every page fails on serious color-contrast (text too faint against its background), the Profile form has two critical issues (a form field with no label and an invalid ARIA structure), and the Tracker status dropdown on mobile has no accessible name. For a 100-student cohort that will include people using screen readers, keyboard navigation, or who just need readable contrast, parts of the product are hard or impossible to use.

**2. Root cause (one paragraph).** Color-contrast is systemic and comes from the shared design tokens (the same low-contrast text/background pairs are reused across every route; highest node count on the Jobs feed). The Profile criticals are in the Profile form markup (`src/pages/Profile.jsx`): a control without an associated label and ARIA roles missing their required parent. The Tracker status control is a native select rendered without an accessible name.

**3. The fix.** Raise the offending design-token contrast pairs to meet WCAG AA (this single change helps every route at once), add the missing label and correct the ARIA parent structure on the Profile form, and give the Tracker status select an accessible name (aria-label or associated label). For the user, text becomes readable and assistive tech can operate the Profile form and the status dropdown.

**4. What could break, and the guard.** Risk: contrast token changes ripple visually across the app. Guard by changing only the specific failing pairs, reviewing the main surfaces visually after, and re-running axe to confirm the serious/critical counts drop without introducing new violations. The Profile and Tracker markup fixes are local.

**5. Verify live after deploy.** Re-run the axe sweep across the seven routes at both viewports; confirm zero criticals on Profile and Tracker-mobile and a large drop in serious color-contrast counts. Spot-check the main surfaces visually.

---

## D1 - Track roles suggest jobs far below the user's level (cheap soft floor)

**1. What was wrong (user terms).** The platform suggested "Marketing Intern" as a top-track (Track 1) role at a 0.92 match for users who are past internship level, and similar junior roles (Junior Consultant, HR Assistant, Event Coordinator) landed in the top tracks for professionals. To an experienced user this reads as the platform not understanding their level, which undermines trust in every recommendation.

**2. Root cause (one paragraph).** The scorer only gates the seniority ceiling, never the floor. In `src/lib/scoreJobFit.js` the seniority gap penalty is `Math.max(0.55, 0.90^max(0, roleRank - userRank))`; when the role is more junior than the user (roleRank < userRank), the gap is 0, so the multiplier is 1.0 and the junior role gets full skill-fit credit. The library correctly tags "Marketing Intern" as Entry, so this is a scoring gap, not missing data. The same shape exists in the career-analysis path (`assignTrackWithGoal` in generate-career-analysis), and both read the shared `track-scoring-constants.ts`.

**3. The fix (cheap soft demote, per D1).** Add a symmetric seniority floor as a shared constant and apply it in both scoring paths (deterministic `scoreJobFit`/`trackFromScores` and `assignTrackWithGoal`). Per the decision, it is a SOFT DEMOTE, not a hard drop: roles more than N ranks below the user get a graduated score damp so they fall out of the top tracks, but a genuinely-desired reach-down role is never hard-removed. For the user, top tracks stop being populated by internships and clearly-junior roles. This touches shared constants that drive six edge functions, so it requires cross-review.

**4. What could break, and the guard.** Risk: a blunt floor hides a legitimately-desired lower-level role, or the two scoring paths drift and disagree. Guard by making it a soft damp (never a hard drop), applying the exact same constant and formula in both paths, and cross-reviewing against the six consuming functions. Add tests that a senior profile demotes an Entry role out of Track 1 while a matching mid role stays.

**5. Verify live after deploy.** Regenerate career analysis for a senior-profile test account and confirm no Entry/intern roles sit in Track 1/2; spot-check that a legitimate lateral or slight reach-down role is damped, not removed. Query career_roles for intern-titled rows in top tracks and confirm the count drops.

---

## Extension - current state, what the F1 fix changes now, what the resubmit adds later

**Current published build (v0.1.3).** Functionally works: the click-card path generates CVs, because the server-side fixes it depends on are already live (generate-tailored-cv v140 handles a null application id without a 400). Its shortcomings versus main are three coach UX items, all friction or cosmetic: it does not auto-fire CV generation on a plain-language "yes" (the user must click the card), it shows raw error strings on failure ("CV generation error: ..."), and it posts a canned echo message that looks like the user re-asked.

**What the F1 server fix changes immediately.** Once ai-chat (and the refine/generate guard) redeploy with UUID validation, the published extension stops driving into the app_not_found failure when a JD contains a stray number. That is the one functional failure in extension-land, and it is fixed at the server with no store action. This is what makes launching on v0.1.3 safe.

**What the store resubmit adds later (high-priority fast-follow, not launch-gating).** Bundling PR #471's extension half turns the three UX items good: accept auto-fires generation, failures show a clean human message instead of a raw string, and the canned echo is gone. The resubmit requires a version bump (HEAD is still 0.1.3, and the Chrome Web Store rejects an update without a higher version) and store review latency. Recommendation stands: launch on v0.1.3, ship the resubmit as an immediate fast-follow, and pair it with the F1 server fix so the worst-case first impression is either no failure or a graceful one.

---

## QUEUE (unchanged from triage, one line each)

- Suspect E full ESCO fix - the soft floor (D1) is a stopgap; the real seniority/role model is Phase-1-ESCO scope.
- Extension resubmit (PR #471 bundle + version bump) - high-priority fast-follow; makes failures graceful, not launch-gating.
- Suspect D tasks quality + add DB columns for suggested_specific_action/reason - the concrete "how" is generated then dropped.
- Suspect G per-role "Generate CV" on job cards - funnel convenience; overlaps the G2 CTA.
- exp-vs-project weighting - projects give skills but no tenure/seniority credit and there is no promote path; product-design call.
- comeet no-JD JD-capture at track time - it fails clean today; capturing the JD is an enhancement.
- edit-cv output normalization - studio chat edits can inject first-person voice unlike the generate pipeline.
- Duplicate CV-row accumulation - each generation inserts a new row; add upsert-per-app or one-in-flight guard.
- Story Bank inline-under-experiences in Profile - IA relocate; the experience_id link already exists so it is low-risk.
- Suspect F detail-drawer "View listing" + manual-add URL field - minor tracker link gaps.
- skills.tools competency-list provenance - tools a user did not explicitly claim inherit into every CV skills list; characterize.
- Deterministic second-person guard (analyze-job-match, generate-tasks) - prompt-only holds today; monitor or harden.
- /Internship redirects to /Home - confirm intentional gating vs broken route.
- Onboarding optional-steps labeling + apply-step gating UX - friction polish.
- Full per-route Lighthouse - coverage gap to close (only a landing sample exists).

---

## How Batch 1 will be executed (on approval)

Small verified branches per the lane plan. Four parallel lanes on disjoint files: cv-antifab.ts (G1, redeploys all three CV functions), CVStudioLive.jsx (Studio copy), CoachThread.jsx (dock View), ai-chat + refine-cv/generate-tailored-cv (F1). Home.jsx is serialized single-writer (arrow fix and, if it lands there, the G2 CTA). Profile.jsx is serialized single-writer (honest messaging and the a11y form fix). D1 touches shared track-scoring-constants and both scoring paths, gets cross-review. Speed guard on anything near CV generation: capture before/after wall-clock and require no regression. Each branch HOLDs for independent verification before merge. Edge functions get manual deploy plus a deployed-source grep to confirm the change shipped. Squash-merge then delete the branch as separate steps. PR #472 gets its own live before/after verification and merges in this wave (its scope to be confirmed at execution start). No em dashes anywhere.

HOLD: Eli reads this manifest before any code is written.

---

## G1 MANIFEST CORRECTION (logged during execution, 2026-07-02)

The manifest's "one shared regex fixes all three" was WRONG for generate-tailored-cv. Live verification (per-branch HOLD) caught it before merge:

- edit-cv and refine-cv DO route bullet checks through the shared `tokensTraceToMaster` and REVERT on failure, so the shared regex widen fixed them.
- generate-tailored-cv has its OWN INLINE validator (`index.ts:2367-2381` pre-fix): it used `QUANT_TOKEN_RE` directly (so `properNounTokens` never reached it) and only FLAGGED (`unsourced_bullets`), never removing. So a fabricated tool still shipped.
  Fix applied: extracted `enforceBulletProperNouns` into the shared `cv-antifab.ts` and called it from generate-tailored-cv (Option A: remove the fabricating bullet; numbers stay flag-only; no-empty invariant restores an experience's master bullets). This diverged-private-copy is exactly the failure mode the consolidation below prevents.

## QUEUE ADDITION - post-launch CV arc, FIRST STEP: ONE ENFORCEMENT GATE (consolidation)

Consolidate all bullet-level guarantee enforcement into a single shared chokepoint, `enforceCvInvariants(bullets, master, jd)`, called as the LAST step before persist by every authoring path (generate-tailored-cv, refine-cv, edit-cv, and any future engine). It enforces, in one tested place: proper-noun trace-to-master with revert-over-drop, numbers flagged, voice normalization, no-empty-experience invariant, English-only. Then DELETE the duplicated inline logic (gtc's checkBullet and any other private copies).
Rationale (for the record): this week's incomplete-fix finding was caused by a diverged private copy; one door makes that class of bug structurally impossible, and it is the prerequisite that makes the post-launch select+polish engine bake-off safe to run (candidate engines cannot ship fabrications regardless of how aggressive they are, because they do not control the door). Same architecture pattern as the render-cv Hebrew/voice chokepoint, which has held since it shipped.
Sizing S-M, own branch, PR #156 rules: speed guard, bake-off-style before/after, never bundled with other work. Sequence: gate consolidation FIRST, then the select+polish engine experiments on top of it. `enforceBulletProperNouns` (shipped this week) is the seed.

### SIBLING (same CV arc) — single CV renderer (divergence fix A)

Sibling of the enforcement-gate item; ship together post-launch. Today the Studio
preview (`CVStudioView`, React/HTML) and the download (`build-pdf.ts`, pdf-lib) are
TWO renderers over one `cv_data`. Fix B (content parity — Studio renders every
section the PDF renders + a walk-the-sections parity test) shipped this wave as the
launch-safe stopgap, but residual typography/layout differences remain because two
renderers still exist. **A = true single chokepoint:** the Studio preview renders
from the same `buildCvPdf` output (embed the rendered PDF/page-image as the preview)
so display and download are byte-identical. Conflicts with inline `contentEditable`
editing → larger change, hence queued. Same one-door pattern as the enforcement gate.

### QUEUED (F1 family) — chat CV-gen spawns a fresh app per attempt (dedup)

`generate-tailored-cv/index.ts:2712-2723` INSERTs a fresh `interested` application
whenever `application_id` is null or unresolved — so a non-tracked CV, or repeated
generations without a linked app, create duplicate rows (demo: 6 "Hive Support Ltd"
apps). SIZED: not small — the insert has only `role_title` (no company), so a clean
dedup needs company + carrying the created app id forward in the conversation.
QUEUED with the coach-dedup item. Fix candidates: dedup by (user, role, company) at
the insert, or thread the created app id back into the chat so later generations
reuse it. (Demo dupes cleaned up 2026-07-03 — see Modifications.)

---

## QUEUED D-ITEM (post-launch, do NOT build now) — stage-derivation short-circuit is crude

`inferExperienceLevel` (generate-career-analysis) returns `early_career` whenever
`isCurrentlyStudent` is true, **regardless of concurrent real experience**. A working
student or student-founder with substantial tenure is junior-tracked by one boolean.
Surfaced during D1 (2026-07): Eli derives `early_career` (current Reichman row) despite a
founder role + military + part-time CS — so the D1 seniority floor is correctly a no-op for
his account, but the derivation under-weights real experience for the working-student cohort.
Connects to the **exp-vs-project weighting** item (his founder role is undated AND
project-filed → undercounted twice). Fix candidate: let substantial countable tenure raise the
floor even when currently a student, and count dated founder roles. Post-launch; interacts with
exp-vs-project. Not this wave.

---

## QUEUED — SCORING COVERAGE ARC (post-launch)

Reordered per the 2026-07-02 Hebrew-eval NO-GO + the coverage-gap doc
(`role-library-coverage-gap.md`: ~63% of live IL jobs unmapped, ~77% of the gap is
BAD MAPPING not missing roles, Hebrew titles = 24.4% of corpus the biggest single driver).
**ESCO is demoted from backbone to ONE candidate source** weighed per-cluster against
corpus-derived titles — the eval showed ESCO lacks modern tooling concepts. **Full ESCO
backbone migration is OFF unless new evidence reopens it.** Phase-0's `coverage_ratio`
honesty gate survives independently of this arc.

Order:

1. **Hebrew extractor fix FIRST.** Catch multi-word descriptive-clause skills (the 87.5%
   drop the eval found). No taxonomy change — this is the single highest-leverage lever,
   since the gap is dominated by unresolved Hebrew titles, not missing roles.
2. **Alias / resolver consolidation.** Kills the triplication in the alias/resolver layer;
   recovers mapped jobs without new roles.
3. **Modest role expansion** for the genuinely-missing clusters only (Architect ~117 /
   Mechanical ~84 / Systems ~58 jobs). ESCO as ONE candidate source per cluster, weighed
   against corpus-derived titles — not a wholesale import.
4. **Family-aware mid-tier seniority floor** (after step 2, needs trustworthy family mapping).
   D1 shipped a SENIOR-ONLY soft floor `{early:0, mid:0, senior:2}` as the stopgap; the mid
   tier (8 junior-in-track_1 roles / 7 users) is untouched because a rank-only floor can't
   tell Isaac's legit case (mid engineer + SAME-family Junior SWE → track_1) from the bug
   (mid user + CROSS-family Marketing Intern). Fix: extend `applySeniorityFloor` with a
   home-family-match signal — demote a too-junior role for a mid user ONLY when it's NOT in
   the user's function family.

Whole arc gated behind the Hebrew-eval GO/NO-GO.
