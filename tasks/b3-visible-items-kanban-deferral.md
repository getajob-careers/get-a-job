# Deferred: visible_items for kanban surfaces (company_targets + applications)

**Status:** scoped, not started. Conscious cut from the B3 PR (`eli/b3-visible-list-page-context`).

## What shipped in B3

`page_context.visible_items` (ordered ids of the rendered list, server-hydrated into a
numbered "VISIBLE ON SCREEN" block) for the **two ranked list surfaces**:

- Career **jobs** list (`visibleJobIds`)
- Career **roadmap roles** (`visibleRoleIds`)

The server contract already supports `type: 'company_target'` and `type: 'application'`
(sanitizer, `fetchVisibleList`, render) — only the **client producers** for the kanban
surfaces were deferred.

## What's deferred (this item)

Emit `visible_items` for the two kanban surfaces:

1. **Internship `company_targets`** (`src/pages/Internship.jsx` inline page-context builder +
   `src/components/internship/CompanyTargetsKanban.jsx`). Pick up during internship-page work.
2. **Career applications kanban** (`src/components/tracker/ApplicationsKanban.jsx`).

## Why deferred (not a silent drop)

- "Which is best for me" is semantically meaningful on a **ranked** list (jobs/roles) but
  odd on a **status board** (a kanban). Lower user value.
- The kanbans need their per-column grouping (`byStatus`) **lifted to page level + memoized**
  per column to expose ordered ids — moderate work vs. the trailing `.map(x=>x.id)` the
  ranked lists needed.

## When picked up — open questions to resolve

- **Order semantics:** column order then card-order-within-column? Flatten to one ordered
  list, or send per-column? (B3 server renders one flat numbered list per `type`.)
- The honesty rule already covers the absent case, so until then the kanban surfaces simply
  send no `visible_items` and the agent falls back to ask-don't-guess — no regression.

Ref: B3 plan + `docs/research/chat-bakeoff-2026-06.md`; server impl in
`supabase/functions/ai-chat/page-context.ts` (already type-complete for both kanban types).
