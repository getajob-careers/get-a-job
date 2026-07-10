---
title: Careers-page hunt list (comprehensive, manual browser session)
status: working
owner: eli
generated_from: docs/sourcing/browser-agent-queue.md + comeet-harvest-ledger.md + companies_il.json (registry snapshot)
---

# Careers-page hunt list

One place to hunt from. Technique + ATS request patterns are in `docs/sourcing/browser-agent-queue.md` (Comeet needs uid **and** token; other ATSs need only a board slug). **No registry changes** were made building this - it is a read-only synthesis.

**Priority order:** (1) tracker gaps - real user demand, (2) in-registry-but-yielding-zero - sunk work, highest ROI to revive, (3) net-new research leads. A do-not-hunt section at the end lists everything already rejected for a reason so you don't re-walk it.

Counts: **13** tracker gaps, **4** credential recaptures, **63** in-registry revives (**23** of them need only a Comeet token capture), **90** net-new, plus a **195**-row low-yield / do-not-hunt tail.

---

## RESOLUTION — manual hunt (2026-07-10)

Eli hand-hunted this list; captures re-verified from the terminal against the live board API. Full detail in `comeet-harvest-ledger.md` (Manual hunt section).

- **ADDED to registry (verified >=1 IL):** Insait (comeet 0B.00C, 4 IL), droxi (comeet 1A.001, 4 IL), Spacial (ashby, 1 IL), Orion Security (greenhouse, 2 IL).
- **SKIPPED (Eli decision):** Browsi (comeet F3.00B, 6 IL) - shared "recruitingteam" umbrella board; attribution risk. Revisit only with company-filtered fetching.
- **FAILED (ledgered):** LawGeex (comeet 73.003 token → HTTP 400, still dead).
- **Already live, not a gap:** Abra R&D (15.007) + Abra IT (12.003) both already wired.
- **Verified live but 0 IL - all ledgered, none seeded (Eli decision):** spot-checks showed none of the 19 has any Israel presence (US-fronted boards, same-name different companies, or empty), so none qualify as IL-contributing seeds. Heven confirmed a US entity (Virginia/Washington), NOT a classifier miss. Full list in the ledger.
- **Unsupported ATS (adapter needed):** Dazn (Pinpoint), Varonis (Jobvite), Wenrix (Rippling), INNOVA (cruitie), Voltify (Breezy), Wallarm (Recruitee) + the 2E set.
- **No board / apply-elsewhere:** Kovrr, Findings, Terminal X, Factory 54, HiO, origami.ms, Sightful (dead), TytoCare (switched ATS).
- **Still need a token capture (uid known):** the comeet hosted-board URLs (Nominal, CardinalOps, Sunbit, Dazz, Tevel, Camtek, Nova, Lili, OneLayer, Act Security, Daylight, Moonshot, Airis Labs, + the 2A UID set) — browser capture still required.

---

## Priority 1 - Tracker gaps (real user demand; do these first)

Companies users actively track in-app that our registry is missing. Insait is first (tracked 3x by one user). All JS-gated - a real browser should surface the ATS.

| company    | careers URL                             | status                         | what we need               | caveat                                                                                                    |
| ---------- | --------------------------------------- | ------------------------------ | -------------------------- | --------------------------------------------------------------------------------------------------------- |
| Insait     | https://www.insait.io/careers           | never-added                    | ATS + board id             | curl 403 (bot-blocked); a real browser should pass                                                        |
| Varonis    | https://www.varonis.com/company/careers | in-registry, unknown-ATS       | ATS support (uses Jobvite) | Jobvite (jobs.jobvite.com/varonis-internal) - NOT a supported ATS; needs fetcher support, not just a slug |
| Kovrr      | https://www.kovrr.com/careers           | in-registry, inert unknown row | ATS + board id             | registry has an inert `unknown` row                                                                       |
| Findings   | https://www.findings.co/careers         | never-added                    | ATS + board id             | -                                                                                                         |
| Terminal X | https://www.terminalx.com/careers       | never-added                    | ATS + board id             | Israeli e-commerce (Factory 54 group)                                                                     |
| Factory 54 | https://www.factory54.co.il/careers     | never-added                    | ATS + board id             | Israeli luxury retail                                                                                     |
| Dazn       | https://careers.dazn.com                | never-added                    | ATS + board id             | multinational; find the Israel-office board                                                               |
| droxi      | https://www.droxi.ai/careers            | never-added                    | Comeet uid + token         | page links comeet.com/jobs/droxiai but that hosted board 404s - find the real uid+token via Network       |
| Abra       | abra-it.com / abra.co.il (confirm)      | never-added                    | ATS + domain               | Israeli IT-services 'Abra'; confirm which domain                                                          |
| HiO        | domain TBD                              | never-added                    | ATS + domain               | confirm which company                                                                                     |
| INNOVA     | domain TBD                              | never-added                    | ATS + domain               | confirm which company                                                                                     |
| origami.ms | https://origami.ms/careers              | never-added                    | ATS + board id             | -                                                                                                         |
| Wenrix     | https://www.wenrix.com/careers          | never-added                    | ATS + board id             | -                                                                                                         |

