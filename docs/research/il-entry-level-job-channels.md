# IL entry-level job channels — where the 0–1y roles actually live

**Date:** 2026-06-04 (corpus + channel map); **2026-06-05 spike addendum** below.
**Status:** Research only — no pipeline changes, no PR. Stop for review before any adapter / partnership work.

**Scope:** Map where genuine entry-level (0–1 yr exp) jobs in Israel actually sit, beyond what our current ATS-direct corpus reaches, and rank channels by entry-level yield per effort-to-access.

**Caveat on Part 2 (original):** The research agent for the web half had **no live web access** (it ran from training data). Part 2 entries for Recruitee / Workable / Personio / Teamtailor were corrected by the live spike documented in Part 4 — refer there for verified findings. Part 1 is live-DB-grounded and not affected.

---

## Part 1 — The gap, grounded in our data

### Corpus shape today

| Metric | Value |
|---|---|
| Active IL jobs in `public.jobs` | **2,982** |
| Distinct companies actually returning postings | **286** |
| Distinct companies in registry (`companies_il.json`) | **832** |
| Registry-to-active ratio | 34% — most registry slugs are dormant or unsupported |
| ATS sources implemented | 8 (Greenhouse, Comeet, Workday, SuccessFactors, Ashby, Lever, Workable, SmartRecruiters) |

### Entry-level reality check — the working thesis is confirmed

Of 2,982 active IL postings, only **341 (11.4%) are tagged `seniority='entry'`** — and of those:

| Slice | Count | % of "entry" |
|---|---|---|
| `req_years_min ≤ 1` (truly fresh-grad-accessible) | **76** | **22%** |
| `req_years_min ≥ 2` (entry-tier but wants experience) | **209** | 61% |
| `req_years_min = 0` (the literal "0 yrs OK") | **5** | 1.5% |
| No `req_years_min` data | 56 | 16% |

**76 truly 0–1y postings across the entire active IL corpus.** That's 2.5% of total. Average `req_years_min` on entry-tagged postings is **2.2 yrs** — confirming the thesis that "entry" in our corpus means "junior tier within field", not "fresh grad."

### Per-ATS breakdown — every direct-ATS source skews experienced

| ATS source | Total | Entry-tagged | % entry | Avg req_yrs_min |
|---|---|---|---|---|
| comeet | 1,154 | 144 | 12.5% | **4.6** |
| greenhouse | 927 | 102 | 11.0% | **4.9** |
| workday | 453 | 65 | 14.3% | **5.2** |
| successfactors | 260 | 20 | 7.7% | 4.1 |
| ashby | 103 | 9 | 8.7% | 5.3 |
| lever | 70 | 1 | 1.4% | **10.0** |
| workable | 9 | 0 | 0% | 5.1 |
| smartrecruiters | 6 | 0 | 0% | — |

Every direct-ATS channel skews to 4–5+ years average required, regardless of which ATS. **The skew is the channel itself, not the specific platform.** Direct-ATS scraping reaches companies large enough to have an enterprise ATS contract, which biases hard toward experienced hires.

### Per-function gap — where coverage is thinnest

Functions ranked by truly-0–1y postings count (the meaningful denominator):

| Family | Active | Entry | True 0–1y | Notes |
|---|---|---|---|---|
| Engineering | 1,315 | 112 (8.5%) | **24** | Largest family but still only ~2% truly junior |
| Consulting | 158 | 23 (14.6%) | **8** | Surprisingly strong — entry-level pipeline exists |
| Sales | 133 | 13 (9.8%) | 8 | BDR/SDR roles visible |
| Finance | 144 | 24 (16.7%) | 6 | Bookkeeper/Analyst entry path |
| IT_Security | 84 | 13 (15.5%) | 6 | Helpdesk + Junior SOC |
| Operations | 131 | 28 (21.4%) | 4 | High entry% but low true-0y |
| Marketing | 103 | 28 (27.2%) | 4 | Coordinators/Interns mostly |
| Support | 125 | 31 (24.8%) | 4 | |
| Admin_GA | 26 | 4 (15.4%) | 3 | |
| Product | 169 | 8 (4.7%) | **2** | Thin |
| **Data** | **134** | **9 (6.7%)** | **0** | **Zero true-0y Data postings** |
| **AI_ML** | **63** | **4 (6.3%)** | **0** | Zero true-0y |
| **Design_UX** | **59** | **8 (13.6%)** | **0** | Zero true-0y |
| **Customer_Experience** | 74 | 7 (9.5%) | 1 | |
| **Solutions_Engineering** | 21 | 1 (4.8%) | 1 | |
| **HR_People** | 57 | 7 (12.3%) | 1 | |
| Onboarding_Implementation | 18 | 3 (16.7%) | 1 | |

