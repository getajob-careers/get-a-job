---
name: investigation-rules
description: Use whenever investigating a bug, incident, discrepancy, or unexpected behavior - before stating any root cause or verdict. Enforces evidence discipline so a plausible-but-wrong conclusion does not ship.
---

# investigation-rules

Evidence discipline for any investigation. Every rule below was written from a real failure on this project where a confident-but-wrong conclusion cost a round-trip. Apply them BEFORE stating a root cause or verdict.

## The rules

### a. Read the WHOLE unit before claiming absence

Never assert "X doesn't exist / never happens / is never called" from a PARTIAL read of a function, file, or log. Read the function end to end, the whole file, the full time window - then claim absence.

> Failure it prevents: reading `buildUserContext` only through line 692, concluding "the coach never fetches applications," and shipping that verdict - when the applications fetch was at lines 769-786, just past where the read stopped.

### b. Label every claim VERIFIED / INFERRED / REPORTED

Tag each factual claim with its evidence tier:

- **VERIFIED** - checked directly against ground truth this session, with the evidence cited (a query result, a grep hit, a trace, source read end to end).
- **INFERRED** - reasoned from evidence, not directly observed. Sound reasoning is still not observation.
- **REPORTED** - someone said so. This includes the user (Eli), Claude.ai, a prior investigation, a PR body, a comment, a memory. **Premises from humans are REPORTED until independently confirmed** - a plausible premise is a hypothesis to test, not a fact to build on.

> Fresh validation (today): the "five volunteers = AI leak" hypothesis was **INFERRED** (fabricated-quantity anti-fab theory) and died on contact with the actual row - experience `18d79161` had user-sourced contradictory fields (`responsibilities` said "team of five", `bullets` said "team of 8"); the gens drew faithfully from both and anti-fab worked as designed. An INFERRED root cause survived only until the row was read.
>
> Earlier failure: the "1-of-60 tracker" premise was **REPORTED** (Eli's recollection) and treated as VERIFIED; telemetry never actually corroborated that the tracker rendered 1 row.

### c. "Demonstrated possible" is not "observed to have occurred"

A synthetic reproduction proves a mechanism CAN produce a symptom. It does NOT prove that mechanism produced THIS symptom in the real event. Keep the two separate in the write-up, and go find the observation before blaming the mechanism.

> Failure it prevents: the desync theory - a REST probe reproduced 200/0-rows and 401 synthetically (mechanism demonstrated possible), and that got written as the incident's cause, but no 401, exception, or degraded read was ever observed in the user's actual sessions.

### d. Run the strongest disconfirming check before finalizing

Before committing to a verdict, actively try to FALSIFY it with the strongest available check: query the live system, pull the trace, re-read the source end to end, replay the exact shape. State explicitly what evidence WOULD have falsified the conclusion - if you can't name one, the verdict isn't ready.

> This is what flipped the coach verdict from "never fetches applications" to "fetches with `.limit(20)` no `.order()`" - re-reading the whole function and running the exact query (which returned the 20 oldest, DriveNets absent) was the disconfirming check.

### e. Confidence language must match the evidence tier

Absolutes - "never", "cannot", "impossible", "not a bug" - are licensed ONLY on VERIFIED claims. INFERRED claims get hedged language ("likely", "the evidence points to"). REPORTED claims are attributed ("Eli recalls", "the prior pass claimed") until confirmed. Do not let an INFERRED or REPORTED claim inherit VERIFIED-tier confidence.

## The habit

State the verdict, then for each load-bearing claim under it: the tier, the evidence line (query / trace / file:line), and - for the verdict itself - the disconfirming check you ran and what would have falsified it. If a claim is REPORTED or INFERRED and you couldn't confirm it, say so plainly rather than rounding up.
