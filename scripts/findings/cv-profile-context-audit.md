# CV / profile-context audit: are experience bullets reaching the LLM?

Branch: `eli/cv-profile-context-audit`. Read-only investigation, no code changed.
Date: 2026-06-23. Trigger: Samsung Product Specialist CV omitted Eli's Guardio achievement bullets; the ai-chat agent claimed it only has experience metadata (title, company, id), not bullet content.

## Verdict (TL;DR)

The agent's claim holds up. It is NOT a hallucination.

- Eli's Guardio achievements are stored in the `experiences.bullets` array column (14 bullets). This is the column the chat "add X to my CV" capture loop (Phase 1b, PR #321) writes to.
- NO read path consumes `experiences.bullets`. Both generate-tailored-cv and ai-chat fetch the column via `select("*")`, then drop it when building LLM context. generate-tailored-cv builds CV bullets from `responsibilities`; ai-chat emits only `title at company [id]`.
- This is a known, documented gap, not an accident: the ai-chat code carries a comment saying "nothing reads experiences.bullets for output yet ... reinstated in Phase 4." Phase 1b (write) shipped; the Phase 4 read side never did.

So both observed behaviors trace to one root cause: a write-only column. The CV under-grounded because the richest Guardio content lives in a column CV-gen never reads. The chat agent honestly reported the same gap.

---

## Section 1: what is in the DB (live evidence)

Live query against `ilmqmodklutztuybsvwd`, row `5aed1c1c-344d-48d1-8a07-059fd7568fb0`.

Schema (no separate bullets table exists; bullets are a column on `experiences`):

| column             | type           |
| ------------------ | -------------- |
| `bullets`          | ARRAY (text[]) |
| `responsibilities` | text           |
| `skills`           | ARRAY (text[]) |

There is NO `description` column on `experiences` (relevant to Section 5).

Row identity: `Customer Success Specialist - VIP Team` at `Guardio`, `type=part_time`, `2025-10-19` to `Present`.

`bullets` holds 14 specific, high-signal achievements. First clauses, verbatim (truncated at the first separator to keep this doc clean):

1. "Took the initiative to lead a project in collaboration with the product growth team, focusing on quality assurance for our AI customer service voice/retell bot. ..."
2. "Redesigned the social media auto moderation system from scratch and developed a new automation and moderation framework. ..."
3. "Designed and implemented an AI bot using Cursor and Claude to assist VIP team agents. ..."
4. "Conducted in-depth data analysis on various issues faced by VIP users ..."
5. "built a QA pipeline for the AI voice bot ..."
6. "Led a cross-functional QA project with the product growth team on an AI customer-service voice bot ..."
7. "Built an internal AI assistant (Cursor + Claude) for the VIP team ..."
8. "Redesigned the social-media auto-moderation system from scratch into a new automation and moderation framework ..."
9. "Analysed thousands of VIP user journeys using SQL, identifying that authorization charge notifications were causing users to believe they were being charged multiple times. ..." (notes Guardio discontinued free trials)
10. "wrote a fetcher in Python ..."
11. "I am comparing Claude, OpenAI, Gemini, and others in a bake-off using scoring rubrics ..."
12. "Analyzed comments on social media platforms over 3 months and created keyword triggers for responses ..." (60% within a week, 98% relevance)
13. "analyzed all our comments on social media platforms over 3 months and found the gaps in our coverage ..."
14. "Built a structured onboarding sequence and an escalation playbook for the VIP team ..."

`responsibilities` holds generic VIP-support prose plus a few overlapping lines. Verbatim opening:

> "Provide high-touch, personalized technical and product support to VIP customers.\nGuide users through onboarding, configuration, and feature usage ...\nResolve complex user issues efficiently ...\nManage multiple simultaneous cases ...\nMaintain long-term relationships ...\nBuilt an automated social media monitoring system using keyword triggers and comment analysis, achieving 98% content relevance ...\nLed evaluation of AI language models (Claude, OpenAI, Gemini) ...\nDesigned and deployed AI-assisted workflows ...\nOwned end-to-end onboarding for VIP users ...\nActed as the internal voice of the customer ..."