**The structural-gap audit from yesterday is empirically confirmed:** Data, AI/ML, Design_UX, Customer_Experience, Solutions_Engineering all have 0–1 truly-fresh-grad postings across the entire ATS-direct corpus. Engineering has 24 but on a 1,315-job base that's still 1.8%.

### Sector composition of the registry

From `companies_il.json` (832 companies, top sectors):

| Industry | Companies | Bias |
|---|---|---|
| Cybersecurity | 117 | Senior-skewed (clearance, experience-heavy) |
| B2B SaaS | 37 | Mid-senior |
| FinTech | 36 | Mid-senior |
| DevTools | 34 | Senior |
| AI/ML | 28 | Senior |
| HR Tech | 20 | Mid |
| InsurTech | 18 | Mid |
| MarTech | 15 | Mid (more entry potential) |

**260 companies (31%) have `ats: "unknown"`** — discoverable in principle but no adapter for them. **32 are `ats: "custom"`** (own-built careers pages — would each need a one-off adapter). Even within ATSs we support, only 286 of 600+ supported-ATS companies actually return live postings (slug rot + corporate moves).

### Bottom line — what Part 1 establishes

The thin-entry problem is **not a per-ATS bug**. It's a **channel-selection bias**: direct ATS scraping reaches companies that pay for an enterprise ATS, which biases to mid+ hiring. The genuinely-junior IL market (76 postings — fresh grads, sales/BDR floors, bootcamp graduates, university programs) is reached **incidentally** through these ATSs, not deliberately. To meaningfully serve early_career users, we need channels that **target entry-level by construction**, not just by lucky overlap with our ATS-direct sources.

---

## Part 2 — IL entry-level channel map

> **Source caveat:** The web research agent ran without live web access; the entries below are training-data-derived. Confirm pricing, API existence, and current ToS before building anything.

### 2.1 IL job boards

| Channel | Est. entry volume | Accessibility | Cost / ToS | Model fit |
|---|---|---|---|---|
| **AllJobs** (alljobs.co.il) | 800–1,500 entry-tech active (largest IL board) | No public API. SPA, Cloudflare-protected, anti-bot. ATS-anonymized when re-syndicated (per our own `SESSION_14_SUMMARY:124`) | Free browse, **ToS prohibits scraping; enforcement is real** | Partnership-only |
| **Drushim** (drushim.co.il) | 400–800 entry-tech active. Strong on grad/student programs | No public API. Server-side rendered (scrapable but ToS-prohibited) | Free browse, scraping prohibited. Owned by Yedioth group | Partnership / licensed feed only |
| **JobMaster** (jobmaster.co.il) | 50–200 entry-tech — small, weak tech focus | No API. Scrapable HTML, ToS-prohibited | Free browse, paid employer | Aggregator-only, low priority |
| **Indeed Israel** | 2,000–5,000 entry-filtered IL but ~30–50% are re-scrapes of LinkedIn/Drushim/Greenhouse | **Publisher API closed to new applicants since 2023.** Active anti-scrape (CAPTCHA + IP throttle) | Free browse, scraping enforced | Aggregator (inaccessible without partnership) |
| **Glassdoor IL** | <200 unique entry not already on Indeed | Partner API closed since ~2021 | Free browse, scraping prohibited | Aggregator, inaccessible. **Skip.** |
| **LinkedIn Jobs (IL)** | **3,000–6,000 entry-tagged IL postings — likely the single largest junior pool** | **No usable public API.** Talent Solutions / Recruiter is employer-side only ($$$). JSON-LD on page but LinkedIn aggressively litigates scrapers | Scraping is a known ToS violation with active enforcement. **Do not build.** | Inaccessible; legal risk |

