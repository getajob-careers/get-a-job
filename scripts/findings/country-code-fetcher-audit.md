# ATS fetcher IL-detection audit: country_code vs string-match

Branch: `eli/country-code-fetcher-audit`. Read-only investigation, no code changes.
Date: 2026-06-23. Trigger: PR #383's Comeet harvest showed positions report `country_code: "IL"` with cities like "Tel Aviv-Yafo" and no country name, so IL detection must not rely on string-matching the literal "Israel". This audit asks whether any existing fetcher silently drops IL jobs for that reason.

## Headline

The premise is mostly already handled. IL classification is centralized in one function, `classifyLocation` in `scripts/lib/normalize.ts`, which is NOT a naive `/israel/i` match: it trusts a structured country first, then falls back to a substring match against a ~40-entry Israeli city map (English plus Hebrew), then a region-tag map, then explicit "Israel", then a bare "IL" code. Most fetchers either set `structured_country` (short-circuit) or return all jobs and lean on that city map.

Two real issues fall out, one in each direction:

1. SILENT DROP (under-capture), one confirmed fetcher: SuccessFactors. It sets `structured_country: null` and relies on the location string. Live evidence (ICL) shows SF location strings are bare, often Hebrew, city names with no "Israel"/"IL" token, and 157 of 298 (53%) of SF IL rows in the jobs table already land with `location_city = NULL`, the highest ratio of any ATS. Off-map cities (Sdom, Neot Hovav, Tel-Hai) would drop entirely.

2. FALSE POSITIVE (over-capture), the bigger live defect: the bare ", IL" rule treats the US state code IL (Illinois) as Israel. 164 IL-tagged rows in the jobs table mention Chicago/Illinois with no "Israel" token; a distinct-value sweep shows ~160 are genuine US jobs ("Chicago, IL", "Chicago, IL, US, 60606", and US multi-city remote lists). This pollutes the IL feed and is the opposite of the audited concern.

Bucket count of the 16 fetchers: SAFE 12, UNCERTAIN 3 (latent city-map tail), SILENT DROP 1 (SuccessFactors).

---

## Section 1: Fetcher inventory

All fetchers live in one file, `scripts/lib/ats-fetchers.ts`, registered in the `FETCHERS` map (line 1651). The `discover-*` / `recover-*` scripts are tooling, not the cron path. Sixteen fetch functions, mapped to ATS keys:

| ATS key(s)                  | function             | file:line |
| --------------------------- | -------------------- | --------- |
| greenhouse                  | fetchGreenhouse      | 71        |
| iai                         | fetchIai             | 124       |
| jooble                      | fetchJooble          | 183       |
| workable                    | fetchWorkable        | 270       |
| lever                       | fetchLever           | 317       |
| ashby                       | fetchAshby           | 347       |
| workday                     | fetchWorkday         | 449       |
| smartrecruiters             | fetchSmartRecruiters | 707       |
| comeet                      | fetchComeet          | 776       |
| successfactors              | fetchSuccessFactors  | 878       |
| adamtotal, adamtotal_agency | fetchAdamTotal       | 1039      |
| bezeq_native                | fetchBezeq           | 1217      |
| hot_native                  | fetchHotTelecom      | 1332      |
| pwc_heroku                  | fetchPwcHeroku       | 1424      |
| amazon_jobs                 | fetchAmazonJobs      | 1544      |

Company counts per ATS in `companies_il.json`: comeet 234, greenhouse 202, ashby 69, workday 36, lever 25, smartrecruiters 11, workable 10, adamtotal 10, successfactors 8, amazon_jobs 1, plus the IL-only single-tenant fetchers.

## Section 2: Per-fetcher IL filter logic (verbatim)

The shared decision point, `scripts/lib/normalize.ts`, `classifyLocation`:

```ts
export function classifyLocation(
  raw: string | null,
  structuredCountry?: string | null,
): { is_il: boolean; city: string | null } {
  // Trust structured country first (most reliable).
  if (structuredCountry) {
    const sc = structuredCountry.trim();
    if (/^il$/i.test(sc) || /^israel$/i.test(sc)) {
      return { is_il: true, city: extractIlCity(raw) };
    }
  }
  ...
  for (const [needle, canonical] of Object.entries(IL_CITY_MAP)) {
    if (lower.includes(needle)) return { is_il: true, city: canonical };
  }
  ... // region map, then:
  if (RX_COUNTRY_ISRAEL.test(raw) || RX_COUNTRY_HEBREW_ISRAEL.test(raw)) {
    return { is_il: true, city: null };
  }
  if (RX_COUNTRY_IL_CODE.test(raw) && !hasUsCorroboratingSignal(raw)) {
    return { is_il: true, city: null };
  }
  return { is_il: false, city: null };
}
```

