# Session Handoff, 2026-07-02: CV System Full Fix Complete, Launch Readiness QA In Progress

## Context
Launch (browser extension + outreach) is PAUSED on Eli's hard gate: "we are not pushing the extension until our platform fully works the way it's supposed to." This session completed the CV-system full fix, closed the English/voice guarantee on all high-exposure surfaces, fixed the coach-chat generation flow, and ran QA audit round 1. Next session: deep QA pass 2 + fix everything it finds, then launch.

## Workflow rules (unchanged, do not drift)
Eli scopes in Claude.ai -> Claude.ai drafts paste-ready CC prompts -> CC builds and HOLDs -> Claude.ai independently verifies (Supabase MCP, deployed-source grep, live endpoints) -> Eli approves merge. Edge functions NEVER auto-deploy: every fix needs `supabase functions deploy <fn> --project-ref ilmqmodklutztuybsvwd` plus a deployed-source grep. Never trust CC self-reports. No em dashes anywhere. Squash-merge, delete branch, confirm merged:true. Two terminals: only one may write a given code path; read-only investigations parallelize. Eli tests the live product himself before trusting any fix; this caught real bugs repeatedly, including one of Claude's own false claims.

## What shipped and is LIVE (deployed-source verified)
- **CV full fix, Pieces 1-5** (PRs #465-#468): shared canonical cv-schema.ts; deterministic normalizeBulletVoice in buildMasterCvData (voice/caps, content-preserving, idempotent); deterministic skills categorization cv-skills.ts (union profile.skills + experiences[].skills, dictionary, caps 16/10/12, never invents) + restored richness (honors/coursework/projects/certs, conditional); RENDER CHOKEPOINT in render-cv (normalizeCvDataBullets + Hebrew gate + stripCvHebrew no-key fallback, guarantees no PDF ships raw voice or Hebrew from ANY path); normalize-on-write in setBullets/appendBullets + extras-parity on all master-build paths. Deployed: refine-cv v23, generate-tailored-cv v139 (v140+ after coach fix deploy), render-cv v9.
- **Three-bug fix #464**: chat-path 404 fallthrough, PUNCT_FALLBACK precedence (en-dash tofu -> ASCII hyphen), LANGUAGE_GUARD on all coach agents.
- **Fit assessment #469** (analyze-job-match v55): second-person + deterministic gated translateCvToEnglish. Second-person half VERIFIED LIVE (KPMG run 22:50). Hebrew-translate half still needs one live run (see Pending).
- **Career analysis + tasks #470** (generate-career-analysis v106, generate-tasks v68): second-person + English gate. VERIFIED LIVE via Refresh Analysis read-back (second person, English, substance intact, scores exact).
- **Onboarding extension prompt #463**: final onboarding step prompts extension install while logged in ("keep this tab open"), skippable. Solves the cold-install gate for launch funnel traffic.

## Coach-chat CV generation fix (branch approved this session, verify deploy completed)
Branch eli/coach-cvgen-honest-accept, 4 commits, deploy split:
- Server+website (deploy NOW): plain-language acceptance -> ai-chat emits suggested_cv_generation -> clients AUTO-FIRE the pipeline; honesty rule + deterministic stripUnbackedCvGenerationClaim (coach can never say "generating" without an emitted action); ADD 1 P0 null fix (coachActionHandlers omits application_id when null AND generate-tailored-cv treats null as undefined, kills the 400 on non-tracked roles); ADD 2 clean failure cards (no raw error, no dead View button, Try again everywhere).
- Extension commits (e0e8837, ea08afa): auto-fire + echo removal + clean failures. QUEUED for next Chrome Web Store submission alongside the cold-install gate fixes (recorded in CC memory). DO NOT submit extension yet.
- Post-deploy live e2e still owed: Eli triggers fit read on non-tracked role, accepts in plain language; CC pulls chat_messages to confirm auto-fire, no 400, CV card, no unbacked "generating" claim.

## English/voice guarantee coverage map
Guaranteed: CV PDF (render chokepoint, deterministic), coach (#464), fit read (#469), career analysis + tasks (#470).
Deferred as ONE post-launch PR (recorded in CC memory english-voice-guarantee-completion-pr.md): daily-action/cron (shared core, persists, two callers), internship tools (profile generator also needs second-person), story bank notes, edit-cv returned message. Deliberately excluded: LinkedIn generators (output language follows user intent).

## QA round 1 results (/tmp/full-qa-audit.md on the audit terminal)
- P0: coach-chat gen 400 on null application_id -> FIXED in the coach branch above.
- P1s: Home cold load 8.5s no skeleton; login submit disabled with no reason during Turnstile load; studio downloads named render_<timestamp>.pdf; false "Generating now" (fixed); raw-error card (fixed). A drafted prompt exists for the filename + login-state + Home-skeleton trio (send to a free terminal).
- P2 queue: cookie banner over hero stats (tell Isaac, landing page), Home "Live matches shows dash", dense onboarding step 2, /Internship->Home redirect.
- Clean: zero console errors, zero failed requests, no overflow, 14 routes x 2 viewports.
- Coverage gaps (why deep pass 2 is needed): onboarding steps 3-6 incl. extension prompt, roadmap-gated flows (job browse -> add-to-tracker -> generate-from-tracker), edit->regenerate, and the element-by-element coverage table was never produced. Auth is Cloudflare Turnstile + Supabase captcha: automated login impossible; the method is Eli pastes the demo-account localStorage token sb-ilmqmodklutztuybsvwd-auth-token; tokens expire ~1h, expect re-paste mid-run. Demo account was seeded: onboarding_complete=true set, one education row created (harmless, kept).

## Pending, Eli's human half (quick, still owed)
1. #2657 Hebrew JD through the EXTENSION (fires analyze-job-match) -> CC pulls and verifies the deterministic Hebrew->English translate live. Closes #469 fully.
2. Eyeball the KPMG CV quality: capitalized verb-led bullets, SQL/Python in technical group, real hyphens.
3. QA E19-21 by hand: edit profile bullet casually lowercase -> regenerate -> appears normalized.
4. Onboarding 3-6 with a fresh signup, incl. the extension prompt rendering.
5. Post-deploy coach e2e trigger (see coach fix above).

## Next session plan
1. Verify the coach-branch deploy completed (ai-chat + generate-tailored-cv markers, Vercel).
2. Send the filename/login/skeleton trio prompt to a free terminal.
3. Run DEEP QA PASS 2 (prompt drafted, needs Eli's known-suspect bug list filled in + fresh demo token): first act generates a career analysis on the demo account to unblock gated flows; mandatory flows round 1 missed; the full element coverage table (every interactive element x 5 checks: responds <200ms, keeps its promise, outcome visible, double-click safe, humane error path); severity discipline P0/P1/P2.
4. Triage deal: P0s block launch and all get fixed; core-flow P1s fixed; rest queued. Do not let deep QA become a week of polish.
5. Launch gate when green: Eli's 34-point CV QA core (A voice, B6 skills, C9 hyphens, D15-16 Hebrew, E19-21 propagation, F24 chat-gen) + P0-free platform.

## Launch assets (staged, ready, waiting on the gate)
Outreach final: 2 emails (subject "New Get A Job Browser Extension is Live!!", signed Eli), WhatsApp, LinkedIn (fuller narrative, "not scraped" line CUT), landing copy. Numbers 5,700+ jobs / 500+ companies. Extension link chromewebstore.google.com/detail/get-a-job/cnlgglikhomodkjpidaoigajonnbhlii (strip authuser params). Outreach leads with the SITE, extension framed as add-after-signup. Hero screenshot: shoot AFTER output confirmed clean, Eli trusting his gut on LinkedIn framing (extension is paste-in only, do not imply page-reading).

## Queued post-launch (do not lose)
Extension store submission bundle: cold-install gate fixes + coach auto-fire commits. English-guarantee completion PR (surfaces above). Speed sprint: streaming + parallelize JD-extraction with master load. Tailoring aggressiveness (the 4-reword cap, #437 design choice). Dedup embedding upgrade. P2 polish list. PostHog user-friction analysis + P0 instrumentation events (cv_generated etc.). CC tooling evaluation (claude-mem first, scratch repo only; Ruflo rejected for now, swarm model conflicts with the verify-everything discipline).
