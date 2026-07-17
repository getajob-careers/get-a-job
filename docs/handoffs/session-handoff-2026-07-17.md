# Session Handoff — 2026-07-16 → 07-17 (overnight)

The most consequential session the project has had: scoring v2 shipped end to end (serving pending one redeploy), the design language completed through the official logo, and a production-database backup gap discovered before it bit. Three lanes ran in parallel: scoring, design canvas, infra audit.

---

## 1. SCORING — the arc is CLOSED (pending one redeploy + baseline check)

The complaint that opened the arc ("my top match wants gaming experience I don't have; wrong-direction junk outranks my PM match") is fixed, validated, and merged.

**Shipped and live-verified on Eli's account, all behind ?scoring_v2 (flag ritual each time):**
- **C1 confidence-aware ranking** (#595 fit-score version, #597 re-target): the live check exposed that /Career displays attainability_score while C1 shrank fit_score — sort vs display were different numbers. Option A ruling: attainability is the canonical feed score, sort == display == bands. Re-targeted, re-validated. Lesson recorded: eval metrics must be computed on the number the product renders.
- **C2a must-have weighting** (#599): distinctive-weighted core coverage (distinctive 1.0 / generic 0.35 + zero-distinctive floor). Live check: the flat 88-wall fully de-tied (82/80/79/75/73/71).
- **C2b direction blend** (#600): rank_score = attainability × (1 + 0.25·on_direction), sort key only. w=0.25 chosen as the floor that clears the block (0.2 leaves one SDR above Helfy; 0.4 over-lifts weak primaries). ACID TEST PASSED: Helfy PM rank 7 → rank 1 on Eli's real 120-candidate list, above the entire wrong-direction CSM/SDR/Marketing block.
- **Option-B direction card** (#601): d.direction derived in the shared deriveJobDisplay seam (live card, modal, and canvas card all read it — port-proof). Quiet tag: "On your goal path" / "Adjacent field", same flag as the re-rank by construction. Live check passed incl. the Jeen.ai TPM showing its tag in Stretch.
- **Default-on flip** (#603 + #604 nudge): scoringV2Enabled() now true unless ?scoring_v2=0. MERGED to main (8ee28d5) but **NOT SERVING** — see infra. Kill switches armed: ?scoring_v2=0 (per-user), flag-level revert (one line), deploy rollback to dpl_6yy8CY (sha 26a8d5d, #601 build = current serving).

**Spike + C4 (greenlit, parked):**
- Role-tier spike (#602, merged): classifier A (deterministic, title + function_family + exception list) hits 95%, 100% manager recall; the 5-6% dangerous false-manager error is one nameable cluster (ops/office/quality "*Manager") → routed to ABSTAIN (penalty is negative, abstain is safe). Reproduced 4/5 of Eli's labeling overrides (5th abstains safely). B (LLM extraction) rejected: +3% not worth schema change + 6k re-extract.
- **C4 requirements (binding):** ops-manager cluster → abstain; exec/finance leadership lexicon (Assistant Controller class) from the start; MAX tier across target titles = user's reference tier; abstain = no penalty; fires only on the classifiable ~66%. Own sub-flag (v2 is default-on now) — users never see an unvalidated component. Play Perfect (Papaya "Monetization Manager", 92%→48% under v2) stays the pinned joint test. Industry-requirement signal question decided in C4's design notes.
- C3 (hard gates) deliberately parked — narrowed by 2b's overlap. C5 (embeddings) only if headroom after C4. Post-C4: a second labeling round on fresh data beats more components.

**Next actions:** Vercel fix → CC verifies serving sha == 8ee28d5 → Eli's baseline check (plain /Career: Helfy top + tags; ?scoring_v2=0: legacy) → announce to pilot cohort (optional, recommended) → C4 kickoff.

---

## 2. DESIGN CANVAS — language complete, on draft PR #596 (branch eli/product-design-canvas, worktree, dev :5174)

**Locked this session (decisions ledger additions):**
- **Official logo:** B (chair) desk-person "A" mark in the toolkit object material (glaze + weight shadow), ONE mark at every size — size split killed per Eli. Wordmark FONT still open: CC to propose 2-3 typeface treatments (the A is untouchable).
- **Toolkit rail:** carousel locked (contained scroll — overscroll fix so back-swipe can never fire), chevron affordances, portaled tooltips, per-tool colors (LinkedIn brand blue the one exception), rosette Story-bank icon, Chat tile (heather violet, 2nd slot) wired to expand the SAME coach conversation (one assistant, two sizes).
- **Top third:** composition A (utility bar + segmented pill tabs, no greeting).
- **Coach ergonomics:** all four shipped — auto-grow textarea, body-m bubbles, stream-aware scroll (pin / stop-on-scroll-up / "↓ latest"), expand-to-wide overlay.
- **Roadmap:** grounded in the REAL "Your matched roles" panel (roles not jobs, tier badges per role, two-axis bars, ✓/＋ skill chips, expand) after two wrong guesses — craft pass approved, integrating into the Browse right rail (two-column). Lesson: restyle the real thing, never reinterpret from the name.
- **Sidebar IA for the port:** Internship TRASH, Today TRASH, Chat → toolkit tool.

**In flight:** wordmark font options; chat-history UI (backend supports threads per Eli — CC verifying the actual schema/endpoints first); FEASIBILITY-FIRST standing rule + retroactive feasibility audit of the whole canvas → docs/design/feasibility-audit.md (doubles as the port round's work-list).

**Port round (parked, scope queued):** remaining pages onto the system + onboarding (4 screens, EARLY — it's the front door) + mobile coach surface + the app shell/left sidebar + the old sidebar orphans. Input docs: port-plan-input.md, component-audit.md, canvas-tokens.md, design-lane-handoff.md.

---

## 3. INFRA — the time bomb (morning-critical)

**Findings (read-only audit, docs in the scoring lane's report):**
- **Supabase: production DB on FREE tier, ZERO backups since Jul 13.** The "ownership transfer" did NOT move the project — it's still in isaac613's Org, now downgraded. Nano compute, 60-conn cap (22 in use), 190/500 MB, 1-day logs, pause-on-idle risk.
- **Vercel: all integration activity dead since #601** (no checks, no builds, preview or prod — proven with two controlled nudges #603/#604). Team getajob-team; plan/billing/Git-integration state is dashboard-only. Likely the same Isaac subscription change. The v2 flip sits in main unserved; users safely on the #601 build.
- **Blast radius:** Cloudflare (DNS + Turnstile) and OpenAI (all AI features) are HIGH-priority unverified ownership; Resend, OpenRouter, domain registrar, GitHub org unverified.

**Morning action list (in order):**
1. Supabase → upgrade Isaac's org to Pro (~$25/mo) TODAY — restores daily backups, zero downtime. Check Database → Backups for pre-downgrade remnants (expect none).
2. Vercel dashboard → team Billing + Git integration → fix → Redeploy 8ee28d5 → ping scoring CC to verify serving sha → baseline check.
3. Message Isaac: full inventory of what's under his accounts / what changed Jul 13 (Vercel, Cloudflare, OpenAI, OpenRouter, Resend, domain, GitHub org). Move billing to Eli this week, deliberately.
4. Later, not under pressure: Supabase project TRANSFER to an Eli-owned Pro org (keeps ref ilmqmodklutztuybsvwd — no code changes; dump+restore would change the ref, avoid). Institutionalize: periodic pg_dump to Eli-controlled storage, independent of any org's billing.

**New lessons recorded:** merged ≠ serving — only the production alias's serving sha is truth (get_deployment on getajob.careers); Vercel can silently skip builds; a "transfer of ownership" must be verified in the dashboard, not taken from a WhatsApp message.

---

## 4. Open decisions on Eli's desk (none block the lanes)
- Wordmark font pick (options coming)
- Chat-history UI proposal review (coming, feasibility-verified)
- Feasibility audit review → then the page-port proposal
- Post-baseline: pilot-cohort announcement of the smarter matching (recommended)
- #592 Option-A build (CV Studio write-through + coach tools) — fully decided, awaiting build scheduling; edit-history table is a blocking prereq for coach writes (rule 6)

## 5. Standing rules added this session
- Eval metrics on the rendered number; verify sort==display before attributing a metric
- FEASIBILITY-FIRST in the design lane; fixtures mirror real data shapes
- Users never see an unvalidated scoring component (sub-flags now that v2 is default-on)
- The serving-sha check is part of every deploy ritual
