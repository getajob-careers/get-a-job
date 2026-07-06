# Session Handoff — 2026-06-02 (app-wide redesign rollout, mid-LinkedIn)

This continues the page-by-page redesign of Get A Job. Each page ships as its own scoped PR. Warm cream / rd-token design system (Rokkitt serif headers, coral/teal/golden palette). Mockups live at `docs/design/redesign/getajob_*.html` (also readable at `/mnt/project/getajob_*.html`).

## The working loop (how we operate)

1. CC builds on a branch and **surfaces a build plan before opening the PR** (for complex pages) or before pushing.
2. Eli greenlights → CC pushes + opens the PR (**never auto-merge**).
3. **Claude.ai verifies the branch**: fetches raw files from the PR branch, greps the preservation contract, renders the preview PDF, and does a side-by-side against the mockup. (Eli relies on this because the Vercel preview is auth-gated and **doesn't work for him** — see below.)
4. Eli merges → CC squash-merges + verifies the Vercel deploy fired → reports SHA + deploy status.

**Standing instruction (memory):** after verifying each PR, Claude gives Eli **ONE combined paste-to-CC prompt** = (a) merge + deploy-verify for the reviewed PR + (b) the next page's build/investigate prompt. Don't ask whether to hold.

**Verification recipe Claude uses:**
```
curl -fsSL "https://raw.githubusercontent.com/getajob-careers/get-a-job/<branch>/<path>?t=$(date +%s)"
# grep preservation contract (write paths, RLS belts, CSS teardown)
# fetch docs/design/redesign/previews/<page>.pdf → render with PyMuPDF → compare to mockup
```

## Hard-won rules established this session

- **Vercel silent-webhook miss:** PR #221 merged but Vercel never fired (zero statuses, not a build error). Fix = push an empty commit to retrigger. **Always verify the deploy fired after every merge**; empty-commit retrigger if no status within ~5 min.
- **Eli can't reach auth-gated Vercel previews.** All write-path smoke-tests run on **production** after deploy (prod is public). Risk is acceptable because the pilot isn't open yet and rollback is a single revert.
- **Typecheck baseline ratchets DOWN only.** Progression this session: 419 → 413 (Profile) → 411 (Calendar) → 406 (3J-A) → **405 (current ceiling, after 3J-B)**. Never increase it.
- **restyle-only-on-behavior:** live file is authoritative; mockups are visual-only. Where a mockup encodes a feature/IA change, FLAG it as a design question — don't build it.
- **Shared injected-CSS teardown pattern:** a page that injects a shared `*_CSS` file can only retire it once no other page consumes it. Gated by a repo-wide grep before deletion (zero consumers), else STOP.
  - `profileStyles.js` → **retired in 3G (Story Bank).**
  - `activityStyles.js` → **stays** until Calendar AND Internship both ship (Calendar done; Internship pending). Tasks + Calendar each dropped their own injection.
  - `linkedinStyles.js` (LI_CSS) → **retires in 3J-C** (the last LinkedIn sub-PR), gated grep.
- **LinkedIn is the fidelity priority** — match the 3 mockups closely (exact Rokkitt weights, radius cluster, message-bubble radius asymmetry). Brand-blue `#0A66C2` is confined to the **LinkedIn-simulacrum surfaces only** (profile preview, feed-card hashtags); rd-coral everywhere else.

## Rollout status

**Merged + deployed live:**
| Page | PR | Notes |
|---|---|---|
| Onboarding / Shell / Home / Roadmap | #217–#220 | pre-session |
| Jobs | #221 | needed the empty-commit deploy retrigger |
| Tracker (3E) | #222 | row-list restyle, grouped 7-step checklist, rdColor track pills |
| Profile (3F) | #223 | 6 tabs kept; P9 recompute-after-write invariant preserved |
| Story Bank (3G) | #224 | `profileStyles.js` teardown completed |
| Tasks (3H) | #225 | `activityStyles.js` retained; Tasks+Calendar merger declined |
| Calendar (3I) | #226 | no dedicated mockup → rd-system; merger declined again |
| LinkedIn Profile (3J-A) | #227 | hybrid pane, Copy-all blob, brand-blue in simulacrum |

**Verified, awaiting merge:**
- **LinkedIn Posts (3J-B) — PR #228.** Code + visual verified clean (P4–P8 byte-equivalent incl. P8 confirmed identical to main; pills full-round; feed-card matches mockup). Typecheck 405. The combined **merge-#228 + build-3J-C** prompt has already been handed to Eli.

**Next (prompt already issued):**
- **LinkedIn Networking (3J-C)** — the showpiece + final LinkedIn sub-PR. Branch `eli/redesign-linkedin-networking`. Carries: Q4 (drop mockup's "Why this works:" line — no honest field backs it; **preserve `warm_up_advice` corrective banner restyled in place**, keep cautionary), Q5 (affirmative chips client-derived from `warnings.length===0`, **no hardcoded unverified claims** — anti-fab), and the **gated LI_CSS teardown** (delete `linkedinStyles.js` + drop injection/.li wrapper from `Linkedin.jsx` only after repo-wide grep shows zero `.li-*` consumers). Preserve P9–P14. CC to surface the build plan before opening the PR.

**Remaining pages after LinkedIn:** Chat → Internship → Resources → Settings → Landing.

## Deferred backlog (in tasks/redesign.md)

- Profile 5-tab IA consolidation; Profile Strength card; Languages tab (all feature changes flagged out of the Profile restyle).
- Tasks + Calendar tab merger (mockup IA; revisit post-launch).

## Open non-redesign threads

1. **CV-gen title bug (post-redesign).** `generate-tailored-cv` mislabels experience titles — renders every experience's title+company identically (Eli's CV showed both roles as "Creator, Get a Job" although Guardio is correctly stored as "Customer Success Specialist – VIP Team" in the `experiences` table — verified via Supabase). **Confirmed a GENERATION bug, not data.** Dates+bullets pair correctly per role; only title/company is mis-sourced. Suspect the authoring-step experience→title binding OR a variable-reuse/closure bug in the rebuilt pdf-lib render loop. Investigate-first prompt drafted (data correctness already confirmed). Needs `supabase functions deploy generate-tailored-cv` after fix. Deferred to after the redesign.

2. **Outreach generator quality (IMPORTANT, pending diagnosis).** Eli: `generate-linkedin-outreach-message` is "very bad at its job." This is a generator-quality problem (lives in the prompt / `OUTREACH_VOICE_RULES` / outreach-frameworks / ask-temperature) — **separate from the 3J-C visual restyle**, which won't fix it. Blocked on Eli's read of *how* it's failing (options put to him: generic/templatey · wrong tone · ignores goal/context · ask mistimed). Once the failure mode is known, target the matching lever.

3. **Q8 — `propose_internship` CHECK bug (live).** `linkedin_outreach_conversations` goal CHECK constraint (migration 20260506) lacks `propose_internship`, but the client ships it as a 9th goal AND it's the goal the Practicum "Open in Outreach Coach" prefill sends → **23514 on the Reichman practicum path.** Fix = tiny migration PR adding it to the CHECK. Keep OUT of any restyle PR. May need `supabase migration repair` first (known remote/local migration-history divergence).

4. **Jobs page bugs (flagged, standalone PR — post-redesign or slot-in).** (1) "X roles on Track" count shows the *rendered* count, not the track total → undersells matches before "load more." (2) Load-more inconsistent (loads 1 vs 4, sometimes needs two presses) — likely dedup-after-fetch and/or offset/cursor not advancing synchronously. (3) Track-switch is slow (~1–2s) — each switch refetches with no client cache; fix = put track in the TanStack query key + prefetch the other tracks. All three need an investigate-first code read (esp. #2).

## Immediate next action

Eli sends the already-issued combined prompt → CC merges #228 (verify deploy), then builds 3J-C and surfaces its build plan. When that plan returns, Claude reviews it → greenlight push → Claude verifies the branch (P9–P14 byte-equivalent, the gated LI_CSS teardown grep, preview vs the networking mockup) → Eli merges. That completes LinkedIn; then on to Chat.