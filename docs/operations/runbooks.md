---
title: Runbooks
status: living
owner: shared
last_reviewed: 2026-06-24
code_paths:
  - scripts/refresh-jobs.ts
  - scripts/lib/ats-fetchers.ts
  - supabase/functions/_shared/metrics.ts
---

# Runbooks

When something breaks or looks off, start here. Each entry is a known failure mode, how to recognize it, and what to do.

> The recurring theme across this project's incidents: **things break silently and look fine until someone notices.** Most outages here shipped green and rotted quietly. The single highest-value habit is watching the signals below proactively, not waiting for a user to report it.

## The live-jobs database looks stale or empty

**Symptom:** few or no live job matches; the board looks thin.
**Likely cause:** the nightly job-refresh failed, or an ATS changed its format and an adapter is silently returning nothing.
**Check:** the GitHub Actions run for the refresh job; the `function_metrics` / job counts. A single ATS changing its URL format can wipe a chunk of inventory (this has happened — a Workday format change returned HTTP 406 on every job until a human noticed).
**Fix:** find the failing adapter in `scripts/lib/ats-fetchers.ts`, confirm against the real endpoint with one request, repair the URL/parse, re-run the refresh.

## A new job source returns nothing useful (or the wrong country)

**Symptom:** a newly added source yields suspiciously high or zero IL results.
**Lesson (learned the hard way):** never trust a source's marketing claims. Before shipping any new job source, fetch a handful of real rows and confirm their actual location field is in Israel — a past source matched "Israel" to US towns and silently fell back to global inventory.

## AI features failing or slow under load

**Symptom:** an edge function returns errors or runs much longer than usual.
**Likely cause:** the upstream language-model API is rate-limiting under concurrent load — common during a spike (e.g. many students onboarding at once).
**Check:** the function's `function_metrics` — an execution time well above normal followed by a failure means it tried, retried, and gave up; the function isn't broken, the upstream is throttling.
**Fix / prevention:** functions that make multiple sequential model calls need adequate retry budgets. Any change that increases concurrent model usage should be load-considered first.

## A generated CV/score shows wrong or corrupted content

**Symptom:** a CV repeats the wrong institution, a score reads "1%", a field is blank for some users.
**Likely cause:** an **LLM ↔ code contract drift** (the model's output shape and the consuming code disagree) or a **0–1-vs-percent** display bug. Both are documented, repeat patterns.
**Check:** the [lessons log](../../tasks/lessons.md) — these exact classes are in there with the fixes. For scores: confirm the value is being multiplied to a percent before display.

## Company logos show a broken/generic icon

**Symptom:** grey generic icons instead of real logos or clean placeholders.
**Cause & fix:** documented in [ADR 0002](../decisions/0002-company-logo-sourcing.md) — DuckDuckGo's generic-icon quirk. The component already rejects it; if it regresses, that detection is the place to look.

## Local sign-in fails with a captcha error

**Cause:** Turnstile doesn't have `localhost` in its allowed hostnames.
**Fix:** add it in the Cloudflare Turnstile dashboard, or use the DEV `/_preview/*` routes which don't require sign-in.

## The general principle

The product's dominant failure mode is **invisible breakage**. Wire alerting on the `function_metrics` failure signals so the team finds out before users do — this is the most-recommended improvement in the project's own assessments.

---

*Related: [deployment](deployment.md) · [lessons](../../tasks/lessons.md) · [AI & edge functions](../engineering/ai-and-edge-functions.md).*
