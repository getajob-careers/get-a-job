# Comprehensive master-CV — investigation (HOLD, read-only)

Design/investigation only. No code, no deploy. Branch `eli/master-cv-comprehensive-investigation`.
Verified against live prod (read-only) + direct reads of `generate-tailored-cv/index.ts`,
`reconcile.ts`, `_shared/cv-templates/build-pdf.ts`.

## Premise correction (verified against the real master I generated)

The structured `cv_data` reservoir **already contains all 5 of Eli's source experiences** — measured
on his master row `f6b0d4bd`: `professional=2, military=1, volunteering=2, leadership=0` = **5 total**,
matching his 5 source experiences (Heseg Tzair ×2 → volunteering, Guardio + Get-a-Job → professional,
Nahal → military). **Nothing was dropped from the structured reservoir.**

The "5 → 3, 2 dropped" the user saw is a **one-page PDF render artifact**, not author/reconcile loss:
`build-pdf.ts` is **hard single-page** (one `addPage`, `build-pdf.ts:627`; measure→`scale =
max(SCALE_MIN 0.55, available/used)`, `:653-657`; **no second page, no pagination**) and **clips**
content that doesn't fit at 0.55 scale. So the master's 5 experiences get shrunk, then the overflow is
visually cut.

**The real reservoir gaps are therefore narrower than "experiences get dropped":**

1. **Bullet caps starve the refine** — Eli's two professional entries have bullet counts **`5, 2`**; the
   `5` is the one-page hard ceiling, not the source's true bullet supply.
2. **The one-page PDF misrepresents a comprehensive master** — it clips, so the PDF is a lossy view of a
   reservoir that's actually complete in `cv_data`.

Experience-level comprehensiveness is already met; the work is bullets + render, not experience inclusion.

---

## 1. Content limiting — every place content is reduced

Three layers; **only the PDF layer actually removed anything visible here.**

**(a) LLM prompt — caps BULLETS, and the framing pressures one-page; does NOT instruct dropping experiences.**

- `ONE_PAGE_RULE` (`index.ts:989-1008`) is anti-drop in intent: `:1004` "Include every experience … NEVER
  drop entries — the renderer will shrink before anything is cut." But it **caps bullets** for one-page
  fit: `:993-997` "Professional experiences: 2-4 bullets … Hard ceiling: 5 bullets per experience."
- `OPTION_A_OVERLAY` (Sonnet path, appended last, "overrides any conflicting rule", `:1290/1310`):
  `:1316` "one bullet per distinct responsibility line … capped at 6 … **Drop the LEAST JD-relevant line
  ONLY when you hit the 6-bullet ceiling.**" — actively wrong for a JD-less reservoir.
- The "one-page" words survive into master mode (master only swaps the adjective `tailored→comprehensive`):
  role line `:1332`, REMINDER "one-page fit is non-negotiable" `:1341`, closing `:1397`. `ONE_PAGE_RULE`
  is included **unconditionally** at `:1334`.

**(b) Reconcile / server trim — never drops entries.**

- `fillFromSource` (`reconcile.ts:223`) `return sources.map((src,i)=>…)` → output length === source length;
  a source slot with no LLM bullets falls back to `responsibilitiesToBullets(src.responsibilities)`
  (`:224-227`). **Confirmed by data: 5 sources → 5 entries.** It does NOT expand bullets beyond what the
  LLM emitted, so it doesn't _fix_ the cap either.
- Server auto-trim (`index.ts:2440-2483`): `maxLines = 120`, only pops bullets to floors (PROFESSIONAL 3 /
  SECONDARY 2), "Drop-entry passes removed entirely … never drop content, shrink instead" (`:2436-2440`).
  At 5 experiences it's nowhere near 120 lines → **does not fire**.

**(c) PDF render — single-page shrink-to-fit, CLIPS past SCALE_MIN. This is what "dropped" the 2.**

