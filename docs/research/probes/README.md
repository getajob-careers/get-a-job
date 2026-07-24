# Seniority / field-mismatch scoring probes (archive)

Read-only measurement probes used for the two scoring audits in `docs/research/`:

- `seniority-underexperience-probe.ts` — reproduces the live digest scorer against a DB
  snapshot; drives `scoring-v2-seniority-underexperience-audit.md`.
- `seniority-rank-fix-eval.ts` — 160-label band-movement eval for the `SENIORITY_RANK`
  vocab fix (shipped as PR #745); GOOD movement 0/33.
- `field-mismatch-probe.ts` — years-axis field-blindness probe; drives
  `scoring-v2-field-mismatch-experience-audit.md`.

They read a local JSON snapshot (profiles/jobs pulled via the Supabase MCP) that is NOT
committed — the scripts are kept as a record of method, in the spirit of the existing
`scripts/*.mjs` eval harnesses, not as runnable-from-clean artifacts. Run with `npx tsx`.
