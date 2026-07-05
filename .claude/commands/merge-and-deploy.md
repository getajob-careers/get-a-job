---
description: Squash-merge a PR, deploy any touched edge fns, and report LIVE plus the rollback target.
---

Merge and deploy PR #$ARGUMENTS. Steps, in order:

1. Capture the ROLLBACK TARGET first: the current prod commit, its Vercel deployment id, and the current versions of any edge fns the PR touches.
2. Squash-merge the PR (use the REST endpoint if GraphQL is rate-limited). Confirm merged is true.
3. Delete the branch as a SEPARATE step.
4. Sync main; poll the merge commit's Vercel PRODUCTION status to success; capture the NEW deployment id.
5. For each `supabase/functions/<slug>/` the PR touched: deploy via the deploy-edge-fn ritual (`--project-ref ilmqmodklutztuybsvwd`) and grep-verify the change in DEPLOYED source; record the new version.
6. Reply "LIVE" with: new commit + new Vercel deployment id + fn versions, AND the rollback target (predecessor commit + deployment id + prior fn versions) so promote-back is one step.

Never push to main directly; the squash-merge is the only path to main.
