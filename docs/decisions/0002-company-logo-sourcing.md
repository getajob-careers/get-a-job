---
title: ADR 0002 — Company logo sourcing
status: living
owner: isaac
last_reviewed: 2026-06-24
code_paths:
  - src/components/jobs/CompanyLogo.jsx
  - src/lib/queries/useCompanyDomains.js
---

# ADR 0002 — How we source company logos

**Status:** Accepted

## Context

Job and pipeline cards showed a colored letter-square placeholder for every company, because our `jobs` data stores a company name and slug but no logo. We wanted real logos where possible, with a clean fallback otherwise.

We have one asset that makes this possible: the `companies` registry stores a **domain** for each company, and a logo can be fetched from a domain via a logo service.

## Decision

Resolve each company's domain from the registry (matching the job's slug to the company's ATS slug, with a company-name fallback), then fetch a logo through a **cascade** of sources, each falling back to the next on failure:

1. **logo.dev** — real, crisp logos — used only when a `VITE_LOGODEV_TOKEN` is configured.
2. **DuckDuckGo's icon service** — tokenless, real favicons — the default that works with no setup.
3. **The letter-avatar placeholder** — the prior behavior, for companies with no logo at all.

The domain lookup is one cached query shared across all cards.

## Why not Clearbit

The obvious choice was Clearbit's logo API — but it's **dead** (the endpoint no longer resolves; the service was shut down). We confirmed this by probing it live before building, rather than discovering it in production. This is why the cascade is built around logo.dev (the maintained successor) and DuckDuckGo instead.

## Consequences

- Works today with **no setup** (DuckDuckGo tier); upgrades to crisp logos with a free token.
- Coverage measured at ~73% of active jobs resolving a real logo; the rest show the clean placeholder — no regression, since the placeholder was the prior state for everyone.
- One quirk to know: DuckDuckGo returns a generic 48×48 grey-chevron image (as an HTTP 404 with a renderable body) for domains it lacks; the component detects and rejects that so it falls through to the letter avatar instead of showing a broken-looking icon.

## Related

- [The job pipeline / market](../domain/israeli-market.md) · [runbooks](../operations/runbooks.md)
