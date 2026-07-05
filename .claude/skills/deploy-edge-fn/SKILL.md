---
name: deploy-edge-fn
description: Deploy a getajob Supabase edge function and verify the change shipped in DEPLOYED source. Use after a PR touching supabase/functions/* is merged (deployed does not equal merged).
disable-model-invocation: true
---

# deploy-edge-fn

Deployed does not equal merged. After a PR that changes `supabase/functions/<slug>/` merges to main, the function is NOT live until deployed. Args: `<slug> [grep-string]` (e.g. `ai-chat "The CV block is a PROPOSAL"`).

1. `git checkout main && git pull --ff-only origin main`.
2. `supabase functions deploy <slug> --project-ref ilmqmodklutztuybsvwd`. Retry the transient `deno.land/std` bundler timeout (infra, not a code error).
3. Verify DEPLOYED source, not local: fetch the deployed function body and grep for `<grep-string>` (the line your change added); confirm count is at least 1. A slug that imports `_shared/*` rebundles the shared code on deploy, so shared changes ship with any dependent redeploy.
4. Report: slug, new version, and the grep result.

Project ref `ilmqmodklutztuybsvwd` is getajob-specific. `verify_jwt` pins live in `supabase/config.toml`.