_Not queued (no supported ATS): HiBob runs its own product as its ATS; Tasc is a consultancy._

## Priority 1b - Credential recaptures (known board, credential lost)

| company  | uid     | status                         | what we need           | caveat                                                                |
| -------- | ------- | ------------------------------ | ---------------------- | --------------------------------------------------------------------- |
| Browsi   | F3.00B  | token-expired                  | Comeet token recapture | had 3 live IL at last capture; token now HTTP 400                     |
| Sightful | 26.00D  | token never captured           | Comeet token capture   | POST-LAYOFF - reverify current IL openings before counting it         |
| LawGeex  | unknown | in-registry-but-dead (revisit) | Comeet uid + token     | uid/token JS-injected via comeetapi.com; needs a JS-render pass       |
| TytoCare | unknown | in-registry-but-dead (revisit) | full ATS re-discovery  | careers page no longer exposes Comeet markers - may have switched ATS |

---

## Priority 2 - In-registry but yielding zero (sunk work; highest ROI to revive)

### 2A - Comeet UID already known, need only a TOKEN [23] ** the goldmine **

Each row is in the registry as `unknown` ATS but we already captured its Comeet UID during a prior harvest - the **only** missing piece is the token (a ~30-second browser Network capture off the careers page). Reviving these is pure upside. **Status for all:** in-registry, unknown-ATS, Comeet uid known. **Need for all:** Comeet token (paste the full `careers-api` request URL). Verify live before counting (some may be 0-IL today).

| company          | careers URL                                 | comeet uid |
| ---------------- | ------------------------------------------- | ---------- |
| AnyClip          | https://anyclip.com/careers/                | 91.00D     |
| Autotalks        | no domain                                   | 03.009     |
| Bidalgo          | https://bidalgo.com/careers/                | 22.006     |
| Bionic Security  | no domain                                   | F5.008     |
| Centrical        | https://centrical.com/careers/              | C1.00A     |
| Cyabra           | no domain                                   | 29.006     |
| Cyberbit         | https://www.cyberbit.com/careers/           | C3.00E     |
| Cynerio          | no domain                                   | 16.00E     |
| CYREBRO          | no domain                                   | A7.003     |
| Deep Instinct    | https://www.deepinstinct.com/careers        | 72.00A     |
| env0             | https://www.env0.com/careers/               | B6.005     |
| Future Meat      | https://futuremeattechnologies.com/careers/ | B7.00A     |
| Glassbox         | https://www.glassbox.com/careers/           | 53.00C     |
| HiredScore       | no domain                                   | 24.000     |
| Karamba Security | https://www.karambasecurity.com/careers/    | D7.00D     |
| Lightico         | no domain                                   | 94.00D     |
| Lumigo           | https://lumigo.io/careers/                  | 04.001     |
| Namogoo          | https://www.namogoo.com/careers/            | B4.006     |
| Otorio           | https://www.otorio.com/careers/             | E3.003     |
| Pliops           | no domain                                   | 05.004     |
| SciPlay          | no domain                                   | D5.00A     |
| Sorbet           | no domain                                   | 17.002     |
| Syte             | https://www.syte.ai/careers/                | 74.002     |

### 2B - Comeet UID known but company ACQUIRED (board may be dead; verify it's live first) [7]

| company         | comeet uid | caveat                                                                                  |
| --------------- | ---------- | --------------------------------------------------------------------------------------- |
| CyberInt        | 83.006     | Comeet UID 83.006; token not extractable. (Now part of Check Point)                     |
| Guardicore      | F2.008     | Comeet UID F2.008 found (acquired by Akamai); token not extracted                       |
| Noname Security | 86.001     | Comeet UID 86.001 found; token not extracted (acquired by Akamai 2024)                  |
| Perimeter 81    | 64.00C     | Comeet UID 64.00C (slug 'p81') found; token not extracted; acquired by Check Point 2023 |
| Qwak            | 99.005     | Comeet UID 99.005 found; token not extracted (acquired by JFrog 2024)                   |
| SCADAfence      | 43.00E     | Comeet UID 43.00E found; token not extracted (acquired by Honeywell 2023)               |
| Vulcan Cyber    | 94.00E     | Comeet UID 94.00E found; token not extracted (acquired by Tenable 2024)                 |

