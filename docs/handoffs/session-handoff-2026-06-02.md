# Get A Job — Session Handoff (2026-06-02)

Continues the app-wide visual redesign. Eli (founder) scopes in Claude.ai; you advise, verify CC's PRs, and write paste-ready prompts for Claude Code (CC) in a separate terminal. Eli relays prompts between you and CC.

---

## 🔴 ACTIVE / URGENT — Jobs page stale deploy (resolve this first)

**Symptom:** Eli's live `getajob.careers` Jobs page (after hard refresh) shows the redesign *chrome* (cream sidebar, serif hero, card layout) but the WRONG colors — green/amber match badges, amber skill-gap pills, green card top-border, **black** Track button, "See Job Posting" as a plain text link. It does NOT look like the warm coral mockup.

**Diagnosis (confirmed by reading the code):** This is a **stale deployment, NOT a code bug.** The code on `main` is the correct warm version. Proof points:
- Live hero reads **"Real roles, refreshed nightly."** but `main`'s `Jobs.jsx` (line ~390) reads **"Live roles, scored against your tracks."** → production is not serving `main`.
- `main`'s `JobCard.jsx` (390 lines) has `RD_TRACK_STYLES` (coral/teal/golden), renders match badges **track-tinted** (coral for Track 1), skill-gap pills in **neutral cream** (`bg-rd-bg-soft`), strengths in **teal-tint**, card with plain warm border (`rounded-[18px]`, no green top stripe). None of that is what's on the live screen.
- So the green/amber/black version is an **older build**. A browser hard-refresh can't fix it because the Vercel *origin* is stale.

**Likely cause:** production build failed after the #221 merge (Vercel keeps serving last-good = older build), or the new deploy never promoted to production.

**CC prompt already delivered to Eli (verify he sent it / check the result):**
```
The live getajob.careers Jobs page is serving an OLD build, not current main. Proof: live hero "Real roles, refreshed nightly." with green/amber badges + amber gap pills + black Track button; current main's Jobs.jsx hero is "Live roles, scored against your tracks." and JobCard.jsx renders track-tinted badges, neutral cream gaps, teal strengths, no green. main is correct; production is stale.
1. What commit is the current getajob.careers PRODUCTION deploy built from — latest main (#221) or older?
2. Did the most recent production build succeed? If it failed, paste the full error.
3. If it failed or an older deploy is promoted, get current main live (fix the build error, redeploy/promote).
Report findings before touching app code.
```

**NEXT once the correct build is live:** pull the actually-live Jobs page, compare side-by-side to `/mnt/project/getajob_jobs_page.html`, and flag any GENUINE remaining deltas. Known mockup targets to check against:
- Match badge: track-tinted — coral `#C7461F` on `#FCE6DF` (T1), teal `#2E7C6B` on `#DBEEE8` (T2), golden (T3). NOT a green/amber strength scale.
- Track filter pill (active): coral-tint bg / coral-dark text (T1); idle pills warm-neutral `#F3ECE0`.
- Card avatar: track-tinted tint bg + dark text.
- **Primary action = coral "Apply" pill** (`#EF5A41`/white). Live currently de-emphasizes it as a text link — confirm main makes it a coral pill; if not, that's a real delta to fix.
- **Track button = warm-neutral pill** (`#F3ECE0`/`#6B655B`), NOT black. Confirm in main.
- Card: white, border `#F0E7D8`, radius 14px, hover lift, no colored top border.

**Broader through-line for Eli's trust:** today he hit "nothing changed" then "wrong colors" — BOTH turned out to be the **deploy pipeline not reliably shipping `main` to production**, not the redesign work. Worth fixing the pipeline reliability so this stops recurring. Be honest with Eli: in this session I twice diagnosed too fast (said "code diverged to green/amber") before reading the code — the code was actually correct. Read the shipped code before concluding.

---

## Verification methodology (how to review CC's PRs) — working dir /tmp/gajreview

- Fetch raw files from a branch: `curl -fsSL "https://raw.githubusercontent.com/getajob-careers/get-a-job/<branch>/<path>?t=$(date +%s)"` (the `?t=` cache-buster matters — raw lags minutes after push).
- GitHub API (`api.github.com`) returns 403 even with a User-Agent → use raw fetches instead.
- Render preview PDFs: PyMuPDF `fitz` → `get_pixmap(dpi=110-115).save(png)` then `view` the PNG.
- Read mockup intent: grep `/mnt/project/getajob_*.html` (read-only copies of the committed mockups in `docs/design/redesign/`).
- Supabase read-only checks via the `Supabase:execute_sql` tool (project `ilmqmodklutztuybsvwd`). **READ-ONLY SELECTs only — never apply prod writes/migrations; CC does those via PR.**
- bash network is allowlisted (github/raw/npm/pypi) — Vercel is NOT reachable from here, so deploy checks go through CC's terminal.

