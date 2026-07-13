---
title: Browser-agent sourcing queue
status: living
owner: eli
last_reviewed: 2026-07-10
---

# Browser-agent sourcing queue

A cold-start brief. If you are a browser-agent session picking this up with no prior context, this
doc is everything you need. Work it top to bottom: P0 first (real user demand), then the standing
recapture/discovery items, then the research batch. Record every find in the output table at the
bottom so the terminal can resolve it into the fetch registry directly.

## What Get A Job is, and your goal

Get A Job is a live career platform for business students entering the Israeli tech market. It shows
users real open jobs, pulled nightly from company ATS boards (Comeet, Greenhouse, Lever, Ashby,
Workable, SmartRecruiters, Workday). The fetcher can only ingest a company once it knows that
company's **ATS board identifier**. For most modern Israeli startup careers pages, that identifier is
NOT in the static HTML (the page is a JS app), so a plain `curl` cannot find it - **that is why this
is browser work.** A real browser runs the page's JavaScript, which fires the ATS API call, and you
read the identifier off that network request.

**Your goal per company: identify the ATS and capture its board id (and, for Comeet, its token).**

## The technique

### Comeet (needs a per-company uid AND token)

1. Open the company's careers page in the browser (accept cookies if prompted).
2. Open DevTools (F12) -> Network tab. Reload the page.
3. In the Network filter box, type `comeet` (or `careers-api`).
4. Look for a request to `comeet.co/careers-api/2.0/company/<UID>/positions?token=<TOKEN>...`.
5. Copy the FULL request URL. It contains both the `<UID>` (e.g. `63.00B`) and the `<TOKEN>` (a long
   hex string). Both are required; the token cannot be guessed.
   - Alternative: some WordPress-plugin sites expose the pair inline in the page HTML as a
     `comeetvar` block or a `COMEET.init({ uid, token })` call - read it off the page source.
6. Verify: paste the full URL into a new tab; a JSON array of positions means it is good. A 400 with
   "Account uid or token are not valid" means the token is stale - do not record it.

### Any other ATS (board id only, no token)

Same idea, different request. Reload with Network open and look for the XHR the careers page makes:

- Greenhouse: `boards-api.greenhouse.io/v1/boards/<slug>/jobs` or `job-boards.greenhouse.io/<slug>`
- Lever: `api.lever.co/v0/postings/<slug>` or `jobs.lever.co/<slug>`
- Ashby: `api.ashbyhq.com/posting-api/job-board/<slug>` or `jobs.ashbyhq.com/<slug>`
- Workable: `apply.workable.com/api/v1/widget/accounts/<slug>` or `<slug>.workable.com`
- SmartRecruiters: `api.smartrecruiters.com/v1/companies/<slug>/postings`
- Workday: a `<tenant>.<dc>.myworkdayjobs.com/<site>` URL
  Record the **platform + slug/board id**. No token needed for these.

If the careers page is just a wall of `comeet.com/jobs/SLUG/UID/` links (a hosted board) with no
readable token, record the slug + uid and mark `needs-token` - the terminal will try the endpoint.

## Output format (fill this and hand it back)

| company | ats    | uid_or_slug | token (Comeet only) | careers_url | notes              |
| ------- | ------ | ----------- | ------------------- | ----------- | ------------------ |
| Example | comeet | 63.00B      | A0D4...3C4E         | https://... | 5 IL roles visible |

---

## P0 - Tracker gaps (real user demand; do these FIRST)

Companies users actively track in-app that our registry is missing. **Insait is first - tracked 3x
by the same user (highest demand signal we have).** All are JS-gated (static curl found nothing); a
real browser should surface the ATS.

| #   | company    | careers URL to open                        | what's needed      | caveat                                                                                                |
| --- | ---------- | ------------------------------------------ | ------------------ | ----------------------------------------------------------------------------------------------------- |
| 1   | **Insait** | https://www.insait.io/careers              | ATS identification | curl gets 403 (bot-blocked); a real browser should pass                                               |
| 2   | Varonis    | https://www.varonis.com/company/careers    | ATS identification | big public cyber co; likely Greenhouse/Workday                                                        |
| 3   | Kovrr      | https://www.kovrr.com/careers              | ATS identification | registry has an inert `unknown` row                                                                   |
| 4   | Findings   | https://www.findings.co/careers            | ATS identification |                                                                                                       |
| 5   | Terminal X | https://www.terminalx.com/careers          | ATS identification | Israeli e-commerce (Factory 54 group)                                                                 |
| 6   | Factory 54 | https://www.factory54.co.il/careers        | ATS identification | Israeli luxury retail                                                                                 |
| 7   | Dazn       | https://careers.dazn.com                   | ATS identification | multinational; find the Israel office board                                                           |
| 8   | droxi      | https://www.droxi.ai/careers               | Comeet token       | page links `comeet.com/jobs/droxiai` but that hosted board 404s - find the real uid+token via Network |
| 9   | Abra       | (confirm domain: abra-it.com / abra.co.il) | ATS + domain       | Israeli IT-services "Abra"; confirm which                                                             |
| 10  | HiO        | (domain TBD)                               | ATS + domain       | confirm which company                                                                                 |
| 11  | INNOVA     | (domain TBD)                               | ATS + domain       | confirm which company                                                                                 |
| 12  | origami.ms | https://origami.ms/careers                 | ATS identification |                                                                                                       |
| 13  | Wenrix     | https://www.wenrix.com/careers             | ATS identification |                                                                                                       |

