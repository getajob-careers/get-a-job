---
title: Comeet token-capture shortlist
status: retired
owner: eli
generated_from: companies_il.json (unknown-ATS rows with a known Comeet UID, 2026-06-14)
retired: 2026-07-12 (all 30 boards dead - see verdict below)
---

# Comeet token-capture shortlist - RETIRED (2026-07-12)

**Do NOT manually capture these. Every board is dead.** An automation test (below) found that all 30 comeet boards are deactivated or no longer resolve, so a manual DevTools capture would hit the same dead pages and return nothing.

## Verdict: automation validated, but the shortlist is stale (VERIFIED 2026-07-12)

Tested whether comeet token capture is automatable before Eli did 30 manual captures. Both routes were validated against the known-good **Insait** (uid `0B.00C`, token `B0C4...373C`) first - **each reproduced Insait's token exactly**:

- **Route 1 (curl the hosted board, grep the inline `"company_uid"/"token"` JSON):** VERIFIED - reproduces Insait's token from `comeet.com/jobs/insait/0B.00C` static HTML.
- **Route 2 (headless Chromium, capture the `comeet.co/.../token=...&company-uid=...` network request):** VERIFIED - reproduces Insait's token exactly via network capture.

**The method works. The boards don't.** Applied across the 30:

| stage                                                                      | count  |
| -------------------------------------------------------------------------- | ------ |
| shortlist                                                                  | 30     |
| board deactivated ("This Spark Hire Recruit account has been deactivated") | **25** |
| no comeet board resolves for the uid (any slug tried)                      | **5**  |
| **live + token captured**                                                  | **0**  |
| verified >=1 IL                                                            | 0      |

Both routes return 0 because there is nothing live to capture - not because the routes fail. Many of these are acquired/shut-down companies (Guardicore -> Akamai, Noname -> Akamai, CyberInt / Perimeter 81 -> Check Point, Qwak -> JFrog, SCADAfence -> Honeywell, Vulcan Cyber -> Tenable, Future Meat -> Believer Meats). The shortlist was generated 2026-06-14; the boards have since been deactivated.

**Deactivated (25, VERIFIED via the deactivation page):** AnyClip, Autotalks, Bionic Security, Centrical, Cyabra, Cyberbit, Cynerio, CYREBRO, CyberInt, Deep Instinct, env0, HiredScore, Karamba Security, Lightico, Lumigo, Noname Security, Otorio, Perimeter 81, Pliops, Qwak, SCADAfence, SciPlay, Sorbet, Syte, Vulcan Cyber.

**Unresolved (5, INFERRED dead - no comeet board for the uid on any slug tried):** Bidalgo, Future Meat, Glassbox, Namogoo, Guardicore.

**Reusable method for FUTURE (live) boards:** Route 2 is the automatable capture - headless Chromium, load `comeet.com/jobs/<slug>/<uid>`, capture the first `comeet.co` request carrying `token=<hex>` + `company-uid=<uid>`. It reproduced the known-good token exactly, so a future harvest of _live_ boards is a scripted loop, not manual DevTools work.

---

## Original shortlist (historical - all dead per the verdict above)

The **30** companies that are in the registry as `unknown` ATS but whose Comeet **UID is already known** from a prior harvest. The one missing piece was the **token**, which cannot be guessed - it must be read from a live browser.

## How (per company, ~30 seconds)