`IL_CITY_MAP` (`normalize.ts:165-241`) covers ~40 cities: Tel Aviv (and tlv / tel aviv-yafo), Herzliya, Ramat Gan, Bnei Brak, Petah Tikva, Rishon LeZion, Rehovot, Modi'in, Hod Hasharon, Kfar Saba, Ra'anana, Netanya, Ashdod, Ashkelon, Haifa, Jerusalem, Be'er Sheva, Nazareth, Yokneam, Caesarea, Krayot, Eilat, Holon, Bat Yam, Lod, Ramla, Givatayim, Or Yehuda, Yavne, plus Hebrew equivalents. Notable omissions: Nes Ziona, Rosh HaAyin, Kiryat Gat, Migdal HaEmek, Airport City, Sderot, Karmiel, Tel-Hai, Sdom, Neot Hovav.

Per fetcher (the line that sets country, and whether it pre-filters):

- Greenhouse (`ats-fetchers.ts:80-82`): returns ALL board jobs, no IL pre-filter.
  ```ts
  location_raw: (j.location?.name as string) ?? null,
  // Greenhouse doesn't expose structured country; rely on string match.
  structured_country: null,
  ```
- Lever (`ats-fetchers.ts:332-333`): returns ALL postings, no pre-filter.
  ```ts
  location_raw: location,
  structured_country: null,
  ```
- Ashby (`ats-fetchers.ts:368-369`): returns ALL jobs (primary + secondary locations joined), no pre-filter.
  ```ts
  location_raw: locationRaw,
  structured_country: null,
  ```
- SuccessFactors (`ats-fetchers.ts:908-909`): no pre-filter, relies on the RSS location string.
  ```ts
  location_raw: it.location_raw,
  structured_country: null, // location_raw carries "Israel" or ", IL"
  ```
- Workday (`ats-fetchers.ts:397-415`): pre-filters server-side with an 11-term `searchText` list.
  ```ts
  // Workday uses server-side `searchText` to narrow before pagination.
  // A job tagged ONLY with a city not in this list would be invisible to us.
  const WORKDAY_SEARCH_TERMS = [
    "Israel",
    "Tel Aviv",
    "Herzliya",
    "Ra'anana",
    "Petah Tikva",
    "Haifa",
    "Be'er Sheva",
    "Netanya",
    "Yokneam",
    "Jerusalem",
    "Ramat Gan",
  ] as const;
  ```