### 2.2 Google for Jobs

Google for Jobs indexes JobPosting JSON-LD from across the web. No public read API. Third-party result-scraper APIs (SerpAPI) exist (~$50–250/mo) but are Google-ToS-grey. **Inverse use case is the real play:** ensure our own listings have JSON-LD so we surface in GfJ; reading from GfJ programmatically is not viable.

### 2.3 ATS platforms we don't yet support

**See Part 4 for the live spike that corrects the agent's training-data estimates below.** Net of the spike: Recruitee and Personio both have near-zero verifiable IL presence; Teamtailor is not fit for our fetch-the-registry model (per-employer opt-in); Workable is already adapted but our registry slugs return ~0 IL output. Original estimates retained here for transparency:

| Platform | Est. IL coverage (training data, unverified) | Accessibility | Cost | Model fit |
|---|---|---|---|---|
| **Recruitee** | Agent estimate: 30–80 IL companies. **Spike: near-zero verifiable IL presence** (Part 4). | Public per-company JSON: `https://{slug}.recruitee.com/api/offers/` | Free, public | Adapter would be cheap to build but yields ~0 IL postings. **Skip.** |
| **Teamtailor** | Agent estimate: 20–50 IL companies | Public per-tenant JSON exists BUT requires per-employer API key / opt-in XML — does NOT fit fetch-the-registry model | — | **Does not fit our model. Skip.** |
| **BambooHR** | <30 IL companies, 50–150 postings | Careers page + JSON-LD. No sanctioned listings API for non-customers | Grey-area scrape | ATS-direct via JSON-LD scrape. Low priority — low IL volume |
| **Personio** | Agent estimate: <20 IL companies. **Spike: zero verified IL slugs** (Part 4). | Public XML feed at `https://{slug}.jobs.personio.de/xml` | Free, public | DACH-focused, near-zero IL signal. **Skip.** |
| **JazzHR** | Near-zero IL footprint | — | — | Skip |
| **Workable** | Already adapted; 6 IL slugs in registry. **Spike: 5 of 6 empty, 1 (Autofleet) returns 9 senior/mid jobs with no location field exposed.** (Part 4) | Public widget API at `https://apply.workable.com/api/v1/widget/accounts/{slug}` | Free, public | Already shipped. **Low IL yield even when present; not expanding.** |

### 2.4 University career portals

| University | Est. entry/month | Accessibility | Model fit |
|---|---|---|---|
| **Reichman / IDC** | 20–60 entry roles posted to alumni portal monthly, many exclusive | Login-gated; no public feed | **Partnership only. Aligns with Aug–Nov 2026 pilot context — already our ICP.** |
| Technion / TAU / BGU / Hebrew U | 50–200 entry/month each, but heavy overlap with broader IL market | All login-gated, no feeds | Partnership only |

### 2.5 Government — Sherut HaTaasuka

| | |
|---|---|
| Est. entry volume | <100 tech-adjacent; majority non-tech (retail/hospitality/healthcare) |
| Accessibility | **Likely on data.gov.il (CKAN)** per training data — needs current-dataset verification. CKAN serves CSV/JSON via standard API |
| Cost / ToS | Free, government open data, sanctioned for redistribution |
| Model fit | Aggregator-style. **Worth a probe** — even modest tech yield with clean structured data is valuable for non-tech-background candidates |

### 2.6 Bootcamp / program placements

**ITC, Elevation, Tech-Career.org, ETGAR** — all run cohort placement via internal Slack + alumni networks. **No public boards.** Volume per program: ~150–250 placements/year, near-100% junior. **Partnership-only; high entry quality.** Worth a 1:1 outreach pass.

### 2.7 IDF tech-unit alumni networks (8200 / Mamram / Talpiot)

Closed groups (LinkedIn / Facebook / alumni Slack). **Membership-gated, no data path. Skip** as a build target.

### 2.8 Community channels