Key point: the most specific, resume-worthy achievements (the Cursor+Claude VIP bot with real-time analytics, the SQL authorization-charges discovery that ended free trials, the Python customer-risk fetcher, the 60% response lift, the QA pipeline for the voice bot, the onboarding/escalation playbook with churn impact) exist ONLY in `bullets`. `responsibilities` is a thinner, partly-overlapping superset of generic duties. A CV built from `responsibilities` alone is exactly the under-grounded output Eli saw.

`skills` is richly populated (60+ entries incl. SQL, Python, Cursor, Claude, NapoleonCat, Stakeholder Management) and IS consumed by CV-gen (see Section 2), which is why some Guardio flavor survives even though the bullets do not.

---

## Section 2: generate-tailored-cv profile-fetch and usage

Fetch (pulls everything, bullets included in the row objects):

`supabase/functions/generate-tailored-cv/index.ts:445`

```ts
const [profileRes, experiencesRes, projectsRes, certificationsRes] =
  await Promise.all([
    supabase
      .from("profiles")
      .select("*, education(*)")
      .eq("id", user.id)
      .single(),
    supabase.from("experiences").select("*").eq("user_id", user.id), // line 452
    supabase.from("projects").select("*").eq("user_id", user.id),
    supabase.from("certifications").select("*").eq("user_id", user.id),
  ]);
```

The fetch is fine. The drop happens at the mapping step. `mapExperience` is what gets serialized into the LLM payload, and it does NOT include `bullets`:

`supabase/functions/generate-tailored-cv/index.ts:986`

```ts
const mapExperience = (exp: any) => ({
  title: trunc(exp.title, 100),
  company: trunc(exp.company, 100),
  start_date: trunc(exp.start_date, 20),
  end_date: trunc(exp.end_date, 20),
  is_current: exp.is_current,
  responsibilities: trunc(exp.responsibilities, 4000), // line 995 - the only prose source
  skills: safeArray(exp.skills)
    .slice(0, 40)
    .map((s) => trunc(s, 60)),
  type: trunc(exp.type, 50),
  bucket: classifyExperience(exp),
});
```

There is no `bullets:` key in the mapped object. The prompt itself reinforces this: `responsibilities` is declared the bullet source.

`supabase/functions/generate-tailored-cv/index.ts:1606`

```
- experience.responsibilities is the PRIMARY source for bullets. Stories and proof_signals are ENRICHMENT only ...
```

The server-side reconciliation step confirms the same. The source contract has no bullets field, and when the LLM returns no bullets for a slot the fallback splits `responsibilities`, never `bullets`:

`supabase/functions/generate-tailored-cv/reconcile.ts:23`

```ts
export interface SourceExperience {
  title: string;
  company: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  responsibilities: string; // no `bullets` field
}
```

`supabase/functions/generate-tailored-cv/reconcile.ts:223`

```ts
return sources.map((src, i) => {
  let bullets = bulletsBySource.get(i) || [];
  if (bullets.length === 0) {
    bullets = responsibilitiesToBullets(src.responsibilities);   // line 226 - falls back to responsibilities, never to source bullets
  }
  ...
```

Note: the many `e.bullets` reads elsewhere in index.ts (lines 2024, 2468, 2916, 2962, 3078) all operate on LLM-generated / reconciled output bullets, not the source `experiences.bullets` column. The source column is read nowhere in this function.

Conclusion for Section 2: generate-tailored-cv fetches `bullets` but never feeds it to the model. CV bullets are synthesized from `responsibilities` + `skills` + stories/proof_signals. Eli's 14 Guardio bullets are invisible to it.

---

## Section 3: ai-chat profile-fetch and usage

Fetch (again pulls everything via `*`):

`supabase/functions/ai-chat/prompt-lib.ts:611`

```ts
const [profileRes, experiencesRes, careerRolesRes] = await Promise.all([
  svc.from("profiles").select("*, education(*)").eq("id", userId),
  svc.from("experiences").select("*").eq("user_id", userId), // line 613
  svc.from("career_roles").select("*").eq("user_id", userId),
]);
```

The context builder then emits only top-level metadata per experience:

`supabase/functions/ai-chat/prompt-lib.ts:625`

