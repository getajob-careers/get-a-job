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

interface OpenRouterChatWithRetryOptions extends OpenRouterChatOptions {
  // Max retry attempts on transient errors (default 3). Total HTTP attempts
  // is retries + 1 — mirrors openaiChatCompletionWithRetry exactly.
  retries?: number
  // Base exponential-backoff delay (default 1000ms). Wait = base * 2^attempt
  // up to maxBackoffMs. Jitter (0–500ms) added to avoid thundering-herd.
  baseBackoffMs?: number
  // Backoff ceiling (default 8000ms).
  maxBackoffMs?: number
}

// HTTP statuses worth retrying. Same set as openai-chat.ts — 408 request
// timeout, 429 rate limit, 5xx transient server errors. OpenRouter returns
// OpenAI-shaped error envelopes, so these status codes mean the same thing.
const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504])

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

// openrouterChatCompletion + exponential-backoff retry on transient
// errors. Strict parity with openaiChatCompletionWithRetry: same retry
// count, same backoff curve, same Retry-After honor (capped at 30s to
// stay under the 150s edge-function platform timeout), same jitter.
//
// Why we need parity now: openrouter-chat.ts launched as single-try
// (Phase 1 flag-gated trickle of ~21 pilot users). Ramping to 100%
// pilot cohort raises concurrent OpenRouter pressure; without retry,
// any transient 5xx / 429 from the upstream Anthropic API cascades
// straight to user-visible HTTP 500. Same dynamic that PR R1 (#320)
// hardened on the OpenAI fan-out side.
//
// Caller contract: identical to openrouterChatCompletion's. Returns the
// upstream Response object untouched. Tracing fires inside each attempt
// and any retried attempts emit their own Langfuse trace — useful for
// post-incident analysis of retry behavior under load.
export async function openrouterChatCompletionWithRetry(
  payload: Record<string, unknown>,
  apiKey: string,
  traceCtx: TraceContext,
  options: OpenRouterChatWithRetryOptions = {},
): Promise<Response> {
  const {
    retries = 3,
    baseBackoffMs = 1000,
    maxBackoffMs = 8000,
    signal,
  } = options

  let lastResponse: Response | null = null
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await openrouterChatCompletion(payload, apiKey, traceCtx, { signal })
      // Success or non-retryable failure — return immediately. Same shape
      // contract as openrouterChatCompletion / openaiChatCompletionWithRetry.
      if (res.ok || !RETRYABLE_STATUSES.has(res.status)) return res
      lastResponse = res
      console.warn(`[openrouter-retry] HTTP ${res.status} on attempt ${attempt + 1}/${retries + 1} (trace=${traceCtx.traceName})`)
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') throw err
      lastError = err instanceof Error ? err : new Error(String(err))
      lastResponse = null
      console.warn(`[openrouter-retry] fetch error on attempt ${attempt + 1}/${retries + 1} (trace=${traceCtx.traceName}):`, lastError.message)
    }

    if (attempt >= retries) break

    // Backoff. Honor Retry-After on 429s up to a 30s cap (same as the
    // OpenAI wrapper) so a bad upstream signal can't keep the function
    // alive past the edge platform timeout. Falls back to exponential.
    let waitMs = Math.min(baseBackoffMs * Math.pow(2, attempt), maxBackoffMs)
    if (lastResponse && lastResponse.status === 429) {
      const retryAfter = lastResponse.headers.get('retry-after')
      if (retryAfter) {
        const seconds = Number(retryAfter)
        if (!Number.isNaN(seconds) && seconds > 0) {
          waitMs = Math.min(seconds * 1000, 30_000)
        }
      }
    }
    // Jitter — 0 to 500ms — prevents synchronized retries across concurrent
    // edge function invocations from re-creating the same rate-limit wave.
    waitMs += Math.random() * 500
    await new Promise((resolve) => setTimeout(resolve, waitMs))
  }

  // Exhausted. Return the last Response if we have one (so the caller's
  // existing error path handles HTTP semantics). Otherwise throw the
  // last network error.
  if (lastResponse) return lastResponse
  throw lastError ?? new Error('OpenRouter fetch failed after retries (no response)')
}
