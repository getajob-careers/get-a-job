---
title: Final pre-cert re-audit (item 11)
date: 2026-07-27
owner: design-lane
scope: full platform, both flag states (flag-on = reveal cohort, priority), prod www.getajob.careers
main_at_audit: 509edd3 (audit ran against build serving #797 back-nav @ 7222180)
status: findings-only (no fixes applied); input to Eli's cert triage
---

# Final pre-cert re-audit

Four parallel specialist tracks: (1) design-craft 9-rule, (2) functional QA (every button/flow/state, driven live in an authed session), (3) mobile responsive, (4) copy-honesty. Both flag states, flag-on prioritised. Live flows run on the walkthrough account (`elienglard34+walkthrough`, disposable) at prod; onboarding + back-nav on `elienglard34+v2test`.

**Method note / limitation (read before triaging visual findings):** the live browser tab's CSS viewport was capped at **770px** (device pixels scaled by DPR; the screen-size limit blocked a wider window). 770px CSS sits in the Tailwind `md` band (768-1023). This surfaced a real `md`-band layout blocker (below) but means the clean upper band (>= ~1050px, e.g. maximised desktop) was reasoned from the flex math + the Career-page contrast, not eyeballed. **One wide-desktop (>=1280 CSS) visual pass on flag-on Browse Jobs is the single outstanding item before cert sign-off.**

Console was swept per surface via a `window.__audit` interceptor + `read_console_messages` (errors only). **Zero console errors** across Home (3 tabs), CV generation, coach, tracker, tasks, feedback, flag-off Home, Career.

---

## Severity summary

| Sev         | Count                 | Headline                                                                                                                                                                                                                                                                                                                                    |
| ----------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Blocker     | 1 (width-conditional) | Flag-on Browse Jobs feed collapses / garbles at `md`-band widths                                                                                                                                                                                                                                                                            |
| Major       | 7                     | Hand-rolled buttons miss focus-visible + <44px targets (jobs surfaces); tab control no focus indicator; MatchedRolesPanel toggle no states; hardcoded scrim/error colors; onboarding situation grid no mobile collapse; CV-Studio flag-off templates rail squeezes doc on mobile; situation selector single-select under a "pick all" label |
| Paper-cut   | ~10                   | Focus-removed inputs, sub-44px ScoreRing, type/radius/motion scale drift, JobDetailModal footer no wrap, why-panel buried on mobile, tracker stat lag, "coming soon" copy                                                                                                                                                                   |
| Post-launch | 3                     | Dead-code scarcity string, dev-preview Hebrew fixture, misc scale debt                                                                                                                                                                                                                                                                      |

Nothing renders permanently broken or unrecoverable except the width-conditional blocker below. The codebase is unusually honest (see Copy-honesty: no blockers/majors).

---

## BLOCKER (width-conditional)

### B1. Flag-on Browse Jobs feed collapses and garbles at `md`-band widths

- **Surface / flag:** `/Home?next=1&tab=jobs` (ThreeTabHome "Browse Jobs" tab) and `/Jobs?next=1` (redirects there). **Flag-on only.** Reveal-cohort priority surface.
- **Repro:** sign in flag-on, open Browse Jobs, browser CSS width ~768-820px. Job titles in the feed render **one character per line vertically** (reproduced with Hebrew and English titles), overlapping the filter chips; the feed is unusable. Confirmed live at 770 CSS px.
- **Cause:** `src/components/redesign/home/ThreeTabHome.jsx:173-185`. The container is `flex flex-col md:flex-row`; the feed is `md:flex-1 min-w-0`, the panel is `md:w-[360px] lg:w-[400px] xl:w-[440px] flex-shrink-0`. The two-column split turns on at `md` (768px), but the persistent ~280px Coach left-rail leaves only ~450px of content region at 770px, so the non-shrinking 360px panel starves the `flex-1` feed to ~78px.
- **Width bands:** severe garble ~768-820px; cramped-but-readable ~820-1024; clean >= ~1050 (maximised >=1280 desktop expected clean, not eyeballed).
- **Realistic exposure:** non-maximised / split-screen browsers, iPad landscape (1024), Windows laptops at 125-150% display scaling.
- **Proof + fix reference:** flag-off `/Jobs` redirects to `/Career`, which renders the **same feed+roles-panel pattern cleanly at the identical 770px width** (feed as a 2-col card grid + 360px panel) because Career has no persistent Coach left-rail (content region ~730px). Career is the existing proof the pattern works given room. Fix direction: gate the split at `lg`/`xl`, drop/collapse the Coach rail on the jobs tab, or let the panel stack below ~1050. (Not applied - findings only.)

---

## MAJOR

### M1. Newest jobs surfaces hand-roll buttons instead of reusing RdButton (no focus-visible, sub-44px)

- **Files / flag:** `JobGridCard.jsx:452-505, 426-448`; `JobDetailModal.jsx:342-407, 248-255`. Flag-on (action cluster gated on `alive`).
- Every action button is a raw `<button>`/`<a>` with only `hover:` - no `:focus-visible` ring, no `:active`. `grep focus-visible` = 0 hits across JobGridCard / JobDetailModal / MatchedRolesPanel / ThreeTabHome. Touch targets: track "+" = 36px; Generate CV / View CV / Apply ~38-40px; modal close ~26px. All below the design-bar 44px floor (they clear WCAG 2.5.8's 24px AA minimum, so this is a design-bar Rule 8 fail, not a WCAG-AA blocker). Keyboard focus on the three card actions is indistinguishable (only the shared card-level ring shows). Root cause of M1-M3: these surfaces predate `RdButton` (the correct shared primitive with all four states + min-h-44 + focus ring). Reusing it closes all three.

### M2. ThreeTabHome primary tab control: no focus indicator, sub-44px

- **File / flag:** `ThreeTabHome.jsx:125-140`. Flag-on.
- The three tab buttons (CV / Tracker / Browse Jobs - the primary nav of the flag-on home) are `py-2` (~32-34px) with no `:focus-visible`; the animated pill tracks the active tab, not the focused one, so a keyboard user sees no focus move. `role="tablist"`/`tab` declared but no arrow-key roving-tabindex (ARIA tab pattern incomplete).

### M3. MatchedRolesPanel expand toggle: no hover/focus/active state

- **File / flag:** `MatchedRolesPanel.jsx:212-215`. Flag-on (renders in ThreeTabHome Browse Jobs + Career).
- The role expand/collapse button (the panel's only interactive control) has no hover, no `:focus-visible`, no active; the card wrapper has no `focus-within` either.

### M4. Hardcoded scrim / elevation / error colors (missing tokens)

- **Files / flag:** scrim + big shadows `rgba(40,25,10,...)` at `JobDetailModal.jsx:149,160`, `JobGridCard.jsx:518`, `CanvasMobileRail.jsx:70,77` (no `--rd-overlay` token). Error banner hardcoded red `#FECACA/#FEF2F2/#991B1B` at `JobsSearchTab.jsx:621` (no `--rd-danger` token). Both flag states (modal backdrop) / flag-on (error banner). Needs two token proposals, not just inlined swaps.

### M5. Onboarding V2 situation selector: `grid-cols-5` with no mobile collapse

- **File / flag:** `OnboardingV2.jsx:515`. V2 onboarding (live for all un-onboarded users). Screen 0.
- `grid grid-cols-5` at every breakpoint; at 375px each cell is ~60px and `p-2.5`, so labels ("Freelancing", "Unemployed") wrap/clip and the icon+label stack crowds. First screen every new user sees. Fix pattern already used by siblings: `grid-cols-3 sm:grid-cols-5` (see `DirectionScreenV2.jsx:307`, `StepReview.jsx:902`).

### M6. CV-Studio templates rail squeezes the document on mobile (flag-off path)

- **File / flag:** `CVStudioView.jsx:992`. **Flag-off only** on `/CVAgent` at 375px.
- The `w-[216px] shrink-0` aside sits next to the `min-w-0` document lane in a `flex flex-wrap md:flex-nowrap` row and does not wrap below at 375px, crushing the CV document to ~150px. The flag-on path collapses the rail to a 44px strip (fine). Severity depends on whether flag-off `/CVAgent` is reachable by real users on mobile - **needs Eli's read on the flag rollout state.**

---

## PAPER-CUT

- **P1.** Inputs strip the outline with no replacement focus style (invisible keyboard focus): `JobsSearchTab.jsx:330,733`, `AgentComposer.jsx:64`. Flag-on. (Correct pattern used elsewhere: `outline-none` + `focus:border-rd-primary focus:shadow-[0_0_0_3px_var(--rd-primary-tint)]`.)
- **P2.** ScoreRing interactive breakdown toggle is 42px (<44px); otherwise exemplary (full ARIA + keyboard + focus ring). `ScoreRing.jsx:93-101`.
- **P3.** JobDetailModal footer `flex justify-end gap-2.5` has no `flex-wrap`; three pills ~285/303px at 375px risk clipping, and the `generating` state swaps in a wider progress element. `JobDetailModal.jsx:341`. Flag-on.
- **P4.** MatchedRolesPanel is stacked after the entire feed on mobile (`flex flex-col md:flex-row`), so the "why you're matched" panel is invisible until the user scrolls past 60-180 cards. `ThreeTabHome.jsx:173-187`. Flag-on. (Same code as B1; on mobile it degrades gracefully but buries the panel.)
- **P5.** Type-scale drift: 61 arbitrary `text-[Npx]` across JobGridCard / JobDetailModal / MatchedRolesPanel ignore the now-existing `rd-t-*` scale. Radius drift: `rounded-[Npx]` arbitraries vs `rd-r-*` in the same files + OnboardingShell. Both flag states.
- **P6.** Motion durations outside the approved 150/200ms set (300-700ms) on one-shot onboarding reveals: `OnboardingShell.jsx:78`, `ReviewScreenV2`, `StepResumeUpload`, `OnboardingTutorial`. Flag-on onboarding.
- **P7.** CV-Studio editing chrome uses raw `rgba(0,0,0,...)`/hex for hover/focus tints, scrollbar, placeholder (the CV document print palette is a legitimate separate namespace; the chrome around it should token). `CVStudioView.jsx:1677-1702`.
- **P8.** Small text in dense clusters near the mobile readability floor: MatchedRolesPanel compact tier 10-10.5px, CvMatchedRolesRail eyebrow 9.5px, JobGridCard chips 10px. Watch-items for the wide-desktop eyeball.
- **P9.** "Profile details coming soon." over-promises for the ~253 thin-profile companies (a description may never arrive). `CompanyBrowseCard.jsx:67`. Both. Suggest "No profile details yet."
- **P10. [live] Tracker "saved" stat reactivity/parity:** flag-on ThreeTabHome tracker stat read "2 saved" right after a manual add while the board held 3 cards; flag-off Home reads "3 saved / in-pipeline 3". Likely the flag-on stat not reacting to the just-added card (reconciles on reload) or a "saved"-status-vs-board-count semantic. Low severity; verify it reconciles on reload.

---

## POST-LAUNCH (not launch-blocking)

- **PL1.** Dead-code scarcity string "100 invites in this wave. First come, first served." in `Landing.jsx:1060` - `Landing.jsx` is unrouted (App maps `/` and `/Landing` to `LandingV2Preview`); recommend deleting the file to prevent accidental re-route.
- **PL2.** Hebrew fixture string in `_preview/fixtures/canvasHome.js:575` - only reachable under `SHOW_PREVIEW_ROUTES` (not prod). Cleanup.
- **PL3.** General `rd-t-*` / `rd-r-*` scale adoption debt on the jobs/career/matched surfaces (see P5) - large but avoidable going forward.

---

## Flows verified PASS (live, flag-on, walkthrough account)

- **CV generation:** PASS. "Tailor to a job" -> honest picker -> tailored CV created, honest success card ("Your Product Manager, Platform CV is ready. Tailored for DriveNets. Matched 5 of 10 key phrases. Done / Download"). Per-bullet Revise, 6 templates. Honest progress ("~10-20 seconds", static ETA, no fake countdown). Console clean.
- **Coach + job visibility:** PASS. Asked which matched job is the best fit; coach named "Associate Product Manager, 91% readiness, only Track 1 role that moves you toward your goal", citing the user's real founder/AI experience AND their task list ("Apply to an Associate Product Manager role"). Genuine cross-surface data visibility, grounded. Console clean.
- **Tracker:** PASS. Honest stats, 7-step explainer, kanban. Manual add persisted in Interested with honest "No source link" + unset track (exactly as the modal warned). DriveNets auto-tracked from CV-gen.
- **Tasks:** PASS. Honest framing ("Generated from your skill gaps ... Not invented by you"), real personalised tasks. Complete-toggle write PASS (0/5 -> 1/5). Coach<->Tasks consistency confirmed.
- **Feedback (flag-off pill #767 + flag-on menu item):** PASS. Category picker -> describe form (captures route, 0/2000 counter) -> Send -> "Thanks - feedback sent!" toast. Write completed.
- **Above-ceiling note:** VERIFIED present and consistent ("Above your current level") on every "Worth a stretch" matched-role card, flag-on.
- **Company logos:** NOT a defect. Load fine (Wiz/Classiq/DealHub 80x80 complete, 0 broken); empty squares are transient lazy-load only.
- **Flag-off Home (classic coral):** clean + honest (stats resolve, Today's plan consistent with Tasks, honest empty states throughout).

---

## Surfaces confirmed clean (code-track spot checks)

CvGenerationProgress (honest indeterminate + measured ETA), MatchedRolesPanel axis bars (null score omits its bar, never renders 0%; full loading/error/empty triads), onboarding V2 primary buttons (full states + min-h-44), JobDetailModal modal semantics (focus trap, Esc, scroll lock, reduced-motion), ScoreRing/ScoreBreakdown ARIA, UnifiedJobsFeed states, CanvasToolTile (Tasks tile). LandingV2Preview responsive breakpoints thorough. Copy-honesty: landing hero stats live-wired with corpus-tracking fallback, example cards labelled "illustrative only", extension "Coming soon" intentional, real job % from scoreJobFit (band labels not raw enums), no enum/undefined/NaN leakage, AI-powered claims accurate + Terms disclaims guarantee.

---

## Out-of-lane observation (noted, not a design finding)

Matched feed "Our picks for you" leads with adjacent-field customer-support roles scored 74/70/65 **above** the user's stated-goal PM roles (47/42, stretch 14-52), on both flag states. Labels are honest ("Adjacent field" / "On your goal path"), but the top of the list is off-goal. This is scoring/ranking logic (CV lane, parked). Flagging for awareness only.

---

## ONBOARDING + BACK-NAV track (v2test, live, slate/0A palette)

v2test resumed cleanly at screen 0 (a fresh from-scratch run was possible; no reset needed). Walked screens 0 -> 3 via the "Skip - I'll enter details manually" path. **"Go to my workspace" was never clicked** (point of no return); the account remains un-finalized.

**Back-nav (#797, merged 7222180): PASS on both surfaces, state preserved both directions.**

- Screen 2 (direction) has a "<- Back" control; clicking it returned to screen 1 (review) with all entered values restored (Education summary showed "Reichman University . Bachelor's, Business Administration"). Continue forward then re-restored screen 2's values (goal role "Product Manager", Remote+Hybrid, internship "No").
- Screen 3 (springboard) has a "<- Back" control; clicking it returned to screen 2 (direction) with goal role + work arrangement + internship all intact.
- Screen 1 (review) correctly has NO Back (its back-to-upload handling was the deferred/"to propose" case, not in #797) - consistent with the ruling.
- Console clean across the entire walk incl. every back/forward (0 errors, 0 warns via window.__audit + read_console_messages).

**Honest states verified:**

- Review screen empty state on the skip path: "No CV yet - fill in the essentials below and you can always add your CV later." No fabricated extraction (this is the dc645f4/#797 provenance gate working). Sections show "None yet" honestly.
- Start date is a text input ("e.g. September 2023"), not a native date picker (the onboarding-friction-fix). "I'm currently studying" correctly disables End date.
- CV-generation-style honest progress not applicable here; springboard "You're all set" is honest ("Add your CV any time to unlock job matches").

**Findings from this track:**

### M7. Situation selector is single-select under a "PICK ALL THAT APPLY" label (MAJOR)

- **Surface / flag:** Onboarding screen 0 (`cv_upload`), "YOUR CURRENT SITUATION - PICK ALL THAT APPLY" (Student / Have a job / Looking / Unemployed / Freelancing). V2 onboarding (live for all un-onboarded users).
- **Repro / evidence:** clicking a second option deselects the first; the DOM shows `aria-pressed` toggle buttons where only ever ONE is `true` (confirmed: Looking-only -> Have-a-job-only across UI clicks + DOM read). The label explicitly instructs "pick all that apply", so a very common user in this audience (employed AND job-hunting) physically cannot express their situation.
- **Contrast (same screen 2):** the "WORK ARRANGEMENT - PICK ALL YOU'RE OPEN TO" selector IS genuine multi-select (Remote + Hybrid both held simultaneously). So the platform has a working multi-select pattern; the situation selector simply doesn't use it under an identical "pick all" label. This is an inconsistency, not a technical limitation.
- **Relation to prior ruling:** the situation multi-select (min 1) was RULED yes but "investigate consumers first"; it is evidently not yet shipped while the multi-select label is already live. The fix is the already-ruled multi-select build. Until then, the label over-promises.
- Related: M5 (mobile) - the same `grid-cols-5` selector does not collapse on 375px.

### Paper-cut (onboarding copy)

- Review screen heading subtext reads "Here's what we found in your CV." even on the skip / no-CV path, while the banner directly above correctly says "No CV yet". Mild contradiction; the subtext should branch on the has-CV state. `ReviewScreenV2`.
- Onboarding copy uses em dashes ("everything from it - no manual entry", "PICK ALL THAT APPLY" headers) - house style avoids em dashes; low priority, shipped product copy, flagging for consistency only.
