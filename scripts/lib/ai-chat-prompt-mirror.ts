// scripts/lib/ai-chat-prompt-mirror.ts
//
// Option-B (eli/chat-model-sonnet): the prompt assembly + structured-block
// parser now live in ONE place — supabase/functions/ai-chat/prompt-lib.ts —
// imported verbatim by BOTH the edge function and this harness. There is no
// longer a copied mirror to drift, so the byte-equality drift guard
// (assertPromptParity) is deleted. This file is a thin re-export kept only so
// existing harness imports (`./lib/ai-chat-prompt-mirror.ts`) keep resolving.
//
// prompt-lib.ts is pure + Node-importable (imports only the pure shared helpers
// + page-context renderer; no Deno-runtime top-level), so tsx loads it directly.

export * from "../../supabase/functions/ai-chat/prompt-lib.ts";
