# Session Handoff — Registry Cleanup + R1 Capture (2026-06-14 eve)

Two-terminal registry work. Captures state so it survives across terminals/sessions. Companions: the worklist page, verified-URLs page, and Legal & Sourcing page under the Notion hub (`3658298b80cf811d8adfe28be1afc455`).

## TL;DR state

- **PR #322 (Phase 4 — contamination fix):** shipped, HOLD FOR REVIEW, independently verified against live rows. Ready to merge on Eli's approval.
- **R1 net-new capture:** investigation complete, no DB writes yet. Two-track plan confirmed. Harvest of the 6 supported-ATS companies in progress.
- **Cross-review:** Eli is sole approver for these registry edits. The "+ Isaac" gate is dropped for this work.

---

## PR #322 — Phase 4: null contaminated company slugs

URL: https://github.com/getajob-careers/get-a-job/pull/322

**What it does:** nulls the ATS slug/api_url on three rows whose endpoints pointed at the WRONG company, in BOTH `companies_il.json` (load-bearing copy refresh-jobs reads) AND the `companies` table.

| row | ats | slug | api_url | verified |
|---|---|---|---|---|
| CyberArk | workday → unknown | → null | → null | false (unchanged) |
| Ermetic | greenhouse (kept) | → null | → null | true → false |
| Deci AI | workday (kept) | → null | → null | true → false |

**Why it matters:** Ermetic (→ Greenhouse `tenableinc`) and Deci AI (→ NVIDIA `nvidia.wd5…/login`) were `verified=true`, so they were actively fetched every cron run, surfacing Tenable jobs as "Ermetic" and an NVIDIA login board as "Deci AI." CyberArk (→ `paloaltonetworks.wd5…/PaloAltoNetworks`) was already `verified=false` so not fetched, but still wrong. All three confirmed present in BOTH copies.

**Independent verification (Claude.ai, via Supabase MCP):** live rows match the down-migration's pre-state byte-for-byte — CyberArk `paloaltonetworks.wd5.myworkdayjobs.com/PaloAltoNetworks`, Ermetic `tenableinc`, Deci `nvidia.wd5.myworkdayjobs.com/login`. Rollback restores exactly. Migration is idempotent (per-row name+ats+slug guards). by_ats metadata: workday 37→36, unknown 254→255, total 891 unchanged.

**Files:**
- `supabase/functions/_shared/libraries/companies_il.json` — 3 row edits + count adjustment + per-row note documenting the null
- `supabase/migrations/20260614_null_contaminated_company_slugs.sql` — per-row UPDATE with explicit guards (idempotent); down-migration with pre-state values verbatim

**Post-merge:** registry-data change, NOT edge-function code → no `supabase functions deploy` needed. Nulled rows simply stop being fetched on the next refresh-jobs cron. Squash-merge, delete branch.

---

## R1 net-new capture — investigation complete, no writes yet

**Critical architecture fact:** the job corpus is fed by `companies_il.json` (refresh-jobs.ts:258 reads it, fetches where `verified && api_url && ENABLED_ATSS.has(ats)`). The `companies` table is downstream (one-way JSON→table sync via `import-companies-from-registry.ts`). **Inserting a table row does NOT make jobs flow.** For jobs to flow, a supported-ATS company must land in the JSON.

**Two-track plan (confirmed):**
- **Track A — manual (~88 after dedup)** → one SQL migration into `companies` table: `source='manual'`, `verified=false`, `careers_url` set, `api_url=null`, tagged `origin='r1_manual_2026-06'`. Rollback = single `DELETE … WHERE origin='r1_manual_2026-06'`. These populate company directory / internship matching ONLY — never the job corpus.
- **Track B — supported (6)** → `companies_il.json` after a token/slug harvest. Then synced to table.

**Dedup found:** Pepper/Leumi (= existing Bank Leumi), Arnon-Tadmor Levy (already captured), and intra-list dup Shlomo Group = Shlomo Insurance (same careers page). → ~94 net-new, ~88 manual after the 6 supported peel off.

