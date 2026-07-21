// anthropic-chat.ts — direct Anthropic Messages API client that presents the
// SAME OpenAI-shaped request/response contract as openai-chat.ts and
// openrouter-chat.ts, so it drops into any Sonnet call site behind the
// transport selector (sonnet-transport.ts) with NO caller change.
//
// Three things the Anthropic Messages API needs that the OpenAI shape doesn't
// express, handled entirely inside this wrapper:
//   1. Structured JSON via FORCED TOOL-USE, not assistant prefill. Sonnet 4.6
//      rejects the prefill JSON trick ("conversation must end with a user
//      message"), so when the caller sets response_format:{type:'json_object'}
//      we force a single open-schema `emit_json` tool and map its input back to
//      choices[0].message.content as a JSON string — parseLlmJson is untouched.
//   2. Prompt caching on the shared system prefix (cache_control:ephemeral),
//      attached only when the prefix clears Anthropic's 1024-token minimum.
//      Cache reads are excluded from ITPM per the account console, so this both
//      cuts cost and multiplies effective rate-limit headroom under burst.
//   3. Usage translation: Anthropic input_tokens / output_tokens (+ cache
//      creation/read) → OpenAI prompt_tokens / completion_tokens, with the
//      cache breakdown surfaced so function_metrics can price it correctly.
//
// Langfuse tracing + retry/backoff are strict parity with the OpenRouter wrapper
// (the translated OpenAI-shaped Response is what gets traced).
//
// Env vars (POSIX underscore names):
//   ANTHROPIC_API_KEY     — required when this helper is invoked (caller checks).
//   ANTHROPIC_SONNET_MODEL — optional override of the Messages API model id
//                            (default 'claude-sonnet-4-6'); a secret, so the
//                            exact id can change without a redeploy.

import {
  LANGFUSE_ENABLED,
  sendLangfuseTrace,
  type TraceContext,
} from './openai-chat.ts'

const ANTHROPIC_ENDPOINT = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_VERSION = '2023-06-01'

// Anthropic ephemeral prompt cache has a 1024-token minimum for Sonnet; below
// it, a cache_control breakpoint is a no-op (older models error). Only attach
// the breakpoint when the system prefix clears it. ~4 chars/token estimate.
const CACHE_MIN_TOKENS = 1024
const estTokens = (s: string): number => Math.ceil(s.length / 4)

// Per-model payload shaping. Sonnet 4.6 accepts temperature, so the default is
// a no-op; the table exists so a future model that rejects a param can drop it
// here without touching any call site.
interface ModelShape {
  dropTemperature?: boolean
}
const MODEL_SHAPE: Record<string, ModelShape> = {
  // 'claude-sonnet-4-6': {} — accepts temperature; nothing to drop.
}

// Single forced tool that captures arbitrary JSON. Open object schema so any
// caller's prompt-specified JSON shape validates; tool_use.input maps straight
// back to the OpenAI content string.
const JSON_TOOL = {
  name: 'emit_json',
  description:
    'Return the response as a single JSON object exactly as instructed in the system prompt. Put the entire response in this tool call.',
  input_schema: { type: 'object' as const, additionalProperties: true },
}

export interface AnthropicChatOptions {
  signal?: AbortSignal
}

export interface AnthropicChatWithRetryOptions extends AnthropicChatOptions {
  retries?: number
  baseBackoffMs?: number
  maxBackoffMs?: number
}

const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504, 529])

// Translate an OpenAI chat-completions payload into an Anthropic Messages
// request. Exported for unit testing.
export function toAnthropicRequest(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const messages = Array.isArray(payload.messages)
    ? (payload.messages as Array<{ role: string; content: unknown }>)
    : []
  const systemText = messages
    .filter((m) => m.role === 'system')
    .map((m) => String(m.content ?? ''))
    .join('\n\n')
  const convo = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: String(m.content ?? ''),
    }))
  // Anthropic requires the conversation to start with a user turn; if a caller
  // ever passes only a system message, seed a minimal user turn.
  if (convo.length === 0) convo.push({ role: 'user', content: 'Proceed.' })

  const model = String(payload.model ?? '')
  const shape = MODEL_SHAPE[model] ?? {}

  const req: Record<string, unknown> = {
    model,
    max_tokens: Number(payload.max_tokens ?? 1024),
    messages: convo,
  }
  if (!shape.dropTemperature && payload.temperature != null) {
    req.temperature = payload.temperature
  }
  if (systemText) {
    const block: Record<string, unknown> = { type: 'text', text: systemText }
    if (estTokens(systemText) >= CACHE_MIN_TOKENS) {
      block.cache_control = { type: 'ephemeral' }
    }
    req.system = [block]
  }
  const wantsJson =
    !!payload.response_format &&
    (payload.response_format as { type?: string }).type === 'json_object'
  if (wantsJson) {
    req.tools = [JSON_TOOL]
    req.tool_choice = { type: 'tool', name: JSON_TOOL.name }
  }
  return req
}

