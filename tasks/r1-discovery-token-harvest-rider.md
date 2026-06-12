# R1 discovery: fold AdamTotal + Comeet token harvest into the careers-page pass

Status: design note (no build) — agreed 2026-06-12 after the AdamTotal-vein investigation.

## Decision

AdamTotal tenant discovery has **no cheap slug-probe surface** (investigated 2026-06-12):
every tenant is gated behind an opaque, non-guessable token. Verified: `/<tenant>`
paths 404; token-less `career.adamtotal.co.il/` and dedicated subdomains
(railcareer, harel) serve a landing/marketing page with 0 job cards; no DNS
wildcard; the vendor homepage is marketing + login (no customers page). So the
briefed "one cheap GET per transliterated slug guess" cannot work, and a dedicated
AdamTotal discovery probe is **shelved**.

The only viable AdamTotal discovery is **token harvest** — the same shape as Comeet
discovery: read a candidate employer's own careers page and extract an embedded
tokenized link. That is a near-zero-cost rider on a crawl we already run.

## What to build (in the R1 successor to `scripts/discover-comeet.ts` /

## `discover-ats-companies`)

When the discovery pass fetches a candidate's careers-page HTML, detect BOTH ATS
fingerprints in the SAME pass (one fetch, two extractors):

1. **Comeet** — existing: `COMEET.init({...})` / `comeetvar = {...}` /
   `comeet.co/careers-api/2.0/company/<UID>/positions?token=<TOKEN>`, PLUS the
   hosted-page JSON shape `"company_uid":"<UID>" … "token":"<TOKEN>"` (this last
   one was the gap that hid the 6 Comeet-hosted recoveries in the 2026-06-12 audit —
   the old regex required a `COMEET.init` block).
2. **AdamTotal** — NEW: any `(career[a-z]*\.)?adamtotal\.co\.il/(Home/Index|\?)?\??token=<TOKEN>`
   link embedded in the page. The tenant token is the whole prize; verify with one
   GET against `career.adamtotal.co.il/?token=<TOKEN>` and count `data-job-id` cards.

## Mandatory dedup (the 2026-06-12 trap)

A harvested token can be an **alternate board of an existing tenant**, not a new one.
Proven live: the dorked token `0940de9c-…` returned 25 cards but shared 8/25 page-1
job IDs with our existing Partner token. So before promoting any AdamTotal hit:
compare its returned `external_id` set against existing tenants' job IDs; treat a
non-trivial overlap as a duplicate, not a new tenant. "Returns cards" ≠ "new tenant."

## Cost

Zero extra crawling — it runs over every future seed batch automatically, on pages
already being fetched for Comeet/other-ATS detection.