- One `addPage` (`build-pdf.ts:627`); `renderExperienceBucket` iterates all entries/all bullets, no slice
  (`:430-442`); fit is typography scale only, clamped `[0.55, 1.0]` (`:101-102, 653-657`). The `fits`
  boolean (`:657`) is **logged, not acted on** — no overflow-to-page-2 branch. Comment `:38`: "No
  margin-reduction tier when scale would go below SCALE_MIN." So content beyond 0.55-scale-fit is clipped.

**Mechanism that turned 5 into 3 (corrected):** the **renderer** clipped, not the author/reconcile.
`cv_data` has all 5.

## 2. Section bucketing — deterministic, server-side, cannot drop

`classifyExperience` (`index.ts:761-793`) buckets by `company/title/type` with a **guaranteed default**
`return "professional"` (`:792`); split into 4 arrays (`:816-819`), each reconciled with its **full**
source array (`:1712-1735`). Every source experience lands in exactly one bucket and is represented in
`cv_data` (verified 5→5). The only quantity cap is `slice(0, 15)` (`:810`) — irrelevant at 5. **Risk is
mis-bucketing (wrong heading), not drop.** For Eli that's why "professional" shows only 2 — the other 3
are correctly under military/volunteering, not lost.

## 3. Comprehensive master mode — smallest gated change

Because experiences are already all present, the change is about **bullets + one-page framing**, gated on
`isMasterMode` so the JD-present job-CV path stays byte-identical.

- **Gate the one-page framing off in master mode:** `ONE_PAGE_RULE` inclusion (`:1334`), the "one-page"
  words (`:1332`, `:1341`, `:1397`). Replace with a master directive: "comprehensive reservoir — include
  every experience and **every** responsibility/achievement as its own bullet; do not cap, do not drop,
  do not shrink to a page."
- **Lift the bullet caps in master mode:** the `2-4 / hard ceiling 5` (`:993-997`) and `OPTION_A` `capped
at 6 … drop least-JD-relevant` (`:1316`). In master mode: **one bullet per distinct responsibility line,
  uncapped, nothing dropped.** This is the load-bearing reservoir change — **yes, master bullet generation
  must produce MORE bullets per experience than a one-page CV** (today's 5-6 ceiling would starve the
  refine, which needs the full set to select from).
- Reconcile + renderer need no change for _inclusion_ (they already preserve). Render is item 5.

**Options:** (3A) gate the existing rule blocks with `isMasterMode ? <master variant> : <original>` inline
(smallest diff, keeps one function); (3B) a separate `MASTER_CONTENT_RULES` block swapped in for
`ONE_PAGE_RULE`+caps when master. **Lean: 3A** — fewest moving parts, every gate provably byte-identical
for non-master, mirrors the Phase-1a gating already in place.

## 4. Master framing — replace the arbitrary target_role

**Where `target_role`/`safeTargetRole` feeds today** (`grep` confirmed): the hard requirement
(`:365-367`, returns 400 if missing); `TARGET ROLE:` line in userPrompt (`:1349`); grounded About-Me
(`:1076` — but see below); role-library match `matchRoleToLibrary(safeTargetRole)` → injected block
(`:932→1226-1236`); sector/PDF theme `resolveSectorTheme(safeTargetRole)` (`:2503`); PDF filename
(`:2517`); `cv_version_name` (`:2544/2555`, applications-only — skipped for masters); response message
(`:2638`). `fit_analysis` is NOT string-fed by target_role.

**Good news:** in master mode (no JD/app) the About-Me already fires **SPARSE MODE** (`usesGroundedPath =
hasV4Grounding && …` is false → `:1094-1104`), which is neutral and explicitly says "Do NOT infer domains
… from the TARGET ROLE alone" (`:1102`). And the grounded "connect to the target role" rule (`:1031`) is
already gated off in master mode (`:1342`). So the About-Me **body** is already role-neutral. The
target_role only leaks via the `TARGET ROLE:` line, role-library/sector lookups, and filename.