### 2C - Other board slug found but API 404 / unwired (verify the board id/path) [16]

| company              | careers URL                                | what we need               | caveat                                                                                |
| -------------------- | ------------------------------------------ | -------------------------- | ------------------------------------------------------------------------------------- |
| 3D Signals           | no domain                                  | verify board id / API path | Static fetch yielded no ATS markers; no greenhouse/lever/ashby/smartrecruiters slug f |
| Addionics            | https://addionics.com/careers/             | verify board id / API path | Greenhouse EU board exists (job-boards.eu.greenhouse.io/addionics) — JSON API endpoin |
| Aleph VC             | https://www.aleph.vc/                      | verify board id / API path | $850M IL early-stage VC. Note: Lever slug 'aleph' is a DIFFERENT company (Aleph Group |
| Amdocs               | https://www.amdocs.com/about/careers       | verify board id / API path | RE-INVESTIGATED (was already unverified in registry). Uses proprietary 'PCS' (Persist |
| Apax Partners Israel | https://www.apax.com/careers/              | verify board id / API path | Apax has an IL office (Israel was Apax's first international office, 1995). Lever slu |
| Apono                | https://www.apono.io/careers               | verify board id / API path | Greenhouse board at boards.greenhouse.io/apono exists but boards-api.greenhouse.io/v1 |
| Dynamic Yield        | https://www.dynamicyield.com/careers/      | verify board id / API path | GH slug 'dynamicyield' exists but boards-api 404 — now part of Mastercard, careers ma |
| Elbit Systems        | https://elbitsystems.com/careers/          | verify board id / API path | Bot-protected (Cloudflare/Reblaze, returns 403 to anonymous curl). Known to use propr |
| Hi Auto              | https://hi.auto/careers/                   | verify board id / API path | GH embed slug 'hiauto' shown in search; boards-api returns 404 (board may be hidden)  |
| Jetty                | no domain                                  | verify board id / API path | GH slug 'jetty' shown in search but boards-api 404 — board may be closed              |
| Jones                | no domain                                  | verify board id / API path | Lever URL jobs.lever.co/getjones exists in search results but API endpoint returns 40 |
| MeMed                | https://www.me-med.com/careers/            | verify board id / API path | Custom WordPress form at me-med.com/careers/ (no public ATS endpoint, verified 2026-0 |
| Oosto                | https://oosto.com/careers/                 | verify board id / API path | Formerly AnyVision. Uses HiBob (oosto.careers.hibob.com/jobs) — not in supported ATS  |
| Plarium              | https://plarium.com/en/careers/            | verify board id / API path | GH EU board 'plariumgloballtd' exists; boards-api 404 — EU jobs API not publicly acce |
| Statement            | https://job-boards.greenhouse.io/statement | verify board id / API path | ACQUIRED by Tipalti (verified 2026-06-09 via LinkedIn). statement.io still up but job |
| Sweetch              | https://www.sweetch.com/join-our-team      | verify board id / API path | Tel Aviv-Yafo HQ, $30M raised, AI-driven CGM platform. Careers page exists but shows  |

### 2D - ATS detected + slug stored in registry but not wired to an api_url [7]

| company          | careers URL                          | stored                        | what we need            | caveat                                                       |
| ---------------- | ------------------------------------ | ----------------------------- | ----------------------- | ------------------------------------------------------------ |
| Blockaid         | https://www.blockaid.io/careers      | comeet slug='blockaid'        | comeet board id + token | Comeet markers detected in HTML (sweep); slug='blockaid'     |
| Ermetic          | https://ermetic.com/careers/         | greenhouse slug='None'        | greenhouse board id     | Detected greenhouse iframe slug 'tenableinc'. Nulled 2026-06 |
| Healthy.io       | https://healthy.io/careers/          | comeet slug='healthy'         | comeet board id + token | Comeet markers detected in HTML (sweep); slug='healthy'      | st  |
| Knostic          | https://knostic.ai/careers           | comeet slug='knostic'         | comeet board id + token | Comeet markers detected in HTML (sweep); slug='knostic'      |
| Prospera         | no domain                            | comeet slug='prospera/C5.00F' | comeet board id + token | Moved from Ashby to Comeet (verified 2026-06-09). API requir |
| Quantum Machines | https://quantum-machines.co/careers/ | comeet slug='quantummachines' | comeet board id + token | Comeet markers detected in HTML (sweep); slug='quantummachin |
| Team8            | https://www.team8.vc/careers         | comeet slug='61.003'          | comeet board id + token | Comeet UID 61.003 confirmed via comeet.com/jobs/team8/61.003 |