**The 6 supported-ATS companies** (only Baker Tilly fetch-ready as-is; other 5 need token/slug harvest):
- Baker Tilly — Workday (`bakertilly.wd5.myworkdayjobs.com/BTCareers`) — ready, but verify it's not just the global tenant with 0 IL roles
- PayBox — Comeet (UID 18.004) — token harvest
- PassportCard — Comeet (JS-embedded) — UID+token harvest
- Hertz — AdamTotal (`career.adamtotal.co.il`) — token harvest, verify live tenant
- Contentsquare — Lever — needs slug
- Yael Group — SuccessFactors — needs SF feed URL

**Unsupported ATS (→ manual, no fetcher exists):** TopMatch (Altshuler Shaham, Meitav, Mor), Oracle Cloud (Verint). Tagged for later if fetchers ever built.

**Likely false-negatives** (static probe missed JS-rendered ATS): Fundbox, SolarEdge, Plus500, Yango, 888/Evoke, One Zero, Tarya, Cardcom. `discover-tech-xhr.ts` could upgrade some to supported before finalizing. "6 supported" is a confirmed floor, not ceiling.

**Honest reframe:** of ~94 hand-found companies, only 6 are corpus-jobs-capable; the other ~88 are directory/internship-matching coverage only. The manual hunt buys directory breadth, not job volume.

**Excluded from ingest** (wrong-company / board / unverified): Blender→blender.org, Achva→achva.ac.il, Meir→mer-group.com, Budget/Lease4U→jobmaster, Mizra→jobswipe, Taldor→bebee, Bit→bit-gem, Experis (recruiter), Psagot extra links.

---

## Held / deferred (Comeet-endpoint thread, sibling work)

- **K2view + Firebolt:** preflight curl confirmed tokens LIVE; both just have 0 current IL roles (Firebolt has IN/DE roles, K2view 1 location-less). NOT a bug; self-heals next refresh when an IL role opens. Folded into later JSON→table sync.
- **Phases 2+3 (9 Category-B Comeet token discoveries + 7 Category-C re-classifications):** bundled as a separate later discovery PR with its own table-of-changes. Category C (Blockaid, Empathy, Healthy.io, Keshet Media, LawGeex, Team8, Quantum Machines) are NOT on Comeet — re-classify; Team8 is a VC portfolio aggregator (322 cos) and Quantum Machines redirects to TeamMe.link — both drop or mark `ats=custom`/`verified=false`.
- **SAP / SuccessFactors:** task #392, P2 deferred. Needs IL-filter logic; low ROI.

---

## Key principles reinforced this session

- `companies_il.json` is load-bearing; the `companies` table is downstream. Any fix that must change fetch behavior edits the JSON, not just the table.
- `verified=true` in the registry did NOT guarantee "points at the right company" (Ermetic, Deci were verified+wrong). Data-integrity question worth a later look: how did those get marked verified?
- Non-producing tech companies are mostly (a) foreign cos with no IL roles (correctly empty — OpenAI, Notion, Linear, etc.) or (b) Israeli cos between hiring waves. NOT a fetch bug. Don't "fix" empty-but-healthy companies.
- Registry already holds ~470 tech companies (the whole IL ecosystem). "More high tech" is not a seeding gap; the lever is fixing endpoints, not adding names. A net-new high-tech list would require fabricating past the first couple dozen — declined on anti-fabrication grounds.
- Independent verification via Supabase MCP before any merge. Live rows checked against migration claims.
- Watch auto-accept-edits mode on terminals: registry/JSON writes must arrive as reviewable PRs, not auto-accepted file writes. Confirm "shells still running" wrote nothing unreviewed.

## Open follow-ups

1. Merge PR #322 (Eli's call).
2. Track A manual migration PR + Track B JSON PR (after harvest) — both HOLD FOR REVIEW, Eli sole approver.
3. Later discovery PR (Phases 2+3).
4. Data-integrity: audit how `verified=true` got set on wrong-endpoint rows.
5. Notion records under hub `3658298b80cf811d8adfe28be1afc455`: worklist page, verified-URLs page, this handoff.