// Translate an Anthropic Messages response body into an OpenAI-shaped body so
// every caller's data.choices[0].message.content + data.usage.* work unchanged.
// The cache breakdown is preserved on usage for cost telemetry. Exported for
// unit testing.
export function toOpenAIShape(
  anthropicBody: Record<string, any>,
): Record<string, unknown> {
  const content = Array.isArray(anthropicBody?.content) ? anthropicBody.content : []
  const toolBlock = content.find((b: any) => b?.type === 'tool_use')
  const text = toolBlock
    ? JSON.stringify(toolBlock.input ?? {})
    : content
        .filter((b: any) => b?.type === 'text')
        .map((b: any) => String(b.text ?? ''))
        .join('')
  const u = anthropicBody?.usage ?? {}
  const cacheRead = Number(u.cache_read_input_tokens ?? 0)
  const cacheWrite = Number(u.cache_creation_input_tokens ?? 0)
  // prompt_tokens is the FULL input processed (regular + cache read + cache
  // write) so token accounting stays whole; cost prices the tiers separately.
  const promptTokens = Number(u.input_tokens ?? 0) + cacheRead + cacheWrite
  const completionTokens = Number(u.output_tokens ?? 0)
  return {
    id: anthropicBody?.id,
    model: anthropicBody?.model,
    choices: [
      {
        index: 0,
        message: { role: 'assistant', content: text },
        finish_reason: anthropicBody?.stop_reason || 'stop',
      },
    ],
    usage: {
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: promptTokens + completionTokens,
      cache_read_input_tokens: cacheRead,
      cache_creation_input_tokens: cacheWrite,
    },
  }
}

// Drop-in Anthropic chat-completion. Returns a Response whose .json() yields the
// OpenAI shape, .ok/.status reflect the upstream result. Tracing is
// fire-and-forget; nothing here can affect the caller's response.
export async function anthropicChatCompletion(
  payload: Record<string, unknown>,
  apiKey: string,
  traceCtx: TraceContext,
  options: AnthropicChatOptions = {},
): Promise<Response> {
  const startTime = new Date()
  const req = toAnthropicRequest(payload)

  const raw = await fetch(ANTHROPIC_ENDPOINT, {
    method: 'POST',
    signal: options.signal,
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
      'content-type': 'application/json',
    },
    body: JSON.stringify(req),
  })

  // Non-2xx: pass the status through untranslated so the retry wrapper and the
  // caller's HTTP error path behave exactly as with the OpenAI/OpenRouter path.
  if (!raw.ok) {
    const errText = await raw.text().catch(() => '')
    return new Response(errText || JSON.stringify({ error: `anthropic_${raw.status}` }), {
      status: raw.status,
      headers: { 'content-type': 'application/json' },
    })
  }

  let openaiBody: Record<string, unknown>
  try {
    openaiBody = toOpenAIShape(await raw.json())
  } catch (err) {
    // Upstream 200 but unparseable body — surface as a 502 so the retry/caller
    // path treats it as a transient upstream failure rather than a silent empty.
    console.warn('[anthropic-chat] response parse failed:', (err as Error)?.message || err)
    return new Response(JSON.stringify({ error: 'anthropic_bad_body' }), {
      status: 502,
      headers: { 'content-type': 'application/json' },
    })
  }

  const response = new Response(JSON.stringify(openaiBody), {
    status: 200,
    headers: { 'content-type': 'application/json' },
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
        responseOk: true,
        responseStatus: 200,
      }).catch((err) => {
        console.warn('[anthropic-chat] Langfuse trace failed (non-fatal):', err?.message || err)
      })
      // @ts-ignore — EdgeRuntime is a Supabase-specific global.
      const edgeRuntime = (globalThis as any).EdgeRuntime
      if (edgeRuntime?.waitUntil) edgeRuntime.waitUntil(tracePromise)
    } catch (err) {
      console.warn('[anthropic-chat] Langfuse setup failed (non-fatal):', (err as Error)?.message || err)
    }
  }

  return response
}

// anthropicChatCompletion + exponential-backoff retry — strict parity with
// openaiChatCompletionWithRetry / openrouterChatCompletionWithRetry.
export async function anthropicChatCompletionWithRetry(
  payload: Record<string, unknown>,
  apiKey: string,
  traceCtx: TraceContext,
  options: AnthropicChatWithRetryOptions = {},
): Promise<Response> {
  const { retries = 3, baseBackoffMs = 1000, maxBackoffMs = 8000, signal } = options
  let lastResponse: Response | null = null
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await anthropicChatCompletion(payload, apiKey, traceCtx, { signal })
      if (res.ok || !RETRYABLE_STATUSES.has(res.status)) return res
      lastResponse = res
      console.warn(`[anthropic-retry] HTTP ${res.status} on attempt ${attempt + 1}/${retries + 1} (trace=${traceCtx.traceName})`)
    } catch (err) {
      const errName = (err as Error)?.name
      if (errName === 'AbortError' || errName === 'TimeoutError') throw err
      lastError = err instanceof Error ? err : new Error(String(err))
      lastResponse = null
      console.warn(`[anthropic-retry] fetch error on attempt ${attempt + 1}/${retries + 1} (trace=${traceCtx.traceName}):`, lastError.message)
    }

    if (attempt >= retries) break

    let waitMs = Math.min(baseBackoffMs * Math.pow(2, attempt), maxBackoffMs)
    if (lastResponse && (lastResponse.status === 429 || lastResponse.status === 529)) {
      const retryAfter = lastResponse.headers.get('retry-after')
      if (retryAfter) {
        const seconds = Number(retryAfter)
        if (!Number.isNaN(seconds) && seconds > 0) waitMs = Math.min(seconds * 1000, 30_000)
      }
    }
    waitMs += Math.random() * 500
    await new Promise((resolve) => setTimeout(resolve, waitMs))
  }

  if (lastResponse) return lastResponse
  throw lastError ?? new Error('Anthropic fetch failed after retries (no response)')
}