- SmartRecruiters (`ats-fetchers.ts:713,737`): structured country filter at the API AND passes the structured country through.
  ```ts
  const url = `https://api.smartrecruiters.com/v1/companies/${c.slug}/postings?country=il&limit=${limit}&offset=${offset}`;
  ...
  structured_country: loc.country ?? null,
  ```
- Comeet (`ats-fetchers.ts:782,800`): sets structured country from the API's country code (the PR #383 fix is already in production).
  ```ts
  const country = (loc.country || "").toUpperCase();
  ...
  structured_country: country || null,
  ```
- Workable (`ats-fetchers.ts:285-289`): maps the country NAME to "IL".
  ```ts
  const country = (j.country || "").trim();
  const structured_country = country
    ? /^(israel|il)$/i.test(country) ? "IL" : country
    : ...
  ```
- Amazon (`ats-fetchers.ts:1560`): structured country filter at the API (`country=ISR` from the slug).
  ```ts
  const url = `${base}?country=${encodeURIComponent(country)}&result_limit=${AMAZON_PAGE_SIZE}&offset=${offset}`;
  ```
- IL-only fetchers hardcode `structured_country: "IL"`: IAI (`:150`), AdamTotal (`:1073`), Bezeq, HotTelecom, PwC Heroku. Jooble queries `location: "Israel"` and sets `structured_country: "IL"` (`:198,234`).

## Section 3: Source API field shape per ATS (what the JSON returns)

- Greenhouse: `location.name` is a free string, usually "Tel Aviv" or "Tel Aviv, Israel"; no structured country field. Multi-location roles emit semicolon lists ("New York, NY; ...; Chicago, IL").
- Lever: `categories.location`, a free string; commonly city-only ("Tel Aviv", "Tel-Aviv") or "City, Israel"; no country code.
- Ashby: `location` plus `secondaryLocations[].location`, free strings; city-only or bare "Israel"; no country code in the public posting API.
- Comeet: structured `location { country, city, state, name, is_remote }`. `country` is the ISO code "IL". This is the structured field PR #383 relied on; the fetcher already consumes it.
- SmartRecruiters: structured `location { city, region, country }` plus a `country=il` query filter; country is exposed structurally.
- Workable: top-level `city` / `state` / `country`, where `country` is the full NAME ("Israel").
- Amazon: `normalized_location` / `city` / `state` / `country_code` plus a `country=ISR` query filter.
- SuccessFactors: RSS feed; location is a free string. Live evidence (ICL tiles) shows bare city names, frequently in Hebrew (for example "Ashdod-...", "Haifa-...", "Sdom-...", "Neot-Hovav-...", "Beer-Sheva-..."), with zero "Israel"/"IL" tokens.
- Workday: CXS API `locationsText` (for example "Israel - Tel Aviv") and `externalPath` (for example "/job/Israel-Tel-Hai/..."). The country word "Israel" travels inside the searchable location text.

## Section 4: SAFE / SILENT DROP / UNCERTAIN verdict per fetcher

| Fetcher                      | mechanism                                                      | verdict                 |
| ---------------------------- | -------------------------------------------------------------- | ----------------------- |
| Comeet                       | structured_country from country_code "IL"                      | SAFE                    |
| SmartRecruiters              | country=il API filter + structured country                     | SAFE                    |
| Workable                     | structured_country mapped from country name                    | SAFE                    |
| Amazon                       | country=ISR API filter                                         | SAFE                    |
| IAI                          | structured_country "IL" (IL-only)                              | SAFE                    |
| AdamTotal / adamtotal_agency | structured_country "IL" (IL-only)                              | SAFE                    |
| Bezeq (bezeq_native)         | structured_country "IL" (IL-only)                              | SAFE                    |
| HotTelecom (hot_native)      | structured_country "IL" (IL-only)                              | SAFE                    |
| PwC Heroku (pwc_heroku)      | structured_country "IL" (IL-only)                              | SAFE                    |
| Jooble                       | location="Israel" query + structured_country "IL"              | SAFE                    |
| Workday                      | 11-term searchText, but "Israel" travels in location text      | SAFE (see Section 5)    |
| Greenhouse                   | all jobs, relies on city map                                   | UNCERTAIN (latent tail) |
| Lever                        | all jobs, relies on city map                                   | UNCERTAIN (latent tail) |
| Ashby                        | all jobs, relies on city map                                   | UNCERTAIN (latent tail) |
| SuccessFactors               | all jobs, relies on city map, locations are bare/Hebrew cities | SILENT DROP             |

Totals: SAFE 12, UNCERTAIN 3, SILENT DROP 1.

## Section 5: Sampled live position evidence

Greenhouse (16 tenants sampled live: abnormalsecurity, accessibe, aerospike, aiven36, wizinc, gongio, fireblocks, melio, jfrog, orcasecurity, riskified, taboola, similarweb, lightricks, via, cybereason): 178 IL jobs identified, 0 missed by the production rules. IL strings concentrate in Tel Aviv / Jerusalem and always carry a mapped city or the literal "Israel". No off-map city strings appeared.

Lever + Ashby (7 boards: aleph, biocatch, cloudinary, coupa, 15five Lever; 1password, sevenai, aim, anyscale, april, deel, ramp Ashby): 0 missed. City-only strings DO occur (biocatch "Tel Aviv", april "Tel Aviv", bare "Israel" 10x), and a near-miss "Hertzelia, Israel" (misspelled city, kept only by the "Israel" token) confirms the failure mode is one step away, but no off-map Israeli city surfaced in the sample.

Workday (NVIDIA, Salesforce live; Adobe and Analog Devices returned 0 for "Israel"): the 11-term gap is effectively zero. `searchText="Israel"` is a full-text match and the country word "Israel" is inside `locationsText` / `externalPath`, so the single "Israel" term is a superset of the per-city terms. NVIDIA "Israel" = 472 (Yokneam 259, Tel-Aviv 152, Ra'anana 41, Be'er Sheva 5, Tel-Hai 4, all caught by "Israel"); Salesforce "Israel" = 14, all per-city searches a subset. No IL posting was found that "Israel" did not already return.

SuccessFactors (ICL `careers.icl-group.com` tiles; NetApp / Energean RSS endpoint not cleanly locatable in the time cap): ICL job tiles carry location as a bare, often Hebrew, city name with zero "Israel"/"IL" token (examples: Ashdod, Haifa, Sdom, Neot Hovav, Be'er Sheva). Cities in the map (Ashdod, Haifa, Be'er Sheva) are still caught by the substring match, but off-map ones (Sdom, Neot Hovav, Tel-Hai) and transliteration variants would drop. The fetcher consumes an RSS feed (not the tile endpoint), so the exact production location string was not directly confirmable, which is why SF is SILENT DROP with a confirm-the-RSS caveat rather than a hard number.

jobs table cross-check (current production state, `ats_source` / `is_il` / `location_city`):

| ats_source       | il_rows | il_rows with city NULL | null % |
| ---------------- | ------- | ---------------------- | ------ |
| comeet           | 1848    | 499                    | 27%    |
| greenhouse       | 1244    | 210                    | 17%    |
| adamtotal        | 799     | 51                     | 6%     |
| workday          | 698     | 73                     | 10%    |
| adamtotal_agency | 406     | 1                      | 0%     |
| successfactors   | 298     | 157                    | 53%    |
| ashby            | 207     | 44                     | 21%    |
| amazon_jobs      | 159     | 0                      | 0%     |
| lever            | 100     | 29                     | 29%    |
| pwc_heroku       | 66      | 60                     | 91%    |
| workable         | 13      | 2                      | 15%    |
| smartrecruiters  | 6       | 0                      | 0%     |

SuccessFactors' 53% city-null (157 of 298) is the standout among string-reliant ATSs and corroborates the bare/Hebrew-city evidence. (PwC's 91% is an IL-only feed where city is simply not parsed; not a drop risk since structured_country is "IL".) These counts are a proxy for weak-signal IL rows, not a direct drop count: silently-dropped jobs never enter the table, so the table cannot show them directly.

### False-positive finding (over-capture, the larger live defect)

164 IL-tagged rows have a location mentioning Chicago/Illinois and no "Israel" token. A distinct-value sweep confirms ~160 are genuine US jobs:

- "Chicago, IL": greenhouse 45, comeet 8, ashby 5, lever 2
- "Chicago, IL, US, 60606": successfactors 29
- "Chicago, IL, United States of America": 3
- dozens of US multi-city remote lists ("New York, NY; San Francisco, CA; ...; Chicago, IL; ...")

These pass `RX_COUNTRY_IL_CODE` (the ", IL" branch) and `hasUsCorroboratingSignal` fails to suppress them even when "US", "CA", "NY", or "United States" is present in the same string. This is the inverse of the audited concern and is a concrete data-quality bug.

## Section 6: Estimated inventory impact

- SILENT DROP (SuccessFactors): the only confirmed under-capture. SF carries 298 IL rows today with 53% city-null. The dropped tail (off-map and tokenless IL postings) is plausibly on the order of tens of jobs across the 8 SF tenants, but cannot be sized precisely without reading the production RSS feed (deferred, read-only here). Low absolute volume (8 tenants), but a real and fixable loss.
- UNCERTAIN tail (Greenhouse / Lever / Ashby): 0 measured drops across ~25 sampled tenants and ~178 IL jobs. The latent loss is bounded by how often an off-map Israeli city (Nes Ziona, Rosh HaAyin, Kiryat Gat, Migdal HaEmek, Airport City) appears as a bare location with no country token. Did not appear in the sample; likely a small single-digit-percent tail, concentrated in manufacturing / defense / MNC boards not in the sampled set.
- Workday: zero. The 11-term list is redundant for IL discovery.
- FALSE POSITIVE (Illinois): ~160 US rows currently mislabeled IL. Fixing this REMOVES inventory (corrects pollution), it does not add it.

Net: the "country_code vs string-match" risk that motivated this audit is real only for SuccessFactors, and is small in absolute terms. The higher-value correction is the Illinois false-positive.

## Section 7: Recommended fix scope and priority

Priority 1 (correctness, ~160 mislabeled rows): tighten the bare-IL-code branch in `classifyLocation`. Require the IL code to be a standalone country token, not a US state. Concretely: in `RX_COUNTRY_IL_CODE` / `hasUsCorroboratingSignal`, treat the presence of any US state abbreviation (", IL" alongside ", CA" / ", NY" / ", TX" / "United States" / "US-Remote" / a 5-digit US ZIP) as disqualifying, and do not accept ", IL" when the string also contains a US city + state pattern. Add a regression fixture from the distinct Chicago strings above.

Priority 2 (SuccessFactors silent drop): give SF a real IL signal instead of the string fallback. Either (a) parse the RSS location's country field if present and set `structured_country`, or (b) extend `IL_CITY_MAP` with the missing cities (Nes Ziona, Rosh HaAyin, Kiryat Gat, Migdal HaEmek, Airport City, Sderot, Karmiel, Tel-Hai, Sdom, Neot Hovav) plus Hebrew/transliteration variants, which also benefits Greenhouse / Lever / Ashby. Option (b) is the broader, cheaper win.

Priority 3 (defense in depth for the all-jobs trio): the IL_CITY_MAP expansion in Priority 2 covers the Greenhouse / Lever / Ashby latent tail at the same time. No per-fetcher change needed; the central map is the single lever.

Not needed: Workday term-list changes (the 11 terms are redundant), and any change to the structured-country fetchers (Comeet, SmartRecruiters, Workable, Amazon, and the IL-only feeds), which are already SAFE.

All of the above are deferred to a future, non-read-only task.
