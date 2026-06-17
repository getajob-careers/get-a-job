# Browser-extension scoping — investigation (HOLD FOR REVIEW)

Investigation only. No code changed, no migrations, no deploys. Branch `eli/ext-investigation`.
Date 2026-06-17. Live-DB facts verified against prod `ilmqmodklutztuybsvwd` (read-only).

**Product shape:** Chrome side-panel extension whose core is our `ai-chat` career agent, fed a
**pasted** job description (paste-only, no page scraping). From one chat the user can: get a fit
rating, add the job to the tracker, and generate + conversationally edit a tailored CV that renders
in-chat. User fact-corrections during editing write back to profile + Story Bank. Anti-fab absolute:
reword/cut/reorder/pull-from-Story-Bank yes; invent metrics/tools/outcomes no.

---

## 1. ai-chat stability & reuse

- **Transport: non-streaming today.** Single `new Response(JSON.stringify({reply, ...suggested_*}))`
  (`ai-chat/index.ts:371,424-440`). No SSE/ReadableStream. Streaming was reverted in **#157**
  (stale-closure duplicate-bubble bug; lessons 2026-05-26). The current non-streaming + retry design
  is the deliberate post-revert state (`_shared/openai-chat.ts:88-91` documents why: streaming raised
  concurrent OpenAI pressure → cascade-500s).
- **Multi-turn:** `conversation_history` is **client-supplied** (`index.ts:175`), last **20 messages**
  (`ChatInterface.jsx:697`), persisted in `chat_messages`. Model = **Claude Sonnet 4.6 via OpenRouter**
  in production (`chat_model:"sonnet"` flag, always sent by `src/lib/chatModel.js`), gpt-4o-mini as
  no-redeploy fallback (`index.ts:268-286`). temp 0.4, 2048→4096 retry on truncation.
- **Page/JD context:** `page-context.ts` is **locked to IDs + enums only** (UUIDs, route, track enum);
  it would **drop a pasted-JD string** (whitelist sanitizer, `page-context.ts:129-177`); even `job_id`
  resolves to compact columns, "NO full JDs" (`:92,470`). The **only** path raw JD text reaches the
  model today is `applications.job_description` (HTML-stripped, 2000-char trunc, `prompt-lib.ts:786-798`).
  → **The extension's pasted JD needs a NEW sanitized input channel, or must land on an application
  row first.** This is the single biggest contract gap for the extension.
- **Action cards (8 `SUGGESTED_*_JSON`):** TASKS, ROADMAP_CHANGES, COMPANY_TARGET, APPLICATION_ACTIONS,
  BULLET_CAPTURE, ADD_SKILL, CV_GENERATION, AGENT. Parser `prompt-lib.ts:989+`, handlers
  `src/lib/coachActionHandlers.js`.
  - **CV_GENERATION** (`prompt-lib.ts:365-399`): emits `{target_role, application_id, job_description}`;
    frontend `generateTailoredCV` (`coachActionHandlers.js:579-627`) calls the **separate**
    `generate-tailored-cv` function — ai-chat **never authors a CV inline** (explicit guard
    `prompt-lib.ts:853`). Result (cv_url) is persisted onto `chat_messages.suggested_cv_generation`.
  - **APPLICATION_ACTIONS** (`prompt-lib.ts:246-267`): `add_application{company, role_title, status,
track, url, location, notes, job_description, ...}`; `applyApplicationActions`
    (`coachActionHandlers.js:163-223`) inserts into `applications` with `source:'chat_agent'` and —
    **if `job_description` is present — HTML-strips it and fires `scoreApplication`**. This is the
    natural home for "add this job to the tracker" + auto-fit-score from a pasted JD.
- **Phase 1b rename (STORY_CAPTURE → BULLET_CAPTURE):** backend **fully renamed**
  (`SUGGESTED_BULLET_CAPTURE_JSON`, `BULLET_CAPTURE_RULES`). Frontend **stragglers** still touch the old
  name: `CoachConversationContext.jsx:207` reads `data.suggested_story_capture` (a field the backend no
  longer emits → dead dock path); `StorySaveCard.jsx` + the old `extract-story-from-text`/`saveStory`
  pipeline coexist with the new bullet pipeline; preview fixtures labeled `STORY_CAPTURE`.