(Not queued: HiBob runs its own product as its ATS - unsupported; Tasc consulting is a consultancy,
likely no tech ATS.)

## P1 - Token recaptures and re-discovery (known board, credential lost)

| company  | uid       | what's needed          | caveat                                                                                        |
| -------- | --------- | ---------------------- | --------------------------------------------------------------------------------------------- |
| Browsi   | F3.00B    | Comeet token recapture | had 3 live IL at last capture; token now returns HTTP 400                                     |
| Sightful | 26.00D    | Comeet token capture   | uid known; token never exposed. POST-LAYOFF - reverify current IL openings before counting it |
| LawGeex  | (unknown) | Comeet uid + token     | careers page shows Comeet markers but uid/token are JS-injected via comeetapi.com             |
| TytoCare | (unknown) | full ATS re-discovery  | careers page no longer exposes Comeet markers - may have switched ATS; find the new one       |

## P2 - Discovery passes (find NEW companies, not just resolve known ones)

Record each find in the output table (company, ats, uid/slug, token, careers_url).

- **Netanya-area pass:** search `site:comeet.com/jobs "Netanya"` and Google `Netanya tech companies
careers`, and walk any Netanya-based company's careers page for a Comeet board. Netanya is
  under-covered vs Tel Aviv / Herzliya in our registry.
- **Hebrew pass 1:** search Israeli job boards and Google in Hebrew for companies hiring, e.g.
  `דרושים` + sector terms (`סייבר`, `פינטק`), and for each surfaced company open its careers page and
  capture the ATS board. Was CAPTCHA-blocked in prior automated attempts - a human-in-the-loop browser
  session clears it.
- **Hebrew pass 2:** the same, targeting Hebrew-language careers pages specifically (many mid-market
  Israeli employers run Hebrew-only careers sites that our English-keyed discovery misses).

## P3 - Research batch (VC-portfolio + CTech funding, June 2026; never ingested)

Net-new after dedupe against the registry + ledger. Lower priority than P0-P2 (these are research
leads, not user-demanded). Static ATS detection already failed on all of these (JS-gated), so they
need the browser. Open each careers URL, capture the ATS board per the technique above. **Skip any
that show 0 Israel-based roles unless the company is clearly Israeli-founded with a live board (a
seed - note it).**

### P3a - domain known (open `careers_url`, identify ATS)

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

### P3b - domain unknown (find the domain first, then identify ATS)

Act Security, Syremis Therapeutics, Rein Security, Opti, Mate, Milestone, Daylight, Malanta,
Popai Health, Cassidy Bio, Dux, Lumia, Moonshot Space, LeanCon, Localbird, 257, QuamCore, Impala AI,
Spacial, Wild Moose, CyberRidge, Corbel, Offroad, Shifters, Airis Labs, Tribal, Arito, NanoCo, Ocean,
Novella, Frame, Copperhelm, Q-Factor, Cyata, Legion, Commcrete.

---

## Provenance

- P0: Task 2 tracker-vs-registry gap check (2026-07-10). Insait, Varonis, Kovrr, Findings, TerminalX,
  Factory54, Dazn, droxi, Abra, HiO, INNOVA, origami, Wenrix.
- P1: carried from prior harvest ledger + handoffs (Browsi/Sightful/LawGeex recaptures, TytoCare).
- P2: standing discovery scope (Netanya + 2 Hebrew passes), previously CAPTCHA-blocked.
- P3: Task 3 research-280 batch, 92 net-new after dedupe; static detection failed on all but 2
  (CopilotKit lever, Tapcheck ashby - both 0 IL, not added). 54 have domains (P3a), 36 need a domain
  (P3b).

## Workday tenant recaptures (registry health, 2026-07-13)

