// sonnet-transport.ts — chooses which transport serves a Sonnet call, so the
// OpenRouter → direct-Anthropic migration is an env flip, not a refactor.
//
// TWO independent flags let the CV surfaces and the chat/coach surface migrate
// on separate schedules (the coach is a fast-follow arc with its own eval):
//   SONNET_TRANSPORT_CV   — generate-tailored-cv, refine-cv        (default 'openrouter')
//   SONNET_TRANSPORT_CHAT — ai-chat / coach agents                 (default 'openrouter')
// Anything other than 'anthropic' (case-insensitive) resolves to OpenRouter, so
// the default is zero behavior change and OpenRouter stays the instant fallback
// (flip a flag back, no redeploy). A per-request `override` (used only by the
// parity eval) beats the env flag so both transports can be A/B'd on identical
// inputs without touching the global default.
//
// The returned `model` is the correct slug for the chosen transport
// (OpenRouter's routed slug vs Anthropic's Messages-API model id); the metrics
// model id stays 'claude-sonnet-4-6' regardless (caller sets modelUsed).

import { openrouterChatCompletionWithRetry } from './openrouter-chat.ts'
import { anthropicChatCompletionWithRetry } from './anthropic-chat.ts'
import type { TraceContext } from './openai-chat.ts'

export type SonnetSurface = 'cv' | 'chat'
export type SonnetTransportName = 'openrouter' | 'anthropic'

export type ChatTransportFn = (
  payload: Record<string, unknown>,
  key: string,
  traceCtx: TraceContext,
  options: { signal?: AbortSignal },
) => Promise<Response>

export interface ResolvedSonnetTransport {
  name: SonnetTransportName
  transport: ChatTransportFn
  key: string
  model: string
}

// OpenRouter's routed Sonnet slug (unchanged from the call sites' constant).
const OPENROUTER_SONNET_SLUG = 'anthropic/claude-sonnet-4.6'
// Anthropic Messages-API model id — overridable via secret so the exact id can
// change (dated alias etc.) without a redeploy.
const ANTHROPIC_SONNET_MODEL_DEFAULT = 'claude-sonnet-4-6'

function envFlag(surface: SonnetSurface): string {
  const raw =
    surface === 'cv'
      ? Deno.env.get('SONNET_TRANSPORT_CV')
      : Deno.env.get('SONNET_TRANSPORT_CHAT')
  return String(raw ?? '').trim().toLowerCase()
}

export function resolveSonnetTransport(
  surface: SonnetSurface,
  override?: string | null,
): ResolvedSonnetTransport {
  const requested = String(override ?? '').trim().toLowerCase() || envFlag(surface)
  if (requested === 'anthropic') {
    return {
      name: 'anthropic',
      transport: anthropicChatCompletionWithRetry,
      key: Deno.env.get('ANTHROPIC_API_KEY') ?? '',
      model: Deno.env.get('ANTHROPIC_SONNET_MODEL') ?? ANTHROPIC_SONNET_MODEL_DEFAULT,
    }
  }
  return {
    name: 'openrouter',
    transport: openrouterChatCompletionWithRetry,
    key: Deno.env.get('OPENROUTER_API_KEY') ?? '',
    model: OPENROUTER_SONNET_SLUG,
  }
}
