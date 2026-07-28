# Chat history in the coach - feasibility + UI proposal (2026-07-17)

Follows the feasibility-first standing rule: the backend was read BEFORE any UI was
drawn. Verdict lines are **SUPPORTED AS-IS** / **NEEDS BACKEND WORK** / **FICTION**.

## Backend reality: SUPPORTED AS-IS (no backend work)

Live-verified against ref `ilmqmodklutztuybsvwd`.

- **Tables exist.** `public.conversations` (`id, user_id, agent, title,
application_id, created_at, updated_at`, RLS owner-only) and
  `public.chat_messages` (RLS via parent). Migration `20260424_chat_history.sql`.
- **Delete is safe.** FK `chat_messages_conversation_id_fkey` is **ON DELETE
  CASCADE** (messages go with the thread); `stories_conversation_id_fkey` is **ON
  DELETE SET NULL** - deleting a thread does NOT destroy Story-bank entries, it
  only unlinks them. Verified in `pg_constraint`, not assumed.
- **The dock's provider is already 90% built.** `CoachConversationContext` loads
  the conversation list and exposes `conversations`, `activeConversationId`,
  `setActiveConversationId`, `startNewConversation`, `loadingMessages`. **No UI
  consumes any of it.** The only missing piece is `deleteConversation` - a
  client-side `.delete().eq("id", id)`, frontend-only.
- **`ai-chat` is stateless** and unaffected: it receives a rolling 20-turn
  `conversation_history` in the request. Threading is entirely a client concern.

## The real finding: the port deletes the picker's only home

A thread picker **already ships** - `ChatInterface.jsx:1263-1300`: a dropdown with
"New conversation", the thread list (title + date), and a per-row trash button.

It is **deliberately hidden in the coach**, and the code says why
(`ChatInterface.jsx:1257`):

> "Conversation switcher hidden in drawer mode - one rolling conversation per
> user; multi-conversation switching belongs on the full-page CareerAgent surface."

That decision was sound **when CareerAgent existed as the multi-thread home**. It
does today: `src/Layout.jsx:78`, under the sidebar's "Chat" section.

**But the canvas IA removes it.** The locked decision is "Chat = a toolkit tool"
that opens the coach dock, and the toolkit rail's eight tiles (Profile, LinkedIn,
CV bank, Story bank, Interview coach, Skill hub, Tasks, Chat) contain **no
CareerAgent**. So the port collapses the sidebar Chat section into the coach and
deletes the surface the switcher was exiled to.

**Consequence: if we port as locked and add nothing, thread history disappears
from the product.** Not a regression anyone would notice in review - the feature is
invisible in the dock today - but users' past threads become unreachable. So this
is not "should we add history"; it is "the coach must inherit it, or we drop it on
purpose."

## What real users actually have (scrubbed)

Scrub per `.claude/skills/scrubbed-usage`. **57 real users.**

| Metric                               | Value |
| ------------------------------------ | ----- |
| Conversations, all agents            | 14    |
| Dock-scoped (`career_agent`, no app) | 12    |
| Real users with any dock thread      | 10    |
| Avg threads per those users          | 1.20  |
| **Max threads held by any one user** | **2** |
| Empty / untitled threads             | 0     |

**LOW CONFIDENCE (n=10)** - but the direction is unambiguous: **nobody has a
history to browse.** A history _browser_ (search, sidebar panel, grouping) would be
built for a problem no user has. The job is to not lose threads, not to manage
them.

## Constraints any design must respect (from the code, not assumed)

1. **Titles are raw.** `title = text.slice(0, 60)` of the user's first message
   (`CoachConversationContext.jsx:162`). No LLM titling, **no rename anywhere in
   the product**. Real titles average ~32 chars and are message fragments, some
   Hebrew. The list must tolerate junk titles and must **not** imply they are
   editable. Good titles = **NEEDS BACKEND WORK** (LLM titling pass); out of scope.
2. **The list is scoped, never "all chats."** The dock filters
   `application_id IS NULL`; app-anchored threads are a separate list. This scoping
   is what prevents the AG2 context bleed called out at `ChatInterface.jsx:570`.
   **Do not label it "All chats."**
3. **A new thread has no row until first send.** `startNewConversation` only clears
   local state. Never render a phantom row for it.
4. **Local ordering drifts.** The list loads once per `user/applicationId`; sends
   bump `updated_at` in the DB but do not re-sort the local array, so within a
   session the order goes stale. One-line provider fix, worth doing.

## Proposal

Three options; **B recommended.**

- **A - Picker in the dock header.** A "Coach ▾" menu in the 32px dock header.
  Rejected: the dock header is a 32px row with a title and one expand button; a
  thread menu is the wrong weight for a surface whose whole job is the live rolling
  chat, and it re-litigates the "one rolling conversation" call for users who have
  1.2 threads.
- **B - History in the EXPANDED coach only (recommended).** The dock stays exactly
  as locked: Coach + expand, one rolling conversation. The **expanded view**
  inherits the picker - "New conversation" + thread list (title, date, delete).
  This keeps the original decision's spirit (dock = talk, expanded = manage),
  gives the deleted CareerAgent's only unique capability a home, and costs one
  provider function. **Restyle the real `ChatInterface` dropdown into the Clay
  language - do not invent a new pattern.**
- **C - Full history panel.** A left rail in the expanded view with search and
  date grouping. Rejected as over-built: max 2 threads per user.

### If B: the work-list

- **Restyle only:** the existing dropdown (`ChatInterface.jsx:1263-1300`) into Clay
  tokens + the canvas chip/menu language.
- **Provider (frontend-only):** add `deleteConversation`; re-sort the local list on
  `updated_at` bump.
- **Honest-UI call:** the real delete fires **immediately, no confirm** - for an
  irreversible destructive action on the user's own history that is too loose.
  Propose a confirm step or an undo toast. Flagging rather than silently changing
  it, since it is a behaviour change to a shipping surface.
- **Empty state:** with 0-1 threads the picker is near-useless chrome. Render it
  **only when `conversations.length > 1`**, so the 47 of 57 users with no thread
  history never see it.

### Open question for Eli

B assumes we **keep** thread history. Given max 2 threads per user, the honest
alternative is to **drop threading from the coach entirely** (one permanent rolling
conversation, no picker) and delete the dead provider code. That is a real product
option, not a cop-out - but it is Eli's call, because it makes past threads
unreachable for the 10 users who have them.