- **Honest safety read:** Reuse the **infrastructure** (non-streaming JSON contract, retry wrapper,
  `parseSuggestions` markers, `generate-tailored-cv`, `applyApplicationActions`), but **do not overload
  the general coach with conversational CV editing.** Reasons: ~8–12K-token system prompt every turn
  (most of it — roadmap/company-target/redirects — irrelevant to the extension), internal-pilot auth
  (50 calls/hr), and the server **trusts `conversation_history` verbatim** (injection/cost vector on a
  public surface). The codebase already isolates CV authoring into its own function _because_
  conversational CV editing in the general coach was the fabrication/"I-saved-that" failure mode the
  ~7.6KB CONTEXT_HONESTY / NO_FABRICATION guards exist to contain. → favour a **dedicated, lean CV-edit
  loop**.

## 2. CV pipeline today

- **Emits JSON metadata + a signed URL to a server-rendered PDF — NOT structured content.** Response
  (`index.ts:2553-2596`): `{cv_url, application_id, fit_analysis, page_fit, stories_used,
unsourced_bullets?, ...}`. The structured `cvData` (sections/experiences/bullets) is **never returned**.
- **Authoring:** 2 sequential LLM calls steady-state — Pass 1 JD-keyword extract (`gpt-4o`,
  `index.ts:140-145`); Pass 2 CV authoring (**Sonnet 4.6 via OpenRouter**, `cv_model:"sonnet"` always
  from web, `index.ts:1490-1533`, temp 0.2); occasional Pass 3 coverage retry. **Output schema**
  (`index.ts:1385-1448`): per experience the model emits **only `{index, bullets}`** — server stamps
  title/company/dates by index (reconcile, the "load-bearing anti-fab step"). Education emits full
  `{degree, field_of_study, institution, dates, gpa, coursework, ...}`.
- **Render:** server-side **pdf-lib** (`_shared/cv-templates/build-pdf.ts:621`, `buildCvPdf`). DOCX
  (`build.ts`) is dead code. PDF → `cvs` bucket (timestamped, `index.ts:2498-2503`) → 10-yr signed URL.
- **Persistence (verified live):** **No dedicated CV table** — DB has only `cv_templates` (render
  templates). CV state = a pointer on `applications` (`cv_url, cv_status, cv_version_name,
cv_skills_emphasized`). The structured `cvData` is **discarded**; **every call re-authors from
  scratch.** Live: `cvs` bucket exists (private); **15 / 41** applications have a `cv_url`.
- **Inputs:** `profiles`(+`education`), `experiences`, `projects`, `certifications`, **`stories`**
  (keyword-matched STAR evidence, top 8), and the JD (`body.job_description` → else
  `applications.job_description`/`notes`). Live: `stories`=**20 rows** is still the active evidence base;
  `experiences.bullets` is **4 rows** (nascent — Phase 1a/1b just shipped).
- **CV-as-state refactor size:** the LLM contract, reconcile, and `buildCvPdf` are already
  structured-JSON-centric and reusable. The work is: **(1) persist `cvData` (new jsonb column/table),
  (2) split author from render so edits re-render without re-LLM, (3) return structured content to the
  client, (4) an edit endpoint, (5) a versioning decision.** Not a rewrite of authoring/rendering.

## 3. Title-mislabel bug (root cause — reported, not fixed)

- **NOT a render-loop bug, and NOT title authoring.** title + company + dates are all stamped from the
  **same `src[i]`** in `fillFromSource` (`reconcile.ts:230-233`); they always travel together. The
  renderer (`build-pdf.ts:435-440`) reads one entry object per iteration — no loop reuse, no off-by-one.
- **The misroute is in BULLETS binding.** A valid-but-**wrong** LLM `index` is accepted with **zero
  validation** (`reconcile.ts:170-180`, claim at `:176-177`), or, on a bad/missing index, bullets fall
  back to the LLM entry's **positional** slot (`:189-190`) — both silent (`claimedByEntry`, no warning).
  If the LLM buckets an experience into a different group than the server's independent
  `classifyExperience` (`index.ts:748-806`), bullets bind to the wrong source row → **role A's bullets
  render under role B's title/company/dates.**
- **Dates vs bullets:** dates come from `src[i]` (always right for the slot); bullets come from the
  index map → **they can drift independently.** Symptom = correct title+dates with the _wrong bullets_.
- **Fix location (do not implement):** primary `reconcile.ts:170-180` — validate the LLM index against
  an echoed title/company hint and reject valid-but-wrong rather than silently claim; secondary
  `:189-190` (positional fallback warns but never blocks); architectural contributor — the server's
  independent re-bucketing at `index.ts:748-806`.
