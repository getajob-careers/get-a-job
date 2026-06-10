// openrouter-chat.ts — parallel helper to openai-chat.ts, same OpenAI-shape
// request/response semantics but targeting https://openrouter.ai/api/v1.
//
// Why a parallel file instead of a model-routing branch inside openai-chat:
// the transport, base URL, headers, and key env var differ. Keeping them
// in separate modules means the OpenAI path stays byte-identical for every
// existing caller, and a future Anthropic-native client can drop in as a
// third file with no chained refactor.
//
// Tracing reuses sendLangfuseTrace from openai-chat.ts unchanged. OpenRouter
// returns OpenAI-shaped JSON (choices[].message + usage.prompt_tokens etc.)
// so the trace body fields populate correctly without any normalization.
//
// Env vars (POSIX-valid underscore names per the 2026-05-11 lesson):
//   OPENROUTER_API_KEY — required when this helper is invoked. The caller
//                        is responsible for checking presence before calling.
//
// Optional OpenRouter attribution headers — both surface in the OpenRouter
// dashboard so usage can be filtered by app. We send them on every request
// so any tenant/admin looking at OpenRouter telemetry can recognize the
// traffic as ours.

import {
  LANGFUSE_ENABLED,
  sendLangfuseTrace,
  type TraceContext,
} from './openai-chat.ts'

const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions'

const ATTRIBUTION_HEADERS = {
  'HTTP-Referer': 'https://getajob.careers',
  'X-Title': 'Get A Job',
} as const

interface OpenRouterChatOptions {
  signal?: AbortSignal
}

// Drop-in OpenRouter chat-completion fetch. Same return contract as
// openaiChatCompletion: returns the upstream Response untouched. Caller
// reads .ok / .status / .json() exactly as it would against OpenAI.
//
// SAFETY: tracing is wrapped in its own try/catch and runs fire-and-forget
// via EdgeRuntime.waitUntil. Any Langfuse failure is logged and swallowed —
// it cannot affect the caller's response.
export async function openrouterChatCompletion(
  payload: Record<string, unknown>,
  apiKey: string,
  traceCtx: TraceContext,
  options: OpenRouterChatOptions = {},
): Promise<Response> {
  const startTime = new Date()

  const response = await fetch(OPENROUTER_ENDPOINT, {
    method: 'POST',
    signal: options.signal,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...ATTRIBUTION_HEADERS,
    },
    body: JSON.stringify(payload),
  })

  if (LANGFUSE_ENABLED) {
    try {
      const cloned = response.clone()
      const endTime = new Date()
      const tracePromise = sendLangfuseTrace({
        payload,
        traceCtx,
        startTime,
        endTime,
        responseClone: cloned,
        responseOk: response.ok,
        responseStatus: response.status,
      }).catch((err) => {
        console.warn('[openrouter-chat] Langfuse trace failed (non-fatal):', err?.message || err)
      })
      // @ts-ignore — EdgeRuntime is a Supabase-specific global.
      const edgeRuntime = (globalThis as any).EdgeRuntime
      if (edgeRuntime?.waitUntil) edgeRuntime.waitUntil(tracePromise)
    } catch (err) {
      console.warn('[openrouter-chat] Langfuse setup failed (non-fatal):', (err as Error)?.message || err)
    }
  }

  return response
}
