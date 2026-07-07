# Chrome Extension — Coach-Protocol Alignment Investigation

**PAPER-ONLY. Read-only. No code changed. Findings HELD for Eli's review — Arc 1 of a larger session.**
Investigated 2026-07-06. Every claim carries file:line evidence.

## TL;DR

- The extension does **NOT** ship its own system prompt and does **NOT** send empty profile context. The `ai-chat` prompt is 100% server-assembled (`assembleSystemPrompt`), and `buildUserContext` reads the user's profile/roadmap/apps by `user.id` regardless of which client calls. So both "fabrication" hypotheses in their literal form are wrong.
- The real fabrication mechanism is **missing per-job grounding**: the extension never sends `page_context` and usually sends no `application_id`, so the pasted job (e.g. a Zendesk JD) is never a scored entity in the coach's context. The coach has the roadmap's readiness numbers for _other_ roles and, on the weak `gpt-4o-mini` model, mints a readiness % in that exact format ("92%") and invents a gap for a job it can't actually see. `CONTEXT_HONESTY_RULES` forbids exactly this, but 4o-mini doesn't reliably obey.
- The **dead-end** is that the extension's in-chat CV card (`cvProposalCard`) has none of the #489/#490 app-resolution logic. It checks `proposal.application_id || currentApplicationId` and, when both are null, prints "add it to the tracker first" and stops — even when it is holding the JD it needs to create the app. The web side (`generateTailoredCVLinked`) resolves/creates the app first, then generates.
- The extension **ignores** the #490 `accepted` flag entirely and makes the user confirm twice (Apply card, then Generate card) where the web resolves both in one click.
- Chrome Web Store link lives in exactly one product location: `src/components/onboarding/OnboardingTutorial.jsx:89` (+ its test).
- Manifest permissions can stay **frozen** — the entire proposed alignment is request-body/wiring changes against the already-permitted Supabase host.

---

## 1. How the extension calls `ai-chat` today

### It ships NO system prompt — the server governs the prompt

The extension's only `ai-chat` request body is assembled in `sendMessage` (`extension/popup.js:715-720`):

```js
const body = {
  message: text,
  agent: AGENT, // "career_agent" (popup.js:11)
  conversation_history: conversationHistory(),
  ...(currentApplicationId && { application_id: currentApplicationId }),
};
```

There is **no** `system`, `instructions`, `prompt`, or example text anywhere in the body — and no such field exists anywhere in `popup.js`. The prompt is built entirely server-side: `ai-chat/index.ts:239` calls `assembleSystemPrompt(agent, userContext, safeFollowUp)`, and `assembleSystemPrompt` (`prompt-lib.ts:933`, `career_agent` branch at `966-984`) concatenates the governed base prompt + all the SUGGESTED_*_JSON rule blocks + `CONTEXT_HONESTY_RULES` + `SCOPE_GUARD` + `NO_FABRICATION_GUARD` + `userContext`. The extension inherits all of this unchanged. **Hypothesis 2(a) — "extension injects its own prompt with example numbers" — is FALSE.**

### It does NOT send a thin/empty profile context

Profile context is fetched by the server from the DB keyed on `user.id`, not supplied by the client. `buildUserContext` (`prompt-lib.ts:660-664`) reads `profiles(+education)`, `experiences`, `career_roles`, and later `tasks` and `applications` — all scoped to `userId`. So the coach gets the user's real profile, real experiences, and the real **CAREER ROADMAP with readiness percentages** (`prompt-lib.ts:697-742`; the readiness line is rendered at `726-727` as `Readiness: NN%`). **Hypothesis 2(b) in its literal "empty profile" form is also FALSE.**

### What the extension OMITS vs the web `ChatInterface.jsx`

The gap is not the prompt or the profile — it's the **page/entity context**. Web `ChatInterface.jsx` builds an `invokeBody` (`src/components/chat/ChatInterface.jsx:730-739`) that adds two things the extension never sends:

| Field                          | Web `ChatInterface.jsx`              | Extension `popup.js`                        |
| ------------------------------ | ------------------------------------ | ------------------------------------------- |
| `message`                      | yes                                  | yes (`:716`)                                |
| `agent`                        | yes                                  | yes (`:717`)                                |
| `conversation_history`         | yes (`:732`)                         | yes (`:718`)                                |
| `application_id`               | when selected (`:734`)               | only if `currentApplicationId` set (`:719`) |
| `page_context`                 | **yes, forwarded verbatim** (`:738`) | **never sent**                              |
| `visible_items` / role/job IDs | via `page_context` (`:463`)          | **never sent**                              |