### 2E - Board found but on an UNSUPPORTED ATS (needs fetcher support, NOT a hunt) [10]

These have a discoverable board, but on a platform our fetcher can't ingest (Eightfold, iCIMS, Oracle HCM, SuccessFactors, Phenom, Jobvite, Avature/TalentBrew, HiBob). Hunting a slug won't help - they need a new fetcher adapter. Listed so they aren't re-hunted.

- **Applied Materials** - NEW. Uses Eightfold AI (app.eightfold.ai/careers?domain=appliedmaterials.com) — not one of our
- **ARM** - NEW. Uses iCIMS (earlycareers-arm.icims.com + experienced-arm.icims.com) — not one of our suppo
- **Fortinet** - NEW (extra). Fortinet uses Oracle HCM (edel.fa.us2.oraclecloud.com/hcmUI/CandidateExperience/en
- **HiBob** - Uses HiBob's own Careers product (careers.hibob.com white-label); proprietary
- **Netflix** - NEW. Netflix uses Eightfold AI (netflix.eightfold.ai/careers + explore.jobs.netflix.net) — not
- **Qualcomm** - NEW. Uses Eightfold AI (app.eightfold.ai/careers?domain=qualcomm.com) — not one of our supporte
- **SAP** - NEW. Uses SAP SuccessFactors (their own product) — career site rendered via SuccessFactors care
- **Siemens** - NEW. Siemens uses a proprietary jobs.siemens.com portal (likely Avature behind the scenes per i
- **Snowflake** - ALREADY IN REGISTRY but I re-investigated — uses Phenom People (cdn.phenompeople.com/CareerConn
- **Synopsys** - NEW (extra). Uses Avature + TalentBrew (proprietary). Synopsys IL R&D in Hod HaSharon (via Open

---

## Priority 3 - Net-new research leads (never ingested; deduped vs registry + ledger)

From the June-2026 VC-portfolio + CTech-funding batch (research-280). Static ATS detection failed on all (JS-gated) - open each careers page and capture the board. **Skip any showing 0 Israel roles unless clearly Israeli-founded with a live board.** Lower priority than P1/P2 (leads, not user demand).

### 3a - domain known (open the URL, identify ATS)

| company           | careers URL               |     | company          | careers URL                 |
| ----------------- | ------------------------- | --- | ---------------- | --------------------------- |
| Quantum Art       | quantum-art.com/careers   |     | Nominal          | nominal.io/careers          |
| AIR               | air.com/careers           |     | Teramount        | teramount.com/careers       |
| Sequence          | getsequence.io/careers    |     | Healthee         | healthee.co/careers         |
| Jiga              | jiga.io/careers           |     | Doti AI          | doti.ai/careers             |
| Voltify           | voltify.com/careers       |     | C8 Health        | c8health.com/careers        |
| Waltz             | getwaltz.com/careers      |     | Fabrix           | fabrix.ai/careers           |
| Duetti            | duetti.co/careers         |     | Lizo.ai          | lizo.ai/careers             |
| Quantum Source    | quantum-source.io/careers |     | Fundbox          | fundbox.com/careers         |
| CardinalOps       | cardinalops.com/careers   |     | Sunbit           | sunbit.com/careers          |
| Dazz              | dazz.io/careers           |     | Playstudios      | playstudios.com/careers     |
| Prompt Security   | prompt.security/careers   |     | StreamElements   | streamelements.com/careers  |
| RAAAM Memory Tech | raaam-tech.com/careers    |     | Odeeo            | odeeo.io/careers            |
| Heven AeroTech    | heven.io/careers          |     | Equinom          | equinom.com/careers         |
| Blast Security    | blast.security/careers    |     | Tevel Aerobotics | tevel-tech.com/careers      |
| AUI               | aui.io/careers            |     | Chunk Foods      | chunkfoods.com/careers      |
| TULU              | tulu.com/careers          |     | UltraSight       | ultrasight.com/careers      |
| OneLayer          | onelayer.com/careers      |     | Lili             | lili.co/careers             |
| Hud               | hud.io/careers            |     | Nova             | novaltd.com/careers         |
| Medida            | medida.ai/careers         |     | Camtek           | camtek.com/careers          |
| Prime Security    | prime.security/careers    |     | Riseup           | riseup.co.il/careers        |
| Safebooks         | safebooks.ai/careers      |     | Charm Security   | charmsecurity.com/careers   |
| Sympera AI        | sympera.ai/careers        |     | Brevel           | brevel.co/careers           |
| Orion Security    | orion.security/careers    |     | CaPow            | capow.tech/careers          |
| Aryon Security    | aryon.security/careers    |     | Omnix Medical    | omnix-medical.com/careers   |
| Rylo              | rylo.ai/careers           |     | ZutaCore         | zutacore.com/careers        |
| Rep AI            | hellorep.ai/careers       |     | Phytolon         | phytolon.com/careers        |
| Viewz             | viewz.com/careers         |     | NVision          | nvision-imaging.com/careers |

### 3b - domain unknown (find the domain first, then the ATS)

Act Security, Syremis Therapeutics, Rein Security, Opti, Mate, Milestone, Daylight, Malanta, Popai Health, Cassidy Bio, Dux, Lumia, Moonshot Space, LeanCon, Localbird, 257, QuamCore, Impala AI, Spacial, Wild Moose, CyberRidge, Corbel, Offroad, Shifters, Airis Labs, Tribal, Arito, NanoCo, Ocean, Novella, Frame, Copperhelm, Q-Factor, Cyata, Legion, Commcrete.

---

## Do NOT hunt - already resolved and rejected for a reason

From the Comeet harvest ledger. These failed on their own merits; do not re-investigate.

| company               | uid / board                    | reason                                                                                                                 |
| --------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| eteacher              | E2.002                         | 11 open positions, all non-IL (Argentina/Brazil/Morocco/etc.); 0 live IL. Hires elsewhere.                             |
| loox                  | 77.00E                         | 0 open positions on the board; no IL-hiring signal.                                                                    |
| Tapcheck              | ashby/tapcheck                 | US-HQ on-demand pay; ashby board is US-only, 0 of 9 IL. Revisit only if an IL board appears.                           |
| Atera                 | smartrecruiters/atera          | SR board 0 positions; live at Comeet 63.00B (already in registry).                                                     |
| Incredibuild          | workable/incredibuild          | Workable board 0; live at Comeet 66.00F (already in registry).                                                         |
| DoorLoop              | greenhouse/doorloopisrael      | Greenhouse 404 (dead); live at Comeet 0A.006 (already in registry).                                                    |
| Deloitte              | unknown/(no board)             | Unresolved stub; superseded by live Comeet F7.00B (94 IL).                                                             |
| Israel Discount Bank  | unknown/(no board)             | Unresolved stub; superseded by live Comeet F8.004 (66 IL).                                                             |
| ZIM                   | unknown/(no board)             | Unresolved stub; superseded by live Comeet 72.008.                                                                     |
| Oligo Security        | ashby/oligo                    | Ashby live (15 jobs) but 0 IL; Comeet 5A.00B carries the 7 IL roles. Revisit if IL appears on ashby.                   |
| Sentra                | ashby/sentra                   | Ashby live (3 jobs) but 0 IL; Comeet 87.00B carries the IL roles.                                                      |
| BeeHero               | 78.00E                         | 0 IL at capture + token dead. Revisit only on fresh token AND IL roles.                                                |
| Cynomi                | F9.00F                         | 0 IL at capture + token dead. Same posture as BeeHero.                                                                 |
| SparkBeyond           | 82.006                         | Broken embed: malformed 31-char token, API 400 across 3 sessions. Revisit only if SparkBeyond fixes the source.        |
| CodiumAI              | -> Qodo B8.00B                 | Duplicate: Codium rebranded to Qodo (same board).                                                                      |
| Foresight Autonomous  | -> Foresight Automotive 13.000 | Duplicate: one physical board.                                                                                         |
| Papaya                | -> Papaya Gaming 46.00B        | Duplicate: one physical board.                                                                                         |
| Kornit Digital (stub) | -> live 11.00F                 | Redundant slug=None stub; canonical row already live.                                                                  |
| Band                  | -                              | joinband.com exposes no Comeet markers; the '8A.003/thenvoi' label was a mislabel (that board is a different company). |

## Appendix - Unknown-ATS rows with NO board detected (low yield: 195)

Registry `unknown` rows where no ATS/board was found (mostly big corporates, banks, government, holding co's, law firms, and defunct/acquired startups with proprietary or no public careers API). Hunt one ONLY if a real user tracks it - most have no public board to find. Grouped for scanning; full note in the registry.

- 012 Smile - Partner Communications brand. Falls under Partner careers system. No s
- Above Security - No careers_url in seed; no ATS pattern found via search
- Adama Agricultural Solutions - ChemChina/Syngenta Group-owned. Cloudflare-protected (403 curl). Workd
- Aeronautics - Proprietary defense recruiter. No public API.
- Africa Israel Group - Proprietary. No public API.
- Africa Israel Investments - Distressed/restructured holding. Minimal hiring footprint. No supporte
- Air Doctor - Careers page hosted on air-dr.com; static fetch returned binary/image
- Alony Hetz Properties & Investments - Holding company with small headquarters team; no public ATS. Career pa
- Alta - No ATS hit (search confused with AltaML/Altana/Altera)
- Anchor Browser - Search confused with Anchor Fintech (different co); no ATS detected fo
- Anina Culinary Art - Rishon LeZion-based foodtech, $13M raised, ~12-18 employees. No career
- Annoto - No ATS detected via search
- Anodot - No ATS hit; careers page is JS SPA — likely Comeet or custom but could
- Anzu - Search confused with Anzu Partners (investment firm); anzu.io ATS not
- Aporia - No ATS found via search
- AposHealth - Israel + US/UK ops, FDA-cleared gait device for knee osteoarthritis. C
- Arkia - Proprietary. No public API.
- ARMO - Search confused with Armis Security (separate company); armosec.io ATS
- Arnon, Tadmor-Levy - Merger of Yigal Arnon and Tadmor Levy. Top-tier IL firm. No third-part
- Ashtrom Group - Proprietary. No public API.
- Azrieli Group - Azrieli.com landing page is e-commerce closure notice (2023). azrielig
- Bain & Company - Uses proprietary careers.bain.com portal; no third-party ATS in suppor
- Bain & Company Israel - RE-INVESTIGATED. Already unverified. Still proprietary careers.bain.co
- Band - Search confused with Bandwidth (different co); joinband.com ATS not fo
- Bank Hapoalim - Proprietary careers portal. Page returns 404 anonymously; references '
- Bank Leumi - Proprietary careers portal. Page returns 404 to anonymous curl; Israel
- Bank of Jerusalem - Proprietary careers portal. No public API.
- BCG (Boston Consulting Group) Israel - Uses Phenom People (cdn.phenompeople.com/CareerConnectResources/pp/BCG
- BDO Israel - BDO Israel — ~1600 employees, established 1983. Proprietary Hebrew car
- Bessemer Venture Partners — Israel - Bessemer has invested $1B+ in Israel over 10 years (Wix, Fiverr, Haban
- Big Shopping Centers - Retail real-estate REIT; small corporate team. No supported ATS.
- Bites - bitesapp.com ATS not found in search
- Bits of Gold - No ATS found via search; small Israeli crypto firm with likely custom
- BlueBird Aero Systems - Now Elbit subsidiary. Proprietary contact-form careers. No public API.
- Boston Consulting Group - Uses careers.bcg.com proprietary system — no third-party ATS
- Branch Money - branchapp.com — no ATS found in search; likely custom
- Bria AI - bria.ai — no ATS found via search
- Bringoz - No ATS found; search confused with Bringg (different co)
- Calcalist - Yedioth Group business newspaper. /careers blocked (403). Same parent
- Carmel Winery - Small public footprint, no dedicated careers system. Listings via Drus
- Castro - Proprietary. No public API.
- Cellcom Israel - Proprietary careers portal. No public API.
- ChickP Protein - Small foodtech startup; no public ATS found
- Clal Insurance - Angular-rendered Hebrew careers portal (proprietary Israeli HR system,
- Clalit Health Services - Largest Israeli HMO. Proprietary careers portal. No public API.
- Cloudshare - No ATS found via search
- Coca-Cola Israel (CBC) - Central Bottling Company. Proprietary Israeli careers portal — Coca-Co
- CodeMonkey - Small edtech; no public ATS found
- Cognata - No ATS found
- Cogniteam - Search confused with Cognite (different co); no ATS for Cogniteam
- Compete - compete.ai — no ATS found via search
- Copyleaks - No ATS found via search
- CyberArk - Post Palo Alto Networks acquisition; careers redirect to PAN Workday.
- Cylake - No ATS found
- D-ID - No ATS hit (search confused with ID.me/IDnow)
- Dan Bus Company - Cooperative. Proprietary. No public API.
- Deepchecks - No ATS hit
- Definity - No ATS hit; small AI startup
- Delek Group - Proprietary. No public API.
- Dell Technologies - NEW (extra). ALREADY IN REGISTRY as Dell Technologies. Workday tenant
- Dexcel Pharma - Uses proprietary careers.dexcel.com portal; no recognizable ATS signat
- Diagnostic Robotics - Already in registry (note: actual ATS appears to be Workable apply.wor
- DigitalOwl - No ATS hit
- Diplomat - Proprietary. No public API.
- Discount Investment Corporation - IDB Holding subsidiary. Not on supported ATSs. Hiring tends to flow th
- Doral Energy - Proprietary. No public API.
- ECI Telecom - Now part of Ribbon Communications; no ATS hit
- Egged - Cooperative. Proprietary. No public API.
- El Al - Proprietary Hebrew careers portal. No public API.
- Electra - Domain resolves but anonymous curl returns ECONNREFUSED. Proprietary.
- Entro Security - No ATS hit
- Equally AI - No ATS hit
- Eureka Security - No ATS hit
- EY (Ernst & Young) Israel - RE-INVESTIGATED. Already unverified. EY uses proprietary ey.jobs/ey.co
- Faddom - No ATS hit
- FIMI Opportunity Funds - Israel's largest PE fund ($7B+ AUM). Small in-house team; no public AT
- First International Bank of Israel (FIBI) - ASP.NET WebForms page (Career.aspx). Proprietary. No public API.
- Folloze - No ATS hit
- ForeScout - Large security firm — no obvious ATS in search; uses custom careers sy
- Fox Group - Proprietary careers portal. No public API.
- Frutarom / IFF Israel - Frutarom acquired by IFF (NYSE). IFF Global runs Workday — iff.wd1.myw
- GE Healthcare - NEW. jobs.gehealthcare.com is bot-blocked (ECONNREFUSED on programmati
- GeoX - No ATS hit
- Globes - Israel's business daily. Page returns 200 but no ATS signature. Small
- Golan Heights Winery - No dedicated careers system. No public API.
- Goldfarb Gross Seligman (CMS) - Top IL firm, now CMS member. No third-party ATS. BONUS.
- Goldman Sachs - Enterprise uses proprietary careers.goldmansachs.com — no supported AT
- Haat - No ATS hit
- Hazera Genetics - Limagrain subsidiary. Proprietary. No public API.
- Herzog Fox & Neeman - Israel's leading full-service law firm (300+ lawyers, Azrieli Center).
- HOT Mobile / HOT Telecom - Altice subsidiary. Proprietary careers portal. No public API.
- Hour One - No ATS hit
- Hudson Rock - No ATS hit
- IceCure Medical - Netanya-based cryoablation medical device co. Careers page exists with
- Iguazio - No ATS hit (acquired by McKinsey/QuantumBlack)
- Imagindairy - Israeli precision-fermentation foodtech, world-first 100k+ liter facil
- Insurights - No ATS hit (search confused with Insurify)
- Iscar - Berkshire Hathaway-owned (IMC Group). Proprietary ASP.NET jobs portal.
- Israel Electric Corporation (IEC) - Government-owned utility. Proprietary Hebrew careers portal — recruitm
- Israel Hayom - Free Hebrew daily owned by Adelson family. Proprietary careers page; n
- Israel Postal Company - Government-owned. Proprietary Hebrew careers portal. No public API.
- Israel Shipyards - Proprietary. No public API.
- Israir - Proprietary. No public API.
- Jit - No ATS hit (jit.io); confused with Jitter/Jito/Jitx
- JoyTunes - No ATS hit
- Juno Journey - No ATS hit
- Keter Plastic - Proprietary careers portal (404 anonymous curl). No public API.
- KovrrIns - No ATS hit
- Laminar - Search confused with Laminar Projects/H2Ok; acquired by Rubrik in 2023
- Legato - Search confused with Legato Security (different co)
- Leumit Health Fund - Proprietary. No public API.
- Lightbits Labs - No ATS hit
- Lightsolver - No ATS hit
- LinearB - Search confused with Linear (different co); LinearB itself no ATS hit
- Loginno - No ATS hit
- Maccabi Healthcare Services - Proprietary careers portal. No public API.
- Magic Software - Search confused with Magic (Web3 wallet); Magic Software Israel uses p
- Materialspace - No ATS hit
- McKinsey & Company - RE-INVESTIGATED. Already unverified in registry. Confirmed: McKinsey u
- Meitar Law Offices - Israel's largest law firm by headcount (350+ lawyers). Highly competit
- Mekorot - Government-owned national water utility. Proprietary Hebrew careers po
- Memcyco - No ATS hit
- Menora Mivtachim - Hebrew portal returns 200 but pure SPA — no ATS signature in HTML. Lar
- Mentessa - No ATS hit
- Meuhedet Health Fund - Proprietary. No public API.
- Migdal Insurance - Career page returns 404 to direct fetch — JS-rendered Hebrew portal. M
- Mizrahi Tefahot Bank - Proprietary careers portal. No public API.
- Naan Dan Jain - Jain Irrigation subsidiary. No dedicated careers ATS. No public API.
- Noga (Israel Independent System Operator) - Government-owned grid operator. Proprietary. No public API.
- NRGene - Ness Ziona, TASE-listed (NRGN). Careers page lists IL/Rehovot roles di
- OPC Energy - Proprietary. No public API.
- Open Legacy - No ATS hit
- Orbotech - Acquired by KLA in 2019 — careers now consolidated under kla.com. KLA
- Orbs - Search confused with Worldcoin Orb (different); orbs.com blockchain AT
- OrCam - No ATS hit
- Osem-Nestlé - Nestlé Israel arm — Nestlé Global runs Avature globally but Osem-Nestl
- Otonomo - No ATS hit (acquired by Urgently 2023)
- Overseas Commerce - Proprietary. No public API.
- Paz Oil - Proprietary Israeli HR system, likely Niloog. No public API.
- Pecan AI - No ATS hit
- PeopleOS - No ATS hit
- Perception Point - No ATS hit
- Permit.io - No ATS hit (search confused with PermitFlow)
- Phantom Technologies - Petah Tikva-based anti-drone / electronic warfare manufacturer. Career
- Phoenicia Glass Works - Proprietary. No public API.
- Phoenix Holdings - Custom Hebrew careers UI with department/role filters. CV submission v
- Pitango Venture Capital - Israel's largest VC fund. Tiny in-house team (~30); rarely hires publi
- Plasan - Proprietary. No public API.
- Plassim - Kibbutz industry. Proprietary or aggregator-listed only. No public API
- Pluri - Formerly Pluristem Therapeutics; Haifa-based (Matam Park). Public NASD
- Priority Software - No ATS hit; likely custom careers system
- Pyramid Analytics - No ATS hit
- Radware - No ATS hit; uses custom careers system
- Rafael Advanced Defense Systems - Bot-blocked (curl 247 timeout/RST). Defense contractor with clearance-
- Remilk - No ATS hit
- Reshet Media (Channel 13) - Page returns 200 but no ATS signature in HTML. Reshet 13 (commercial b
- Ridge Cloud - No ATS hit
- Run:ai - Acquired by NVIDIA 2024; no public ATS hit
- Sapiens - No ATS hit; uses sapiens.com/careers proprietary
- Sawmills - No ATS hit
- Sayata Labs - Only Team8-affiliated listing found; Sayata's own ATS not detected
- SeeMetrics - No ATS hit
- Shikun & Binui - Proprietary careers portal. No public API.
- Shufersal - Proprietary careers portal (404 unauthenticated). Israel's largest ret
- Solid - Only Team8-affiliated listing found
- Sonol - Proprietary. No public API.
- StoreDot - Already in registry. Skipped.
- Stratasys - Subsidiary MakerBot uses GH; main Stratasys uses proprietary careers
- Strauss Group - Cloudflare-protected (403 to anonymous curl on .com / 200 on strauss-g
- SuperMeat - No ATS hit
- Tabit - No ATS hit
- Talenya - No ATS hit
- Talon Cyber Security - Acquired by Palo Alto Networks 2024; careers moved
- Tara - Now a Central Bottling Company brand. No dedicated careers ATS. No pub
- Tarci - No ATS hit
- Testim - Acquired by Tricentis 2022; no public ATS
- TinyTap - No ATS hit
- TipRanks - No ATS hit
- Tnuva - Proprietary. No public API.
- Tower Semiconductor - NEW. Cloudflare-blocks scraping (403 on all /career, /jobs, /working-a
- Triple-C - Proprietary. No public API.
- Ubeya - No ATS hit
- Vayyar - No ATS hit
- Verbit - Static careers HTML shows individual job pages /careers/<slug>/ but no
- Veriti - No ATS hit
- Vicarius - Search confused with Vicarious Surgical; vicarius.io ATS not found
- Vintage Investment Partners - IL fund-of-funds + secondary. Tiny team. No public ATS.
- Voom Insurance - No ATS hit
- VYNE Therapeutics (formerly Foamix) - Foamix (IL clinical-stage pharma, Ness Ziona) merged with Menlo Therap
- Walla! News - Hebrew news portal. /careers returns 404. No public ATS; hiring via Be
- Wallarm Cybersecurity - No ATS hit
- Wisor.ai - Only Team8-affiliated listing found
- Wix - Uses proprietary wix.com/jobs — no supported ATS in list
- Y.H. Dimri - Proprietary. No public API.
- Ynet (Yedioth Ahronoth) - Ynet is Yedioth Ahronoth's online arm. /careers 404. No public ATS — i