1. Open the **URL to open** below in a real browser (accept cookies).
2. Open DevTools (F12) -> **Network** tab, filter `comeet` (or `careers-api`), and **reload**.
3. Find the request to `comeet.co/careers-api/2.0/company/<UID>/positions?token=<TOKEN>...`.
4. **Copy the full request URL** - it contains the UID (verify it matches) and the long hex **token**. Paste both back.
5. Verify: pasting the full URL in a new tab returns a JSON array of positions (a 400 = stale token, don't record).

URL to open = the Comeet hosted board when the slug is known (most reliable - always fires the token'd request); otherwise the company's own careers page (the Comeet widget there fires the same request).

## Active companies (capture these first)

| company          | comeet uid | URL to open                                                 | note                                                         |
| ---------------- | ---------- | ----------------------------------------------------------- | ------------------------------------------------------------ |
| AnyClip          | 91.00D     | https://www.comeet.com/jobs/anyclip/91.00D                  | found via comeet.com/jobs/anyclip URL; token not extractable |
| Autotalks        | 03.009     | (no careers URL on file - search 'Autotalks careers')       | found via URL; token couldn't be extracted from the comeet p |
| Bidalgo          | 22.006     | https://bidalgo.com/careers/                                | found via URL but token not extractable from page            |
| Bionic Security  | F5.008     | (no careers URL on file - search 'Bionic Security careers') | found but token not extractable                              |
| Centrical        | C1.00A     | https://centrical.com/careers/                              | found; token not extractable from comeet hosted page         |
| Cyabra           | 29.006     | (no careers URL on file - search 'Cyabra careers')          | found; token not extracted                                   |
| Cyberbit         | C3.00E     | https://www.cyberbit.com/careers/                           | (case 'Cyberbit'); token not extractable from JS-rendered pa |
| Cynerio          | 16.00E     | (no careers URL on file - search 'Cynerio careers')         | found; token not extractable                                 |
| CYREBRO          | A7.003     | (no careers URL on file - search 'CYREBRO careers')         | found; token not extracted                                   |
| Deep Instinct    | 72.00A     | https://www.deepinstinct.com/careers                        | found; token not extracted                                   |
| env0             | B6.005     | https://www.env0.com/careers/                               | found; token not extracted                                   |
| Future Meat      | B7.00A     | https://futuremeattechnologies.com/careers/                 | (now Believer Meats); token not extracted                    |
| Glassbox         | 53.00C     | https://www.glassbox.com/careers/                           | found; token not extracted                                   |
| HiredScore       | 24.000     | (no careers URL on file - search 'HiredScore careers')      | found; token not extracted                                   |
| Karamba Security | D7.00D     | https://www.karambasecurity.com/careers/                    | found; token not extracted                                   |
| Lightico         | 94.00D     | (no careers URL on file - search 'Lightico careers')        | found; token not extracted                                   |
| Lumigo           | 04.001     | https://lumigo.io/careers/                                  | found; token not extracted                                   |
| Namogoo          | B4.006     | https://www.namogoo.com/careers/                            | found; token not extracted                                   |
| Otorio           | E3.003     | https://www.otorio.com/careers/                             | found; token not extracted                                   |
| Pliops           | 05.004     | (no careers URL on file - search 'Pliops careers')          | found; token not extracted                                   |
| SciPlay          | D5.00A     | (no careers URL on file - search 'SciPlay careers')         | found; token not extracted                                   |
| Sorbet           | 17.002     | (no careers URL on file - search 'Sorbet careers')          | found; token not extracted                                   |
| Syte             | 74.002     | https://www.syte.ai/careers/                                | found; token not extracted                                   |

## Acquired (capture only if you want the acquirer's roles too; board may be dead)

| company         | comeet uid | URL to open                                                 | note                                                         |
| --------------- | ---------- | ----------------------------------------------------------- | ------------------------------------------------------------ |
| CyberInt        | 83.006     | https://cyberint.com/careers/                               | token not extractable. (Now part of Check Point)             |
| Guardicore      | F2.008     | (no careers URL on file - search 'Guardicore careers')      | found (acquired by Akamai); token not extracted              |
| Noname Security | 86.001     | (no careers URL on file - search 'Noname Security careers') | found; token not extracted (acquired by Akamai 2024)         |
| Perimeter 81    | 64.00C     | (no careers URL on file - search 'Perimeter 81 careers')    | (slug 'p81') found; token not extracted; acquired by Check P |
| Qwak            | 99.005     | https://www.qwak.com/careers                                | found; token not extracted (acquired by JFrog 2024)          |
| SCADAfence      | 43.00E     | https://scadafence.com/careers/                             | found; token not extracted (acquired by Honeywell 2023)      |
| Vulcan Cyber    | 94.00E     | https://vulcan.io/careers/                                  | found; token not extracted (acquired by Tenable 2024)        |