`primary_domain` is already fetched and in `userContext` (`:855`, `trunc(profile.primary_domain,100)`),
and is already a trusted anti-fab source (`:1086`).

**Options:** (4A) keep requiring a target_role but neutralize its prompt leaks in master mode (replace the
`TARGET ROLE:` line with `PRIMARY DOMAIN: ${primary_domain}`, skip the role-library match + sector-theme,
fixed `Master_CV` filename). (4B) drop the target_role requirement for masters (relax `:365`), default
framing to `primary_domain`. **Lean: 4B** — primary_domain is per-user and already present; dropping the
arbitrary top-career-role removes the "Marketing Intern for a PM" problem at the source. Keep a neutral
fallback ("(general)") when primary_domain is null.

## 5. Master render — does the master need a PDF at all?

The master is a **data reservoir** the refine selects from; **job CVs are what get sent**. The renderer is
hard single-page (item 1c) — a genuinely comprehensive master would shrink to 0.55 then **clip**, so the
PDF is a lossy, misleading view of a complete `cv_data`.

`cv_url` is **nullable** (`application_cvs.cv_url text`, migration `20260617:21`); `cv_data jsonb NOT NULL`
is the real deliverable. So skipping the PDF for masters is schema-safe.

**Options:**

- **(5A) Skip the PDF for masters — persist `cv_data` only, `cv_url = null`.** Guard the
  `buildCvPdf`→upload→`createSignedUrl` block (`index.ts:2509-2537`) behind `!isMasterMode`; set
  `cv_url: null` in the master upsert. Saves ~render cost, avoids the misleading clipped PDF. **← LEAN.**
- (5B) Make the renderer multi-page (new `addPage`/y-reset logic in `build-pdf.ts`). Correct long-term if a
  human-viewable master is wanted, but a real renderer rewrite — not the smallest change, and not needed
  while the master is machine-consumed by the refine.
- (5C) Keep the one-page clipped PDF as a "preview." Rejected — it visibly contradicts "no shrink-to-fit"
  and is what created this whole confusion.

**What breaks if `cv_url` is null for masters:**

- **Nothing schema-wise** (`cv_url` nullable; `cv_data` NOT NULL holds the content).
- The response `cv_url` is null for masters — inspection reads `cv_data` (via MCP/UI), which is the point.
- **The 1b poll sentinel inverts.** The earlier design proposed `master_cv_url IS NULL` ⇒ "still
  preparing." If masters are intentionally `cv_url = null`, a _ready_ master reads as **forever pending**.
  Fix: key the sentinel on **the `is_master` row existing** (it's inserted only after `cv_data` is
  reconciled, and `cv_data` is NOT NULL) — i.e. pending = `onboarding_complete AND NOT EXISTS(is_master
row)`, mirroring `analysisStatus.js`'s presence-of-output pattern. Optionally add a `master_cv_status`
  (`pending`/`ready`) only if 1b needs to distinguish "fired but not yet persisted" (the self-heal case).
  **Do NOT key the sentinel on `cv_url`.**

---

## Overall lean

The structured reservoir already includes every experience — the fix is \*\*(3A) gate the one-page framing

- bullet caps off in master mode so the author emits the full, uncapped bullet set** (the refine needs the
  superset), **(4B) frame masters on `primary_domain` and drop the arbitrary target_role**, and **(5A) skip
  the PDF for masters** (`cv_url = null`, persist `cv_data` only) with the **1b sentinel keyed on the
  is_master row's existence, not `cv_url`\**. Reconcile and the bucketing need no change; the renderer needs no
  change *if\* we skip the master PDF (5A) — defer multi-page rendering (5B) unless a human-viewable master is
  later required. All gates stay `isMasterMode ? … : …` so the job-CV path is byte-identical.
