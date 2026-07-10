---
name: pr-conventions
description: The getajob PR + change-shipping ritual (held-PR pattern, squash-merge + delete branch, deploy is separate, no em dashes, state-lifecycle tests, clean diffs). Use whenever opening, reviewing, merging, or deploying a PR, or shipping any change to main.
---

# pr-conventions

How we ship changes on getajob. Follow this whenever you open, review, merge, or deploy a PR — or push anything to `main`.

## 1. Held-PR pattern

Build → get all gates green → **hold**. Do not merge until Eli (or Isaac) has approved. State plainly that the PR is HELD and name the eval gate the reviewer should check. Never self-merge a substantive change on your own authority; a held PR waits for a human "go".

## 2. Merge mechanics

- **Squash-merge** to keep `main` linear.
- **Delete the branch as a separate step**, not in the merge command — the `gh pr merge --delete-branch` compound has misfired here; merge first, confirm, then delete.
- **Confirm the merge landed**: check `state: MERGED` and capture the merge commit SHA. Update local `main` (`git fetch` + `git merge --ff-only`) before deploying from it.

## 3. Deploy is a separate step — deployed ≠ merged

A merged PR is not live. For edge functions, defer to the **`deploy-edge-fn`** skill: bundle from local `main`, `supabase functions deploy <slug> --project-ref ilmqmodklutztuybsvwd`, then **fingerprint-verify the DEPLOYED bytes** (grep the live function body for a line your change added; count ≥ 1). A slug importing `_shared/*` rebundles shared code, so shared edits ship with any dependent redeploy. For frontend, confirm the Vercel production deployment is `READY` **on the merge commit** (later commits on top also carry your change).

## 4. No em dashes anywhere in shipped output

CV content, UI copy, and rendered documents use `" - "` (or a restructured sentence), never the em dash (U+2014) — it reads as AI-generated. The `scrubCvVoice` chokepoint enforces this on CV data across gtc/refine/edit; the repo-wide UI-copy rule enforces it in `src/`. **En dashes** (U+2013, date ranges) are fine and must be preserved. Code comments and `console.*`/dev strings are exempt (developer-facing). Empty-value placeholder glyphs (`|| "—"`, table empty cells) are intentional — leave them.

## 5. State-lifecycle frontend changes need an initial-load browser test

Any change to a component's model/selection/effect lifecycle needs a **first-render** test — specifically the warm-cache path — because a silent logic hang throws nothing and passes build + unit + lint (the #546 `/CVAgent` permanent-spinner outage). The test must be proven to **fail on the broken code and pass on the fix**. One writer per piece of state: if a value needs a reset, do it in the same effect (else-branch), never a second effect on the same dependency.

## 6. Keep diffs clean

A Prettier `PostToolUse` hook reflows whole `.jsx`/`.js` files on every `Edit`/`Write` (there is no `.prettierrc` and CI does not run Prettier, so the reflow is unwanted noise). For mechanical or sweeping edits that would trigger a large reflow, **revert the touched files and re-apply the change via a Bash/Python script** (which does not fire the Edit hook) so the diff shows only the real change. A repo-wide sweep should read as its actual edits, not thousands of reflow lines.

## 7. Gates before "done"

Run and confirm — do not assume — before claiming a PR is ready: `npm test`, `npm run build`, `npm run lint`, and `deno check --node-modules-dir=auto <slug>` on any touched edge function. Report failures with their output. When a claim is about security, schema, or indexes, verify against the live system (see the `verification-before-completion` discipline and CLAUDE.md's "Verification before completion").

## Precedence

Per CLAUDE.md: an explicit prompt from Eli wins, then CLAUDE.md, then this skill. This encodes the default ritual; a direct instruction to do otherwise (e.g. "commit straight to main") overrides it.
