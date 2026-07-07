# Session handoff — 2026-07-06 (night)

A long session: deep-qa-3 → the Arc 0 cleanup train, the IA spec + its redline, a platform-fix lane
(coach CV-blindness, the CV title-mislabel fix), and Arc 2 Step 1 visual direction (held). Two edge-fn
deploys landed and were verified. Below: what's live, what's held, what Eli owns, and where to pick up.

---

## Landed on main today

**Arc 0 cleanup train — all squash-merged, branches deleted, verified:**

- **#495** IA spec (Arc 2 Step 0) + Arc 1 extension-investigation findings + 35 session handoffs + `.gitignore` (`.obsidian/`, `notes/`).
- **#496** Daily-Action cron OFF (schedule removed, `workflow_dispatch`-only) + Home hero degrades honestly; deleted orphan `DailyActionCard.jsx`.
- **#497** Track-drift fix — the relaxed-T1 alignment gate reconciled to the shared constant (was hardcoded `0.70` vs shared `0.80`). **Deployed + verified live** (`generate-career-analysis` v109): the 2 flip-window rows (noah.adler97@, figdorb@ "Business Operations Manager", fit<0.50/align 0.700) now resolve `track_3` on **both** scorers. ⚠️ First deploy shipped STALE code (local was 5 commits behind main → bundled the pre-fix file); redeployed from an up-to-date main. **New lesson logged** (in #500): edge deploys bundle from the LOCAL working dir, not GitHub main — a version bump is not confirmation; grep the live artifact.
- **#498** Committed the four `deep-qa-3-*.md` files + a dated **PostHog correction banner** (deep-qa-3's "no instrumentation" was a false negative — PostHog shipped in #412 and is verified ingesting).
- **#499** deep-qa-3 **PostHog addendum** — real scrubbed click data (ran the HogQL myself; the sub-agent couldn't reach the MCP). Coverage ~94% (50 scrubbed real persons). **Key finding:** the satellites deep-qa-3 called "undiscoverable" were mostly **reached-but-unwanted** (/StoryBank 5, /Jobs 17, /Roadmap 20, /Linkedin 5) — park calls hold, the _remedy_ changes (don't reinvest in discovery). /Calendar (1) truly unreached.
- **#500** the two train lessons (edge-deploy-from-local; `grep -o | head` false-confirms — use `wc -l`).
- **#501** deep-qa-2 fix-manifest **triage** (DONE/SUPERSEDED/SURVIVES) + a status header on the orphaned manifest.

**Platform-fix lane — merged + DEPLOYED + verified:**

- **#503** Coach **CV-blindness** fix — `ai-chat` context now marks, per application, whether a tailored CV already exists (`applications.cv_url`/`cv_status`), across sessions, with a companion prompt rule. **Live (ai-chat v102).** Verified: live-artifact fingerprints present; 55 of 97 apps fire the marker on real data.
- **#505** CV **title-mislabel** fix — `cv_version_name` now derives from the linked application's `role_title` (server-authoritative, gtc), not the caller/LLM `target_role`; + an `ai-chat` parser reconcile (belt-and-suspenders). **Live (gtc v144 + ai-chat v102).** Precondition verified before building: the OLD experience-title-_collapse_ bug is genuinely fixed live (`reconcile.ts fillFromSource` ×12 in the deployed artifact) — the deferred-list entry was stale.