A Workday-lane audit (all 39 registry `workday` rows vs `public.jobs`) found the
lane healthy — 25 companies fetched today with active jobs — EXCEPT **Unity**
(fixed this pass: it had migrated off Greenhouse `unity3d` (now HTTP 404) to
Workday `unitytech.wd1.myworkdayjobs.com/Unity`, 10 live IL; row repointed).

Nine rows fetch fine but return 0 IL today (legit, no action): Accenture, Adobe,
Analog Devices, Atlassian, Booking.com, Citrix, eBay, Insulet, ServiceNow.

**Five rows have a MALFORMED / placeholder slug** — the fetcher can't parse them
(needs `<tenant>.wdN.myworkdayjobs.com/<site>`), so they have NEVER fetched. Find
the real Workday tenant+site for each and repoint (or drop if no IL presence):

| company | current (broken) slug | what's needed |
| --- | --- | --- |
| Bloomberg | `bloomberg` | real Workday host/site (or confirm not Workday) |
| Moelis & Company | `moelis` | real Workday host/site |
| Philips | `philips` | real Workday host/site |
| PwC | `pwc` | real Workday host/site |
| Deci AI | `None` | acquired by NVIDIA — likely superseded by nvidia Workday; confirm/drop |

## LinkedIn-finds batch resolution (2026-07-13)

Detected + verified (verify-hunt) a batch of LinkedIn-sourced companies. Every
count re-fetched from the terminal, not trusted from notes.

### Wired (verified >=1 IL)

- **Workday** (the company) - workday `workday.wd5.myworkdayjobs.com/Workday`.
  7 postings, 7 IL (Tel Aviv R&D). New registry row.

### Deferred - staffing / agency listings (pending Eli's product decision)

- **Quality AI** - precisely identified: **SuccessFactors** (a supported ATS),
  live feed `https://careers.quality-ai.com/sitemal.xml`, 202 jobs / ~57 IL. BUT it
  is a QA/engineering **services + staffing** firm (jobs are client placements
  across IL/India/US/Romania, e.g. "QA Engineer | Credit Union + Symitar, Santa
  Clara"). Same category as Yuval HR / HR Hadarly - not wired pending the agency
  decision. If agency listings are ever accepted, this one is a 1-line wire
  (successfactors, slug `careers.quality-ai.com`, api_url the sitemal.xml above).
- **Yuval HR / HR Hadarly** - staffing agencies. Skipped per Eli.

### needs-fetcher-adapter (unsupported ATS; board captured, no wire)

- **PLAYSTUDIOS** - Dayforce HCM: `jobs.dayforcehcm.com/en-US/playstudios`. Dayforce
  is not one of our supported adapters.
- **IntentIQ** - HiBob: `intentiq.careers.hibob.com` (board UUID is JS-injected, not
  in static HTML; capture in a browser if/when a HiBob adapter is built). HiBob is
  a known unsupported ATS.
- **Varonis** - Jobvite: `jobs.jobvite.com/careers/varonis` (confirms the #561 flag).
  Jobvite unsupported.

### Needs detection - JS-gated / bot-blocked custom sites (browser capture)

Static curl found no ATS markers (or was blocked); a real browser is needed to read
the ATS request off the Network tab.

- **Plarium** (in registry, `unknown`; ~1000-person IL gaming co, HIGH VALUE) -
  `company.plarium.com/en/career/`. The old greenhouse-EU slug `plariumgloballtd`
  now 404s on boards-api; real ATS unknown. Highest-priority detect.
- **Ubeya** (in registry, `unknown`) - `careers.ubeya.com` (own product; job 7211105
  visible). No static API markers; identify the feed in a browser.
- **Tensorleap** - `tensorleap.ai/careers` (job pages under /careers/).
- **Base.ai** - `base.ai/careers`.
- **Sidelines Group** - `sidelinesgroup.com/jobs` (curl returns 403; bot-blocked).
- **GlassesUSA**, **Jurni** - careers pages not yet located; find, then detect.

## No-board companies (LinkedIn / aggregator-only hiring)

A structural blind spot: some companies do not run any public ATS board. They hire
via LinkedIn posts, personal outreach, or IL aggregators (AllJobs, Drushim,
dreamjobs.co.il), and post no API our ATS-direct sourcing can read. Record them here
so they are not re-hunted as "missing an ATS" - there is nothing to wire.

- **Voye Global** - verified no careers page (consumer site only; roles live on
  aggregators). No board.
- **Kovrr** - lists roles on its own page, applies by email (`liatl@kovrr.com`).
- **Findings** - careers page dead/redirects; applies via `career@findings.co`.

Pattern: consumer brands, small teams, and email/LinkedIn-first hirers. If we ever
want this supply, it needs an aggregator lane (AllJobs / Drushim), not an ATS
adapter - a separate build, not a hunt.
