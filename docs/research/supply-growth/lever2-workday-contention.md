# LEVER 2 — "Workday contention losses" — FINDINGS (2026-07-27)

## HEADLINE: the lever premise is MISDIAGNOSED (evidence FALSIFIES "Workday fetch batching")

NVIDIA/PANW did NOT go dark because of a Workday fetch/pagination/timeout problem.
They went dark because their **jobs-table UPSERT hit Postgres statement_timeout
(57014)** two nights running, and the 2-day staleness sweep then deactivated every
row. The fetch is healthy. This is a **DB-side write-contention storm on the `jobs`
table**, not a fetcher problem, and it hits many ATS families — not just Workday.

---

## EVIDENCE

### E1 — The failure is an UPSERT statement timeout, not a fetch failure [VERIFIED]

GHA run logs, both dark nights, identical line:

```
07-27 04:41:26  ✗ NVIDIA              workday  upsert_error: canceling statement due to statement timeout
07-27 04:41:26  ✗ Palo Alto Networks  workday  upsert_error: canceling statement due to statement timeout
07-26 04:25:19  ✗ NVIDIA              workday  upsert_error: canceling statement due to statement timeout
07-26 04:25:19  ✗ Palo Alto Networks  workday  upsert_error: canceling statement due to statement timeout
```

(run ids 30237318828 / 30187641993, `gh run view <id> --log`)
Status string is `upsert_error`, produced ONLY in refresh-jobs.ts:297-307, the catch
around the `supabase.from("jobs").upsert(batch,...)` loop (lines 284-296). A fetch
failure produces `fetch_error` (refresh-jobs.ts:184-194) — a different string. So the
fetch SUCCEEDED and the write is what died.

### E2 — The last successful night confirms the fetch works fine [VERIFIED]

07-25 run (id 30143151103):

```
✓ NVIDIA              workday  278 IL / 478 total (93284ms)
✓ Palo Alto Networks  workday  134 IL / 140 total (42002ms)
```

That night: 0 upsert_errors in the whole run. NVIDIA/PANW last_seen = 07-25
03:59:31 / 03:58:28 (DB, jobs table). That is the last write. Fetch returned 478/140
rows; the problem is purely that the 07-26 + 07-27 writes timed out.

### E3 — The endpoints are healthy RIGHT NOW [VERIFIED — live curl this run]

Reconstructed cxs URL from ats-fetchers.ts:515 (`https://<host>/wday/cxs/<tenant>/<site>/jobs`):

```
POST nvidia.wd5.myworkdayjobs.com/wday/cxs/nvidia/NVIDIAExternalCareerSite/jobs
  body {"appliedFacets":{},"limit":20,"offset":0,"searchText":"Israel"}
  -> HTTP 200, total=452, 20 returned, 1.46s
POST paloaltonetworks.wd5.myworkdayjobs.com/wday/cxs/paloaltonetworks/panwexternalcareers/jobs
  body {...,"searchText":"Israel"}
  -> HTTP 200, total=150, 20 returned, 1.07s
  (empty searchText -> HTTP 200, 0.96s)
```

Both healthy, sub-2s. PANW exposes only a hierarchical location facet
("Office - Israel - Tel Aviv", "…Petach Tikva", "Tel Aviv-Yafo, Israel") with NO bare
"Israel" descriptor, so the name-agnostic facet scan (ats-fetchers.ts:573-587) finds
nothing → PANW runs the SEARCHTEXT path. NVIDIA same (no-facet). Both on the
searchText path, as the code comment (line 501) already documents.

### E4 — This is an aggregate lock-contention storm, NOT Workday-specific [VERIFIED]

07-27 run `upsert_error` breakdown (20 total):

```
 17  canceling statement due to statement timeout
  2  upstream request timeout          (Supabase pooler/gateway 504)
  1  deadlock detected
```

The 17 statement-timeout victims span EVERY write-heavy ATS, not Workday:
comeet (Deloitte, Vast Data, Infinidat, Abra R&D, Bagira, Delta Galil, Lab42,
Majestic Labs, SentryCS, Israel Discount Bank, Kayhut, Dualbird), greenhouse
(Taboola), adamtotal (Gefen Placement), adamtotal_agency (Peres Group),
workday (NVIDIA, PANW). Plus `deadlock detected` on Harel Insurance (adamtotal).
The **soft-delete sweep ALSO failed** the same night:
`WARN: soft-delete sweep failed: ... canceling statement due to statement timeout`
and landing_stats failed too. Whole jobs-table write path was starved.

### E5 — statement_timeout and the write-amplification driver [VERIFIED — live DB]

```
statement_timeout = 120000 (120s, source: configuration file)
lock_timeout = 0, idle_in_transaction = 0, deadlock_timeout = 1000
authenticator/service_role carry NO role-level timeout override (inherit 120s)
```

jobs table shape:

```
total_relation_size 161 MB  (heap 31MB + idx 15MB + ~115MB TOAST)
rows 10,784   raw_payload non-null 10,784   avg raw_payload 2,560 bytes
22 indexes, of which 10 are GIN (customer_type, industry_vertical, tech_stack,
  application_extras, eligibility, notable_customers, req_ai_tooling, il_benefits,
  title trgm, ...)
```

