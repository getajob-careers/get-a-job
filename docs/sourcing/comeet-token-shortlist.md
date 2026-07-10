---
title: Comeet token-capture shortlist
status: working
owner: eli
generated_from: companies_il.json (unknown-ATS rows with a known Comeet UID, 2026-06-14)
---

# Comeet token-capture shortlist

The **30** companies that are in the registry as `unknown` ATS but whose Comeet **UID is already known** from a prior harvest. The one missing piece is the **token**, which cannot be guessed - it must be read from a live browser.

## How (per company, ~30 seconds)

1. Open the **URL to open** below in a real browser (accept cookies).
2. Open DevTools (F12) -> **Network** tab, filter `comeet` (or `careers-api`), and **reload**.
3. Find the request to `comeet.co/careers-api/2.0/company/<UID>/positions?token=<TOKEN>...`.
4. **Copy the full request URL** - it contains the UID (verify it matches) and the long hex **token**. Paste both back.
5. Verify: pasting the full URL in a new tab returns a JSON array of positions (a 400 = stale token, don't record).

URL to open = the Comeet hosted board when the slug is known (most reliable - always fires the token'd request); otherwise the company's own careers page (the Comeet widget there fires the same request).

## Active companies (capture these first)

| company | comeet uid | URL to open | note |
| --- | --- | --- | --- |
| AnyClip | 91.00D | https://www.comeet.com/jobs/anyclip/91.00D | found via comeet.com/jobs/anyclip URL; token not extractable |
| Autotalks | 03.009 | (no careers URL on file - search 'Autotalks careers') | found via URL; token couldn't be extracted from the comeet p |
| Bidalgo | 22.006 | https://bidalgo.com/careers/ | found via URL but token not extractable from page |
| Bionic Security | F5.008 | (no careers URL on file - search 'Bionic Security careers') | found but token not extractable |
| Centrical | C1.00A | https://centrical.com/careers/ | found; token not extractable from comeet hosted page |
| Cyabra | 29.006 | (no careers URL on file - search 'Cyabra careers') | found; token not extracted |
| Cyberbit | C3.00E | https://www.cyberbit.com/careers/ | (case 'Cyberbit'); token not extractable from JS-rendered pa |
| Cynerio | 16.00E | (no careers URL on file - search 'Cynerio careers') | found; token not extractable |
| CYREBRO | A7.003 | (no careers URL on file - search 'CYREBRO careers') | found; token not extracted |
| Deep Instinct | 72.00A | https://www.deepinstinct.com/careers | found; token not extracted |
| env0 | B6.005 | https://www.env0.com/careers/ | found; token not extracted |
| Future Meat | B7.00A | https://futuremeattechnologies.com/careers/ | (now Believer Meats); token not extracted |
| Glassbox | 53.00C | https://www.glassbox.com/careers/ | found; token not extracted |
| HiredScore | 24.000 | (no careers URL on file - search 'HiredScore careers') | found; token not extracted |
| Karamba Security | D7.00D | https://www.karambasecurity.com/careers/ | found; token not extracted |
| Lightico | 94.00D | (no careers URL on file - search 'Lightico careers') | found; token not extracted |
| Lumigo | 04.001 | https://lumigo.io/careers/ | found; token not extracted |
| Namogoo | B4.006 | https://www.namogoo.com/careers/ | found; token not extracted |
| Otorio | E3.003 | https://www.otorio.com/careers/ | found; token not extracted |
| Pliops | 05.004 | (no careers URL on file - search 'Pliops careers') | found; token not extracted |
| SciPlay | D5.00A | (no careers URL on file - search 'SciPlay careers') | found; token not extracted |
| Sorbet | 17.002 | (no careers URL on file - search 'Sorbet careers') | found; token not extracted |
| Syte | 74.002 | https://www.syte.ai/careers/ | found; token not extracted |

## Acquired (capture only if you want the acquirer's roles too; board may be dead)

| company | comeet uid | URL to open | note |
| --- | --- | --- | --- |
| CyberInt | 83.006 | https://cyberint.com/careers/ | token not extractable. (Now part of Check Point) |
| Guardicore | F2.008 | (no careers URL on file - search 'Guardicore careers') | found (acquired by Akamai); token not extracted |
| Noname Security | 86.001 | (no careers URL on file - search 'Noname Security careers') | found; token not extracted (acquired by Akamai 2024) |
| Perimeter 81 | 64.00C | (no careers URL on file - search 'Perimeter 81 careers') | (slug 'p81') found; token not extracted; acquired by Check P |
| Qwak | 99.005 | https://www.qwak.com/careers | found; token not extracted (acquired by JFrog 2024) |
| SCADAfence | 43.00E | https://scadafence.com/careers/ | found; token not extracted (acquired by Honeywell 2023) |
| Vulcan Cyber | 94.00E | https://vulcan.io/careers/ | found; token not extracted (acquired by Tenable 2024) |