Server-side, `page_context` is what hydrates the `TARGET ROLE`, `TARGET JOB`, `TARGET COMPANY`, `CURRENT PAGE`, and `VISIBLE ON SCREEN` blocks (`ai-chat/index.ts:195`, `prompt-lib.ts:888-895`, `page-context.ts:242-324`). Because the extension sends none of it, the coach's structured context contains the user's roadmap and profile but **no grounded, scored representation of the specific job the user just pasted**. The only per-job grounding path in the extension is a _separate_ pipeline (`analyze-job-match`, `popup.js:855`) whose result is appended to the transcript as a plain assistant chat message (`popup.js:898`) and, at best, re-enters `ai-chat` as unstructured `conversation_history` text — never as a `TARGET JOB` / score block.

---

## 2. Source of the fabricated "92% readiness" + false "Zendesk-gap"

Mechanism, pinned:

1. **`gpt-4o-mini` is the model** (`prompt-lib.ts:33 — export const MODEL = "gpt-4o-mini"`). This is the weak model the Hebrew-extraction memory note and the 2026-06-11 lesson both flag as prone to parroting prompt/context formats.
2. **The pasted job is never a scored entity in context.** With no `page_context` and usually no `application_id`, there is no `TARGET JOB` block and no readiness/fit number for the pasted role. What _is_ in context is the `CAREER ROADMAP`, which renders real readiness percentages for the user's _roadmap_ roles in the exact literal form `Readiness: 92%` (`prompt-lib.ts:726-727`). Readiness values in that 0.9x band are ordinary roadmap data (the test fixtures themselves use `readiness_score: 0.92` → `readiness 92%`, `page-context.test.ts:419,436`).
3. **The model lifts/mints a number in that format and misattributes it to the pasted job.** Asked "am I a fit for this Zendesk role?", 4o-mini produces a confident `~92% readiness` (format parroted from the roadmap block) and an invented skill/experience gap ("Zendesk-gap"), because it has no real fit data for that job and defaults to sounding authoritative.
4. **This is precisely what `CONTEXT_HONESTY_RULES` item 3 forbids** ("Readiness scores belong ONLY to career_roles entities … Never state any score, percentage, or track classification that is not literally present in your provided context", `prompt-lib.ts:916`) — but the rule is only as strong as the model obeying it, and 4o-mini doesn't.

**Verdict:** It is hypothesis 2(b), sharpened — not an _empty_ context, but a context **missing the specific job's grounding** while carrying a same-format readiness number for other roles, run through a model weak enough to conflate them. The fix is to feed the coach the same per-job/page grounding the web coach gets (and, separately, this is more evidence for the queued 4o-mini → stronger-model consideration), not to strip a prompt the extension never had.

---

## 3. The dead-end: in-chat "Generate" blocks on `application_id:null`

### The guard

The coach's mid-conversation CV card is `cvProposalCard` (`popup.js:371-409`). Its Generate handler:

```js
const appId = proposal.application_id || currentApplicationId; // popup.js:379
if (!appId) {
  note.textContent = "No application linked yet — add it to the tracker first."; // popup.js:381-383
  return; // dead-end
}
```

