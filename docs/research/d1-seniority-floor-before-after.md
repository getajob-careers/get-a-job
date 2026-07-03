# D1 — symmetric soft seniority floor: before/after evidence

Measured 2026-07-03. Deterministic design; live figures from `career_roles` + `profiles`.

## What shipped

A **senior-only** soft seniority floor, `STAGE_T1_FLOOR = { early: 0, mid: 0, senior: 2 }`,
as a single shared definition in `track-scoring-constants.ts` (`STAGE_T1_FLOOR` +
`isBelowSeniorityFloor` + `applySeniorityFloor`) imported by all three scoring paths so none can drift:

- `generate-career-analysis` `assignTrackWithGoal` (Roadmap) — soft-demote Track 1 → Track 2.
- `scoreApplication` `trackFromScores` (Tracker) — same shared demotion.
- `scoreJobFit` (Jobs page) — symmetric `below_floor` axis penalty (mirrors `above_ceiling`).
- `analyze-job-match` prompt — over-qualification framing so the fit-read narration can't drift from the deterministic track.

**Soft, never hard-exclude:** a too-junior Track-1 role demotes to Track 2, it does not vanish from the tracks.

## Why senior-only (not mid)

The measured stage-split of junior-titled roles **in Track 1** (the actual bug; Track 2 is fine):

| Stage           | junior roles in T1 | users | verdict                                                                                                                                                                                       |
| --------------- | ------------------ | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| early (student) | 9                  | 5     | legitimate — floor=0 keeps them (interns ARE hire-now for students)                                                                                                                           |
| mid             | 8                  | 7     | **contested** — left untouched (Isaac's "Junior SWE for mid pivoter" guard; rank alone can't separate legit same-family pivots from cross-family bugs → queued for the ESCO family-aware arc) |
| senior          | 6                  | 4     | **unambiguous over-qualification — the floor demotes these**                                                                                                                                  |

Stage here is approximated from `qualification_level` (regex proxy); the runtime derives stage from
years + current-student. The exact set that moves is confirmed on the next analysis run (the deploy
triggers it on refresh). This is why D1 is HELD for a live-glance before merge.

## Before → after (real senior-derived users, anonymized)

Each row is a junior role currently in the user's Track 1 that the floor demotes to Track 2. Every
Coordinator/Assistant title resolves to Entry/Entry_Mid (rank 0–1), below the senior floor (2).

| user          | role (Track 1 today)    | score | after     |
| ------------- | ----------------------- | ----- | --------- |
| senior-user-1 | Event Coordinator       | 0.73  | → Track 2 |
| senior-user-2 | Event Coordinator       | 0.60  | → Track 2 |
| senior-user-3 | HR Assistant            | 0.66  | → Track 2 |
| senior-user-3 | Recruitment Coordinator | 0.66  | → Track 2 |
| senior-user-3 | HR Coordinator          | 0.62  | → Track 2 |
| senior-user-4 | HR Assistant            | 0.45  | → Track 2 |

**Nothing legitimate vanishes:** these 4 users keep their other Track-1 roles (5–8 each) — only the
below-floor junior roles move down one track. Students (early) and mid-career pivoters are untouched.

## Verification

- `yearsCap.test.js` two-sided matrix: junior VANISHES from Track 1 for **senior**, PERSISTS for **early** and **mid** — all asserted so neither side can silently regress.
- Isaac's `scoreJobFit.test.js` "Junior SWE for mid → track_1" regression guard passes **unchanged**.
- Full suite green. Edge functions redeployed; deployed-source grep confirms the floor shipped.