```ts
if (experiencesRes.data?.length) {
  userContext += `\n- Experience: ${experiencesRes.data.map((e: any) => `${e.title} at ${e.company} [id: ${e.id}]`).join(", ")}`;
}
```

This is verbatim what the agent reported: title, company, id. No `bullets`, no `responsibilities`, no `skills`, no `description` reach the model. The intent is documented in the call site:

`supabase/functions/ai-chat/index.ts:220`

```ts
// (The Phase-1b bullet capture does NOT use a
// post-save follow-up: nothing reads experiences.bullets for output yet,
// so there's no honest CV-regen to offer - reinstated in Phase 4.)
```

Conclusion for Section 3: ai-chat fetches `bullets` and `responsibilities` but injects neither into the prompt. The agent literally only has `title at company [id]`. Its honesty was accurate.

---

## Section 4: diagnosis - does the agent's claim hold up?

Yes. The claim "I can see your experiences and their IDs, but I don't have the actual bullet content or stories saved under each experience in my current context - only the top-level metadata (role title, company, ID)" is a precise description of `buildUserContext` output at `prompt-lib.ts:625`. Not a hallucination.

Mapping to the original branch points in the task:

- "If neither pulls bullets into context, this is a P0 platform-wide bug." This is the case. NEITHER generate-tailored-cv NOR ai-chat injects `experiences.bullets` into the model. Severity is P1 in practice (responsibilities + skills still ground a decent CV), but the symptom is real and platform-wide for anyone who saved achievements through the chat capture loop.
- Both observed behaviors share ONE root cause: `experiences.bullets` is a write-only column. PR #321 / Phase 1b shipped the writer ("add X to my CV" proposes, confirms, writes a bullet). The read side was explicitly deferred ("reinstated in Phase 4") and never landed. So the chat loop tells the user the bullet was saved (true, to `bullets`), but no generator reads it back.

Why some Guardio signal still survives in a generated CV: `skills` IS consumed (Section 2), and a few achievement lines were ALSO duplicated into `responsibilities` (the 98% relevance line, the AI model evaluation line). So the CV is not empty of Guardio content; it is missing the specific, quantified, recently-captured bullets, which is exactly the complaint.

---

## Section 5: scope of impact

Audited the profile-fetch and usage path of every edge function that reads experiences.

| Function                    | experiences fetch                                                                | bullets reach LLM? | responsibilities used?                                               | notes                                                                                                                   |
| --------------------------- | -------------------------------------------------------------------------------- | ------------------ | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| generate-tailored-cv        | `select("*")` (index.ts:452)                                                     | NO                 | YES (primary, index.ts:995/1606)                                     | bullets dropped at mapExperience                                                                                        |
| ai-chat                     | `select("*")` (prompt-lib.ts:613)                                                | NO                 | NO                                                                   | emits only `title at company [id]` (prompt-lib.ts:625)                                                                  |
| generate-career-analysis    | `select("*")` (index.ts:755)                                                     | NO                 | YES (index.ts:792 `responsibilities: trunc(e.responsibilities,300)`) | bullets dropped at sanitisedExperiences; lower severity (skill matching, not CV text)                                   |
| generate-internship-profile | `select('id, title, company, description, start_date, end_date')` (index.ts:154) | NO                 | NO                                                                   | selects neither bullets nor responsibilities; also selects `description`, which does NOT exist on the table (see below) |
| extract-proof-signals       | does not query experiences at all (0 references)                                 | n/a                | n/a                                                                  | works off stories + profile, not experiences                                                                            |

Two distinct findings fall out of the scope audit:

1. Platform-wide bullets gap (the subject of this doc): four functions read experiences; none inject `experiences.bullets`. The write-only column is the shared root cause.

2. Secondary bug in generate-internship-profile: `index.ts:154` selects a `description` column that does not exist on `experiences` (confirmed against `information_schema`). PostgREST will either error or silently return the row without that key, so the internship-profile grounding corpus gets neither bullets, responsibilities, NOR a usable description from experiences. It is effectively grounding on title + company only for the experiences slice. Worth a separate ticket; not the Guardio root cause but it is in the same family (experience content not reaching the model).

### Relationship to the CV title-mislabel bug (queued post-redesign)

