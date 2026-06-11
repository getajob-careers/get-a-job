// Single rollback lever for the flag-gated conversational model
// (eli/chat-model-sonnet). Sent as `chat_model` on every conversational
// ai-chat call (ChatInterface panel + CoachConversationContext dock). The edge
// function routes to claude-sonnet-4.6 via OpenRouter when this is "sonnet" AND
// OPENROUTER_API_KEY is set server-side, else falls back to gpt-4o-mini.
// Rollback: set to "" (or "default") to send everyone back to gpt-4o-mini with
// no redeploy. See docs/research/chat-bakeoff-2026-06.md.
export const CHAT_MODEL = "sonnet";