| Channel | Est. entry volume | Accessibility |
|---|---|---|
| Facebook tech-jobs groups | Dozens/day, heavily junior | **Meta Graph API disallows reading public group content** since 2018. Scraping = ToS + bans. **Inaccessible.** |
| Telegram tech-job channels | 100–300 entry-level postings/week across larger channels | **Telegram MTProto + Bot API both viable IF channel admins partner.** Some channels are scrapable; many are curated and won't auto-admit bots |
| WhatsApp | Closed; no API | Skip |
| **Secret Tel Aviv jobs** | 20–80 entry/month (anglo / olim skew) | Web board, HTML-scrapable, no explicit ToS prohibition. Low-cost adapter possible |
| **Startup Nation Central jobs** | ~50–200 active, ~15–30% entry | No documented API; JSON-LD likely on listing pages. **SNC is partnership-friendly** (their mission is supporting IL startup ecosystem) |
| GeekTime jobs | <100 active, similar mix | Scrapable; low priority |

### 2.9 Staffing / placement agencies

**Ethosia, SQLink, Nisha, Cyber Career, GotFriends, Tech Career Solutions:** each has public job listings, 50–500 postings/agency. **Entry-level slice is small (~10–20%)** — agencies skew mid/senior because placement fees scale with seniority. No APIs; each needs its own scraper. High per-agency build cost for moderate yield. Lower priority than ATS gaps.

---

## Part 3 — Ranked recommendation

Effort × yield × ToS-safety, optimized for entry-level yield in our pilot timeframe (Aug–Nov 2026):

### Tier 1 — high yield, low effort, ToS-clean (build first)

> Re-ranked after the 2026-06-05 live spike. Recruitee and Teamtailor have been dropped; Workable is already shipped and not expanding.

1. **Comeet discovery push (no-code)** — Already our best ATS for entry-yield (1,154 active jobs, 12.5% entry, avg req 4.6yrs). Bottleneck is registry coverage: 200 Comeet rows out of **292 candidate companies** (260 `ats: "unknown"` + 32 `ats: "custom"`) that have no adapter wired today. A discovery pass — probe each candidate against Comeet's `https://www.comeet.com/jobs/{slug}/{token}` URL pattern, and check careers-page HTML for `comeet.com` embeds — would likely surface dozens more IL companies on the channel that already has our highest entry-yield. **Cost: ~2 days of discovery + registry edits, zero adapter code.** Highest entry-roles-per-effort by a wide margin.

### Tier 2 — relational / partnership (pilot-relevant)

4. **Reichman career-services partnership** — Aligns directly with the Aug-Nov 2026 cohort. 20-60 exclusive entry postings per month, the highest-quality available because they're vetted and already targeted at the same student profile. Effort is relational not technical; ask is a feed + ToS for student-facing redistribution. Should be on the pilot deliverable list, not a Phase-2 item.

5. **Startup Nation Central** — Partnership-friendly mission. ~50–200 listings of which 15–30% entry. Either a feed agreement (ideal) or JSON-LD scrape with ToS clearance. Effort: relational, low.

6. **Bootcamp placement partnerships (ITC + Elevation + Tech-Career.org)** — 150–250 placements/year each, ~100% junior. No technical integration, just a posting partnership. Pure relational. High signal, modest volume.

### Tier 3 — probe-then-decide

7. **Sherut HaTaasuka via data.gov.il** — Verify dataset exists + current. Even at <100 tech roles, the ToS-clean, structured-feed path is worth one half-day probe.

8. **Secret Tel Aviv jobs board** — 20–80 entry/month. Low-cost adapter (~half day). Worth doing once Tier 1 is shipped.

9. **Telegram channels (curated partnerships)** — 100–300/week IF a 2–3 channel admins agree to a feed. Pure relational. Worth one outreach round.

### Tier X — do NOT build (skip explicitly)