Same file, related machinery, DIFFERENT root cause.

- The title-mislabel bug lives in the index-based join in `reconcile.ts`: the LLM echoes only `{index, bullets}` and the server stamps `title`/`company`/`dates` from the source row by matching that index (`fillFromSource`, reconcile.ts:223; call sites index.ts:2100+). When the LLM emits an out-of-range or duplicate index, the positional-fallback / unclaimed-entry paths (reconcile.ts:181-221) can attach bullets to the wrong source slot, so bullets render under the wrong role title. That is a misrouting-within-the-read-path bug.
- The bullets gap in this doc is upstream of all that: the `bullets` column never enters the read path in the first place. mapExperience never includes it, SourceExperience has no field for it.

They share the file and the experience-rendering surface but do not share a cause. Fixing one does not fix the other. They CAN be sequenced together though: any change that starts feeding source bullets into CV-gen should land with the index-join hardening, because more bullet content flowing through `fillFromSource` raises the cost of an index misroute.

---

## Section 6: fix proposals (with rollback paths)

No code changed yet. Options below, cheapest first. Recommendation at the end.

### Option A - merge bullets into the responsibilities prose at fetch time (minimal, CV-gen only)

In generate-tailored-cv `mapExperience`, when `exp.bullets` is non-empty, append them to the `responsibilities` string (newline-joined) before the existing pipeline runs. Everything downstream (prompt, reconcile fallback) already treats `responsibilities` as the bullet source, so no schema or prompt change is needed.

- Pros: ~5 lines, one function, no prompt/schema/contract change, immediately closes the Guardio symptom for CV-gen. Bullets flow through the same anti-fabrication and reconcile machinery as responsibilities.
- Cons: does not help ai-chat; risk of duplicate bullets where a bullet was already copied into responsibilities (needs a dedupe pass). Bullets and responsibilities have slightly different registers.
- Rollback: revert the single mapExperience change. Pure read-path, no data migration, instantly reversible.

### Option B - add `bullets` as a first-class field through CV-gen (cleaner CV fix)

Add `bullets` to `mapExperience`, to `SourceExperience`, and teach `fillFromSource` to prefer source `bullets` over `responsibilitiesToBullets` in the no-LLM-bullets fallback. Update the prompt to describe bullets as an additional source ranked alongside responsibilities.

- Pros: proper modeling; bullets become a real source with their own ranking. No double-counting.
- Cons: touches the reconcile contract + prompt (Deno bundler backtick hazard per lessons.md 2026-06-02; run `deno check` before deploy). Needs new reconcile tests. Larger review surface (structural change to a shared library-adjacent contract).
- Rollback: revert the function PR. Read-path only, no migration.

### Option C - inject bullets into ai-chat context (closes the chat half)

In `buildUserContext` (prompt-lib.ts:625), extend the per-experience line to include a trimmed `bullets` list (and/or `responsibilities`), capped for token budget. This is the "Phase 4 read side" the code comment already anticipates.

- Pros: makes the chat agent actually able to discuss and reuse saved bullets; removes the honest-but-bad "I can't see your bullets" answer; unblocks the post-save CV-regen offer that index.ts:220 says is gated on this.
- Cons: token budget (Guardio alone is 14 bullets); needs a per-experience cap and probably relevance trimming. Prompt-size regression risk on heavy profiles.
- Rollback: revert the prompt-lib change. Stateless, instant.

### Option D - fix the generate-internship-profile `description` select (separate, small)

Change `index.ts:154` to select `responsibilities` (and optionally `bullets`) instead of the non-existent `description`, and update the grounding corpus to use it.

- Pros: fixes a latent bug where internship grounding silently loses experience content.
- Cons: independent of the Guardio symptom; should be its own ticket so the main fix stays focused.
- Rollback: revert the select change.

### Recommendation

Ship Option A + Option C together as the "Phase 4 read side": A closes the CV symptom Eli hit with the smallest possible diff, C closes the chat-agent half and unblocks the regen offer the codebase already wants. Defer Option B to the same window as the title-mislabel hardening (they both touch reconcile and should be tested as one change). File Option D as a separate small ticket. Decide the path before any code lands; this doc is investigation only.