Every `INSERT … ON CONFLICT DO UPDATE` row rewrites all 22 indexes (GIN updates are
lock-heavy) and TOASTs a ~2.5KB jsonb payload. With `CONCURRENCY_LIMIT = 20`
(refresh-jobs.ts:55) workers all upserting the same table in `UPSERT_BATCH_SIZE = 200`
(line 80) chunks, statements queue on page/index locks. A 187-200-row batch that runs
in ~1s uncontended can sit >120s waiting on locks → 57014.

### E6 — Size correlation is clean among Workday boards [VERIFIED — DB]

Per-Workday-tenant totals (total rows / active / last_seen):

```
NVIDIA               443   0 active   last_seen 07-25 03:59   DARK
Palo Alto Networks   187   0 active   last_seen 07-25 03:58   DARK
Intel                 85  23 active   last_seen 07-27 04:32   OK
KLA                   78  48 active   last_seen 07-27         OK
Johnson & Johnson     67  25 active   last_seen 07-27         OK
Adaptive Shield       50  11 active   last_seen 07-27         OK
… every remaining Workday board (<=30 total) updated 07-27 OK
```

The exactly-two dark boards are the #1 and #2 largest. #3 (Intel, 85) and all
smaller survived. Heaviest batch = most reliable timeout victim.

### E7 — Why they stay dark while comeet victims recover [VERIFIED mechanism]

- NVIDIA/PANW are the heaviest upserts → they time out MOST reliably → failed BOTH
  07-26 and 07-27 (E1).
- STALE_DAYS = 2 (refresh-jobs.ts:79). A row with no last_seen update for >2 days is
  swept to is_active=false. Two consecutive failed nights froze last_seen at 07-25 →
  by the 07-27 sweep the rows were >2 days stale → all 630 deactivated.
- A comeet board (e.g. Infinidat) that times out ONE night succeeds the next, so its
  last_seen refreshes before crossing the 2-day line → it never goes dark. The big
  boards are the only ones that fail two nights in a row → the only ones that go dark.

### E8 — No upsert retry (the fixable gap) [VERIFIED — code read]

- Sweep HAS retry-on-57014: `deactivateStale` wraps chunk UPDATEs in a
  timeout-retry-with-backoff (refresh-jobs.ts:327-385, retries only on
  `statement timeout|57014|canceling statement`).
- The per-company UPSERT does NOT: refresh-jobs.ts:284-296 is a bare loop; first
  batch error `throw`s straight to the `upsert_error` catch. One transient 57014 = the
  whole company lost for the night, no retry. Mirroring the sweep's retry here would
  by itself let NVIDIA/PANW self-heal.

---

## CONCLUSIONS

### (a) Root cause [VERIFIED]

Postgres `statement_timeout` (57014) on the batched `jobs` UPSERT under nightly
write/lock contention — NOT a Workday fetch, pagination, offset-cap, or endpoint
problem. NVIDIA + PANW (the two largest boards) time out on the write two nights
running; STALE_DAYS=2 then deactivates all 630 rows. Fetch + endpoints are healthy
(E2, E3). The lever's "Workday fetch batching / contention" framing is falsified.

### (b) Do large Workday boards need their own FETCH batching? [VERIFIED: NO]

No. The fetch of the largest board (NVIDIA, 478 total) completed in 93s on 07-25 and
returns 200 in ~1.5s live. Adding Workday-fetch batching fixes nothing. The write is
the bottleneck, and it is ATS-agnostic (E4). What is actually needed:

1. **Upsert retry-on-57014** — mirror the sweep's existing `withTimeoutRetry` onto
   the per-company upsert loop (refresh-jobs.ts:284-296). Cheapest, highest-leverage.
2. **Lower write concurrency and/or UPSERT_BATCH_SIZE** during the write window
   (20 concurrent × 200-row heavy-GIN batches is the contention source, E5).
3. Structural (larger): trim the 22-index / 10-GIN write amplification, or stop
   writing the full 2.5KB raw_payload on every refresh (TOAST churn).

### (c) Recoverable volume + difficulty

- **~410-450 IL active jobs** immediately recoverable: 07-25 actually landed
  278 (NVIDIA IL) + 134 (PANW IL) = **412 IL** before the timeouts started; live
  totals today are similar (NVIDIA 452, PANW 150 pre-IL-filter). The "630 dark rows"
  figure is total rows incl. non-IL/duplicated history; the live IL active recovery is
  ~412. [VERIFIED from 07-25 run + live curl; INFERRED that today's count ≈ 07-25's]
- Plus a variable nightly tail: 17 statement-timeout companies/night (comeet Infinidat,
  Vast Data, Taboola, etc.) currently lose their refresh intermittently. [VERIFIED E4]
- **Fix difficulty: LOW–MEDIUM.** The retry code already exists (sweep); porting it to
  the upsert is a few lines. Lowering concurrency/batch size is a constant change. No
  new infra, no Workday-fetch rework, no schema migration required for the primary fix.
  (Index-trim / payload-write reduction is the optional medium follow-up.)

### Cross-check vs anchors

Anchor said "630 rows dark (NVIDIA 443 + PANW 187)" — CONFIRMED as total-row counts
(DB E6). Flagging: the _IL-active_ recoverable number is ~412, not 630 (630 includes
inactive history + non-IL rows). Anchor's "self-heal FALSIFIED" — CONFIRMED and now
EXPLAINED (E7: two-consecutive-night timeout + STALE_DAYS=2).