---

## Project constants

- **Supabase project ref:** `ilmqmodklutztuybsvwd` (PG 17.6). Eli's user_id: `4b243f3a-5035-474e-a89d-aff13fe06cc2` (admin, elienglard34@gmail.com).
- **Repo:** github.com/getajob-careers/get-a-job (PUBLIC). Frontend auto-deploys to prod (getajob.careers) on merge to `main` via Vercel; edge fns + DB migrations are MANUAL deploy. Squash-merge.
- **NO NOTION this session** — Eli explicitly said track everything in-chat; CC keeps the rollout checklist in `tasks/redesign.md`. Do NOT create Notion pages.
- **Working style:** ask-don't-tell; surface decisions with a clear lean before building; plain language; real fixes; push back honestly; concise; don't suggest breaks. Code blocks in your replies = prompts Eli pastes to CC. CC co-author trailer: `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`.
- **Models:** gpt-4o (gen) / gpt-4o-mini (classification).
- **Pilot:** WhatsApp 100 (working professionals), gated/closed, blocked on Noms (Eli's wife/lawyer) privacy policy + this redesign. Reichman students = Aug–Nov 2026 separate cohort. Don't conflate.

## Redesign visual system (locked; tokens in `src/index.css` as `--rd-*`)

Warm cream "authentic AI" look. Rokkitt display serif, coral CTAs. Key tokens: bg-page `#FAF6F0`, bg-card `#FFF`, bg-sidebar `#EFE7DB`, border `#F0E7D8`, text `#211D18`/secondary `#928C80`/tertiary `#857F74`/eyebrow `#A38E6F`, coral `#EF5A41`/coral-dark `#C7461F`/coral-tint `#FCE6DF`, teal `#54B5A2`/teal-dark `#2E7C6B`/teal-tint `#DBEEE8`, golden `#EFB23E`/golden-dark `#7A5408`/golden-tint `#FBEBC9`, peach `#E79B7D`. Logo = four dots (coral/golden/teal/ink) 2×2 + "Get A Job" Rokkitt 700. **Track colors (rdColor): track_1=coral, track_2=teal, track_3=golden.** Mockups committed at `docs/design/redesign/getajob_*.html` and readable at `/mnt/project/getajob_*.html`.

## Standing redesign rules (`tasks/redesign.md`)

1. **RESTYLE-ONLY ON BEHAVIOR:** apply the new look, preserve every required section/state/behavior; live file authoritative, mockups visual-only. EXCEPTION: where a mockup encodes a *feature/IA change* (not just visual), flag it as a design question for Eli — don't decide unilaterally.
2. Ship a Playwright→PDF preview per page in `docs/design/redesign/previews/`.
3. Typecheck baseline ratchets DOWN only; currently **419**. Never increase.
4. DEV-only `/_preview/<page>/...` harness routes (`import.meta.env.DEV` gate); CC verifies prod 404 every run. Preview = Option 1 (pre-seed QueryClient cache with fixtures keyed by canonical query keys).
5. Fork shared components used by not-yet-redesigned pages; modify-in-place when scope-exclusive or wanted everywhere.

## Strategy (locked)

- Restyle the ENTIRE app before opening the pilot — full consistency at launch. D2 (no feature flag); ship each page to main as its own scoped PR. No bundling, no auto-merge; you review each preview before Eli merges.
- Complex pages (Roadmap, Tracker, LinkedIn, Chat, Profile) get a full investigate-first checkpoint; simpler pages (Story Bank, Tasks, Calendar, Resources, Settings) investigate+build in one pass.
- **LinkedIn MUST closely match its mockups** (`getajob_linkedin_profile_optimizer.html` / `posts_feed_preview.html` / `networking_outreach.html`). It's the page Eli cares most about looking right. When reached, give CC full investigate-first + an explicit "match the mockups closely" directive, and review the preview side-by-side against the three mockups.

## Rollout order + progress

✅ **Shell** (PR #217) · ✅ **Prelaunch fixes** (#218: stale-banner, salary→skill-building, invite/eyebrow copy, agent-count five→four) · ✅ **Home** (#219, + live-job-matches stat & `count_active_jobs_by_role_titles` RPC) · ✅ **Roadmap** (#220, 4 tabs, rdColor) · 🟡 **Jobs** (#221 merged to main, code correct — **but production deploy is stale; see top of doc**)

▶️ **NEXT: Tracker** (decision below) → then **Profile** (complex) → Story Bank → Tasks → Calendar → **LinkedIn** (mockup-fidelity priority, biggest) → Chat → Internship → Resources → Settings → Landing.

## Tracker — investigated, ruled, build prompt delivered (PR not yet open)

CC's investigation caught a major thing: **the live Tracker is NOT a kanban.** It's a row-list with 8 status filter pills + expand-in-place `ApplicationRow` (9 tabs). `@hello-pangea/dnd` is only on the Internship page. The three mockups (kanban / seven-step-guide / steps-checklist) imply a **feature rebuild** (drag-drop, 7-status→4-column lossy collapse, drilldown route).

**Ruling (Eli's call, you recommended and he's proceeding):** **Option (b) — RESTYLE-ONLY on the row-list.** Defer the kanban + drilldown route to a separate **post-launch feature PR** (the 7→4 status collapse is lossy and needs a status-model decision; drag-drop is the buggiest area — 4 Internship stabilization PRs; pre-launch risk).
- Q3 default-sort-by-tier = post-launch backlog, OUT.
- Q4 = migrate track pill to rdColor (Tracker is the last legacy-color surface; completes the palette migration).
- Q5 keep inline expand. Q6 keep all 9 tabs. Q7 fixtures approved.
- Carry over from mockup-3 ONLY the 7-step grouped checklist visualization (1-2 / 3-5 / 6-7 phasing) into the in-row Steps tab — same 7 keys, same lock rules, just visual grouping. Keep the referral-star "High Impact" highlight.

**Preservation contract (CC's P1–P17) — the load-bearing pieces a restyle must NOT touch:**
- P2: `handleStatusChange` UPDATEs `applications.status` ONLY — the `trg_log_application_status_change` Postgres trigger does the audit write; **client NEVER writes `status_changes`** (RLS denies it).
- P4: `handleSaveJobDescription` = `stripHtml` (from PR #351) → UPDATE → chain `scoreApplication` (LLM `analyze-job-match`) when JD non-empty.
- P5: checklist optimistic update + rollback-on-error.
- P11: unsaved-changes guard (`hasUnsavedChanges` + `window.confirm` on collapse).
- P14: `applications.status` 7-value enum (interested/preparing/applied/interviewing/offer/accepted/rejected). P15: `checklist` JSONB keys exactly: qualification_confirmed, jd_dissected, cv_tailored, skills_proof_mapped, referral_attempted, application_submitted, interview_prep_done.
- P7: the 6 per-tab components (CVManagement, SkillsRequired, ProjectsProof, NetworkingReferrals, InterviewPrep, FollowUp) own their own writes — out of scope; restyle only container chrome.
- P17: Tracker-area TS errors = 6 (in ApplicationChecklist.jsx / ApplicationRow.jsx) — pre-existing; don't increase the 419 baseline.

**(b) build prompt was delivered to Eli** (branch `eli/redesign-tracker`). Confirm he sent it; when the PR returns, review: status-change write path untouched, checklist optimistic-rollback, grouped Steps tab, rdColor track pills, typecheck ≤419.

## Trust thread (important context)

Eli asked this session whether CC "decided against my mockups." Honest picture: most pages DID follow the mockups — Roadmap went to the mockup's exact 4-tab structure when Eli pushed; Home built the mockup's live-matches stat; Jobs cards match. **Tracker is the one real divergence**, and that's a flagged design-question (the mockup is a feature rebuild, deferred), not CC overriding him. The recurring "doesn't look right" on Jobs was a **deploy** problem, not CC ignoring the mockup. Operating principle going forward: when a mockup is pure visual → match it; when it encodes a feature/behavior change → flag it and let Eli rule.

## Deferred / post-launch backlog

Tracker kanban + drilldown feature PR (needs status-model decision) · default-sort-by-tier + filter controls · migration-history reconciliation (`supabase migration repair` — `supabase db push` currently blocked by remote/local divergence) · RoleCard weak-axis color semantics (Eli may revisit) · resend-confirmation button · delete legacy `TRACK_CONFIG.color` once all surfaces migrated · product intro video (Kling 3.0 for cinematic b-roll only; real screen recordings for product UI; Supademo/CapCut free options) · Noms `/privacy` + `/terms` real content + signup consent checkbox (pre-pilot blocker).

## Outstanding action items (ordered)

1. **Resolve the Jobs stale deploy** (top of doc) — verify CC's Vercel check, get current `main` live, then compare the live page to the mockup and fix any genuine remaining deltas (coral Apply pill, neutral Track pill).
2. Confirm Eli sent the Tracker (b) build prompt; review PR when it returns.
3. Continue rollout: Profile → Story Bank → Tasks → Calendar → LinkedIn (match mockups closely) → Chat → Internship → Resources → Settings → Landing.
4. Pre-pilot: Noms privacy/terms + consent checkbox.