- **Caveat for the reviewer:** if the _actual_ observed symptom is a literal swapped company/title
  **string** on an entry whose bullets are correct, that points elsewhere and we'd want the repro —
  the code path above moves _bullets_, not the title string. (The only identifier-overwrite that exists
  is the education-institution guard, `index.ts:1800-1910`, the #125 Reichman path — education only.)

## 4. Em dashes in CV output

- **No em-dash instruction anywhere** — `CV_VOICE_RULES` (`_shared/voice-rules.ts:40-78`) and the
  authoring prompt/schema say nothing about punctuation, so Sonnet emits `—` freely in summary/bullets.
  The only server-produced dash is the **en-dash (U+2013)** date-range separator
  (`reconcile.ts:117`) — intentional, must be preserved.
- **An existing post-process normalizer already exists:** `walkAndCleanStrings(cvData)`
  (`index.ts:2123`) walks every string in `cvData` and runs `deBanish` (`index.ts:2103-2109`, currently
  banned-verb regex only), before `buildCvPdf`. This is the CV analog of outreach's `sanitizeSuggestion`
  (which is warn-only, `generate-linkedin-outreach-message/index.ts:591-642`).
- **Hook points (do not implement):** (a) prompt rule in `CV_VOICE_RULES` (`voice-rules.ts`, ~line 71);
  (b) post-process: add a `—`→`-` replacement inside `deBanish`
  (`BANNED_VERB_REPLACEMENTS`, `index.ts:2081-2109`) — auto-applies via the existing walk. **Restrict to
  U+2014 (and optionally U+2015), NOT U+2013**, or date ranges corrupt.

## 5. Anti-fabrication & user-correction write-back

- **CV anti-fab today = prompt rules + a warning-only validator.** `TRUTHFULNESS_RULES`
  (`index.ts:997-1013`) + `unsourced_bullets` validator (`index.ts:2244-2312`): builds a **source
  haystack** (experiences.responsibilities/skills + used stories' metrics/result/action/skills/tools +
  proof_signals + projects), extracts quantified/proper-noun tokens from each bullet, flags any token
  not in the haystack. **Non-blocking — never modifies bullets.** Catches invented numbers + CamelCase
  tool names; **misses** fabricated prose, lowercase tools, unquantified outcomes. Reconcile separately
  guarantees role identifiers can't be fabricated.
- **The propose-don't-write seam (the reuse model):** `extract-bullets`
  (`extract-bullets/index.ts:16-21`) **never writes the DB** — returns `{bullets, skills,
extraction_notes}`, requires `target_type`+`target_id`, ownership-gated, ABSOLUTE FABRICATION RULES.
  The DB write happens **only in the frontend** after user confirm: `appendBullets`
  (`coachActionHandlers.js:437-471`, with undo snapshot). `extract-story-from-text`→`saveStory` is the
  same shape (INSERT, no undo). `applyAddSkillToExperience` is the single-leaf-field template.
- **Where write-back hooks in:** bullets / stories / experience-skills are **already covered** by the
  propose→confirm→write seams. Two gaps: **(a) profile scalar fields** (`full_name, phone_number,
location, linkedin_url, summary, primary_domain, languages` — verified columns) have **no
  propose-don't-write function and no handler** — the genuine net-new surface (closest template:
  `applyAddSkillToExperience`). **(b)** existing bullet handlers are **add-only**; reword/cut/reorder
  needs `setBullets` (`coachActionHandlers.js:475-499`, replaces the whole array) — but it has **no
  anti-fab gate**, so reworded text must round-trip through `extract-bullets` before `setBullets`.
- **Smallest safe contract:** keep edge functions propose-only (writes stay frontend-after-confirm);
  accept a correction only if every quantified/proper-noun token in the new text already exists in
  (prior bullet ∪ source haystack); profile scalars = verbatim user strings on an allowlist, with
  snapshot+undo; keep `extraction_notes` mandatory; ownership-scope every write.

## 6. Extension as a client

- **CORS: wildcard `"*"`, hardcoded per-function (no shared helper, no origin allowlist).** A
  `chrome-extension://` origin is **accepted as-is — server needs no change.** Allow-Headers
  `authorization, x-client-info, apikey, content-type`; Methods `POST, OPTIONS`. Bearer-token auth works
  under wildcard provided the extension does **not** send `credentials:'include'`.
