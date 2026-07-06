# Session Handoff — May 31, 2026

**Previous session ended:** May 31, 2026 (afternoon, post-demo)
**Next session should:** Read this first, then PROJECT_INSTRUCTIONS.md + the most recent prior handoff (May 29) for depth. Then act on the **Immediate state** section below.

---

## How to work (unchanged — see PROJECT_INSTRUCTIONS.md)

- **Ask-don't-tell with Claude Code.** Frame prompts as questions; CC shows design/decisions before building; Eli confirms.
- **Code blocks = prompts for Claude Code.** Eli copy-pastes them. Regular text = conversation with Eli.
- **Claude.ai (this surface) scopes, advises, writes prompts, verifies against the live DB via Supabase MCP. Claude Code executes.**
- **Surface decisions before locking in. Share judgment, push back, name weak spots — Eli explicitly wants disagreement, not a rubber stamp.** He pushes back well and is often right; listen.
- Plain language, real fixes (not workarounds), product-ready quality. Don't suggest breaks/stopping. Investigate before asserting.
- Edge functions **don't auto-deploy on merge** — manual `npx supabase functions deploy <slug>` after every backend PR. CC auto-merges low-risk PRs on green CI; high-risk (auth/chat/routing) waits for Eli.
- Supabase project ref: `ilmqmodklutztuybsvwd` · Git remote: `https://github.com/getajob-careers/get-a-job.git`
- Eli's user_id: `4b243f3a-5035-474e-a89d-aff13fe06cc2` (admin/test account, `elienglard34@gmail.com`)

---

## ⚠️ Immediate state — start here

**1. PR #195 is open on HOLD, ready to merge.**
- `HOLD FOR REVIEW: feat(outreach) — propose_internship message quality`
- Branch `eli/propose-internship-tighter`, commit `fc5e321`, 2 files +127/-30
- **`generate-linkedin-outreach-message` is already deployed live at v23** — this PR just syncs the repo back to what prod is running, so **there is no behavior change at merge and no redeploy needed.** Eli eyeballs the diff and merges when ready.