- **Recruitee adapter** — Live spike (Part 4) showed near-zero verifiable IL presence on Recruitee. Adapter would cost ~1 day and likely return 0 IL jobs. **Skip.**
- **Teamtailor adapter** — Public per-tenant JSON exists, but ingestion requires per-employer API key or opt-in XML — does NOT fit our `fetch-the-registry` model. **Skip.**
- **Personio adapter** — DACH-focused; live spike (Part 4) returned zero verified IL slugs. **Skip.**
- **Workable adapter expansion** — Already shipped. 5 of 6 IL registry slugs are empty; the one with jobs (Autofleet, 9 postings) skews senior. No expansion warranted.
- **LinkedIn Jobs** — active legal enforcement, ToS violation. Inverse play: post our jobs to LinkedIn, don't read.
- **Indeed / Glassdoor IL** — closed APIs, active anti-scrape.
- **AllJobs / Drushim / JobMaster** — ToS prohibition + Cloudflare. Partnership-only or skip.
- **Facebook groups** — Graph API forbids reading group content. ToS violation.
- **IDF alumni networks (8200/Mamram/Talpiot)** — membership-gated, no data path.

### Cost envelope

Tier 1 (build 3 adapters + slug discovery) fits comfortably in the current ~$41–56/mo envelope — all three sources are free public endpoints, just adapter dev time. Sherut HaTaasuka is free. The only paid candidates would be a Telegram aggregator (no per-channel cost; only operational time) or an Indeed/SerpAPI fallback (rejected above).

### Honest gaps

Items the web research agent flagged it could not verify without live web access:
- Current state of `data.gov.il` employment dataset (exists historically; needs current-version check)
- Current pricing for Jooble, SerpAPI, Indeed Publisher tier
- Whether Comeet has new slug-discovery tooling since v1 deferral
- Live entry-level counts on any board (all monthly figures above are training-data-grounded estimates)

Re-validate any specific URL/API claim before adapter work begins. The corpus-grounded findings in Part 1 are live DB and don't need re-verification.

---

---

## Part 4 — Live SMB-ATS spike (2026-06-05)

**Purpose:** Test whether Recruitee / Workable / Personio actually yield entry-level IL roles before we build adapters. Throwaway probes only, no production wiring.

**Method:** Hit each ATS's public no-auth feed for plausible IL slugs — registry rows tagged for that ATS, plus a hand-curated set of well-known IL company slugs (monday, wix, fiverr, lemonade, jfrog, payoneer, riskified). Inspect payloads for IL location signals and seniority.

### 4.1 Per-ATS verdict table