- **Auth:** every function has `verify_jwt = false` in `config.toml` (asymmetric signing keys the
  gateway can't verify) and enforces auth **in-code** via `auth.getUser()` → 401 (`ai-chat:116-134`,
  `generate-tailored-cv:284-300`). A client needs `Authorization: Bearer <user access_token>` +
  `apikey: <anon key>`. The extension **cannot borrow the web app's `localStorage` session** (separate
  `chrome-extension://` origin) — it needs its **own Supabase login persisted to `chrome.storage`**.
  Raw-fetch template: `src/pages/Onboarding.jsx:628-639`; port `invokeWithAuthRetry` for 401-refresh.
- **Chrome permissions (general knowledge, not codebase):** minimal = **`activeTab`** to read the active
  tab's URL on a user gesture (`chrome.tabs.query({active,currentWindow})` → `tab.url`). **Not** the
  broad `"tabs"` permission, **no** `content_scripts`, **no** `<all_urls>` host permission (paste-only =
  no scraping). Add `sidePanel` + `storage`; narrow `host_permissions` to the Supabase URL only.

---

## Open decisions — options + lean

### A. Where the structured CV lives (schema)

- **A1. `applications.cv_data jsonb`** — one mutable CV per application. Minimal, additive.
- **A2. Dedicated `application_cvs` table** (id, application_id, user_id, cv_data jsonb, cv_url, version,
  created_at) — supports versioning/history, clean RLS, decoupled from the wide `applications` row.
  **← LEAN.** (`cv_version_name` already hints versioning was intended.)
- **A3. JSON sidecar in the `cvs` bucket** next to the PDF — no schema change but not queryable, weaker
  RLS story. Not recommended.
- Tests today: `reconcile.test.ts`, build-pdf; **no CV-table tests**. Regression: additive = low; real
  risk is splitting author/render. Shared code: `buildCvPdf` already takes `cvData` (renderer reusable).
  Rollback: drop column/table, keep the regenerate-fresh path as fallback.
- _Faster-MVP note:_ A1 is the smallest step if versioning is deferred; A2 if editable history matters.

### B. Dedicated CV-edit loop vs ai-chat

- **B1. Overload `ai-chat`** with conversational CV editing — **HIGH regression risk** (touches the live
  pilot coach + its 39-test `prompt-lib.test.ts` contract, adds token bloat, re-opens the
  fabrication-prone path the honesty guards exist to contain). Not recommended.
- **B2. Dedicated edge function + lean prompt** for the JD→CV edit loop (reuse `parseSuggestions`,
  `generate-tailored-cv`, `applyApplicationActions`).
- **B3. Hybrid:** ai-chat stays the entry surface (fit rating, tracker-add via APPLICATION_ACTIONS) and
  **hands off to a dedicated, isolated CV-edit loop** for the editing conversation. **← LEAN** — keeps
  one chat UX while isolating blast radius, token cost, and the fabrication surface.
- Tests: `prompt-lib.test.ts` (39), `page-context.test.ts`. Shared code: reuse markers + the CV
  function. Rollback: a separate function is independently deployable/revertable; ai-chat changes affect
  the whole pilot.
- _Coupled sub-decision:_ the **pasted-JD input channel** — a new sanitized JD field on the (new) CV-edit
  function is cleaner than abusing `page_context` or forcing a throwaway application row.

### C. Capability in web app + extension vs extension-only

- **C1. Extension-only** — strands the backend work (CV-as-state, edit loop, write-back) behind one
  surface; likely duplicated later. Not recommended.
- **C2. Both, backend-shared, web-first rollout** — build CV-as-state + the edit loop + write-back in
  shared (origin-agnostic) edge functions, surface in the existing web `CVManagement.jsx` first (known
  auth/test surface, lower risk), then add the extension as a thin client. **← LEAN.**
- **C3. Web-first, extension much later** — fine, but the extension is the stated driver, so don't design
  it out.
- Regression: building in shared functions touches the live CV path — medium; mitigate with **additive
  endpoints behind a flag**, leaving the current regenerate-fresh path intact. Rollback: flag-off.

---

## Flagged for reviewer input (beyond the 3 decisions)

1. **Title-bug symptom confirmation** (§3): is the real symptom wrong _bullets_ under a role, or a
   literal swapped company/title _string_? Changes the fix locus. A repro would settle it.
2. **JD input channel** (§1/§B): new sanitized field vs land-on-application-first.
3. Phase-1b frontend stragglers (§1) are unrelated debt but will confuse an extension reusing the chat
   contract — worth a cleanup pass before the extension leans on it.