**2. Next build (Eli agreed to this order): the Internship Pipeline delete + drag-drop fix.**
- An **investigate-first prompt was already sent to CC** for this. It asks: what does the Pipeline tab render now — the old `CompanyTargetsKanban` (`@hello-pangea/dnd`, from PR #69) or a non-DnD replacement from the #180–#185 redesign? And delete mechanics: hard-delete row vs soft archive (check `company_target_status_changes` FK/cascade).
- Current `company_targets.status` values: `exploring / outreach_sent / interview / offered / declined / rejected` — **no `archived` state.**
- Working hypothesis: the #180–#185 redesign replaced the DnD kanban; fix = port PR #69's DnD into the new Pipeline tab + add a remove action. Confirm before building.
- This is on the **Internship page Eli just demoed to Amir** — broken delete/reorder on the flagship surface, so it's the priority.

**3. Then: the unmapped-skills coherence bug** (see queue below).

---

## What shipped / happened this session

### PR #195 (HOLD) — propose_internship outreach message quality
The `propose_internship` outreach goal generated messages that were (a) generic to the company and (b) overwhelming / too forward. Iterated to fix across three eyeball rounds (deploy-then-iterate on v21→v22→v23, prod ahead of repo until #195 merges):
- **Register: offer not decree.** "I'd do X over 8 weeks" (a declaration to a stranger that presumes the internship + data access) → "if it'd be useful, one thing I could dig into is…". Fixed timelines banned unless the call has happened.
- **Grounded why-them** pulled from `company_targets.match_rationale`, used as a SWAP not an add; banned praise phrases ("I admire", "innovative approach").
- **(Blocker, fixed) fit-hedge leak.** `match_rationale` is a *mixed artifact* — grounded company fact + an internal fit-strength hedge in one prose string. On a lower-fit row (Alta = 70) the hedge ("provides a moderate bridge… may require additional adaptation") leaked verbatim into the message — a student telling a stranger their own fit is "moderate." Fix: prompt extracts the company fact ONLY, never reproduces fit/bridge-strength language; **server-side guard in `sanitizeSuggestion` flags 16 hedge phrases (flag-only, not auto-strip** — same pattern as the existing "I hope this finds you well" detector). Verified: Alta's DB rationale still contains the hedge, but v23's message dropped it and framed positively.
- **Enrollment claim mandatory** in every message ("part of my university's internship program") — it's the credibility anchor; it had been inconsistently dropped.
- **Concreteness rule** — contribution must name a concrete object (recurring problem / process / workflow / dataset), bare "insights" filler banned.
- Final v23 output passed the full rubric on 3 companies (7AI / Adaptive Shield / Alta). Committed → #195 on HOLD.

### PR #194 (merged earlier this arc) — education skills capture
- `EducationTab.jsx` gained a `SkillTagInput` writing `education.skills_developed` (column existed, was unused — only 1/39 rows populated).
- New `src/lib/recomputeProfileSkillsCanonical.js` — fetches all 4 skill sources fresh (profile skills + experiences + education + projects), single source of truth, used by saveProfile / addExperience / EducationTab. Closes a latent #178-class cache-pollution risk on the recompute path.
- New `scripts/backfill-profile-skills-aggregated.ts` (snapshots `*_pre_eduskills`, `--dry-run/--only/--limit`).
- **PENDING (operator step, not demo-blocking):** run the backfill — `--dry-run` first, scan for any *down* deltas (increases are benign alias catch-up; only decreases signal a bug), then live with the snapshot for rollback.

### Unmapped-skills coherence bug — logged to Notion (P1)
- The platform's skill **autocomplete suggests labels that don't resolve to canonical** → they land in `skills_unmapped`, inert for matching/scoring/CV. Evidence: 5 compound suggestion-style labels each appear in exactly 13 profiles, all unmapped; "notion" unmapped despite `notion_workspace` being a real library ID (alias gap).
- Principle: anything the platform *suggests* must resolve. Plan: investigate-first (suggestion source vs resolver) → coherence fix (suggest only resolvable skills / alias every suggestion) + broader unmapped audit (add library/alias entries for legit skills + tools; LEAVE traits like "team player" unmapped — judgment, not blanket).
- **Notion card (with full evidence + ready-to-fire prompt in the body):** https://www.notion.so/3718298b80cf811cabc5efcaed074f29

### Amir demo (practicum head) — WIN
- Loved it, **excited to move forward.** Accepts and fully understands the **two-pilot strategy** (students via Amir + professionals via the WhatsApp pilot — already separate invite-code cohorts).
- **Wants student explanation/tutorial videos** for the Resources section. Eli will record them.
  - **Key constraint to carry forward:** record on a **student-representative profile** (thin/no work history), NOT Eli's loaded profile — otherwise the walkthrough oversells vs what students actually see. The education-skills capture (#194) is what makes a thin profile demo well. Maps to the already-scoped Resources "videos section."
  - **Pending decision before logging the task:** one getting-started walkthrough vs per-feature shorts (Eli's lean undecided). Not yet logged to the Task Board — log it once scope is set.

---

## Decisions locked this session (don't relitigate)

- **Outreach default = a single specific-but-soft message.** Two-step (warm-up then propose) is a *supported mode* for senior/busy recipients, thin bridges, or warm contacts — **not the default.** Reason: the specific proposal is the hook that earns a cold reply; a content-light opener risks higher first-message drop-off. Whatever the first message is, it MUST carry a concrete reason to reply (vague hint = the real failure mode). **This is empirical — A/B it in the pilot, don't decide by intuition.** No build assigned.
- **`propose_internship` gate = `practicum_path IS NOT NULL`** (uniform for ALL practicum users). `self_sourced` vs `faculty_assigned` is a **data dimension for Eli's analysis only, not a behavior switch.** One enrollment-based claim for everyone ("part of my university's internship program"), never a placement claim.
- **`match_rationale` is a mixed artifact** (company fact + fit hedge). Short-term: prompt extracts fact only + server guard. **Long-term cleaner fix (PARKED, not this PR):** structure the matcher output into separate `company_fact` / `fit_assessment` fields so no downstream consumer disentangles prose.

---

## The queue (prioritized)

**Next two (have investigate prompts ready):**
1. **Internship Pipeline delete + drag-drop** — prompt already with CC (see Immediate state #2).
2. **Unmapped-skills coherence bug** — prompt in the Notion card above. Elevated by the demo: hits exactly the thin student profiles Amir's sending.

**P1 queue (no prompts drafted yet):**
- Track 1 scoring too loose — jobs with null `req_skills_core` get a free pass, irrelevant roles sneak in.
- Merge tools into skills (unify the field, per-experience tagging, Skills Advisor `SUGGESTED_SKILL_TAG_JSON`).
- Split Work Arrangement (Remote/Hybrid/On-site) from Employment Type (Full-time/Part-time/Contract/Internship) — currently mixed.
- Auto-trigger career analysis on profile save (cache-invalidation helper already exists).
- Projects / Certifications as experience types (same skills tagging + CV rendering, no schema change).
- Task dedup — `generate-tasks` doesn't check existing/completed tasks.

**Operator step (not a build):** run the #194 backfill (above).

**From the demo:** log the student-videos Task Board card once Eli sets scope; spec the student-representative demo profile.

**Parked deliberately (don't touch):** score-saturation #341 (pipeline reads all-High, scores 70–85), who-to-contact seniority calibration by company size, browse `rule_score` 70-cluster fix, structured `match_rationale` fields.

---

## Key context for the next agent

- **Supabase project ref:** `ilmqmodklutztuybsvwd` · **Eli's user_id:** `4b243f3a-5035-474e-a89d-aff13fe06cc2`
- **Git remote:** `https://github.com/getajob-careers/get-a-job.git`
- **Notion hub:** https://www.notion.so/3658298b80cf811d8adfe28be1afc455
- **Notion Task Board:** database `9ad51150-586a-4f3d-b61d-941ebd7d6690` / data source `ddf6e32b-f852-4070-b586-0ddb68a411a8`. Schema: Task[title], Category[Bug/Feature/Infra/Design/Docs/Legal], Status[Not Started/In Progress/Done/Blocked], Priority[P0 Launch Blocker/P1 Should Ship/P2 Nice to Have], Owner[Eli/Isaac/Yishai/Noms], Due Date, Assigned to, Notes.
- **Models:** gpt-4o (matcher / pitch / outreach generation), gpt-4o-mini (classification/extraction). All structured calls use `response_format: json_object`.
- **Outreach edge function:** `generate-linkedin-outreach-message` at **v23 in prod** (PR #195 syncs repo). The goal is gated three places that must stay in sync (lesson logged): TS union + Postgres CHECK + runtime `VALID_GOALS` allowlist.
- **Shared modules (deploy in lockstep):** `_shared/internship-rule-score.ts` (browse rule score), `_shared/internship-pitch.ts` (LLM pitch + match_score, used by matcher AND drawer), `_shared/internship-target.ts` (target-domain anchoring).
- **Eli's profile state for testing:** `practicum_path = 'self_sourced'` (set for testing — revert with `UPDATE profiles SET practicum_path = NULL WHERE id = '4b243f3a-...'` when done), `primary_domain = 'product_management'`, `five_year_role = 'Product Manager'`, `skills_canonical` = 45, `skills_unmapped` = 10 (8 + 2 he added to his education row this session to test #194; both came from autocomplete and didn't resolve — that's what surfaced the coherence bug).
- **DB facts:** `company_targets` cols include `match_score (numeric)`, `match_rationale`, `pitched_role`, `pitch_rationale`, `who_to_contact`, `status`. `education.skills_developed`, `projects.skills_demonstrated`, `experiences.skills_used + tools_used`. `linkedin_outreach_conversations.goal` CHECK includes all 9 goals incl. `propose_internship`.

## Notion bookkeeping still pending (Eli's manual edits / or do via Claude.ai)
- Stripe card → P2 · Internship redesign card → Done (carried from May 29, confirm done).
- New this session, not yet logged: a Done-able card for PR #195 outreach quality; the student-videos card (awaiting scope).
- Per DOCUMENTATION.md: at session end, flag doc updates. #195 + #194 are enhancements to existing functions (no new tables/functions), so Architecture Overview counts are unchanged.