| ATS | Registry IL rows | Spike findings | Sampled true-entry % | Verdict |
|---|---|---|---|---|
| **Recruitee** | **1** (Helios — but probe revealed it's Amsterdam-based, 1 marketing job, 4 yrs req) | All 4 well-known IL slugs probed (`monday`, `wix`, `fiverr`, `lemonade`) returned **0 offers**. No verified IL presence anywhere on Recruitee. | n/a (no jobs) | **SKIP** — insufficient IL presence |
| **Workable** | 6 (83North, Autofleet, Comunix, Incredibuild, Powtoon, YouLeap; Vayyar tested via web hint) | 5 of 6 IL slugs returned empty feeds (or non-IL — Powtoon's earlier larger pull was all London). Autofleet alone returned **9 jobs, all senior/mid** (Group Lead, Head of CS, Incident Mgmt Analyst, PM, QA Automation Lead, R&D PM, Senior Data Engineer, Senior Full Stack, UX/UI Designer). The widget API does NOT expose city/country fields, so even those 9 aren't location-verifiable from the feed alone. | **0%** observed (no entry/junior titles in any returned IL job) | **LOW YIELD** — already shipped; do not invest in expansion |
| **Personio** | 0 | Tried 7 well-known IL slugs (`monday`, `wix`, `fiverr`, `lemonade`, `jfrog`, `payoneer`, `riskified`). Only `monday.jobs.personio.de` returned content — and it's **the Spanish co-working chain "Monday Coworking"** (offices in Diagonal/Chamberí/Tibidabo — Barcelona/Madrid), NOT monday.com. Slug collision. Confirms DACH/Iberia focus. | n/a (no IL jobs) | **SKIP** — near-zero IL presence |
| **Teamtailor** | 1 | Not probed: per user's verified facts, Teamtailor does NOT expose a fetch-the-registry public feed. Each employer must opt in with an API key / XML feed. **Does not fit our model.** | n/a | **SKIP** — wrong model |

### 4.2 Comeet discovery headroom

| Registry slice | Count |
|---|---|
| Companies already tagged `ats: "comeet"` | **200** |
| Companies tagged `ats: "unknown"` (no adapter wired) | **260** |
| Companies tagged `ats: "custom"` (own careers page) | **32** |
| **Candidate companies for Comeet discovery pass** | **292** |

Even if only ~10–15% of those 292 candidates turn out to be on Comeet (matching the rough split we already see in the registry where ~24% of identified-ATS rows are Comeet), that's **~30–45 net-new Comeet companies** added to the channel that already delivers our highest entry-yield (12.5%, 1,154 active jobs, avg req 4.6 yrs). Plausible add: **+100–300 active jobs, ~12–25 truly-entry postings/month**.

### 4.3 Ranked recommendation (entry-roles-per-effort)

| Rank | Lever | Cost | Expected entry yield | Notes |
|---|---|---|---|---|
| **1** | **Comeet no-code discovery push** (probe 292 candidates against `comeet.com/jobs/{slug}` + scan careers pages for Comeet embeds, then update registry) | ~2 days | **+12–25 true-entry IL postings/month** + a much larger mid-tail | Zero adapter code. Leverages our best ATS. No new ToS surface area. |
| 2 | **Reichman career-services partnership** | Relational (no code) | 20–60 vetted entry/month, exclusive | Already-aligned with pilot ICP. Should be a pilot deliverable. |
| 3 | **Sherut HaTaasuka via data.gov.il probe** | Half-day | <100 tech-adjacent, but clean structured feed; high signal for non-tech-background candidates | Worth a probe before any further adapter work. |
| 4 | **SNC + bootcamp partnership outreach** | Relational | +50–250 listings, partly entry | Slower path but high-quality entry tail. |
| — | Recruitee adapter | ~1 day | **~0** (spike) | Skip. |
| — | Personio adapter | ~1 day | **~0** (spike) | Skip. |
| — | Workable adapter expansion | ~1 day | **~0** entry (already shipped, low yield) | Skip. |
| — | Teamtailor adapter | ~1 day | n/a — model mismatch | Skip. |

### 4.4 Why the SMB-ATS adapter thesis failed

Three independent confirmations from the spike:

1. **Registry signal is empirical, not coincidental.** Our 832-company registry has 1 Recruitee row and 1 Teamtailor row out of 832 because IL tech employers don't use those ATSs. The training-data agent over-estimated by ~30×.
2. **Personio's "DACH-focused" caveat in the agent's own notes turned out to be the entire story.** The slug-collision finding (`monday.jobs.personio.de` = Barcelona co-working chain) reinforces that the IL signal is zero, not "<20".
3. **Even when an SMB ATS does host an IL company (Autofleet on Workable), the postings skew senior/mid.** Same channel-selection bias as the main corpus — small companies with cheap modern ATSs still hire engineers with 3+ years, not fresh grads.

**Implication:** the entry-level gap is structural, not addressable by adding more direct-ATS adapters. The genuinely-junior IL market reaches us only through (a) channels that target entry by construction (university career services, bootcamp placements, government programs) and (b) ATSs we already have where Comeet is the standout — its 12.5% entry-rate is the lever, not the platform diversity.

---

## Suggested next step

If you want this as a PR rather than a desk doc, I can wrap it on `eli/research-il-entry-channels` — but my read is it's reference material, not code, and a desk doc in `docs/research/` is the right home. Same place as `linkedin-post-performance.md`.

Concrete decisions awaiting your call:
1. Greenlight the **Comeet no-code discovery push** (probe 292 candidates, update registry) as the next sprint? This is the spike's #1 recommendation.
2. Add **Reichman career-services + SNC partnership outreach** to the pilot deliverable list?
3. Want me to do a quick **Sherut HaTaasuka / data.gov.il probe** to confirm the dataset exists before committing it to Tier 3?

Stopping here — no pipeline changes, no code touched.
