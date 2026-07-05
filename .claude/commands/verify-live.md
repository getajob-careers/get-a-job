---
description: Print the live-verify choreography plus DB pass conditions to hand to the human verifier.
---

Print (do not execute) the live-verify script for the just-deployed change:

- Use a FRESH invented company name (never reuse a prior one) so the run is unambiguous in the data.
- Choreography: paste the JD, read the coach's fit, ACCEPT (state whether by Generate click or verbal "yes, generate it"), if the company is unknown answer it when asked, then navigate 3-4 pages and reopen the CV.
- Timestamps to note: the accept, each generation, the navigation.
- DB PASS CONDITIONS (hand to the DB verifier to confirm via `function_metrics` + `application_cvs`, scrubbed): exactly ONE `generate-tailored-cv` per accept; the count stays frozen through navigation; the app and CV are linked (no orphan, no Unknown company); download and Open-in-Studio resolve the SAME document.
- On any FAIL: roll back, do not debug in prod (promote the predecessor Vercel deployment and revert the edge fn to its prior version).