**IA spec redline pass 1** (`#495` branch → `973f24e`, on main): usage rationale reworded undiscoverable→reached-but-unwanted (per #499); Skill-Advisor + Interview-Coach **graduation** clauses (coach modes now → dedicated Skills workspace / voiced interview page later; grounded by the future KB/RAG layer); CV consolidation **investigate-first** step + opt-in flag; LinkedIn **promote-back** criteria; §4.6 prettier-artifact fixed.

**#504 delivered (held):** CV consolidation step-1 **investigation** — recommends canonical **engine = `generate-tailored-cv`**, **renderer = `buildCvPdf` with the Studio preview rendered FROM it**, gated behind a single **`enforceCvInvariants` chokepoint before persist** (else the two renderers keep diverging on voice/first-person). Pinned the live title-mislabel bug → which #505 then fixed.

---

## Reprioritization — PLATFORM-FIRST

- **Arc 1 (extension resubmit) is PARKED behind Arc 2.** ~53 real users on the platform vs ~0 on the extension. **Extension v0.1.3 to be UNLISTED** from the Chrome Web Store (Eli manual). The resubmit gets cheaper as Arc 2 lands (it consumes IA spec §4.5) — nothing lost by deferring.
- **New horizon: KB/RAG arc** — a curated retrieval layer (pgvector + `ai-chat`) grounding coach advice modes + the future graduated Interview/Skills surfaces. First deliverable when scoped: a **content inventory** (role library, job corpus, Coursera set). Not started.

---

## Held set (awaiting Eli)

**#494 — dead-code kill + orphan-table drops.** Deploy ritual is irreversible — schedule deliberately:

1. Merge #494 (squash) + delete branch.
2. `git checkout main && git pull` (deploy bundles from LOCAL — see the lesson).
3. Remote-undeploy 4 fns: `generate-application-tasks`, `generateApplicationTasks`, `generateTailoredCV`, `send-waitlist-email` (`supabase functions delete <slug> --project-ref ilmqmodklutztuybsvwd`).
4. Pre-check `select count(*) from applications where custom_template_id is not null;` = 0, then apply `supabase/migrations/20260706_arc0_drop_dead_tables.sql` via **MCP `apply_migration`** (NOT `db push`). Drops `campaign_sends`, `waitlist_signups`, `job_suggestions`, `cv_templates` (+ its FK/column on `applications`), and the `_seniority_derive_rollback_2026_06_09` backup. **EXCLUDES `calendar_events`** (live read+write).
5. Regenerate `src/lib/database.types.ts` + commit.
6. Verify: the 4 slugs gone from `list_edge_functions`; the 5 tables absent; build green.

**#502 — visual direction, iteration 2.** Navy base + mustard-gray neutrals + surface tiers + gold-beyond-CTAs; two intensities. **Navy-SUBTLE is liked but NOT signed** — Eli + Yishai will converge on color. ⚠️ **Yishai's "dark-hive theme" is not in the repo** (no branch/file/bundle) — needs a pointer (branch / Figma / bundle path) to reconcile. **No per-page rollout until signed.**

**#504 — CV consolidation investigation.** Canonical base accepted **in principle pending Eli's explicit read/sign.** **Do not begin consolidation scoping until he signs #504.**

---

## Eli's open manual items

- **Sign #502** (final color; converge with Yishai) → unblocks per-page visual rollout. Provide a pointer to Yishai's dark-hive theme.
- **Read + sign #504** → unblocks consolidation scoping.
- **Schedule the #494 ritual** (irreversible — undeploys + table drops).
- **Unlist extension v0.1.3** from the Chrome Web Store.
- (Optional) `/install-github-app` — briefed this session (what it does, permissions, review-only steps); not run.

---

## Next-up options (pick one to open the next session)

1. **After #504 sign-off — scope the CV consolidation arc.** Sequence: (1) `enforceCvInvariants` chokepoint before persist → (2) Studio "Tailor" calls `gtc` → (3) Studio preview rendered from `buildCvPdf` (preview==download). Each its own held PR, opt-in flag, PR-#156 rules.
2. **Independent platform lane (no visual/consolidation dependency) — the Hebrew extractor fix.** SCORING COVERAGE ARC step 1: the single highest-leverage scoring lever (~24% of the live IL corpus is Hebrew titles; the eval found an 87.5% descriptive-clause drop). Gated behind the Hebrew-eval GO/NO-GO. Also available in this lane: finding-1 structural cue (optional/last), CV-row dedup, the SW6 a11y-markup remnant.

---

## State pointers

- **Held PRs:** #494, #502, #504.
- **Deploys landed today:** `generate-career-analysis` v109, `ai-chat` v102, `generate-tailored-cv` v144.
- **Canonical docs on main:** `docs/design/ia-interaction-spec.md` (redlined); `docs/research/deep-qa-3-*` + `deep-qa-3-posthog-addendum.md` + `deep-qa-2-manifest-triage.md` + `cv-engine-consolidation-investigation.md`. Visual-direction files (`docs/design/visual-direction-step-1.*`) are held on **#502**, not on main.
- **Memory** (`arc0-cleanup-arc2-ia-spec`, `extension-store-submission-queue`) updated with the reprioritization + held state.