When the coach emits a `suggested_cv_generation` with `application_id:null` (which it will whenever there's no `TARGET APPLICATION` in context — i.e. almost always in the extension) **and** `currentApplicationId` is null (fresh chat, nothing added yet), the card hard-stops. Critically, it **ignores `proposal.job_description`** — even when the card is holding the very JD it would need to create an application, it does not create one; it just tells the user to go do it manually. There is no add-application affordance on the CV card itself.

The auto-fire path in `sendMessage` partly masks this: `cvAutoFire` (`popup.js:734-738`) fires when `target_role && (cvAppId || cvGen.job_description)`, and if a JD is present it routes to `generateCvFromJD` (`popup.js:773`), which _does_ create the app from the JD. But when the coach proposes a CV with **no JD and no app** (e.g. "make me a CV for the Zendesk role" typed without pasting the JD), `cvAutoFire` is false, the card is rendered (`popup.js:748`), and clicking Generate lands on the dead-end above.

### Why this is the P0 from memory

Memory: _"coach 'Generate CV' 400s on application_id:null."_ The web side solved this in **#489/#490**:

- `generateTailoredCV` (`coachActionHandlers.js:611-692`) **omits** `application_id` entirely when null (`:621-623`) so the server never receives `application_id:null` and never 400s.
- `generateTailoredCVLinked` (`coachActionHandlers.js:728-777`) is the **resolution path**: it (a) uses a valid linked `application_id` if present, else (b) finds the same-turn `add_application` action and creates the app _first_ — carrying the JD (`:748`) — then generates with the real id, else (c) parks rather than orphaning/filing an "Unknown" (#490's "Generate-implies-app", never a silent Unknown per #481).

The extension has **none** of this. `cvProposalCard` neither omits null nor resolves an app from the JD/`add_application` — it dead-ends. (Note: `runRefineAndRenderCV`, `popup.js:440`, calls `refine-cv` not `generate-tailored-cv`, so the extension isn't literally hitting the same 400 endpoint, but it reproduces the same _class_ of dead-end: a CV acceptance that can't complete because no app was resolved.)

---

## 4. Double-confirm friction

The extension makes the user act twice where the web resolves in one:

- **Apply-then-Generate (two taps).** When a coach turn proposes both an `add_application` and a CV, the extension renders them as **two separate cards**: `applicationCard` with an "Apply" button (`popup.js:341-364`) and `cvProposalCard` with a "Generate" button (`popup.js:375-406`). The user must tap **Apply** (which sets `currentApplicationId`, `popup.js:1106`), _then_ tap **Generate** (which reads `currentApplicationId`, `popup.js:379`). The web does both in the single Generate click via `generateTailoredCVLinked` (`coachActionHandlers.js:740-757`).
- **Verbal-accept is ignored → a redundant click.** #490 added `accepted:true` on an explicit "yes, generate it" so the provider auto-fires once (`CoachConversationContext.jsx`, per the #490 commit). The extension's `sendMessage` **never reads `cvGen.accepted`** — its auto-fire test (`popup.js:734-738`) keys only on `target_role` + (app or JD). So a user who verbally accepts a CV that still needs an app resolved gets a card to click again — a second confirmation after the words "yes, generate it."
- **Composer buttons duplicate the coach.** The composer has its own "Generate CV" and "Add to tracker" buttons (`popup.js:1051-1064`) that run `generateCvFromJD` / `addToTracker` independently of the coach. So the same two intents exist in two places (chat card + composer button), and `addToTracker` even posts a canned user echo "Add this role to my tracker." (`popup.js:963-965`) — the exact kind of canned echo #489 Part G removed from the CV path.

---

## 5. Chrome Web Store links (frontend + landing)

Exhaustive grep of `src/`:

- **`src/components/onboarding/OnboardingTutorial.jsx:89`** — the live install link:
  `const … = "https://chromewebstore.google.com/detail/get-a-job/cnlgglikhomodkjpidaoigajonnbhlii";`
  This is the "final onboarding beat" extension-install step (`OnboardingTutorial.jsx:167, 241, 353`); the tutorial holds the user on this step until they add or dismiss it (`:119`).
- **`src/test/onboarding-extension-prompt.test.jsx:64`** — the same URL asserted in the onboarding-prompt test.
- **`src/pages/_preview/OnboardingPreview.jsx:96`** — preview harness comment for the extension-install beat (renders the step; no separate URL).

**Landing pages carry NO CWS link.** The only `chrome` hits in `src/pages/Landing.jsx` (`:134-139, 542`) and `src/pages/_preview/LandingV2Preview.jsx` (`:210-212`) are CSS classes for a browser-**chrome** mockup (the `.lp-product-chrome` / `.lv-mock-chrome` traffic-light dots), unrelated to the extension. No "add to Chrome" / install CTA exists on either landing page.

So the extension is discoverable from exactly **one** product surface: the last step of onboarding.

---

## 6. Manifest — permissions and the freeze constraint

`extension/manifest.json` (manifest v3, `version 0.1.3`):

- **`permissions`** (`:7`): `["scripting", "tabs", "sidePanel"]`
- **`host_permissions`** (`:29-33`):
  - `https://ilmqmodklutztuybsvwd.supabase.co/*`
  - `*://getajob.careers/*`
  - `*://www.getajob.careers/*`
- Background service worker `background.js` (`:8-10`); side panel `popup.html` (`:11-13`).

Why the three permissions exist: `tabs` + `scripting` power the session bridge (`findTab` → `chrome.tabs.query`, `popup.js:167`; `pullSession` → `chrome.scripting.executeScript`, `popup.js:181`), which reads the Supabase session out of the getajob.careers tab's localStorage. `sidePanel` renders the panel. The Supabase host permission covers **every** edge-function and PostgREST call the extension makes (`ai-chat`, `refine-cv`, `extract-jd-basics`, `analyze-job-match`, `applications`/`conversations`/`chat_messages` reads/writes).

**Freeze check:** the alignment proposed below is entirely (a) changes to the `ai-chat` request body and (b) client-side wiring in `popup.js`. All calls stay on the already-permitted `*.supabase.co` host. **No new permission, no new host, no manifest change** is required — the permission-diff for a resubmit stays EMPTY. The only thing that would _force_ a permission change is scope creep we should explicitly avoid: e.g. reading arbitrary page DOM for JD scraping (`activeTab`/broad host perms) or content scripts on job boards — none of which this alignment needs.

---

## PROPOSAL (paper only) — minimal alignment onto the platform contract

**Framing:** the extension should be "just another operator on the same features" — same server-governed prompt (already true), same per-job grounding, same app-resolution path as the web coach. It should consume the Arc 2 IA spec the same way the web client will: by sending page/entity context and letting the shared resolution logic own app creation. Keep the change surface tiny and manifest-frozen.

### A. Feed the coach real grounding (fixes §2 fabrication)

Extend the `sendMessage` body (`popup.js:715-720`) to send the context the extension actually has, so the pasted job becomes a grounded, scored entity instead of a hallucination surface:

- When the extension has run `extract-jd-basics`/`analyze-job-match` for the current JD, pass the resulting `application_id` (once the app exists) so the server renders the `TARGET APPLICATION` block (JD + scores) via `buildUserContext` (`prompt-lib.ts:851-881`). This alone gives the coach the real role, JD, and score instead of a parroted "92%".
- Where an application isn't created yet, prefer creating it up front (the extension already does exactly this on the Generate/Add paths) so there is always an `application_id` to attach — turning "chat about a floating JD" into "chat about a tracked app," which is the web contract.
- No `page_context` invention is needed beyond what maps to real IDs; do **not** fabricate role/job UUIDs (the server drops unknown IDs anyway, `page-context.ts:129-177`). This is a body change only — no prompt duplication, the server keeps governing the prompt.

### B. Adopt the #489/#490 CV protocol (fixes §3 dead-end + §4 double-confirm)

Rework the two CV entry points so they mirror `generateTailoredCVLinked` instead of dead-ending:

- **`cvProposalCard` Generate handler (`popup.js:377-405`)**: replace the `if (!appId) … "add it to the tracker first"` stop with a **resolution step** — if no `application_id`/`currentApplicationId`, resolve an app FIRST from (i) a same-turn `add_application` action, or (ii) the card's own `proposal.job_description` via the existing `extract-jd-basics → applications.insert` front (already implemented in `generateCvFromJD`, `popup.js:818-843`) — then generate with the real id. Only genuinely park (ask for company) when neither a company nor a JD exists, matching #490's "never orphan, never silent Unknown."
- **`sendMessage` (`popup.js:728-775`)**: read the `accepted` flag. On `cvGen.accepted === true`, auto-fire once through the SAME resolution step (idempotent), so a verbal "yes, generate it" completes without a second click. A proactive offer (no `accepted`) keeps the click-gate — this is exactly the #489 click-gated / #490 verbal-accept split.
- Collapse the redundant confirm: when both an Apply card and a CV card are proposed, the CV Generate should resolve the app itself (as above) rather than requiring the user to tap Apply first. Consider dropping the canned "Add this role to my tracker." echo (`popup.js:964`) to match #489 Part G's echo removal.

### C. Concrete change set (no code here)

- **`popup.js` functions that change:** `sendMessage` (read `accepted`; attach richer body), `cvProposalCard` (add app-resolution before generate), and ideally a small shared `resolveApplicationForCv({proposal, appActions})` helper mirroring `generateTailoredCVLinked` so both the card path and the auto-fire path share one resolver. `generateCvFromJD`/`addToTracker` already contain the create-from-JD front to reuse.
- **New request body shape (illustrative, still just `ai-chat`):**
  `{ message, agent: "career_agent", conversation_history, application_id? , /* + accepted-flag handling client-side */ }` — with `application_id` populated far more often because the extension resolves/creates the app before or during the CV turn, giving the server the `TARGET APPLICATION` grounding block.
- **Unchanged:** the auth/session bridge (`readSession`/`initSession`), the server prompt (governed already), the edge-function contracts, and — critically — **the manifest**. Permission-diff stays empty.

### D. Sequencing note

This lands as the extension's alignment PR and only reaches users on the **next Chrome Web Store rebuild** (per the extension-store-submission-queue memory). Bundle it with the already-queued extension changes (coach CV-gen auto-fire/echo-removal Part G, cold-install gate) into ONE submission so there's a single review cycle and one frozen-permission resubmit. Hold for Eli's review; this is a proposal, not a change.
